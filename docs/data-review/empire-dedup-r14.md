# Empire duplicate decisions — review round 14

Source: audit H4 (`data_audit.md`, 2026-09-04). Rule applied: a pair is a *true
duplicate* when the two polygons are vertex-identical (or IoU ≥ 0.95) **and**
describe the same polity in the same period; the record kept is the
`accurate: true` one, then the better-sourced one, then the one with more
vertices. Pairs that are genuinely different time slices keep both records
with non-overlapping intervals. Applied by `scripts/empires_fix_r14.py`.

| Pair | Decision | Kept | Removed / changed | Rationale |
|---|---|---|---|---|
| Venice | duplicate | `europe-venetian-republic` (HBM 1500, accurate) | `republic-of-venice` | vertex-identical 114-vertex outline, same 697–1797 interval; the removed one was a clipped-country reconstruction flagged inaccurate |
| Aksum | duplicate | `kingdom-of-axum` (renamed "Kingdom of Aksum", start −100 → 100) | `africa-aksumite-empire` | vertex-identical HBM 400 outline; merged interval 100–940 per task 5 |
| Ethiopia (Solomonic) | duplicate | `ethiopian-empire` (now 1900–1974) | `africa-solomonic-dynasty` | vertex-identical HBM 1914 outline, identical 1270–1974 interval |
| Ethiopia (family) | re-sliced | `africa-ethiopian-empire-medieval` 1270–1855, `africa-ethiopian-empire-menelik` 1855–1900, `ethiopian-empire` 1900–1974 | intervals changed | four polygons were simultaneous 1855–1936; medieval slice extended through the Gondarine era with a borderNote; menelik slice ends at its 1900 borderYear |
| Nobatia / Post-Meroitic Nubia | duplicate | `africa-nobatia-kingdom` (HBM; borderYear 700 → 600) | `africa-nubia-post-meroitic` | vertex-identical 17-vertex outline, 350–652 vs 350–650 |
| Asante / Ashanti | duplicate | `africa-asante-empire` (endYear 1896 → 1902) | `ashanti-empire` | vertex-identical HBM 1800 outline; 1902 (annexation) kept as the end date |
| Mutapa / Monomutapa | duplicate | `africa-mutapa-empire` 1430–1760 | `africa-monomutapa` 1440–1629 | vertex-identical HBM 1500 outline, sub-interval |
| Maratha | duplicate | `asia-maratha-confederacy` (132 vertices) | `maratha-empire` (59 vertices) | bbox IoU 0.96, same 1674–1818 interval, same source and type; more vertices kept |
| Lesotho / Sotho | duplicate | `africa-lesotho-kingdom` "Lesotho / Basutoland" 1822–2026 | `africa-sotho-kingdom` 1822–1870 | vertex-identical outline; the surviving record already covers Moshoeshoe's kingdom |
| Ashikaga / Sengoku-Ashikaga | different slices | both | `asia-ashikaga-shogunate` 1338–1467, `asia-sengoku-ashikaga` 1467–1573 | same HBM Japan outline but different eras; cut at the Ōnin War (1467) |
| Portuguese Brazil ×3 | duplicate | `americas-portuguese-brazil-1700` 1500–1750 (HBM 1715), `americas-portuguese-brazil-1750` 1750–1822 | `portuguese-brazil` 1500–1822 | removed record was vertex-identical to the 1750 slice (modern-Brazil clip) and overlapped both slices |
| Frankish / Carolingian | different slices | both | `europe-frankish-kingdom` 481–800, `carolingian-empire` 800–843 | same HBM 800 outline; cut at Charlemagne's imperial coronation |
| Qing ×2 (H5) | duplicate | `qing-dynasty-1790` 1644–1912 | `asia-qing-peak` 1760–1800 | vertex-identical 728-vertex HBM 1800 outline, sub-interval |
| Mali ×2 (found in passing) | duplicate | `africa-mali-empire` 1235–1670 | `africa-mali-empire-peak` 1320–1360 | vertex-identical 52-vertex HBM 1325 outline, sub-interval |

Net: 11 features removed (427 → 416 before the four Byzantine gap-fill
additions; 420 after). The corresponding `empire-wikipedia.json` entries were
removed and the Byzantine entry cloned for the four new slice ids.
