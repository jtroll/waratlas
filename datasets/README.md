# Source datasets — download guide

Drop the files below into the matching subfolder, then tell Claude "datasets are in." Claude will parse → normalize to the conflict schema → geocode where needed → dedupe against the existing `public/conflicts.json` → run automated QA + a sampled human-grade review → merge.

**Licensing:** raw files in this folder are **gitignored** and never committed. We derive conflict records and cite the source; we do not republish the raw datasets. Any filename works — Claude auto-detects whatever is in each subfolder.

---

## Priority 1 — HCED (the biggest single lever) → `datasets/hced/`

**Historical Conflict Event Dataset**, Miller & Bakar (2023), *Journal of Conflict Resolution*. ~8,800 geocoded military confrontations, **1468 BCE–2003**, global and deliberately de-biased toward the non-West. Already has latitude/longitude, year, and participants — the best match for this map.

- **BEST ROUTE — Harvard Dataverse (free, direct download):** https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/6ZFC0V
  - Click **"Access Dataset" → "Download ZIP"** (all files), or download the data file directly. You may get a one-time "accept terms" prompt — normal and free.
- Mirrors if Dataverse is down: data-basis.org (https://data-basis.org/dataset/97da5db7-3668-4ec2-ae8c-68417d1fdf46).
- AVOID: the SAGE figshare collection link and the journals.sagepub.com article page — the figshare collection redirects to a storefront and the article page only sells the PDF. You never need either; the data is free on Dataverse.
- Save into `datasets/hced/` (any of CSV / `.tab` / Stata `.dta` / zip is fine — Claude handles all).
- Expected impact after dedupe: **+3,000–5,000** conflicts on its own.

## Priority 2 — Brecke Conflict Catalog → `datasets/brecke/`

~3,700 violent conflicts worldwide **since 1400 CE** (Europe back to 900), each with belligerents, dates, and **casualty figures** where known. Region-coded, not lat/lng — Claude will geocode.

- Main file (direct download): **https://brecke.inta.gatech.edu/wp-content/uploads/sites/19/2018/09/Conflict-Catalog-18-vars.xlsx**
- Optional pre-1400 Europe file: **https://brecke.inta.gatech.edu/wp-content/uploads/sites/19/2018/09/Brecke-Pre-1400-European-Conflicts.xlsx**
- Save into `datasets/brecke/`
- Expected impact after dedupe + geocoding: **+1,500–2,500**, and improves casualty coverage.

## Priority 3 — UCDP (cleanest license; best for modern casualty quality) → `datasets/ucdp/`

CC BY 4.0, freely republishable, geocoded, with low/best/high fatality estimates. You already have good post-1946 coverage, so this adds fewer *new* conflicts but upgrades citation/casualty quality.

- Go to **https://ucdp.uu.se/downloads/**
- Download **"UCDP/PRIO Armed Conflict Dataset"** (CSV) — conflict-level. Optionally also **"UCDP Georeferenced Event Dataset (GED)"** (CSV) for point-level enrichment.
- Save into `datasets/ucdp/`
- Expected impact: **+300–800** net-new + casualty/citation upgrades.

## Optional — Wikidata battles (CC0, zero account) → `datasets/wikidata/`

Run this query, then **Download → JSON** (or CSV) and save into `datasets/wikidata/`:

1. Open **https://query.wikidata.org**
2. Paste and run:

```sparql
SELECT ?battle ?battleLabel ?coord ?date ?endLabel ?deaths
       (GROUP_CONCAT(DISTINCT ?partLabel; separator=" vs ") AS ?participants) WHERE {
  ?battle wdt:P31/wdt:P279* wd:Q178561 ;     # instance of battle (or subclass)
          wdt:P625 ?coord .                   # has coordinates
  OPTIONAL { ?battle wdt:P585 ?date. }        # point in time
  OPTIONAL { ?battle wdt:P580 ?date. }        # or start time
  OPTIONAL { ?battle wdt:P582 ?end. }         # end time
  OPTIONAL { ?battle wdt:P1120 ?deaths. }     # number of deaths
  OPTIONAL { ?battle wdt:P710 ?part. ?part rdfs:label ?partLabel. FILTER(LANG(?partLabel)="en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?battle ?battleLabel ?coord ?date ?endLabel ?deaths
```

- Expected impact after heavy dedupe: **+2,000–4,000** (CC0, so safe to republish).

---

### Minimum to hit your 3–4x goal
**HCED alone** likely gets you most of the way. **HCED + Brecke** comfortably reaches ~8,000–10,000 total. UCDP and Wikidata are additive/quality boosts. Drop in whatever you can grab — Claude works with any subset.
