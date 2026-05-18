import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sources & attribution · War Atlas',
  description:
    'Where the War Atlas data comes from, what license each component is under, and how to file a correction.',
};

const FEEDBACK_URL =
  process.env.NEXT_PUBLIC_FEEDBACK_URL ||
  'https://github.com/jtroll/waratlas/issues';

/**
 * Consolidated sources / attribution / corrections page. Linked from the
 * map's attribution control and from AboutModal. Lives outside the main
 * map app so it has its own quiet typographic surface and it's easy to
 * link to from external sources (HN, journalism, etc.).
 */
export default function SourcesPage() {
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
            <span style={{ fontStyle: 'italic', color: 'var(--vermilion, #c8553b)' }}>Sources</span>
            <span style={{ marginLeft: 6 }}>&amp; attribution</span>
          </h1>
          <p
            className="font-display italic mt-3"
            style={{ fontSize: 17, color: 'var(--ink-text-2, #d1d5db)', lineHeight: 1.5 }}
          >
            What we drew on, who owns it, and how to file a correction.
          </p>
        </header>

        <Section title="Conflict records">
          <p>
            The 1,340 conflict entries in <Code>public/conflicts.json</Code> were
            seeded from the leads of English Wikipedia articles
            (<License href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</License>),
            then cross-checked against:
          </p>
          <ul>
            <li>
              Micheal Clodfelter, <em>Warfare and Armed Conflicts: A Statistical
              Encyclopedia of Casualty and Other Figures, 1492–2015</em> (4th ed.,
              McFarland).
            </li>
            <li>
              R.J. Rummel, <em>Death by Government</em>, for 20th-century
              democide and famine-adjacent figures.
            </li>
            <li>
              The{' '}
              <a href="https://ucdp.uu.se/" target="_blank" rel="noopener noreferrer">
                Uppsala Conflict Data Program
              </a>
              {' '}(UCDP) for post-1945 armed-conflict tracking.
            </li>
            <li>
              The{' '}
              <a href="https://correlatesofwar.org/" target="_blank" rel="noopener noreferrer">
                Correlates of War
              </a>{' '}
              (COW v4) inter-state and intra-state war series, primarily as a
              cross-check on 1816–2010 date boundaries and casualty totals.
            </li>
            <li>
              <a href="https://acleddata.com/" target="_blank" rel="noopener noreferrer">
                ACLED
              </a>{' '}
              for post-1997 event-level corroboration of ongoing conflicts,
              especially in Africa and the post-Cold-War Middle East.
            </li>
            <li>
              For pre-modern Eurasia, period-specific scholarly syntheses
              (Bagnall &amp; Frier on the Roman census; Twitchett &amp; Fairbank
              on China; Lev &amp; Boomgaard on Southeast Asia; Reid on early
              modern Southeast Asia; Thornton on West Africa) where the
              encyclopedic compilations are too thin.
            </li>
          </ul>
          <p>
            Each conflict entry that has a Wikipedia source preserves the
            article URL on the record; the conflict sidebar links to it
            directly.
          </p>
        </Section>

        <Section title="Empire summaries">
          <p>
            The lead-paragraph summaries shown under "Overview" / "From
            Wikipedia" in the empire flyout come from the English Wikipedia
            REST summary API. Reused under{' '}
            <License href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </License>{' '}
            with attribution preserved on every entry.
          </p>
          <p>
            The fetcher script (<Code>scripts/fetch_wikipedia_summaries.py</Code>)
            sends a polite User-Agent identifying the project and its
            maintainer, rate-limits to a few requests per second, and caches
            results in <Code>public/empire-wikipedia.json</Code>. Curated
            editorial summaries (<Code>lib/empire-descriptions.ts</Code>) take
            precedence in the UI; Wikipedia content fills the gap and is
            always labelled as such.
          </p>
        </Section>

        <Section title="Borders, polygons, geometry">
          <p>
            The 376 empire polygons in <Code>public/empires.json</Code> come
            from four kinds of source, in roughly this order of priority:
          </p>
          <ul>
            <li>
              <strong><a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">aourednik / historical-basemaps</a></strong>{' '}
              (<License href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</License>)
              — the project&apos;s primary source. Year-keyed GeoJSON files
              for every century from 10000 BCE to 2000 CE, matched to our
              empires by name and validated by border-year + bounding-box +
              area sanity checks. ~186 features sourced this way.
            </li>
            <li>
              <strong>Hand-traced from Wikipedia article geography.</strong>{' '}
              Where historical-basemaps lacks a polygon or offers only a
              low-resolution shape, the boundary is constructed
              vertex-by-vertex from the territorial-extent prose of the
              cited Wikipedia article — rivers, mountain ranges, modern
              country borders, named frontier cities — cross-referenced
              against modern coastlines. The source field on each such
              feature records the article URL. ~32 features hand-traced
              this way.
            </li>
            <li>
              <strong>Hand-crafted from scholarly atlases.</strong> Cambridge
              and Talessman&apos;s atlases, Pleiades for the ancient
              Mediterranean, Hämäläinen for Comancheria, similar canonical
              works for specific regions. ~40 features.
            </li>
            <li>
              <strong>Natural Earth clip-to-country.</strong>{' '}
              <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>{' '}
              (public domain) modern country shapes, clipped to plausible
              union for cases where no era-specific polygon survives. These
              are explicitly labelled as approximate; the line is the modern
              coastline, not a historical frontier.
            </li>
          </ul>
          <p>
            The full repeatable methodology, including the shape-pathology
            scan that flags primitives (squares, ovals, half-circles),
            anchor-point selection rules, validation thresholds, and the
            affine-transform method for tracing raster maps, is documented
            in{' '}
            <a href="https://github.com/jtroll/waratlas/blob/main/BORDER_TRACING_PROCESS.md" target="_blank" rel="noopener noreferrer">
              BORDER_TRACING_PROCESS.md
            </a>{' '}
            in the repository root.
          </p>
          <p>
            <strong>Not used as sources, despite occasional temptation:</strong>{' '}
            speculative or fan-made cartography (r/imaginarymaps,
            user-talk-page speculation on Wikipedia, Pinterest reuploads of
            unlicensed atlas scans). A polygon that looks sharp but cites
            nothing checkable would defeat the point.
          </p>

          <h3 style={{fontSize: 16, fontWeight: 500, margin: '20px 0 8px', color: 'var(--ink-text, #ece3d3)'}}>Solid vs. dashed: two questions, not one</h3>
          <p>
            The dashed/solid distinction tries to answer two questions at
            once: <em>is the polygon faithful to its source?</em> and{' '}
            <em>did the polity itself have a fixed frontier?</em> Both have
            to be &ldquo;yes&rdquo; for the border to render as a solid line.
          </p>
          <p>
            The first question is the <Code>accurate</Code> flag in the
            data: true for canonical historical-basemap data, hand-traced
            polygons from cited articles, or hand-crafted polygons drawn
            from scholarly atlases; false for clipped-to-country
            approximations.
          </p>
          <p>
            The second question is the <Code>polityType</Code> flag, which
            takes one of five values:
          </p>
          <ul>
            <li>
              <strong>state</strong> — a bureaucratic state with
              administrative provinces, taxation, and a recorded frontier.
              Roman, Han, Ming, Mughal, Ottoman, Bahmani Sultanate, Ryukyu
              Kingdom, modern nation-states, colonial administrative units.
              ~242 features. <em>Only this category earns a solid line.</em>
            </li>
            <li>
              <strong>tributary</strong> — paramount chiefdom or tributary
              network. A real center with tribute-paying periphery and no
              surveyed frontier. Coosa, Calusa, Tu&apos;i Tonga, Toltec,
              Ife, Kanem, Mali Empire, Mwene Mutapa. ~81 features.
            </li>
            <li>
              <strong>confederation</strong> — loose alliance of independent
              groups sharing identity. Iroquois Confederacy, Huron-Wendat,
              Maori iwi (collective), Taíno chiefdoms (plural), Mossi states
              (plural), Hausa city-states, Apache Confederacy, Maya Classic
              city-states. ~21 features.
            </li>
            <li>
              <strong>culture</strong> — archaeological culture defined by
              material remains, not by political organization. Hohokam,
              Mogollon, Fremont, Ancestral Pueblo, Mississippian,
              Olmec, Adena, Hopewell, Teotihuacan as a cultural sphere,
              Wari / Tiwanaku. ~16 features.
            </li>
            <li>
              <strong>nomadic-range</strong> — pastoralist or
              hunter-gatherer seasonal range. Pechenegs, Comancheria,
              Lakota/Sioux territory, Xiongnu, the Göktürk khanates,
              Mapuche, Patagonia / Tehuelche. ~16 features.
            </li>
          </ul>
          <p>
            The four non-state categories render dashed regardless of how
            faithfully the polygon was traced, because pretending those
            polities had fixed borders would itself be inaccurate. The
            sidebar caption changes per category — &ldquo;Cultural
            sphere&rdquo;, &ldquo;Tributary network&rdquo;, etc. — so the
            reader knows <em>why</em> the line is dashed.
          </p>
          <p>
            We treat the dashed/solid distinction as a hard editorial
            requirement — never restyle it away. If a polygon is dashed,
            don&apos;t cite the line.
          </p>
        </Section>

        <Section title="Map tiles & basemap">
          <p>
            The dark base map and tile rendering is provided by Mapbox.
            Geographic features (coastlines, rivers, modern administrative
            boundaries, place names) come from OpenStreetMap.
          </p>
          <p>
            <strong>Required attribution</strong>:{' '}
            <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">
              © Mapbox
            </a>
            {' · '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              © OpenStreetMap contributors
            </a>
            {' '}(under the{' '}
            <License href="https://opendatacommons.org/licenses/odbl/">ODbL</License>
            ). The attribution control is visible in the corner of every map view.
          </p>
        </Section>

        <Section title="Application code">
          <p>
            All code in this repository is released under the{' '}
            <License href="https://opensource.org/license/mit/">MIT License</License>
            . See <Code>LICENSE</Code> in the repository root for the full
            text and a per-dataset breakdown.
          </p>
        </Section>

        <Section title="Historiography &amp; disputed figures">
          <p>
            The headline numbers on the map are point estimates drawn from a
            mainstream scholarly literature that itself disagrees, sometimes by
            an order of magnitude. We surface the disagreement in the
            per-conflict sidebar where we can; this section collects the most
            important debates so a reader who wants to argue with our number
            knows what they&apos;re arguing about.
          </p>
          <ul>
            <li>
              <strong>An Lushan Rebellion (755–763 CE).</strong> The famous
              &ldquo;36 million dead&rdquo; figure is widely quoted but comes
              from comparing two Tang census rolls. A substantial body of
              recent scholarship (Pulleyblank; Durand; more recently Lewis and
              Charles Holcombe) reads most of that drop as administrative
              collapse — registered households, not deaths. Plausible direct
              death tolls range from a few million to the low tens of millions.
            </li>
            <li>
              <strong>Mongol conquests (13th c.).</strong> Cumulative death
              tolls in the 20–60 million range are common in popular sources;
              the modern academic consensus (Morgan; May; Biran) is that the
              true number is real but unrecoverable, with the higher figures
              dependent on chronicles like Juvayni and Rashid al-Din that
              themselves use round numbers as a literary convention.
            </li>
            <li>
              <strong>Taiping Civil War (1850–64).</strong> Reported tolls run
              from 20 million to over 70 million. Most current scholarship
              (Platt; Spence; Meyer-Fong) settles on roughly 20–30 million
              including famine and epidemic deaths, with much of the higher
              spread again driven by Qing census discontinuities.
            </li>
            <li>
              <strong>The Columbian collapse (1492–1600).</strong> Estimates of
              the pre-contact population of the Americas, and the proportion
              killed by epidemic disease, war, and colonial labor regimes,
              range from ~8 million (lower bounds) to ~100 million pre-contact
              with 50–95 % loss. Koch et al. (2019) and the Berkeley/Stanford
              consensus is now in the 50–60 million pre-contact / ~90 % loss
              range, but the question is genuinely open and politically loaded.
            </li>
            <li>
              <strong>R. J. Rummel&apos;s &ldquo;democide&rdquo; figures.</strong>{' '}
              We use Rummel for 20th-century mass-violence counts, but cautiously.
              His maximum-likely estimates (especially for Mao-era China, the
              Soviet Union, and the Khmer Rouge) are widely judged to skew high
              by historians of those regimes, and his methodology
              (encyclopedia compilation, midpoint averaging) is not always
              auditable. Where Rummel is the headline source, the sidebar
              shows the range that includes lower scholarly estimates.
            </li>
            <li>
              <strong>The Holodomor.</strong> We list the 1932–33 Soviet famine
              in Ukraine separately as a mass-violence event. Recognition as a
              genocide is the position of Ukraine, most Western parliaments,
              and a growing scholarly majority (Applebaum; Snyder; Marples);
              it is rejected by Russia and contested by a minority of
              historians of the Soviet Union. The atlas adopts the genocide
              framing while flagging the dispute.
            </li>
            <li>
              <strong>Armenian Genocide, Holocaust, Rwandan Genocide.</strong>{' '}
              Each is named with the accepted academic and (where it exists)
              legal designation. State-level denial — Turkey for 1915,
              fringe revisionism for the Shoah — exists; the atlas does not
              equivocate.
            </li>
          </ul>
        </Section>

        <Section title="Terminology choices">
          <p>
            Naming is itself a historiographical act. A few decisions worth
            flagging:
          </p>
          <ul>
            <li>
              <strong>&ldquo;Indian Rebellion of 1857&rdquo;</strong>, not
              &ldquo;Indian Mutiny&rdquo; or &ldquo;Sepoy Mutiny&rdquo;. The
              colonial framings reduce a multi-class anti-imperial uprising to
              military insubordination; they were standard in British
              historiography until the late 20th c. and persist in older
              sources.
            </li>
            <li>
              <strong>&ldquo;Yihetuan Movement (Boxer Rebellion)&rdquo;</strong>{' '}
              uses the Chinese self-designation as primary and the
              foreign-press name parenthetically — the convention adopted by
              Cohen, Esherick, and most current sinological scholarship.
            </li>
            <li>
              <strong>&ldquo;Byzantine Empire&rdquo;</strong> is the
              conventional modern term, but a 16th-century coinage. The
              empire&apos;s inhabitants called themselves Romans
              (&ldquo;Rhōmaîoi&rdquo;); the atlas uses &ldquo;Byzantine&rdquo;
              for recognizability but the entry flags the modernism.
            </li>
            <li>
              <strong>Place names</strong> resolve to the modern canonical form
              in modern contexts (Mumbai, Kyiv, Yangon, Beijing) and to
              period-appropriate names where the period was named for the city
              (Constantinople / Konstantiniyye / Istanbul fade in and out of
              the map label as the centuries scroll past).
            </li>
          </ul>
        </Section>

        <Section title="Periodization">
          <p>
            The site uses the Western three-age scheme (Bronze Age / Classical
            Antiquity / Medieval / Early Modern / Modern) for era labels because
            our users overwhelmingly read in that vocabulary. This framing is
            unmistakably Eurocentric and lines up poorly with East Asian,
            African, and pre-Columbian American chronologies — there is no
            &ldquo;Bronze Age&rdquo; in the Mississippian world, the Chinese
            Tang–Song transition is not a &ldquo;medieval&rdquo; event, and
            sub-Saharan iron metallurgy predates the Mediterranean Iron Age.
            Per-region periodization is a planned future addition; in the
            meantime, treat the era ribbons as one viewing lens, not the only
            one.
          </p>
        </Section>

        <Section title="Methodology caveats">
          <ul>
            <li>
              <strong>Casualty figures</strong> for pre-modern conflicts
              should be read as orders of magnitude. Many derive from primary
              sources (often censuses showing population loss) that conflate
              war deaths with famine, plague, and displacement. Where a
              well-cited range exists (~150 conflicts), the sidebar shows the
              range with source attribution rather than a single number.
            </li>
            <li>
              <strong>Deaths vs. displacement.</strong> Events whose defining
              toll is forced migration rather than killing — the Nakba, the
              Trail of Tears, Partition of India — keep these as separate
              ledgers. The casualty figure on the map dot is always a death
              estimate; displacement figures appear in the narrative.
            </li>
            <li>
              <strong>Coverage bias</strong> — concretely: of the 1,335
              conflicts in the current dataset, ≈36 % are in Europe, ≈33 % in
              Asia, ≈20 % in the Americas, ≈9 % in Africa, and ≈2 % in
              Oceania. Pre-colonial sub-Saharan polities, Pacific Islander
              warfare, and pre-Columbian Mesoamerican and Andean conflict are
              all under-represented relative to a true global count.
              Pre-1500 records are sparser everywhere; we treat the gap as a
              debt, not a feature, and welcome corrections that close it.
            </li>
            <li>
              <strong>Importance ratings (1–5)</strong> are editorial and were
              originally seeded from a Eurasian-centric weighting that
              over-rated European wars relative to comparable conflicts
              elsewhere. We&apos;re actively recalibrating; if a rating looks
              wrong, file an issue with a specific case rather than a general
              complaint, since the specific cases are what we can actually
              correct.
            </li>
            <li>
              <strong>Importance ratings</strong> (1–5) are editorial. They
              determine visual prominence on the map and are weighted by
              casualties, duration, geographic scope, and downstream
              significance. They are not a value judgment about which lives
              mattered.
            </li>
            <li>
              <strong>Ongoing conflicts</strong> — figures for active wars
              (Russo-Ukrainian, Israel-Hamas, Sudan, Yemen, Myanmar, and
              others) are point-in-time snapshots from the dataset version
              shown in the About panel. They should be cross-checked
              against current reporting before being cited.
            </li>
            <li>
              <strong>Disputed borders</strong> — the modern country shapes
              follow Natural Earth conventions, which approximate
              internationally recognized borders. These choices reflect
              Natural Earth&apos;s convention, not endorsement of any
              party&apos;s claim. The disputed-territory note in the bottom
              right of the map enumerates the cases.
            </li>
          </ul>
        </Section>

        <Section title="Corrections & feedback">
          <p>
            Spotted a wrong date, an under-counted casualty figure, an
            empire boundary that looks off, or a war that&apos;s missing?
            We treat corrections as the highest-priority work.
          </p>
          <p>
            Please file an issue on{' '}
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
              the issue tracker
            </a>
            {' '}with:
          </p>
          <ul>
            <li>The conflict / empire ID (visible in the sidebar footer in mono type).</li>
            <li>What&apos;s wrong, and what it should be.</li>
            <li>A citation — primary source, peer-reviewed work, or a Wikipedia link will all do.</li>
          </ul>
        </Section>

        <footer
          className="mt-14 pt-6 font-mono"
          style={{
            borderTop: '1px solid var(--rule, rgba(255,255,255,0.1))',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--ink-faint, #6b7280)',
          }}
        >
          WARS-ATLAS · /SOURCES · A RESEARCH PREVIEW
        </footer>
      </article>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2
        className="font-display"
        style={{
          fontSize: 22,
          fontWeight: 500,
          margin: '0 0 10px',
          color: 'var(--ink-text, #ece3d3)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h2>
      <div
        className="font-display sources-prose"
        style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--ink-text-2, #d1d5db)' }}
      >
        {children}
      </div>
      {/* Inline tweaks so we don't have to touch globals.css. Scoped via
          the .sources-prose class below; only affects this page. */}
      <style>{`
        .sources-prose p { margin: 0 0 12px; }
        .sources-prose ul { margin: 0 0 12px; padding-left: 1.1em; }
        .sources-prose ul li { margin-bottom: 6px; }
        .sources-prose a { color: var(--indigo, #6366f1); text-decoration: none; border-bottom: 1px solid currentColor; }
        .sources-prose a:hover { color: var(--ink-text, #ece3d3); }
        .sources-prose code { font-family: var(--font-mono), ui-monospace, monospace; font-size: 0.85em; padding: 1px 4px; background: rgba(255,255,255,0.04); border-radius: 2px; }
      `}</style>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code>{children}</code>;
}

function License({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
