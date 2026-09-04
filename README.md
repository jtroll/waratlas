# War Atlas

An interactive cartography of every named war in human history: over 10,000
conflicts, 400+ empires with shifting borders, ~700 city-name records, spanning
roughly 3100 BCE to today. The exact counts are derived from the data files at
build time and live in `lib/generated/stats.json` (the source of truth for every
number the UI shows).

Built with Next.js 14, React 18, TypeScript, and Mapbox GL JS 3.3.

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

   Open <http://localhost:3000>.

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
   The cache headers in `next.config.js` give the bulk JSON files a long
   `s-maxage` plus stale-while-revalidate, which keeps repeat traffic cheap.

## Data

- **`public/conflicts.json`** — over 10,000 conflicts. Per record: name, date
  range, coordinates, belligerents, `partOf` parent ids, casualty estimate (with
  optional source-attributed range), Wikipedia URL, importance rating (1–5).
- **`public/empires.json`** — 400+ polities, each with one or more time-sliced
  border polygons. Solid polygons are reconstructed from canonical historical
  basemaps; dashed polygons are best-estimate approximations (always flagged
  visibly). Each feature carries a `polityType` (`state | tributary |
  confederation | culture | nomadic-range | chiefdom`), a `source` enum with a
  free-text `sourceDetail`, and an optional `borderNote`.
- **`public/empire-wikipedia.json`** — Lead-paragraph summaries from English
  Wikipedia, fetched and cached locally so the app stays responsive. Refresh
  with `python3 scripts/fetch_wikipedia_summaries.py`.
- **`public/cities.json`** — ~700 historical city-name records with date ranges
  so labels fade between names (Byzantium → Constantinople → Konstantiniyye →
  Istanbul).

## Data checks

- `node scripts/generate-stats.mjs` (also `npm run stats`, and run
  automatically by `prebuild`) — derives `lib/generated/stats.json` from the
  three data files and mirrors `scripts/data/id_redirects.json` (old conflict
  id → new id, for merged or renamed records) into
  `lib/generated/id-redirects.json`. Both generated files are committed so
  `next dev` has values without a build step; re-run after changing the data.
- `node scripts/validate-empires.mjs` — checks every `public/empires.json`
  feature for a valid `polityType`, `source` enum, geometry and year range.
- `node scripts/validate-conflicts.mjs` — checks `public/conflicts.json` for
  unique ids, resolvable `partOf` references, sane year ranges and coordinates.

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
