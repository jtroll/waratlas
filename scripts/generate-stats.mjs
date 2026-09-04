#!/usr/bin/env node
/**
 * Derives headline dataset statistics from the three public JSON files and
 * writes them to lib/generated/stats.json so the UI (layout metadata, About
 * modal, opening tour, /sources, README pointer) never hardcodes counts.
 *
 * Also mirrors scripts/data/id_redirects.json (old conflict id → new id,
 * produced when records are merged or renamed) into
 * lib/generated/id-redirects.json so the client bundle and the /c/[id]
 * permalink route can resolve stale ids. Writes `{}` when the source file
 * is absent, so the import always succeeds.
 *
 * Wired into `prebuild` (before generate-sw) and available as `npm run stats`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'lib/generated');

const readJson = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

const conflicts = readJson('public/conflicts.json');
const empires = readJson('public/empires.json');
const cities = readJson('public/cities.json');

if (!Array.isArray(conflicts)) throw new Error('conflicts.json is not an array');
const empireFeatures = Array.isArray(empires?.features) ? empires.features : [];
const cityFeatures = Array.isArray(cities?.features) ? cities.features : [];

const accurateEmpires = empireFeatures.filter((f) => f?.properties?.accurate === true).length;
// Solid borders on the map require BOTH a faithful polygon and a `state`
// polity — mirrors the filter in components/MapView.tsx.
const solidEmpires = empireFeatures.filter(
  (f) => f?.properties?.accurate === true && f?.properties?.polityType === 'state',
).length;

const stats = {
  conflicts: conflicts.length,
  empires: empireFeatures.length,
  cities: cityFeatures.length,
  casualtyRanges: conflicts.filter((c) => c && c.casualtyRange).length,
  accurateEmpires,
  solidEmpires,
  generatedAt: new Date().toISOString().slice(0, 10),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(`generate-stats: ${JSON.stringify(stats)}`);

const REDIRECTS_SRC = resolve(ROOT, 'scripts/data/id_redirects.json');
let redirects = {};
if (existsSync(REDIRECTS_SRC)) {
  const raw = JSON.parse(readFileSync(REDIRECTS_SRC, 'utf8'));
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof k === 'string' && typeof v === 'string' && k !== v) redirects[k] = v;
    }
  }
}
writeFileSync(resolve(OUT_DIR, 'id-redirects.json'), JSON.stringify(redirects, null, 2) + '\n');
console.log(`generate-stats: ${Object.keys(redirects).length} id redirects → lib/generated/id-redirects.json`);
