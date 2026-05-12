#!/usr/bin/env node
/**
 * Stamps `public/sw.js` with a content-addressed CACHE_NAME so the service
 * worker invalidates its cache automatically whenever any of the cached
 * data files change.
 *
 * Without this, the SW uses stale-while-revalidate caching against a
 * manually-bumped constant — so returning visitors keep seeing the old
 * data file for one extra page load (and never see it if they don't
 * hard-refresh).
 *
 * Wired into npm's `prebuild` hook (see package.json), so every `next build`
 * — including the Vercel deploy build — runs this first.
 *
 * Insert OR replace: the source-of-truth `public/sw.js` in git has no
 * CACHE_NAME declaration, and the build inserts one right above the
 * `const DATA_URLS` line. If a CACHE_NAME line is already there (e.g.
 * from a previous build), it gets replaced in place — idempotent.
 *
 * Local dev: not run by `next dev` (no `predev` hook), so the source
 * stays clean in git. `next dev` doesn't register the SW anyway
 * (NODE_ENV check in ServiceWorkerRegistration.tsx), so the missing
 * CACHE_NAME never matters there. For `next start` to work against a
 * checkout, you must have run `next build` first (which runs `prebuild`),
 * so the SW will have its CACHE_NAME by then.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Must match the DATA_URLS array in public/sw.js. If you add a file there,
// add it here too — otherwise updates to it won't bust the cache.
const DATA_FILES = [
  'public/empires.json',
  'public/cities.json',
  'public/conflicts.json',
  'public/empire-wikipedia.json',
];

const SW_PATH = resolve(ROOT, 'public/sw.js');

// Matches an existing `const CACHE_NAME = 'war-atlas-...';` declaration on
// its own line. If present, we replace it. If not, we insert one before
// the `const DATA_URLS` line.
const CACHE_NAME_RE = /^[ \t]*const CACHE_NAME = 'war-atlas-[^']+';[ \t]*\r?\n/m;
const INSERT_ANCHOR_RE = /^(const DATA_URLS = \[)/m;

const hash = createHash('sha1');
for (const f of DATA_FILES) {
  hash.update(readFileSync(resolve(ROOT, f)));
}
// 8 hex chars = 32 bits — plenty of entropy for cache busting and short
// enough to read in DevTools' Application > Cache Storage pane.
const cacheVersion = hash.digest('hex').slice(0, 8);
const newCacheName = `war-atlas-${cacheVersion}`;
const newLine = `const CACHE_NAME = '${newCacheName}';\n`;

const sw = readFileSync(SW_PATH, 'utf8');
let updated;
if (CACHE_NAME_RE.test(sw)) {
  // Replace existing declaration in place.
  updated = sw.replace(CACHE_NAME_RE, newLine);
} else if (INSERT_ANCHOR_RE.test(sw)) {
  // Insert above the DATA_URLS array.
  updated = sw.replace(INSERT_ANCHOR_RE, `${newLine}$1`);
} else {
  console.error(
    `generate-sw: ${SW_PATH} has neither a CACHE_NAME line nor a DATA_URLS anchor — refusing to write.`
  );
  process.exit(1);
}

if (updated === sw) {
  console.log(`generate-sw: ${SW_PATH} already at ${newCacheName}, no change`);
} else {
  writeFileSync(SW_PATH, updated);
  console.log(`generate-sw: stamped ${SW_PATH} with ${newCacheName}`);
}
