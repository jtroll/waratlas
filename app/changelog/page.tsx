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
