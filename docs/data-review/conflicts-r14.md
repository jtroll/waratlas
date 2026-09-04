# Conflicts dataset — review round 14 (data-defect pass)

Scope: `public/conflicts.json` only. Applied by `scripts/conflicts_r14_fix.py` from the tables under `scripts/data/`; verified by `scripts/validate-conflicts.mjs`. Companion review list (judgment calls, NOT applied): `duplicate-clusters-r14.md`.

## Headline numbers

| Metric | Before | After |
|---|---|---|
| Records | 10,585 | 10,886 |
| `partOf` references | 8,300 | 8,296 |
| … resolving to an existing id **or name** (old UI rule) | 2,606 (31.4 %) | — |
| … resolving to an existing **id** | 245 (3.0 %) | 7,983 (96.2 %) |
| Unresolved `partOf` strings (kept verbatim, listed in `scripts/data/parent_unresolved.json`) | 1,511 strings / 5,694 refs | 272 strings / 315 refs |
| Stub parent wars created | — | 331 |
| Records merged (exact duplicates) | — | 27 |
| Records deleted (container/notes records) | — | 3 |
| Casualty headline/range changes | — | 55 |
| Importance changes (casualty floor) | — | 36 |
| Coordinate fixes | — | 17 |
| `Draw` belligerents removed | 178 | 177 records cleaned, 0 left |
| `wikiLink` fields | 126 | 0 (copied to `wikipediaUrl` in 126) |

Validator output on the delivered file:

```
records: 10886; partOf refs: 8296; resolved to ids: 7983 (96.2%); listed-unresolved strings: 272
OK: conflicts.json passes all checks
```

## 1. `partOf` resolution

Every `partOf` entry is now either an existing record id or a raw string listed in `parent_unresolved.json`. Resolution order per reference: alias table (`scripts/data/parent_aliases.json`, with era/bbox rules) → exact id → exact name → normalised name (case, apostrophes, ordinals, British/Anglo, Turkish/Ottoman, plural/singular…) → fuzzy match (difflib ≥ 0.88, typo variants such as "5th Coaliton"). Every candidate must span the child's dates ±1 year; if none does, the string is kept verbatim and counted as unresolved.

| How resolved | References |
|---|---|
| alias table (incl. era rules and stubs) | 5,162 |
| exact name match | 1,949 |
| normalised name match | 588 |
| fuzzy match | 39 |
| already an id | 230 |
| reassigned by date-fix table | 7 |
| dropped (not part of the named war / self-reference) | 15 |
| still unresolved | 315 |

Unresolved by kind: 206 references have no plausible parent record at all (mostly singleton Jaques labels such as "Turkish-Druze War"); 109 name a war that exists but whose dates do not contain the battle (source-side attribution errors, e.g. a 1866 battle labelled "Seven Years War"). Top remaining strings:

| Refs | String |
|---|---|
| 5 | Civil War |
| 3 | War of Independence |
| 3 | Seven Years War |
| 2 | russo-ukrainian-war |
| 2 | Bohemian Wars |
| 2 | Turkish-Druze War |
| 2 | Swiss-Milanese War |
| 2 | Peruvian Civil Wars |
| 2 | Russia's Volga Wars |
| 2 | Thai-Malacca War |
| 2 | Ecuadorian Civil War |
| 2 | War of the American Revolution |
| 2 | Danish War of Succession |
| 2 | Frankish Imperial Wars |
| 2 | Ottoman Civil Wars |
| 2 | Later Byzantine Military Rebellions |
| 2 | Huntly Rebellion |
| 2 | Turkish Imperial Wars |
| 2 | Arcadian War |
| 2 | Norman Conquest of Britain |
| 2 | Later Syrian-Parthian War |
| 2 | French Conquest of Quebec |
| 2 | Afghan Civil Wars |
| 2 | War against Malabar Pirates |
| 2 | Sino-Vietnamese Wars |

### Stub parent wars created

331 parent records were created for Jaques/HCED war labels that had no curated record (definitions in `scripts/data/parent_stubs.json`: modern English name, dates from the standard chronology, one-sentence description, Wikipedia link where the article title is certain, coordinates = centroid of the child battles, countries = top-6 belligerents of the children, `sources: [{label: "Derived from HCED child battles; see Wikipedia"}]`, importance 3 or 4 for ≥40 children / well-known wars, 2 for minor wars). Only stubs that actually received children were created.

| id | name | years | children |
|---|---|---|---|
| `war-of-the-first-coalition` | War of the First Coalition | 1792-1797 | 155 |
| `wars-of-the-three-kingdoms` | Wars of the Three Kingdoms | 1639-1653 | 81 |
| `war-of-the-second-coalition` | War of the Second Coalition | 1798-1802 | 64 |
| `central-american-wars-19th` | Central American national wars (1823–1907) | 1823-1907 | 49 |
| `crusader-states-wars` | Wars of the Crusader states | 1099-1291 | 39 |
| `first-carlist-war` | First Carlist War | 1833-1840 | 37 |
| `anglo-saxon-heptarchy-wars` | Wars of the Anglo-Saxon kingdoms | 550-829 | 28 |
| `first-war-of-scottish-independence` | First War of Scottish Independence | 1296-1328 | 28 |
| `franco-dutch-war` | Franco-Dutch War | 1672-1678 | 27 |
| `war-of-the-fifth-coalition` | War of the Fifth Coalition | 1809-1809 | 24 |
| `irish-rebellion-of-1798` | Irish Rebellion of 1798 | 1798-1798 | 23 |
| `conquests-of-genghis-khan` | Conquests of Genghis Khan | 1203-1227 | 23 |
| `mughal-sikh-wars` | Mughal–Sikh wars | 1621-1716 | 23 |
| `early-medieval-indian-dynastic-wars` | Early medieval Indian dynastic wars | 600-1200 | 23 |
| `byzantine-sasanian-wars` | Byzantine–Sasanian wars | 502-628 | 21 |
| `ottoman-hungarian-wars-1366` | Ottoman–Hungarian wars (1366–1526) | 1366-1526 | 21 |
| `mughal-wars-of-succession` | Mughal wars of succession | 1556-1748 | 20 |
| `second-northern-war` | Second Northern War | 1655-1660 | 19 |
| `anglo-saxon-settlement-of-britain` | Anglo-Saxon conquest of Britain | 449-660 | 19 |
| `roman-gallic-wars` | Roman–Gallic wars | -390--50 | 19 |
| `crisis-of-the-third-century` | Crisis of the Third Century | 235-285 | 19 |
| `portuguese-colonial-wars-in-asia` | Portuguese colonial wars in Asia | 1500-1663 | 19 |
| `war-in-the-vendee` | War in the Vendée | 1793-1796 | 17 |
| `third-carlist-war` | Third Carlist War | 1872-1876 | 17 |
| `first-italian-war-of-independence` | First Italian War of Independence | 1848-1849 | 17 |
| `colombian-civil-wars-19th` | Colombian civil wars of the 19th century | 1823-1902 | 17 |
| `sicilian-wars` | Sicilian Wars (Greek–Punic) | -580--265 | 17 |
| `ahmad-shah-durrani-campaigns` | Ahmad Shah Durrani's campaigns | 1747-1767 | 17 |
| `second-italian-war-of-independence` | Second Italian War of Independence | 1859-1860 | 16 |
| `persian-succession-wars-1747` | Persian wars of succession after Nader Shah | 1747-1796 | 14 |
| `saudi-rashidi-wars` | Unification of Saudi Arabia | 1887-1932 | 14 |
| `scanian-war` | Scanian War | 1675-1679 | 13 |
| `roman-sasanian-wars` | Roman–Sasanian wars | 224-363 | 12 |
| `hotaki-safavid-wars` | Hotaki–Safavid wars | 1709-1738 | 12 |
| `wars-of-the-second-triumvirate` | Wars of the Second Triumvirate | -44--30 | 12 |
| `kosciuszko-uprising` | Kościuszko Uprising | 1794-1794 | 12 |
| `republic-of-texas-conflicts` | Republic of Texas frontier conflicts | 1836-1845 | 12 |
| `spring-and-autumn-period-wars` | Wars of the Spring and Autumn period | -770--476 | 11 |
| `wars-in-lombardy` | Wars in Lombardy | 1423-1454 | 11 |
| `austro-russian-turkish-war-1735` | Austro-Russian–Turkish War (1735–1739) | 1735-1739 | 11 |
| `eastern-islamic-dynastic-wars` | Eastern Islamic dynastic wars (990–1120) | 990-1120 | 11 |
| `mughal-uzbek-wars` | Mughal–Uzbek wars | 1500-1647 | 11 |
| `franco-spanish-war-1635` | Franco-Spanish War (1635–1659) | 1635-1659 | 11 |
| `filibuster-war` | Filibuster War | 1855-1857 | 11 |
| `anglo-welsh-wars` | Anglo-Welsh wars | 1032-1295 | 11 |
| `mexican-civil-wars-1823` | Mexican civil wars of the early republic | 1823-1846 | 11 |
| `russo-swedish-war-1788` | Russo-Swedish War (1788–1790) | 1788-1790 | 11 |
| `civil-wars-of-the-tetrarchy` | Civil wars of the Tetrarchy | 306-324 | 10 |
| `caucasian-war` | Caucasian War | 1817-1864 | 10 |
| `sixteen-kingdoms-wars` | Wars of the Sixteen Kingdoms | 304-439 | 10 |
| `seljuk-empire-wars` | Wars of the Seljuk Empire | 1037-1194 | 10 |
| `war-of-the-league-of-cambrai` | War of the League of Cambrai | 1508-1516 | 10 |
| `afghan-sikh-wars` | Afghan–Sikh wars | 1748-1837 | 10 |
| `finnish-war` | Finnish War | 1808-1809 | 9 |
| `second-anglo-dutch-war` | Second Anglo-Dutch War | 1665-1667 | 9 |
| `herero-wars` | Herero Wars | 1904-1908 | 9 |
| `byzantine-ottoman-wars` | Byzantine–Ottoman wars | 1265-1453 | 9 |
| `kievan-rus-succession-wars` | Kievan Rus' wars of succession | 1015-1113 | 9 |
| `northern-seven-years-war` | Northern Seven Years' War | 1563-1570 | 9 |
| `austro-turkish-war-1716` | Austro-Turkish War (1716–1718) | 1716-1718 | 9 |
| `north-west-rebellion` | North-West Rebellion | 1885-1885 | 9 |
| `byzantine-norman-wars` | Byzantine–Norman wars | 1081-1185 | 9 |
| `anglo-nepalese-war` | Anglo-Nepalese War | 1814-1816 | 9 |
| `maratha-bijapur-wars` | Maratha–Bijapur wars | 1648-1677 | 9 |
| `russo-turkish-war-1877` | Russo-Turkish War (1877–1878) | 1877-1878 | 9 |
| `first-anglo-dutch-war` | First Anglo-Dutch War | 1652-1654 | 8 |
| `ottoman-persian-wars` | Ottoman–Persian wars | 1514-1823 | 8 |
| `fall-of-the-western-roman-empire` | Fall of the Western Roman Empire | 395-486 | 8 |
| `afghan-war-of-succession-1863` | Afghan war of succession (1863–1869) | 1863-1869 | 8 |
| `maccabean-revolt` | Maccabean Revolt | -167--160 | 8 |
| `transylvanian-wallachian-wars-1575` | Transylvanian and Wallachian wars (1575–1611) | 1575-1611 | 8 |
| `anglo-norman-succession-wars` | Anglo-Norman succession wars | 1077-1128 | 8 |
| `rus-golden-horde-wars` | Rus'–Golden Horde wars | 1362-1480 | 8 |
| `burgundian-state-wars` | Wars of the Burgundian State | 1453-1482 | 8 |
| `nicaean-latin-wars` | Nicaean–Latin wars | 1204-1264 | 8 |
| `williamite-war-in-ireland` | Williamite War in Ireland | 1689-1691 | 8 |
| `polish-ottoman-war-1672` | Polish–Ottoman War (1672–1676) | 1672-1676 | 7 |
| `second-bulgarian-empire-wars` | Wars of the Second Bulgarian Empire | 1185-1396 | 7 |
| `medieval-german-civil-wars` | Medieval German civil wars (1018–1141) | 1018-1141 | 7 |
| `east-frankish-ottonian-wars` | Wars of East Francia and the Ottonians | 900-1002 | 7 |
| `neo-assyrian-wars` | Wars of the Neo-Assyrian Empire | -911--609 | 7 |
| `first-serbian-uprising` | First Serbian Uprising | 1804-1813 | 7 |
| `swabian-war` | Swabian War | 1499-1499 | 7 |
| `war-of-the-quadruple-alliance` | War of the Quadruple Alliance | 1718-1720 | 7 |
| `corinthian-war` | Corinthian War | -395--387 | 7 |
| `delhi-sultanate-wars` | Wars of the Delhi Sultanate | 1206-1526 | 7 |
| `peruvian-conquistador-civil-wars` | Civil wars of the conquistadors in Peru | 1537-1554 | 7 |
| `first-schleswig-war` | First Schleswig War | 1848-1851 | 7 |
| `scottish-clan-wars` | Scottish clan wars | 1370-1680 | 7 |
| `early-scottish-dynastic-wars` | Early Scottish dynastic wars | 843-1130 | 7 |
| `muscovite-lithuanian-wars` | Muscovite–Lithuanian Wars | 1487-1537 | 7 |
| `second-war-of-scottish-independence` | Second War of Scottish Independence | 1332-1357 | 6 |
| `campaigns-of-muhammad` | Military campaigns of Muhammad | 622-632 | 6 |
| `cossack-uprisings` | Cossack uprisings against Poland–Lithuania | 1591-1638 | 6 |
| `roman-conquest-of-britain` | Roman conquest of Britain | 43-84 | 6 |
| `roman-alemannic-wars` | Roman–Alemannic wars | 213-378 | 6 |
| `roman-etruscan-wars` | Roman–Etruscan Wars | -509--264 | 6 |
| `greco-turkish-war-1897` | Greco-Turkish War (1897) | 1897-1897 | 6 |
| `time-of-troubles` | Time of Troubles | 1598-1618 | 6 |
| `franco-flemish-wars` | Franco-Flemish wars (1297–1328) | 1297-1328 | 6 |
| `avar-byzantine-wars` | Avar–Byzantine wars | 568-626 | 6 |
| `mughal-safavid-wars` | Mughal–Safavid wars | 1558-1653 | 6 |
| `safavid-uzbek-wars` | Safavid–Uzbek wars | 1502-1740 | 6 |
| `barbary-corsair-wars` | Barbary corsair wars | 1600-1830 | 6 |
| `nine-years-war-ireland` | Nine Years' War (Ireland) | 1593-1603 | 6 |
| `iraqi-revolt-of-1920` | Iraqi revolt of 1920 | 1920-1920 | 6 |
| `late-viking-age-scandinavian-wars` | Scandinavian wars of the late Viking Age | 985-1030 | 6 |
| `polish-crimean-tatar-wars` | Polish–Crimean Tatar wars | 1482-1699 | 6 |
| `early-islamic-civil-wars` | Early Islamic civil wars | 632-763 | 5 |
| `third-italian-war-of-independence` | Third Italian War of Independence | 1866-1866 | 5 |
| `japanese-invasion-of-manchuria` | Japanese invasion of Manchuria | 1931-1933 | 5 |
| `late-roman-civil-wars-337` | Late Roman civil wars (337–394) | 337-394 | 5 |
| `durrani-succession-wars` | Durrani wars of succession | 1793-1834 | 5 |
| `russo-persian-war-1826` | Russo-Persian War (1826–1828) | 1826-1828 | 5 |
| `roman-vandal-wars-455` | Roman–Vandal wars (455–468) | 455-468 | 5 |
| `theban-spartan-war` | Theban–Spartan War | -378--362 | 5 |
| `second-samnite-war` | Second Samnite War | -326--304 | 5 |
| `attila-balkan-campaigns` | Attila's Balkan campaigns | 441-447 | 5 |
| `huguenot-rebellions` | Huguenot rebellions | 1621-1629 | 5 |
| `lordship-of-the-isles-rebellions` | Lordship of the Isles rebellions | 1411-1493 | 5 |
| `frankish-burgundian-wars` | Frankish–Burgundian wars | 500-534 | 5 |
| `revolution-of-tuxtepec` | Revolution of Tuxtepec | 1876-1876 | 5 |
| `second-fitna` | Second Fitna | 680-692 | 5 |
| `rebellions-of-1837` | Rebellions of 1837–1838 | 1837-1838 | 5 |
| `venezuelan-civil-wars-1892` | Venezuelan civil wars (1892–1903) | 1892-1903 | 5 |
| `war-against-nabis` | Spartan–Achaean wars (207–192 BC) | -207--192 | 5 |
| `voortrekker-zulu-war` | Voortrekker–Zulu war | 1838-1840 | 5 |
| `year-of-the-five-emperors` | Year of the Five Emperors | 193-197 | 4 |
| `first-peloponnesian-war` | First Peloponnesian War | -460--445 | 4 |
| `eastern-han-wars` | Wars of the Eastern Han dynasty | 25-220 | 4 |
| `bar-confederation` | Bar Confederation | 1768-1772 | 4 |
| `serbian-ottoman-war-1876` | Serbian–Ottoman Wars (1876–1878) | 1876-1878 | 4 |
| `mongol-invasions-of-india` | Mongol invasions of India | 1221-1327 | 4 |
| `third-sacred-war` | Third Sacred War | -356--346 | 4 |
| `transition-from-sui-to-tang` | Transition from Sui to Tang | 617-628 | 4 |
| `safavid-aq-qoyunlu-wars` | Safavid–Aq Qoyunlu wars | 1488-1513 | 4 |
| `dominican-war-of-independence` | Dominican War of Independence | 1844-1856 | 4 |
| `estonian-war-of-independence` | Estonian War of Independence | 1918-1920 | 4 |
| `montenegrin-ottoman-wars-1852` | Montenegrin–Ottoman wars (1852–1862) | 1852-1862 | 4 |
| `chitral-expedition` | Chitral Expedition | 1895-1895 | 4 |
| `waziristan-campaign-1919` | Waziristan campaign (1919–1920) | 1919-1920 | 4 |
| `persian-gulf-campaign-1809` | Persian Gulf campaigns (1809–1821) | 1809-1821 | 4 |
| `cayuse-war` | Cayuse War | 1847-1855 | 4 |
| `ostrogothic-conquest-of-italy` | Ostrogothic conquest of Italy | 488-493 | 4 |
| `anglo-spanish-war-1654` | Anglo-Spanish War (1654–1660) | 1654-1660 | 4 |
| `liberal-wars` | Liberal Wars | 1828-1834 | 4 |
| `the-fronde` | Fronde | 1648-1653 | 4 |
| `genko-war` | Genkō War | 1331-1333 | 4 |
| `holy-roman-empire-throne-wars-1298` | Holy Roman Empire throne wars (1298–1322) | 1298-1322 | 4 |
| `transylvanian-war-1658` | Transylvanian war of 1658–1662 | 1658-1662 | 4 |
| `shane-oneills-rebellion` | Shane O'Neill's rebellion | 1558-1567 | 4 |
| `marian-civil-war` | Marian civil war | 1567-1573 | 4 |
| `henry-morgan-raids` | Henry Morgan's raids | 1667-1671 | 4 |
| `frederick-barbarossa-italian-campaigns` | Frederick Barbarossa's Italian campaigns | 1154-1183 | 4 |
| `kandyan-wars` | Kandyan Wars | 1803-1818 | 4 |
| `year-of-the-four-emperors` | Year of the Four Emperors | 69-69 | 3 |
| `western-han-wars` | Wars of the Western Han dynasty | -206-9 | 3 |
| `russo-persian-war-1804` | Russo-Persian War (1804–1813) | 1804-1813 | 3 |
| `anglo-norman-invasion-of-ireland` | Anglo-Norman invasion of Ireland | 1169-1175 | 3 |
| `william-of-normandy-consolidation` | William of Normandy's consolidation wars | 1047-1060 | 3 |
| `hungarian-invasions-of-europe` | Hungarian invasions of Europe | 899-970 | 3 |
| `serbian-empire-wars` | Wars of Stefan Dušan | 1331-1355 | 3 |
| `lamian-war` | Lamian War | -323--322 | 3 |
| `cleomenean-war` | Cleomenean War | -229--222 | 3 |
| `early-imperial-germanic-wars` | Early imperial campaigns in Germania | -12-16 | 3 |
| `third-samnite-war` | Third Samnite War | -298--290 | 3 |
| `roman-seleucid-war` | Roman–Seleucid war | -192--188 | 3 |
| `richard-i-war-with-philip-ii` | Richard I's war with Philip II | 1194-1199 | 3 |
| `pugachev-rebellion` | Pugachev's Rebellion | 1773-1775 | 3 |
| `burgundian-wars` | Burgundian Wars | 1474-1477 | 3 |
| `kalmar-war` | Kalmar War | 1611-1613 | 3 |
| `swiss-peasant-war-of-1653` | Swiss peasant war of 1653 | 1653-1653 | 3 |
| `prayer-book-rebellion` | Prayer Book Rebellion | 1549-1549 | 3 |
| `covenanter-risings` | Covenanter risings | 1666-1679 | 3 |
| `frankish-civil-war-715` | Frankish civil war (715–718) | 715-718 | 3 |
| `hungarian-romanian-war` | Hungarian–Romanian War | 1918-1919 | 3 |
| `conquest-of-sindh` | Conquest of Sindh | 1843-1843 | 3 |
| `ridda-wars` | Ridda Wars | 632-633 | 3 |
| `gothic-war-376` | Gothic War (376–382) | 376-382 | 3 |
| `appenzell-wars` | Appenzell Wars | 1401-1429 | 3 |
| `ingrian-war` | Ingrian War | 1610-1617 | 3 |
| `aragonese-conquest-of-naples` | Aragonese conquest of Naples | 1435-1465 | 3 |
| `douglas-rebellion-1452` | Black Douglas rebellion | 1452-1455 | 3 |
| `anglo-scottish-border-wars-1093` | Anglo-Scottish border wars (1093–1157) | 1093-1157 | 3 |
| `social-war-357` | Social War (357–355 BC) | -357--355 | 3 |
| `swedish-succession-wars-12th` | Swedish wars of succession (1130–1250) | 1130-1250 | 3 |
| `seleucid-attalid-wars` | Seleucid–Attalid wars | -263--189 | 3 |
| `anglo-portuguese-conflicts-in-asia` | Anglo-Portuguese conflicts in the Indian Ocean | 1612-1622 | 3 |
| `bulavin-rebellion` | Bulavin Rebellion | 1707-1708 | 3 |
| `mentana-campaign` | Garibaldi's march on Rome (1867) | 1867-1867 | 3 |
| `drakes-great-expedition` | Drake's Great Expedition (1585–1586) | 1585-1586 | 3 |
| `viking-raids-in-germany` | Viking raids on East Francia | 880-891 | 3 |
| `bardas-rebellions` | Rebellions of Bardas Skleros and Bardas Phokas | 976-989 | 3 |
| `florentine-milanese-wars` | Florentine–Milanese wars | 1351-1402 | 3 |
| `german-polish-wars-medieval` | German–Polish wars (972–1109) | 972-1109 | 3 |
| `bishops-wars` | Bishops' Wars | 1639-1640 | 3 |
| `desmond-rebellions` | Desmond Rebellions | 1569-1583 | 3 |
| `philistine-israelite-wars` | Philistine–Israelite wars | -1050--1000 | 3 |
| `toggenburg-war` | Toggenburg War | 1712-1712 | 3 |
| `cimbrian-war` | Cimbrian War | -113--101 | 2 |
| `polish-russian-war-of-1792` | Polish–Russian War of 1792 | 1792-1792 | 2 |
| `austro-turkish-war-1663` | Austro-Turkish War (1663–1664) | 1663-1664 | 2 |
| `revolt-of-1173` | Revolt of 1173–1174 | 1173-1174 | 2 |
| `serbo-bulgarian-war` | Serbo-Bulgarian War | 1885-1885 | 2 |
| `chremonidean-war` | Chremonidean War | -267--261 | 2 |
| `caesars-invasions-of-britain` | Caesar's invasions of Britain | -55--54 | 2 |
| `medo-babylonian-conquest-of-assyria` | Medo-Babylonian conquest of Assyria | -626--609 | 2 |
| `tang-military-campaigns` | Tang dynasty military campaigns | 618-907 | 2 |
| `war-of-canudos` | War of Canudos | 1896-1897 | 2 |
| `glyndwr-rising` | Glyndŵr rebellion | 1400-1415 | 2 |
| `thirteen-years-war-1454` | Thirteen Years' War (1454–1466) | 1454-1466 | 2 |
| `monmouth-rebellion` | Monmouth Rebellion | 1685-1685 | 2 |
| `latvian-war-of-independence` | Latvian War of Independence | 1918-1920 | 2 |
| `russo-kazan-wars` | Russo-Kazan Wars | 1437-1552 | 2 |
| `jebel-akhdar-war` | Jebel Akhdar War | 1954-1959 | 2 |
| `gwalior-campaign` | Gwalior campaign | 1843-1843 | 2 |
| `third-fitna` | Third Fitna | 744-750 | 2 |
| `ikhwan-revolt` | Ikhwan revolt | 1927-1930 | 2 |
| `afghan-civil-war-1928` | Afghan Civil War (1928–1929) | 1928-1929 | 2 |
| `afghan-civil-war-1989` | Afghan Civil War (1989–1992) | 1989-1992 | 2 |
| `afghan-civil-war-1992` | Afghan Civil War (1992–1996) | 1992-1996 | 2 |
| `wars-of-kappel` | Wars of Kappel | 1529-1531 | 2 |
| `chilean-revolution-of-1859` | Chilean Revolution of 1859 | 1859-1859 | 2 |
| `chilean-revolution-of-1851` | Chilean Revolution of 1851 | 1851-1851 | 2 |
| `chilean-civil-war-of-1829` | Chilean Civil War of 1829–1830 | 1829-1830 | 2 |
| `danish-hanseatic-war-1361` | Danish–Hanseatic War (1361–1370) | 1361-1370 | 2 |
| `danzig-rebellion` | Danzig rebellion | 1577-1577 | 2 |
| `ottoman-aq-qoyunlu-war` | Ottoman–Aq Qoyunlu war (1472–1473) | 1472-1473 | 2 |
| `dummers-war` | Dummer's War | 1722-1725 | 2 |
| `ghurid-ghaznavid-wars` | Ghurid–Ghaznavid wars | 1148-1186 | 2 |
| `sikkim-expedition` | Sikkim expedition | 1888-1888 | 2 |
| `zebrzydowski-rebellion` | Zebrzydowski rebellion | 1606-1608 | 2 |
| `anti-qin-rebellions` | Rebellions against the Qin dynasty | -209--206 | 2 |
| `sino-russian-border-conflicts` | Sino-Russian border conflicts (1652–1689) | 1652-1689 | 2 |
| `uruguayan-revolution-of-1904` | Uruguayan Revolution of 1904 | 1904-1904 | 2 |
| `italian-revolutions-of-1820` | Italian revolutions of 1820–1821 | 1820-1821 | 2 |
| `first-war-of-villmergen` | First War of Villmergen | 1656-1656 | 2 |
| `domitians-dacian-war` | Domitian's Dacian War | 86-88 | 2 |
| `wyatts-rebellion` | Wyatt's rebellion | 1554-1554 | 2 |
| `first-servile-war` | First Servile War | -135--132 | 2 |
| `illyrian-wars` | Illyrian Wars | -229--168 | 2 |
| `achaean-war` | Achaean War | -146--146 | 2 |
| `frankish-visigothic-war-507` | Frankish–Visigothic war (507–508) | 507-508 | 2 |
| `sviatoslavs-invasion-of-bulgaria` | Sviatoslav's invasion of Bulgaria | 967-971 | 2 |
| `counts-feud` | Count's Feud | 1534-1536 | 2 |
| `rakoczis-war-of-independence` | Rákóczi's War of Independence | 1703-1711 | 2 |
| `hungarian-czechoslovak-war` | Hungarian–Czechoslovak War | 1919-1919 | 2 |
| `polish-moldavian-war-1531` | Polish–Moldavian War (1530–1531) | 1530-1531 | 2 |
| `russo-crimean-wars` | Russo-Crimean Wars (1571–1572) | 1571-1572 | 2 |
| `persian-invasion-of-georgia-1795` | Persian invasion of Georgia (1795) | 1795-1795 | 2 |
| `kuwait-najd-war` | Kuwait–Najd War | 1919-1920 | 2 |
| `johei-tengyo-rebellions` | Jōhei and Tengyō rebellions | 935-941 | 2 |
| `reapers-war` | Reapers' War | 1640-1659 | 2 |
| `paiute-war` | Paiute War | 1860-1860 | 2 |
| `jack-cades-rebellion` | Jack Cade's Rebellion | 1450-1450 | 2 |
| `ketts-rebellion` | Kett's Rebellion | 1549-1549 | 2 |
| `bruce-campaign-in-ireland` | Bruce campaign in Ireland | 1315-1318 | 2 |
| `percy-rebellions` | Percy rebellions | 1403-1408 | 2 |
| `corinthian-corcyrean-war` | Corinthian–Corcyraean War | -435--433 | 2 |
| `babylonian-campaigns-levant` | Neo-Babylonian campaigns in the Levant | -605--582 | 2 |
| `catalan-company-campaigns` | Campaigns of the Catalan Company | 1303-1311 | 2 |
| `flemish-succession-war-1127` | War of the Flemish succession (1127–1128) | 1127-1128 | 2 |
| `italian-war-of-1542` | Italian War of 1542–1546 | 1542-1546 | 2 |
| `masaniello-revolt` | Revolt of Masaniello | 1647-1648 | 2 |
| `russo-ukrainian-war` | Russo-Ukrainian War (2014–present) | 2014-None | 2 |
| `austro-turkish-war-1788` | Austro-Turkish War (1788–1791) | 1788-1791 | 1 |
| `austro-hungarian-occupation-of-bosnia` | Austro-Hungarian occupation of Bosnia (1878) | 1878-1878 | 1 |
| `war-of-the-reunions` | War of the Reunions | 1683-1684 | 1 |
| `french-invasion-of-spain-1823` | French invasion of Spain (1823) | 1823-1823 | 1 |
| `kaidu-kublai-war` | Kaidu–Kublai war | 1268-1301 | 1 |
| `lithuanian-wars-of-independence` | Lithuanian Wars of Independence | 1918-1920 | 1 |
| `aden-expedition` | Aden Expedition | 1839-1839 | 1 |
| `carausian-revolt` | Carausian revolt | 286-296 | 1 |
| `anglo-spanish-war-1625` | Anglo-Spanish War (1625–1630) | 1625-1630 | 1 |
| `anglo-spanish-war-1727` | Anglo-Spanish War (1727–1729) | 1727-1729 | 1 |
| `russo-swedish-war-1656` | Russo-Swedish War (1656–1658) | 1656-1658 | 1 |
| `ottoman-invasion-of-otranto` | Ottoman invasion of Otranto | 1480-1481 | 1 |
| `easter-rising` | Easter Rising | 1916-1916 | 1 |
| `latin-war` | Latin War | -340--338 | 1 |
| `first-samnite-war` | First Samnite War | -343--341 | 1 |
| `cyrus-the-younger-revolt` | Revolt of Cyrus the Younger | -401--401 | 1 |
| `carolingian-civil-war` | Carolingian civil war (840–843) | 840-843 | 1 |
| `umayyad-conquest-of-sindh` | Umayyad conquest of Sindh | 711-714 | 1 |
| `nika-riots` | Nika riots | 532-532 | 1 |
| `alexandrian-crusade` | Alexandrian Crusade | 1365-1365 | 1 |
| `old-zurich-war` | Old Zürich War | 1440-1446 | 1 |
| `gugler-war` | Gugler War | 1375-1375 | 1 |
| `mad-war` | Mad War | 1485-1488 | 1 |
| `dozsa-rebellion` | Dózsa's peasant war | 1514-1514 | 1 |
| `pruth-river-campaign` | Pruth River Campaign | 1710-1711 | 1 |
| `russo-swedish-war-1741` | Russo-Swedish War (1741–1743) | 1741-1743 | 1 |
| `war-against-sigismund` | War against Sigismund | 1598-1599 | 1 |
| `dacke-war` | Dacke War | 1542-1543 | 1 |
| `war-of-the-polish-succession-1587` | War of the Polish Succession (1587–1588) | 1587-1588 | 1 |
| `lubomirski-rokosz` | Lubomirski's rokosz | 1665-1666 | 1 |
| `polish-czechoslovak-war` | Polish–Czechoslovak War | 1919-1919 | 1 |
| `muscovite-civil-war` | Muscovite Civil War | 1425-1453 | 1 |
| `razin-rebellion` | Razin's Rebellion | 1670-1671 | 1 |
| `panjdeh-incident` | Panjdeh incident | 1885-1885 | 1 |
| `rohilla-war` | Rohilla War | 1773-1774 | 1 |
| `franco-syrian-war` | Franco-Syrian War | 1920-1920 | 1 |
| `annexation-of-tibet` | Annexation of Tibet by China | 1950-1951 | 1 |
| `sino-soviet-conflict-1929` | Sino-Soviet conflict (1929) | 1929-1929 | 1 |
| `soviet-japanese-border-conflicts` | Soviet–Japanese border conflicts | 1932-1939 | 1 |
| `january-28-incident` | January 28 incident | 1932-1932 | 1 |
| `jin-liao-war` | Jin–Liao War | 1114-1125 | 1 |
| `hogen-rebellion` | Hōgen rebellion | 1156-1156 | 1 |
| `jokyu-war` | Jōkyū War | 1221-1221 | 1 |
| `shimonoseki-campaign` | Shimonoseki campaign | 1863-1864 | 1 |
| `war-of-the-castilian-succession` | War of the Castilian Succession | 1475-1479 | 1 |
| `castilian-civil-war` | Castilian Civil War | 1351-1369 | 1 |
| `war-of-the-three-sanchos` | War of the Three Sanchos | 1065-1067 | 1 |
| `revolt-of-the-comuneros` | Revolt of the Comuneros | 1520-1521 | 1 |
| `glorious-revolution-spain` | Glorious Revolution (Spain) | 1868-1868 | 1 |
| `spanish-reconquest-attempt-mexico-1829` | Spanish attempt to reconquer Mexico (1829) | 1829-1829 | 1 |
| `utah-war` | Utah War | 1857-1858 | 1 |
| `united-states-expedition-to-korea` | United States expedition to Korea | 1871-1871 | 1 |
| `fourth-anglo-dutch-war` | Fourth Anglo-Dutch War | 1780-1784 | 1 |
| `cornish-rebellion-of-1497` | Cornish rebellion of 1497 | 1497-1497 | 1 |
| `scottish-norwegian-war` | Scottish–Norwegian War | 1262-1266 | 1 |
| `despenser-war` | Despenser War | 1321-1322 | 1 |
| `eureka-rebellion` | Eureka Rebellion | 1854-1854 | 1 |
| `first-sacred-war` | First Sacred War | -595--585 | 1 |
| `fourth-sacred-war` | Fourth Sacred War | -339--338 | 1 |
| `portuguese-interregnum-war` | 1383–1385 Portuguese interregnum | 1383-1385 | 1 |
| `knights-revolt` | Knights' Revolt | 1522-1523 | 1 |
| `celali-rebellions` | Celali rebellions | 1590-1660 | 1 |
| `brabant-revolution` | Brabant Revolution | 1789-1790 | 1 |
| `djidjelli-expedition` | Djidjelli expedition | 1664-1664 | 1 |
| `persian-constitutional-revolution` | Persian Constitutional Revolution | 1905-1911 | 1 |
| `vellore-mutiny` | Vellore mutiny | 1806-1806 | 1 |

### Parent/child date fixes (the 137 out-of-range links)

All 137 pre-existing links whose child fell outside the parent by >1 year were resolved; the validator now reports 0. Curated date corrections:

| id | field | old → new | why |
|---|---|---|---|
| `persian-reconquest-of-egypt-artaxerxes-iii` | endYear | 351 → -332 | sign error; reconquest completed 343-332 BCE |
| `battle-of-freeman-s-farm` | startYear/endYear | 1776 → 1777 | First Battle of Saratoga was fought 19 Sep 1777 |
| `argentine-civil-wars` | startYear/endYear | 1829-1852 → 1814-1880 | Argentine Civil Wars ran 1814-1880 (Wikipedia); record said 1829-1852 |
| `chilean-independence-war` | startYear/endYear | 1810-1818 → 1810-1826 | Chilean War of Independence ended with the fall of Chiloé in 1826 |
| `maratha-mughal-wars` | startYear/endYear | 1670-1707 → 1657-1707 | Shivaji's first raids on Mughal territory began in 1657 |
| `norman-conquest-england` | startYear/endYear | 1066-1066 → 1066-1071 | conquest completed with the Harrying of the North and the fall of Ely (1071) |
| `anglo-scottish-wars` | startYear/endYear | 1296-1357 → 1296-1560 | Anglo-Scottish Wars ran from 1296 to the 1550s (Wikipedia scope); record ended 1357 |
| `trojan-war` | startYear/endYear | -1200--1194 → -1194--1184 | traditional dating; the fall of Troy is placed in 1184 BCE |
| `cuban-revolution` | startYear/endYear | 1956-1959 → 1953-1959 | the revolution is dated from the Moncada attack of 26 July 1953 |
| `axum-kingdom-expansion` | startYear/endYear | 100-350 → 100-700 | Aksumite wars continued into the 7th century (Himyar, Beja, Noba) |
| `axumite-invasions` | startYear/endYear | 520-570 → 518-570 | Kaleb's first Himyar expedition was in 518 |
| `boko-haram-insurgency-2009` | startYear/endYear | 2009-2024 → 2009-None | ongoing |
| `lake-chad-crisis` | startYear/endYear | 2009-2024 → 2009-None | ongoing |
| `southeast-asian-conflicts` | startYear/endYear | 600-1200 → 802-1200 | Khmer Empire founded 802; record previously started in 600 |
| `kalmar-union-wars` | startYear/endYear | 1397-1523 → 1389-1523 | the union was forged by the war of 1389 (Åsle/Falköping) |
| `guelph-ghibelline-wars` | startYear/endYear | 1115-1270 → 1115-1350 | Guelph-Ghibelline fighting in the Italian cities continued into the 14th century (Montecatini 1315, Altopascio 1325) |
| `anglo-dutch-wars` | startYear/endYear | 1652-1674 → 1652-1784 | the series comprises four wars, the last in 1780-1784 |
| `southeast-asian-conflicts` | startYear/endYear | 802-1200 → 802-1200 | era record trimmed to the parent war (see PARENT_DATE_FIXES) |

Links reassigned to the correct parent:

| child | old parent | new parent |
|---|---|---|
| `russo-ukrainian-war-2022` | `None` | `russo-ukrainian-war` |
| `ukraine-crimea-annexation` | `None` | `russo-ukrainian-war` |
| `battle-of-mbumbi` | `portuguese-njinga-wars` | `kongo-portuguese-war-of-1622` |
| `french-invasion-egypt` | `napoleonic-wars` | `french-revolution-wars` |
| `battle-of-dogali` | `italian-ethiopian-wars` | `italian-conquest-of-eritrea` |
| `battle-of-lugalo` | `maji-maji-rebellion` | `hehe-wars` |
| `battle-of-coatit` | `italian-conquest-of-eritrea` | `first-italo-ethiopian-war-1895` |
| `crimean-crisis` | `russo-ukrainian-war-2022` | `russo-ukrainian-war` |
| `donbas-war` | `russo-ukrainian-war-2022` | `russo-ukrainian-war` |

Links dropped (child is not part of the named war):

| child | parent | why |
|---|---|---|
| `aksumite-invasion-of-himyar-gdr` | axumite-invasions | child dates outside parent; not part of it |
| `songhai-mali-conflicts` | songhai-expansion | child dates outside parent; not part of it |
| `portuguese-conquest-of-angola` | kongo-portuguese-conflicts | child dates outside parent; not part of it |
| `portuguese-njinga-wars` | kongo-portuguese-conflicts | child dates outside parent; not part of it |
| `fanteasante-wars` | anglo-ashanti-wars | child dates outside parent; not part of it |
| `bornu-resistance-to-the-sokoto-jihad` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `bornusokoto-wars` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `kololo-migration` | mfecane | child dates outside parent; not part of it |
| `battle-of-adwa-style-defeat-sokotokebbi-war-argungu` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `anglo-sokoto-conquest-of-bida` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `anglo-sokoto-war` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `satiru-revolt` | sokoto-jihad-of-usman-dan-fodio | child dates outside parent; not part of it |
| `second-sino-japanese-war` | world-war-2 | child dates outside parent; not part of it |
| `ifni-war` | Ifni War | resolved to itself (string named the record's own war) |
| `south-kordofan-conflict` | sudanese-conflict-in-south-kordofan-and-blue-nile | child dates outside parent; not part of it |

HCED name-strings that matched a curated record of the wrong era (e.g. "Russo-Polish War" 1920 → the 1654-67 record) are now routed by era rules to the right war (`polish-soviet-war`, `ming-invasion-vietnam`, `colombian-civil-wars-19th` …); see `EXTRA_ALIASES` in the fix script.

## 2. Casualty headline / range changes

Unit is **deaths** (not killed + wounded). Every change: old → new headline, range, one-line justification.

| id | old | new | range | justification |
|---|---|---|---|---|
| `three-kingdoms-china` | 3,000,000 | 20,000,000 | 20,000,000-36,000,000 (unchanged) | headline was below its own range; set to the low bound and marked as sub-scope of three-kingdoms-war-184 |
| `three-kingdoms-wars` | 3,000,000 | 20,000,000 | 20,000,000-36,000,000 (unchanged) | headline was below its own range; set to the low bound and marked as sub-scope of three-kingdoms-war-184 |
| `battle-kadesh` | 16,000 | 10,000 | 5,000-15,000 (unchanged) | no reliable count; chariot battle deaths on both sides unlikely to exceed the 5-15k range |
| `persian-wars-greece` | 300,000 | 100,000 | 50,000-150,000 (unchanged) | Herodotean totals are inflated; 100k deaths across 490-479 BCE is the mid-range |
| `thermopylae-battle` | 7,000 | 4,000 | 30,000-100,000 -> 2,500-20,000 | range 30k-100k was nonsense (it was the Persian army size); headline = Greek dead |
| `first-punic-war` | 100,000 | 400,000 | 300,000-500,000 (unchanged) | headline below its range; naval disasters alone cost Rome >100k men; ~400k both sides |
| `punic-wars` | 700,000 | 1,200,000 | 1,000,000-2,000,000 (unchanged) | aggregate of the three wars (~400k + ~500k-1M + ~150k) sits inside the 1-2M range |
| `second-punic-war` | 300,000 | 500,000 | 500,000-1,000,000 (unchanged) | headline below range; Roman military dead ~300k plus Italian and Spanish civilian losses |
| `cannae-battle` | 80,000 | 55,000 | 20,000-70,000 -> 50,000-76,000 | range brought in line with the ancient sources; headline is the Livy-based estimate plus Carthaginian dead |
| `third-punic-war` | 250,000 | 150,000 | 100,000-200,000 (unchanged) | headline above range; Carthage's population was largely killed or enslaved but ~50k survived; 150k mid-range |
| `jewish-roman-wars` | 2,000,000 | 600,000 | 100,000-500,000 -> 300,000-1,700,000 | range widened to span modern and ancient figures; headline mid-range |
| `yellow-turban-rebellion` | 7,000,000 | 2,000,000 | 500,000-2,000,000 -> 500,000-7,000,000 | headline (7M) was the maximal claim; 2M is the usual middle estimate |
| `byzantine-arab-wars` | 2,000,000 | 1,000,000 | 500,000-1,500,000 (unchanged) | headline above range; aggregate over eight centuries is unknowable; set to range mid-point |
| `reconquista-iberia` | 500,000 | 1,000,000 | 1,000,000-2,000,000 (unchanged) | headline below range; set to the low bound |
| `mongol-invasion-china` | 10,000,000 | 20,000,000 | 30,000,000-60,000,000 -> 10,000,000-40,000,000 | the 30-60M range was the raw census differential; range and headline reduced |
| `mongol-conquest-song` | 3,000,000 | 15,000,000 | 15,000,000-35,000,000 (unchanged) | headline below range; set to low bound (sub-record of mongol-invasion-china) |
| `mongol-invasion-middle-east` | 5,000,000 | 2,000,000 | 300,000-2,000,000 -> 1,000,000-5,000,000 | range raised; headline reduced to 2M |
| `yuan-conquest-south-china` | 3,000,000 | 2,000,000 | 500,000-2,000,000 (unchanged) | headline above range; set to the high bound |
| `timurid-invasions` | 5,000,000 | 5,000,000 | 100,000-1,000,000 -> 1,000,000-17,000,000 | range raised to include the standard 17M figure; headline unchanged |
| `timurid-conquests` | 5,000,000 | 5,000,000 | 100,000-1,000,000 -> 1,000,000-17,000,000 | as timurid-invasions |
| `ottoman-conquest-constantinople` | 20,000 | 10,000 | 3,000-10,000 -> 5,000-20,000 | range raised; headline 10k |
| `sengoku-period` | 2,000,000 | 500,000 | 100,000-500,000 (unchanged) | headline above range; no reliable aggregate; set to high bound (duplicate of sengoku-period-japan, see review) |
| `sengoku-period-japan` | 1,000,000 | 500,000 | 100,000-500,000 (unchanged) | headline above range; set to high bound |
| `ottoman-hungarian-wars-16th` | 1,000,000 | 500,000 | 300,000-800,000 (unchanged) | headline above range; mid-range |
| `spanish-conquest-aztec-empire` | 240,000 | 240,000 | 3,000,000-5,000,000 -> 100,000-240,000 | record scoped to combat deaths so it no longer contradicts its range; duplicate of spanish-conquest-mexico (see review) |
| `korean-war-resistance-1592` | 1,000,000 | 500,000 | 100,000-500,000 -> 100,000-1,000,000 | range widened to the often-cited 1M; headline mid-range |
| `dutch-expansion-asia` | 1,000,000 | 300,000 | 50,000-300,000 (unchanged) | headline above range; set to high bound |
| `manchu-conquest-china` | 5,000,000 | 3,000,000 | 500,000-3,000,000 (unchanged) | headline above range; set to high bound (duplicate cluster with qing-conquest-ming/ming-qing-transition, see review) |
| `ming-qing-transition` | 2,500,000 | 2,000,000 | 500,000-2,000,000 (unchanged) | headline above range; set to high bound |
| `maratha-mughal-wars` | 1,000,000 | 500,000 | 100,000-500,000 (unchanged) | headline above range; set to high bound |
| `russo-turkish-wars` | 1,000,000 | 1,000,000 | 200,000-800,000 -> 500,000-1,500,000 | range raised so the 1M headline is inside it |
| `war-austrian-succession` | 300,000 | 500,000 | 400,000-800,000 (unchanged) | merged record: headline (300k) fell below the range (400-800k) inherited from war-of-austrian-succession; ~500k deaths is the usual estimate |
| `american-revolution` | 300,000 | 50,000 | 50,000-100,000 -> 37,000-70,000 | headline 300k was total casualties/impact, not deaths |
| `french-revolution-wars` | 2,000,000 | 1,500,000 | 500,000-1,500,000 (unchanged) | headline above range; set to high bound (includes the Vendée) |
| `napoleonic-wars-italian-campaigns` | 200,000 | 200,000 | 3,000,000-6,000,000 -> 100,000-300,000 | range had been copied from the whole Napoleonic Wars |
| `war-sixth-coalition` | 800,000 | 500,000 | 200,000-500,000 -> 300,000-800,000 | headline 800k double-counted the Russian campaign |
| `mfecane` | 500,000 | 1,000,000 | 1,000,000-2,000,000 (unchanged) | headline below range; 1-2M is the standard estimate; set to low bound |
| `second-anglo-afghan-war` | 30,000 | 30,000 | 50,000-150,000 -> 15,000-50,000 | range 50-150k was wrong |
| `eastern-front-wwi` | 5,000,000 | 6,000,000 | 7,000,000-12,000,000 -> 4,000,000-9,000,000 | range 7-12M was too high for deaths; headline raised to 6M |
| `gallipoli-campaign` | 250,000 | 130,000 | 300,000-500,000 -> 110,000-190,000 | headline and range had been casualties, not deaths |
| `anglo-afghan-war-1919` | 3,000 | 3,000 | 10,000-50,000 -> 2,000-5,000 | range 10-50k was wrong |
| `chinese-civil-war` | 3,000,000 | 8,000,000 | 7,000,000-20,000,000 (unchanged) | headline below range; 8M is a common mid estimate for 1927-49 (range 7-20M unchanged) |
| `barbarossa-operation` | 27,000,000 | 5,000,000 | 3,000,000-7,000,000 (unchanged) | headline 27M was the whole Soviet WWII death toll |
| `pacific-war` | 5,000,000 | 5,000,000 | 2,000,000-4,000,000 -> 4,000,000-8,000,000 | range 2-4M too low for a theatre that killed ~2.5M Japanese servicemen alone |
| `chinese-civil-war-main` | 3,000,000 | 6,000,000 | 6,000,000-18,000,000 (unchanged) | headline below range; set to low bound |
| `syrian-civil-war` | 600,000 | 600,000 | 300,000-500,000 -> 350,000-620,000 | range raised to current SOHR figure |
| `tigray-war-2020` | 600,000 | 400,000 | 100,000-500,000 -> 160,000-600,000 | range raised; headline mid-range |
| `india-pakistan-war-1971` | 3,000,000 | 12,000 | 8,000-15,000 | headline 3M was the Bangladesh genocide upper bound |
| `third-indo-pakistan-war` | 100,000 | 12,000 | 8,000-15,000 | as india-pakistan-war-1971 |
| `bangladesh-liberation-war` | 3,000,000 | 1,000,000 | 300,000-3,000,000 | headline moved from upper bound to central estimate |
| `bangladesh-genocide` | 3,000,000 | 1,000,000 | 300,000-3,000,000 | headline moved from upper bound to central estimate |
| `somme-offensive` | 2,000,000 | 310,000 | 300,000-350,000 | headline 2M was more than the total casualties; duplicate of battle-somme (see review) |
| `battle-somme` | 1,000,000 | 310,000 | 300,000-350,000 | headline 1M was total casualties incl. wounded |
| `verdun-offensive` | 1,000,000 | 305,000 | 300,000-330,000 | headline 1M was above total casualties; duplicate of battle-verdun (see review) |
| `battle-verdun` | 700,000 | 305,000 | 600,000-1,000,000 -> 300,000-330,000 | headline 700k was total casualties incl. wounded |

Not changed (flagged only): the unsourced round numbers on `jiedushi-rebellions` (5M), `portuguese-expansion-brazil` (5M), `american-frontier-wars` (5M), `french-huguenot-wars` (3M) and `yellow-turban-rebellion`'s companions have no range to reconcile against; they are listed for the Phase-4 casualty pass.

## 3. Duplicate merges (exact clusters only)

Rule: same normalised name and same start year (plus the explicitly verified pairs in the brief); the richer record is kept, `sources` unioned, max importance, the id referenced by more `partOf` entries survives, and `scripts/data/id_redirects.json` maps every removed id (also the 8 renamed ids and the 3 deleted records) to its successor.

| kept | removed | name | notes |
|---|---|---|---|
| `battle-somme` | `battle-of-somme` | Battle of the Somme | — |
| `war-spanish-succession` | `war-of-spanish-succession` | War of the Spanish Succession | coordinates from loser |
| `war-austrian-succession` | `war-of-austrian-succession` | War of the Austrian Succession | casualtyRange from war-of-austrian-succession |
| `croatian-war-independence` | `croatian-independence-war` | Croatian War of Independence | — |
| `battle-of-the-nile` | `battle-of-nile-1798` | Battle of the Nile | — |
| `hundred-regiments-offensive` | `battle-of-hundred-regiments-offensive` | Hundred Regiments Offensive | — |
| `first-opium-war` | `opium-war-first` | First Opium War | — |
| `opium-war-second` | `opium-war-second-2` | Second Opium War (Arrow War) | — |
| `barons-war-first` | `barons-war-first-2` | First Barons' War | — |
| `barons-war-second` | `barons-war-second-2` | Second Barons' War | — |
| `swedish-polish-war` | `swedish-polish-war-2` | Swedish-Polish Wars | — |
| `battle-of-talas` | `talas-battle-tang` | Battle of Talas | wikipediaUrl from talas-battle-tang; casualties from loser; importance max; description from loser |
| `battle-of-amgala-1976` | `battle-of-amgala` | Battle of Amgala (1976) | coordinates from loser |
| `battle-of-the-ogaden-1936` | `battle-of-ogaden` | Battle of the Ogaden (1936) | — |
| `ifni-war` | `battle-of-ifni` | Ifni War | — |
| `battle-of-cheriton` | `battle-of-alresford` | Battle of Cheriton | — |
| `battle-of-the-granicus` | `battle-of-granicus` | Battle of the Granicus | — |
| `battle-of-the-hydaspes` | `battle-of-hydaspes` | Battle of the Hydaspes | — |
| `battle-on-the-marchfeld` | `battle-of-marchfeld` | Battle on the Marchfeld | — |
| `battle-of-the-thames` | `battle-of-thames` | Battle of the Thames | — |
| `korean-invasions-toyotomi` | `korean-japanese-invasion` | Japanese Invasions of Korea | — |
| `aceh-rebellion-1976` | `insurgency-in-aceh` | Aceh Insurgency | — |
| `grenada-invasion` | `americas-grenada-invasion-1983` | Grenada Invasion | — |
| `rwandan-civil-war-1990` | `rwandan-genocide-and-civil-war` | Rwandan Civil War and Genocide | — |
| `nagorno-karabakh-war-2020` | `nagorno-karabakh-war-2020-2` | 2020 Nagorno-Karabakh War | importance max |
| `invasion-poland` | `battle-of-poland` | Invasion of Poland | — |
| `tunisian-campaign` | `battle-of-tunisia` | Tunisian Campaign | — |

Not merged although listed in the brief: `battle-of-brihuega` / `battle-of-villaviciosa` — two different battles (8 and 10 December 1710).

Deleted container/notes records (redirected):

- `united-nations-interventions-timeline` (United Nations Interventions - Timeline) → `nato-interventions`
- `hundred-years-war-individual-battles` (Hundred Years' War - Individual Battles) → `hundred-years-war`
- `korean-war-additional-operations` (Korean War - Additional operations) → `korean-war`

Three Kingdoms triplicate: `three-kingdoms-war-184` (184-280) kept as the umbrella; `three-kingdoms-china` and `three-kingdoms-wars` (220-280) are now its children with headline 20M (their own low bound) and an "overlapping estimates" note. Full recommendation in the duplicate review.

Renamed ids (redirected): `spanish-moorish-Granada` → `spanish-moorish-granada`, `americas-tupac-amaru-II-rebellion-1780` → `americas-tupac-amaru-ii-rebellion-1780`, `lê-mạc-wars-1533` → `le-mac-wars-1533`, `trịnh-nguyễn-wars-1627` → `trinh-nguyen-wars-1627`, `trịnh-nguyễn-wars-1627b` → `trinh-nguyen-wars-1627b`, `battle-of-tacan-a` → `battle-of-tacana`, `nanjing-massacre-context` → `nanjing-massacre`, `khauas-hottentot-uprising` → `khauas-nama-uprising`

## 4. Belligerents

The raw HCED file is not on disk and Harvard Dataverse is blocked by the egress policy (403 on CONNECT), so the Winner/Loser columns could not be re-derived. `"Draw"` was removed from `countries` in 177 records; where that left no belligerent the description now ends with "Outcome: indecisive." These 177 ids need belligerents filled from HCED when the file is available (list at the end of this document).

Anachronistic labels replaced by era (`scripts/data/belligerent_era_aliases.json`):

| replacement | records |
|---|---|
| Turkey -> Ottoman Empire | 63 |
| Germany -> Holy Roman Empire | 21 |
| United Kingdom -> England | 19 |
| Afghanistan -> Hotaki dynasty | 10 |
| Vietnam -> Đại Việt | 9 |
| Ireland -> Irish forces | 8 |
| Vietnam -> Nguyễn Vietnam | 7 |
| Mughal Empire -> Timurids (Babur) | 7 |
| Italy -> Italian states | 7 |
| Canada -> British North America | 7 |
| Serbia -> Serbian Empire | 6 |
| Serbia -> Serbian Despotate | 6 |
| Afghanistan -> Afghan tribes | 4 |
| Israel -> Kingdom of Israel | 3 |
| Vietnam -> Vietnamese rebels | 3 |
| Serbia -> Serbian insurgents | 3 |
| Afghanistan -> Ghaznavid Empire | 2 |
| Saudi Arabia -> Emirate of Nejd | 2 |
| Serbia -> Kingdom of Serbia (medieval) | 2 |
| Afghanistan -> Ghurid dynasty | 1 |
| Iraq -> Mesopotamian forces | 1 |

Era-independent polity canonicalisation applied (`scripts/data/polity_aliases.json`, `apply: true` entries only; the other ~200 variants are documented with era ranges for Phase 4):

| replacement | records |
|---|---|
| Byzantium -> Byzantine Empire | 137 |
| USSR -> Soviet Union | 96 |
| Britain -> United Kingdom | 26 |
| Sassanid Persia -> Sasanian Empire | 19 |
| USA -> United States | 8 |
| Sassanid Empire -> Sasanian Empire | 7 |
| Britain -> England | 6 |
| United States of America -> United States | 5 |
| Great Britain -> United Kingdom | 2 |
| British -> United Kingdom | 2 |
| United Kingdom and Commonwealth -> United Kingdom | 2 |
| Eastern Roman Empire -> Byzantine Empire | 2 |
| United States Army -> United States | 2 |
| Kingdom of Great Britain -> United Kingdom | 2 |
| British -> England | 1 |
| Soviet Russia -> Soviet Union | 1 |
| Sassanids -> Sasanian Empire | 1 |
| Byzantinum -> Byzantine Empire | 1 |

## 5. Coordinates and location labels

| id | old | new | why |
|---|---|---|---|
| `battle-of-freeman-s-farm` | [-178.0169, 8.1582] | [-73.63, 43.0] | was mid-Pacific; Freeman's Farm is at Saratoga NY |
| `battle-of-ututlan` | [91.1702, 14.7557] | [-91.17, 14.76] | longitude sign flip (Guatemala) |
| `battle-of-bahia` | [-33.9164, -14.3717] | [-38.51, -12.97] | was open Atlantic; Salvador da Bahia |
| `battle-of-kagera` | [24.5732, -3.7477] | [31.0, -1.0] | was DRC interior; Kagera salient |
| `battle-of-el-menabba` | [1.0441, 27.3051] | [-3.6, 31.95] | was in Algeria; El Menabba is by Boudenib, eastern Morocco |
| `battle-of-admin-box` | [91.546, 21.6471] | [92.3, 20.9] | was in Bangladesh; Ngakyedauk Pass |
| `battle-of-arakan` | [91.2925, 19.3941] | [93.0, 20.5] | was in the Bay of Bengal; Arakan coast |
| `battle-of-arakan-1943` | [91.2925, 19.3941] | [93.0, 20.5] | was in the Bay of Bengal; Arakan coast |
| `battle-of-arakan-1944` | [91.2925, 19.3941] | [93.0, 20.5] | was in the Bay of Bengal; Arakan coast |
| `battle-of-focchies` | [38.6736, 26.6198] | [26.75, 38.67] | lat/lon were swapped; Foça near Izmir |
| `battle-of-kuju` | [123.3111, 41.7733] | [125.24, 39.98] | was in Liaoning; Kusong, North Korea |
| `ottoman-conquest-northern-africa` | [35, 39] | [3.06, 36.75] | was central Anatolia; Algiers |
| `ottoman-conquest-yemen` | [35, 39] | [44.21, 15.37] | was central Anatolia; Sana'a |
| `wars-of-the-diadochi` | [35.0, 39.0] | [32.2, 38.8] | was central Anatolia; Ipsus area |
| `macedonian-conquest-alexander` | [40.0, 30.0] | [43.3, 36.6] | was Nefud desert; Gaugamela |
| `portuguese-expansion-africa` | [35.3395, -6.8276] | [34.85, -19.85] | was Tanzanian interior; Sofala/Mozambique coast |
| `dutch-portuguese-wars-1602` | [0.0, 0.0] | [102.25, 2.19] | was null island; Malacca |

Location labels corrected: `battle-of-cuzco-hills` ['Peru'] → ['Cuba'], `battle-of-lircay` ['Peru'] → ['Chile'], `battle-of-pucara` ['Cuba'] → ['Peru'], `battle-of-ap-bac` ['United States'] → ['Vietnam'], `battle-of-italica` ['Italy'] → ['Spain'], `battle-of-morval` ['United Kingdom'] → ['France'], `battle-of-chosin` ['South Korea'] → ['North Korea'], `battle-of-leh` ['Pakistan'] → ['India'], `battle-of-dundia-khera` ['Pakistan'] → ['India'], `battle-of-erestfer` ['Lithuania'] → ['Estonia'], `battle-of-hummelshof` ['Lithuania'] → ['Estonia'], `battle-of-jungfernhof` ['Lithuania'] → ['Latvia']

Point-in-country pass (shapely + Natural Earth 50m admin-0): 0 sign/swap fixes; 230 label/pin mismatches listed for review. Sign/swap corrections were only applied when the original point was >3° from the named country, so offshore naval battles (Glorious First of June, Flamborough Head, Makassar Strait…) were left alone; nothing else qualified. The 230 remaining label/pin mismatches are listed at the end for review (most are HCED `locations` labels naming the wrong modern country).

## 6. Importance floor (casualties ≥ 1M → ≥ 4; ≥ 3M → 5)

| id | name | casualties | old → new |
|---|---|---|---|
| `punic-wars` | Punic Wars | 1,200,000 | 2 → 4 |
| `xiongnu-han-wars` | Xiongnu-Han Wars | 1,000,000 | 3 → 4 |
| `wang-mang-rebellion` | Rebellion Against Wang Mang | 2,000,000 | 3 → 4 |
| `war-eight-princes` | War of the Eight Princes | 2,000,000 | 3 → 4 |
| `xiongnu-rebellion-jin` | Xiongnu Rebellion Against Jin | 2,000,000 | 3 → 4 |
| `fu-jian-northern-unification` | Fu Jian's Northern Unification | 1,000,000 | 3 → 4 |
| `southern-northern-dynasties` | Northern and Southern Dynasties Conflicts | 2,000,000 | 3 → 4 |
| `an-lushan-rebellion` | An Lushan Rebellion | 13,000,000 | 4 → 5 |
| `jiedushi-rebellions` | Jiedushi (Military Commissioner) Rebellions | 5,000,000 | 3 → 5 |
| `huang-chao-rebellion` | Huang Chao Rebellion | 2,000,000 | 3 → 4 |
| `vietnamese-cham-wars` | Cham–Vietnamese wars | 1,000,000 | 2 → 4 |
| `khorasan-conquest-genghis` | Mongol Conquest of Khorasan | 1,000,000 | 3 → 4 |
| `hulagu-conquest-persia` | Hulagu Khan's Conquest of Persia | 1,000,000 | 3 → 4 |
| `zhu-yuan-zhang-northern-expedition` | Zhu Yuanzhang's Northern Expedition | 1,000,000 | 3 → 4 |
| `timurid-invasions` | Timurid Invasions | 5,000,000 | 4 → 5 |
| `portuguese-spanish-colonial-rivalry` | Portuguese-Spanish Colonial Rivalry | 1,000,000 | 3 → 4 |
| `portuguese-expansion-brazil` | Portuguese Conquest of Brazil | 5,000,000 | 4 → 5 |
| `russian-pole-conflicts` | Russian-Polish Conflicts | 1,000,000 | 3 → 4 |
| `american-frontier-wars` | American Indian Wars | 5,000,000 | 4 → 5 |
| `burmese-siamese-wars` | Burmese–Siamese wars | 1,000,000 | 2 → 4 |
| `french-wars-of-religion` | French Wars of Religion | 4,000,000 | 4 → 5 |
| `mughal-conquest-deccan` | Mughal Conquest of Deccan | 1,000,000 | 3 → 4 |
| `manchu-conquest-china` | Manchu Conquest of China | 3,000,000 | 4 → 5 |
| `qing-conquest-ming` | Qing Conquest of Ming China | 5,000,000 | 4 → 5 |
| `qing-kangxi-wars` | Kangxi Emperor's Military Campaigns | 1,000,000 | 3 → 4 |
| `qing-western-expansion` | Qing Western Expansion Wars | 2,000,000 | 3 → 4 |
| `maratha-wars` | Maratha Wars (General) | 1,000,000 | 3 → 4 |
| `dzungar-qing-wars` | Dzungar-Qing Wars | 2,000,000 | 3 → 4 |
| `zunghar-qing-final-wars` | Dzungar-Qing Final Wars | 1,000,000 | 3 → 4 |
| `zulu-expansion-africa` | Zulu Expansion | 1,000,000 | 3 → 4 |
| `miao-rebellion` | Miao Rebellion | 1,000,000 | 3 → 4 |
| `dungan-revolt` | Dungan Revolt | 1,000,000 | 3 → 4 |
| `korean-war` | Korean War | 3,000,000 | 4 → 5 |
| `vietnam-war` | Vietnam War | 3,000,000 | 4 → 5 |
| `sudanese-civil-war` | Sudanese Civil War | 2,000,000 | 3 → 4 |
| `second-congo-war` | Second Congo War | 5,000,000 | 4 → 5 |

Skipped because the cluster primary already carries the rating: `three-kingdoms-wars` (→ `three-kingdoms-war-184`), `timurid-conquests` (→ `timurid-invasions`), `french-huguenot-wars` (→ `french-wars-of-religion`), `first-chinese-civil-war` (→ `chinese-civil-war`), `anti-japanese-invasion-war-china` (→ `second-sino-japanese-war`), `chinese-civil-war-main` (→ `chinese-civil-war`)

## 7. Small fixes

- `wikiLink` → `wikipediaUrl` copied in 126 records; the legacy key removed everywhere.
- Clodfelter source label normalised to one string in 47 records.
- `mahdist-war` description: truncated "See per-w…" text replaced
- `khauas-nama-uprising` name: replaced pejorative "Hottentot" with Nama
- `battle-of-tacana` name: mojibake "Tacan~a" -> Tacaná
- `nanjing-massacre` name/partOf: container-style id renamed; linked to the Second Sino-Japanese War
- Kyiv: only events after 1991 were renamed (0 records — none matched; the six "Battle of Kiev" rows are 1069-1943 and keep the historical spelling).
- HCED "Battle of <country>" campaign rows renamed to the accepted campaign name (Battle of France/Belgium/Crete/Normandy/Britain kept):

| id | old | new |
|---|---|---|
| `battle-of-albania` | Battle of Albania | Italian invasion of Albania |
| `battle-of-berlin` | Battle of Berlin | Battle of Berlin (RAF air campaign) |
| `battle-of-borneo` | Battle of Borneo | Borneo campaign (1945) |
| `battle-of-cambodia` | Battle of Cambodia | Cambodian campaign |
| `battle-of-ceylon` | Battle of Ceylon | Indian Ocean raid (Easter Sunday Raid) |
| `battle-of-champagne` | Battle of Champagne | Second Battle of Champagne |
| `battle-of-champagne-1914` | Battle of Champagne | First Battle of Champagne |
| `battle-of-colorado` | Battle of Colorado | Battle of the Colorado River (1840) |
| `battle-of-greece` | Battle of Greece | Greco-Italian War |
| `battle-of-guam` | Battle of Guam | Capture of Guam (1898) |
| `battle-of-iran` | Battle of Iran | Anglo-Soviet invasion of Iran |
| `battle-of-iraq` | Battle of Iraq | Anglo-Iraqi War |
| `battle-of-jamaica` | Battle of Jamaica | Invasion of Jamaica (1655) |
| `battle-of-java` | Battle of Java | Invasion of Java (1811) |
| `battle-of-lebanon` | Battle of Lebanon | Syria–Lebanon campaign (Lebanon) |
| `battle-of-syria` | Battle of Syria | Syria–Lebanon campaign |
| `battle-of-malaya` | Battle of Malaya | Malayan campaign |
| `battle-of-malta` | Battle of Malta | French invasion of Malta |
| `battle-of-manchuria` | Battle of Manchuria | Soviet invasion of Manchuria |
| `battle-of-norway` | Battle of Norway | Norwegian campaign |
| `battle-of-panama` | Battle of Panama | Sack of Panama (1671) |
| `battle-of-quebec` | Battle of Quebec | Capture of Quebec (1629) |
| `battle-of-quebec-1711` | Battle of Quebec | Quebec Expedition (1711) |
| `battle-of-quebec-1759` | Battle of Quebec | Battle of the Plains of Abraham |
| `battle-of-quebec-1760` | Battle of Quebec | Battle of Sainte-Foy |
| `battle-of-sardinia` | Battle of Sardinia | Capture of Sardinia (1708) |
| `battle-of-sicily` | Battle of Sicily | Allied invasion of Sicily |
| `battle-of-maine` | Battle of Maine | USS Maine explosion |

## 8. Things to flag for the owner

- 56 HCED ids for BCE battles carry a double dash (`battle-of-jerusalem--587`); they are valid slugs under the audit definition and the validator tolerates them, but a `-bce-` scheme would be cleaner. Not changed (would need redirects for 56 permalinks).
- Stub parents are derived records: their countries are the union of HCED belligerent labels (so both "Austria" and "Habsburg Empire" can appear) and will benefit from the Phase-4 polity canonicalisation.
- `Battle of Berlin (RAF air campaign)` (HCED 1943) is an air campaign, not a battle; `USS Maine explosion` is not a conflict at all — both kept per the "every record stays a conflict" rule but could be reviewed.
- The 315 unresolved `partOf` strings are kept verbatim so no source attribution is lost; the UI should treat any `partOf` entry that is not an id as a plain label.
- The point-in-country mismatch list below contains many legitimately offshore naval battles and historical labels (e.g. "Prussia"); treat it as a review queue, not an error list.

### Appendix A — records that lost their only belligerent ("Draw")

`battle-of-abadan`, `battle-of-aberdare-kenya`, `battle-of-acambaro`, `battle-of-acs`, `battle-of-aden-1986`, `battle-of-ad-salices`, `battle-of-aland`, `battle-of-alba-de-tormes-1812`, `battle-of-aldie`, `battle-of-amelia-springs`, `battle-of-aquia-creek`, `battle-of-arkansas-post`, `battle-of-arni-1782`, `battle-of-artemisium`, `battle-of-asiago`, `battle-of-auburn`, `battle-of-augusta-sicily`, `battle-of-barcelona-spain-1642`, `battle-of-belle-isle-canada`, `battle-of-belmont-missouri`, `battle-of-berryville`, `battle-of-bezzecca`, `battle-of-bila-tserkva`, `battle-of-blandford`, `battle-of-blumenau`, `battle-of-boonsboro`, `battle-of-buin`, `battle-of-caloocan`, `battle-of-cambrai-1917`, `battle-of-camp-allegheny`, `battle-of-campus-castorum`, `battle-of-cancale`, `battle-of-cane-hill`, `battle-of-cape-esperance`, `battle-of-carpathians`, `battle-of-caudebec`, `battle-of-cedarville`, `battle-of-chaksana`, `battle-of-chalk-bluff`, `battle-of-chemille`, `battle-of-chilianwallah`, `battle-of-cirencester`, `battle-of-coleraine`, `battle-of-colombey`, `battle-of-corbridge-918`, `battle-of-corfu-1716-3`, `battle-of-crichton`, `battle-of-cuddalore-2nd`, `battle-of-danang`, `battle-of-dogger-bank-1915`, `battle-of-dubrovnik`, `battle-of-edgehill-england`, `battle-of-erzurum-1877`, `battle-of-eski-hissarlik`, `battle-of-flanders`, `battle-of-fowltown`, `battle-of-fryeburg`, `battle-of-fuentarrabia-1836`, `battle-of-gameza`, `battle-of-garhakota`, `battle-of-golymin`, `battle-of-gotland`, `battle-of-gottolengo`, `battle-of-grammos`, `battle-of-greenbrier-river`, `battle-of-groveton`, `battle-of-grumentum`, `battle-of-guadalajara-spain`, `battle-of-guadalcanal-naval-1st`, `battle-of-guillemont`, `battle-of-gurrumkonda`, `battle-of-halys`, `battle-of-havana-1748`, `battle-of-hungry-hill`, `battle-of-hyeres`, `battle-of-itagui`, `battle-of-iuka`, `battle-of-jerseyfield`, `battle-of-jintian`, `battle-of-jutland`, `battle-of-kaifeng-1948`, `battle-of-kasama`, `battle-of-katia-1st`, `battle-of-khem-karan`, `battle-of-khe-sanh-1968`, `battle-of-kronstadt-bay`, `battle-of-kudarangan`, `battle-of-kyoge-bay`, `battle-of-la-guaira-1902`, `battle-of-lake-smolino`, `battle-of-laohekou`, `battle-of-lemnos-1717`, `battle-of-liguria`, `battle-of-lodz`, `battle-of-lone-jack`, `battle-of-longwood`, `battle-of-loon-lake`, `battle-of-lost-river-california`, `battle-of-lutsk`, `battle-of-luzon`, `battle-of-luzzara`, `battle-of-malaga-1704`, `battle-of-malatitze`, `battle-of-malsch`, `battle-of-manizales`, `battle-of-marietta`, `battle-of-marion`, `battle-of-mearcredesburn`, `battle-of-merta`, `battle-of-middle-creek`, `battle-of-mobile-bay`, `battle-of-mostar`, `battle-of-murviedro`, `battle-of-mylae--36`, `battle-of-namozine-church`, `battle-of-negapatam-1758`, `battle-of-negroponte-1697`, `battle-of-neresheim`, `battle-of-new-britain`, `battle-of-newbury-1644`, `battle-of-nola--214`, `battle-of-north-anna`, `battle-of-nouart`, `battle-of-nuits-saint-george`, `battle-of-oak-grove`, `battle-of-ochagavia`, `battle-of-pakozd`, `battle-of-paraetacene`, `battle-of-pont-a-chin`, `battle-of-portela`, `battle-of-powder-1876`, `battle-of-quilmes`, `battle-of-round-mountain`, `battle-of-rugen`, `battle-of-sacile`, `battle-of-st-dizier-2nd`, `battle-of-st-lucia-1780`, `battle-of-samothrace`, `battle-of-sanantonio-texas`, `battle-of-san-pascual`, `battle-of-san-pedro-sula`, `battle-of-sevastopol`, `battle-of-shaho-1904`, `battle-of-sheriffmuir`, `battle-of-sherston`, `battle-of-sialkot-1965`, `battle-of-sirte`, `battle-of-smara`, `battle-of-smithfield`, `battle-of-stony-creek`, `battle-of-stromboli`, `battle-of-suez-canal-2nd`, `battle-of-sybota`, `battle-of-tapae-101`, `battle-of-totopotomoy-creek`, `battle-of-tournai`, `battle-of-tournai-1794`, `battle-of-tres-castillos`, `battle-of-trompettersdrift`, `battle-of-uckerath`, `battle-of-ulan-butong`, `battle-of-unayzah`, `battle-of-ushant`, `battle-of-ushant-1795`, `battle-of-utica`, `battle-of-valutino`, `battle-of-vaniyambadi`, `battle-of-vasa`, `battle-of-vilna-1915`, `battle-of-vlakfontein`, `battle-of-vyborg-bay`, `battle-of-walwal`, `battle-of-williamsport`, `battle-of-withlacoochee-1836`, `battle-of-yellow-bayou`, `battle-of-yen-bai`, `battle-of-yorktown-1862`


### Appendix B — point-in-country label/pin mismatches (review queue)

| id | name | year | label | point falls in |
|---|---|---|---|---|
| `battle-of-ajnadin` | Battle of Ajnadin | 634 | Iraq | israel |
| `battle-of-aland` | Battle of Aland | 1918 | Finland | åland |
| `battle-of-alexandrovsk` | Battle of Alexandrovsk | 1919 | Russia | sea / no country |
| `battle-of-alihuata` | Battle of Alihuata | 1933 | Paraguay | bolivia |
| `battle-of-alma` | Battle of Alma | 1854 | Ukraine | russia |
| `battle-of-alten-fjord` | Battle of Alten Fjord | 1943 | Norway | sweden |
| `battle-of-andriba` | Battle of Andriba | 1895 | Madagascar | sea / no country |
| `battle-of-angaur` | Battle of Angaur | 1944 | Palau | sea / no country |
| `battle-of-anholt` | Battle of Anholt | 1811 | Denmark | sea / no country |
| `battle-of-apulia` | Battle of Apulia | 1155 | Italy | sea / no country |
| `battle-of-argos` | Battle of Argos | -272 | Italy | greece |
| `battle-of-arkona` | Battle of Arkona | 1168 | Russia | germany |
| `battle-of-arkona-1712` | Battle of Arkona | 1712 | Denmark | sea / no country |
| `battle-of-aros` | Battle of Aros | 1886 | United States | mexico |
| `battle-of-aussa` | Battle of Aussa | 1875 | Djibouti | ethiopia |
| `battle-of-balane` | Battle of Balane | 1594 | Sri Lanka | sea / no country |
| `battle-of-balathista` | Battle of Balathista | 1014 | Bulgaria | north macedonia |
| `battle-of-balkans` | Battle of Balkans | 1941 | Greece | north macedonia |
| `battle-of-balkans-1944` | Battle of Balkans | 1944 | Serbia | north macedonia |
| `battle-of-ballivian` | Battle of Ballivian | 1934 | Bolivia | paraguay |
| `battle-of-baran` | Battle of Baran | 1920 | Somalia | somaliland |
| `battle-of-barents-sea` | Battle of Barents Sea | 1942 | Russia | sea / no country |
| `battle-of-benin` | Battle of Benin | 1967 | Benin | nigeria |
| `battle-of-beting-marau` | Battle of Beting Marau | 1849 | Malaysia | sea / no country |
| `battle-of-bismarck-sea` | Battle of Bismarck Sea | 1942 | Papua New Guinea | sea / no country |
| `battle-of-bloody-nose-ridge` | Battle of Bloody Nose Ridge | 1944 | Palau | sea / no country |
| `battle-of-bolshoi-stakhov` | Battle of Bolshoi-Stakhov | 1812 | Russia | belarus |
| `battle-of-bomarsund` | Battle of Bomarsund | 1854 | Finland | sea / no country |
| `battle-of-borneo` | Borneo campaign (1945) | 1945 | Malaysia | indonesia |
| `battle-of-brema` | Battle of Brema | 1638 | Germany | italy |
| `battle-of-bug` | Battle of Bug | 1018 | Ukraine | poland |
| `battle-of-cagancha` | Battle of Cagancha | 1839 | Argentina | uruguay |
| `battle-of-calabria` | Battle of Calabria | 1940 | Italy | sea / no country |
| `battle-of-cape-bon` | Battle of Cape Bon | 468 | Tunisia | sea / no country |
| `battle-of-cape-bon-1941` | Battle of Cape Bon | 1941 | Tunisia | sea / no country |
| `battle-of-cape-finisterre-2nd` | Battle of Cape Finisterre (2nd) | 1747 | Spain | sea / no country |
| `battle-of-cape-finisterre-1st` | Battle of Cape Finisterre (1st) | 1747 | Spain | sea / no country |
| `battle-of-cape-finisterre` | Battle of Cape Finisterre | 1780 | Spain | sea / no country |
| `battle-of-cape-finisterre-1805` | Battle of Cape Finisterre | 1805 | Spain | sea / no country |
| `battle-of-cape-sarych` | Battle of Cape Sarych | 1914 | Ukraine | sea / no country |
| `battle-of-cape-st-george` | Battle of Cape St George | 1943 | Solomon Islands | sea / no country |
| `battle-of-cassano-1259` | Battle of Cassano | 1259 | Austria | italy |
| `battle-of-cer` | Battle of Cer | 1914 | France | serbia |
| `battle-of-cerro-grande` | Battle of Cerro Grande | 1859 | Paraguay | chile |
| `battle-of-channel-dash` | Battle of Channel Dash | 1942 | United Kingdom | sea / no country |
| `battle-of-chernigovka` | Battle of Chernigovka | 1941 | Russia | ukraine |
| `battle-of-chiloe` | Battle of Chiloe | 1826 | Chile | sea / no country |
| `battle-of-chize` | Battle of Chize | 1373 | Switzerland | france |
| `battle-of-convoy-pedestal` | Battle of Convoy Pedestal | 1942 | Malta | sea / no country |
| `battle-of-coral-sea` | Battle of Coral Sea | 1942 | Papua New Guinea | sea / no country |
| `battle-of-corfu-1716-3` | Battle of Corfu | 1716 | Greece | sea / no country |
| `battle-of-csaszahalom` | Battle of Csaszahalom | 1441 | Hungary | serbia |
| `battle-of-cynossema` | Battle of Cynossema | -411 | Greece | sea / no country |
| `battle-of-czernowitz` | Battle of Czernowitz | 1914 | Poland | ukraine |
| `battle-of-dakhila` | Battle of Dakhila | 1898 | Sudan | sea / no country |
| `battle-of-don-basin` | Battle of Don Basin | 1919 | Ukraine | moldova |
| `battle-of-dragasani` | Battle of Dragasani | 1821 | Greece | romania |
| `battle-of-dufile` | Battle of Dufile | 1888 | Sudan | uganda |
| `battle-of-dungan-hill` | Battle of Dungan Hill | 1647 | United Kingdom | ireland |
| `battle-of-empress-augusta-bay` | Battle of Empress Augusta Bay | 1943 | United States | sea / no country |
| `battle-of-eniwetok` | Battle of Eniwetok | 1944 | Marshall Islands | sea / no country |
| `battle-of-es-salt-1st` | Battle of Es Salt (1st) | 1918 | Israel | jordan |
| `battle-of-eupatoria` | Battle of Eupatoria | 1855 | Ukraine | russia |
| `battle-of-faya-largeau` | Battle of Faya Largeau | 1983 | Libya | chad |
| `battle-of-first-of-june` | Battle of First of June | 1794 | France | sea / no country |
| `battle-of-flamborough-head` | Battle of Flamborough Head | 1779 | United Kingdom | sea / no country |
| `battle-of-florida-usa` | Battle of Florida, USA | 1814 | United States | sea / no country |
| `battle-of-fort-del-or` | Battle of Fort del Or | 1580 | United Kingdom | sea / no country |
| `battle-of-foule-point` | Battle of Foule Point | 1811 | Mauritius | sea / no country |
| `battle-of-galiabur` | Battle of Galiabur | 1920 | Somalia | somaliland |
| `battle-of-ganondagan` | Battle of Ganondagan | 1687 | Canada | united states of america |
| `battle-of-ganzak` | Battle of Ganzak | 591 | Azerbaijan | iran |
| `battle-of-gavilan` | Battle of Gavilan | 1817 | Chile | sea / no country |
| `battle-of-giao-chao` | Battle of Giao-chao | 602 | Vietnam | sea / no country |
| `battle-of-gilbert-islands` | Battle of Gilbert Islands | 1943 | United States | sea / no country |
| `battle-of-gorodok` | Battle of Gorodok | 1914 | Russia | ukraine |
| `battle-of-green-islands` | Battle of Green Islands | 1944 | Papua New Guinea | sea / no country |
| `battle-of-grengam` | Battle of Grengam | 1720 | Finland | sea / no country |
| `battle-of-guelta-zemmour` | Battle of Guelta Zemmour | 1981 | Chad | morocco |
| `battle-of-gueppi` | Battle of Gueppi | 1933 | Colombia | peru |
| `battle-of-gujrat-pakistan` | Battle of Gujrat, Pakistan | 1797 | India | pakistan |
| `battle-of-gujrat-pakistan-1849` | Battle of Gujrat, Pakistan | 1849 | India | pakistan |
| `battle-of-gumburu` | Battle of Gumburu | 1903 | Somalia | somaliland |
| `battle-of-hafir-iraq` | Battle of Hafir, Iraq | 633 | Iraq | sea / no country |
| `battle-of-helgoland` | Battle of Helgoland | 1864 | Germany | sea / no country |
| `battle-of-helgoland-bight` | Battle of Helgoland Bight | 1914 | Germany | sea / no country |
| `battle-of-hirsov` | Battle of Hirsov | 1773 | Bulgaria | romania |
| `battle-of-hjortensjon` | Battle of Hjortensjon | 1543 | Sweden | sea / no country |
| `battle-of-hogland` | Battle of Hogland | 1788 | Finland | sea / no country |
| `battle-of-hormuz` | Battle of Hormuz | 1515 | Iran | sea / no country |
| `battle-of-horreum-margi` | Battle of Horreum Margi | 505 | Italy | serbia |
| `battle-of-hukawng` | Battle of Hukawng | 1944 | China | myanmar |
| `battle-of-huon-peninsula` | Battle of Huon Peninsula | 1943 | Papua New Guinea | australia |
| `battle-of-ilha-de-redencao` | Battle of Ilha de Redencao | 1866 | Uruguay | argentina |
| `battle-of-illig` | Battle of Illig | 1904 | Sudan | sea / no country |
| `battle-of-india-muerta` | Battle of India Muerta | 1845 | Argentina | uruguay |
| `battle-of-indus` | Battle of Indus | 458 | India | pakistan |
| `battle-of-ionian-islands-1810` | Battle of Ionian Islands | 1810 | Greece | sea / no country |
| `battle-of-iron-mountain-china` | Battle of Iron Mountain, China | 630 | Mongolia | china |
| `battle-of-ivangorod` | Battle of Ivangorod | 1914 | Russia | poland |
| `battle-of-jaxartes` | Battle of Jaxartes | -329 | Tajikistan | uzbekistan |
| `battle-of-jersey` | Battle of Jersey | 1781 | United Kingdom | sea / no country |
| `battle-of-jiluo-mountain` | Battle of Jiluo Mountain | 90 | China | mongolia |
| `battle-of-jutland` | Battle of Jutland | 1916 | Denmark | sea / no country |
| `battle-of-kafir-qala` | Battle of Kafir Qala | 1818 | Afghanistan | pakistan |
| `battle-of-kagul-lagoon` | Battle of Kagul Lagoon | 1574 | Ukraine | moldova |
| `battle-of-katzbach` | Battle of Katzbach | 1813 | Germany | poland |
| `battle-of-kerch` | Battle of Kerch | 1855 | Ukraine | russia |
| `battle-of-kerch-1942` | Battle of Kerch | 1942 | Ukraine | russia |
| `battle-of-kerch-1944` | Battle of Kerch | 1944 | Ukraine | russia |
| `battle-of-khalule` | Battle of Khalule | -691 | Syria | palestine |
| `battle-of-kirchberg` | Battle of Kirchberg | 1797 | Austria | germany |
| `battle-of-kirkholm` | Battle of Kirkholm | 1605 | Denmark | latvia |
| `battle-of-komandorski-islands` | Battle of Komandorski Islands | 1943 | United States | sea / no country |
| `battle-of-koromogawa` | Battle of Koromogawa | 1189 | Japan | sea / no country |
| `battle-of-kulevcha` | Battle of Kulevcha | 1829 | Ukraine | bulgaria |
| `battle-of-kwajalein` | Battle of Kwajalein | 1944 | Marshall Islands | sea / no country |
| `battle-of-lagos-bay` | Battle of Lagos Bay | 1693 | Portugal | sea / no country |
| `battle-of-lagos-bay-1759` | Battle of Lagos Bay | 1759 | Portugal | sea / no country |
| `battle-of-lake-erie` | Battle of Lake Erie | 1813 | United States | canada |
| `battle-of-lake-peipus` | Battle of Lake Peipus | 1242 | Estonia | russia |
| `battle-of-landshut-1760` | Battle of Landshut | 1760 | Germany | poland |
| `battle-of-leghorn` | Battle of Leghorn | 1653 | Italy | sea / no country |
| `battle-of-lemnos` | Battle of Lemnos | -73 | Greece | sea / no country |
| `battle-of-lemnos-1717` | Battle of Lemnos | 1717 | Greece | sea / no country |
| `battle-of-lemnos-1807` | Battle of Lemnos | 1807 | Greece | sea / no country |
| `battle-of-les-avins` | Battle of Les Avins | 1635 | France | belgium |
| `battle-of-leucimne` | Battle of Leucimne | -435 | Albania | sea / no country |
| `battle-of-lissa-1866` | Battle of Lissa | 1866 | Italy | sea / no country |
| `battle-of-longwood` | Battle of Longwood | 1814 | United States | canada |
| `battle-of-lund` | Battle of Lund | 1676 | Denmark | sweden |
| `battle-of-macassar` | Battle of Macassar | 1660 | Indonesia | sea / no country |
| `battle-of-macassar-strait` | Battle of Macassar Strait | 1942 | Indonesia | sea / no country |
| `battle-of-madain` | Battle of Madain | 637 | Saudi Arabia | iraq |
| `battle-of-mahungwe` | Battle of Mahungwe | 1684 | Zimbabwe | botswana |
| `battle-of-marshall-islands` | Battle of Marshall Islands | 1944 | Marshall Islands | sea / no country |
| `battle-of-mazraa` | Battle of Mazraa | 1925 | Lebanon | syria |
| `battle-of-melilla` | Battle of Melilla | 1936 | Spain | morocco |
| `battle-of-mersah-matruh` | Battle of Mersah Matruh | 1942 | Libya | egypt |
| `battle-of-mons-seleucus` | Battle of Mons Seleucus | 353 | Belgium | france |
| `battle-of-monte-christi-1st` | Battle of Monte Christi (1st) | 1780 | United States | sea / no country |
| `battle-of-monte-christi-2nd` | Battle of Monte Christi (2nd) | 1780 | United States | sea / no country |
| `battle-of-montijo` | Battle of Montijo | 1644 | Portugal | spain |
| `battle-of-nacimiento` | Battle of Nacimiento | 1873 | United States | mexico |
| `battle-of-nam-dong` | Battle of Nam Dong | 1964 | Vietnam | sea / no country |
| `battle-of-namsi` | Battle of Namsi | 1951 | South Korea | north korea |
| `battle-of-napata--23` | Battle of Napata | -23 | Egypt | sudan |
| `battle-of-nemecky-brod` | Battle of Nemecky Brod | 1422 | Slovakia | czechia |
| `battle-of-nemiga` | Battle of Nemiga | 1067 | Russia | belarus |
| `battle-of-north-brittany` | Battle of North Brittany | 1943 | France | sea / no country |
| `battle-of-north-cape` | Battle of North Cape | 1943 | Norway | sea / no country |
| `battle-of-ok-pass` | Battle of OK Pass | 1919 | Somalia | somaliland |
| `battle-of-oland-1st` | Battle of Oland (1st) | 1564 | Sweden | sea / no country |
| `battle-of-oland-2nd` | Battle of Oland (2nd) | 1564 | Sweden | sea / no country |
| `battle-of-oland` | Battle of Oland | 1566 | Sweden | sea / no country |
| `battle-of-oland-1676` | Battle of Oland | 1676 | Sweden | sea / no country |
| `battle-of-oland-1789` | Battle of Oland | 1789 | Sweden | sea / no country |
| `battle-of-orekhovo` | Battle of Orekhovo | 1769 | Russia | poland |
| `battle-of-orlau-frankenau` | Battle of Orlau-Frankenau | 1914 | Germany | poland |
| `battle-of-palmar-uruguay` | Battle of Palmar, Uruguay | 1838 | Uruguay | argentina |
| `battle-of-pangani` | Battle of Pangani | 1889 | Kenya | tanzania |
| `battle-of-parsa` | Battle of Parsa | 1815 | China | india |
| `battle-of-paso-de-cuevas` | Battle of Paso de Cuevas | 1865 | Paraguay | argentina |
| `battle-of-peliliu` | Battle of Peliliu | 1944 | Palau | sea / no country |
| `battle-of-pescadores-1895` | Battle of Pescadores | 1895 | Taiwan | sea / no country |
| `battle-of-philippine-sea` | Battle of Philippine Sea | 1944 | Philippines | sea / no country |
| `battle-of-plei-me` | Battle of Plei Me | 1965 | Vietnam | thailand |
| `battle-of-portland-dorset` | Battle of Portland, Dorset | 1653 | United Kingdom | sea / no country |
| `battle-of-port-mahon` | Battle of Port Mahon | 1756 | France | spain |
| `battle-of-prince-of-wales-and-repulse` | Battle of Prince of Wales and Repulse | 1941 | Singapore | sea / no country |
| `battle-of-pulau-aur` | Battle of Pulau Aur | 1804 | Malaysia | sea / no country |
| `battle-of-pyokjekwan` | Battle of Pyokjekwan | 1593 | North Korea | south korea |
| `battle-of-raab-1809` | Battle of Raab | 1809 | Austria | hungary |
| `battle-of-rabat-i-pariyan` | Battle of Rabat-i-Pariyan | 1598 | Uzbekistan | afghanistan |
| `battle-of-rampura` | Battle of Rampura | 1818 | Bangladesh | india |
| `battle-of-rennell-island` | Battle of Rennell Island | 1943 | United States | sea / no country |
| `battle-of-rock-island-rapids` | Battle of Rock Island Rapids | 1814 | United States | canada |
| `battle-of-roi-namur` | Battle of Roi-Namur | 1944 | Marshall Islands | sea / no country |
| `battle-of-sacramento` | Battle of Sacramento | 1847 | United States | mexico |
| `battle-of-st-eustatius` | Battle of St Eustatius | 1781 | Sint Maarten | netherlands |
| `battle-of-st-georges-channel` | Battle of St Georges Channel | 1813 | United Kingdom | sea / no country |
| `battle-of-st-kitts` | Battle of St Kitts | 1782 | Sint Maarten | st. kitts and nevis |
| `battle-of-st-lucia` | Battle of St Lucia | 1778 | St. Kitts and Nevis | sea / no country |
| `battle-of-st-lucia-1780` | Battle of St Lucia | 1780 | St. Kitts and Nevis | sea / no country |
| `battle-of-st-lucia-1794` | Battle of St Lucia | 1794 | St. Kitts and Nevis | sea / no country |
| `battle-of-st-lucia-1796` | Battle of St Lucia | 1796 | St. Kitts and Nevis | sea / no country |
| `battle-of-saints` | Battle of Saints | 1782 | Sint Maarten | sea / no country |
| `battle-of-samothrace` | Battle of Samothrace | 1698 | Greece | sea / no country |
| `battle-of-san-carlos-falklands` | Battle of San Carlos, Falklands | 1982 | United Kingdom | falkland is. |
| `battle-of-san-jacinto-nicaragua` | Battle of San Jacinto, Nicaragua | 1856 | Cuba | nicaragua |
| `battle-of-san-juan-puerto-rico-1st` | Battle of San Juan, Puerto Rico (1st) | 1898 | United States | puerto rico |
| `battle-of-san-juan-puerto-rico-2nd` | Battle of San Juan, Puerto Rico (2nd) | 1898 | United States | puerto rico |
| `battle-of-san-juan-puerto-rico` | Battle of San Juan, Puerto Rico | 1797 | United States | puerto rico |
| `battle-of-sao-miguel` | Battle of Sao Miguel | 1583 | Portugal | sea / no country |
| `battle-of-scilly-isles` | Battle of Scilly Isles | 1781 | United Kingdom | sea / no country |
| `battle-of-sculeni` | Battle of Sculeni | 1821 | Greece | romania |
| `battle-of-sevastopol` | Battle of Sevastopol | 1914 | Ukraine | russia |
| `battle-of-sevastopol-1944` | Battle of Sevastopol | 1944 | Ukraine | russia |
| `battle-of-sicily` | Allied invasion of Sicily | 1943 | Italy | sea / no country |
| `battle-of-sidi-rezegh` | Battle of Sidi Rezegh | 1941 | Tunisia | libya |
| `battle-of-sitka` | Battle of Sitka | 1804 | United States | sea / no country |
| `battle-of-steinau` | Battle of Steinau | 1633 | Germany | poland |
| `battle-of-stromboli` | Battle of Stromboli | 1676 | Italy | sea / no country |
| `battle-of-suipacha` | Battle of Suipacha | 1810 | Argentina | bolivia |
| `battle-of-svolde` | Battle of Svolde | 1000 | Sweden | sea / no country |
| `battle-of-tarracina` | Battle of Tarracina | -314 | Italy | sea / no country |
| `battle-of-tendra` | Battle of Tendra | 1790 | Ukraine | sea / no country |
| `battle-of-texel` | Battle of Texel | 1673 | Netherlands | sea / no country |
| `battle-of-texel-1795` | Battle of Texel | 1795 | Netherlands | sea / no country |
| `battle-of-thal` | Battle of Thal | 1919 | India | pakistan |
| `battle-of-thedonisi-island` | Battle of Thedonisi Island | 1788 | Ukraine | sea / no country |
| `battle-of-ticinus` | Battle of Ticinus | -218 | Switzerland | italy |
| `battle-of-tisza-2nd` | Battle of Tisza (2nd) | 1919 | Hungary | romania |
| `battle-of-tristan-de-cunha` | Battle of Tristan de Cunha | 1815 | United Kingdom | sea / no country |
| `battle-of-tug-argan` | Battle of Tug Argan | 1940 | Somalia | somaliland |
| `battle-of-ushant-1794` | Battle of Ushant | 1794 | France | sea / no country |
| `battle-of-venta` | Battle of Venta | 1815 | Argentina | bolivia |
| `battle-of-virginia` | Battle of Virginia | 1812 | United States | sea / no country |
| `battle-of-virginius-incident` | Battle of Virginius Incident | 1873 | Cuba | sea / no country |
| `battle-of-wadi-al-arabah` | Battle of Wadi al-Arabah | 634 | Israel | saudi arabia |
| `battle-of-wake` | Battle of Wake | 1941 | Solomon Islands | sea / no country |
| `battle-of-welika-pond` | Battle of Welika Pond | 1836 | United States | sea / no country |
| `battle-of-werki` | Battle of Werki | 1658 | Latvia | lithuania |
| `battle-of-western-approaches-1st` | Battle of Western Approaches (1st) | 1814 | United Kingdom | sea / no country |
| `battle-of-western-approaches-2nd` | Battle of Western Approaches (2nd) | 1814 | United Kingdom | sea / no country |
| `battle-of-west-irian` | Battle of West Irian | 1962 | Indonesia | sea / no country |
| `battle-of-yenikale-strait` | Battle of Yenikale Strait | 1790 | Ukraine | sea / no country |
| `battle-of-yongdok` | Battle of Yongdok | 1950 | South Korea | sea / no country |
| `battle-of-zielenice` | Battle of Zielenice | 1792 | Poland | ukraine |
| `battle-of-zolte-wody` | Battle of Zolte Wody | 1648 | Poland | ukraine |
