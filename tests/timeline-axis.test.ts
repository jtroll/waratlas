import { describe, expect, it } from 'vitest';
import {
  AXIS_SEGMENTS,
  conflictWeight,
  createAxis,
  densityHeight,
  formatBucketRange,
} from '@/lib/timeline-axis';
import type { Conflict } from '@/lib/types';

const MIN = -3100;
const MAX = 2026;

/** Deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fakeConflict(i: number, startYear: number, importance: number): Conflict {
  return {
    id: `c${i}`,
    name: `Conflict ${i}`,
    startYear,
    endYear: startYear + (i % 7),
    coordinates: [0, 0],
    locations: [],
    countries: [],
    partOf: [],
    casualties: null,
    wikipediaUrl: null,
    importance,
  };
}

describe('AXIS_SEGMENTS table', () => {
  it('shares sum to 1 and segments are contiguous', () => {
    const sum = AXIS_SEGMENTS.reduce((a, s) => a + s.share, 0);
    expect(sum).toBeCloseTo(1, 10);
    for (let i = 1; i < AXIS_SEGMENTS.length; i++) {
      expect(AXIS_SEGMENTS[i].from).toBe(AXIS_SEGMENTS[i - 1].to);
    }
    expect(AXIS_SEGMENTS[AXIS_SEGMENTS.length - 1].to).toBeNull();
  });
});

describe('yearToPos / posToYear', () => {
  const axis = createAxis(MIN, MAX);

  it('maps the ends to 0 and 1', () => {
    expect(axis.yearToPos(MIN)).toBe(0);
    expect(axis.yearToPos(MAX)).toBe(1);
    expect(axis.posToYear(0)).toBe(MIN);
    expect(axis.posToYear(1)).toBe(MAX);
  });

  it('round-trips 200 random years', () => {
    const rnd = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const year = MIN + rnd() * (MAX - MIN);
      const back = axis.posToYear(axis.yearToPos(year));
      expect(Math.abs(back - year)).toBeLessThan(1e-6);
    }
  });

  it('round-trips 200 random positions', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const pos = rnd();
      const back = axis.yearToPos(axis.posToYear(pos));
      expect(Math.abs(back - pos)).toBeLessThan(1e-9);
    }
  });

  it('is strictly monotonic', () => {
    let prev = axis.yearToPos(MIN);
    for (let y = MIN + 1; y <= MAX; y += 1) {
      const p = axis.yearToPos(y);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    let prevYear = axis.posToYear(0);
    for (let i = 1; i <= 1000; i++) {
      const y = axis.posToYear(i / 1000);
      expect(y).toBeGreaterThan(prevYear);
      prevYear = y;
    }
  });

  it('clamps outside the range', () => {
    expect(axis.yearToPos(MIN - 500)).toBe(0);
    expect(axis.yearToPos(MAX + 500)).toBe(1);
    expect(axis.posToYear(-0.2)).toBe(MIN);
    expect(axis.posToYear(1.2)).toBe(MAX);
  });
});

describe('axisBreaks', () => {
  const axis = createAxis(MIN, MAX);

  it('falls at the exact segment boundaries with cumulative shares', () => {
    const breaks = axis.axisBreaks();
    expect(breaks.map((b) => b.year)).toEqual([-500, 1000, 1500, 1800]);
    expect(breaks[0].pos).toBeCloseTo(0.12, 12);
    expect(breaks[1].pos).toBeCloseTo(0.30, 12);
    expect(breaks[2].pos).toBeCloseTo(0.45, 12);
    expect(breaks[3].pos).toBeCloseTo(0.65, 12);
    for (const b of breaks) {
      expect(axis.yearToPos(b.year)).toBeCloseTo(b.pos, 12);
      expect(axis.posToYear(b.pos)).toBeCloseTo(b.year, 9);
    }
  });

  it('drops segments outside a narrower range and renormalizes', () => {
    const narrow = createAxis(1200, 2026);
    expect(narrow.segments.map((s) => s.from)).toEqual([1200, 1500, 1800]);
    expect(narrow.segments[0].pos0).toBe(0);
    expect(narrow.segments[2].pos1).toBe(1);
    expect(narrow.yearToPos(1500)).toBeCloseTo(0.15 / 0.7, 12);
  });
});

describe('ticks', () => {
  const axis = createAxis(MIN, MAX);

  for (const trackPx of [600, 1400]) {
    it(`keeps labeled and major ticks ≥ 28 px apart at ${trackPx} px`, () => {
      const ticks = axis.ticks(trackPx);
      const majors = ticks.filter((t) => t.major);
      expect(majors.length).toBeGreaterThan(5);
      for (let i = 1; i < majors.length; i++) {
        const gap = (majors[i].pos - majors[i - 1].pos) * trackPx;
        expect(gap).toBeGreaterThanOrEqual(28);
      }
      // Every major carries a label; minors never do.
      for (const t of ticks) {
        expect(t.label !== null).toBe(t.major);
      }
      // Labels do not overlap at the estimated glyph width and stay
      // inside the track.
      const labeled = ticks.filter((t) => t.label);
      const boxOf = (t: (typeof labeled)[number]) => {
        const x = t.pos * trackPx;
        const w = t.label!.length * 6.2;
        if (t.align === 'start') return [x, x + w];
        if (t.align === 'end') return [x - w, x];
        return [x - w / 2, x + w / 2];
      };
      for (let i = 0; i < labeled.length; i++) {
        const [x0, x1] = boxOf(labeled[i]);
        expect(x0).toBeGreaterThanOrEqual(-1e-9);
        expect(x1).toBeLessThanOrEqual(trackPx + 1e-9);
        if (i > 0) {
          const [, prevX1] = boxOf(labeled[i - 1]);
          expect(x0).toBeGreaterThanOrEqual(prevX1 + 6 - 1e-9);
        }
      }
    });

    it(`minor ticks are ≥ 8 px apart at ${trackPx} px`, () => {
      const ticks = axis.ticks(trackPx);
      for (let i = 1; i < ticks.length; i++) {
        const gap = (ticks[i].pos - ticks[i - 1].pos) * trackPx;
        expect(gap).toBeGreaterThanOrEqual(8 - 1e-9);
      }
    });
  }

  it('always labels the axis breaks, formatted via formatYear', () => {
    const ticks = axis.ticks(1000);
    const breaks = ticks.filter((t) => t.isBreak);
    expect(breaks.map((t) => t.label)).toEqual(['500 BCE', '1000', '1500', '1800']);
  });

  it('uses BCE labels and 1 CE instead of a year 0', () => {
    const ticks = axis.ticks(1400);
    const labels = ticks.filter((t) => t.label).map((t) => t.label);
    expect(labels).toContain('3000 BCE');
    expect(labels).toContain('1 CE');
    expect(labels).not.toContain('1 BCE');
    expect(ticks.some((t) => t.year === 0)).toBe(false);
  });

  it('thins to a coarser step on a narrow track', () => {
    const wide = axis.ticks(1400).filter((t) => t.major).length;
    const narrow = axis.ticks(300).filter((t) => t.major).length;
    expect(narrow).toBeLessThan(wide);
    expect(narrow).toBeGreaterThan(0);
  });

  it('omits minors when asked', () => {
    const ticks = axis.ticks(1000, { minors: false });
    expect(ticks.every((t) => t.major)).toBe(true);
  });

  it('is sorted by year with unique years', () => {
    const ticks = axis.ticks(1000);
    const years = ticks.map((t) => t.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(new Set(years).size).toBe(years.length);
  });
});

describe('densityBuckets', () => {
  const axis = createAxis(MIN, MAX);
  const rnd = mulberry32(99);
  const conflicts: Conflict[] = [];
  for (let i = 0; i < 2000; i++) {
    // Bias to the modern era like the real data, but cover everything.
    const year = rnd() < 0.5
      ? Math.floor(1800 + rnd() * 226)
      : Math.floor(MIN + rnd() * (MAX - MIN));
    conflicts.push(fakeConflict(i, year, 1 + Math.floor(rnd() * 5)));
  }
  // Edge cases: exactly on the ends and on every break.
  conflicts.push(fakeConflict(9001, MIN, 5));
  conflicts.push(fakeConflict(9002, MAX, 5));
  conflicts.push(fakeConflict(9003, -500, 4));
  conflicts.push(fakeConflict(9004, 1000, 3));
  conflicts.push(fakeConflict(9005, 1500, 2));
  conflicts.push(fakeConflict(9006, 1800, 1));

  const buckets = axis.densityBuckets(conflicts);

  it('covers the range with no gaps or overlaps', () => {
    expect(buckets[0].startYear).toBe(MIN);
    expect(buckets[buckets.length - 1].endYear).toBe(MAX);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].startYear).toBe(buckets[i - 1].endYear);
      expect(buckets[i].endYear).toBeGreaterThan(buckets[i].startYear);
    }
  });

  it('uses the per-segment bucket widths', () => {
    const widthAt = (year: number) => {
      const b = buckets[axis.bucketIndexAt(buckets, year)];
      return b.endYear - b.startYear;
    };
    expect(widthAt(-2000)).toBe(250);
    expect(widthAt(300)).toBe(100);
    expect(widthAt(1200)).toBe(100);
    expect(widthAt(1600)).toBe(50);
    expect(widthAt(1900)).toBe(10);
  });

  it('total weight equals the naive sum and every conflict is counted once', () => {
    const naive = conflicts.reduce((a, c) => a + conflictWeight(c.importance), 0);
    const naiveMajor = conflicts
      .filter((c) => c.importance >= 4)
      .reduce((a, c) => a + conflictWeight(c.importance), 0);
    expect(buckets.reduce((a, b) => a + b.weight, 0)).toBe(naive);
    expect(buckets.reduce((a, b) => a + b.weightMajor, 0)).toBe(naiveMajor);
    expect(buckets.reduce((a, b) => a + b.count, 0)).toBe(conflicts.length);
  });

  it('places a conflict in the bucket containing its start year', () => {
    for (const c of conflicts) {
      const b = buckets[axis.bucketIndexAt(buckets, c.startYear)];
      expect(c.startYear).toBeGreaterThanOrEqual(b.startYear);
      if (c.startYear < MAX) expect(c.startYear).toBeLessThan(b.endYear);
    }
  });

  it('keeps the top three by importance', () => {
    for (const b of buckets) {
      expect(b.top.length).toBeLessThanOrEqual(3);
      expect(b.top.length).toBe(Math.min(3, b.count));
      for (let i = 1; i < b.top.length; i++) {
        expect(b.top[i].importance).toBeLessThanOrEqual(b.top[i - 1].importance);
      }
    }
  });

  it('accepts a custom bucket-width table', () => {
    const coarse = axis.densityBuckets(conflicts, [500, 250, 250, 100, 25]);
    expect(coarse.length).toBeLessThan(buckets.length);
    expect(coarse.reduce((a, b) => a + b.weight, 0)).toBe(
      buckets.reduce((a, b) => a + b.weight, 0)
    );
  });
});

describe('helpers', () => {
  it('weights importance ×3 / ×2 / ×1', () => {
    expect(conflictWeight(5)).toBe(3);
    expect(conflictWeight(4)).toBe(3);
    expect(conflictWeight(3)).toBe(2);
    expect(conflictWeight(2)).toBe(1);
    expect(conflictWeight(1)).toBe(1);
  });

  it('sqrt-scales heights so small buckets stay visible', () => {
    expect(densityHeight(0, 100)).toBe(0);
    expect(densityHeight(100, 100)).toBe(1);
    expect(densityHeight(1, 100)).toBeGreaterThanOrEqual(0.1);
    expect(densityHeight(10, 100)).toBeLessThan(densityHeight(20, 100));
  });

  it('formats bucket ranges', () => {
    expect(formatBucketRange(1850, 1860)).toBe('1850–1860');
    expect(formatBucketRange(-500, -250)).toBe('500–250 BCE');
    expect(formatBucketRange(-100, 0)).toBe('100–1 BCE');
    expect(formatBucketRange(0, 100)).toBe('1 BCE–100 CE');
    expect(formatBucketRange(900, 1000)).toBe('900 CE–1000');
  });
});
