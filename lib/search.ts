/**
 * Global search across conflicts, empires and cities (the command palette).
 *
 * Scoring is deliberately simple and explainable: a match on the NAME
 * beats any other field, and within the name a prefix beats a word-start
 * beats a substring. Only when the name misses do we fall back to the
 * belligerents (`countries`), then the description (present once the text
 * bundle has loaded). Ties break on importance, then casualties, then the
 * earlier start year — so "Punic" lists the First Punic War before the
 * Third, and "World War" lists WWII before its campaigns.
 *
 * Queries and haystacks are folded (lower-case, diacritics stripped) so
 * "cortes" finds Cortés and "Wurttemberg" finds Württemberg.
 */
import type { Conflict } from './types';
import { compareByImportance } from './conflicts';

export interface EmpireSearchEntry {
  id?: string;
  name: string;
  startYear: number;
  endYear: number | null;
}

export interface CitySearchFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    id?: string;
    name: string;
    modernName?: string | null;
    foundedYear?: number | null;
    endYear?: number | null;
    importance?: number;
  };
}

export type SearchHit<T> = { item: T; score: number };

export interface SearchResults {
  conflicts: SearchHit<Conflict>[];
  empires: SearchHit<EmpireSearchEntry>[];
  cities: SearchHit<CitySearchFeature>[];
}

export const SEARCH_LIMITS = { conflicts: 8, empires: 5, cities: 5 } as const;

/* ── Text folding ─────────────────────────────────────────────── */

const foldCache = new Map<string, string>();

/** Lower-case, diacritics stripped, whitespace collapsed. Cached — the
 *  same ~1,300 names are folded on every keystroke. */
export function fold(s: string): string {
  const hit = foldCache.get(s);
  if (hit !== undefined) return hit;
  const out = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (foldCache.size > 20000) foldCache.clear();
  foldCache.set(s, out);
  return out;
}

/* ── Name scoring ─────────────────────────────────────────────── */

export const NAME_PREFIX = 100;
export const NAME_WORD_START = 80;
export const NAME_ALL_TOKENS = 70;
export const NAME_SUBSTRING = 60;
export const FIELD_PREFIX = 40;
export const FIELD_WORD_START = 35;
export const FIELD_SUBSTRING = 30;
export const DESCRIPTION_SUBSTRING = 20;

function wordStart(hay: string, needle: string): boolean {
  let i = hay.indexOf(needle);
  while (i >= 0) {
    if (i === 0 || !/[a-z0-9\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff]/.test(hay[i - 1])) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

/**
 * Score a folded query against one name. 0 = no match.
 *   prefix ("batt" → "Battle of Hastings")            100
 *   word-start ("hast" → "Battle of Hastings")         80
 *   every token starts a word ("war roses")            70
 *   substring ("stings")                               60
 */
export function scoreName(query: string, name: string): number {
  const q = fold(query);
  if (!q) return 0;
  const n = fold(name);
  if (!n) return 0;
  if (n.startsWith(q)) return NAME_PREFIX;
  if (wordStart(n, q)) return NAME_WORD_START;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => wordStart(n, t))) return NAME_ALL_TOKENS;
  if (n.includes(q)) return NAME_SUBSTRING;
  return 0;
}

/** Same ladder for a secondary field (belligerents / locations), capped
 *  below the weakest name match. */
function scoreField(query: string, value: string): number {
  const q = fold(query);
  const v = fold(value);
  if (!q || !v) return 0;
  if (v.startsWith(q)) return FIELD_PREFIX;
  if (wordStart(v, q)) return FIELD_WORD_START;
  if (v.includes(q)) return FIELD_SUBSTRING;
  return 0;
}

/* ── Per-collection scoring ───────────────────────────────────── */

export function scoreConflict(query: string, c: Conflict): number {
  const byName = scoreName(query, c.name);
  if (byName) return byName;
  let best = 0;
  for (const side of c.countries ?? []) best = Math.max(best, scoreField(query, side));
  if (best) return best;
  for (const loc of c.locations ?? []) best = Math.max(best, scoreField(query, loc));
  if (best) return best;
  if (c.description && fold(c.description).includes(fold(query))) return DESCRIPTION_SUBSTRING;
  return 0;
}

export function scoreEmpire(query: string, e: EmpireSearchEntry): number {
  return scoreName(query, e.name);
}

export function scoreCity(query: string, city: CitySearchFeature): number {
  const p = city.properties;
  const byName = scoreName(query, p.name);
  const byModern = p.modernName ? scoreName(query, p.modernName) : 0;
  return Math.max(byName, byModern);
}

/* ── Search ───────────────────────────────────────────────────── */

function topN<T>(hits: SearchHit<T>[], n: number, tie: (a: T, b: T) => number): SearchHit<T>[] {
  hits.sort((a, b) => (b.score - a.score) || tie(a.item, b.item));
  return hits.length > n ? hits.slice(0, n) : hits;
}

export function searchConflicts(
  query: string,
  conflicts: readonly Conflict[],
  limit: number = SEARCH_LIMITS.conflicts,
): SearchHit<Conflict>[] {
  if (!fold(query)) return [];
  const hits: SearchHit<Conflict>[] = [];
  for (const c of conflicts) {
    const score = scoreConflict(query, c);
    if (score) hits.push({ item: c, score });
  }
  return topN(hits, limit, (a, b) => compareByImportance(a, b) || a.startYear - b.startYear);
}

export function searchEmpires(
  query: string,
  empires: readonly EmpireSearchEntry[],
  limit: number = SEARCH_LIMITS.empires,
): SearchHit<EmpireSearchEntry>[] {
  if (!fold(query)) return [];
  const hits: SearchHit<EmpireSearchEntry>[] = [];
  const seen = new Set<string>();
  for (const e of empires) {
    if (!e.name) continue;
    const score = scoreEmpire(query, e);
    if (!score) continue;
    // The index carries one row per polygon slice; the same id can appear
    // more than once. Keep the first.
    const key = e.id ?? e.name;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({ item: e, score });
  }
  return topN(hits, limit, (a, b) => {
    // Longer-lived polities first, then the earlier one.
    const spanA = (a.endYear ?? 9999) - a.startYear;
    const spanB = (b.endYear ?? 9999) - b.startYear;
    return (spanB - spanA) || (a.startYear - b.startYear);
  });
}

export function searchCities(
  query: string,
  cities: readonly CitySearchFeature[],
  limit: number = SEARCH_LIMITS.cities,
): SearchHit<CitySearchFeature>[] {
  if (!fold(query)) return [];
  // One hit per location: the city collection has one record per name
  // period (Byzantium, Constantinople, Istanbul share a point). Keep the
  // best-scoring record for each coordinate pair.
  const best = new Map<string, SearchHit<CitySearchFeature>>();
  for (const city of cities) {
    const score = scoreCity(query, city);
    if (!score) continue;
    const [lon, lat] = city.geometry.coordinates;
    const key = `${lon.toFixed(2)},${lat.toFixed(2)}`;
    const prev = best.get(key);
    if (!prev || score > prev.score) best.set(key, { item: city, score });
  }
  return topN(Array.from(best.values()), limit, (a, b) =>
    ((b.properties.importance ?? 0) - (a.properties.importance ?? 0)) ||
    ((a.properties.foundedYear ?? 0) - (b.properties.foundedYear ?? 0)));
}

export function searchAll(
  query: string,
  data: {
    conflicts: readonly Conflict[];
    empires: readonly EmpireSearchEntry[];
    cities: readonly CitySearchFeature[];
  },
): SearchResults {
  return {
    conflicts: searchConflicts(query, data.conflicts),
    empires: searchEmpires(query, data.empires),
    cities: searchCities(query, data.cities),
  };
}
