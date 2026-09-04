#!/usr/bin/env node
/**
 * validate-empires.mjs — schema / integrity checks for public/empires.json
 * and public/cities.json.  No dependencies.  Exits 1 on any failure.
 *
 *   node scripts/validate-empires.mjs
 *
 * Empires:
 *   - duplicate ids
 *   - labelPoint outside the geometry bbox
 *   - any ring whose longitude span exceeds 300 deg (unsplit antimeridian)
 *   - endYear < startYear
 *   - borderYear outside [startYear, endYear]
 *   - polityType / source outside the controlled enums
 *   - borderStyle inconsistent with: solid iff (accurate === true && polityType === 'state')
 *   - two features with the same name whose intervals overlap
 *     (intervals are treated as half-open: a shared boundary year is not an overlap)
 * Cities:
 *   - missing / duplicate id
 *   - overlapping periods within a coordinate chain (records at identical coordinates)
 *   - endYear < foundedYear
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POLITY_TYPES = new Set(['state', 'tributary', 'confederation', 'culture', 'nomadic-range', 'chiefdom']);
const SOURCES = new Set(['historical-basemaps', 'hand-crafted-from-atlases', 'reconstructed-clipped-country',
  'approximate-cultural-extent', 'cliopatria-seshat', 'manual']);

const errors = [];
const fail = (msg) => errors.push(msg);

function rings(geometry) {
  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  const out = [];
  for (const poly of polys) for (const ring of poly) out.push(ring);
  return out;
}

function bbox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of rings(geometry)) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

// ---------------------------------------------------------------- empires
const empires = JSON.parse(readFileSync(path.join(ROOT, 'public', 'empires.json'), 'utf8'));
const feats = empires.features;
const ids = new Map();
const byName = new Map();

for (const f of feats) {
  const p = f.properties;
  const id = p.id;
  if (ids.has(id)) fail(`duplicate id: ${id}`);
  ids.set(id, true);

  if (typeof p.startYear !== 'number' || typeof p.endYear !== 'number') fail(`${id}: startYear/endYear must be numbers`);
  if (p.endYear < p.startYear) fail(`${id}: endYear ${p.endYear} < startYear ${p.startYear}`);
  if (p.borderYear !== undefined && (p.borderYear < p.startYear || p.borderYear > p.endYear)) {
    fail(`${id}: borderYear ${p.borderYear} outside [${p.startYear}, ${p.endYear}]`);
  }
  if (!POLITY_TYPES.has(p.polityType)) fail(`${id}: polityType "${p.polityType}" not in enum`);
  if (!SOURCES.has(p.source)) fail(`${id}: source "${p.source}" not in enum`);
  if (typeof p.sourceDetail !== 'string' || !p.sourceDetail) fail(`${id}: missing sourceDetail`);
  const want = p.accurate === true && p.polityType === 'state' ? 'solid' : 'dashed';
  if (p.borderStyle !== want) fail(`${id}: borderStyle ${p.borderStyle} but rule says ${want} (accurate=${p.accurate}, polityType=${p.polityType})`);

  if (!f.geometry || !['Polygon', 'MultiPolygon'].includes(f.geometry.type)) {
    fail(`${id}: geometry must be Polygon/MultiPolygon`);
    continue;
  }
  for (const ring of rings(f.geometry)) {
    let lo = Infinity, hi = -Infinity;
    for (const [x] of ring) { if (x < lo) lo = x; if (x > hi) hi = x; }
    if (hi - lo > 300) fail(`${id}: ring spans ${(hi - lo).toFixed(1)} deg of longitude (unsplit antimeridian)`);
  }
  const [minX, minY, maxX, maxY] = bbox(f.geometry);
  const lp = p.labelPoint;
  if (!Array.isArray(lp) || lp.length !== 2) fail(`${id}: labelPoint malformed`);
  else if (lp[0] < minX || lp[0] > maxX || lp[1] < minY || lp[1] > maxY) {
    fail(`${id}: labelPoint [${lp}] outside bbox [${[minX, minY, maxX, maxY].map((v) => v.toFixed(2))}]`);
  }

  if (!byName.has(p.name)) byName.set(p.name, []);
  byName.get(p.name).push(p);
}

for (const [name, list] of byName) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.startYear < b.endYear && b.startYear < a.endYear) {
        fail(`same name "${name}" overlaps: ${a.id} ${a.startYear}-${a.endYear} vs ${b.id} ${b.startYear}-${b.endYear}`);
      }
    }
  }
}

// ---------------------------------------------------------------- cities
const cities = JSON.parse(readFileSync(path.join(ROOT, 'public', 'cities.json'), 'utf8'));
const cityIds = new Set();
const chains = new Map();
for (const c of cities.features) {
  const p = c.properties;
  if (!p.id) fail(`city "${p.name}" (${p.foundedYear}) missing id`);
  else if (cityIds.has(p.id)) fail(`duplicate city id: ${p.id}`);
  cityIds.add(p.id);
  if (p.endYear !== null && p.endYear !== undefined && p.endYear < p.foundedYear) {
    fail(`city ${p.id}: endYear ${p.endYear} < foundedYear ${p.foundedYear}`);
  }
  const k = c.geometry.coordinates.join(',');
  if (!chains.has(k)) chains.set(k, []);
  chains.get(k).push(p);
}
for (const [k, list] of chains) {
  if (list.length < 2) continue;
  const end = (p) => (p.endYear === null || p.endYear === undefined ? Infinity : p.endYear);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.foundedYear < end(b) && b.foundedYear < end(a)) {
        fail(`city chain @${k}: "${a.name}" ${a.foundedYear}-${a.endYear} overlaps "${b.name}" ${b.foundedYear}-${b.endYear}`);
      }
    }
  }
}

// ---------------------------------------------------------------- report
const accurate = feats.filter((f) => f.properties.accurate === true).length;
const solid = feats.filter((f) => f.properties.borderStyle === 'solid').length;
console.log(`empires: ${feats.length} features, ${accurate} accurate, ${solid} solid; cities: ${cities.features.length} records`);
if (errors.length) {
  console.error(`${errors.length} validation error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('validate-empires: OK');
