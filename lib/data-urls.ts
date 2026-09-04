import manifest from '@/lib/generated/data-manifest.json';
import type { Conflict } from '@/lib/types';

/**
 * Public URLs of the content-hashed data files under public/data/, as
 * written by scripts/build-data.mjs (npm run data). Each URL changes exactly
 * when the file's content does, so the files are served with
 * `Cache-Control: immutable` and a deploy only re-downloads what changed.
 *
 *   conflictsCore    every conflict minus its long-text fields
 *   conflictsText    { [id]: { description, hook?, narrative?, significance?, sources? } }
 *   empires          full FeatureCollection, minified only (identical coordinates)
 *   empiresIndex     [{ id, name, startYear, endYear }] for every empire feature
 *   cities           minified data/cities.json
 *   empireWikipedia  minified data/empire-wikipedia.json
 */
export type DataManifest = typeof manifest;
export type DataKey = keyof DataManifest;

export const DATA_URLS: Readonly<DataManifest> = manifest;

/** Shape of the conflicts-text file: `{ [id]: ConflictText }`, keys that are
 *  undefined on the source record omitted. Canonical types live in lib/types. */
export type { ConflictText, ConflictTextMap } from '@/lib/types';

/** A conflict record as it appears in conflicts-core (text fields stripped). */
export type ConflictCore = Omit<Conflict, 'description' | 'hook' | 'narrative' | 'significance' | 'sources'>;
