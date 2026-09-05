/**
 * Piecewise-linear timeline axis.
 *
 * The atlas spans −3100 → today (≈5,100 years) but three quarters of the
 * conflicts start after 1500 and half after 1800. A linear axis gives the
 * 226 years since 1800 four percent of the track; this axis gives each era
 * a fixed share of the width so the dense modern period is readable and
 * the Bronze Age is still there, just compressed. The non-linearity is
 * drawn honestly: every segment boundary is an "axis break" that the
 * component renders with a hairline and a ⫽ glyph.
 *
 * Everything here is pure (no DOM, no React) so it is unit-tested in
 * tests/timeline-axis.test.ts. All positions are fractions 0..1 of the
 * track width; the component multiplies by the measured pixel width.
 */

import { formatYear } from '@/lib/format';
import type { Conflict } from '@/lib/types';

/* ────────────────────────────────────────────────────────────────
 * Segment table — the thing to tune.
 *
 *   from/to     year boundaries. `to: null` means the axis maxYear.
 *   share       fraction of the track width (shares sum to 1).
 *   tickStep    base labeled-tick interval in years; doubled until the
 *               ticks are ≥ minSpacing px apart on the current track.
 *   bucketYears density histogram bucket width in years.
 *   label/short era annotation drawn inside the segment; `short` is
 *               used when the full label does not fit.
 * ──────────────────────────────────────────────────────────────── */
export interface AxisSegmentSpec {
  from: number;
  to: number | null;
  share: number;
  tickStep: number;
  bucketYears: number;
  label: string;
  short: string;
}

export const AXIS_SEGMENTS: readonly AxisSegmentSpec[] = [
  { from: -3100, to: -500, share: 0.12, tickStep: 500, bucketYears: 250, label: 'Bronze / Iron', short: 'Bronze' },
  { from: -500,  to: 1000, share: 0.18, tickStep: 250, bucketYears: 100, label: 'Classical',     short: 'Class.' },
  { from: 1000,  to: 1500, share: 0.15, tickStep: 250, bucketYears: 100, label: 'Medieval',      short: 'Med.' },
  { from: 1500,  to: 1800, share: 0.20, tickStep: 100, bucketYears: 50,  label: 'Early Modern',  short: 'E. Mod.' },
  { from: 1800,  to: null, share: 0.35, tickStep: 25,  bucketYears: 10,  label: 'Modern',        short: 'Mod.' },
];

/** Default histogram bucket widths per segment (years), index-aligned
 *  with AXIS_SEGMENTS. Exported so callers can pass a coarser table
 *  (e.g. on a narrow track). */
export const DEFAULT_BUCKET_YEARS: readonly number[] = AXIS_SEGMENTS.map((s) => s.bucketYears);

/** A segment resolved against a concrete [minYear, maxYear] range. */
export interface AxisSegment {
  from: number;
  to: number;
  /** fraction of the track, 0..1 */
  share: number;
  /** track position of `from`, 0..1 */
  pos0: number;
  /** track position of `to`, 0..1 */
  pos1: number;
  tickStep: number;
  bucketYears: number;
  label: string;
  short: string;
}

export interface AxisBreak {
  year: number;
  pos: number;
}

export interface AxisTick {
  year: number;
  pos: number;
  /** formatted label, or null for an unlabeled minor tick */
  label: string | null;
  major: boolean;
  /** true at a segment boundary (drawn with the ⫽ break glyph) */
  isBreak: boolean;
  /** how the label sits on the tick: centred, or flushed inward at the
   *  track ends so it never spills outside the track */
  align: 'start' | 'center' | 'end';
}

export interface TickOptions {
  /** minimum px between labeled ticks (default 28) */
  minSpacing?: number;
  /** estimated px per label character, used to avoid label overlap
   *  (JetBrains Mono at 10px ≈ 6px advance; default 6.2) */
  charPx?: number;
  /** px of air between adjacent labels (default 6) */
  labelGap?: number;
  /** include unlabeled minor ticks between majors (default true) */
  minors?: boolean;
  /** minimum px between minor ticks (default 8) */
  minorSpacing?: number;
}

export interface DensityBucket {
  /** inclusive */
  startYear: number;
  /** exclusive, except for the final bucket which includes maxYear */
  endYear: number;
  /** importance-weighted count: importance ≥4 ×3, ≥3 ×2, else ×1 */
  weight: number;
  /** weight contributed by importance ≥4 conflicts only */
  weightMajor: number;
  /** plain number of conflicts starting in the bucket */
  count: number;
  /** up to three conflicts, highest importance first */
  top: Array<{ id: string; name: string; importance: number }>;
}

export interface TimelineAxis {
  minYear: number;
  maxYear: number;
  segments: AxisSegment[];
  yearToPos(year: number): number;
  posToYear(pos: number): number;
  axisBreaks(): AxisBreak[];
  ticks(trackPx: number, opts?: TickOptions): AxisTick[];
  densityBuckets(conflicts: readonly Conflict[], bucketYearsBySegment?: readonly number[]): DensityBucket[];
  /** index of the bucket containing `year` in a bucket list produced by
   *  densityBuckets(); clamped to the ends */
  bucketIndexAt(buckets: readonly DensityBucket[], year: number): number;
}

/** Density weight of one conflict. Every conflict counts (there is no
 *  war/battle distinction); importance only scales the weight. */
export function conflictWeight(importance: number): number {
  return importance >= 4 ? 3 : importance >= 3 ? 2 : 1;
}

/** log-scaled bar height fraction: log1p(w)/log1p(max), 0 when w is 0. */
export function densityHeight(weight: number, maxWeight: number): number {
  if (weight <= 0 || maxWeight <= 0) return 0;
  // Square-root scaling: a log axis flattened the histogram into a plateau
  // (most buckets at 60-100% height), while linear hid the sparse eras. sqrt
  // keeps a single Bronze Age war visible and still lets the 19th-century
  // peak read as a peak.
  return Math.sqrt(weight / maxWeight);
}

/** Resolve the segment table against a concrete range. Segments that
 *  fall entirely outside the range are dropped and the remaining shares
 *  are renormalized so the axis always fills the track. */
function resolveSegments(minYear: number, maxYear: number, table: readonly AxisSegmentSpec[]): AxisSegment[] {
  const clipped: Array<AxisSegmentSpec & { to: number }> = [];
  for (const s of table) {
    const from = Math.max(s.from, minYear);
    const to = Math.min(s.to ?? maxYear, maxYear);
    if (to <= from) continue;
    clipped.push({ ...s, from, to });
  }
  if (clipped.length === 0) {
    // Degenerate range — a single linear segment.
    const s = table[table.length - 1];
    clipped.push({ ...s, from: minYear, to: maxYear, share: 1 });
  }
  const total = clipped.reduce((acc, s) => acc + s.share, 0);
  let pos = 0;
  return clipped.map((s, i) => {
    const share = s.share / total;
    const pos0 = pos;
    // Pin the last segment to exactly 1 so float error never leaves a gap.
    const pos1 = i === clipped.length - 1 ? 1 : pos + share;
    pos = pos1;
    return {
      from: s.from,
      to: s.to,
      share: pos1 - pos0,
      pos0,
      pos1,
      tickStep: s.tickStep,
      bucketYears: s.bucketYears,
      label: s.label,
      short: s.short,
    };
  });
}

export function createAxis(
  minYear: number,
  maxYear: number,
  table: readonly AxisSegmentSpec[] = AXIS_SEGMENTS
): TimelineAxis {
  const segments = resolveSegments(minYear, maxYear, table);
  const last = segments.length - 1;

  const segmentForYear = (year: number): AxisSegment => {
    for (let i = 0; i < last; i++) {
      if (year < segments[i].to) return segments[i];
    }
    return segments[last];
  };

  const segmentForPos = (pos: number): AxisSegment => {
    for (let i = 0; i < last; i++) {
      if (pos < segments[i].pos1) return segments[i];
    }
    return segments[last];
  };

  const yearToPos = (year: number): number => {
    if (year <= minYear) return 0;
    if (year >= maxYear) return 1;
    const s = segmentForYear(year);
    return s.pos0 + ((year - s.from) / (s.to - s.from)) * (s.pos1 - s.pos0);
  };

  const posToYear = (pos: number): number => {
    if (pos <= 0) return minYear;
    if (pos >= 1) return maxYear;
    const s = segmentForPos(pos);
    return s.from + ((pos - s.pos0) / (s.pos1 - s.pos0)) * (s.to - s.from);
  };

  const axisBreaks = (): AxisBreak[] =>
    segments.slice(1).map((s) => ({ year: s.from, pos: s.pos0 }));

  const ticks = (trackPx: number, opts: TickOptions = {}): AxisTick[] => {
    const minSpacing = opts.minSpacing ?? 28;
    const charPx = opts.charPx ?? 6.2;
    const labelGap = opts.labelGap ?? 6;
    const wantMinors = opts.minors ?? true;
    const minorSpacing = opts.minorSpacing ?? 8;

    type Align = AxisTick['align'];
    type Cand = { year: number; pos: number; isBreak: boolean; label: string; align: Align };
    const labelOf = (y: number) => formatYear(y);
    const width = (label: string) => label.length * charPx;

    // Label box in px on the track; end labels flush inward.
    const box = (pos: number, label: string): { x0: number; x1: number; align: Align } => {
      const x = pos * trackPx;
      const w = width(label);
      if (x - w / 2 < 0) return { x0: x, x1: x + w, align: 'start' };
      if (x + w / 2 > trackPx) return { x0: x - w, x1: x, align: 'end' };
      return { x0: x - w / 2, x1: x + w / 2, align: 'center' };
    };

    // Pass 1 — segment boundaries are always labeled majors (they are the
    // axis breaks and the reader needs to know where the scale changes).
    const placed: Cand[] = axisBreaks().map((b) => {
      const label = labelOf(b.year);
      return { year: b.year, pos: b.pos, isBreak: true, label, align: box(b.pos, label).align };
    });

    const collides = (c: Cand) => {
      const x = c.pos * trackPx;
      const cb = box(c.pos, c.label);
      return placed.some((p) => {
        const px = p.pos * trackPx;
        if (Math.abs(px - x) < minSpacing) return true;
        const pb = box(p.pos, p.label);
        return cb.x0 < pb.x1 + labelGap && pb.x0 < cb.x1 + labelGap;
      });
    };

    // Pass 2 — per-segment majors, with the step doubled until ticks are
    // at least minSpacing apart, then dropped individually if their label
    // would overlap something already placed.
    const majorsBySegment: number[][] = [];
    for (const s of segments) {
      const pxPerYear = ((s.pos1 - s.pos0) * trackPx) / (s.to - s.from);
      let step = s.tickStep;
      while (step * pxPerYear < minSpacing && step < 1e7) step *= 2;
      const years: number[] = [];
      const first = Math.ceil(s.from / step) * step;
      for (let y = first; y <= s.to; y += step) {
        // Year 0 does not exist; the axis labels 1 CE instead.
        const year = y === 0 ? 1 : y;
        if (year <= minYear || year >= maxYear) continue;
        years.push(year);
      }
      majorsBySegment.push(years);
      for (const year of years) {
        if (placed.some((p) => p.year === year)) continue;
        const label = labelOf(year);
        const pos = yearToPos(year);
        const c: Cand = { year, pos, isBreak: false, label, align: box(pos, label).align };
        if (collides(c)) continue;
        placed.push(c);
      }
    }

    const out: AxisTick[] = placed.map((p) => ({
      year: p.year, pos: p.pos, label: p.label, major: true, isBreak: p.isBreak, align: p.align,
    }));
    const have = new Set(out.map((t) => t.year));

    // Pass 3 — unlabeled minors halfway between majors (and the majors that
    // lost their label), thinned to minorSpacing.
    if (wantMinors) {
      segments.forEach((s, i) => {
        const pxPerYear = ((s.pos1 - s.pos0) * trackPx) / (s.to - s.from);
        const majors = majorsBySegment[i];
        const step = majors.length >= 2 ? majors[1] - majors[0] : s.tickStep;
        const minorStep = step / 2;
        if (minorStep * pxPerYear < minorSpacing) {
          // Not even room for halves — keep only the demoted majors.
          for (const y of majors) {
            if (!have.has(y) && step * pxPerYear >= minorSpacing) {
              have.add(y);
              out.push({ year: y, pos: yearToPos(y), label: null, major: false, isBreak: false, align: 'center' });
            }
          }
          return;
        }
        const first = Math.ceil(s.from / minorStep) * minorStep;
        for (let y = first; y <= s.to; y += minorStep) {
          const year = y === 0 ? 1 : y;
          if (year <= minYear || year >= maxYear || have.has(year)) continue;
          have.add(year);
          out.push({ year, pos: yearToPos(year), label: null, major: false, isBreak: false, align: 'center' });
        }
      });
    }

    out.sort((a, b) => a.year - b.year);
    return out;
  };

  const densityBuckets = (
    conflicts: readonly Conflict[],
    bucketYearsBySegment: readonly number[] = DEFAULT_BUCKET_YEARS
  ): DensityBucket[] => {
    const buckets: DensityBucket[] = [];
    segments.forEach((s, i) => {
      const width = Math.max(1, bucketYearsBySegment[i] ?? s.bucketYears);
      for (let y = s.from; y < s.to; y += width) {
        buckets.push({
          startYear: y,
          endYear: Math.min(y + width, s.to),
          weight: 0,
          weightMajor: 0,
          count: 0,
          top: [],
        });
      }
    });

    for (const c of conflicts) {
      const b = buckets[bucketIndexAt(buckets, c.startYear)];
      const w = conflictWeight(c.importance);
      b.weight += w;
      b.count += 1;
      if (c.importance >= 4) b.weightMajor += w;
      // Keep the three most important names; casualties break ties so a
      // major war outranks a same-importance battle in the chip.
      const t = b.top as Array<DensityBucket['top'][number] & { casualties: number }>;
      const entry = { id: c.id, name: c.name, importance: c.importance, casualties: c.casualties ?? 0 };
      const rank = (a: typeof entry, z: typeof entry) =>
        z.importance - a.importance || z.casualties - a.casualties;
      if (t.length < 3) {
        t.push(entry);
        t.sort(rank);
      } else if (rank(entry, t[2]) < 0) {
        t[2] = entry;
        t.sort(rank);
      }
    }
    return buckets;
  };

  function bucketIndexAt(buckets: readonly DensityBucket[], year: number): number {
    if (buckets.length === 0) return -1;
    if (year < buckets[0].startYear) return 0;
    let lo = 0;
    let hi = buckets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (buckets[mid].startYear <= year) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  return {
    minYear,
    maxYear,
    segments,
    yearToPos,
    posToYear,
    axisBreaks,
    ticks,
    densityBuckets,
    bucketIndexAt,
  };
}

/** "1850–1860", "500–250 BCE", "250 BCE–1 CE": the label of a bucket's
 *  range for the hover chip. `endYear` is exclusive, shown as-is because
 *  readers expect "1850–1860", not "1850–1859". */
export function formatBucketRange(startYear: number, endYear: number): string {
  if (startYear < 0 && endYear <= 0) return `${-startYear}–${endYear === 0 ? 1 : -endYear} BCE`;
  if (startYear >= 1000 && endYear >= 1000) return `${startYear}–${endYear}`;
  return `${formatYear(startYear)}–${formatYear(endYear)}`;
}
