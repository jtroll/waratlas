import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_SUBSTRING,
  FIELD_PREFIX,
  NAME_ALL_TOKENS,
  NAME_PREFIX,
  NAME_SUBSTRING,
  NAME_WORD_START,
  fold,
  scoreConflict,
  scoreName,
  searchAll,
  searchCities,
  searchConflicts,
  searchEmpires,
  type CitySearchFeature,
  type EmpireSearchEntry,
} from '@/lib/search';
import type { Conflict } from '@/lib/types';

function conflict(overrides: Partial<Conflict> & Pick<Conflict, 'id' | 'name'>): Conflict {
  return {
    startYear: 1000,
    endYear: 1001,
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

describe('fold', () => {
  it('lower-cases, strips diacritics and apostrophes, collapses whitespace', () => {
    expect(fold('  Hernán   Cortés ')).toBe('hernan cortes');
    expect(fold('Württemberg')).toBe('wurttemberg');
    expect(fold("King Philip's War")).toBe('king philips war');
  });
});

describe('scoreName', () => {
  it('ranks prefix > word-start > all-tokens > substring > miss', () => {
    expect(scoreName('batt', 'Battle of Hastings')).toBe(NAME_PREFIX);
    expect(scoreName('hast', 'Battle of Hastings')).toBe(NAME_WORD_START);
    expect(scoreName('war roses', 'Wars of the Roses')).toBe(NAME_ALL_TOKENS);
    expect(scoreName('stings', 'Battle of Hastings')).toBe(NAME_SUBSTRING);
    expect(scoreName('agincourt', 'Battle of Hastings')).toBe(0);
    expect(NAME_PREFIX).toBeGreaterThan(NAME_WORD_START);
    expect(NAME_WORD_START).toBeGreaterThan(NAME_ALL_TOKENS);
    expect(NAME_ALL_TOKENS).toBeGreaterThan(NAME_SUBSTRING);
  });

  it('is case- and diacritic-insensitive', () => {
    expect(scoreName('CORTES', 'Conquest of Cortés')).toBe(NAME_WORD_START);
    expect(scoreName('', 'Anything')).toBe(0);
    expect(scoreName('   ', 'Anything')).toBe(0);
  });

  it('treats punctuation as a word boundary', () => {
    expect(scoreName('persian', 'Greco-Persian Wars')).toBe(NAME_WORD_START);
  });
});

describe('scoreConflict', () => {
  const c = conflict({
    id: 'x',
    name: 'Battle of Hastings',
    countries: ['Normandy', 'England'],
    description: 'William the Conqueror defeats Harold Godwinson.',
  });

  it('prefers the name, then belligerents, then the description', () => {
    expect(scoreConflict('battle', c)).toBe(NAME_PREFIX);
    expect(scoreConflict('norman', c)).toBe(FIELD_PREFIX);
    expect(scoreConflict('godwinson', c)).toBe(DESCRIPTION_SUBSTRING);
    expect(scoreConflict('agincourt', c)).toBe(0);
    expect(NAME_SUBSTRING).toBeGreaterThan(FIELD_PREFIX);
    expect(FIELD_PREFIX).toBeGreaterThan(DESCRIPTION_SUBSTRING);
  });

  it('does not use the description when it is missing (core bundle)', () => {
    expect(scoreConflict('godwinson', { ...c, description: undefined })).toBe(0);
  });
});

describe('searchConflicts', () => {
  const data: Conflict[] = [
    conflict({ id: 'punic-3', name: 'Third Punic War', startYear: -149, endYear: -146, importance: 4, casualties: 150_000 }),
    conflict({ id: 'punic-1', name: 'First Punic War', startYear: -264, endYear: -241, importance: 4, casualties: 400_000 }),
    conflict({ id: 'punic-2', name: 'Second Punic War', startYear: -218, endYear: -201, importance: 5, casualties: 770_000 }),
    conflict({ id: 'ww2', name: 'World War II', startYear: 1939, endYear: 1945, importance: 5, casualties: 70_000_000 }),
    conflict({ id: 'ww1', name: 'World War I', startYear: 1914, endYear: 1918, importance: 5, casualties: 17_000_000 }),
    conflict({ id: 'rome-carthage', name: 'Mercenary War', countries: ['Carthage'], startYear: -240, endYear: -238, importance: 2 }),
    conflict({ id: 'noise', name: 'Unrelated', importance: 1 }),
  ];

  it('orders by score, then importance, then casualties', () => {
    const ids = searchConflicts('punic', data).map((h) => h.item.id);
    // All three are word-start matches; ties break on importance (2nd war
    // is 5) then casualties (1st > 3rd).
    expect(ids).toEqual(['punic-2', 'punic-1', 'punic-3']);
  });

  it('puts name hits above belligerent hits', () => {
    const ids = searchConflicts('carthage', data).map((h) => h.item.id);
    expect(ids).toEqual(['rome-carthage']);
    const ids2 = searchConflicts('war', data).map((h) => h.item.id);
    expect(ids2[0]).toBe('ww2');
    expect(ids2).toContain('rome-carthage');
  });

  it('caps the result count and returns nothing for an empty query', () => {
    expect(searchConflicts('war', data, 2)).toHaveLength(2);
    expect(searchConflicts('', data)).toEqual([]);
  });
});

describe('searchEmpires / searchCities', () => {
  const empires: EmpireSearchEntry[] = [
    { id: 'roman-republic', name: 'Roman Republic', startYear: -509, endYear: -27 },
    { id: 'roman-empire', name: 'Roman Empire', startYear: -27, endYear: 476 },
    { id: 'roman-empire', name: 'Roman Empire', startYear: -27, endYear: 476 },
    { id: 'holy-roman', name: 'Holy Roman Empire', startYear: 962, endYear: 1806 },
    { id: 'mongol', name: 'Mongol Empire', startYear: 1206, endYear: 1368 },
  ];

  it('dedupes by id and ranks prefix hits above word-start hits', () => {
    const ids = searchEmpires('roman', empires).map((h) => h.item.id);
    expect(ids).toEqual(['roman-empire', 'roman-republic', 'holy-roman']);
  });

  const city = (name: string, coords: [number, number], extra: Partial<CitySearchFeature['properties']> = {}): CitySearchFeature => ({
    geometry: { coordinates: coords },
    properties: { name, ...extra },
  });
  const cities: CitySearchFeature[] = [
    city('Byzantium', [28.98, 41.01], { foundedYear: -657, importance: 2 }),
    city('Constantinople', [28.98, 41.01], { foundedYear: 330, importance: 3, modernName: 'Istanbul' }),
    city('Istanbul', [28.98, 41.01], { foundedYear: 1930, importance: 3 }),
    city('Constantine', [6.61, 36.36], { foundedYear: -300, importance: 1 }),
  ];

  it('returns one hit per location and matches modern names', () => {
    const hits = searchCities('constan', cities);
    expect(hits.map((h) => h.item.properties.name)).toEqual(['Constantinople', 'Constantine']);
    expect(searchCities('istanbul', cities)).toHaveLength(1);
  });

  it('searchAll groups the three collections', () => {
    const res = searchAll('roman', { conflicts: [], empires, cities });
    expect(res.conflicts).toEqual([]);
    expect(res.empires).toHaveLength(3);
    expect(res.cities).toEqual([]);
  });
});
