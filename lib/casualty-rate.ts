/**
 * Honest per-year casualty figures.
 *
 * The TopBar used to sum each active conflict's TOTAL toll every year, so
 * 1939–45 all read "≈ 170M dead this year". These helpers spread each
 * conflict's headline figure evenly across the calendar years it was
 * active, so a year's figure is the sum of the shares of the wars fought
 * in it and the running total at the present equals the sum of every
 * headline figure.
 *
 * Method (documented in the TopBar tooltip):
 *   - The HEADLINE `casualties` figure is used, not the casualtyRange
 *     midpoint — the headline is the number every other surface shows, so
 *     the tallies agree with the sidebar and the exports.
 *   - The figure is divided equally over the inclusive calendar years
 *     [startYear, endYear] (min 1 year); an open-ended conflict runs to the
 *     current calendar year.
 *   - Conflicts without a recorded toll contribute nothing.
 *   - Nested records (a campaign that is `partOf` a war, both with tolls)
 *     may double count. No attempt is made to reconcile them here.
 *
 * All functions are pure. The O(1) variants read the prefix tables that
 * buildYearIndex (lib/conflicts.ts) fills using casualtyRatePerYear.
 */
import type { Conflict } from './types';
import type { YearIndex } from './conflicts';

const THIS_YEAR = new Date().getFullYear();

/** Inclusive calendar span the toll is spread over: [start, end]. */
export function casualtySpan(c: Conflict, thisYear: number = THIS_YEAR): { start: number; end: number } {
  const start = c.startYear;
  const rawEnd = c.endYear ?? Math.max(thisYear, start);
  return { start, end: Math.max(rawEnd, start) };
}

/** Deaths attributed to each active year: headline / years active (≥ 1). */
export function casualtyRatePerYear(c: Conflict, thisYear: number = THIS_YEAR): number {
  const toll = c.casualties;
  if (toll == null || !(toll > 0)) return 0;
  const { start, end } = casualtySpan(c, thisYear);
  const years = Math.max(1, end - start + 1);
  return toll / years;
}

/** Deaths attributed to `year` for one conflict; 0 outside its span. */
export function perYearDeaths(c: Conflict, year: number, thisYear: number = THIS_YEAR): number {
  const y = Math.floor(year);
  const { start, end } = casualtySpan(c, thisYear);
  if (y < start || y > end) return 0;
  return casualtyRatePerYear(c, thisYear);
}

function isYearIndex(x: unknown): x is YearIndex {
  return !!x && !Array.isArray(x) && typeof x === 'object' && 'atDeaths' in (x as object);
}

/** Table slot for an integer year, or -1 outside the index (mirrors the
 *  private helper in lib/conflicts.ts; kept local so this module never
 *  imports that one at runtime — conflicts.ts imports us). */
function slotFor(index: YearIndex, year: number): number {
  const k = Math.floor(year);
  if (!Number.isFinite(k) || k < index.minYear || k > index.maxYear) return -1;
  return k - index.minYear;
}

/** Sum of every active conflict's per-year share at `year`. O(1) with the
 *  YearIndex, O(n) with a plain array. */
export function deathsInYear(year: number, source: readonly Conflict[] | YearIndex): number {
  if (isYearIndex(source)) {
    const slot = slotFor(source, year);
    if (slot >= 0) return source.atDeaths[slot];
    return deathsInYear(year, source.conflicts);
  }
  let sum = 0;
  for (const c of source) sum += perYearDeaths(c, year);
  return sum;
}

/** Running total of per-year shares from the first recorded year through
 *  `year` (inclusive). Years before the index start read 0; years past its
 *  end read the grand total. O(1) with the YearIndex. */
export function cumulativeDeathsThrough(year: number, source: readonly Conflict[] | YearIndex): number {
  if (isYearIndex(source)) {
    const y = Math.floor(year);
    if (y < source.minYear) return 0;
    const slot = slotFor(source, Math.min(y, source.maxYear));
    return slot >= 0 ? source.cumDeaths[slot] : 0;
  }
  const y = Math.floor(year);
  let sum = 0;
  for (const c of source) {
    const rate = casualtyRatePerYear(c);
    if (rate === 0) continue;
    const { start, end } = casualtySpan(c);
    if (y < start) continue;
    sum += rate * (Math.min(y, end) - start + 1);
  }
  return sum;
}

/** "≈ 2.4M" style figure for the tallies; null when nothing is recorded. */
export function formatApprox(n: number, format: (n: number) => string): string | null {
  if (!(n > 0)) return null;
  return `≈ ${format(Math.round(n))}`;
}
