# Wars Atlas — Data Expansion Report

Run completed 2026-04-28. Backups of original data in `backups/` directory.

## Top-line numbers

| File | Before | After | Added |
|---|---|---|---|
| `public/empires.json` | 137 features | **293 features** | +156 |
| `public/cities.json` | 490 features | **704 features** | +214 (and 73 corrected) |
| `public/conflicts.json` | 1,139 conflicts | **1,359 conflicts** | +220 |

## What was added

### Empire boundaries (+156 polygons)

**Americas (49 features)** — heavy fill since this was severely underrepresented:
- Pre-Columbian: Olmec, Zapotec, Teotihuacan, Maya Classic, Toltec, Mixtec, Tarascan/Purépecha, Tlaxcala, Aztec (with separate "expansion" feature), Mississippian (Cahokia), Ancestral Pueblo, Hohokam, Mogollon, Iroquois Confederacy, Powhatan, Huron/Wendat, Wari, Tiwanaku, Chimú, Chibcha/Muisca, Inca/Tawantinsuyu, Mapuche, Taíno, Patagonia/Tehuelche
- Post-Columbian: All four Spanish viceroyalties, Portuguese Brazil (1700/1750), New France, British Thirteen Colonies, US territorial expansion (1790, 1804, 1848, 1860), Confederate States, First Mexican Empire, Gran Colombia, Empire of Brazil, Argentine Confederation, Republic of Texas, Republic of Yucatán, Russian America, **Comanche Comancheria (1700-1875)**, **Lakota/Sioux Territory (1750-1877)**

**British Empire 1700-1947 (15 features)** — decade-level snapshots:
- 12 empire-wide MultiPolygon snapshots: 1700, 1750, 1763, 1783, 1815, 1837, 1858, 1880, 1900, 1921, 1939, 1947
- 3 India-phase snapshots: 1765 (post-Plassey Bengal), 1805 (post-2nd Maratha), 1850 (post-Sikh)

**Sub-Saharan Africa (40 features)** — major fill:
- Sahel: Ghana, Mali (core + Mansa Musa peak), Songhai, Kanem, Kanem-Bornu, Hausa city-states, Sokoto Caliphate
- Forest: Oyo, Asante, Dahomey, Benin, Kongo, Lunda, Luba, Imerina/Madagascar
- Horn/East: Aksum, Zagwe, Ethiopian (medieval + Menelik II), Adal, Ajuran, Funj, Buganda, Bunyoro, Rwanda, Burundi, Zanzibar phases
- Southern: Great Zimbabwe, Mutapa, Rozvi, Mthethwa, Zulu, Ndebele, Sotho/Lesotho, Swaziland, Transvaal, Orange Free State

**Asia / Pacific / Steppe (52 features)**:
- Steppe: Xiongnu, Xianbei, Rouran, Göktürks (Eastern + Western), Uyghurs, Khazars, Pechenegs, Cumans-Kipchaks, Khitan Liao, Jurchen Jin, Tangut Xia, Kara-Khitai, Khwarezmian, Ilkhanate, Chagatai, Golden Horde, Khanates of Bukhara/Khiva/Kokand, Dzungars, Crimean Khanate
- South Asia: Maurya, Bahmani, Mughal (Akbar + Aurangzeb), Maratha Confederacy, Sikh Empire, Durrani
- SE Asia: Funan, Champa, Khmer (Angkor), Srivijaya, Majapahit, Malacca, Aceh, Mataram, Pagan, Konbaung, Đại Việt/Nguyễn Vietnam
- East Asia: Goguryeo, Silla, Goryeo, Joseon, Tokugawa, Sengoku/Ashikaga, Song North/South, Yuan, Ming, Qing
- Pacific: Hawaiian Kingdom, Tongan Empire, Tahitian Confederacy, Samoan polities, Maori iwi

### Historical city names (+214 features, 73 corrected)

The original data had a single name per city forever ("Londinium" was still labeled in 1945). Now 121+ cities have multi-period name features that fade in/out as the timeline scrubs.

Examples now in place:
- **London**: Londinium (43-410) → Lundenwic (600-880) → London (880-)
- **Constantinople**: Byzantion (-657-330) → Constantinople (330-1453) → Konstantiniyye (1453-1930) → Istanbul (1930-)
- **Paris**: Lutetia (-52 to 360) → Paris (360-)
- **Tokyo**: Edo (1457-1868) → Tokyo (1868-)
- **Mexico City**: Tenochtitlán (1325-1521) → Ciudad de México (1521-)
- **St Petersburg**: Sankt-Peterburg → Petrograd → Leningrad → Sankt-Peterburg
- **Volgograd**: Tsaritsyn → Stalingrad → Volgograd
- **Beijing**: Ji → Yanjing → Zhongdu → Khanbaliq → Beiping → Beijing
- **Saigon**: Prey Nokor → Saigon → Hồ Chí Minh City
- Plus: Sevilla/Hispalis, Córdoba/Qurṭuba, Toledo/Tulaytulah, Cádiz/Gadir/Gades/Qadis, Aachen/Aquae Granni, Vienna/Vindobona, Trier/Augusta Treverorum, Köln/Colonia, Königsberg/Kaliningrad, Wrocław/Breslau, Gdańsk/Danzig, Lviv/Lemberg, İzmir/Smyrna, Antakya/Antioch, Konya/Iconium, Trabzon/Trapezous, Jerusalem/Aelia Capitolina/Al-Quds, Cairo/Fustat, Delhi/Indraprastha, Mumbai/Bombay, Kolkata/Calcutta, Chennai/Madras, Samarkand/Marakanda, Hanoi/Thăng Long, Jakarta/Batavia/Sunda Kelapa, Yangon/Rangoon, Manila/Maynila, New York/New Amsterdam, Montreal/Ville-Marie, Albany/Fort Orange, etc.

### Conflicts (+220)

**Americas (95 conflicts)** — pre-Columbian to modern:
- Pre-contact: Tikal-Calakmul Wars, Aztec founding wars, Aztec-Tarascan, Aztec-Tlaxcala Flower Wars, Inca civil war 1529-32, Pachacuti's conquests, Chimú-Inca war
- Spanish conquests: Mexico, Maya, Yucatán, Itza, Mixtón, Chichimeca War, Acaxee, Tepehuán, Tarahumara, **Pueblo Revolt 1680 (importance 5)**
- Mapuche/Arauco War (282-year duration), Battle of Tucapel
- US Indian Wars: King Philip's, Pontiac's, Northwest Indian War, Tecumseh's, Creek, three Seminole Wars, Yakima, Rogue River, Navajo Long Walk, Apache Wars, Texas-Indian, Red Cloud's, Sioux/Black Hills, Modoc, Nez Perce, Bannock, Sheepeater, Ute, Ghost Dance, Wounded Knee
- Latin American independence wars (Mexican, Venezuelan, Colombian, Ecuadorian, Peruvian, Bolivian, Argentine, Chilean, Paraguayan, Uruguayan, Brazilian, Cisplatine)
- 19th century: War of the Confederation, French intervention in Mexico, Pastry War, War of Reform, Texas Revolution, Mexican-American War, Caste War of Yucatán, War of Triple Alliance, Acre, Thousand Days', War of the Pacific, Chincha Islands, Platine, Conquista del Desierto
- 20th century: Mexican Revolution, Cristero War, Chaco War, Football War, La Violencia, Cuban Revolution, Bay of Pigs, Salvadoran/Guatemalan/Nicaraguan civil wars, Argentine Dirty War, Falklands, Sendero Luminoso, FARC, Mexican Drug War
- **Túpac Amaru II Rebellion (1780-1783, importance 5)** — largest indigenous rebellion in the Americas

**Global / Old World (126 conflicts)** — Africa, Asia, Europe, MENA:
- African: Mfecane, Anglo-Zulu, all Anglo-Asante (5), Mahdist, Anglo-Egyptian, both Italo-Ethiopian Wars, Maji Maji, Herero/Nama Genocide, Sokoto Jihad, Boer Wars, Aro Confederacy, Italo-Senussi, Rif War, Algerian War, Congo Crisis, Biafran, Ethiopian Civil, Eritrean, Ogaden, Mozambican, Angolan (independence + civil), Rhodesian Bush, Liberian, Sierra Leone, Rwandan Civil + Genocide, Congo Wars I & II, Darfur, S. Sudan, Tigray, Boko Haram, Sahel/Mali
- Indian Subcontinent: All four Anglo-Mysore Wars, three Anglo-Maratha Wars, both Anglo-Sikh Wars, three Anglo-Burmese Wars, three Anglo-Afghan Wars, Carnatic Wars (3), Plassey, Buxar, Nader Shah's invasion, Indo-Pakistani Wars (1947, 1965, 1971, Kargil), Sino-Indian, Sri Lankan Civil War, Nepalese Civil War
- East Asian: An Lushan Rebellion, Huang Chao, Mongol invasions of Vietnam (3) and Java, Tumu Crisis, Mongol conquest phases, Imjin War, Manchu conquest, Three Feudatories, Dzungar-Qing Wars, White Lotus, Both Opium Wars, Taiping, Nian, Dungan, Boxer, Xinhai, Warlord Era, Northern Expedition, Chinese Civil War, Long March, Cultural Revolution violence, Tibet 1959, Tiananmen 1989, Sino-Soviet 1969
- SE Asian: Trung Sisters, Trịnh-Nguyễn Wars, Lê-Mạc, Tay Son, Burmese-Siamese (incl. sack of Ayutthaya 1767), Java/Diponegoro War, Aceh War, Padri War, Philippine Revolution & American War, Moro Rebellion, Indochina I & II, Cambodian Civil + Khmer Rouge, Vietnamese-Cambodian, Sino-Vietnamese, Laotian Civil, Indonesian Revolution, Konfrontasi, East Timor, Aceh Insurgency, West Papua, Mindanao
- MENA: Greek Independence, Crimean War, Ottoman-Safavid Wars, Russo-Turkish series (multiple), Arab Revolt, all Arab-Israeli wars, Suez, Iran-Iraq, Gulf War, Iraq War, Syrian Civil War, Libyan Civil War, Yemeni Civil Wars, Lebanon Wars, Gaza wars
- Steppe/Russia: Han-Xiongnu Wars, Tang-Tibetan, Timurid campaigns, Russian conquest of Siberia, Russo-Persian Wars, Russian conquest of Central Asia, Basmachi, Soviet-Afghan, Tajik Civil, Chechen Wars, Russo-Georgian, Russo-Ukrainian, Nagorno-Karabakh
- Europe: Hundred Years War phases, Wars of the Roses, Italian Wars, Schmalkaldic, French Wars of Religion, Eighty Years, Cossack uprisings, Time of Troubles, Polish-Muscovite, Deluge, Great Turkish War, Northern War, all major succession wars, French Revolutionary, Napoleonic phases, 1848 Revolutions, Polish uprisings, Austro-Prussian, Franco-Prussian, Balkan Wars, Russian Civil War, Polish-Soviet, Baltic independence wars, Finnish Civil, Irish War of Independence + Civil War, Spanish Civil War, Winter War, Greek Civil War, Cyprus, Hungary 1956, Prague Spring, Northern Ireland Troubles, Yugoslav Wars, Transnistria

## Verification

All three JSON files parse cleanly. Verification suite confirms:
- 0 duplicate empire/conflict IDs
- 0 missing required fields
- 0 cities with `foundedYear > endYear` (26 pre-existing inversions repaired)
- 0 self-intersecting polygons (18 pre-existing invalid Roman/Mongol/Ottoman/etc. polygons also repaired)
- All coordinates within valid lon/lat bounds
- All importance ratings 1-5
- All dates monotonic where present

Empire region distribution after expansion: 80 Africa/MENA, 56 S/C Asia, 48 Europe, 66 Americas, 42 E/SE Asia, 1 Pacific. (Compared to pre-expansion which was heavily Eurasia-skewed.)

## Files

- `public/empires.json` — updated (293 features, 361 KB)
- `public/cities.json` — updated (704 features, 127 KB)
- `public/conflicts.json` — updated (1,359 conflicts, 605 KB)
- `backups/empires.json.bak`, `backups/cities.json.bak`, `backups/conflicts.json.bak` — original files preserved

## Notes & known limitations

- New empire polygons are hand-crafted approximations (15-50 vertices each, `accurate: false`). They render as dashed borders per the existing convention. They are recognizable and historically defensible, but not GIS-grade.
- A few existing cities still have shared placeholder coords (e.g., Nippur and Akkad both at 32.1°/32.1°). I left these since fixing involves disambiguating real geographic points.
- Some city name overlaps remain by design — e.g., "Aleppo" and "Halab" are the same city in different transliterations. The map will show both; not harmful.
- The British Empire MultiPolygons are large compositions; they may render heavy on weaker devices.
