import { Conflict, ActiveConflict, ConflictTextMap } from './types';
import { formatYear, formatCasualties, formatYearRange } from './format';

// Re-exported for compatibility — the canonical implementations live in
// lib/format.ts.
export { formatYear, formatCasualties };

/* ─────────────────────────────────────────────────────────────
 * Tunables shared by getActiveConflicts / getAutoSpeed and the
 * per-year index that makes them O(1)-ish during playback.
 * ─────────────────────────────────────────────────────────── */

// Fade-in is quick; fade-out adapts so ended conflicts don't clutter the "Live" view
const FADE_IN_YEARS = 2;
const FADE_OUT_YEARS = 2;
// Entries spanning more than this many years are era-scale summaries
// ("Classic Maya City-State Wars"). They stay on the map but lose callout
// priority so they stop winning the label slots at sparse years.
const ERA_SCALE_YEARS = 300;

const TRANSITION_SPEED = 20;   // years/sec while a significant conflict starts/ends
const ACTIVE_SPEED = 40;       // years/sec during mid-conflict (base, reduced by density)
const MAX_SPEED = 1200;        // years/sec through empty stretches
const LOOKAHEAD = 8;           // slow down this many years before next conflict
const TRANSITION_MIN_IMPORTANCE = 3; // minor entries start every year; ignore them
const DENSITY_FLOOR = 0.45;
// A conflict is "near" a transition while the year is within this many
// years of its start or (finite) end.
const NEAR_YEARS = 3;

/* ─────────────────────────────────────────────────────────────
 * Per-year index.
 *
 * Built once per dataset (buildYearIndex) so the playback loop can answer
 * "what is active at year y" without a full pass over ~11k records. Two
 * families of tables are kept, both indexed by k = floor(y) - minYear:
 *
 *   at*   — values for an INTEGER year k         (s <= k <= e)
 *   mid*  — values for any y strictly in (k, k+1) (s <= k < k+1 <= e)
 *
 * Because every startYear / endYear is an integer, every predicate the two
 * functions evaluate is constant across an open unit interval, so the two
 * tables reproduce the O(n) implementations exactly for float years too.
 *
 * candidates is a CSR (compressed sparse row) list of conflict indices whose
 * fade window [s - FADE_IN, e + FADE_OUT] covers integer year k — a superset
 * of the non-zero-opacity set for any y in [k, k+1). getActiveConflicts
 * iterates only that list (typically 20–130 entries) and applies the exact
 * opacity math, so the output — including tie order after the stable sort —
 * is identical to the full-scan version.
 * ─────────────────────────────────────────────────────────── */

const NO_NEXT_START = 0x7fffffff;

export interface YearIndex {
  /** The array this index was built from. The fast paths only trust the
   *  index when the caller passes the same array. */
  readonly conflicts: readonly Conflict[];
  /** First and last year covered by the tables (inclusive). */
  readonly minYear: number;
  readonly maxYear: number;
  readonly atCount: Int32Array;
  readonly atImportance: Int32Array;
  readonly atNear: Uint8Array;
  readonly midCount: Int32Array;
  readonly midImportance: Int32Array;
  readonly midNear: Uint8Array;
  /** Smallest startYear strictly greater than k, or NO_NEXT_START. */
  readonly nextStart: Int32Array;
  readonly candOffsets: Int32Array;
  readonly candIndex: Int32Array;
}

export function buildYearIndex(conflicts: readonly Conflict[]): YearIndex {
  const thisYear = new Date().getFullYear();
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const c of conflicts) {
    if (c.startYear < minStart) minStart = c.startYear;
    if (c.endYear != null && c.endYear > maxEnd) maxEnd = c.endYear;
  }
  if (!isFinite(minStart)) minStart = thisYear;
  if (!isFinite(maxEnd)) maxEnd = thisYear;
  // Pad by the widest window either function looks at (fade + near).
  const minYear = minStart - Math.max(FADE_IN_YEARS, NEAR_YEARS) - 1;
  const maxYear = Math.max(maxEnd, thisYear) + Math.max(FADE_OUT_YEARS, NEAR_YEARS) + 1;
  const Y = maxYear - minYear + 1;

  // Difference arrays (one extra slot so a "-1 at e+1" past the end is safe).
  const dAtCount = new Int32Array(Y + 1);
  const dAtImp = new Int32Array(Y + 1);
  const dAtNear = new Int32Array(Y + 1);
  const dMidCount = new Int32Array(Y + 1);
  const dMidImp = new Int32Array(Y + 1);
  const dMidNear = new Int32Array(Y + 1);
  const hasStart = new Uint8Array(Y);
  const candCount = new Int32Array(Y);

  const clamp = (k: number) => Math.max(0, Math.min(Y, k));
  // Add +1 over the inclusive year range [a, b] (in table coordinates).
  const addRange = (arr: Int32Array, a: number, b: number, v: number) => {
    if (b < a) return;
    const lo = clamp(a);
    const hi = clamp(b + 1);
    if (hi <= lo) return;
    arr[lo] += v;
    arr[hi] -= v;
  };

  for (let i = 0; i < conflicts.length; i++) {
    const c = conflicts[i];
    const s = c.startYear - minYear;
    const eFinite = c.endYear != null;
    // Infinite ends run to the last table year.
    const e = eFinite ? (c.endYear as number) - minYear : Y - 1;
    hasStart[clamp(s)] = 1;

    // Active at integer k: s <= k <= e. Active in (k, k+1): s <= k <= e - 1.
    addRange(dAtCount, s, e, 1);
    addRange(dAtImp, s, e, c.importance);
    addRange(dMidCount, s, e - 1, 1);
    addRange(dMidImp, s, e - 1, c.importance);

    if (c.importance >= TRANSITION_MIN_IMPORTANCE) {
      // Integer k: near start when k - s < NEAR, near end when e - k < NEAR.
      addRange(dAtNear, s, Math.min(s + NEAR_YEARS - 1, e), 1);
      if (eFinite) addRange(dAtNear, Math.max(e - NEAR_YEARS + 1, s), e, 1);
      // Open (k, k+1): y - s < NEAR ⟺ k <= s + NEAR - 1; e - y < NEAR ⟺ k >= e - NEAR.
      addRange(dMidNear, s, Math.min(s + NEAR_YEARS - 1, e - 1), 1);
      if (eFinite) addRange(dMidNear, Math.max(e - NEAR_YEARS, s), e - 1, 1);
    }

    // Candidate window for the fade math.
    const a = clamp(s - FADE_IN_YEARS);
    const b = Math.min(Y - 1, e + FADE_OUT_YEARS);
    for (let k = a; k <= b; k++) candCount[k]++;
  }

  const prefix = (d: Int32Array): Int32Array => {
    const out = new Int32Array(Y);
    let acc = 0;
    for (let k = 0; k < Y; k++) {
      acc += d[k];
      out[k] = acc;
    }
    return out;
  };
  const flag = (d: Int32Array): Uint8Array => {
    const out = new Uint8Array(Y);
    let acc = 0;
    for (let k = 0; k < Y; k++) {
      acc += d[k];
      out[k] = acc > 0 ? 1 : 0;
    }
    return out;
  };

  const nextStart = new Int32Array(Y);
  let next = NO_NEXT_START;
  for (let k = Y - 1; k >= 0; k--) {
    nextStart[k] = next;
    if (hasStart[k]) next = k + minYear;
  }

  const candOffsets = new Int32Array(Y + 1);
  for (let k = 0; k < Y; k++) candOffsets[k + 1] = candOffsets[k] + candCount[k];
  const candIndex = new Int32Array(candOffsets[Y]);
  const fill = new Int32Array(Y);
  for (let i = 0; i < conflicts.length; i++) {
    const c = conflicts[i];
    const s = c.startYear - minYear;
    const e = c.endYear != null ? c.endYear - minYear : Y - 1;
    const a = clamp(s - FADE_IN_YEARS);
    const b = Math.min(Y - 1, e + FADE_OUT_YEARS);
    for (let k = a; k <= b; k++) {
      candIndex[candOffsets[k] + fill[k]] = i;
      fill[k]++;
    }
  }

  return {
    conflicts,
    minYear,
    maxYear,
    atCount: prefix(dAtCount),
    atImportance: prefix(dAtImp),
    atNear: flag(dAtNear),
    midCount: prefix(dMidCount),
    midImportance: prefix(dMidImp),
    midNear: flag(dMidNear),
    nextStart,
    candOffsets,
    candIndex,
  };
}

function isYearIndex(x: unknown): x is YearIndex {
  return !!x && !Array.isArray(x) && typeof x === 'object' && 'candOffsets' in (x as object);
}

/** Table slot for a year, or -1 when the year is outside the index. */
function slotFor(index: YearIndex, year: number): number {
  const k = Math.floor(year);
  if (!isFinite(k) || k < index.minYear || k > index.maxYear) return -1;
  return k - index.minYear;
}

function toActive(c: Conflict, currentYear: number, fadeDimming: number): ActiveConflict | null {
  const end = c.endYear === null ? Infinity : c.endYear;
  const isWithin = currentYear >= c.startYear && currentYear <= end;
  const isNearStart = currentYear >= c.startYear - FADE_IN_YEARS && currentYear < c.startYear;
  const isNearEnd = c.endYear !== null && currentYear > end && currentYear <= end + FADE_OUT_YEARS;

  let opacity = 0;
  if (isWithin) opacity = 1;
  else if (isNearStart) opacity = (currentYear - (c.startYear - FADE_IN_YEARS)) / FADE_IN_YEARS;
  else if (isNearEnd) {
    const raw = 1 - (currentYear - end) / FADE_OUT_YEARS;
    opacity = raw * fadeDimming; // dim faded conflicts when many are active
  }

  if (opacity <= 0.01) return null;

  const span = (c.endYear ?? currentYear) - c.startYear;
  const importanceScore = span > ERA_SCALE_YEARS
    ? c.importance * 20 - 40
    : c.importance * 20;

  // Active conflicts get a large priority boost so they always render on top
  const displayPriority =
    importanceScore +
    (c.casualties ? Math.log10(c.casualties) : 0) +
    (isWithin ? 50 : 0);

  return {
    ...c,
    isActive: isWithin,
    opacity: Math.max(0, Math.min(1, opacity)),
    displayPriority,
  };
}

function fadeDimmingFor(activeCount: number): number {
  // When many conflicts are active, dim faded ones harder so active ones stand out
  return activeCount > 10 ? 0.6 : activeCount > 5 ? 0.75 : 1;
}

/**
 * Get conflicts active at a given year.
 *
 * Pass the YearIndex built from the same array to skip the full scan; the
 * result is identical either way (the index is ignored if it was built from
 * a different array or the year falls outside its range).
 */
export function getActiveConflicts(
  currentYear: number,
  allConflicts: Conflict[],
  index?: YearIndex | null
): ActiveConflict[] {
  if (index && index.conflicts === allConflicts) {
    const slot = slotFor(index, currentYear);
    if (slot >= 0) {
      const isInt = currentYear === Math.floor(currentYear);
      const activeCount = isInt ? index.atCount[slot] : index.midCount[slot];
      const fadeDimming = fadeDimmingFor(activeCount);
      const out: ActiveConflict[] = [];
      const end = index.candOffsets[slot + 1];
      for (let i = index.candOffsets[slot]; i < end; i++) {
        const a = toActive(allConflicts[index.candIndex[i]], currentYear, fadeDimming);
        if (a) out.push(a);
      }
      return out.sort((a, b) => b.displayPriority - a.displayPriority);
    }
  }

  // Count how many conflicts are fully active — used to dim faded ones more aggressively
  let activeCount = 0;
  for (const c of allConflicts) {
    const end = c.endYear === null ? Infinity : c.endYear;
    if (currentYear >= c.startYear && currentYear <= end) activeCount++;
  }
  const fadeDimming = fadeDimmingFor(activeCount);

  const out: ActiveConflict[] = [];
  for (const c of allConflicts) {
    const a = toActive(c, currentYear, fadeDimming);
    if (a) out.push(a);
  }
  return out.sort((a, b) => b.displayPriority - a.displayPriority);
}

function speedFrom(
  currentYear: number,
  activeCount: number,
  totalImportance: number,
  nearTransition: boolean,
  minGap: number
): number {
  if (activeCount > 0) {
    // Density-aware slowdown: more simultaneous conflicts = slower playback
    // so viewers can absorb what's happening
    const densityFactor = Math.max(DENSITY_FLOOR, 1 - (activeCount - 1) * 0.04);
    // High-importance conflicts also slow things down
    const importanceFactor = totalImportance > 20 ? 0.7 : totalImportance > 10 ? 0.85 : 1;

    if (nearTransition) return TRANSITION_SPEED * densityFactor * importanceFactor;
    return ACTIVE_SPEED * densityFactor * importanceFactor;
  }

  if (minGap <= LOOKAHEAD) {
    const t = minGap / LOOKAHEAD;
    return TRANSITION_SPEED + (MAX_SPEED - TRANSITION_SPEED) * t * t;
  }

  return MAX_SPEED;
}

/**
 * Compute auto-speed: fast through gaps, moderate during long conflicts,
 * slow when significant conflicts start/end (the interesting transitions).
 *
 * Tuned so a full −3100 → present run takes roughly five minutes
 * (scratch simulation: ~5.2 min at 20 fps). Density and importance still
 * slow the modern era down — 1900–2000 runs at ~6 yr/s vs ~40 yr/s in the
 * Bronze Age — but the density floor keeps the crowded centuries moving.
 *
 * Accepts either the raw conflict array (O(n) per call) or a YearIndex
 * (O(1) per call — what the playback loop uses).
 */
export function getAutoSpeed(currentYear: number, source: Conflict[] | YearIndex): number {
  if (isYearIndex(source)) {
    const slot = slotFor(source, currentYear);
    if (slot >= 0) {
      const isInt = currentYear === Math.floor(currentYear);
      const activeCount = isInt ? source.atCount[slot] : source.midCount[slot];
      const totalImportance = isInt ? source.atImportance[slot] : source.midImportance[slot];
      const near = (isInt ? source.atNear[slot] : source.midNear[slot]) === 1;
      const ns = source.nextStart[slot];
      const minGap = ns === NO_NEXT_START ? Infinity : ns - currentYear;
      return speedFrom(currentYear, activeCount, totalImportance, near, minGap);
    }
    return getAutoSpeed(currentYear, source.conflicts as Conflict[]);
  }

  const allConflicts = source;
  // Count active conflicts and detect transitions
  let activeCount = 0;
  let nearTransition = false;
  let totalImportance = 0;

  for (const c of allConflicts) {
    const end = c.endYear === null ? Infinity : c.endYear;
    if (currentYear >= c.startYear && currentYear <= end) {
      activeCount++;
      totalImportance += c.importance;
      if (c.importance >= TRANSITION_MIN_IMPORTANCE) {
        const nearStart = currentYear - c.startYear < NEAR_YEARS;
        const nearEnd = c.endYear !== null && end - currentYear < NEAR_YEARS;
        if (nearStart || nearEnd) nearTransition = true;
      }
    }
  }

  // No active conflicts — find distance to next one
  let minGap = Infinity;
  if (activeCount === 0) {
    for (const c of allConflicts) {
      if (c.startYear > currentYear) {
        minGap = Math.min(minGap, c.startYear - currentYear);
      }
    }
  }

  return speedFrom(currentYear, activeCount, totalImportance, nearTransition, minGap);
}

/* ─────────────────────────────────────────────────────────────
 * Parent / child relations (Sidebar conflict graph).
 *
 * `partOf` entries reference a parent by id OR by name. The Sidebar used to
 * resolve each with allConflicts.find(...) and scan the whole array three
 * times per render for children and siblings. This index is built once per
 * dataset and answers each in O(result).
 * ─────────────────────────────────────────────────────────── */

export interface ConflictRelations {
  /** First conflict (in array order) whose id OR name equals the key —
   *  the same record `allConflicts.find(c => c.id === p || c.name === p)`
   *  returns. */
  readonly byRef: ReadonlyMap<string, Conflict>;
  /** Conflicts (in array order) whose partOf contains the key. */
  readonly childrenByRef: ReadonlyMap<string, readonly Conflict[]>;
  /** Array position by id, used to merge child lists in array order. */
  readonly order: ReadonlyMap<string, number>;
}

export function buildConflictRelations(conflicts: readonly Conflict[]): ConflictRelations {
  const byRef = new Map<string, Conflict>();
  const childrenByRef = new Map<string, Conflict[]>();
  const order = new Map<string, number>();
  for (let i = 0; i < conflicts.length; i++) {
    const c = conflicts[i];
    if (!byRef.has(c.id)) byRef.set(c.id, c);
    if (!byRef.has(c.name)) byRef.set(c.name, c);
    if (!order.has(c.id)) order.set(c.id, i);
    for (const p of c.partOf ?? []) {
      let list = childrenByRef.get(p);
      if (!list) {
        list = [];
        childrenByRef.set(p, list);
      }
      // A record listing the same parent twice still counts once.
      if (list[list.length - 1] !== c) list.push(c);
    }
  }
  return { byRef, childrenByRef, order };
}

/** Resolve a partOf reference (id or name) to its record, if any. */
export function resolveConflictRef(rel: ConflictRelations, ref: string): Conflict | undefined {
  return rel.byRef.get(ref);
}

/** Conflicts whose partOf names `parent` by id or name, in dataset order. */
export function getConflictChildren(rel: ConflictRelations, parent: Conflict): Conflict[] {
  const byId = rel.childrenByRef.get(parent.id) ?? [];
  const byName = parent.name === parent.id ? [] : (rel.childrenByRef.get(parent.name) ?? []);
  if (byName.length === 0) return byId.slice();
  if (byId.length === 0) return byName.slice();
  const seen = new Set<string>();
  const merged: Conflict[] = [];
  for (const c of byId) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  }
  for (const c of byName) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  }
  return merged.sort((a, b) => (rel.order.get(a.id) ?? 0) - (rel.order.get(b.id) ?? 0));
}

/* ─────────────────────────────────────────────────────────────
 * Text merge (conflicts-core + conflicts-text → full records).
 * ─────────────────────────────────────────────────────────── */

/**
 * Merge the lazily-loaded text fields into the core records. Builds new
 * objects for the records that gain fields and reuses the rest; returns the
 * input array itself when nothing changed so callers can skip a state
 * update.
 */
export function mergeConflictText(conflicts: Conflict[], text: ConflictTextMap): Conflict[] {
  let changed = false;
  const out = conflicts.map((c) => {
    const t = text[c.id];
    if (!t) return c;
    if (
      t.description === c.description &&
      t.hook === c.hook &&
      t.narrative === c.narrative &&
      t.significance === c.significance &&
      t.sources === c.sources
    ) {
      return c;
    }
    changed = true;
    return { ...c, ...t };
  });
  return changed ? out : conflicts;
}

/** Plain-text citation used by the Cite buttons (sidebar + mobile dock). */
export function conflictCitation(c: Conflict, origin: string): string {
  return `${c.name} (${formatYearRange(c.startYear, c.endYear)}). War Atlas. ${origin}/c/${c.id}`;
}

export function getMajorConflicts(allConflicts: Conflict[]): Conflict[] {
  return allConflicts.filter((c) => c.importance >= 4);
}
