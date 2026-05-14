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
              {' '}for post-1945 armed-conflict tracking.
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
          <p>The empire polygons are a deliberate mix:</p>
          <ul>
            <li>
              <strong>Reconstructed (solid lines):</strong>{' '}
              <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">
                aourednik / historical-basemaps
              </a>{' '}
              (
              <License href="https://creativecommons.org/licenses/by-sa/4.0/">
                CC BY-SA 4.0
              </License>
              ), sometimes intersected with{' '}
              <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">
                Natural Earth
              </a>{' '}
              modern country shapes (public domain) where the historical map
              didn&apos;t resolve a coastline.
            </li>
            <li>
              <strong>Approximate (dashed lines):</strong> Hand-constructed
              polygons drawn from scholarly atlases, or smooth ovals where
              extent is genuinely contested or undocumented at this
              resolution.
            </li>
          </ul>
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

        <Section title="Methodology caveats">
          <ul>
            <li>
              <strong>Casualty figures</strong> for pre-modern conflicts
              should be read as orders of magnitude. Many derive from primary
              sources (often censuses showing population loss) that conflate
              war deaths with famine, plague, and displacement. Where a
              well-cited range exists (~70 conflicts), the sidebar shows the
              range with source attribution rather than a single number.
            </li>
            <li>
              <strong>Coverage bias</strong> — pre-1500 records are sparser
              everywhere; coverage of pre-colonial Americas, sub-Saharan
              Africa, and Pacific Islander polities is improving but still
              thinner than European/Mediterranean coverage. We treat this as
              a debt, not a feature.
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
