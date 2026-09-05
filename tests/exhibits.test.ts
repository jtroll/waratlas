/**
 * Curated exhibits (lib/exhibits.ts): structural invariants, plus a check
 * that every conflict / empire a stop links to actually exists in the data
 * files. Reads data/conflicts.json and data/empires.json directly so a
 * renamed or merged record breaks the build, not the tour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_EXHIBIT_ID, EXHIBITS, getExhibit } from '@/lib/exhibits';
import { compareWars, empireBaseId, empireFamilyIds } from '@/lib/format';

const ROOT = resolve(__dirname, '..');
const MIN_YEAR = -3100;
const MAX_YEAR = 2026;

let conflictIds: Set<string>;
let empireIds: Set<string>;

beforeAll(() => {
  const conflicts = JSON.parse(readFileSync(resolve(ROOT, 'data/conflicts.json'), 'utf8')) as { id: string }[];
  const empires = JSON.parse(readFileSync(resolve(ROOT, 'data/empires.json'), 'utf8')) as {
    features: { properties: { id: string } }[];
  };
  conflictIds = new Set(conflicts.map((c) => c.id));
  empireIds = new Set(empires.features.map((f) => f.properties.id));
});

describe('EXHIBITS', () => {
  it('has unique, url-safe ids and a welcome exhibit first', () => {
    const ids = EXHIBITS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(ids[0]).toBe(DEFAULT_EXHIBIT_ID);
    expect(getExhibit(DEFAULT_EXHIBIT_ID)?.stops.length).toBe(10);
  });

  it('every exhibit has a title, a summary and 6–10 stops', () => {
    for (const ex of EXHIBITS) {
      expect(ex.title.trim().length, ex.id).toBeGreaterThan(0);
      expect(ex.summary.trim().length, ex.id).toBeGreaterThan(0);
      expect(ex.stops.length, ex.id).toBeGreaterThanOrEqual(6);
      expect(ex.stops.length, ex.id).toBeLessThanOrEqual(10);
    }
  });

  it('stops carry copy, a positive hold, and years inside the atlas range', () => {
    for (const ex of EXHIBITS) {
      ex.stops.forEach((s, i) => {
        const where = `${ex.id}#${i}`;
        expect(s.title.trim().length, where).toBeGreaterThan(0);
        expect(s.shortTitle.trim().length, where).toBeGreaterThan(0);
        expect(s.blurb.trim().length, where).toBeGreaterThan(40);
        expect(s.hold, where).toBeGreaterThan(0);
        if (s.year !== null) {
          expect(Number.isInteger(s.year), where).toBe(true);
          expect(s.year, where).toBeGreaterThanOrEqual(MIN_YEAR);
          expect(s.year, where).toBeLessThanOrEqual(MAX_YEAR);
        }
      });
    }
  });

  it('thematic exhibits run chronologically', () => {
    for (const ex of EXHIBITS) {
      const years = ex.stops.map((s) => s.year).filter((y): y is number => y !== null);
      for (let i = 1; i < years.length; i++) {
        expect(years[i], `${ex.id}#${i}`).toBeGreaterThanOrEqual(years[i - 1]);
      }
    }
  });

  it('bboxes are well-formed [minLng, minLat, maxLng, maxLat]', () => {
    for (const ex of EXHIBITS) {
      ex.stops.forEach((s, i) => {
        if (!s.bbox) return;
        const where = `${ex.id}#${i}`;
        const [w, so, e, n] = s.bbox;
        expect(s.bbox.length, where).toBe(4);
        for (const v of s.bbox) expect(Number.isFinite(v), where).toBe(true);
        expect(w, where).toBeGreaterThanOrEqual(-180);
        expect(e, where).toBeLessThanOrEqual(180);
        expect(so, where).toBeGreaterThanOrEqual(-90);
        expect(n, where).toBeLessThanOrEqual(90);
        expect(w, where).toBeLessThan(e);
        expect(so, where).toBeLessThan(n);
      });
    }
  });

  it('referenced conflict and empire ids exist in the data files', () => {
    const missing: string[] = [];
    for (const ex of EXHIBITS) {
      ex.stops.forEach((s, i) => {
        if (s.conflictId && !conflictIds.has(s.conflictId)) missing.push(`${ex.id}#${i} conflict ${s.conflictId}`);
        if (s.empireId && !empireIds.has(s.empireId)) missing.push(`${ex.id}#${i} empire ${s.empireId}`);
      });
    }
    expect(missing).toEqual([]);
  });

  it('getExhibit returns null for unknown or empty ids', () => {
    expect(getExhibit('no-such-exhibit')).toBeNull();
    expect(getExhibit('')).toBeNull();
    expect(getExhibit(null)).toBeNull();
    expect(getExhibit(undefined)).toBeNull();
  });
});

describe('empire family helpers (Wars of this empire)', () => {
  it('strips only a trailing year slice from an id', () => {
    expect(empireBaseId('british-empire-1815')).toBe('british-empire');
    expect(empireBaseId('third-reich-1942')).toBe('third-reich');
    expect(empireBaseId('ottoman-early')).toBe('ottoman-early');
    expect(empireBaseId('mongol-empire')).toBe('mongol-empire');
    // Two-digit suffixes are not year slices.
    expect(empireBaseId('foo-12')).toBe('foo-12');
  });

  it('groups sibling slices and always includes the id itself', () => {
    const ids = ['british-empire-1815', 'british-empire-1900', 'british-india', 'mongol-empire'];
    expect(empireFamilyIds('british-empire-1900', ids).sort()).toEqual(
      ['british-empire-1815', 'british-empire-1900'].sort(),
    );
    expect(empireFamilyIds('not-in-list-1500', ids)).toEqual(['not-in-list-1500']);
  });

  it('compareWars ranks importance, then casualties (unrecorded last), then start year', () => {
    const rows = [
      { id: 'c', importance: 4, casualties: null, startYear: 1800 },
      { id: 'a', importance: 5, casualties: 100, startYear: 1900 },
      { id: 'b', importance: 5, casualties: 1000, startYear: 1950 },
      { id: 'd', importance: 4, casualties: 10, startYear: 1700 },
    ];
    expect(rows.sort(compareWars).map((r) => r.id)).toEqual(['b', 'a', 'd', 'c']);
  });
});
