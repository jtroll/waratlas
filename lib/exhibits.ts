/**
 * Curated exhibits — guided routes through the atlas. Each stop seeks the
 * timeline, optionally flies the camera and selects a conflict or empire,
 * and shows an editorial blurb. The welcome tour is the first exhibit;
 * the rest are thematic. app/page.tsx wires `#exhibit=<id>` to
 * <OpeningTour exhibitId=...> and lists EXHIBITS in the Tour menu.
 *
 * Editorial rules for stop copy: ~45 words, one concrete date or number
 * per blurb, no superlatives the record can't support. Casualty figures
 * are quoted as the ranges historians actually use. Where a conflict or
 * empire record exists, the stop links to it; the ids are verified by
 * tests/exhibits.test.ts against data/conflicts.json and data/empires.json.
 */
import stats from '@/lib/generated/stats.json';

export interface ExhibitStop {
  /** Year to seek to; null keeps the current year (intro stops). */
  year: number | null;
  title: string;
  shortTitle: string;
  blurb: string;
  /** Seconds to hold when auto-advancing. */
  hold: number;
  /** [minLng, minLat, maxLng, maxLat] to fly to; null keeps the camera. */
  bbox?: [number, number, number, number] | null;
  /** Optional conflict id to select at this stop. */
  conflictId?: string;
  /** Optional empire id to select at this stop. */
  empireId?: string;
}

export interface Exhibit {
  id: string;
  title: string;
  /** One-line description for menus. */
  summary: string;
  stops: ExhibitStop[];
}

const STAT_CONFLICTS = `over ${(Math.floor(stats.conflicts / 1000) * 1000).toLocaleString('en-US')} conflicts`;
const STAT_EMPIRES = `${Math.floor(stats.empires / 100) * 100}+ empires`;

const WELCOME: Exhibit = {
  id: 'welcome',
  title: 'Welcome to War Atlas',
  summary: 'A ten-stop introduction across 5,000 years.',
  stops: [
    {
      year: null, title: 'Welcome to War Atlas', shortTitle: 'Start',
      blurb: `An interactive cartography of thousands of named wars across 5,000 years of history — ${STAT_CONFLICTS} and ${STAT_EMPIRES}. Scrub the timeline at the bottom to watch borders shift; click a polygon for empire detail, click a red dot for a conflict.`,
      hold: 12,
      bbox: [-160, -50, 180, 55],
    },
    {
      year: -2500, title: 'Cradle of cities', shortTitle: 'Cradle',
      blurb: 'Bronze Age Sumer, Egypt, and the Indus Valley fight the first wars we can name. Walls go up around the world’s earliest cities; civilization and conflict arrive together.',
      hold: 12,
      bbox: [22, 5, 80, 35],
    },
    {
      year: -490, title: 'Greco-Persian Wars', shortTitle: 'Greco-Persian',
      blurb: 'A coalition of Greek city-states halts the largest empire the world has yet seen. The Persian invasions force Athens, Sparta, and their neighbours into a fragile alliance.',
      hold: 12,
      bbox: [18, 20, 60, 40],
    },
    {
      year: -100, title: 'Two empires emerge', shortTitle: 'Two empires',
      blurb: 'Rome and Han China industrialize war on opposite ends of Eurasia, professional armies remaking the political map of half the world.',
      hold: 12,
      bbox: [-10, 8, 130, 45],
    },
    {
      year: 632, title: 'Arab conquests', shortTitle: 'Caliphate',
      blurb: 'In a century, the Caliphate reaches from Spain to the Indus. The Mediterranean is cut in half; the Sasanian Empire ceases to exist.',
      hold: 12,
      bbox: [-12, 0, 75, 38],
    },
    {
      year: 1240, title: 'Mongol century', shortTitle: 'Mongol',
      blurb: 'The largest contiguous land empire in history takes shape from the steppe. From Korea to Hungary, the rules of war and statecraft are rewritten in a generation.',
      hold: 12,
      bbox: [18, 8, 130, 48],
    },
    {
      year: 1521, title: 'Conquest of the Americas', shortTitle: 'Americas',
      blurb: 'Cortés enters Tenochtitlan; the demographic catastrophe of the Columbian exchange begins. New diseases and gunpowder collapse millennia-old civilizations within decades.',
      hold: 12,
      bbox: [-125, -55, -34, 50],
    },
    {
      year: 1815, title: 'Long peace, hidden wars', shortTitle: 'Long peace',
      blurb: 'Europe stabilizes after Napoleon while colonial wars expand across Africa, India, the Pacific. Great-power peace abroad coexists with industrial-scale conquest elsewhere.',
      hold: 12,
      bbox: [-15, 0, 95, 55],
    },
    {
      year: 1944, title: 'World War II', shortTitle: 'World War II',
      blurb: 'The deadliest conflict in human history reshapes the political map. By 1944 the Soviets push west, the Allies have landed in Normandy, and empires are about to dissolve.',
      hold: 12,
      bbox: [-15, 32, 50, 60],
    },
    {
      year: 1989, title: 'After the Cold War', shortTitle: 'After',
      blurb: 'Civil wars and insurgencies replace state-on-state conflict as the dominant form. The map gets denser even as the great powers fight each other less.',
      hold: 12,
      bbox: [-130, -50, 170, 65],
    },
  ],
};

const MONGOL_CENTURY: Exhibit = {
  id: 'mongol-century',
  title: 'The Mongol century',
  summary: 'From a kurultai on the Onon to four rival khanates, 1206–1294.',
  stops: [
    {
      year: 1206, title: 'A kurultai on the Onon', shortTitle: 'Onon 1206',
      blurb: 'After twenty years of steppe warfare Temüjin is proclaimed Genghis Khan at an assembly on the Onon river. He breaks the old tribal units into decimal regiments and writes a law code, the Yasa. The army that results has no peer for two centuries.',
      hold: 14,
      bbox: [86, 40, 124, 55],
      conflictId: 'conquests-of-genghis-khan',
      empireId: 'mongol-empire',
    },
    {
      year: 1220, title: 'The Khwarazmian catastrophe', shortTitle: 'Khwarazm',
      blurb: 'The Khwarazm-Shah executes a Mongol trade mission at Otrar in 1218. Retribution follows in 1219–21: Bukhara and Samarkand fall in 1220, Urgench and Merv in 1221. Persian chroniclers put the dead in the hundreds of thousands per city — figures modern historians read as literary, not census.',
      hold: 14,
      bbox: [50, 27, 80, 47],
      conflictId: 'khorasan-conquest-genghis',
    },
    {
      year: 1223, title: 'Kalka', shortTitle: 'Kalka 1223',
      blurb: 'Jebe and Subutai ride around the Caspian on a reconnaissance in force. On the Kalka river in May 1223 they destroy a coalition of Rus’ princes and Cumans, then turn for home. The Rus’ chronicles record the disaster but not who the horsemen were.',
      hold: 14,
      bbox: [26, 42, 50, 56],
      conflictId: 'battle-of-the-kalka-river',
    },
    {
      year: 1241, title: 'Legnica and Mohi', shortTitle: 'Europe 1241',
      blurb: 'Batu’s western campaign takes Kyiv in 1240 and enters Europe in 1241. On 9 April a Polish–German army is destroyed at Legnica; two days later Béla IV of Hungary is routed at Mohi. The Mongols withdraw the next spring, after news that Ögedei has died.',
      hold: 14,
      bbox: [12, 42, 42, 56],
      conflictId: 'battle-of-mohi',
      empireId: 'asia-golden-horde',
    },
    {
      year: 1258, title: 'Baghdad', shortTitle: 'Baghdad 1258',
      blurb: 'Hülegü besieges Baghdad in January 1258; the city surrenders on 10 February. The last Abbasid caliph, al-Musta‘sim, is executed and the five-century caliphate ends. Contemporary estimates of the dead range from tens of thousands to several hundred thousand.',
      hold: 14,
      bbox: [36, 27, 58, 40],
      conflictId: 'baghdad-siege-1258',
      empireId: 'asia-ilkhanate',
    },
    {
      year: 1260, title: 'Ain Jalut', shortTitle: 'Ain Jalut',
      blurb: 'Möngke’s death in 1259 pulls Hülegü east with most of his army. At Ain Jalut in Galilee, on 3 September 1260, the Mamluk sultan Qutuz and his general Baybars defeat the detachment left under Kitbuqa — the first decisive Mongol defeat, and the limit of their reach into the Levant.',
      hold: 14,
      bbox: [29, 27, 44, 37],
      conflictId: 'aibiging-battle',
      empireId: 'mena-mamluk-sultanate',
    },
    {
      year: 1279, title: 'Yamen and the fall of the Song', shortTitle: 'Song falls',
      blurb: 'Kublai proclaims the Yuan dynasty in 1271 while his armies grind through the Song defences: Xiangyang holds out for five years before falling in 1273. On 19 March 1279 the last Song fleet is destroyed at Yamen and the child emperor drowns. China is reunified — under a Mongol dynasty.',
      hold: 14,
      bbox: [96, 17, 124, 42],
      conflictId: 'battle-of-yamen',
      empireId: 'yuan-dynasty',
    },
    {
      year: 1294, title: 'Four khanates', shortTitle: 'Four khanates',
      blurb: 'When Kublai dies in 1294 the empire is already four states: the Yuan in China, the Ilkhanate in Persia, the Golden Horde on the Volga, and the Chagatai Khanate in Central Asia. Kaidu’s thirty-year war against Kublai had made the split permanent; the Great Khan’s title was by now a courtesy.',
      hold: 14,
      bbox: [22, 12, 140, 60],
      conflictId: 'kaidu-kublai-war',
      empireId: 'asia-chagatai-khanate',
    },
  ],
};

const SCRAMBLE_FOR_AFRICA: Exhibit = {
  id: 'scramble-for-africa',
  title: 'The scramble for Africa',
  summary: 'Thirty-five years in which a continent was partitioned, 1879–1914.',
  stops: [
    {
      year: 1879, title: 'Isandlwana', shortTitle: 'Isandlwana',
      blurb: 'In 1879 Britain invades the Zulu kingdom on a pretext. On 22 January a Zulu army destroys a British column at Isandlwana — some 1,300 killed, the worst colonial defeat of the century. Ulundi is burned in July; Cetshwayo is exiled. The pattern of the next three decades is set: early shock, then overwhelming force.',
      hold: 14,
      bbox: [26, -32, 34, -25],
      conflictId: 'anglo-zulu-war',
      empireId: 'africa-zulu-kingdom',
    },
    {
      year: 1885, title: 'Berlin, and the Congo Free State', shortTitle: 'Berlin 1885',
      blurb: 'Fourteen powers meet in Berlin from November 1884 to February 1885. No African is present. The conference sets the rule of “effective occupation” and recognises the Congo basin as the personal possession of Leopold II of Belgium. Over the next twenty years the rubber regime there kills, by the most-cited estimates, millions.',
      hold: 14,
      bbox: [8, -14, 32, 6],
      conflictId: 'belgian-conquest-of-congo-free-state',
      empireId: 'belgian-congo',
    },
    {
      year: 1896, title: 'Adwa: the exception', shortTitle: 'Adwa 1896',
      blurb: 'Italy tries to turn a protectorate treaty into a colony. On 1 March 1896 Menelik II meets Baratieri’s army at Adwa with perhaps 100,000 men, many armed with modern rifles bought from the Europeans themselves, and destroys it. The Treaty of Addis Ababa recognises Ethiopian independence — the only such outcome of the scramble.',
      hold: 14,
      bbox: [33, 3, 48, 18],
      conflictId: 'battle-of-adwa-italian-theater',
      empireId: 'africa-ethiopian-empire-menelik',
    },
    {
      year: 1898, title: 'Omdurman', shortTitle: 'Omdurman',
      blurb: 'The Mahdist state, born when Muhammad Ahmad’s followers took Khartoum and killed Gordon in January 1885, lasts thirteen years. On 2 September 1898 Kitchener’s Maxim guns and artillery kill about 11,000 Mahdist soldiers outside Omdurman for 48 British and Egyptian dead. Sudan becomes an Anglo-Egyptian condominium.',
      hold: 14,
      bbox: [28, 11, 40, 22],
      conflictId: 'battle-of-omdurman',
    },
    {
      year: 1903, title: 'Sokoto', shortTitle: 'Sokoto 1903',
      blurb: 'The Sokoto Caliphate, the largest state in nineteenth-century West Africa, falls to Lugard’s small columns: Kano on 3 February 1903, Sokoto on 15 March. Caliph Attahiru is killed at Burmi in July. Britain then rules through the emirs — “indirect rule” becomes the template for Northern Nigeria and beyond.',
      hold: 14,
      bbox: [2, 5, 15, 15],
      conflictId: 'anglo-sokoto-war',
      empireId: 'africa-sokoto-caliphate',
    },
    {
      year: 1904, title: 'Herero and Nama', shortTitle: 'Herero 1904',
      blurb: 'The Herero rise against German rule in January 1904; the Nama follow in October. After the Waterberg, General von Trotha orders that every Herero be shot or driven into the Omaheke desert. Roughly 65,000 of 80,000 Herero and 10,000 Nama die, many in camps. Germany formally recognised it as genocide in 2021.',
      hold: 14,
      bbox: [11, -29, 25, -17],
      conflictId: 'herero-nama-genocide',
      empireId: 'german-colonial-empire',
    },
    {
      year: 1905, title: 'Maji Maji', shortTitle: 'Maji Maji',
      blurb: 'In German East Africa a cotton-labour regime provokes a rising across twenty peoples in July 1905, united by the prophet Kinjikitile’s promise that sacred water would turn bullets to rain. Germany answers with scorched earth. The famine that follows kills far more than the fighting: estimates run from 75,000 to 300,000.',
      hold: 14,
      bbox: [29, -12, 41, -1],
      conflictId: 'maji-maji-rebellion',
      empireId: 'german-east-africa',
    },
    {
      year: 1914, title: 'The map in 1914', shortTitle: '1914',
      blurb: 'On the eve of the First World War only Ethiopia and Liberia remain independent. Britain and France hold most of the continent; Germany, Portugal, Belgium, Italy and Spain the rest. The borders drawn in these years — often straight lines across peoples — are, with few changes, the borders of Africa today.',
      hold: 14,
      bbox: [-20, -36, 52, 38],
      empireId: 'british-colonial-africa',
    },
  ],
};

const WORLD_WARS: Exhibit = {
  id: 'world-wars',
  title: 'The world wars',
  summary: 'Sarajevo to Hiroshima, and the map that followed, 1914–1945.',
  stops: [
    {
      year: 1914, title: 'Sarajevo to the Marne', shortTitle: '1914',
      blurb: 'Franz Ferdinand is shot in Sarajevo on 28 June 1914; five weeks of ultimatums and mobilisation timetables turn a Balkan crisis into a European war. Germany’s sweep through Belgium is stopped on the Marne in September. By December the front runs, entrenched, from the Channel to Switzerland.',
      hold: 14,
      bbox: [-5, 42, 25, 55],
      conflictId: 'world-war-1',
    },
    {
      year: 1916, title: 'Verdun and the Somme', shortTitle: '1916',
      blurb: 'Two battles define the war’s attrition. Verdun, February to December 1916, costs France and Germany about 700,000 casualties between them for no change in the line. On the Somme the British Army suffers 57,000 casualties on the first day, 1 July; the offensive ends in November with over a million casualties on both sides.',
      hold: 14,
      bbox: [-2, 46, 10, 52],
      conflictId: 'battle-verdun',
    },
    {
      year: 1917, title: 'The Eastern Front collapses', shortTitle: '1917',
      blurb: 'Russia has lost more men than any belligerent. The February Revolution removes the Tsar; the July offensive fails; in October the Bolsheviks seize Petrograd and sue for peace. Brest-Litovsk in March 1918 cedes Poland, the Baltics and Ukraine. The civil war that follows kills between seven and twelve million.',
      hold: 14,
      bbox: [15, 42, 60, 65],
      conflictId: 'eastern-front-wwi',
    },
    {
      year: 1918, title: '1918', shortTitle: '1918',
      blurb: 'Germany’s spring offensives gain more ground than any since 1914 and exhaust the army doing it. From Amiens on 8 August the Allies advance continuously. The armistice takes effect at 11 a.m. on 11 November. Nine to ten million soldiers are dead, and four empires — Romanov, Habsburg, Hohenzollern, Ottoman — are gone within a year.',
      hold: 14,
      bbox: [-5, 42, 30, 56],
      conflictId: 'battle-of-amiens-1918',
    },
    {
      year: 1936, title: 'Manchuria, Ethiopia, Spain', shortTitle: 'Interwar',
      blurb: 'The peace unravels in a sequence. Japan seizes Manchuria in September 1931 and leaves the League of Nations. Italy invades Ethiopia in October 1935, using mustard gas, and takes Addis Ababa in May 1936. In July 1936 a military rising begins the Spanish Civil War, where German and Italian aircraft bomb Guernica the next April.',
      hold: 14,
      bbox: [-12, 0, 135, 55],
      conflictId: 'spanish-civil-war',
      empireId: 'empire-of-japan-1937',
    },
    {
      year: 1940, title: '1939–41', shortTitle: '1939–41',
      blurb: 'Germany invades Poland on 1 September 1939, a week after the pact with Moscow that partitions it. Denmark, Norway, the Low Countries and France fall between April and June 1940; Britain holds through the summer air battle. In June 1941 three million Axis troops cross into the Soviet Union, and in December Japan strikes Pearl Harbor.',
      hold: 14,
      bbox: [-10, 35, 40, 62],
      conflictId: 'battle-britain',
      empireId: 'third-reich-1941',
    },
    {
      year: 1942, title: 'Stalingrad and Midway', shortTitle: 'The turn',
      blurb: 'The war turns in the second half of 1942. At Midway in June the US Navy sinks four Japanese fleet carriers. At El Alamein in November the Afrika Korps is driven back for good. On the Volga the German Sixth Army is encircled in November and surrenders on 2 February 1943 — around 90,000 prisoners from an army of a quarter million.',
      hold: 14,
      bbox: [28, 38, 62, 58],
      conflictId: 'battle-stalingrad',
      empireId: 'third-reich-1942',
    },
    {
      year: 1945, title: '1945, and the map that followed', shortTitle: '1945',
      blurb: 'Berlin falls on 2 May; Germany surrenders on 8 May. Hiroshima is bombed on 6 August, Nagasaki on 9 August, the day the Red Army enters Manchuria; Japan surrenders on 15 August. Between 50 and 85 million people are dead, most of them civilians. The map that follows has an Iron Curtain across Europe — and, within two decades, more than fifty new states.',
      hold: 14,
      bbox: [-15, 28, 150, 66],
      conflictId: 'world-war-2',
    },
  ],
};

export const EXHIBITS: readonly Exhibit[] = [WELCOME, MONGOL_CENTURY, SCRAMBLE_FOR_AFRICA, WORLD_WARS];

export const DEFAULT_EXHIBIT_ID = WELCOME.id;

export function getExhibit(id: string | null | undefined): Exhibit | null {
  if (!id) return null;
  return EXHIBITS.find((e) => e.id === id) ?? null;
}
