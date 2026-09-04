# Belligerent canonicalisation — review round 15 (Phase 4: `polityIds`)

Scope: `data/conflicts.json` (new optional field `polityIds`; no `countries` string was rewritten, no
record deleted), `scripts/data/polity_aliases.json` (extended), `scripts/data/polity_families.json`
(new), `scripts/data/polity_join_report.json` (new, per-label report).
Script: `scripts/r15_polity_join.py` (idempotent — a second run reports `records changed: 0`).
Guards: `scripts/validate-conflicts.mjs` (every `polityIds` entry must be an empire id, unique, and its
interval must overlap the conflict within a 30-year tolerance for the documented era overrides);
`tests/data.test.ts` (same resolution check + join-rate floor of 60 % for importance ≥ 3).

## 1. How the join works

For each conflict and each `countries` label, in order:

1. the label's `empires` list in `polity_aliases.json` (`"@family"` expands the ordered slice lists in
   `polity_families.json`; an entry may carry `from`/`to` overriding the feature years);
2. otherwise an exact, case-insensitive match on an empire feature `name`.

Candidates are filtered to those overlapping `[startYear, endYear]` (open end = 2100). The slice whose
interval contains the conflict's **start year** wins; if several do, the first in list order wins
(e.g. `England` 1700 → `kingdom-of-england`, not `british-empire-1700`); if none contains it, the
first overlapping slice wins. `polityIds` is written after `countries`, unique, in `countries` order,
and omitted when nothing matched.

Era overrides in use (all listed in `polity_families.json` → `note`): Soviet state from 1917/18
(`soviet-union-1938`), Meiji Japan from 1868 (`empire-of-japan-1895`), Nazi Germany from 1933
(`third-reich-1938`), Union through 1865 (`americas-united-states-1860`; the US slices stop at 1861),
`kingdom-of-england` ≤ 1707 / British Empire ≥ 1707, Castile ≤ 1492 / `spanish-americas` ≥ 1492 for
"Spain", Afsharid ≤ 1795 / Qajar ≥ 1796 for generic "Persia", Ayyubids from 1171 for generic "Egypt",
HRE ≤ 1806 for generic "Germany", late Republic ≤ −27 for Roman civil-war factions (Octavian, Pompey…).

Alias table: 644 entries (212 before), 589 with an `empires` list; the 212 r14 entries keep their
`canonical` / `apply` / `era` values unchanged (verified by diff). Families: 48.

## 2. Match rates

Denominator = records; a record counts as matched when it has ≥ 1 `polityId`.

| slice | records | matched | rate |
|---|---|---|---|
| all records | 10,886 | 7,318 | **67.2 %** |
| importance ≥ 3 | 2,072 | 1,283 | **61.9 %** (target ≥ 60 %) |
| importance < 3 | 8,814 | 6,035 | 68.5 % |
| ancient (< 500) | 889 | 633 | 71.2 % |
| medieval (500–1499) | 1,750 | 1,197 | 68.4 % |
| early modern (1500–1799) | 2,763 | 2,135 | 77.3 % |
| modern (1800–1944) | 4,487 | 3,288 | 73.3 % |
| post-1945 | 997 | 65 | **6.5 %** |

Belligerent mentions: 24,595, of which 10,751 (43.7 %) resolve (audit L6 baseline: 15 % exact-name matches).
The post-1945 rate is structural: apart from the two Soviet slices, `ethiopian-empire` (–1974),
`british-colonial-africa` (–1968), `french-colonial` (–1960) and a handful of kingdoms, `empires.json`
has no post-1945 polity, so 415 of the 2,072 importance ≥ 3 records (20 %) cannot join at all.
Excluding post-1945, the importance ≥ 3 rate is 1,260 / 1,657 = 76.0 % (post-1945: 23 / 415, all via the Soviet, Ethiopian and late-colonial features).

## 3. Top 40 labels

| label | mentions | imp ≥ 3 | resolved | most frequent id |
|---|---|---|---|---|
| United Kingdom | 1537 | 127 | 1494 | british-empire-1815 |
| France | 1534 | 147 | 535 | kingdom-of-france |
| United States | 1111 | 83 | 581 | americas-united-states-1860 |
| Spain | 686 | 64 | 598 | spanish-americas |
| Ottoman Empire | 612 | 91 | 611 | ottoman-late |
| Russia | 548 | 61 | 532 | russian-empire |
| Germany | 393 | 21 | 391 | german-empire |
| Confederate States of America | 346 | 1 | 346 | americas-confederate-states |
| England | 341 | 38 | 339 | kingdom-of-england |
| Habsburg Empire | 315 | 15 | 0 | — |
| Rome | 279 | 40 | 248 | roman-republic-early |
| Japan | 272 | 23 | 242 | empire-of-japan-1942 |
| China | 233 | 17 | 148 | qing-dynasty-1790 |
| Sweden | 213 | 23 | 140 | swedish-empire |
| Netherlands | 203 | 27 | 141 | dutch-republic |
| Prussia | 203 | 13 | 203 | kingdom-of-prussia-1783 |
| Austria | 200 | 25 | 7 | austro-hungarian |
| Byzantine Empire | 189 | 35 | 179 | byzantine-late-1025 |
| Poland | 171 | 22 | 138 | poland-lithuania |
| Portugal | 164 | 33 | 41 | kingdom-of-portugal |
| Persia | 139 | 14 | 135 | safavid-empire |
| Mughal Empire | 129 | 21 | 129 | asia-mughal-aurangzeb |
| Soviet Union | 125 | 25 | 125 | soviet-union-1938 |
| Marathas | 113 | 2 | 98 | asia-maratha-confederacy |
| Denmark | 107 | 7 | 6 | kalmar-union |
| Egypt | 101 | 37 | 53 | egyptian-new-kingdom-peak |
| Scotland | 100 | 5 | 100 | kingdom-of-scotland |
| Mexico | 94 | 11 | 80 | americas-mexican-republic-1824 |
| Venice | 87 | 27 | 86 | europe-venetian-republic |
| Indian Rebels | 87 | 0 | 0 | — |
| Afghanistan | 85 | 11 | 29 | durrani-empire |
| Italy | 85 | 8 | 0 | — |
| Carthage | 81 | 15 | 81 | carthaginian-empire |
| British Empire | 74 | 46 | 74 | british-empire-1900 |
| Royalists | 72 | 5 | 0 | — |
| Israel | 70 | 19 | 0 | — |
| Athens | 69 | 7 | 39 | athens-delian-league |
| Holy Roman Empire | 69 | 15 | 64 | holy-roman-empire |
| Parliamentarians | 63 | 2 | 0 | — |
| Mongols | 61 | 3 | 55 | mongol-empire |

Full per-label detail (all 4,459 labels: count, importance ≥ 3 count, matched ids with counts) is in
`scripts/data/polity_join_report.json`.

## 4. What is still unmatched, and what it would take

### 4a. Partially matched labels (era gaps in `empires.json`)

| label | mentions | unresolved | gap | needed |
|---|---|---|---|---|
| France | 1534 | 999 | everything after 1792 | French Republic / Empire / Third Republic features 1792–1945 (the single biggest gain: ~150 importance ≥ 3 records) |
| United States | 1111 | 530 | after 1865 | US 1866–1945 slice(s) |
| Austria | 200 | 193 | 1526–1866 | Habsburg Monarchy / Austrian Empire feature (would also unlock **Habsburg Empire** 315 mentions, 15 at importance ≥ 3) |
| Portugal / Portuguese Empire | 217 | 165 | after 1580 | Portuguese Empire 1580–1975 (the Brazil features were *not* used as a proxy — most of these are African/Asian colonial wars) |
| Denmark | 107 | 101 | outside 1397–1523 | Denmark–Norway 1524–1814 and Denmark 1814– |
| Spain | 686 | 88 | after 1826 | Spain 1826– |
| China | 233 | 85 | after 1912 | Republic of China / PRC (also **Chinese Communists/Nationalists**, 76 mentions) |
| Sweden | 213 | 73 | before 1611 / after 1721 | Sweden 1523–1611, 1721– |
| Netherlands | 203 | 62 | after 1795 | Kingdom of the Netherlands |
| Afghanistan | 85 | 56 | after 1826 | Emirate/Kingdom of Afghanistan |
| Egypt | 101 | 48 | 1805–1866, after 1914 | Muhammad Ali's Egypt; Kingdom/Republic of Egypt |
| Rome | 279 | 31 | before −264 | early Republic feature (Samnite Wars etc.) |
| Japan | 272 | 30 | 1573–1603 | Azuchi–Momoyama Japan (Toyotomi) |
| Athens | 69 | 30 | outside −478–−404 | Athens as a polity from Cleisthenes (−508) to −322 |

### 4b. Never matched (top by importance ≥ 3)

| label | mentions | imp ≥ 3 | why / needed |
|---|---|---|---|
| Kingdom of Italy | 33 | 28 | no 1861–1946 feature (`italian-colonial-africa` is a colonial holding, not the state) |
| South Africa | 42 | 25 | post-1910 state absent |
| India, Pakistan | 85 | 34 | post-1947 states absent |
| Israel | 70 | 19 | modern Israel absent (ancient "Israel" ≤ −586 does join to `kingdom-of-israel-judah`) |
| Uganda, Angola, DR Congo, Nigeria, Sudan, Chad, Somalia, Libya, Mozambique, Central African Republic | ~180 | ~115 | post-colonial African states absent |
| Indonesia, Cuba, Philippines, Syria, Cambodia, Ukraine | ~150 | ~55 | modern states absent |
| Habsburg Empire | 315 | 15 | see 4a |
| Crusaders | 35 | 11 | multinational expeditions, not a polity — left null deliberately (Kingdom of Jerusalem does join) |
| Mali (modern), Greece (modern), Serbia (modern), Belgium, Australia, Third French Republic / French Third Republic | ~250 | ~50 | modern states absent |
| Mahdist State / Sudanese Mahdists | 24 | 9 | no Mahdist feature 1885–1899 |
| Toucouleur Empire, Xhosa, Alawi Sultanate, Taliban, UNITA, NATO | | | no feature; NATO/UNITA/Taliban are non-state actors |
| Indian Rebels, Royalists, Parliamentarians, Carlists, Spanish Republicans/Nationalists, Taiping, Bolsheviks' opponents (Russian Whites), Cossacks, Jacobites, Hussites, Vikings, Saxons/Britons/Wessex/Mercia/Northumbria | ~600 | ~30 | factions or pre-state peoples; only a faction→polity rule (e.g. Royalists → kingdom-of-england) could join them and that would misstate the war |
| Massacre (41), Various, Insurgents | | | HCED source artefacts (audit H2), not belligerents; untouched here |

### 4c. Deliberate judgment calls

1. "Spain" / "Spanish Empire" 1492–1826 → `spanish-americas` ("Spanish Empire (Americas)"): the feature is the Spanish Empire's only polygon, so European wars of Spain also join to it. Portugal was *not* treated the same way (see 4a).
2. "Dutch East India Company" / "VOC" → `dutch-republic` (its chartering sovereign) for 1602–1795.
3. "Bolsheviks" / "Soviet Russia" / "Russia" from 1917/18 → `soviet-union-1938` (RSFSR → USSR continuity); "Russian Whites" stay null.
4. "Prussia" after 1871 → `german-empire`; "Germany" 1806–1870 is null (the r14 era aliases already turned most of those into "Prussia"/"German Confederation").
5. "Tatars" → Golden Horde until 1502, then Crimean Khanate; "Mongols" → Mongol Empire until 1368, then Golden Horde; "Seljuks" → Great Seljuk first, Rum after 1194; "Goths" → Visigoths (Toulouse/Toledo) then Ostrogoths by date.
6. "Boers" / "Boer Republics" → `africa-south-african-republic` only (one id per label; the Orange Free State joins only under its own name).
7. "Israel" before −586 → `kingdom-of-israel-judah`; "Turkey" ≤ 1922 → Ottoman slices (the r14 era alias already renamed most of them).
8. "Qin" joins only inside `qin-dynasty` (−221–−206); Warring-States Qin (Changping −260, Handan −259) is left null rather than stretching the dynasty polygon back 40 years.
9. Labels that are both an HBM belligerent artefact and a polity name ("Massacre", "Various") were left alone; cleaning them is audit item H2, not part of the join.

## 5. Files

- `data/conflicts.json` — 7,318 records gained `polityIds`; nothing else changed (diff has additions only).
- `scripts/data/polity_aliases.json` — +432 entries, `empires` key on 589; r14 values intact.
- `scripts/data/polity_families.json` — 48 ordered slice lists + the override note.
- `scripts/data/polity_join_report.json` — summary + 4,459 labels.
- `scripts/r15_polity_join.py`, `scripts/validate-conflicts.mjs` (polityIds check), `tests/data.test.ts` (two new tests).
