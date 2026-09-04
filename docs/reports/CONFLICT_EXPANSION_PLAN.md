# Conflict Expansion Plan — War Atlas

**Status:** Draft for approval. No data has been written yet.
**Date:** 2026-05-29
**Goal:** Substantially expand the number of conflicts on the map using reliable, scholarly, *citable* datasets, while preserving the project's intent to be more dependable and citable than peer projects. Every added conflict must carry name, timespan, map location, overview, belligerents, casualty estimate (or an honest "no reliable estimate"), and a source link.

---

## 1. Current state (verified against `public/conflicts.json`)

- **2,301** conflict objects today (the About modal still says "1,340" — stale copy; flag for a separate fix).
- Schema per entry:
  - **Required:** `id`, `name`, `startYear`, `endYear`, `coordinates` (`[lng, lat]`), `locations` (string[]), `countries` (string[] = belligerents), `partOf` (string[]), `casualties` (int | null), `wikipediaUrl`, `importance` (1–5), `description`.
  - **Optional (richer entries):** `hook`, `narrative`, `significance`, `casualtyRange` (`{low, high, source, notes}`), `sources` (`[{label, url}]`), `wikiLink`.
- Negative years = BCE. Coordinates verified as `[longitude, latitude]`.
- Only ~128 entries currently carry a structured `sources` array; ~141 carry `casualtyRange`. **Newly added conflicts will set a higher bar: every one gets a `sources` array and an explicit casualty treatment.**

---

## 2. Dataset survey & recommendation

The peer project (war-atlas.org) drew breadth from Wikidata, UCDP, ACLED, and HiSCoD. We can match much of that breadth *and* stay more citable by being deliberate about which sources we trust and how we cite them. Findings below are from current (May 2026) research; full URLs in §9.

### Tier 1 — ingest (license-clean, geocoded, citable)

| Source | Coverage | Coords? | Casualties? | License | Role |
|---|---|---|---|---|---|
| **UCDP GED + UCDP/PRIO ACD** | 1946/1989–2024, global | **Yes** (GED, village-level) | **Yes** (low/best/high) | **CC BY 4.0** ✅ | Modern layer. The only source that is openly republishable *and* natively geocoded with fatalities. |
| **HCED — Miller & Bakar 2023** | **1468 BCE–2003**, global, de-biased toward non-West | **Yes** (lat/lng per confrontation) | Partial | Academic, replication data on figshare; cite-and-derive | Historical geocoded battle skeleton. Best single fix for antiquity→1800s breadth. |
| **Brecke Conflict Catalog** | 1400 CE–present (Europe to 900) | No (region-coded) | **Yes** (where known) | Public download, no explicit OSS license; cite-and-attribute | Casualty/fatality spine; join to coordinates from HCED/Wikidata. |
| **Wikidata (SPARQL)** | Antiquity–present | **Yes** (P625 where present) | Sometimes (P1120) | **CC0** ✅ | Coordinate + linkage layer; must be cross-checked, never cited alone. |

### Tier 2 — supplementary (geocoded regional depth / casualty enrichment)

- **Dincecco & Onorato** (geocoded medieval/early-modern **Europe**, ~900–1799).
- **Dincecco, Fenske & Onorato** "Is Africa Different?" (geocoded **Africa + Asia** pre-colonial, 1,600+).
- **Besley & Reynal-Querol** (georeferenced pre-colonial **Africa**).
- **PRIO Battle Deaths** (1946–2008 casualty enrichment for the pre-1989 gap).
- **Correlates of War** (1816–2007 war-level battle deaths; **no coords** — geocode in-house; **non-open license**, derive-and-cite only).

### Tier 3 — authoritative reference works (cite, do not bulk-import — copyrighted books)

- **Clodfelter**, *Warfare and Armed Conflicts* (casualty gold standard, 1492–2015).
- **Jaques**, *Dictionary of Battles and Sieges* (~8,500 battles, global, antiquity→2003).
- Regional specialists: **Hassig** (Mesoamerica), **D'Altroy** (Inca), **Keenan/Tucker** (N. American Indian Wars), **Crosby** (Māori Musket Wars), **Lieberman/Reid** (SE Asia).

### Excluded — **ACLED**
ACLED's EULA prohibits republishing/redistributing or building a public derivative that re-exposes the underlying records. A public map plotting ACLED events would breach it. **Excluded entirely**, per your instruction and confirmed license terms.

### Licensing guardrails (build-time)
- **Safe to mirror raw + derive:** UCDP (CC BY 4.0), Wikidata (CC0).
- **Derive-and-cite only (do not mirror raw files):** Brecke, HCED, Dincecco family, COW, PRIO — we extract facts (facts aren't copyrightable), store our own records, and cite the source. We do **not** redistribute their data files in the repo.
- **Never bulk-copy text:** Clodfelter/Jaques/specialist books — used for verification and citation strings only.

---

## 3. Where the new conflicts will concentrate

Per your answer, breadth across all eras, with weight toward the four admitted gaps. Proposed allocation per batch:

- **Flagged gaps (~40%):** pre-colonial Americas, sub-Saharan Africa, Pacific/Oceania, Southeast Asia.
- **Medieval/early-modern Eurasia infill (~25%).**
- **Modern era 1946–2024 (~25%)** from UCDP (license-clean, easy to cite to 2+ sources).
- **Ancient/classical infill (~10%).**

A starter shortlist of high-credibility candidates (firm dates, named belligerents, geolocatable sites, ≥1 scholarly casualty estimate or defensible "no estimate") is in §8.

---

## 4. Verification bar (your relaxed rule, encoded)

> Single highly-reliable scholarly source ⇒ acceptable. Otherwise run the multi-source check.

Concretely, each new conflict is graded:

- **GREEN — ship:** corroborated by **2+ citable sources**, OR by **1 source of the highest reliability** (UCDP, a peer-reviewed dataset/article, Clodfelter, or a region-specialist monograph). Casualty figure matches across sources or sits inside the scholarly range.
- **AMBER — ship but log:** meets every field requirement but rests on **a single non-top-tier citable source**. These are listed separately in the final report so you can "flip the bit" manually.
- **RED — do not ship:** can't confirm it happened from a citable source, no geolocation, or casualty claim is a lone chronicle/propaganda number with no scholarly backing. Held back.

Casualties follow the project's existing honesty pattern: a point `casualties` only when well-attested; a `casualtyRange {low, high, source, notes}` when scholars disagree; and `casualties: null` with a note in `narrative`/`sources` ("no reliable estimate") when no defensible figure exists — never a fabricated or chronicle-propaganda number.

---

## 5. Multi-agent execution workflow

Pipeline runs in waves; each wave is a set of parallel sub-agents with a single reconciliation step.

**Wave A — Acquire & stage (parallel by source)**
- Agent A1: UCDP GED+ACD → extract modern conflicts, dedupe to conflict level, keep coords + low/best/high deaths + CC-BY attribution.
- Agent A2: HCED → extract geocoded historical confrontations for target regions/eras.
- Agent A3: Brecke + regional datasets (Dincecco family, Besley/Reynal-Querol) → casualty figures + regional candidates.
- Output: a normalized **staging table** (not yet merged) with provenance per field.

**Wave B — Dedupe against existing 2,301**
- Agent B1: fuzzy-match staged candidates against current `conflicts.json` by name, year overlap, and coordinate proximity (<~75 km + overlapping date range = likely dup). Produces a clean "net-new" list and a "possible-overlap, needs human eye" list.

**Wave C — Enrich & verify (parallel, sharded by conflict)**
- Several verification agents, each owning a shard of conflicts. For each conflict the agent:
  1. Confirms it occurred from ≥1 top-tier or ≥2 citable sources.
  2. Locks name, start/end years, coordinates (geocoded place verified), belligerents.
  3. Resolves casualties → point / range / null, with source + notes.
  4. Writes `description`, and `hook`/`narrative`/`significance` where warranted.
  5. Assigns `importance` (1–5) on the project's editorial rubric.
  6. Emits the record + a per-conflict **evidence note** (sources, confidence grade, casualty rationale).

**Wave D — Assemble**
- Merge GREEN (+ approved AMBER) records into `conflicts.json` in schema order; keep AMBER flagged. Regenerate any derived counts. Update the About modal's stale "1,340" → correct total.

**Wave E — Skeptical review (independent sub-agents; "senior engineer + historian" pair)**
- **Historian review agent:** re-checks a random + worst-case sample for factual/casualty accuracy against the cited sources; flags Eurocentric importance bias; verifies "no reliable estimate" honesty.
- **Engineer review agent:** validates JSON (schema, types, `[lng,lat]` ordering, no NaN/duplicate IDs, coordinate sanity ranges), runs `next build`/lint, checks render.
- Failures route back to Wave C/D for fix, then re-review.

**Wave F — UI / device / state testing**
- Render the map + a sample of new conflict detail panels at mobile / tablet / desktop widths.
- Manually exercise **empty and error states**: a conflict with `casualties: null`, with empty `sources`, with very long names, with BCE dates, and at extreme coordinates (date-line, high latitude) — confirm no layout break or crash.

---

## 6. Final deliverables

1. Updated `public/conflicts.json` (GREEN + approved AMBER conflicts).
2. **`CONFLICT_EXPANSION_REPORT.md`** containing:
   - Every **added** conflict (name, years, region, casualty treatment, confidence grade, sources).
   - A separate **AMBER list** — met all field criteria but cited to a single non-top-tier source — for you to manually approve/reject later.
   - A separate **RED list** — rejected and why (so the reasoning is auditable).
   - The diff summary (counts by region/era, before/after totals) and a plain-English explanation of changes.
3. The About-modal counter corrected to the new total.

---

## 7. Open decisions for you (before I execute)

1. **Batch size for the first build wave.** Given the verification bar, I'd run an initial wave of **~50–80 net-new conflicts** end-to-end (proves the pipeline, fully verified + tested), then repeat the pipeline in further waves to keep scaling. OK, or do you want a bigger/smaller first wave?
2. **AMBER policy.** Default is *ship AMBER but flag it*. Prefer *hold all AMBER* for manual review instead?
3. **Modern-era weighting.** UCDP is the easiest to cite at volume — happy to lean heavier on 1946–2024 if you want raw count to jump fastest, at some cost to the "gap-filling" goal.
4. **About-modal counter.** Confirm I should update the stale "1,340" while I'm in there.

---

## 8. Starter candidate shortlist (high-credibility, per region)

- **Americas:** Spanish–Aztec War / fall of Tenochtitlan (1519–21); Inca civil war + Cajamarca (1529–32); Maya conquest incl. Nojpetén (to 1697); Pequot War (1637); King Philip's War (1675–76); Pueblo Revolt (1680); Tecumseh's War (1811); Creek War (1813–14); Little Bighorn / Great Sioux War (1876); Nez Perce War (1877).
- **Sub-Saharan Africa:** Mfecane (c. 1815–1840, as a labeled campaign); Anglo-Zulu War — Isandlwana/Rorke's Drift (1879); Battle of Tondibi (1591); Anglo-Ashanti Wars; Franco-Dahomean Wars; Sokoto jihad (1804); Battle of Adwa (1896); Battle of Omdurman (1898); Battle of Mbwila (1665).
- **Pacific/Oceania:** Wars of Hawaiian Unification — Mokuʻōhai (1782), Nuʻuanu (1795); Māori Musket Wars (1807–42, ~20k dead per Crosby).
- **Southeast Asia:** Fall of Ayutthaya (1767); Tây Sơn / Ngọc Hồi–Đống Đa (1789); Siamese–Vietnamese War (1841–45); Majapahit Paregreg War (1404–06); Trịnh–Nguyễn War (1627–73); Bubat incident (1357).

---

## 9. Source URLs

- UCDP downloads (CC BY 4.0): https://ucdp.uu.se/downloads/ — GED codebook https://ucdp.uu.se/downloads/ged/ged251.pdf — ACD codebook https://ucdp.uu.se/downloads/ucdpprio/ucdp-prio-acd-251.pdf
- HCED (Miller & Bakar 2023, *JCR*): https://journals.sagepub.com/doi/abs/10.1177/00220027221119085 — data https://sage.figshare.com/collections/_/6149278
- Brecke Conflict Catalog: https://brecke.inta.gatech.edu/research/conflict/
- Wikidata SPARQL (CC0): https://query.wikidata.org — licensing https://www.wikidata.org/wiki/Wikidata:Licensing
- Dincecco & Onorato (Europe): https://link.springer.com/article/10.1007/s10887-016-9129-4
- Dincecco, Fenske & Onorato (Africa/Asia): https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DJXI4U
- Besley & Reynal-Querol (Africa): https://www.cambridge.org/core/journals/american-political-science-review/article/abs/legacy-of-historical-conflict-evidence-from-africa/6AD09AD8FDC0A82242F1873B6AB3478F
- HiSCoD: https://www.unicaen.fr/hiscod — repo https://github.com/hiscod/hiscod-project
- Correlates of War: https://correlatesofwar.org/data-sets/cow-war/
- PRIO Battle Deaths: https://www.prio.org/data/1
- ACLED EULA (exclusion basis): https://acleddata.com/eula
- Clodfelter: https://mcfarlandbooks.com/product/warfare-and-armed-conflicts/

---

*Approve or adjust §7 and I'll execute Waves A–F and deliver the updated dataset + report.*
