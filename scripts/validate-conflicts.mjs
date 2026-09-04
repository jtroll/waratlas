#!/usr/bin/env node
// validate-conflicts.mjs — CI guard for data/conflicts.json (no dependencies).
// Exit code 1 on: duplicate ids; non-slug ids; polityIds entries that are not empire ids (r15); endYear < startYear; coordinates out of range or [0,0];
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

// r15: empire ids + intervals for the polityIds check
const empireYears = new Map();
for (const f of JSON.parse(readFileSync(join(root, 'data', 'empires.json'), 'utf8')).features) {
  empireYears.set(f.properties.id, [f.properties.startYear, f.properties.endYear]);
}
// Alias-table era overrides may attach a conflict to a slice up to this many years outside its
// interval (e.g. Meiji-era Japan 1868 -> empire-of-japan-1895); see scripts/data/polity_families.json.
const POLITY_TOLERANCE = 30;

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
  if ('polityIds' in r) {
    // r15: every entry must be an empire feature id whose interval overlaps the conflict's years
    // (alias-table overrides may extend a slice by a few years, hence the tolerance).
    if (!Array.isArray(r.polityIds) || r.polityIds.length === 0) err(`${r.id}: polityIds must be a non-empty array (omit the key when empty)`);
    else {
      if (new Set(r.polityIds).size !== r.polityIds.length) err(`${r.id}: duplicate polityIds`);
      for (const p of r.polityIds) {
        const e = empireYears.get(p);
        if (!e) { err(`${r.id}: polityIds entry "${p}" is not an empire id`); continue; }
        if (r.startYear > e[1] + POLITY_TOLERANCE || END(r) < e[0] - POLITY_TOLERANCE) {
          err(`${r.id} (${r.startYear}-${r.endYear}): polityIds entry "${p}" (${e[0]}-${e[1]}) does not overlap the conflict`);
        }
      }
    }
  }
}

// partOf resolution, date containment, cycles
const byName = new Map();
for (const r of recs) { if (!byName.has(r.name)) byName.set(r.name, []); byName.get(r.name).push(r); }
for (const r of recs) {
  for (const p of r.partOf) {
    if (ids.has(p)) {
      const par = ids.get(p);
      if (r.startYear < par.startYear - 1 || END(r) > END(par) + 1) err(`${r.id} (${r.startYear}-${r.endYear}) outside parent ${p} (${par.startYear}-${par.endYear})`);
      if (p === r.id) err(`${r.id}: self-reference in partOf`);
    } else if (!(p in unresolved)) {
      err(`${r.id}: partOf "${p}" is neither an id nor listed in scripts/data/parent_unresolved.json`);
    } else {
      // A raw string that happens to equal an existing conflict's NAME will
      // be linked by the sidebar's name fallback. Refuse it when the dates
      // can't overlap — that is how an 1835 battle ended up "part of"
      // World War II.
      for (const par of byName.get(p) || []) {
        if (r.startYear > END(par) + 1 || END(r) < par.startYear - 1) {
          err(`${r.id} (${r.startYear}): raw partOf "${p}" name-matches ${par.id} (${par.startYear}-${par.endYear}) but the dates do not overlap — fix the year or the parent`);
        }
      }
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
