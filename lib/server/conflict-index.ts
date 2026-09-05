import fs from 'fs';
import path from 'path';
import type { Conflict } from '@/lib/types';
import idRedirects from '@/lib/generated/id-redirects.json';
import { buildConflictRelations, getConflictChildren, type ConflictRelations } from '@/lib/conflicts';
import { compareWars, empireFamilyIds } from '@/lib/format';

/**
 * Server-side, module-level caches of the data files with id indexes.
 * The 9 MB conflicts file is parsed at most once per server process instead
 * of once per request (and previously twice per request — generateMetadata
 * and the page body each re-read it). The empire index keeps only feature
 * properties plus a computed bbox; the geometry is dropped after parsing.
 *
 * Used by app/c/[id], app/e/[id] and app/sitemap.ts. Never import from
 * client components — this module reads the filesystem.
 */
interface ConflictIndex {
  list: Conflict[];
  byId: Map<string, Conflict>;
}

let cached: ConflictIndex | null = null;

function readJson(rel: string): unknown {
  try {
    const p = path.join(process.cwd(), 'data', rel);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function getConflictIndex(): ConflictIndex {
  if (cached) return cached;
  const parsed = readJson('conflicts.json');
  const list: Conflict[] = Array.isArray(parsed) ? (parsed as Conflict[]) : [];
  const byId = new Map<string, Conflict>();
  for (const c of list) byId.set(c.id, c);
  cached = { list, byId };
  return cached;
}

const REDIRECTS: Record<string, string> = idRedirects;

/** Follow scripts/data/id_redirects.json (merged / renamed records). Returns
 *  the canonical id, or the input when no redirect exists. Bounded so a
 *  cyclic redirect file can't spin. */
export function resolveConflictId(id: string): string {
  let cur = id;
  for (let i = 0; i < 8; i++) {
    const next = REDIRECTS[cur];
    if (!next || next === cur) break;
    cur = next;
  }
  return cur;
}

export function findConflict(id: string): Conflict | null {
  return getConflictIndex().byId.get(id) ?? null;
}

/* ─── Parent / child graph ─────────────────────────────────── */

let relationsCache: ConflictRelations | null = null;

function getRelations(): ConflictRelations {
  if (!relationsCache) relationsCache = buildConflictRelations(getConflictIndex().list);
  return relationsCache;
}

/** Resolve a `partOf` reference (id or name) to a record, if any. */
export function resolveConflictRef(ref: string): Conflict | null {
  return getRelations().byRef.get(ref) ?? null;
}

/** Conflicts whose `partOf` names the given conflict (by id or name), in
 *  start-year order. Empty for unknown ids. */
export function childrenOf(id: string): Conflict[] {
  const parent = findConflict(id);
  if (!parent) return [];
  return getConflictChildren(getRelations(), parent)
    .slice()
    .sort((a, b) => a.startYear - b.startYear);
}

/* ─── Empires ──────────────────────────────────────────────── */

/** The properties carried on every feature in data/empires.json, plus a
 *  bbox computed from the geometry at index time. Mirrors
 *  EmpireProperties in components/EmpireSidebar.tsx without the client
 *  import. */
export interface EmpireRecord {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  color?: string;
  accurate?: boolean;
  borderStyle?: 'solid' | 'dashed';
  source?: string;
  sourceDetail?: string;
  borderNote?: string;
  borderYear?: number;
  matchedRegion?: string;
  handCraftedNote?: string;
  polityType?: string;
  bbox?: [number, number, number, number];
}

export interface EmpireWikipediaEntry {
  title: string;
  description?: string | null;
  extract: string;
  url?: string | null;
  fetchedAt?: string;
  license?: string;
}

interface EmpireIndex {
  list: EmpireRecord[];
  byId: Map<string, EmpireRecord>;
  ids: string[];
}

let empireCache: EmpireIndex | null = null;
let wikiCache: Record<string, EmpireWikipediaEntry> | null = null;

function bboxOf(coords: unknown, acc: number[]): void {
  if (!Array.isArray(coords)) return;
  if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    const [x, y] = coords as number[];
    if (x < acc[0]) acc[0] = x;
    if (y < acc[1]) acc[1] = y;
    if (x > acc[2]) acc[2] = x;
    if (y > acc[3]) acc[3] = y;
    return;
  }
  for (const c of coords) bboxOf(c, acc);
}

export function getEmpireIndex(): EmpireIndex {
  if (empireCache) return empireCache;
  const parsed = readJson('empires.json') as
    | { features?: { properties?: Record<string, unknown>; geometry?: { coordinates?: unknown } }[] }
    | null;
  const list: EmpireRecord[] = [];
  for (const f of parsed?.features ?? []) {
    const p = f.properties;
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') continue;
    const acc = [Infinity, Infinity, -Infinity, -Infinity];
    bboxOf(f.geometry?.coordinates, acc);
    const rec: EmpireRecord = {
      ...(p as unknown as EmpireRecord),
      id: p.id,
      name: p.name,
      startYear: Number(p.startYear),
      endYear: p.endYear == null ? null : Number(p.endYear),
    };
    if (Number.isFinite(acc[0])) rec.bbox = [acc[0], acc[1], acc[2], acc[3]];
    list.push(rec);
  }
  const byId = new Map<string, EmpireRecord>();
  for (const e of list) byId.set(e.id, e);
  empireCache = { list, byId, ids: list.map((e) => e.id) };
  return empireCache;
}

export function findEmpire(id: string): EmpireRecord | null {
  return getEmpireIndex().byId.get(id) ?? null;
}

export function getEmpireWikipedia(id: string): EmpireWikipediaEntry | null {
  if (!wikiCache) {
    const parsed = readJson('empire-wikipedia.json');
    wikiCache =
      parsed && typeof parsed === 'object'
        ? (parsed as Record<string, EmpireWikipediaEntry>)
        : {};
  }
  const entry = wikiCache[id];
  return entry && typeof entry.extract === 'string' ? entry : null;
}

/** Sibling time-slices of an empire (including itself): every feature id
 *  sharing the base name, e.g. british-empire-1815 → all british-empire-*. */
export function empireSiblingIds(id: string): string[] {
  return empireFamilyIds(id, getEmpireIndex().ids);
}

/** Conflicts whose `polityIds` name this empire or any of its time-slices,
 *  best first (importance, casualties, start year). Empty until the data
 *  pass populates `polityIds`. */
export function warsOfEmpire(id: string): Conflict[] {
  const family = new Set(empireSiblingIds(id));
  return getConflictIndex()
    .list.filter((c) => c.polityIds?.some((p) => family.has(p)))
    .sort(compareWars);
}

/** Fallback for empires with no belligerent join: importance ≥ 3 conflicts
 *  whose span overlaps the empire's lifetime. */
export function conflictsDuringEmpire(e: EmpireRecord, limit = 6): Conflict[] {
  const end = e.endYear ?? new Date().getFullYear();
  return getConflictIndex()
    .list.filter((c) => c.importance >= 3 && c.startYear <= end && (c.endYear ?? c.startYear) >= e.startYear)
    .sort(compareWars)
    .slice(0, limit);
}
