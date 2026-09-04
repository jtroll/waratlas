/**
 * Dataset invariants + build-pipeline checks. Loads the real source files
 * under data/ (≈19 MB of JSON), so this suite is slower than the unit tests.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import stats from '@/lib/generated/stats.json';
import manifest from '@/lib/generated/data-manifest.json';
// scripts/build-data.mjs is a plain ESM script (no types); describe the
// slice of its surface the test uses.
import * as buildDataModule from '../scripts/build-data.mjs';
import type { Conflict } from '@/lib/types';

interface EmpireFeature {
  properties: { id: string; name: string; startYear: number; endYear: number; [k: string]: unknown };
  geometry: { type: string; coordinates: unknown[] };
}
type Sources = {
  conflicts: Conflict[];
  empires: { features: EmpireFeature[] };
  cities: { features: unknown[] };
  empireWikipedia: Record<string, unknown>;
  redirects: Record<string, string>;
};
type Derived = {
  files: Record<string, { name: string; content: string }>;
  manifest: Record<string, string>;
  stats: Record<string, number | string>;
  redirects: Record<string, string>;
};
interface BuildData {
  TEXT_FIELDS: string[];
  loadSources(root: string): Sources;
  deriveOutputs(sources: Sources): Derived;
  verifyOutputs(sources: Sources, derived: Derived): { empireFeatures: number; vertices: number; conflicts: number };
}
const buildData = buildDataModule as unknown as BuildData;

const ROOT = resolve(__dirname, '..');

let sources: Sources;
let derived: Derived;

beforeAll(() => {
  sources = buildData.loadSources(ROOT);
  derived = buildData.deriveOutputs(sources);
});

describe('validators', () => {
  it('validate-conflicts.mjs passes', () => {
    const out = execFileSync('node', ['scripts/validate-conflicts.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toContain('OK');
  });

  it('validate-empires.mjs passes', () => {
    const out = execFileSync('node', ['scripts/validate-empires.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toContain('validate-empires: OK');
  });
});

describe('conflicts.json core invariants', () => {
  it('has unique slug ids, sane years, in-range coordinates and importance 1–5', () => {
    const seen = new Set<string>();
    for (const c of sources.conflicts) {
      expect(seen.has(c.id), `duplicate id ${c.id}`).toBe(false);
      seen.add(c.id);
      expect(c.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(typeof c.startYear).toBe('number');
      if (c.endYear !== null) expect(c.endYear).toBeGreaterThanOrEqual(c.startYear);
      const [lon, lat] = c.coordinates;
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(Number.isInteger(c.importance) && c.importance >= 1 && c.importance <= 5).toBe(true);
      expect(Array.isArray(c.partOf)).toBe(true);
    }
  });
});

describe('polityIds (r15 belligerent join)', () => {
  // Floor of the join rate reached by scripts/r15_polity_join.py for importance >= 3 (61.9% on
  // 2026-09-04); the target was >= 60%. Raise this when more polities are added, never lower it.
  const JOIN_RATE_FLOOR_IMPORTANCE_3 = 0.6;

  it('every polityIds entry resolves to an empire feature id, unique, non-empty when present', () => {
    const empireIds = new Set(sources.empires.features.map((f) => f.properties.id));
    for (const c of sources.conflicts) {
      if (!('polityIds' in c)) continue;
      const ids = c.polityIds as string[];
      expect(Array.isArray(ids) && ids.length > 0, `${c.id}: polityIds must be a non-empty array`).toBe(true);
      expect(new Set(ids).size, `${c.id}: duplicate polityIds`).toBe(ids.length);
      for (const p of ids) expect(empireIds.has(p), `${c.id}: polityIds entry ${p} is not an empire id`).toBe(true);
    }
  });

  it(`at least ${JOIN_RATE_FLOOR_IMPORTANCE_3 * 100}% of importance>=3 conflicts carry a polityId`, () => {
    const major = sources.conflicts.filter((c) => c.importance >= 3);
    const joined = major.filter((c) => Array.isArray(c.polityIds) && c.polityIds.length > 0);
    expect(major.length).toBeGreaterThan(0);
    expect(joined.length / major.length).toBeGreaterThanOrEqual(JOIN_RATE_FLOOR_IMPORTANCE_3);
  });
});

describe('empires.json core invariants', () => {
  it('every feature has numeric years, endYear >= startYear and polygon geometry', () => {
    const seen = new Set<string>();
    for (const f of sources.empires.features) {
      const p = f.properties;
      expect(seen.has(p.id), `duplicate empire id ${p.id}`).toBe(false);
      seen.add(p.id);
      expect(typeof p.startYear).toBe('number');
      expect(typeof p.endYear).toBe('number');
      expect(p.endYear).toBeGreaterThanOrEqual(p.startYear);
      expect(['Polygon', 'MultiPolygon']).toContain(f.geometry.type);
    }
  });

  it('every ring is closed and has at least four positions', () => {
    for (const f of sources.empires.features) {
      const polys = (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) as number[][][][];
      for (const poly of polys) {
        for (const ring of poly) {
          expect(ring.length).toBeGreaterThanOrEqual(4);
          expect(ring[0]).toEqual(ring[ring.length - 1]);
        }
      }
    }
  });
});

describe('generated stats', () => {
  it('lib/generated/stats.json matches the data (re-run `npm run data` if this fails)', () => {
    expect(stats.conflicts).toBe(sources.conflicts.length);
    expect(stats.empires).toBe(sources.empires.features.length);
    expect(stats.cities).toBe(sources.cities.features.length);
  });
});

describe('build-data pipeline', () => {
  it('emits the six manifest entries with 10-hex content hashes', () => {
    const keys = ['conflictsCore', 'conflictsText', 'empires', 'empiresIndex', 'cities', 'empireWikipedia'];
    expect(Object.keys(derived.manifest).sort()).toEqual([...keys].sort());
    for (const k of keys) {
      expect(derived.manifest[k]).toMatch(/^\/data\/[a-z-]+\.[0-9a-f]{10}\.json$/);
    }
  });

  it('keeps every conflict record and every field across the core/text split', () => {
    expect(() => buildData.verifyOutputs(sources, derived)).not.toThrow();
    const core = JSON.parse(derived.files.conflictsCore.content);
    const text = JSON.parse(derived.files.conflictsText.content);
    expect(core).toHaveLength(sources.conflicts.length);
    expect(Object.keys(text)).toHaveLength(sources.conflicts.length);
    for (const c of core) {
      for (const f of buildData.TEXT_FIELDS) expect(c).not.toHaveProperty(f);
      expect(c).toHaveProperty('coordinates');
    }
    const withRange = sources.conflicts.find((c) => c.casualtyRange);
    expect(withRange).toBeDefined();
    const coreRecord = core.find((c: { id: string }) => c.id === withRange!.id);
    expect(coreRecord.casualtyRange).toEqual(withRange!.casualtyRange);
  });

  it('emits empires with every coordinate value identical to the source', () => {
    const emitted = JSON.parse(derived.files.empires.content);
    expect(emitted.features).toHaveLength(sources.empires.features.length);
    let vertices = 0;
    for (let i = 0; i < emitted.features.length; i++) {
      const a = sources.empires.features[i].geometry;
      const b = emitted.features[i].geometry;
      expect(b.type).toBe(a.type);
      // toEqual on nested number arrays is an exact (Object.is) comparison —
      // no tolerance, no rounding.
      expect(b.coordinates).toEqual(a.coordinates);
      vertices += JSON.stringify(a.coordinates).split('],[').length;
    }
    expect(vertices).toBeGreaterThan(100_000);
    // Minified only: no pretty-print whitespace survives.
    expect(derived.files.empires.content).not.toMatch(/\n/);
  });

  it('empires-index lists id/name/years for every feature', () => {
    const index = JSON.parse(derived.files.empiresIndex.content);
    expect(index).toHaveLength(sources.empires.features.length);
    for (let i = 0; i < index.length; i++) {
      const p = sources.empires.features[i].properties;
      expect(index[i]).toEqual({ id: p.id, name: p.name, startYear: p.startYear, endYear: p.endYear });
    }
  });

  it('the committed manifest points at files whose name matches their content hash (when built)', () => {
    for (const url of Object.values(manifest)) {
      const file = resolve(ROOT, 'public', url.replace(/^\//, ''));
      if (!existsSync(file)) continue; // public/data/ is a build artefact
      const hash = createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 10);
      expect(url).toContain(`.${hash}.json`);
    }
  });
});
