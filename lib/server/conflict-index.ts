import fs from 'fs';
import path from 'path';
import type { Conflict } from '@/lib/types';
import idRedirects from '@/lib/generated/id-redirects.json';

/**
 * Server-side, module-level cache of data/conflicts.json with an id index.
 * The 9 MB file is parsed at most once per server process instead of once
 * per request (and previously twice per request — generateMetadata and the
 * page body each re-read it).
 */
interface ConflictIndex {
  list: Conflict[];
  byId: Map<string, Conflict>;
}

let cached: ConflictIndex | null = null;

export function getConflictIndex(): ConflictIndex {
  if (cached) return cached;
  let list: Conflict[] = [];
  try {
    const p = path.join(process.cwd(), 'data', 'conflicts.json');
    const parsed: unknown = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(parsed)) list = parsed as Conflict[];
  } catch {
    list = [];
  }
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
