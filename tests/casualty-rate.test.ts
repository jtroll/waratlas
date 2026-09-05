import { describe, expect, it } from 'vitest';
import { buildYearIndex, getYearEvents } from '@/lib/conflicts';
import {
  casualtyRatePerYear,
  cumulativeDeathsThrough,
  deathsInYear,
  perYearDeaths,
} from '@/lib/casualty-rate';
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
    ...overrides,
  };
}

const THIS_YEAR = new Date().getFullYear();

describe('perYearDeaths', () => {
  // Five calendar years: 1000, 1001, 1002, 1003, 1004.
  const fiveYear = conflict({ id: 'five', startYear: 1000, endYear: 1004, casualties: 100_000 });

  it('spreads a five-year war of 100k as 20k into each of its years', () => {
    for (const y of [1000, 1001, 1002, 1003, 1004]) {
      expect(perYearDeaths(fiveYear, y)).toBeCloseTo(20_000);
    }
  });

  it('contributes nothing outside the span', () => {
    expect(perYearDeaths(fiveYear, 999)).toBe(0);
    expect(perYearDeaths(fiveYear, 1005)).toBe(0);
  });

  it('puts a single-year battle entirely in that year', () => {
    const battle = conflict({ id: 'battle', startYear: 1066, endYear: 1066, casualties: 10_000 });
    expect(perYearDeaths(battle, 1066)).toBe(10_000);
    expect(casualtyRatePerYear(battle)).toBe(10_000);
  });

  it('ignores records without a recorded toll', () => {
    const unknown = conflict({ id: 'unknown', startYear: 1000, endYear: 1010, casualties: null });
    expect(perYearDeaths(unknown, 1005)).toBe(0);
  });

  it('runs an open-ended conflict to the current calendar year', () => {
    const ongoing = conflict({ id: 'ongoing', startYear: THIS_YEAR - 3, endYear: null, casualties: 4_000 });
    expect(perYearDeaths(ongoing, THIS_YEAR)).toBeCloseTo(1_000);
    expect(perYearDeaths(ongoing, THIS_YEAR - 3)).toBeCloseTo(1_000);
  });

  it('uses the headline figure, not the casualtyRange midpoint', () => {
    const ranged = conflict({
      id: 'ranged', startYear: 1900, endYear: 1900, casualties: 100,
      casualtyRange: { low: 1_000, high: 9_000 },
    });
    expect(perYearDeaths(ranged, 1900)).toBe(100);
  });
});

describe('deathsInYear / cumulativeDeathsThrough', () => {
  const data: Conflict[] = [
    conflict({ id: 'five', startYear: 1000, endYear: 1004, casualties: 100_000 }),
    conflict({ id: 'overlap', startYear: 1003, endYear: 1006, casualties: 40_000 }),
    conflict({ id: 'battle', startYear: 1066, endYear: 1066, casualties: 10_000 }),
    conflict({ id: 'unknown', startYear: 1000, endYear: 1100, casualties: null }),
    conflict({ id: 'ongoing', startYear: THIS_YEAR - 1, endYear: null, casualties: 2_000 }),
  ];
  const index = buildYearIndex(data);
  const headlineTotal = 100_000 + 40_000 + 10_000 + 2_000;

  it('sums the per-year shares of every active conflict (index and scan agree)', () => {
    expect(deathsInYear(1001, data)).toBeCloseTo(20_000);
    expect(deathsInYear(1003, data)).toBeCloseTo(30_000);
    expect(deathsInYear(1005, data)).toBeCloseTo(10_000);
    expect(deathsInYear(1050, data)).toBe(0);
    for (const y of [999, 1000, 1001, 1003, 1005, 1007, 1066, 1067, THIS_YEAR]) {
      expect(deathsInYear(y, index)).toBeCloseTo(deathsInYear(y, data));
    }
  });

  it('cumulative at the present equals the sum of every headline figure', () => {
    expect(cumulativeDeathsThrough(THIS_YEAR, index)).toBeCloseTo(headlineTotal);
    expect(cumulativeDeathsThrough(THIS_YEAR, data)).toBeCloseTo(headlineTotal);
    expect(cumulativeDeathsThrough(THIS_YEAR + 50, index)).toBeCloseTo(headlineTotal);
  });

  it('is a running prefix sum', () => {
    expect(cumulativeDeathsThrough(999, index)).toBe(0);
    expect(cumulativeDeathsThrough(1000, index)).toBeCloseTo(20_000);
    expect(cumulativeDeathsThrough(1004, index)).toBeCloseTo(100_000 + 20_000);
    expect(cumulativeDeathsThrough(1066, index)).toBeCloseTo(150_000);
    expect(cumulativeDeathsThrough(1066, data)).toBeCloseTo(150_000);
    expect(cumulativeDeathsThrough(-5000, index)).toBe(0);
  });
});

describe('getYearEvents', () => {
  const data: Conflict[] = [
    conflict({ id: 'minor', startYear: 1939, endYear: 1940, importance: 1 }),
    conflict({ id: 'ww2', startYear: 1939, endYear: 1945, importance: 5, casualties: 70_000_000 }),
    conflict({ id: 'winter', startYear: 1939, endYear: 1940, importance: 3, casualties: 150_000 }),
    conflict({ id: 'spanish', startYear: 1936, endYear: 1939, importance: 4, casualties: 500_000 }),
    conflict({ id: 'single', startYear: 1939, endYear: 1939, importance: 3, casualties: 200_000 }),
    conflict({ id: 'elsewhere', startYear: 1900, endYear: 1902, importance: 5 }),
  ];
  const index = buildYearIndex(data);

  it('lists what began and what ended, most important first', () => {
    const ev = getYearEvents(1939, index);
    expect(ev.started.map((c) => c.id)).toEqual(['ww2', 'single', 'winter', 'minor']);
    expect(ev.ended.map((c) => c.id)).toEqual(['spanish', 'single']);
  });

  it('agrees with the full scan and returns empty lists for a quiet year', () => {
    const ev = getYearEvents(1939, data);
    expect(ev.started.map((c) => c.id)).toEqual(['ww2', 'single', 'winter', 'minor']);
    expect(getYearEvents(1920, index)).toEqual({ started: [], ended: [] });
    expect(getYearEvents(-9999, index)).toEqual({ started: [], ended: [] });
  });
});
