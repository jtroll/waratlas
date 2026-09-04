#!/usr/bin/env node
// validate-conflicts.mjs — CI guard for data/conflicts.json (no dependencies).
// Exit code 1 on: duplicate ids; non-slug ids; endYear < startYear; coordinates out of range or [0,0];
// importance not 1-5; casualtyRange with low > high or headline outside the range; wikiLink present;
// "Draw" in countries; partOf entries that are neither an existing id nor listed in
// scripts/data/parent_unresolved.json; partOf cycles; child dates outside parent dates by > 1 year.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recs = JSON.parse(readFileSync(join(root, 'data', 'conflicts.json'), 'utf8'));
let unresolved = {};
try {
  unresolved = JSON.parse(readFileSync(join(root, 'scripts', 'data', 'parent_unresolved.json'), 'utf8')).strings || {};
} catch { /* file optional */ }

const errors = [];
const err = (m) => errors.push(m);
const ids = new Map();
const SLUG = /^[a-z0-9][a-z0-9-]*$/; // audit L2 definition; '--' in BCE-year ids is tolerated (cosmetic)
const END = (r) => (r.endYear === null ? 2100 : r.endYear);

for (const r of recs) {
  if (ids.has(r.id)) err(`duplicate id: ${r.id}`);
  ids.set(r.id, r);
  if (!SLUG.test(r.id)) err(`non-slug id: ${r.id}`);
  if (typeof r.startYear !== 'number') err(`${r.id}: startYear missing`);
  if (r.endYear !== null && r.endYear < r.startYear) err(`${r.id}: endYear ${r.endYear} < startYear ${r.startYear}`);
  const [lon, lat] = r.coordinates || [];
  if (typeof lon !== 'number' || typeof lat !== 'number' || lon < -180 || lon > 180 || lat < -90 || lat > 90) err(`${r.id}: coordinates out of range ${JSON.stringify(r.coordinates)}`);
  else if (lon === 0 && lat === 0) err(`${r.id}: coordinates at null island`);
  if (!Number.isInteger(r.importance) || r.importance < 1 || r.importance > 5) err(`${r.id}: importance ${r.importance}`);
  if (r.casualtyRange) {
    const { low, high } = r.casualtyRange;
    if (!(low <= high)) err(`${r.id}: casualtyRange low ${low} > high ${high}`);
    if (r.casualties !== null && (r.casualties < low || r.casualties > high)) err(`${r.id}: casualties ${r.casualties} outside range ${low}-${high}`);
  }
  if ('wikiLink' in r) err(`${r.id}: legacy wikiLink field present`);
  if ((r.countries || []).includes('Draw')) err(`${r.id}: "Draw" in countries`);
  if (!Array.isArray(r.partOf)) err(`${r.id}: partOf not an array`);
}

// partOf resolution, date containment, cycles
for (const r of recs) {
  for (const p of r.partOf) {
    if (ids.has(p)) {
      const par = ids.get(p);
      if (r.startYear < par.startYear - 1 || END(r) > END(par) + 1) err(`${r.id} (${r.startYear}-${r.endYear}) outside parent ${p} (${par.startYear}-${par.endYear})`);
      if (p === r.id) err(`${r.id}: self-reference in partOf`);
    } else if (!(p in unresolved)) {
      err(`${r.id}: partOf "${p}" is neither an id nor listed in scripts/data/parent_unresolved.json`);
    }
  }
}
const state = new Map();
const cycle = (id, stack) => {
  if (state.get(id) === 1) { err(`partOf cycle: ${[...stack, id].join(' -> ')}`); return; }
  if (state.get(id) === 2) return;
  state.set(id, 1);
  for (const p of ids.get(id).partOf) if (ids.has(p)) cycle(p, [...stack, id]);
  state.set(id, 2);
};
for (const id of ids.keys()) cycle(id, []);

const total = recs.reduce((n, r) => n + r.partOf.length, 0);
const resolved = recs.reduce((n, r) => n + r.partOf.filter((p) => ids.has(p)).length, 0);
console.log(`records: ${recs.length}; partOf refs: ${total}; resolved to ids: ${resolved} (${(100 * resolved / total).toFixed(1)}%); listed-unresolved strings: ${Object.keys(unresolved).length}`);
if (errors.length) {
  console.error(`FAILED: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 200)) console.error(' - ' + e);
  process.exit(1);
}
console.log('OK: conflicts.json passes all checks');
