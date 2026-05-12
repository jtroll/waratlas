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
