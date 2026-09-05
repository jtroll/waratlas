# Indigenous Americas — Empire Expansion Plan

**Status:** Draft for approval. No empire data written yet.
**Date:** 2026-05-30
**Goal:** Deeply expand indigenous-American polities in `public/empires.json` across the whole time horizon (c. 3000 BCE – 1900 CE) — adding missing polities/phases and upgrading approximate borders to hand-traced ones — while staying scholarly and citable.

---

## 1. Current state (verified against `public/empires.json`)

- `empires.json` = GeoJSON FeatureCollection, **356 features**. Each feature: `properties {id, name, startYear, endYear, color, accurate, labelPoint [lng,lat], borderStyle ('solid'|'dashed'), source, borderYear, matchedRegion, polityType}` + MultiPolygon geometry.
- **79 features fall in the Americas**, ~35 of them indigenous polities (Olmec, Zapotec, Teotihuacan, Maya Classic, Toltec, Mixtec, Aztec, Tarascan, Tiwanaku, Wari, Chimú, Inca, Mississippian/Cahokia, Iroquois, Powhatan, Comanche, Lakota, Apache, Mapuche, Taíno, …).
- **The gap:** almost every indigenous entry is `borderStyle: 'dashed', accurate: false` (approximate). Only **Aztec** and **Tarascan** are hand-traced `solid`. So the work is two-pronged: **(a) add missing polities**, **(b) upgrade well-documented dashed borders to solid.**

---

## 2. Datasets — what to download, what doesn't exist

### ⭐ Download this: Cliopatria (Seshat Global History Databank)
The single biggest lever. A `cliopatria.geojson` of ~1,600 **time-keyed polity polygons**, 3400 BCE–2024 CE, each with `Name`, `FromYear`/`ToYear` (negative = BCE), `geometry` (EPSG:4326), `Wikipedia`, `SeshatID` — essentially your schema already. Includes American states (Inca, Aztec, Maya and more).

- **Download:** https://zenodo.org/records/13363121 (`cliopatria.geojson.zip`) · repo https://github.com/Seshat-Global-History-Databank/cliopatria
- **License: CC BY 4.0** (attribution only, commercial OK, no share-alike) — clean.
- **Drop into:** `datasets/cliopatria/`
- Provides ready-made polygons for the imperial/state tier; I ingest American polities from it (mostly `solid`-able), deduped against the existing 79.

### Optional reference: Native Land Digital
Downloadable GeoJSON of indigenous territories (https://api-docs.native-land.ca, free account now required). **Caveats:** contemporary/ethnographic (not time-keyed), **non-commercial license**, and explicitly *non-authoritative* ("not legal boundaries"). Use only as a **dashed cross-check** for territory shapes, with their disclaimer reproduced — never as a canonical source. Optional.

### Already present: historical-basemaps — license correction
You already use `aourednik/historical-basemaps`. **Its license is GPL-3.0 (copyleft), not CC BY-SA** as the Sources page implies — worth correcting, since copyleft share-alike could attach to derived geometry. Its pre-Columbian American coverage is thin; keep it as a basemap scaffold only.

### Where NO dataset exists → hand-trace from atlases
- **All of Amazonia** (Casarabe, Upano, Marajoara, Tapajós): only LIDAR site-extents in *Nature*/*Science* papers — trace approximate hulls, flag dashed.
- **Most North American polities/chiefdoms & all sub-state Meso/Andean polities**: trace from **Waldman, *Atlas of the North American Indian***; **Smithsonian *Handbook of North American Indians***; **Coe & Koontz, *Mexico***; **Sharer & Traxler, *The Ancient Maya***; **D'Altroy, *The Incas***; **Martin & Grube** macro-politics map (Maya). Construct polygons vertex-by-vertex from described extent + coastlines/rivers/mountains (the project's established method), flagged honestly.

---

## 3. Candidate additions (~55, by region/era)

Flags: **[S]** = well-bounded, can carry a solid border · **[D]** = approximate, dashed. Sources in §2 / research notes.

### Mesoamerica (~20)
- **Split "Maya Classic" blob into hegemonies:** Tikal/Mutal [D core S], Calakmul/Kaan [D], **Palenque [S]**, **Copán [S]**, **Caracol [S]** (LiDAR-bounded). (Martin & Grube; Chase & Chase 1998.)
- Maya Preclassic: El Mirador/Kaan basin [D], Kaminaljuyú [D].
- Preclassic central/Gulf: Cuicuilco [D]; San Lorenzo & La Venta Olmec **phases** [D] (optional temporal split of existing Olmec).
- Epiclassic city-states: Xochicalco [D], Cacaxtla–Xochitécatl [D], El Tajín/Totonac [D], Cantona [D].
- Postclassic central Mexico: **Tepanec/Azcapotzalco [D]**, Acolhua/Texcoco [D], **Tlatelolco [S]**, founding-phase **Tenochtitlan 1325–1428 [S]**, Cholula [D].
- Highland Maya Postclassic: Kʼicheʼ/Qʼumarkaj [D], Kaqchikel/Iximche [D].
- Also: Huastec [D], Teuchitlán tradition [D].

### Andes + Amazonia (~20)
- **Upgrades:** **Inca → solid** (Qhapaq Ñan + natural frontiers Maule→Ancasmayo), **Chimú → solid** (coastal valley strip).
- Preceramic/Formative: **Caral/Norte Chico [D]**, Cupisnique [D], Sechín/Casma [D], **Chavín horizon** (tight heartland + dashed sphere), Paracas [D].
- Early Intermediate: Moche (N & S, two polygons) [D], Nazca [D], Recuay [D], Lima [D].
- Late Intermediate: Sicán/Lambayeque [D], **Chachapoya** (Marañón–Huallaga bounded) [D], Chincha [D], Ichma [D], Aymara kingdoms (Lupaca, Colla, Pacajes — three polygons) [D], Huanca [D].
- Amazonia/lowland: **Marajoara** [D], **Casarabe/Llanos de Mojos** (LIDAR) [D], **Upano Valley** (LIDAR) [D], Tapajós/Santarém [D], Diquís (Costa Rica) [D].
- Southern Cone: Diaguita & Calchaquí [D].

### North America (~18)
- Archaic: **Poverty Point** [D].
- Mississippian variants: Caddoan/Spiro [D], Fort Ancient [D], Oneota [D], Plaquemine [D], Etowah/S. Appalachian [D].
- Southeast confederacies: **Caddo, Muscogee/Creek, Cherokee, Choctaw, Chickasaw** [D], Catawba [D].
- Northeast/Great Lakes: Wabanaki [D], Wampanoag [D], Council of Three Fires [D], Illinois Confederation [D].
- Plains/West: **Blackfoot** [D], Crow [D], Cheyenne [D], Pawnee [D], **Navajo/Dinétah** [D], Shoshone [D], **Rio Grande Pueblos (historic) [S-ish]**.
- Pacific NW / Arctic: **Haida [S-ish]** (archipelago), Tlingit [D], Chinook [D], Pomo [D], **Thule/proto-Inuit** [D].

### Dashed→solid upgrades of existing entries
Inca, Chimú (above); Natchez, Calusa, Etowah-adjacent Coosa tightening; consider Mayapan (Roys province lines).

---

## 4. Multi-agent execution workflow

**Wave 0 — (you) download Cliopatria** into `datasets/cliopatria/` (CC BY). I can start Waves A–B in parallel without it.

**Wave A — Cliopatria ingest (engineer)**
Parse `cliopatria.geojson` → filter American polities in our time range → map to schema (`solid` where geometry is precise) → dedupe vs existing 79 → stage.

**Wave B — Hand-trace (parallel historian-cartographer agents, sharded by region)**
Each agent takes a region shard, and per polity: pulls the scholarly extent description, constructs a GeoJSON polygon vertex-by-vertex anchored on named coastlines/rivers/mountains/frontier sites, sets `borderStyle`/`accurate` honestly, writes `polityType`, `labelPoint`, `source` (citation), and a short description. Emits records + an evidence note.

**Wave C — Skeptical review (independent agents: senior engineer + historian)**
- *Engineer:* valid GeoJSON (ring closure, winding, no self-intersection, coords in range, polygons on land), unique ids, schema types, `next build`/`tsc`.
- *Historian:* extent plausibility vs cited source, dating, solid/dashed honesty, dedup, Eurocentrism check.
- **Visual check:** render each new polygon on a basemap (static map image) and eyeball it at the map's actual zoom; flag polygons in the ocean or wildly oversized.

**Wave D — Viewport / state testing**
Render the map + several new empire polygons at mobile/tablet/desktop widths; exercise empty/error states (a polity with no description, BCE dates, antimeridian/high-latitude geometry like Thule/Aleutians).

**Wave E — Merge + report**
Merge solid + approved dashed; update Sources page (historical-basemaps license fix + Cliopatria/Native Land citations); update any empire counter; write `NATIVE_AMERICAN_EXPANSION_REPORT.md` (added list, solid vs dashed, sources, dedup, diff).

---

## 5. Open decisions for you (§7-style)

1. **Scope** — all indigenous Americas (Meso + Andes + Amazonia + North America, ~55 candidates), or a subset (e.g., North America only)?
2. **Cliopatria** — download it now for ready-made solid polygons (recommended), or hand-trace everything?
3. **Border upgrades** — also upgrade well-documented existing dashed borders to solid (Inca, Chimú, split Maya), or only ADD new polities?
4. **Maya Classic** — split the single "Maya Classic" blob into the five named hegemonies (highest scholarly value), or leave as-is and only add elsewhere?

---

*Approve scope + §5 and I'll run Waves A–E, self-review, and deliver the updated `empires.json` + report with a diff.*
