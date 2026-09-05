import { describe, expect, it } from 'vitest';
import { buildYearIndex, getActiveConflicts, getAutoSpeed } from '@/lib/conflicts';
import type { Conflict } from '@/lib/types';

function conflict(overrides: Partial<Conflict> & Pick<Conflict, 'id' | 'startYear' | 'endYear'>): Conflict {
  return {
    name: overrides.id,
    coordinates: [10, 50],
    locations: [],
    countries: [],
    partOf: [],
    casualties: null,
    wikipediaUrl: null,
    importance: 3,
    description: '',
    ...overrides,
  };
}

const MAX_SPEED = 1200;

describe('getActiveConflicts', () => {
  const war = conflict({ id: 'war', startYear: 1000, endYear: 1010 });

  it('is invisible before the fade-in window and fully active within the span', () => {
    expect(getActiveConflicts(997, [war])).toHaveLength(0);
    expect(getActiveConflicts(998, [war])).toHaveLength(0); // opacity exactly 0

    const [at999] = getActiveConflicts(999, [war]);
    expect(at999.isActive).toBe(false);
    expect(at999.opacity).toBeCloseTo(0.5);

    for (const y of [1000, 1005, 1010]) {
      const [c] = getActiveConflicts(y, [war]);
      expect(c.isActive).toBe(true);
      expect(c.opacity).toBe(1);
    }
  });

  it('fades out over two years after endYear, then disappears', () => {
    const [at1011] = getActiveConflicts(1011, [war]);
    expect(at1011.isActive).toBe(false);
    expect(at1011.opacity).toBeCloseTo(0.5);
    expect(getActiveConflicts(1012, [war])).toHaveLength(0);
    expect(getActiveConflicts(1013, [war])).toHaveLength(0);
  });

  it('treats endYear null as ongoing forever with no fade-out', () => {
    const ongoing = conflict({ id: 'ongoing', startYear: 2014, endYear: null });
    for (const y of [2014, 2020, 2500]) {
      const [c] = getActiveConflicts(y, [ongoing]);
      expect(c.isActive).toBe(true);
      expect(c.opacity).toBe(1);
    }
    expect(getActiveConflicts(2013, [ongoing])[0].opacity).toBeCloseTo(0.5);
    expect(getActiveConflicts(2011, [ongoing])).toHaveLength(0);
  });

  it('dims faded conflicts harder when many others are active', () => {
    const ended = conflict({ id: 'ended', startYear: 1900, endYear: 1910 });
    const crowd = Array.from({ length: 11 }, (_, i) =>
      conflict({ id: `active-${i}`, startYear: 1900, endYear: 1950 }),
    );
    const faded = getActiveConflicts(1911, [ended, ...crowd]).find((c) => c.id === 'ended');
    expect(faded).toBeDefined();
    expect(faded!.opacity).toBeCloseTo(0.5 * 0.6);
  });

  it('sorts active conflicts above fading ones of the same importance', () => {
    const ended = conflict({ id: 'ended', startYear: 1900, endYear: 1910, importance: 3 });
    const live = conflict({ id: 'live', startYear: 1905, endYear: 1920, importance: 3 });
    const ids = getActiveConflicts(1911, [ended, live]).map((c) => c.id);
    expect(ids).toEqual(['live', 'ended']);
  });
});

describe('getAutoSpeed', () => {
  const war = conflict({ id: 'war', startYear: 1000, endYear: 1020, importance: 3 });

  it('returns MAX_SPEED in an empty stretch with no conflict in sight', () => {
    expect(getAutoSpeed(-2500, [])).toBe(MAX_SPEED);
    expect(getAutoSpeed(500, [war])).toBe(MAX_SPEED); // 500 years before the next start
  });

  it('slows down as it approaches the next conflict', () => {
    const far = getAutoSpeed(991, [war]); // gap 9 > LOOKAHEAD
    const near = getAutoSpeed(996, [war]); // gap 4
    const closer = getAutoSpeed(999, [war]); // gap 1
    expect(far).toBe(MAX_SPEED);
    expect(near).toBeLessThan(MAX_SPEED);
    expect(closer).toBeLessThan(near);
    expect(closer).toBeGreaterThanOrEqual(20);
  });

  it('crawls through a significant transition and cruises mid-conflict', () => {
    const atStart = getAutoSpeed(1000, [war]);
    const midway = getAutoSpeed(1010, [war]);
    const atEnd = getAutoSpeed(1019, [war]);
    expect(atStart).toBe(20);
    expect(atEnd).toBe(20);
    expect(midway).toBe(40);
  });

  it('ignores minor entries when looking for transitions', () => {
    const minor = conflict({ id: 'minor', startYear: 1000, endYear: 1001, importance: 1 });
    expect(getAutoSpeed(1000, [minor])).toBe(40);
  });

  it('never fades out an ongoing conflict', () => {
    const ongoing = conflict({ id: 'ongoing', startYear: 2000, endYear: null, importance: 4 });
    expect(getAutoSpeed(2050, [ongoing])).toBe(40);
  });
});

describe('buildYearIndex fast path', () => {
  const dataset: Conflict[] = [
    conflict({ id: 'a', startYear: -50, endYear: -40, importance: 4 }),
    conflict({ id: 'b', startYear: -45, endYear: -45, importance: 1 }),
    conflict({ id: 'c', startYear: 0, endYear: 12, importance: 3, casualties: 5000 }),
    conflict({ id: 'd', startYear: 5, endYear: 5, importance: 5 }),
    conflict({ id: 'e', startYear: 30, endYear: null, importance: 2 }),
    conflict({ id: 'f', startYear: 31, endYear: 400, importance: 3 }), // era-scale
    ...Array.from({ length: 12 }, (_, i) => conflict({ id: `crowd-${i}`, startYear: 10, endYear: 20 })),
  ];

  it('reproduces the full-scan results for integer and fractional years', () => {
    const index = buildYearIndex(dataset);
    for (let y = -60; y <= 60; y += 0.5) {
      const slow = getActiveConflicts(y, dataset);
      const fast = getActiveConflicts(y, dataset, index);
      expect(fast, `getActiveConflicts(${y})`).toEqual(slow);
      expect(getAutoSpeed(y, index), `getAutoSpeed(${y})`).toBeCloseTo(getAutoSpeed(y, dataset), 10);
    }
  });
});
