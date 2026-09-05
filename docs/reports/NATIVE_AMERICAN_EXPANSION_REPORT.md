# Indigenous Americas Empire Expansion — Implementation Report

**Date:** 2026-05-30  
**Result:** `empires.json` grew **356 → 427 features** (+71 net: 72 added, 1 Maya-blob removed in the split).  

**Scope:** all indigenous Americas — Mesoamerica, Andes, Amazonia, North America, c. 3000 BCE–1900 CE.


## What changed

- **+69 hand-traced polities** across 5 region shards, constructed vertex-by-vertex from scholarly extents (Waldman, Smithsonian Handbook, Coe & Koontz, D'Altroy, Martin & Grube, LIDAR papers).

- **+3 new polities from Cliopatria** (Seshat, CC BY 4.0): Classic Veracruz/El Tajín, Texcoco (Acolhua), founding-phase Tenochtitlan.

- **Maya Classic split:** the single 'Maya Classic Period' blob was removed and replaced with named hegemonies — **Tikal, Calakmul/Kaan, Palenque, Copán, Caracol, El Mirador** (Palenque/Copán/Caracol carry solid borders).

- **Border upgrades:** **Inca** and **Chimú** geometry upgraded from dashed approximations to Cliopatria's scholarly polygons, now solid and cited to Seshat.

- **7 of the new polities are solid** (well-bounded: the compact Maya city-states, Haida's archipelago, the Cliopatria-sourced ones); the rest are honestly **dashed** (approximate).


## Quality review

- **Geometry (engineer):** all 72 validated — valid GeoJSON, closed rings, no self-intersection, coordinates in range, representative point on land (Thule reshaped to Baffin Island, Wampanoag to the New England coast after the checks flagged them).

- **Historian:** 68/72 clean, 4 fixes (rio-grande-pueblos solid→dashed as a dispersed cluster; Tenochtitlan founding 1326→1325; two region-label sharpenings). No serious dating/placement errors.

- **Visual:** rendered on a world-borders basemap at North America + Latin America extents and eyeballed — all polygons land in the correct regions.

- **Build:** `tsc` passes. Empty state confirmed — empires without a Wikipedia summary show the existing 'No editorial summary yet' fallback.


## Added polities by region


### Mesoamerica — 16

- Kaminaljuyú (400 BCE–900)
- Teuchitlán tradition (350 BCE–500)
- El Mirador / Kaan basin (300 BCE–150)
- Tikal (Mutal) hegemony (250–869)
- Palenque (Baʼakul) (250–799) **[solid]**
- Caracol (Oxwitzaʼ) (331–900) **[solid]**
- Calakmul / Kaan (Snake) kingdom (400–800)
- Copán (Xukpi) (426–822) **[solid]**
- Cantona (600–1000)
- Xochicalco (650–900)
- Cacaxtla–Xochitécatl (650–900)
- Huastec civilization (750–1521)
- Cholula (Tollan-Chollollan) (1200–1521)
- Kʼicheʼ kingdom of Qʼumarkaj (Utatlán) (1225–1524)
- Tepanec Empire (Azcapotzalco) (1300–1428)
- Kaqchikel kingdom of Iximche (1470–1524)

### Andes — 18

- Caral / Norte Chico (3000 BCE–1800 BCE)
- Sechín / Casma (1800 BCE–1000 BCE)
- Cupisnique (1500 BCE–500 BCE)
- Chavín horizon (900 BCE–200 BCE)
- Paracas (800 BCE–100)
- Nazca (100 BCE–800)
- Moche (Northern) (100–800)
- Moche (Southern) (100–800)
- Recuay (100–700)
- Lima culture (100–650)
- Sicán / Lambayeque (750–1375)
- Chachapoya (800–1470)
- Chincha Kingdom (1000–1476)
- Huanca (Wanka) (1000–1460)
- Ichma (Ychsma) (1100–1469)
- Colla (Aymara) (1150–1450)
- Lupaca (Aymara) (1150–1450)
- Pacajes (Aymara) (1150–1450)

### Amazonia / Southern Cone — 7

- Upano Valley culture (500 BCE–600)
- Marajoara culture (400–1300)
- Casarabe culture (Llanos de Mojos) (500–1400)
- Diquís culture (700–1530)
- Tapajós / Santarém culture (1000–1500)
- Diaguita (1000–1480)
- Calchaquí (1480–1667)

### North America — East — 16

- Poverty Point culture (1700 BCE–1100 BCE)
- Caddoan Mississippian (Spiro) (800–1450)
- Oneota (800–1650)
- Fort Ancient culture (1000–1750)
- Etowah / South Appalachian Mississippian (1000–1550)
- Plaquemine culture (1200–1700)
- Caddo Confederacy (1520–1860)
- Muscogee (Creek) Confederacy (1540–1836)
- Choctaw (1540–1830)
- Chickasaw (1540–1837)
- Cherokee (1600–1838)
- Catawba (1600–1840)
- Wampanoag (1600–1676)
- Illinois Confederation (1640–1832)
- Wabanaki Confederacy (1680–1862)
- Council of Three Fires (Anishinaabe) (1700–1850)

### North America — West/Arctic — 12

- Haida (1000–1900) **[solid]**
- Tlingit (1000–1900)
- Thule culture (proto-Inuit) (1000–1600)
- Rio Grande Pueblos (historic) (1300–1900)
- Navajo (Diné) / Dinétah (1500–1868)
- Shoshone (1500–1870)
- Chinook (1500–1850)
- Pomo (1500–1850)
- Pawnee (1600–1875)
- Crow (Apsáalooke) (1700–1868)
- Cheyenne (1700–1877)
- Blackfoot Confederacy (Niitsitapi) (1730–1877)

### Cliopatria (Seshat) additions — 3

- El Tajín / Classic Veracruz (705–1110) **[solid]**
- Texcoco (Acolhua) (1202–1325) **[solid]**
- Tenochtitlan (founding phase) (1325–1421) **[solid]**



## Files changed

- `public/empires.json` — +71 features (backup in `backups/empires_*_pre_native_american.json`).

- `app/layout.tsx`, `components/AboutModal.tsx`, `app/sources/page.tsx` — empire counter 376 → 427; border-accuracy ratio corrected (≈36% solid); **historical-basemaps license fixed CC BY-SA 4.0 → GPL-3.0**; Cliopatria/Seshat citation + indigenous-Americas expansion note added.


## Honesty notes & caveats

- **Most new borders are dashed/approximate** — pre-Columbian and fluid historic territories genuinely lack precise frontiers; flagged so users won't cite the lines.

- **Hand-traced polygons are schematic hulls** from described extents, not surveyed boundaries. Low-confidence cases (Huastec, Tepanec reach, Thule, Diaguita, Shoshone, Tapajós) are dashed and noted.

- **Native Land Digital was deliberately excluded** (non-commercial license, explicitly non-authoritative, not time-keyed).

- **Tooling incident:** the in-editor Edit tool truncated `sources/page.tsx` and `AboutModal.tsx` mid-run; the `tsc` check caught it, files were restored from git and re-applied via script. Build is green.

- **Not pushed.** Working tree only.
