import pkg from '../package.json';

/**
 * Single source of truth for the version strings shown in the interface.
 *
 * - ATLAS_VERSION comes from package.json (bump it there when releasing).
 * - DATA_REVISION is the changelog tag of the newest dataset revision
 *   (app/changelog/page.tsx); bump it whenever a data revision lands.
 * - RELEASE_DATE is the human-readable month of the current release.
 */
export const ATLAS_VERSION: string = pkg.version;
export const DATA_REVISION = 'r15';
export const RELEASE_DATE = 'September 2026';
export const VERSION_LABEL = `v${ATLAS_VERSION} · ${DATA_REVISION} · ${RELEASE_DATE}`;
