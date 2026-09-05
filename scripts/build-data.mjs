#!/usr/bin/env node
/**
 * build-data.mjs — turns the editable source datasets under data/ into the
 * content-hashed, minified files the app actually fetches from public/data/.
 *
 *   node scripts/build-data.mjs        (also: npm run data; runs in predev / prebuild)
 *
 * Inputs (source of truth, pretty-printed, hand-edited, committed):
 *   data/conflicts.json         array of Conflict records
 *   data/empires.json           GeoJSON FeatureCollection of empire polygons
 *   data/cities.json            GeoJSON FeatureCollection of city-name records
 *   data/empire-wikipedia.json  { [empireId]: WikipediaSummary }
 *   scripts/data/id_redirects.json   old conflict id -> new id (optional)
 *
 * Outputs (build artefacts, gitignored, served immutable for one year):
 *   public/data/conflicts-core.<hash>.json    every conflict minus the long-text
 *                                             fields (description, hook, narrative,
 *                                             significance, sources)
 *   public/data/conflicts-text.<hash>.json    { [id]: { description, hook?, ... } }
 *   public/data/empires.<hash>.json           the FeatureCollection, minified only
 *   public/data/empires-index.<hash>.json     [{ id, name, startYear, endYear }]
 *   public/data/cities.<hash>.json            minified copy
 *   public/data/empire-wikipedia.<hash>.json  minified copy
 *
 *   lib/generated/data-manifest.json  { conflictsCore: '/data/conflicts-core.<hash>.json', ... }
 *   lib/generated/stats.json          headline counts for the UI copy
 *   lib/generated/id-redirects.json   mirror of scripts/data/id_redirects.json
 *
 * <hash> is the first 10 hex chars of the sha1 of the emitted file bytes, so a
 * file's URL changes exactly when its content does and browsers can cache it
 * forever. The three lib/generated files ARE committed (next dev / tsc need
 * them without a build step); regenerate after editing anything under data/.
 *
 * GEOMETRY IS NEVER TOUCHED. Coordinates are parsed and re-serialised by the
 * JSON round-trip only: no rounding, no simplification, no vertex dropping.
 * JSON.parse -> JSON.stringify is exact for every finite IEEE-754 double, and
 * verifyOutputs() below re-parses the emitted empires file and asserts every
 * coordinate array deep-equals the source before anything is written.
 *
 * No dependencies. Exported functions are pure so tests/data.test.ts can
 * exercise the same code without writing to disk.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_DIR = 'public/data';
export const GENERATED_DIR = 'lib/generated';

/** Fields split out of conflicts-core into conflicts-text. */
export const TEXT_FIELDS = ['description', 'hook', 'narrative', 'significance', 'sources'];

const HASH_LEN = 10;

export function hashContent(content) {
  return createHash('sha1').update(content).digest('hex').slice(0, HASH_LEN);
}

export function loadSources(root = ROOT) {
  const read = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
  const conflicts = read('data/conflicts.json');
  const empires = read('data/empires.json');
  const cities = read('data/cities.json');
  const empireWikipedia = read('data/empire-wikipedia.json');

  if (!Array.isArray(conflicts)) throw new Error('data/conflicts.json is not an array');
  if (!Array.isArray(empires?.features)) throw new Error('data/empires.json has no features array');
  if (!Array.isArray(cities?.features)) throw new Error('data/cities.json has no features array');
  if (!empireWikipedia || typeof empireWikipedia !== 'object' || Array.isArray(empireWikipedia)) {
    throw new Error('data/empire-wikipedia.json is not an object');
  }

  let redirects = {};
  const redirectsPath = resolve(root, 'scripts/data/id_redirects.json');
  if (existsSync(redirectsPath)) {
    const raw = JSON.parse(readFileSync(redirectsPath, 'utf8'));
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [k, v] of Object.entries(raw)) {
        if (typeof k === 'string' && typeof v === 'string' && k !== v) redirects[k] = v;
      }
    }
  }

  return { conflicts, empires, cities, empireWikipedia, redirects };
}

/** Split one conflict into its core record and its text record. */
export function splitConflict(c) {
  const core = {};
  const text = {};
  for (const [k, v] of Object.entries(c)) {
    if (TEXT_FIELDS.includes(k)) {
      if (v !== undefined) text[k] = v;
    } else {
      core[k] = v;
    }
  }
  return { core, text };
}

export function deriveEmpiresIndex(empires) {
  return empires.features.map((f) => {
    const p = f.properties ?? {};
    return { id: p.id, name: p.name, startYear: p.startYear, endYear: p.endYear };
  });
}

export function deriveStats({ conflicts, empires, cities }) {
  const feats = empires.features;
  const dataFingerprint = createHash('sha1')
    .update(JSON.stringify(conflicts))
    .update(JSON.stringify(empires))
    .update(JSON.stringify(cities))
    .digest('hex')
    .slice(0, HASH_LEN);
  const accurateEmpires = feats.filter((f) => f?.properties?.accurate === true).length;
  // Solid borders on the map require BOTH a faithful polygon and a `state`
  // polity — mirrors the filter in components/MapView.tsx.
  const solidEmpires = feats.filter(
    (f) => f?.properties?.accurate === true && f?.properties?.polityType === 'state',
  ).length;
  return {
    conflicts: conflicts.length,
    empires: feats.length,
    cities: cities.features.length,
    casualtyRanges: conflicts.filter((c) => c && c.casualtyRange).length,
    accurateEmpires,
    solidEmpires,
    // Content-derived, not the build date, so a rebuild on a later day does
    // not dirty the committed stats file.
    generatedAt: dataFingerprint,
  };
}

/**
 * Compute every output in memory. Returns
 *   { files: { key: { name, content } }, manifest, stats, redirects }
 * where `name` is the hashed basename under public/data/ and `manifest` maps
 * each key to its public URL.
 */
export function deriveOutputs(sources) {
  const { conflicts, empires, cities, empireWikipedia, redirects } = sources;

  const core = [];
  const text = {};
  for (const c of conflicts) {
    const split = splitConflict(c);
    core.push(split.core);
    text[c.id] = split.text;
  }

  const bodies = {
    conflictsCore: ['conflicts-core', JSON.stringify(core)],
    conflictsText: ['conflicts-text', JSON.stringify(text)],
    empires: ['empires', JSON.stringify(empires)],
    empiresIndex: ['empires-index', JSON.stringify(deriveEmpiresIndex(empires))],
    cities: ['cities', JSON.stringify(cities)],
    empireWikipedia: ['empire-wikipedia', JSON.stringify(empireWikipedia)],
  };

  const files = {};
  const manifest = {};
  for (const [key, [base, content]] of Object.entries(bodies)) {
    const name = `${base}.${hashContent(content)}.json`;
    files[key] = { name, content };
    manifest[key] = `/data/${name}`;
  }

  return { files, manifest, stats: deriveStats(sources), redirects };
}

// ------------------------------------------------------------------ verify

function coordsEqual(a, b, path) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      throw new Error(`coordinate shape mismatch at ${path}`);
    }
    for (let i = 0; i < a.length; i++) coordsEqual(a[i], b[i], `${path}[${i}]`);
    return;
  }
  if (typeof a !== 'number' || typeof b !== 'number' || !Object.is(a, b)) {
    throw new Error(`coordinate value mismatch at ${path}: ${a} vs ${b}`);
  }
}

/**
 * Re-parse the emitted files and assert they carry exactly the source data:
 * every empire feature's geometry type and coordinate arrays are deep-equal to
 * the source (exact double comparison, no tolerance), and every conflict
 * record is present in core + text with no field lost.
 */
export function verifyOutputs(sources, derived) {
  const emittedEmpires = JSON.parse(derived.files.empires.content);
  const src = sources.empires.features;
  if (emittedEmpires.features.length !== src.length) {
    throw new Error(`empires: ${emittedEmpires.features.length} emitted vs ${src.length} source features`);
  }
  let vertices = 0;
  for (let i = 0; i < src.length; i++) {
    const a = src[i].geometry;
    const b = emittedEmpires.features[i].geometry;
    if ((a?.type ?? null) !== (b?.type ?? null)) throw new Error(`empires[${i}]: geometry type changed`);
    if (a) coordsEqual(a.coordinates, b.coordinates, `empires[${i}].geometry.coordinates`);
    vertices += countVertices(a?.coordinates);
    if (JSON.stringify(src[i].properties) !== JSON.stringify(emittedEmpires.features[i].properties)) {
      throw new Error(`empires[${i}]: properties changed`);
    }
  }

  const core = JSON.parse(derived.files.conflictsCore.content);
  const text = JSON.parse(derived.files.conflictsText.content);
  if (core.length !== sources.conflicts.length) {
    throw new Error(`conflicts: ${core.length} core records vs ${sources.conflicts.length} source`);
  }
  for (let i = 0; i < core.length; i++) {
    const original = sources.conflicts[i];
    const merged = { ...core[i], ...(text[original.id] ?? {}) };
    // Key order differs (text keys re-attach at the end), so compare by key set + value.
    const srcKeys = Object.keys(original).filter((k) => original[k] !== undefined).sort();
    const outKeys = Object.keys(merged).sort();
    if (srcKeys.join('\u0000') !== outKeys.join('\u0000')) {
      throw new Error(`conflicts[${i}] (${original.id}): key set changed (${srcKeys} vs ${outKeys})`);
    }
    for (const k of srcKeys) {
      if (JSON.stringify(original[k]) !== JSON.stringify(merged[k])) {
        throw new Error(`conflicts[${i}] (${original.id}): field "${k}" changed`);
      }
    }
    for (const f of TEXT_FIELDS) {
      if (f in core[i]) throw new Error(`conflicts[${i}]: text field "${f}" leaked into core`);
    }
  }

  const index = JSON.parse(derived.files.empiresIndex.content);
  if (index.length !== src.length) throw new Error('empires-index: feature count mismatch');

  return { empireFeatures: src.length, vertices, conflicts: core.length };
}

function countVertices(coords) {
  if (!Array.isArray(coords)) return 0;
  if (coords.length && typeof coords[0] === 'number') return 1;
  let n = 0;
  for (const c of coords) n += countVertices(c);
  return n;
}

// ------------------------------------------------------------------ write

export function writeOutputs(derived, root = ROOT) {
  const outDir = resolve(root, OUT_DIR);
  const genDir = resolve(root, GENERATED_DIR);
  mkdirSync(outDir, { recursive: true });
  mkdirSync(genDir, { recursive: true });

  // Sweep stale hashed files so public/data/ only ever holds the current set.
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.json')) unlinkSync(join(outDir, f));
  }

  const written = [];
  for (const { name, content } of Object.values(derived.files)) {
    writeFileSync(join(outDir, name), content);
    written.push({ name, bytes: Buffer.byteLength(content) });
  }

  writeFileSync(join(genDir, 'data-manifest.json'), JSON.stringify(derived.manifest, null, 2) + '\n');
  writeFileSync(join(genDir, 'stats.json'), JSON.stringify(derived.stats, null, 2) + '\n');
  writeFileSync(join(genDir, 'id-redirects.json'), JSON.stringify(derived.redirects, null, 2) + '\n');
  return written;
}

export function build(root = ROOT) {
  const sources = loadSources(root);
  const derived = deriveOutputs(sources);
  const check = verifyOutputs(sources, derived);
  const written = writeOutputs(derived, root);
  return { derived, check, written };
}

// ------------------------------------------------------------------ main

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  const t0 = Date.now();
  const { derived, check, written } = build();
  for (const { name, bytes } of written) {
    console.log(`build-data: ${OUT_DIR}/${name}  ${(bytes / 1024).toFixed(0)} kB`);
  }
  console.log(
    `build-data: verified ${check.empireFeatures} empire features / ${check.vertices} vertices ` +
      `byte-identical in value, ${check.conflicts} conflicts reassemble exactly`,
  );
  console.log(`build-data: stats ${JSON.stringify(derived.stats)}`);
  console.log(
    `build-data: ${Object.keys(derived.redirects).length} id redirects, manifest -> ${GENERATED_DIR}/data-manifest.json ` +
      `(${Date.now() - t0} ms)`,
  );
}
