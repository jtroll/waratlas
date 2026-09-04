# Empire & city data repair — review round 14 (2026-09-04)

Scope: `public/empires.json`, `public/cities.json`, `public/empire-wikipedia.json`.
Scripts: `scripts/empires_fix_r14.py` (+ `scripts/empires_hand_traced_r14.py`),
`scripts/cities_normalize_r14.py`, `scripts/validate-empires.mjs`.
Full per-step log: `docs/data-review/empires-r14.log`. Duplicate decisions:
`docs/data-review/empire-dedup-r14.md`.

Hard rule honoured: no coordinate was rounded, no vertex simplified or
dropped, no polygon deleted except vertex-identical duplicates of the same
polity or geographically wrong polygons (which were replaced, not dropped).

## Counts

| | before | after |
|---|---|---|
| empire features | 427 | 420 (−11 duplicates, +4 Byzantine gap fills) |
| `accurate: true` | 155 | 154 |
| `borderStyle: solid` | 155 | 151 (rule: solid ⇔ accurate ∧ state) |
| `polityType` values | 10 (incl. kingdom/nation/city-state/hegemony) | 6 (state 253, tributary 71, culture 35, confederation 31, nomadic-range 20, chiefdom 10) |
| `source` values | 60 free-text strings | 6 enum values; original text preserved verbatim in new `sourceDetail` |
| labelPoint outside geometry | 38 (19 outside bbox) | 0 |
| borderYear outside interval | 15 | 0 |
| city records | 704 | 661 (−47 duplicates, +4 fills); every record has an `id` |
| overlapping city name periods (same coordinates) | 56 | 0 |

`node scripts/validate-empires.mjs` → `validate-empires: OK`.

## Task 1 — wrong-continent polygons

HBM (aourednik/historical-basemaps) was reachable; snapshots were pulled at
full precision.

| id | before | after | note |
|---|---|---|---|
| `manchukuo` | Antarctica (6 polys, −180…180 × −90…−63) | HBM `world_1945` **"Manchuria"** bbox 115.6…134.7 × 38.8…53.5, borderYear 1945, matchedRegion "Manchuria", accurate, solid | HBM 1938 folds Manchukuo into "Empire of Japan"; the 1930 and 1945 "Manchuria" outlines are identical and include Jehol |
| `assyrian-empire-peak` | Taiwan | **hand-traced** 66-vertex polygon, Egypt-to-Zagros greatest extent c. 670 BC; accurate:false, dashed, source hand-crafted-from-atlases, borderYear −670 | HBM `bc700` "Assyria" is only the 12-vertex heartland (40.8–46.1 °E), smaller than the existing hand-traced `assyrian-neo-early`; unusable for a "peak" slice |
| `neo-babylonian-empire` | New Zealand | **hand-traced** 47-vertex polygon, Nebuchadnezzar/Nabonidus extent c. 560 BC incl. Tayma; accurate:false, dashed, borderYear −560 | HBM has no snapshot between bc700 (Babylonia = small core) and bc500 (Achaemenid) |
| `kingdom-of-burgundy` (found in passing) | HBM 1200 "Burgandy" = Kingdom of Arles (5.3…8.5 × 43.8…48.0), labelled "Duchy of Burgundy" 1363–1477, accurate:true | **hand-traced** Valois Burgundian State c. 1475 (Duchy + Franche-Comté; Burgundian Netherlands with Liège cut out as holes); renamed "Duchy of Burgundy (Valois)", accurate:false, dashed, borderYear 1475 | the old polygon was the wrong polity, three centuries and 300 km off |

All four label points were checked to lie inside the new geometry.

## Task 2 — antimeridian

No ring in the file crosses ±180. The nine features flagged by the audit have
a feature-level bbox of −180…180 only because they already contain separate
polygons on both sides of the line (Fiji's Vanua Levu for Tu'i Tonga and the
British Empire, Chukotka/Wrangel/Big Diomede for Russia). Widest single ring
per feature: Tu'i Tonga 1.45°, Russia 165.9°, British 1858–1947 85.4°.
Manchukuo's Antarctic band is gone with the Task 1 re-pull. Nothing was
split; the validator now guards against any ring wider than 300°.

Before/after bboxes: unchanged for the eight genuine features;
`manchukuo` −180…180 × −90…−63.2 → 115.6…134.7 × 38.8…53.5.

## Task 3 — duplicates

See `empire-dedup-r14.md`. Removed: `republic-of-venice`,
`africa-aksumite-empire`, `africa-solomonic-dynasty`,
`africa-nubia-post-meroitic`, `ashanti-empire`, `africa-monomutapa`,
`maratha-empire`, `africa-sotho-kingdom`, `portuguese-brazil`,
`asia-qing-peak`, `africa-mali-empire-peak`. Re-sliced instead of removed:
Ashikaga/Sengoku (cut 1467), Frankish/Carolingian (cut 800).

## Task 4 — slice overlaps, gaps, borderYear

Convention: numbered snapshot series (British Empire, British India, United
States) keep the file's existing "end = next start − 1" convention; dynastic
transitions use a shared boundary year (the validator treats intervals as
half-open, so a shared year is not an overlap).

- Mughal: `mughal-early` 1526–1556 ("Babur–Humayun"), `asia-mughal-akbar`
  1556–1605, `mughal-peak` 1605–1658 ("Jahangir–Shah Jahan"),
  `asia-mughal-aurangzeb` 1658–1707, `mughal-late` 1707–1857. **`mughal-peak`
  geometry replaced** by HBM `world_1650` "Mughal Empire" (192 vertices; the
  old 51-vertex outline was a simplified copy of the 1700 snapshot and its
  borderYear 1700 fell outside the new slice).
- British India: `-1765` 1757–1794, `-1805` 1795–1839, `-1850` 1840–1859,
  `british-india` 1860–1947 (was 1763–1947, overlapping all three).
- Roman: `roman-empire-augustus` −27–98 (Trajan's accession).
- United States: 1848-slice 1819–1848, 1860-slice 1849–1861.
- British Empire: `-1815` → 1829, `-1837` → 1857, `-1900` → **1918** (WWI gap
  closed; borderNote explains the 1921 mandates).
- Ethiopia: medieval 1270–1855 (renamed "Medieval–Gondarine", borderNote),
  Menelik 1855–1900, `ethiopian-empire` 1900–1974 (borderNote).
- Byzantium: `eastern-roman-byzantine-early` 395–527, `byzantine-justinian`
  527–600 (renamed "Justinian–Maurice"; its geometry already is the HBM 600
  snapshot), **new** `byzantine-empire-700` 600–750 (HBM 700 "Eastern Roman
  Empire", 876 vertices), **new** `byzantine-empire-800` 750–843 (HBM 800),
  `byzantine-late-1025` 843–1204, **new** `byzantine-empire-1300` 1261–1350
  (HBM 1300, 514 vertices), **new** `byzantine-empire-1400` 1350–1453 (HBM
  1400). All four new features: source historical-basemaps, accurate, solid,
  colour #4169E1 (matching `byzantine-late-1025`). Remaining gap: 1204–1261
  (Latin Empire exists as `latin-empire`; Nicaea/Trebizond/Epirus are absent
  — HBM 1279 has no Nicaea feature and Trebizond is a 17-vertex stub).
- borderYear out of range (15): `africa-nobatia-kingdom` 700 → 600,
  `asia-tangut-western-xia` 1000 → 1100, `africa-mossi-wagadougou` 1900 → 1880,
  `ndongo-kingdom` 1492 → 1500 (in each case the in-range HBM snapshot is
  vertex-identical to the one pulled); `byzantine-justinian`,
  `asia-mughal-akbar`, `asia-mughal-aurangzeb` fixed by re-slicing;
  `neo-babylonian-empire` by the Task 1 replacement; **removed** (no HBM
  snapshot in range, or not HBM): `egyptian-old-kingdom`,
  `egyptian-new-kingdom-late`, `assyrian-neo-early`, `americas-hohokam`,
  `americas-ancestral-pueblo`, `americas-comancheria` (the HBM 1492 origin
  stays recorded in `sourceDetail`); `kingdom-of-burgundy` by replacement.

## Task 5 — chronology

`holy-roman-empire` → 1806 (borderNote: HBM 1200 outline) · `abbasid-caliphate`
→ 1258 (borderNote per brief) · `africa-oyo-empire` → 1836 ·
`vijayanagara-empire` → 1646 · `pacific-tonga-tui` → 1865 · `kingdom-of-axum`
100–940, renamed "Kingdom of Aksum" · `americas-wari-huari` 600–1000 ·
`americas-tiwanaku` 550–1000 · `americas-teotihuacan` 100–550 ·
`africa-mali-empire` → 1670 · `russian-empire` renamed **"Russia (Tsardom,
later Empire)"** (id unchanged) · `africa-swaziland-kingdom` renamed
**"Eswatini (Swaziland)"**. Byzantine main feature stays 843–1204 because the
1261–1453 slices were added. USSR not added (Phase 4).

## Task 6 — label points

31 label points recomputed as the pole of inaccessibility (shapely
`polylabel`, tolerance 0.001°) of the largest polygon; only labels that fell
outside the geometry were touched (the audit's 19 bbox cases, of which 7 were
fixed by geometry replacement, plus 19 that were inside the bbox but outside
the polygon, e.g. `roman-empire-late`,
`sassanid-empire`, `europe-bulgarian-first`, `asia-sengoku-ashikaga`). Full list in the log.

## Task 7 — taxonomy

- `polityType`: kingdom(5) → state, nation(1) → state, city-state(10) → state,
  hegemony(5) → tributary.
- `source` enum + `sourceDetail` (verbatim old string). Mapping: any
  `historical-basemaps*` → historical-basemaps (year/name parsed into
  `borderYear`/`matchedRegion` when missing and in range: 0 borderYears (all
  already set), 32 matchedRegions filled); `hand-traced …`, `hand-crafted-from-atlases*`,
  `Wikipedia …` → hand-crafted-from-atlases; `hand-crafted-cultural-extent` →
  approximate-cultural-extent; `Cliopatria / Seshat …` → cliopatria-seshat;
  kept-original / manual-* → manual, **except** `egyptian-old-kingdom`,
  `egyptian-middle-kingdom`, `hittite-empire` whose corrections rationale
  documents them as HBM pulls → historical-basemaps; `downgraded-*` → manual
  except `egyptian-new-kingdom-late` (documented HBM −1000 "Egypt" polygon).
- `borderStyle` recomputed from the rule; 6 records changed: the three
  Task 1 hand-traces plus `americas-chimu-north-coast`, `haida`,
  `classic-veracruz-totonac` (accurate but non-state, were solid).
- Null-valued `borderYear`/`matchedRegion` keys on the Third Reich slices
  removed.

## Task 8 — cities

- 47 duplicate records dropped (list with reasons in
  `scripts/cities_normalize_r14.py::DROP`), coordinates of split chains
  snapped to the precise record.
- Chains made non-overlapping: Byzantium −657…330 → Constantinople 330…1453 →
  Konstantiniyye 1453…1930 → Istanbul 1930… (Konstantiniyye kept rather than
  extending "Constantinople" to 1930 — same non-overlap result, more
  information); Kiev 482…1991 → Kyiv 1991…; Smyrna −1500…1922 → İzmir;
  Batavia → Jakarta 1942; Tsaritsyn → Stalingrad 1925…1961 → Volgograd;
  Mariupol 1779…1948 → Zhdanov → Mariupol 1989…; Jerusalem −1000…130 → Aelia
  Capitolina → Al-Quds 638…1917 → Jerusalem 1917…; Thebes −2000…641 → Luxor;
  Kashi → Banaras 1300…1956 → Varanasi; Belgrade chain (Singidunum −279…500 →
  Belgrade 500…1521 → Belgrad → Beograd); Nanjing chain (new Jinling −333…229,
  Yingtian 1368…1421, Nanjing 1421…); Sankt-Peterburg → Petrograd 1914…1924 →
  Leningrad → St. Petersburg 1991…; Naniwa → Osaka 1496; Zhongdu extended to
  1271; Chang'an extended to 1369; Palmyra endYear −273 → 273 (sign error).
- Beijing gap filled: Beiping 1368–1421, Beijing 1421–1928.
- Conflated sites: the audit's five pairs were each one correct and one wrong
  pin. Moved the wrong one: **Hama** → 36.75E 35.13N (Homs was already at
  Homs), **Hermopolis** → 30.80E 27.78N (Minya was right), Mosul → 43.13E
  36.34N, Jaffa → 34.75E 32.05N and Tel Aviv → 34.78E 32.08N. Thebes/Luxor are
  the same site and were chained instead of separated.
- `id` = slug(name) + founded year (`byzantium-bc657`, `beijing-1421`).

## Not done / left for the owner

- Byzantine 1204–1261: no Nicaea polygon in HBM; not filled.
- `latin-empire`, `kingdom-of-jerusalem`, `europe-serbian-empire` keep
  `source: manual` (their real origin is a manual construction).
- Cities: 15 residual gaps from the audit other than Beijing (Patna 600–1574,
  Skopje 500–1392, Xi'an now closed, etc.) not filled.
- `empires-corrections.json` was not updated (not in scope); its entries for
  the 11 removed ids are now stale.

## Judgment calls to double-check

1. Neo-Assyrian and Neo-Babylonian are now hand-traced (dashed, accurate:false)
   rather than HBM; the Assyrian outline includes Egypt to Thebes.
2. Valois Burgundy replacement polygon (hand-traced, incl. Liège holes).
3. `mughal-peak` geometry swapped to the HBM 1650 snapshot.
4. Ethiopia: HBM 1450 outline kept through 1855 with a caveat note.
5. `russian-empire` name "Russia (Tsardom, later Empire)".
6. Cities: Konstantiniyye retained; Jerusalem split into two records around
   Aelia Capitolina / Al-Quds; Palmyra end year sign flip; Hama/Hermopolis
   moved instead of Homs/Minya.
7. Three `kept-original` and one `downgraded-uncertain` record mapped to
   `historical-basemaps` on the strength of the corrections rationale.
