# War Atlas

An interactive cartography of every named war in human history: over 10,000
conflicts, 400+ empires with shifting borders, ~700 city-name records, spanning
roughly 3100 BCE to today. The exact counts are derived from the data files at
build time and live in `lib/generated/stats.json` (the source of truth for every
number the UI shows).

Built with Next.js 14, React 18, TypeScript, and Mapbox GL JS 3.

## Local setup

1. **Install dependencies** (from the repository root — the project is flat,
   not nested under an `app/` subdirectory):

   ```bash
   npm install
   ```

2. **Add a Mapbox token.** Copy `.env.local.example` to `.env.local` and paste
   your public token from <https://account.mapbox.com/access-tokens/>:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and replace the placeholder.
   ```

   **⚠ Before going public:** restrict your Mapbox token to your production
   domain in the Mapbox dashboard. Public tokens (`pk.…`) are exposed to every
   browser; without URL restrictions, anyone can lift the token from the
   network tab and bill load to your account.

3. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>. `predev` runs the data build first (see
   [Data pipeline](#data-pipeline)), so `public/data/` is populated before
   Next starts.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to <https://vercel.com/new> and import it.
3. **Leave the Root Directory at the project root** (do not set it to `app/`).
4. Add the following environment variables in Vercel project settings:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox public token (URL-restricted to your prod domain). |
   | `NEXT_PUBLIC_BASE_URL` | The full canonical site URL (e.g. `https://wars-atlas.com`). Used by `app/robots.ts`, `app/sitemap.ts`, and `metadataBase` for OG cards. |
   | `NEXT_PUBLIC_FEEDBACK_URL` | (Optional) URL where corrections/feedback should be filed. Defaults to a placeholder GitHub issues URL. |

5. Deploy. Vercel handles compression, edge caching, and HTTPS automatically.
   `prebuild` regenerates the content-hashed data files, and `next.config.js`
   serves everything under `/data/` with `Cache-Control: immutable`, so a
   returning visitor only re-downloads the files that actually changed.

## Data

The editable, pretty-printed source datasets live under `data/` and are the
only files you should ever hand-edit or point a script at:

- **`data/conflicts.json`** — over 10,000 conflicts. Per record: name, date
  range, coordinates, belligerents, `partOf` parent ids, casualty estimate (with
  optional source-attributed range), Wikipedia URL, importance rating (1–5),
  and for the top few hundred entries a tiered description (`hook`,
  `narrative`, `significance`) plus `sources`.
- **`data/empires.json`** — 400+ polities, each with one or more time-sliced
  border polygons. Solid polygons are reconstructed from canonical historical
  basemaps; dashed polygons are best-estimate approximations (always flagged
  visibly). Each feature carries a `polityType` (`state | tributary |
  confederation | culture | nomadic-range | chiefdom`), a `source` enum with a
  free-text `sourceDetail`, and an optional `borderNote`.
- **`data/empire-wikipedia.json`** — Lead-paragraph summaries from English
  Wikipedia, fetched and cached locally so the app stays responsive. Refresh
  with `python3 scripts/fetch_wikipedia_summaries.py`.
- **`data/cities.json`** — ~700 historical city-name records with date ranges
  so labels fade between names (Byzantium → Constantinople → Konstantiniyye →
  Istanbul).
- **`data/empires-corrections.json`** — provenance for the 2026 border audit
  (per-empire rationale and sources). Not served; kept as an audit trail.

## Data pipeline

The browser never fetches `data/*.json` directly. `scripts/build-data.mjs`
(`npm run data`, also run by `predev` and `prebuild`) derives the served files
into `public/data/` (gitignored) and records their URLs in
`lib/generated/data-manifest.json`:

| Manifest key      | File                                | Contents |
| ----------------- | ----------------------------------- | -------- |
| `conflictsCore`   | `conflicts-core.<hash>.json`        | every conflict record minus `description`, `hook`, `narrative`, `significance`, `sources` (everything else, including `casualtyRange`, stays) |
| `conflictsText`   | `conflicts-text.<hash>.json`        | `{ [id]: { description, hook?, narrative?, significance?, sources? } }`, fetched lazily |
| `empires`         | `empires.<hash>.json`               | the full FeatureCollection, minified only |
| `empiresIndex`    | `empires-index.<hash>.json`         | `[{ id, name, startYear, endYear }]` for every feature |
| `cities`          | `cities.<hash>.json`                | minified copy |
| `empireWikipedia` | `empire-wikipedia.<hash>.json`      | minified copy |

`<hash>` is the first 10 hex characters of the sha1 of the emitted bytes, so a
file's URL changes exactly when its content does; `next.config.js` serves
`/data/*` with `Cache-Control: public, max-age=31536000, immutable`. Application
code imports the URLs from `lib/data-urls.ts`:

```ts
import { DATA_URLS } from '@/lib/data-urls';
fetch(DATA_URLS.conflictsCore);
```

**Geometry is emitted at full precision.** The build only strips whitespace:
no coordinate rounding, no simplification, no vertex dropping. The script
re-parses the emitted empires file and asserts every coordinate array is
value-identical to `data/empires.json` (and that every conflict record
reassembles exactly from core + text) before writing anything; the same check
runs in `tests/data.test.ts`.

The build also writes `lib/generated/stats.json` (headline counts used by the
UI copy and metadata) and `lib/generated/id-redirects.json` (mirror of
`scripts/data/id_redirects.json`, old conflict id → new id for merged or
renamed records, used by `/c/[id]`). All three `lib/generated/*.json` files
**are committed** so `next dev`, `tsc` and the tests work on a fresh clone;
re-run `npm run data` and commit the result after editing anything in `data/`.

## Scripts

| Command            | What it does |
| ------------------ | ------------ |
| `npm run data`     | Build `public/data/` + `lib/generated/*.json` from `data/` (with the geometry identity check). |
| `npm run validate` | `scripts/validate-empires.mjs` (polity/source enums, geometry, year ranges, city chains) and `scripts/validate-conflicts.mjs` (unique slug ids, resolvable `partOf`, year ranges, coordinates, casualty ranges). |
| `npm test`         | Vitest: `lib/format.ts`, `lib/conflicts.ts` (fade windows, auto-speed) and the data suite (validators, invariants, stats freshness, emitted-geometry identity). |
| `npm run lint`     | ESLint with `next/core-web-vitals`, zero warnings allowed. |
| `npm run build`    | `next build` (runs `npm run data` first via `prebuild`). |

CI (`.github/workflows/ci.yml`) runs validate → data → `tsc --noEmit` → lint →
test → build on every push and pull request.

## Expanding the dataset

To re-fetch Wikipedia empire summaries:

```bash
pip install requests
python3 scripts/fetch_wikipedia_summaries.py
```

The script is incremental and rate-limited; only newly-added empire IDs get
fetched on subsequent runs. New empires need an alias in `ID_TO_TITLE`
inside the script if their name doesn't directly match a Wikipedia article
title.

## Attribution and licensing

- Application code: MIT (see `LICENSE`).
- Bundled data: Wikipedia content under CC BY-SA 4.0; Natural Earth (public
  domain); historical-basemaps (CC BY-SA 4.0); curated editorial summaries
  (CC BY-SA 4.0). Full breakdown in `LICENSE` and at `/sources` in the app.
- Map basemap: © Mapbox, © OpenStreetMap contributors. The map keeps the
  required attribution control visible.

If you redistribute any of the bundled JSON files, retain the relevant
upstream attribution.
