import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog · War Atlas',
  description:
    'A running log of dataset and atlas updates: border revisions, new conflicts, methodology changes.',
};

/**
 * Public changelog. Linked from AboutModal and from /sources. Each entry
 * is a single revision (date-stamped, optionally tagged with a semver-ish
 * label). Entries are listed newest-first.
 *
 * To add an entry: prepend a new <Entry> block at the top of the list.
 * Keep the prose short — link to a PR / commit / sources page section
 * for the full story.
 */
export default function ChangelogPage() {
  return (
    <>
      {/* globals.css locks html/body with overflow:hidden so the map page can
          pin its viewport. Prose pages need normal document scrolling — keyboard
          scroll keys, scroll restoration on back-nav, and mobile momentum
          scrolling all break with an inner scroll container. Override per-page. */}
      <style>{`html, body { overflow: auto !important; height: auto !important; }`}</style>
      <main
        className="min-h-screen px-6 py-10 sm:py-14"
        style={{ background: 'var(--ink-0, #06090f)', color: 'var(--ink-text, #ece3d3)' }}
      >
      <article className="mx-auto" style={{ maxWidth: 720 }}>
        <header className="mb-10">
          <Link
            href="/"
            className="font-mono inline-block mb-6"
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'var(--ink-muted, #9ca3af)',
              textTransform: 'uppercase',
              textDecoration: 'none',
              borderBottom: '1px solid currentColor',
              paddingBottom: 2,
            }}
          >
            ← Back to the atlas
          </Link>
          <h1
            className="font-display"
            style={{ fontSize: 40, fontWeight: 400, lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em' }}
          >
            <span style={{ fontStyle: 'italic', color: 'var(--vermilion, #c8553b)' }}>Changelog</span>
          </h1>
          <p
            className="font-display italic mt-3"
            style={{ fontSize: 17, color: 'var(--ink-text-2, #d1d5db)', lineHeight: 1.5 }}
          >
            Dataset revisions, border corrections, and methodology changes — newest first.
          </p>
        </header>

        {/* ───── Entries (newest first) ───── */}

        <Entry date="30 May 2026" tag="r12 · indigenous Americas">
          <p>
            A deep expansion of indigenous-American polities took the empire
            layer from <strong>356 to 427 borders</strong>. ~70 pre-Columbian and
            historic Native American polities were added across the whole
            timeline (c. 3000&nbsp;BCE–1900&nbsp;CE): the Andean sequence
            (Caral, Chavín, Moche, Nazca, Sicán, Chachapoya, the Aymara
            kingdoms), Amazonia (Marajoara, Casarabe and Upano from recent
            LIDAR work), and the North American peoples (Poverty Point, the
            Mississippian variants, the Southeast confederacies, the Plains
            nations, Pacific Northwest, and Thule).
          </p>
          <ul>
            <li>
              The single <em>Maya Classic</em> blob was <strong>split into named
              hegemonies</strong> — Tikal, Calakmul/Kaan, Palenque, Copán,
              Caracol, El Mirador — three carrying solid borders. <strong>Inca
              and Chimú</strong> borders were upgraded from approximate to
              scholarly polygons from{' '}
              <a href="https://doi.org/10.5281/zenodo.13363121" target="_blank" rel="noopener noreferrer">Cliopatria (Seshat)</a>{' '}
              (CC&nbsp;BY&nbsp;4.0); the rest were hand-traced from Waldman, the
              Smithsonian <em>Handbook</em>, Coe &amp; Koontz, D&apos;Altroy and
              Martin &amp; Grube.
            </li>
            <li>
              Almost all the new borders are <strong>dashed (approximate)</strong>
              — pre-Columbian frontiers genuinely aren&apos;t precise — which
              shifted the dataset to ≈36% solid. Every polygon passed geometry,
              historian, and visual review. Also corrected: the empire counter
              (was a stale 376) and the historical-basemaps license on the
              sources page (it is GPL-3.0, not CC&nbsp;BY-SA).
            </li>
          </ul>
        </Entry>

        <Entry date="30 May 2026" tag="r11 · dataset expansion">
          <p>
            The conflict dataset more than quadrupled, from{' '}
            <strong>2,571 to 10,584 conflicts</strong>. A first pass added{' '}
            <strong>270 hand-verified conflicts</strong> concentrated in
            historically under-represented regions (pre-colonial Americas,
            sub-Saharan Africa, Pacific/Oceania, Southeast Asia), each
            cross-checked against citable scholarly sources. A second pass then
            bulk-ingested the <strong>Historical Conflict Event Dataset</strong>{' '}
            (Miller &amp; Bakar 2023), adding <strong>~8,000 geocoded
            battles</strong> spanning 1468&nbsp;BCE–2003.
          </p>
          <ul>
            <li>
              The HCED battles are shown at <strong>importance 2</strong> —
              visible by default but hidden once the map's importance filter is
              raised, so the curated high-level view stays uncluttered. They
              carry <code>casualties: null</code> where no reliable figure
              exists, never an invented number.
            </li>
            <li>
              A 100-record sampled audit found <strong>97–98% accuracy</strong>{' '}
              with no fabricated events; 39 entries that geocoded to the wrong
              continent were removed, and a coordinate caveat plus the full
              dataset citations (HCED, Wikidata, UCDP, Brecke) were added to
              the <a href="/sources">sources page</a>.
            </li>
          </ul>
        </Entry>

        <Entry date="18 May 2026" tag="r10 · empire dedup">
          <p>
            A user reported a duplicate Merina Kingdom polygon on
            Madagascar — clicking the orange highlands hexagon and the
            green island-outline both surfaced the same 1540–1897
            kingdom. A scan across all 376 empire polygons turned up
            <strong>20 duplicate pairs</strong> total, mostly from an
            old ID-renaming pass that had left both old- and new-format
            IDs in place. All 20 collapsed in two rounds.
          </p>
          <ul>
            <li>
              <strong>Round 1 (7 pairs) — name/date-identical
              dupes.</strong>{' '}
              <em>Northern Song Dynasty</em> (213-vertex polygon
              duplicated under both <code>asia-song-northern</code> and{' '}
              <code>song-dynasty-northern</code>), <em>Southern Song
              Dynasty</em>, <em>Ming Dynasty</em>,{' '}
              <em>Aztec Empire</em>, <em>Luba Empire</em>,{' '}
              <em>Merina Kingdom</em> (the one the reader caught), and{' '}
              <em>Kingdom of Benin</em>. For each pair, kept the
              higher-vertex-count polygon, merged the other's metadata
              in, and dropped the duplicate <code>empire-wikipedia.json</code>{' '}
              entry.
            </li>
            <li>
              <strong>Round 2 (13 pairs) — same-polity, different
              polygons or slightly different dates.</strong> Goguryeo
              Kingdom, Maya Classic Period, Ghana Empire, Tiwanaku
              Empire, Wari Empire, Mixtec Kingdoms, Srivijaya Empire,
              Chola Empire, Pagan Kingdom, Chimú Empire, Mutapa Empire,
              Inca Empire, Kingdom of Zimbabwe. Several of the killer
              entries even had{' '}
              <code>source: &ldquo;… (duplicate)&rdquo;</code>{' '}
              already noted in the metadata — explicit acknowledgement
              of the bug that just hadn't been cleaned up. For each
              pair: kept the higher-vertex-count polygon, took the
              widest date span between the two, used the canonical
              Wikipedia title for the name, merged the other's
              metadata in.
            </li>
            <li>
              <strong>Naming fixes that fell out of the dedup.</strong>{' '}
              <em>Imerina (Kingdom of Madagascar)</em> →{' '}
              <em>Merina Kingdom</em> (canonical Wikipedia title);
              {' '}<em>Tiwanaku</em> → <em>Tiwanaku Empire</em>;{' '}
              <em>Wari / Huari Empire</em> → <em>Wari Empire</em> (the
              other transliteration is now redirect-only on Wikipedia);
              {' '}<em>Chimú Kingdom</em> → <em>Chimú Empire</em>;{' '}
              <em>Inca Empire / Tawantinsuyu</em> → <em>Inca Empire</em>{' '}
              (Wikipedia uses Inca Empire as primary, Tawantinsuyu as
              redirect); <em>Srivijaya</em> →{' '}
              <em>Srivijaya Empire</em>; <em>Luba Kingdom</em> →{' '}
              <em>Luba Empire</em>.
            </li>
            <li>
              <strong>Date corrections that fell out.</strong>{' '}
              <em>Mixtec Kingdoms</em> end year corrected 1500 → 1521
              (Spanish conquest); <em>Kingdom of Zimbabwe</em> start year
              broadened 1220 → 1100 (the archaeological evidence at
              Great Zimbabwe puts initial monumental construction in
              the 12th century, well before the 1220 dynastic terminus
              post quem). The other date pairs (Ghana, Tiwanaku, Wari)
              also had slight discrepancies between the two duplicates
              and the wider span was retained.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Empire count: 376 → 356 (−20). <code>empire-wikipedia.json</code>{' '}
            362 → 352 entries (−10; only half the dupes had wiki entries
            on both sides). All IDs unique; all wiki keys point at
            existing empire features. Backups at{' '}
            <code>backups/empires_20260518_151232_pre_dedup.json</code>{' '}
            and <code>backups/empire-wikipedia_20260518_151232_pre_dedup.json</code>.
          </p>
        </Entry>

        <Entry date="18 May 2026" tag="r9 · africa cleanup">
          <p>
            Same-day follow-up to r8. The seven follow-ups documented in
            the original Africa audit report were all worked through in
            one cleanup pass — URL re-checking, aggregate-parent
            consolidation, partOf cross-linking, low-confidence review,
            a continent-wide coordinate axis-swap audit, &ldquo;Great
            Lakes&rdquo; tag disambiguation, and two non-canonical URL
            retargets. Pre-cleanup backup at{' '}
            <code>backups/conflicts_20260518_141045_pre_africa_cleanup.json</code>.
          </p>
          <ul>
            <li>
              <strong>Wikipedia URL verification, finished.</strong> The
              326 rate-limited URLs from r8 were re-checked in three
              chunked-serial passes. Cumulative result across all 784
              audit-added entries: 671 confirmed 200, 112 confirmed 404
              (of which 98 were patched to canonical articles and 14
              nulled out because no English Wikipedia article exists for
              the event), 0 still rate-limited. Random 30-URL spot-check
              of the patched links returned 30/30 200-OK. Patterns
              discovered: figure-centric redirects (Anglo-Buganda war →
              Mwanga II of Buganda), operation-name overrides (Nyadzonia
              Raid → Operation Eland, Matola Raid → Operation Beanbag,
              Gafsa Raid → 1980 Gafsa Uprising), and umbrella roll-ups
              for battles without standalone articles (Battle of Osogbo
              and Battle of Ijaye both live inside Yoruba Wars).
            </li>
            <li>
              <strong>Aggregate-parent consolidation.</strong> Nine
              duplicate-event clusters merged into single records,
              keeping the higher-importance entry and adopting locations
              and Wikipedia URLs from the deleted record: Sokoto Jihad
              (2→1), Tigray War 2020 (2→1), Herero/Nama Genocide (3→1),
              Third Anglo-Asante (2→1), South Sudanese Civil War (2→1),
              Saadi/Saadian Conquest of Songhai (2→1), Songhai-Mali
              Wars (2→1), Eritrean War of Independence (2→1),
              Roman-Kushite War (2→1). Ten records deleted; zero broken
              <code>partOf</code> refs left dangling.
            </li>
            <li>
              <strong><code>partOf</code> cross-linking pass.</strong>{' '}
              <code>partOf</code> edges went from 59 in the file to 245
              (+180 set on 239 entries). 27 hand-curated umbrellas got
              children linked: Punic Wars (3), Italo-Ethiopian (12),
              Boer Wars (11), Anglo-Ashanti (6), Aksum expansion (7),
              Axumite Arabian invasions (3), Songhai expansion (5),
              Kongo-Portuguese (14), Kongo Civil War (4),
              Portuguese-Njinga (3), Sokoto Caliphate (6), Mahdist War,
              Anglo-Zulu battles (6), Mfecane sub-events, Border War
              operations (8), Angolan Civil War, Force Publique
              campaigns, Congo Crisis, East African campaigns (WWI and
              WWII), Maji Maji, Yoruba Civil Wars, plus Cameroon and
              Eritrea. A separate auto-suggestion script proposed 74
              additional links; after hand-review 53 were applied and
              21 rejected as false-positive collisions (the Boer-War
              battle of Bothaville was being matched to the Belgian
              Conquest of the Congo Free State via the &ldquo;free
              state&rdquo; token, since both Orange Free State and
              Congo Free State trip the keyword).
            </li>
            <li>
              <strong>Cape Frontier Wars made a proper series.</strong>{' '}
              The r8 audit had landed seven of the nine wars as
              individual entries; the cleanup added the missing{' '}
              <em>Second Cape Frontier War (1789–93)</em> and{' '}
              <em>Seventh Cape Frontier War (1846–47)</em>, created the{' '}
              <code>cape-frontier-wars</code> umbrella (1779–1879,
              importance 2), and linked all nine via <code>partOf</code>.
            </li>
            <li>
              <strong>Low-confidence review.</strong> Of the 45
              low-confidence entries flagged at audit-merge time, 8 were
              dropped: <code>kongo-expansion-under-lukeni-lua-nimi</code>{' '}
              and <code>luba-empire-expansion-under-kalala-ilunga</code>{' '}
              (legendary chronicle entries),{' '}
              <code>mapungubwe-decline-conflicts</code>,{' '}
              <code>takrur-foundation-conflicts</code>,{' '}
              <code>sailors-of-oman-in-pemba-and-lamu</code>,{' '}
              <code>tio-bobangi-conflicts</code>, <code>bemba-wars</code>,
              and <code>loango-expansion</code> (all umbrellas without
              named events, or gradual displacements rather than
              discrete wars). The remaining 37 low-confidence entries
              are kept; they're real but thinly-sourced.
            </li>
            <li>
              <strong>Coordinate axis-swap audit, atlas-wide.</strong>{' '}
              Three-heuristic scan across all 2,316 post-audit entries:
              0 entries had |lon| &gt; 180 or |lat| &gt; 90; 23
              country-bbox candidates of which 22 were false positives
              (Italian wars fought in Eritrea, Portuguese wars in
              Mozambique). Found <strong>one</strong> true swap and
              fixed it: <em>Franco-Prussian War</em>, coords were{' '}
              <code>[48.8566, 2.3522]</code> (lat-lon swapped Paris),
              corrected to <code>[2.3522, 48.8566]</code>.
            </li>
            <li>
              <strong>&ldquo;Great Lakes&rdquo; disambiguation.</strong>{' '}
              Three entries used the ambiguous tag <code>Great Lakes</code>{' '}
              in their <code>locations</code> array; renamed to{' '}
              <code>African Great Lakes</code> (Bantu expansion) or{' '}
              <code>North American Great Lakes</code> (Iroquois conflicts).
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Conflict count: 2,316 → 2,301 (−15 net: −10 dedup deletes,
            −8 low-confidence deletes, +3 new entries — Cape Frontier
            umbrella plus Second and Seventh Frontier Wars). Schema
            valid; zero broken <code>partOf</code> refs; 239 entries
            with <code>partOf</code> set, 245 partOf edges. URL
            spot-check 30/30 200-OK on patched links.
          </p>
        </Entry>

        <Entry date="18 May 2026" tag="r8 · africa audit">
          <p>
            Sister audit to r7. Reader feedback had flagged Africa
            coverage as patchy outside the colonial-era set pieces;
            audited the continent sliced by{' '}
            <em>{'{north, west, east, central, south}'} × {'{ancient, medieval, early modern, colonial, post-1945}'}</em>{' '}
            — a 25-cell matrix. Reference list of 965 candidate named
            wars compiled by five parallel sub-agents (one per
            sub-region), anchored against UNESCO{' '}
            <em>General History of Africa</em>, Cambridge{' '}
            <em>History of Africa</em>, Iliffe, Vansina, Thornton,
            Reid on E. Africa, Pakenham, Vandervort, the Correlates
            of War dataset, and the Wikipedia category trees. Full
            methodology in{' '}
            <a href="https://github.com/jtroll/waratlas/blob/main/AFRICA_AUDIT_2026-05-18.md" target="_blank" rel="noopener noreferrer">
              AFRICA_AUDIT_2026-05-18.md
            </a>.
          </p>
          <ul>
            <li>
              <strong>784 named African wars added.</strong> Pre-audit
              coverage (inclusive classifier) was 914 of 1,532
              conflicts. Thinnest cells were{' '}
              <em>Central · Early Modern</em> with one entry,{' '}
              <em>Central · Colonial</em> with two,{' '}
              <em>West · Early Modern</em> with seven, and{' '}
              <em>East · Ancient</em> with four. The largest absolute
              gaps were in the Colonial cells — Cape Frontier Wars
              missing as individual conflicts, the West African jihad
              sequence (Sokoto, Macina, Toucouleur, Tijaniyya), the
              French Conquest of Algeria umbrella, Menelik II&apos;s
              southern conquests, the Mahdist War battle set.
              Headline additions include the Muslim Conquest of Egypt
              and the Maghreb (639–709), Banu Hilal Invasion, Battle
              of Megiddo (15th c. BCE), Battle of Alcacer Quibir
              (1578), Saadi Conquest of Songhai with Battle of
              Tondibi, the French Conquest of Algeria umbrella
              (1830–1903), Algerian Civil War, First Libyan Civil
              War, Battle of Kirina (1235), Sonni Ali&apos;s
              Conquests, Asante-Denkyira War, Sokoto Jihad, Yoruba
              Civil Wars, Toucouleur Wars, Franco-Mandingo Wars,
              Northern Mali Conflict, Kushite and Aksumite conquests
              of Egypt and Meroë, Kaleb&apos;s invasion of Himyar,
              Amda Seyon&apos;s campaigns, Battle of Wayna Daga, the
              Oromo migrations, Zemene Mesafint, Battle of Omdurman,
              both East African Campaigns of WWI and WWII, Ikiza
              (the 1972 Burundi genocide), Tanzania-Uganda War, LRA
              insurgency, Battle of Mbwila, Kongo Civil War,
              Portuguese-Njinga Wars, Cuito Cuanavale, the full nine
              Cape Frontier Wars, the Mfecane state-formation cycle,
              both Anglo-Boer wars with named sieges, and the Herero,
              Nama, and Bondelswarts wars.
            </li>
            <li>
              <strong>Sub-regional pre-modern fills.</strong> Pre-1800
              cells gained 239 entries under the inclusive classifier.
              The Early Modern bucket alone added 117 entries —
              Songhai-Saadian wars, the Adal-Ethiopian Futuh
              al-Habasha sub-battles (Shimbra Kure, Amba Sel, Wofla,
              Wayna Daga), the Kongo and Ndongo and Matamba complex
              (Mbwila, Kitombo, Mbula, the Antonian Movement), the
              Omani-Portuguese Swahili coast wars, the Bambara wars
              of Segou and Kaarta, the Asante-Denkyira war, the
              Oyo-Dahomey wars, and the two pre-Sokoto Sahelian jihads
              of Futa Jallon and Futa Toro. The Ancient cell gained
              68 entries including Kushite, Assyrian, and Aksumite
              conquests of Egypt, the Aksumite conquest of Meroë, and
              Kaleb&apos;s 525 invasion of Himyar.
            </li>
            <li>
              <strong>Per-event split of large umbrellas.</strong> The
              Cape Frontier Wars had been an aggregate; now each of
              the nine wars (1779–81 through 1877–79) is an individual
              conflict. The Border War in Angola and Namibia gained
              the full named-operation sequence (Savannah, Reindeer,
              Sceptic, Protea, Daisy, Askari, Modular, Hooper, Packer)
              anchored on Cuito Cuanavale. The Mfecane gained the
              named state-formation engagements. The Anglo-Zulu War
              gained the named battles (Isandlwana, Rorke&apos;s
              Drift, Hlobane, Khambula, Ulundi). Both Anglo-Boer
              Wars gained their named sieges (Mafeking, Kimberley,
              Ladysmith) and the Black-Week battles. Five carry-over
              data-quality issues that fell out of the audit —
              coordinate axis swaps in a handful of European-tagged
              entries, the ambiguous &ldquo;Great Lakes&rdquo;
              geographic tag, and two overlapping
              &ldquo;Kongo-Portuguese Conflicts&rdquo; aggregates —
              are documented for a follow-up cleanup pass.
            </li>
            <li>
              <strong>Wikipedia URL verification pass.</strong> All
              784 new entries got a HEAD-test. 408 confirmed 200 first
              pass; 50 confirmed 404s were patched (44 reassigned to
              canonical articles, six nulled where no English
              Wikipedia article exists); 326 rate-limited 429
              responses remain pending a serial re-check follow-up.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Conflict count: 1,532 → 2,316 (+784 net). Africa coverage:
            914 → 1,684. Schema valid; zero broken <code>partOf</code>{' '}
            refs; coordinates of 783/784 new entries inside the
            Africa+margin bbox, the one outlier being the
            legitimately-Seychellois 1981 Mercenary Raid. Pre-audit
            backup at{' '}
            <code>backups/conflicts_20260518_080245_pre_africa_audit.json</code>.
          </p>
        </Entry>

        <Entry date="18 May 2026" tag="r7 · southeast asia audit">
          <p>
            Reader feedback flagged Southeast Asia as the atlas&apos;s
            thinnest region. Audited SEA (broad: ASEAN-11 plus
            Yunnan / Assam / Taiwan / Papua borderlands) sliced by{' '}
            <em>{'{mainland, maritime}'} × {'{pre-1500, 1500–1800, 1800–1945, post-1945}'}</em>.
            Reference list compiled against Lieberman&apos;s{' '}
            <em>Strange Parallels</em>, Reid&apos;s <em>Age of Commerce</em>,
            Tarling&apos;s Cambridge <em>History of Southeast Asia</em>,
            COW v4, and the Wikipedia category trees. Full methodology in{' '}
            <a href="https://github.com/jtroll/waratlas/blob/main/SEA_AUDIT_2026-05-17.md" target="_blank" rel="noopener noreferrer">
              SEA_AUDIT_2026-05-17.md
            </a>.
          </p>
          <ul>
            <li>
              <strong>219 named SEA wars added.</strong> Pre-audit
              coverage was 106. Two cells were particularly thin:{' '}
              <em>Maritime Pre-1500</em> was literal zero (Srivijaya,
              Majapahit, Singhasari, Pasai all missing), and{' '}
              <em>Mainland 1800–1945</em> was 6 entries (all Anglo-Burmese
              or aggregate French conquest). Headline additions: three
              Battles of Bạch Đằng (938, 981, 1288), Mongol invasions of
              Vietnam, Burma, and Champa, Chola invasion of Srivijaya
              (1025), Mongol invasion of Java (1293), Pamalayu expedition,
              Battle of Bubat, Regreg War, Capture of Malacca (1511),
              Battle of Mactan, Trunajaya rebellion, three Javanese Wars
              of Succession, Dagohoy rebellion (longest in Philippine
              history), Cochinchina campaign, Sino-French War, Pacification
              of Tonkin, Franco-Siamese War, Anouvong&apos;s rebellion,
              Saya San, the Burma campaign with Imphal/Kohima, four Dutch
              interventions in Bali, Batak War, Hukbalahap rebellion,
              Operation Trikora, Battle of Marawi.
            </li>
            <li>
              <strong>Burmese-Siamese wars split.</strong> The five
              overlapping &ldquo;Burmese-Siamese Wars&rdquo; aggregates
              that had been collapsing 200 years into a handful of
              timeline pins are now one umbrella record (1547–1855,
              importance 2) with <code>partOf</code> linkage from the
              13 individual named wars — 1547–49, 1563–64, 1568–69,
              1584–93, 1593–1600, 1609–22, 1662–64, 1759–60, 1765–67,
              1775–76, 1785–86, 1787, 1797 — following Lieberman&apos;s
              and Wikipedia&apos;s standard splits. Same pattern applied
              to the Khmer–Cham wars and Cham–Vietnamese wars clusters.
            </li>
            <li>
              <strong>Duplicate-event cleanup.</strong> 11 records merged
              where one event had been carrying multiple IDs: the
              Cambodian Genocide / Khmer Rouge cluster (4 → 1), the
              Indonesian occupation of East Timor (4 → 1, including one
              audit-added dupe caught in the second pass), Konfrontasi
              (2 → 1), the Vietnamese-Cambodian War (2 → 1), the
              Moro / Mindanao conflicts (2 → 1), the Communist rebellion
              in the Philippines (2 → 1), the Papua conflict (2 → 1),
              the Philippine-American War (2 → 1), and the Aceh
              insurgency (2 → 1). For each merge the entry with higher
              importance was kept; non-null Wikipedia URLs were adopted
              from the deleted records.
            </li>
            <li>
              <strong>Wikipedia URL verification pass.</strong> Every
              new entry&apos;s Wikipedia link was HEAD-tested. 38
              broken URLs patched against verified slugs from targeted
              searches (the Mongol invasions of Đại Việt don&apos;t have
              per-invasion English articles — they share the
              <code> Mongol_invasions_of_Vietnam</code> umbrella;{' '}
              <em>Battle of Dien Bien Phu</em> uses ASCII not Vietnamese
              diacritics in the slug; etc.). One entry — the 1908 Trung
              Kỳ anti-tax revolt — has <code>wikipediaUrl: null</code>{' '}
              because no English-Wikipedia article exists for it.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Conflict count: 1,335 → 1,532 (+197 net). SEA coverage:
            106 → 282. Schema valid; zero broken <code>partOf</code>{' '}
            refs; coordinates of all new entries inside lon 70–155 /
            lat −15–35. Pre-audit backup at{' '}
            <code>backups/conflicts_20260518_065217_pre_sea_audit.json</code>.
          </p>
        </Entry>

        <Entry date="17 May 2026" tag="r6 · border accuracy pass">
          <p>
            Three-part overhaul of how empire borders are sourced, drawn,
            and labelled. Process is documented in{' '}
            <a href="https://github.com/jtroll/waratlas/blob/main/BORDER_TRACING_PROCESS.md" target="_blank" rel="noopener noreferrer">
              BORDER_TRACING_PROCESS.md
            </a>{' '}
            and is fully re-runnable.
          </p>
          <ul>
            <li>
              <strong>Source-based approximate flag fixed.</strong>{' '}
              134 features had been carrying solid borders despite using
              Natural-Earth clipped-to-country geometry or other approximate
              sources. The two flags that drive map rendering
              (<code>accurate</code> and <code>borderStyle</code>) are now
              consistent across every feature, with both derived from a
              single source-based rule. Net effect: ~134 features correctly
              flipped from solid to dashed.
            </li>
            <li>
              <strong>34 polygons replaced.</strong> A shape-pathology scan
              flagged 30 features with geometric primitives — four-vertex
              squares (Ancestral Pueblo as a perfect Four-Corners
              rectangle, Ryukyu and Tahiti as boxes), low-vertex ovals
              (Hohokam, Comancheria, Kanem), and pie-slice artifacts where
              circles had been clipped to coastlines (Natchez and Coosa
              chiefdoms reaching into the Gulf and Atlantic). 17 were
              upgraded with authentic polygons from{' '}
              <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">
                aourednik / historical-basemaps
              </a>{' '}
              year-snapshots (Tu&apos;i Tonga gained 1,375 vertices and 60
              islands; Maori 254; Taíno chiefdoms 1,016; Huron 460).
              17 more were hand-traced from cited Wikipedia article
              geography with the source URL recorded on each feature.
              After the pass, zero geometric offenders remain.
            </li>
            <li>
              <strong>New <code>polityType</code> field</strong> separates
              two questions the old <code>accurate</code> flag had been
              conflating: is the polygon faithful to its source, and did
              the polity itself have a fixed frontier? Every feature gets
              one of five categories — <em>state</em> (~242, the only one
              that renders solid), <em>tributary</em> (~81),{' '}
              <em>confederation</em> (~21), <em>culture</em> (~16), or{' '}
              <em>nomadic-range</em> (~16). 92 features that had been
              rendering solid despite being archaeological cultures
              (Hohokam, Mississippian), nomadic ranges (Lakota / Sioux,
              Comancheria, Pechenegs), or tributary networks (Mali,
              Songhai, Mwene Mutapa, Tu&apos;i Tonga) now correctly
              render dashed. The sidebar caption is category-aware —
              clicking a Cahokia polygon now reads &ldquo;Cultural
              sphere&rdquo; with the explanation &ldquo;An archaeological
              culture defined by material remains. The line is a
              probability cloud, not a frontier&rdquo; rather than a
              generic &ldquo;approximate borders&rdquo; label.
            </li>
            <li>
              <strong>Sources page updated</strong> to walk through the
              four-tier source hierarchy, the dashed/solid editorial rule,
              and the five polity-type categories. See{' '}
              <Link href="/sources">/sources</Link>.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Empire count unchanged: 376. Final render split: 153 solid /
            223 dashed (was 346 / 30 at the start of the session).
            Re-runnable scripts:{' '}
            <code>scripts/scan_shape_pathology.py</code>,{' '}
            <code>scripts/hand_trace_borders.py</code>,{' '}
            <code>scripts/assign_polity_type.py</code>.
          </p>
        </Entry>

        <Entry date="14 May 2026" tag="r5 · historian pass">
          <p>
            Audit of the atlas from a historian / armchair-buff perspective:
            fixed the data-integrity bugs that would have been the first
            thing a careful reader noticed, and added the historiographical
            framing the site had been missing.
          </p>
          <ul>
            <li>
              <strong>Six high-profile records normalized.</strong> The
              Holodomor, Armenian Genocide, Bosnian Genocide, Rohingya
              Genocide, Cambodian Genocide, and the Nakba had been imported
              with the wrong shape — <code>coordinates</code> as
              <code>{'{lat,lng}'}</code> objects and <code>casualties</code>
              as <code>{'{estimate:N}'}</code> objects. Their map dots
              didn&apos;t render and the casualty headline broke silently.
              All six rewritten to the canonical schema.
            </li>
            <li>
              <strong>Nakba: deaths vs. displacement separated.</strong>{' '}
              The record had been pairing a 15K-deaths headline with a
              600K–1M &ldquo;range&rdquo; whose own notes admitted it was
              displacement, not deaths. The casualty range now reports the
              13–20K death band (Morris; Khalidi; Pappé); the 700K–800K
              displacement figure lives in the narrative.
            </li>
            <li>
              <strong>Five duplicate records removed.</strong> Three copies
              of the Indian Rebellion of 1857 (the legacy
              <code> indian-mutiny</code> and <code>sepoy-mutiny</code> IDs
              had been retained as duplicates of the canonical-name record);
              two of the Armenian Genocide; two of the Western Sahara
              Conflict; a stray Boxer Rebellion stub. Conflict count
              1,340 → 1,335.
            </li>
            <li>
              <strong>Boxer Rebellion renamed</strong> to{' '}
              <em>Yihetuan Movement (Boxer Rebellion)</em> — the Chinese
              self-designation as primary, the foreign-press term in
              parentheses, following Cohen and Esherick.
            </li>
            <li>
              <strong>New Historiography section on{' '}
              <Link href="/sources">/sources</Link></strong> walking through
              the major scholarly disputes behind the headline numbers: the
              An Lushan census-vs-deaths debate, the Mongol-conquest range,
              the Taiping 20–70M spread, the Columbian collapse, an explicit
              caveat about R. J. Rummel&apos;s <em>democide</em> methodology
              skewing high, and the Holodomor genocide-recognition dispute.
              Plus new Terminology and Periodization sections flagging the
              Eurocentric three-age scheme and the <em>Byzantine</em>{' '}
              modernism.
            </li>
            <li>
              <strong>Source set widened</strong> on the same page to name
              Correlates of War (COW v4), ACLED, and the specific regional
              syntheses (Bagnall &amp; Frier on the Roman census; Twitchett
              &amp; Fairbank on China; Thornton on West Africa; Reid and
              Boomgaard on Southeast Asia) we rely on where the
              encyclopedic compilations are too thin.
            </li>
            <li>
              <strong>About modal corrections.</strong> The claim that
              &ldquo;most empire borders are dashed&rdquo; was inaccurate
              (≈66% are solid); the &ldquo;~70 ranges&rdquo; line was stale
              (144). Both fixed. A short &ldquo;Where the historians
              disagree&rdquo; teaser now links into the new Sources
              section.
            </li>
            <li>
              <strong>Coverage stats made concrete.</strong> Replaced
              &ldquo;improving but still thinner&rdquo; with the actual
              regional split (≈36/33/20/9/2 % Europe/Asia/Americas/Africa/
              Oceania) and a usable importance-recalibration note.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Conflict count: 1,340 → 1,335. Backup of the prior dataset is
            checked in at{' '}
            <code>backups/conflicts.before-historian-pass-20260514.json</code>.
          </p>
        </Entry>

        <Entry date="13 May 2026" tag="r4 · third reich phases">
          <p>
            Added four snapshot polygons for Nazi Germany during its
            expansionist arc, filling a gap where the atlas had British
            and Japanese empires for WWII but no German counterpart. The
            existing <em>German Empire</em> entry (1871–1918) stays put
            and represents the Kaiserreich; the new entries cover the
            Third Reich. All four follow the same merged-territory
            convention as the Empire of Japan (peak, 1942) — occupied
            and annexed territory rolled into one polygon.
          </p>
          <ul>
            <li>
              <strong>Third Reich (1938)</strong>, covering 1937–1938:
              post-Anschluss Germany plus the Sudetenland (October 1938).
              Sudetenland boundary is hand-clipped against Czechoslovakia
              along the ring of German-majority border districts.
            </li>
            <li>
              <strong>Third Reich (1939)</strong>, covering 1939: adds the
              Protectorate of Bohemia and Moravia + Slovak puppet state
              (March 1939), Memel/Klaipėda from Lithuania (March 1939),
              and the German half of partitioned Poland from the Bug-river
              clip (September 1939). Eastern Poland went to the Soviets and
              is excluded.
            </li>
            <li>
              <strong>Third Reich (1941)</strong>, covering 1940–1941:
              adds Denmark, Norway, the Netherlands, Belgium, Luxembourg,
              and France (April–June 1940), and Yugoslavia and Greece
              (April 1941). Vichy is included under the merged-occupied
              convention. Operation Barbarossa hasn't pushed deep yet, so
              western USSR is not in this snapshot.
            </li>
            <li>
              <strong>Third Reich (peak, 1942)</strong>, covering 1942–1945:
              maximum extent after Barbarossa, with a hand-drawn Eastern
              Front line through Leningrad approaches, the Rzhev–Vyazma
              salient, Voronezh shoulder, Stalingrad, and the Caucasus
              push to Mozdok. Following the Empire of Japan precedent,
              this snapshot stays as the displayed shape through the
              1945 endpoint even though the Reich was shrinking fast
              after Stalingrad.
            </li>
          </ul>
          <p>
            Axis allies (Italy, Hungary, Romania, Bulgaria, Finland) are
            <em> not</em> rolled into these polygons — they were
            nominally independent and follow the Manchukuo-as-separate-feature
            convention. Adding them as their own snapshot empires is a
            separate piece of work.
          </p>
          <p style={{ marginTop: 12 }}>
            Known approximations, for the record:
          </p>
          <ul>
            <li>
              <strong>Sudetenland (1938)</strong> clipped from Czechoslovakia
              using a 14-vertex hand-drawn border ring. The shape captures
              the crescent that appears in standard atlases but isn't
              district-perfect — the real boundary followed the 1930
              census's German-language lines.
            </li>
            <li>
              <strong>German half of partitioned Poland (1939)</strong>
              clipped along roughly 23.5°E with a slight kink near the
              Lithuanian border. The actual Molotov-Ribbentrop line ran
              along the Pisa–Narew–Vistula–San rivers, modified on
              28 September 1939 to follow the Bug. The straight-ish clip
              here is within ~30–50 km of the real line.
            </li>
            <li>
              <strong>Eastern Front (1942 peak)</strong> traced through
              Leningrad approaches → the Rzhev–Vyazma salient → Voronezh
              shoulder → Stalingrad → Caucasus to Mozdok → back to the
              Black Sea, with Crimea held throughout. 26 vertices.
              Slight variation versus published front-line maps in the
              Karelia and Caucasus sectors.
            </li>
            <li>
              <strong>Vichy France</strong> included in the 1941 polygon
              under the merged-occupied convention. Strictly, Vichy was
              nominally independent until Case Anton (November 1942);
              treating it as part of the Reich sphere from 1940 is a
              simplification consistent with how this atlas treats other
              occupied territories.
            </li>
            <li>
              <strong>Axis allies</strong> (Italy, Hungary, Romania,
              Bulgaria, Finland) are <em>not</em> rolled into these
              polygons. They were nominally independent and follow the
              Manchukuo-as-separate-feature convention used elsewhere in
              the atlas. Adding them as their own snapshot empires is
              tracked as a future revision.
            </li>
          </ul>
          <p style={{ marginTop: 8, opacity: 0.7, fontSize: 14 }}>
            Empire count: 372 → 376.
          </p>
        </Entry>

        <Entry date="12 May 2026" tag="r3 · steppe polygons">
          <p>
            Hand-crafted polygons for nine inner-Asian / Pontic steppe
            confederations whose historical-basemaps shapes were
            atlas-quality only by approximation — smooth lens shapes that
            reached deep into Siberian taiga and ignored terrain.
          </p>
          <ul>
            <li>
              <strong>Xiongnu Confederation</strong> redrawn at Modu Chanyu
              peak (175 BCE): includes Ordos and Hexi Corridor, follows the
              Great Wall line south, the Greater Khingan crest east, and
              extends west through the Hexi-Turfan corridor as a tributary
              tongue. 31 vertices.
            </li>
            <li>
              <strong>Xianbei Confederation</strong> at Tanshihuai peak
              (175 CE): shifted east relative to Xiongnu, reflecting
              Xianbei origins in western Manchuria. 27 vertices.
            </li>
            <li>
              <strong>Rouran Khaganate</strong> (450 CE): more compact than
              its predecessors — Northern Wei (Toba Xianbei) blocked the
              southern frontier, so the Wall line is absent. 23 vertices.
            </li>
            <li>
              <strong>First Turkic Khaganate</strong> under Muqan Khan
              (575 CE): the pre-split pan-Eurasian realm, Caspian to
              Khingan, with Sogdiana and Khwarezm as tributary. 35 vertices.
            </li>
            <li>
              <strong>Eastern Göktürk Khaganate</strong> (620 CE) and the
              <em> Second Eastern Khaganate</em> (720 CE, Ilterish revival):
              identical core territory on the Mongolian Plateau, with the
              southern frontier well north of the Wall because Tang held
              Ordos and the Hexi Corridor. 22 vertices each.
            </li>
            <li>
              <strong>Western Göktürk Khaganate</strong> (630 CE): Pontic
              steppe to Hindu Kush, including Sogdiana and the Tarim Basin.
              21 vertices.
            </li>
            <li>
              <strong>Uyghur Khaganate</strong> at peak (790 CE): replaced
              Eastern Türks; more settled, with Beshbalik (Beiting) and
              Turfan as southern garrison cities. 22 vertices.
            </li>
            <li>
              <strong>Pechenegs</strong> at peak (950 CE): Pontic-Caspian
              steppe wedge from the Volga to the Lower Danube, after
              displacing the Magyars west in 895. 19 vertices.
            </li>
          </ul>
          <p>
            Sources: Di Cosmo, <em>Ancient China and Its Enemies</em>
            (Cambridge 2002); Barfield, <em>The Perilous Frontier</em>
            (1989); the Cambridge <em>History of Early Inner Asia</em>
            vol 1 (1990); Golden, <em>Introduction to the History of the
            Turkic Peoples</em> (1992).
          </p>
        </Entry>

        <Entry date="12 May 2026" tag="r2 · border audit">
          <p>
            Re-audited every empire polygon against the
            <em> Reconstructed</em> / <em>Approximate</em> legend. Net effect:
            248 reconstructed (was 149), 124 approximate (was 223). File now
            9.30 MB.
          </p>
          <ul>
            <li>
              <strong>Promoted 140 empires</strong> from dashed to solid. They had
              detailed clip-to-country geometry (60+ vertices on the main outer
              ring) but were carried as approximate. Examples: Maurya Empire,
              Achaemenid Persia, Khazar Khaganate, Khmer Empire, Pechenegs,
              Ottoman Empire, Mughal Empire, Inca Tawantinsuyu, every British
              Empire snapshot from 1700 onward.
            </li>
            <li>
              <strong>Demoted 41 empires</strong> from solid to dashed. These
              were hand-drawn ovals or stub historical-basemap shapes under 30
              vertices — pretending to be canonical when they were really
              cultural-extent guesses. Examples: Qin Dynasty, Teotihuacan,
              Frankish Kingdom, Ghaznavid Empire, Tangut Western Xia, Songhai,
              Bahmani Sultanate, Solomonic Dynasty, Apache Confederacy.
            </li>
            <li>
              <strong>Hand-crafted nine new polygons</strong> for the most
              prominent &ldquo;looks like a blob&rdquo; cases:
              <em> Xiongnu Confederation</em> (replaced 287-vert smooth lens
              with 40-vert historical-basemaps polygon with the Ordos cutout),
              <em> Adena Culture</em> (Ohio Valley outline),
              <em> Hohokam</em> (Sonoran Desert / Phoenix &amp; Tucson Basins),
              <em> Kingdom of Khotan</em> (long ribbon along the southern
              Tarim Silk Road),
              <em> Ghana Empire</em> (Wagadu, Sahelian wedge),
              <em> Kanem Empire</em> (Lake Chad to Tibesti),
              <em> Kingdom of Makuria</em> (Middle Nile),
              and the <em>Mississippian peak interaction sphere</em>.
            </li>
            <li>
              Empire sidebar now distinguishes two new source attributions:
              {' '}<em>reconstructed from Natural Earth country boundaries</em>{' '}
              (when an empire is solid because of a country-clip with real
              coastlines) and{' '}
              <em>approximate cultural extent (no primary GIS source)</em>{' '}
              (when it&apos;s dashed because we genuinely don&apos;t know).
            </li>
          </ul>
        </Entry>

        <Entry date="May 2026" tag="r1 · beta release">
          <p>
            First public beta. 1,340 conflicts, 372 empire polygons,
            ~700 historical city-name records, ranging 2500 BCE to today.
            Border styling: solid = canonical, dashed = approximate.
            Sources documented at <Link href="/sources">/sources</Link>.
          </p>
        </Entry>

        <footer
          className="mt-14 pt-6 font-mono"
          style={{
            borderTop: '1px solid var(--rule, rgba(255,255,255,0.1))',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--ink-faint, #6b7280)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span>WARS-ATLAS · /CHANGELOG · A RESEARCH PREVIEW</span>
          <Link
            href="/sources"
            style={{ color: 'var(--ink-faint, #6b7280)', textDecoration: 'none', borderBottom: '1px solid currentColor', paddingBottom: 1 }}
          >
            Sources &amp; attribution →
          </Link>
        </footer>
      </article>
      </main>
    </>
  );
}

function Entry({
  date,
  tag,
  children,
}: {
  date: string;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 changelog-entry">
      <div className="mb-2 flex items-baseline gap-3 flex-wrap">
        <h2
          className="font-display"
          style={{
            fontSize: 22,
            fontWeight: 500,
            margin: 0,
            color: 'var(--ink-text, #ece3d3)',
            letterSpacing: '-0.005em',
          }}
        >
          {date}
        </h2>
        {tag && (
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--vermilion, #c8553b)',
              borderBottom: '1px solid currentColor',
              paddingBottom: 1,
            }}
          >
            {tag}
          </span>
        )}
      </div>
      <div
        className="font-display changelog-prose"
        style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--ink-text-2, #d1d5db)' }}
      >
        {children}
      </div>
      {/* Inline scoped tweaks — only affects this page. */}
      <style>{`
        .changelog-prose p { margin: 0 0 12px; }
        .changelog-prose ul { margin: 0 0 12px; padding-left: 1.1em; }
        .changelog-prose ul li { margin-bottom: 8px; }
        .changelog-prose a { color: var(--indigo, #6366f1); text-decoration: none; border-bottom: 1px solid currentColor; }
        .changelog-prose a:hover { color: var(--ink-text, #ece3d3); }
        .changelog-prose em { font-style: italic; color: var(--ink-text, #ece3d3); }
      `}</style>
    </section>
  );
}
