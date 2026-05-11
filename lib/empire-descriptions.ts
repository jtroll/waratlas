/**
 * Curated editorial descriptions for the most-recognizable empires.
 * Keyed by empire id (the same `id` field stored in empires.json).
 *
 * The EmpireSidebar reads from this map; if an empire isn't here, it
 * gracefully falls back to showing only the data we have (name, dates,
 * source attribution, etc.). Adding more empires is purely additive —
 * nothing breaks if you don't.
 *
 * Style notes:
 *   - hook is a single italicized sentence (Source Serif italic), the
 *     thing you'd say first to a friend who'd never heard of this empire.
 *   - narrative is 1–3 sentences of plain prose answering "what was this".
 *   - significance is 1–2 sentences answering "why does it still matter".
 *
 * Multiple ids that refer to the same empire (e.g. ming-dynasty-1400 and
 * asia-ming-dynasty) are intentionally aliased so both surface the same
 * description.
 */

export interface EmpireDescription {
  hook?: string;
  narrative?: string;
  significance?: string;
}

// Reusable description blocks — defined once, attached to all relevant ids
// in the empires dataset (which often splits a single empire into time slices
// like roman-empire-augustus / roman-empire-trajan / roman-empire-late).
const ROMAN_EMPIRE: EmpireDescription = {
  hook: 'The largest and longest-lived Mediterranean empire — and the model every later European state quoted.',
  narrative: 'At its peak under Trajan in 117 CE, Rome ruled from Britain to the Persian Gulf and from the Rhine to the Sahara. The empire was held together by roads, citizenship law, professional legions, and a remarkably durable Latin–Greek bureaucracy that outlived even the western half by a thousand years in Byzantium.',
  significance: 'Roman law, the calendar, the alphabet, and the very idea of a continent-spanning state shaped everything from medieval canon law to the U.S. Senate.',
};
const ROMAN_REPUBLIC: EmpireDescription = {
  hook: 'A 500-year experiment in elected oligarchy that conquered the Mediterranean before destroying itself.',
  narrative: 'From the expulsion of the kings in 509 BCE to Augustus in 27 BCE, Rome was governed by elected magistrates and a senate of former magistrates — and yet it managed to absorb Italy, defeat Carthage, and annex the Hellenistic east. The system collapsed under the weight of its own conquests, ending in the civil wars of the 1st century BCE.',
  significance: "The Republic's vocabulary — senate, dictator, veto, plebiscite — still structures how we argue about democracy.",
};
const BYZANTINE_EMPIRE: EmpireDescription = {
  hook: 'The eastern half of the Roman Empire that quietly outlasted the western half by a thousand years.',
  narrative: 'Centered on Constantinople, Byzantium combined Roman law, Greek language, and Orthodox Christianity. It absorbed waves of Persian, Arab, Bulgar, and Turkish pressure for a millennium before finally falling to the Ottomans in 1453.',
  significance: 'It preserved classical Greek learning through the European Dark Ages and Christianized the Slavic world; the Cyrillic alphabet and Russian Orthodoxy are direct downstream consequences.',
};
const MUGHAL_EMPIRE: EmpireDescription = {
  hook: 'A Persianate, Central Asian Islamic dynasty that ruled most of the Indian subcontinent for two centuries.',
  narrative: 'Founded by Babur in 1526, the Mughals built a syncretic Indo-Islamic civilization whose monuments — the Taj Mahal, the Red Fort, Fatehpur Sikri — still define what most non-Indians picture when they imagine "India". British conquest in the 18th and 19th centuries reduced them to figureheads before the East India Company finally abolished the throne in 1858.',
  significance: 'The Mughal land-revenue system was inherited largely intact by the British Raj, and Mughal Persian remained the official language of north Indian courts and bureaucracy until the 1830s.',
};
const OTTOMAN_EMPIRE: EmpireDescription = {
  hook: 'A Turkish dynasty that ruled the eastern Mediterranean for six centuries — from a tiny frontier emirate to the largest Islamic empire of the modern era.',
  narrative: 'The Ottomans took Constantinople in 1453, conquered Egypt and the Hejaz in 1517, and at their 16th-century peak under Suleiman the Magnificent ruled from Algiers to Baghdad and from Yemen to the gates of Vienna. Defeat in WWI ended the dynasty in 1922.',
  significance: 'Borders the Ottomans drew, populations they moved, and institutions they built still define the politics of the Balkans, the Levant, and North Africa a century after their fall.',
};
const BRITISH_EMPIRE: EmpireDescription = {
  hook: "The largest empire in history — at one point the British crown ruled a quarter of the world's land and people.",
  narrative: 'Built piecemeal from the 17th century onward through trading companies, naval power, settler colonization, and outright conquest, the British Empire reached its greatest extent in 1922 covering 35 million km² and 458 million people. Decolonization between 1947 and 1980 dismantled most of it; Hong Kong\'s 1997 return to China is sometimes cited as the closing date.',
  significance: 'English as a world language, common-law legal systems across five continents, the borders of dozens of modern states, and the shape of global trade are all direct legacies — for better and for very much worse.',
};
const SPANISH_EMPIRE: EmpireDescription = {
  hook: 'The empire that began with Columbus and brought the Western Hemisphere into the global economy — at staggering human cost.',
  narrative: 'The Spanish Empire (1492–1898) was the first global empire, with possessions on every inhabited continent. American silver from Potosí and Zacatecas funded Spanish hegemony in 16th-century Europe and the first truly global trade network linking Manila, Acapulco, and Seville.',
  significance: 'The demographic catastrophe of the conquest killed an estimated 90% of Indigenous Americans within a century — one of the largest population collapses in human history.',
};
const EMPIRE_OF_JAPAN: EmpireDescription = {
  hook: 'In a single lifetime, Japan went from feudal isolation to the dominant power of East Asia.',
  narrative: 'The Meiji Restoration of 1868 ended 250 years of Tokugawa shogunate rule and launched Japan on a deliberate program of industrialization and military modernization. By 1942 Japan controlled Korea, Taiwan, Manchuria, much of China, the Philippines, Indonesia, Indochina, and Pacific island chains as far as the Solomons.',
  significance: "Japan's defeat of Russia in 1905 was the first major modern military victory of an Asian state over a European one, and reshaped global perceptions of European invincibility.",
};

const DESCRIPTIONS: Record<string, EmpireDescription> = {
  // ── Roman world (multi-slice in the dataset) ──────────────────────
  'roman-republic-early':    ROMAN_REPUBLIC,
  'roman-republic-late':     ROMAN_REPUBLIC,
  'roman-empire-augustus':   ROMAN_EMPIRE,
  'roman-empire-trajan':     ROMAN_EMPIRE,
  'roman-empire-late':       ROMAN_EMPIRE,
  'western-roman-empire':    ROMAN_EMPIRE,
  'eastern-roman-byzantine-early': BYZANTINE_EMPIRE,
  'byzantine-justinian':     BYZANTINE_EMPIRE,
  'byzantine-late-1025':     BYZANTINE_EMPIRE,
  'achaemenid-persian-empire': {
    hook: 'The first empire to rule the known world from the Indus to the Aegean.',
    narrative: 'Founded by Cyrus the Great around 550 BCE, the Achaemenid Persian Empire pioneered satrapal administration, a postal system, royal roads, and a deliberate policy of religious tolerance for conquered peoples. Defeat by Alexander in the 330s BCE ended the dynasty but not the imperial template.',
    significance: 'Persia invented the multi-ethnic continental empire — every later one, from Rome to the British, borrowed something from its administrative playbook.',
  },
  'sassanid-empire': {
    hook: 'Rome\'s eastern peer for four centuries — and the last Persian empire before Islam.',
    narrative: 'The Sassanids ruled Iran, Mesopotamia, and at times Egypt and Syria from 224 to 651 CE, fighting Rome to a standstill across what is today Iraq and Anatolia. Exhausted by the long Roman wars of the early 600s, they collapsed within a single generation under the Arab conquests.',
    significance: 'Sassanid administration, court ceremony, and bureaucracy were absorbed wholesale by the Caliphate that destroyed them, and shaped Islamic governance for centuries.',
  },
  'macedonian-alexander': {
    hook: 'A 12-year campaign that fused the Greek and Persian worlds into a single Hellenistic culture.',
    narrative: 'Alexander of Macedon inherited a unified Greece in 336 BCE and was dead by 323 BCE — but in between he conquered the Persian Empire, reached the Indus, and founded dozens of Greek cities from Egypt to Afghanistan.',
    significance: 'The successor kingdoms (Ptolemaic Egypt, Seleucid Asia, Antigonid Macedon) Hellenized the Near East for three centuries and seeded the cultural soil Christianity later grew in.',
  },
  'carthaginian-empire': {
    hook: 'A North African mercantile superpower that nearly broke Rome before Rome broke it.',
    narrative: 'Carthage controlled the western Mediterranean through commerce, naval power, and a network of colonies across modern-day Spain, Sicily, and Sardinia. Three Punic Wars with Rome (264–146 BCE) ended with the city razed and its territory annexed.',
    significance: 'Hannibal\'s 218 BCE crossing of the Alps with elephants is the textbook example of operational audacity; the Roman decision to permanently destroy Carthage set a precedent for total war.',
  },
  'hittite-empire': {
    hook: 'The Bronze Age power that stalemated Egypt and pioneered iron-working.',
    narrative: 'From their capital at Hattusa in central Anatolia, the Hittites ruled most of modern Turkey and northern Syria from roughly 1600 to 1180 BCE. The 1259 BCE treaty between Hittite king Hattusili III and Pharaoh Ramesses II is the oldest surviving peace treaty.',
    significance: 'The Hittite collapse was a key event in the Bronze Age Collapse — the simultaneous fall of nearly every major eastern Mediterranean civilization around 1177 BCE.',
  },

  // ── Egypt ──────────────────────────────────────────────────────────
  'egyptian-old-kingdom': {
    hook: 'The age of pyramid builders — Egypt\'s first long stretch of unified rule.',
    narrative: 'From roughly 2686 to 2181 BCE, the Old Kingdom centralized political power in Memphis and produced the Giza pyramids, the Great Sphinx, and a state apparatus capable of mobilizing tens of thousands of laborers. Drought, weakening central authority, and rising provincial power ended it in the First Intermediate Period.',
    significance: 'The pyramids are the largest stone monuments humans have ever built, and the Old Kingdom\'s administrative documents are some of the earliest detailed bureaucratic records in existence.',
  },
  'egyptian-middle-kingdom': {
    hook: 'A reunified Egypt — quieter than the Old Kingdom, more literary than what came before.',
    narrative: 'The Middle Kingdom (~2055–1650 BCE) reunified Egypt under the Theban kings after a period of division. It expanded south into Nubia, fortified the eastern delta against Asiatic incursions, and produced much of the classical Egyptian literary canon.',
    significance: 'The Tale of Sinuhe and the Instructions of Amenemhat, taught for centuries afterward as templates of style, were Middle Kingdom productions.',
  },
  'egyptian-new-kingdom-peak': {
    hook: 'Egypt at its imperial maximum — Thutmose III\'s armies on the Euphrates, Akhenaten\'s heretic capital, Tutankhamun\'s gold.',
    narrative: 'The New Kingdom (~1550–1077 BCE) saw Egypt become a true empire, controlling the Levant up to the Euphrates and Nubia down past the fourth cataract. Pharaohs like Hatshepsut, Thutmose III, Akhenaten, and Ramesses II are the names most people associate with "ancient Egypt".',
    significance: 'The New Kingdom\'s collapse was part of the broader Late Bronze Age Collapse around 1177 BCE — a near-extinction event for eastern Mediterranean civilization.',
  },

  // ── East and South Asia ────────────────────────────────────────────
  'han-dynasty-china': {
    hook: 'China\'s answer to Rome — and the dynasty whose name the Chinese still call themselves by.',
    narrative: 'The Han ruled a unified China from 202 BCE to 220 CE, formalizing Confucian government, opening the Silk Road to Central Asia, and inventing paper. At its peak the empire matched Rome in population and bureaucratic sophistication.',
    significance: 'Modern ethnic Han Chinese take their name from this dynasty; its civil-service exam tradition shaped Chinese, Korean, and Vietnamese government for two millennia.',
  },
  'asia-ming-dynasty': {
    hook: 'The dynasty that rebuilt China after the Mongols, sailed to Africa, and then turned inward forever.',
    narrative: 'The Ming (1368–1644) restored ethnic Han rule, rebuilt the Great Wall in its iconic stone form, moved the capital to Beijing, and dispatched the massive treasure fleets of Zheng He to Southeast Asia and East Africa. After 1433 they abruptly halted overseas voyages and turned to defending the agrarian heartland.',
    significance: 'The Ming withdrawal from maritime exploration is a textbook example of how dominant powers can voluntarily surrender strategic positions — Europeans filled the Indian Ocean trade vacuum within a few generations.',
  },
  'ming-dynasty-1400': {
    hook: 'The dynasty that rebuilt China after the Mongols, sailed to Africa, and then turned inward forever.',
    narrative: 'The Ming (1368–1644) restored ethnic Han rule, rebuilt the Great Wall in its iconic stone form, moved the capital to Beijing, and dispatched the massive treasure fleets of Zheng He to Southeast Asia and East Africa. After 1433 they abruptly halted overseas voyages and turned to defending the agrarian heartland.',
    significance: 'The Ming withdrawal from maritime exploration is a textbook example of how dominant powers can voluntarily surrender strategic positions — Europeans filled the Indian Ocean trade vacuum within a few generations.',
  },
  'qin-dynasty': {
    hook: 'The 15-year dynasty that invented "China" as a single state.',
    narrative: 'Qin Shi Huang unified the warring Chinese kingdoms in 221 BCE, standardized the script, the road gauge, and the currency, and built the first version of the Great Wall and his own terracotta army before dying in 210 BCE. The dynasty collapsed within four years of his death.',
    significance: 'The political unit "China" — single state, single script, single bureaucracy — dates from this brief, brutal dynasty. Even the western name "China" derives from "Qin".',
  },
  'mongol-empire': {
    hook: 'The largest contiguous land empire in human history, built by horse archers in a single century.',
    narrative: 'Founded by Genghis Khan around 1206, the Mongol Empire conquered most of Eurasia in two generations, from Korea to Hungary. It opened the Silk Road, transmitted gunpowder, paper, and the Black Death between China and Europe, and broke into successor khanates by the late 1200s.',
    significance: 'The Mongol "Pax Mongolica" enabled the first regular contact between East Asia and Europe — Marco Polo\'s journey was only possible because of it.',
  },
  'tibetan-empire': {
    hook: 'A 200-year Himalayan power that controlled the southern Silk Road and once sacked the Tang Chinese capital.',
    narrative: 'The Tibetan Empire (~618–842 CE) emerged from the unification of the Tibetan plateau under Songtsen Gampo. At its height it controlled the Tarim Basin oases and parts of modern Yunnan, Bengal, and Nepal, and in 763 briefly captured the Chinese capital of Chang\'an.',
    significance: 'It was during the imperial period that Buddhism took root in Tibet, beginning a religious tradition that survives today.',
  },
  'asia-maurya': {
    hook: 'The first empire to unify almost the entire Indian subcontinent.',
    narrative: 'Founded by Chandragupta Maurya around 322 BCE, the Mauryan Empire reached its peak under his grandson Ashoka, who controlled all of India except the southern tip. After the bloody conquest of Kalinga, Ashoka famously converted to Buddhism and inscribed his ethical edicts on stone pillars across the empire.',
    significance: 'Ashoka\'s pillars are some of the earliest surviving examples of imperial public communication — and his patronage launched Buddhism on its career as a world religion.',
  },
  'gupta-empire': {
    hook: 'India\'s "classical age" — when the decimal system, chess, and most of Hindu temple architecture were codified.',
    narrative: 'The Gupta Empire (~319–550 CE) ruled most of north India during a period of political stability that allowed extraordinary cultural and scientific output. The mathematician Aryabhata, the playwright Kalidasa, and the systematization of the Puranas all date from this era.',
    significance: 'The Indian numeral system — including the concept of zero — was developed under Gupta patronage; it reached the Islamic world around 800 CE and Europe by 1200.',
  },
  'mughal-early':           MUGHAL_EMPIRE,
  'asia-mughal-akbar':      MUGHAL_EMPIRE,
  'mughal-peak':            MUGHAL_EMPIRE,
  'asia-mughal-aurangzeb':  MUGHAL_EMPIRE,
  'mughal-late':            MUGHAL_EMPIRE,
  'delhi-sultanate': {
    hook: 'The Turko-Afghan Muslim dynasties that ruled most of north India for three centuries before the Mughals.',
    narrative: 'A succession of five dynasties (Mamluk, Khalji, Tughlaq, Sayyid, Lodi) ruled from Delhi between 1206 and 1526. They repelled the Mongols, briefly conquered most of the south under Muhammad bin Tughlaq, and presided over the establishment of Indo-Islamic architecture and Sufi traditions across the subcontinent.',
    significance: 'The Sultanate established Persian as the language of administration in north India and laid the political and cultural groundwork the Mughals would build on.',
  },

  // ── Caliphates ─────────────────────────────────────────────────────
  'rashidun-caliphate': {
    hook: 'The first 30 years of Islamic history — the conquests that built the Arab world.',
    narrative: 'Under Abu Bakr, Umar, Uthman, and Ali (632–661 CE), Arab armies conquered the Sasanian Empire, half of the Byzantine Empire, and most of North Africa. The killing of Uthman and the civil war over Ali\'s succession produced the Sunni–Shi\'a schism that still divides the Islamic world.',
    significance: 'The political and theological disputes of the first generation after the Prophet\'s death set the boundary lines for Islamic law, governance, and sectarian identity that persist today.',
  },
  'umayyad-caliphate': {
    hook: 'The dynasty that pushed the Caliphate from Spain to the Indus in less than a century.',
    narrative: 'The Umayyads ruled the Caliphate from Damascus from 661 to 750 CE, completing the conquests of North Africa and Spain in the west and the Sind in the east. Resentment over their Arab-aristocratic favoritism toward Syrian elites led to their overthrow by the Abbasid revolution.',
    significance: 'The Umayyad period set the territorial maximum the Caliphate ever reached as a single state — almost everything that followed was about managing fragmentation.',
  },
  'abbasid-caliphate': {
    hook: 'The Baghdad-based caliphate that presided over the Islamic Golden Age.',
    narrative: 'Founded in 750 CE after the overthrow of the Umayyads, the Abbasids made Baghdad the world\'s largest and richest city for two centuries. Under patronage from caliphs like Harun al-Rashid and al-Ma\'mun, scholars translated Greek philosophy, developed algebra, and built the first paper mills outside China.',
    significance: 'The "Translation Movement" of 8th–10th-century Baghdad preserved much of the Greek scientific corpus that medieval Europe would later rediscover via Arabic.',
  },
  'umayyad-cordoba': {
    hook: 'The exiled western branch of the Umayyads — al-Andalus at its height.',
    narrative: 'Founded by an Umayyad survivor of the Abbasid revolution, the Caliphate of Córdoba (929–1031) ruled most of the Iberian peninsula from a city of half a million people, with libraries, observatories, and a level of religious coexistence that made it a magnet for scholars across the Mediterranean.',
    significance: 'Christian, Muslim, and Jewish scholars in Córdoba and Toledo translated Arabic versions of Greek texts into Latin, beginning the chain of transmission that fueled the European 12th-century renaissance.',
  },

  // ── Steppe and Eurasia ─────────────────────────────────────────────
  'kyivan-rus': {
    hook: 'The Viking-founded Slavic state that became the medieval ancestor of Russia, Ukraine, and Belarus.',
    narrative: 'Kyivan Rus (~882–1240) was a federation of city-states centered on Kyiv, founded by Scandinavian Rus traders and ruled by their dynastic descendants. Its conversion to Orthodox Christianity in 988 brought the eastern Slavs into the Byzantine cultural sphere.',
    significance: 'Modern Russia, Ukraine, and Belarus all claim Kyivan Rus as their political and cultural ancestor — a contested heritage that continues to shape regional politics.',
  },
  'asia-khazar': {
    hook: 'A Turkic empire on the Volga whose ruling elite famously converted to Judaism.',
    narrative: 'From the 7th to the 10th centuries, the Khazars controlled the steppes between the Black and Caspian Seas, forming a key buffer against Arab expansion northward into Eastern Europe. Their elite\'s conversion to Judaism in the 8th century is one of the most unusual religious choices in medieval history.',
    significance: 'Khazar power blocked Arab armies from reaching the Volga and the Slavic north — without them, the religious geography of Eastern Europe might look very different.',
  },

  // ── Ottoman & Modern ──────────────────────────────────────────────
  'ottoman-early': OTTOMAN_EMPIRE,
  'ottoman-mid':   OTTOMAN_EMPIRE,
  'ottoman-peak':  OTTOMAN_EMPIRE,
  'ottoman-late':  OTTOMAN_EMPIRE,
  'safavid-empire': {
    hook: 'The Iranian dynasty that made Shi\'a Islam the state religion — and gave Iran its modern shape.',
    narrative: 'Founded in 1501, the Safavids ruled Iran and parts of Iraq, Afghanistan, and the Caucasus for two centuries, fighting a long cold war with the Sunni Ottomans to the west. Shah Abbas I (r. 1588–1629) made Isfahan one of the most beautiful cities in the world.',
    significance: 'The Safavid imposition of Twelver Shi\'ism on a previously largely Sunni Persian population is the reason Iran is the only large Shi\'a-majority state in the Islamic world today.',
  },
  'british-empire-1700': BRITISH_EMPIRE,
  'british-empire-1750': BRITISH_EMPIRE,
  'british-empire-1763': BRITISH_EMPIRE,
  'british-empire-1783': BRITISH_EMPIRE,
  'british-empire-1815': BRITISH_EMPIRE,
  'british-empire-1837': BRITISH_EMPIRE,
  'british-empire-1858': BRITISH_EMPIRE,
  'british-empire-1880': BRITISH_EMPIRE,
  'british-empire-1900': BRITISH_EMPIRE,
  'british-empire-1921': BRITISH_EMPIRE,
  'british-empire-1939': BRITISH_EMPIRE,
  'british-empire-1947': BRITISH_EMPIRE,
  'british-india':       BRITISH_EMPIRE,
  'british-india-1765':  BRITISH_EMPIRE,
  'british-india-1805':  BRITISH_EMPIRE,
  'british-india-1850':  BRITISH_EMPIRE,
  'british-colonial-africa': BRITISH_EMPIRE,
  'americas-british-thirteen-colonies':   BRITISH_EMPIRE,
  'americas-british-north-america-canada': BRITISH_EMPIRE,
  'french-colonial': {
    hook: "The world's second-largest colonial empire, built across two distinct phases on three continents.",
    narrative: "France's first colonial empire (Canada, Louisiana, the Caribbean, India) was largely lost to Britain by 1763. The second empire — Algeria from 1830, then most of West and Central Africa, Indochina, Madagascar, and the Levant — peaked in the 1930s and was dismantled by the wars of decolonization between 1954 and 1962.",
    significance: "French is still an official language in roughly 30 countries, and France's post-colonial relationships with West Africa (the \"Françafrique\") remain politically charged today.",
  },
  'spanish-americas':     SPANISH_EMPIRE,
  'spanish-philippines':  SPANISH_EMPIRE,

  // ── Empire of Japan (multi-slice) ──────────────────────────────────
  'empire-of-japan-1895': EMPIRE_OF_JAPAN,
  'empire-of-japan-1910': EMPIRE_OF_JAPAN,
  'empire-of-japan-1937': EMPIRE_OF_JAPAN,
  'empire-of-japan-1942': EMPIRE_OF_JAPAN,

  // ── Africa ─────────────────────────────────────────────────────────
  'africa-mali-empire': {
    hook: 'A West African gold empire whose 14th-century king was probably the richest individual in human history.',
    narrative: 'The Mali Empire (~1230–1670) controlled the goldfields of Bambouk and the trans-Saharan trade routes. Mansa Musa\'s 1324 hajj to Mecca, distributing so much gold along the way that he depressed the metal\'s price in Egypt for a decade, made Mali a household name in the medieval Mediterranean.',
    significance: 'Timbuktu under Mali was a major center of Islamic scholarship; its libraries preserved manuscripts that researchers are still cataloguing.',
  },
  'africa-songhai-empire': {
    hook: 'Mali\'s successor — and the largest state in pre-colonial African history.',
    narrative: 'The Songhai Empire (~1464–1591) absorbed Mali\'s territory and pushed further east, controlling the Niger Bend and the trans-Saharan trade for over a century. It fell when a Moroccan army crossed the Sahara with firearms and shattered the Songhai cavalry at the 1591 Battle of Tondibi.',
    significance: 'Songhai\'s collapse fragmented West African political power for two centuries and accelerated the transatlantic slave trade by destroying the regional state that had previously regulated it.',
  },
  'africa-aksumite-empire': {
    hook: 'A Christian trading kingdom on the Red Sea that minted its own coinage and is one of the four great powers of antiquity.',
    narrative: 'Aksum (~100 BCE–940 CE) controlled the Red Sea spice trade between Rome and India, converted to Christianity in the 4th century under King Ezana, and at its peak briefly held parts of Yemen. Decline followed the rise of Arab maritime power in the 7th century.',
    significance: 'Aksum is the political ancestor of modern Ethiopia — the only African country never colonized by a European power, and one of the oldest continuously Christian states in the world.',
  },

  // ── Americas ───────────────────────────────────────────────────────
  'inca-empire': {
    hook: 'The largest pre-Columbian empire in the Americas — built without writing, the wheel, or pack animals.',
    narrative: 'The Inca Empire (~1438–1533) controlled the Andean spine from southern Colombia to central Chile, linked by ~40,000 km of stone-paved roads and a runner-courier system. Spanish conquest in 1533 — leveraging civil war, smallpox, and surprise — ended it within months of Atahualpa\'s capture.',
    significance: 'Inca administrative records were kept in quipu (knotted strings); only a fraction have been deciphered, and they remain one of the great open puzzles of pre-Columbian historiography.',
  },
  'aztec-empire': {
    hook: 'The Triple Alliance — three Nahuatl-speaking city-states that ruled most of central Mexico for a century.',
    narrative: 'Founded in 1428 by Tenochtitlan, Texcoco, and Tlacopan, the Aztec Empire extracted tribute from a population of perhaps 5–6 million people across central and southern Mexico. Cortés arrived in 1519 and Tenochtitlan fell in 1521, helped enormously by Indigenous allies who had no love for the Aztec tribute system.',
    significance: 'The Aztec capital, built on an island in Lake Texcoco, was one of the largest cities in the world in 1519 — Spanish chroniclers described it as more impressive than any city in Europe.',
  },
};

/**
 * Return curated content for an empire id, or undefined if none exists.
 * Lookup is plain-string equality on the id.
 */
export function getEmpireDescription(id: string): EmpireDescription | undefined {
  return DESCRIPTIONS[id];
}

/**
 * For UI testing / debug — returns the count of empires we've curated.
 */
export const CURATED_EMPIRE_COUNT = Object.keys(DESCRIPTIONS).length;
