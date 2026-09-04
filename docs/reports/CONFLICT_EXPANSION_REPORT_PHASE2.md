# Conflict Expansion — Phase 2 (Bulk Dataset Ingestion)

**Date:** 2026-05-30
**Result:** dataset grew **2,571 → 10,584** (+8,013 net-new) — a **4.1x** expansion, achieving the 3–4x goal.

## What was added
- **HCED — Historical Conflict Event Dataset** (Miller & Bakar 2023): 7,973 net-new geocoded battles, 1468 BCE–2003. Each carries name, year, coordinates, belligerents (Winner/Loser), and parent war. `casualties: null` (HCED has no death figures — honest, not fabricated). Importance 2 (filterable). Cited to HCED + Jaques.
- **Wikidata marquee slice**: 40 net-new battles that carry a recorded casualty figure (CC0). Importance 3, cited to the Wikidata entity.
- **Not bulk-imported:** Wikidata's ~4,300 other net-new stubs (kept the dataset clean per your "backbone + enrich" call); Brecke (its fatalities are war-level and can't honestly attach to battle-level records); UCDP (your modern coverage was already strong — used for citations).

## Method
Parsed each source in the sandbox → normalized to your schema → deduped within-source and against the existing 2,571 (exact-name + coordinate/year proximity, <15 km / ±2 yr) → automated QA → sampled human-grade review → merged. ACLED excluded (license); raw dataset files gitignored (derive-and-cite, never republished).

## Quality (sampled audit of 100 records)
- **87/100 fully accurate**, 10 minor issues, 3 serious — HCED **97%**, Wikidata **98%** (accurate or minor).
- **No fabricated events, no fabricated casualties.**
- Systematic finding: ~5% of HCED coordinates are materially off (within the correct country). A shapefile point-in-country check removed **39 records that geocoded to the wrong continent**; the residual intra-country imprecision is disclosed in the Sources page "Coordinate caveat."

## Era spread of the 8,013 additions
- BCE: 388
- 0–1000: 509
- 1000–1500: 861
- 1500–1800: 2,135
- 1800–1945: 3,703
- 1945+: 417

## Files changed
- `public/conflicts.json` — +8,013 records (backup in `backups/conflicts_*_pre_hced.json`).
- `app/layout.tsx`, `components/AboutModal.tsx`, `app/sources/page.tsx` — counter 2,571 → 10,584.
- `app/sources/page.tsx` — new "Bulk historical datasets" section with verbatim required citations (HCED, Wikidata CC0, UCDP's 3-line citation, Brecke) + coordinate caveat.

## Honesty notes / caveats
- These 8k entries are **battle-level stubs**: name, where, when, who, parent war — no casualties, no narrative. They sit at importance 2 so your existing filter keeps the curated high-level view clean by default.
- **Casualties are null** for HCED entries by design (the source has none) — shown as no-estimate, never invented.
- **Coordinate accuracy ~95%** within ~75 km; treat individual battle pins as approximate (disclosed on-site).
- A mid-run incident: an oversized editor insertion truncated `app/sources/page.tsx`; caught by the build check, restored from git, re-applied cleanly. `tsc` now passes.
- **Not pushed.** Working tree only; ship after review.
