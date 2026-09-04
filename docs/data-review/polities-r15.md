# Empire data — review round 15 (Phase 4: missing polities)

Scope: `data/empires.json` (+22 features, 420 → 442), `data/empire-wikipedia.json` (unchanged, see §4).
Script: `scripts/r15_add_polities.py` (idempotent; ids already present are skipped). Run log:
`docs/data-review/polities-r15.log`. Verified by `node scripts/validate-empires.mjs`
(`empires: 442 features, 171 accurate, 168 solid … validate-empires: OK`) and `npm run data`
(`verified 442 empire features / 247092 vertices byte-identical`).

Hard rules honoured: every HBM polygon is copied verbatim from
`aourednik/historical-basemaps/geojson/world_<year>.geojson` (no rounding, no simplification;
several HBM features of one polity are concatenated into one MultiPolygon, coordinates untouched).
The four polities HBM does not draw are hand-traced by clipping the HBM coastline to a hand-drawn
inland line; they carry `accurate:false`, `borderStyle:'dashed'`, `source:'hand-crafted-from-atlases'`,
a `handCraftedNote`, and have ≥ 40 vertices (50–123). No existing feature was edited or deleted.
New features are appended at the end of the collection. `labelPoint` = shapely `polylabel`
(tolerance 0.001°) of the largest polygon, except where a hint point was needed (§2).

## 1. Features added (HBM, full precision)

| id | name | years | HBM snapshot : NAME | vertices | colour | notes |
|---|---|---|---|---|---|---|
| `soviet-union-1938` | Soviet Union (interwar) | 1922–1945 | 1938 : USSR | 2,239 | #B22222 | pre-1939 borders; borderYear 1938 |
| `soviet-union-1960` | Soviet Union (Cold War) | 1945–1991 | 1960 : USSR | 2,483 | #B22222 | post-1945 extent (Kaliningrad, Tuva, Karelia, S. Sakhalin, Kurils). The 1945 snapshot has the same outline plus 20 island slivers, so 1960 was chosen; rings are already split at the antimeridian |
| `kingdom-of-prussia-1715` | Kingdom of Prussia (1715) | 1701–1741 | 1715 : Brandenburg + Prussia (SUBJECTO=Prussia) | 349 | #3d3d52 | HBM 1700 draws only Ducal Prussia (Brandenburg is inside the HRE polygon), so 1715 is the earliest usable snapshot; before Silesia |
| `kingdom-of-prussia-1783` | Kingdom of Prussia (1783) | 1742–1814 | 1783 : Prussia ×2 | 433 | #3d3d52 | with Silesia and West Prussia; 1793/95 partition gains and 1807 Tilsit losses not shown (no 1750/1795/1807 snapshot exists) |
| `kingdom-of-prussia-1815` | Kingdom of Prussia (1815) | 1815–1871 | 1815 : Prussia ×5 | 704 | #3d3d52 | ends 1871 when `german-empire` takes over; the kingdom persisted inside the Reich to 1918 but drawing it would double-draw Germany |
| `sumer-ur-iii` | Sumer (Ur III) | −2900–−2004 | bc2000 : Ur | 33 | #6F4E37 | HBM's only Sumerian polygon is Ur III; used as a regional envelope for the whole Sumerian period (borderNote says so). Label hint at 45.8E 31.6N (polylabel fell near Babylon) |
| `kingdom-of-israel-judah` | Kingdom of Israel and Judah | −1000–−586 | bc1000 : Kingdom of David and Solomon | 55 | #7B5184 | **accurate:false / dashed**: the HBM polygon is the maximal biblical extent (to the Euphrates); the attested kingdoms were far smaller. Label hint 35.2E 31.8N |
| `novgorod-republic` | Novgorod Republic | 1136–1478 | 1300 : Novgorod | 114 | #5a7d9a | |
| `kingdom-of-sicily` | Kingdom of Sicily | 1130–1282 | 1200 : "Dutchy of Benevento" | 71 | #CD5C5C | HBM mislabels the Norman-Hohenstaufen kingdom (Sicily + Mezzogiorno) as Benevento; geometry is the kingdom. Dated to the Vespers split (1282) so that `borderYear` 1200 lies inside the interval and `europe-naples` (1282–) continues the mainland |
| `visigothic-kingdom-toulouse` | Visigothic Kingdom (Toulouse) | 418–507 | 500 : Visigoths | 141 | #708238 | |
| `visigothic-kingdom-toledo` | Visigothic Kingdom (Toledo) | 507–711 | 600 : Visigothic Kingdom | 184 | #708238 | |
| `ostrogothic-kingdom` | Ostrogothic Kingdom | 493–553 | 500 : Ostrogoths | 230 | #789262 | HBM feature has empty SUBJECTO; matched by NAME |
| `vandal-kingdom` | Vandal Kingdom | 435–534 | 500 : Vandals | 351 | #9c6b4f | 8 polygons (Africa + islands) |
| `lombard-kingdom` | Lombard Kingdom | 568–774 | 600 : Lombard principalities | 96 | #6b8e5a | kingdom + Spoleto + Benevento (HBM 700 splits the same outline into two features) |
| `samanid-empire` | Samanid Empire | 819–999 | 900 : Samanid Empire | 49 | #c0824a | |
| `balhae` | Balhae | 698–926 | 900 : Balhae | 75 | #7b9e89 | HBM 800 draws the same state as "Parhae" (57 v); 900 chosen |
| `toungoo-burma` | Toungoo Burma | 1510–1752 | 1650 : Ava | 128 | #4a7d8c | Restored Toungoo extent; borderNote flags that Bayinnaung's First Toungoo Empire (1539–99) was far larger and that HBM 1600 only draws its collapse |
| `kazan-khanate` | Kazan Khanate | 1438–1552 | 1530 : Kazan Khanate | 12 | #bc8f5a | not in HBM 1500 (merged into the Golden Horde there); 1530 polygon is coarse (12 vertices) but is the source's full precision |

## 2. Features added (hand-traced, dashed)

| id | name | years | construction | vertices |
|---|---|---|---|---|
| `athens-delian-league` | Athens (Delian League) | −478–−404 | HBM −500 "Greek city-states" mainland polygon ∩ hand-drawn Attica window (Megarid / Kithairon / Parnes line), plus the HBM island polygons of Euboea and the Cyclades (Melos excluded — neutral until 416; Crete excluded). Ionian/Hellespontine members lie outside the HBM Greek polygon and are not shown. Label placed on Attica (23.73E 38.0N) rather than the larger Euboea polygon | 123 |
| `sparta-peloponnesian-league` | Sparta (Peloponnesian League) | −550–−366 | same HBM polygon ∩ hand-drawn Peloponnese window minus Achaea (north-coast strip) and minus an Argive-plain block (22.5–22.95E, 37.45–37.85N; Argos never joined). Megara and Boeotia not included. Dated to the League (c. 550–366 BCE), not to Sparta's whole history | 50 |
| `empire-of-nicaea` | Empire of Nicaea | 1204–1261 | HBM 1200 "Byzantine Empire" Anatolian polygon ∩ hand-drawn window west of a Heraclea Pontica – Sangarius – Phrygia – Philadelphia – Meander line; the HBM 1200 Rum frontier is a straight line at ~33.3E, so the clip was necessary. Closes the Byzantine 1204–1261 gap left by r14 (with `latin-empire` for Thrace) | 114 |
| `phoenicia` | Phoenicia | −1200–−539 | HBM −1000 coastline (the "Hittites" polygon carries the Lebanese coast north of Tyre; "Kingdom of David and Solomon" the Tyre hinterland) ∩ a hand-drawn strip whose inland edge follows the Mount Lebanon / Nusayriyah crest (35 hand-placed points). `polityType:'confederation'` (city-states). Ends with the Persian conquest (539 BCE); the cities were Assyrian/Babylonian tributaries from the 8th century | 54 |

Both leagues use `polityType:'confederation'` (alliances of city-states), so they are dashed regardless.
Nicaea is a `state` but hand-traced → `accurate:false` → dashed, per the r14 rule.

## 3. Skipped (with reason)

| requested | reason |
|---|---|
| Kievan Rus' 882–1240 | already present as `kyivan-rus` (882–1240, HBM 1000 "Kyivan Rus"); adding again would overlap the same polity |
| Great Zimbabwe c. 1220–1450 | already present as `kingdom-of-zimbabwe` (1100–1450, HBM, tributary); the HBM 1300/1400 "Great Zimbabwe" polygon (14 v) is what that feature already carries |
| Argead Macedon 808–309 BCE | no HBM feature: −500/−400 merge Macedonia into "Greek city-states" (−400 has no CONTROL split either); −300 only has "Kingdom of Kassander" (post-Argead). Brief said "else skip" |
| Kingdom of Prussia 1701–1918 as one feature | split into three slices (§1); the 1872–1918 span is intentionally left to `german-empire` |
| Sumer 2900 BCE from a −2900/−2500 snapshot | HBM has no world_bc2500; world_bc3000 "Ur" is the same 34-vertex polygon as bc2000, so bc2000 was used with a borderNote |
| Phoenicia from HBM | HBM −1000/−700 have no Phoenician feature (the coast belongs to "Hittites"); hand-traced instead (§2) |

Other polities the audit listed as absent but the brief did not request (Elam, Lydia, Media, Urartu,
Palmyra, Buyids, Saffarids, Trebizond, Danish North Sea Empire, post-1945 nation-states) were not
touched. HBM −2000 does carry an "Elam" polygon (51 v) if a later round wants it.

## 4. Wikipedia summaries

`https://en.wikipedia.org/api/rest_v1/page/summary/<Title>` is blocked by the egress proxy in this
environment (`CONNECT tunnel failed, response 403`), so **no entries were added** to
`data/empire-wikipedia.json`. The script retries on every run and skips ids that already have an entry;
running it on a machine with network access will fill in the 22 ids with these titles:
Soviet Union ×2, Kingdom of Prussia ×3, Sumer, Kingdom of Israel (united monarchy), Novgorod Republic,
Kingdom of Sicily, Visigothic Kingdom ×2, Ostrogothic Kingdom, Vandal Kingdom, Kingdom of the Lombards,
Samanid Empire, Balhae, Toungoo dynasty, Khanate of Kazan, Delian League, Peloponnesian League,
Empire of Nicaea, Phoenicia.

## 5. Judgment calls to double-check

1. `kingdom-of-israel-judah` marked approximate (dashed) although the geometry is a verbatim HBM pull — the source polygon is the biblical maximum, not a border historians accept.
2. `sumer-ur-iii` dated −2900 with an Ur III (−2000) outline; alternative is to start it at −2112.
3. `kingdom-of-sicily` runs to 1282 (not 1194) so the HBM 1200 outline sits inside the interval; the name drops "Norman".
4. `sparta-peloponnesian-league` −550–−366 rather than −478–−404; the Argolid cut is a straight-edged box.
5. `toungoo-burma` uses the Restored-Toungoo (1650) outline for the whole 1510–1752 span.
6. Prussia ends 1871; conflicts labelled "Prussia" after 1871 join to `german-empire` via the alias table.
7. New features append at the end of the collection rather than being inserted chronologically (the r14 gap-fills were inserted next to their template; either order is fine for the build).
