# Empire Border Audit — May 15, 2026

## What was done

A 12-agent parallel audit of all 376 empire polygons in `public/empires.json`,
comparing each to canonical historical cartography sources and emitting a
per-empire corrections patch. Findings applied; corrections logged.

## Numbers

- **Total empires audited**: 376 / 376 (100%)
- **Geometries replaced**: 131
- **Properties updated**: 358 (metadata-only on most kept-as-is empires)
- **Accurate flag**: 252 → 346
- **Solid borders**: 185 → 311
- **Dashed (approximate) borders**: 191 → 65
- **Invalid geometries** (post-audit): 0
- **Empty / tiny / huge geometries**: 0

## How the audit was divided

| Group | Empires | Agent finding |
|-------|---------|---------------|
| Bronze Age / Ancient Near East | 13 | 3 replace, 2 downgrade, 8 keep |
| Classical Mediterranean | 26 | 13 replace, 13 keep — Sassanid was pointed at Yemen, Augustus had Trajan's borders, Pyu was Burma-wide |
| East Asia | 34 | 15 replace, 18 keep, 1 upgrade — Song-southern had Northern-Song geometry; Japan polities were all truncated to a Shikoku strip |
| South & SE Asia | 55 | 11 replace, 7 upgrade — Mughal-Aurangzeb extended to Sri Lanka latitude; Maratha and Maurya overextended into deep south |
| Central Asia / Steppe | 20 | 10 replace, 9 keep — Mongol Empire had a broken global polygon (bbox -180/180), replaced with union of khanate polygons |
| Islamic / Middle East | 36 | 11 replace, 25 keep — Rashidun was an oval; Durrani was a tiny 2°-tall strip; Afsharid/Zand/Qajar all shared one placeholder oval |
| Africa | 70 | 19 replace, 51 keep — Wassoulou expanded east, Mossi trimmed, Ifat shifted, Toro/Ankole separated |
| Medieval Europe | 34 | 32 fix, 2 keep — First Bulgarian Empire was on the Volga River (Volga Bulgars, wrong polity); Byzantine-late-1025 duplicated Justinian; Frankish Kingdom was a 5-vertex stub |
| Early Modern Colonial | 12 | 3 replace, 4 flagged, 5 keep — Portuguese-Brazil-1700 too narrow, Russian-America missing Fort Ross |
| Pre-Columbian Americas | 49 | 11 replace, 7 upgrade — Ancestral-Pueblo bbox reached California due to HBM polygon-grouping bug; Apache confederacy was a thin strip; Comancheria geometry was actually pre-Comanche 1500 |
| Modern Post-1800 | 33 | 13 flagged with issues (German Empire annexed Warsaw, Third Reich '42 absorbed Leningrad, British Empire layers consistently miss small-island/coastal points) |
| Oceania / Pacific | 5 | 4 replace, 1 keep — Tahitian incorrectly included Marquesas; Hawaiian missed the NW chain |

## Sources used

1. **historical-basemaps** (Andrei Ourednik, MIT licensed) — primary vector source for ~32% of replacements. Cloned at `/tmp/audit_sources/historical-basemaps`.
2. **Wikipedia** + Wikipedia Commons map references — primary source for hand-traced polygons.
3. **Britannica**, **Cambridge Ancient/Medieval/Modern Histories**, **World History Encyclopedia** — cross-references for verification.
4. Specialty sources cited per-correction in `public/empires-corrections.json`.

## Files

- `public/empires.json` — updated dataset (376 features, 9.24 MB)
- `public/empires-corrections.json` — audit trail with per-empire rationale,
  source citations, and action taken (287 KB, metadata only — geometries live
  in empires.json)
- `backups/empires.json.pre-audit-20260515-223129.bak` — pre-audit backup
- `AUDIT_REPORT_2026-05-15.md` — this file

## Source-category breakdown (post-audit)

| Source category | Count |
|---|---|
| historical-basemaps (HBM, Ourednik) | 181 |
| reconstructed-clipped-country | 101 |
| hand-crafted-from-atlases | 51 |
| hand-traced-from-Wikipedia/Britannica | 18 |
| other (mixed metadata) | 18 |
| downgraded-uncertain | 7 |

## Known limitations

- 65 empires remain on **dashed/approximate borders** — these are polities
  whose borders are genuinely uncertain in the historical record (e.g., loose
  steppe confederations, cultural-area entities like Maori/Apache/Ancestral
  Puebloan, or polities with no canonical map). The dashed style now
  honestly signals that uncertainty.
- 30 empires are flagged `accurate=false`. These are empires where the
  geometry is plausible but not pinned to a specific cartographic source —
  primarily for polities whose extent was fluid or under-documented.
- The audit could not produce hand-traced replacements for every flagged
  empire in the islamic_middle_east group; 7 remain as downgraded with
  notes in `empires-corrections.json` rather than confident solid borders.

## Verification

- All 376 polygons are valid GeoJSON (closed rings, lon-lat in range, no NaN, no self-intersection after make_valid).
- Spot-check on 14 major empires (Trajan, Achaemenid, Mongol, Umayyad, Han, Yuan, Qing, Aztec, Inca, Ottoman peak, Third Reich, Rashidun, Jin, Liao, Ayyubid) — all bboxes match documented historical extents within ±3°.
