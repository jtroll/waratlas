import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  childrenOf,
  findConflict,
  findEmpire,
  getConflictIndex,
  resolveConflictId,
  resolveConflictRef,
} from '@/lib/server/conflict-index';
import {
  formatYear,
  formatYearRange,
  formatSpan,
  formatCompactRange,
  formatCasualties,
  formatCoordinates,
  importanceLabel,
} from '@/lib/format';
import { getSiteUrl } from '@/lib/site-url';
import { Wordmark } from '@/components/LoadingScreen';

// ISR: the conflict dataset changes on deploy, not per request. Cache each
// permalink for a day instead of parsing the 9 MB data file per hit.
export const revalidate = 86400;
// Prebuild the ~850 pages with importance ≥ 4; everything else renders on
// first request and is then cached.
export const dynamicParams = true;

const CHILD_CAP = 12;

export function generateStaticParams(): { id: string }[] {
  return getConflictIndex()
    .list.filter((c) => c.importance >= 4)
    .map((c) => ({ id: c.id }));
}

interface RouteProps {
  params: { id: string };
}

/** ISO-8601 year for schema.org (six-digit, signed for BCE). */
function isoYear(y: number): string {
  return y < 0 ? `-${String(-y).padStart(6, '0')}` : `${y}`;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const conflict = findConflict(resolveConflictId(params.id));
  if (!conflict) {
    return {
      title: 'Conflict not found · War Atlas',
      description: 'This conflict could not be found in the War Atlas dataset.',
      robots: { index: false },
    };
  }
  const yearRange = formatYearRange(conflict.startYear, conflict.endYear);
  const summary =
    conflict.hook ?? conflict.description ?? `Conflict in ${yearRange}.`;
  const description = summary.length > 200 ? summary.slice(0, 197) + '...' : summary;
  const canonical = `${getSiteUrl()}/c/${conflict.id}`;

  const title = `${conflict.name} (${yearRange}) · War Atlas`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'War Atlas',
      url: canonical,
      images: ['/og-card.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-card.png'],
    },
  };
}

/**
 * Per-conflict permalink — a citable content page, not a redirect stub.
 * Everything the sidebar shows is rendered server-side (title, span, hook,
 * casualty range with source, narrative, significance, belligerents,
 * parent/child graph, sources) with a prominent link into the atlas
 * pre-scrolled to the conflict's year.
 *
 * Rendered inside the root layout — returns a fragment, not its own
 * document. Unknown ids 404; ids that were merged or renamed
 * (scripts/data/id_redirects.json) 307 to the canonical permalink.
 */
export default function ConflictPage({ params }: RouteProps) {
  const canonicalId = resolveConflictId(params.id);
  if (canonicalId !== params.id) {
    redirect(`/c/${canonicalId}`);
  }
  const conflict = findConflict(canonicalId);
  if (!conflict) {
    notFound();
  }
  const yearRange = formatYearRange(conflict.startYear, conflict.endYear);
  const appHref = `/#year=${conflict.startYear}&conflict=${encodeURIComponent(conflict.id)}`;
  const canonical = `${getSiteUrl()}/c/${conflict.id}`;

  const parents = (conflict.partOf ?? []).map((ref) => ({
    label: ref,
    record: resolveConflictRef(ref),
  }));
  const children = childrenOf(conflict.id);
  const polities = (conflict.polityIds ?? [])
    .map((id) => findEmpire(id))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const hasRange = !!conflict.casualtyRange && conflict.casualtyRange.high > conflict.casualtyRange.low;
  const sources = conflict.sources ?? [];

  // schema.org Event JSON-LD for rich search results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: conflict.name,
    description: conflict.hook ?? conflict.description,
    url: canonical,
    startDate: isoYear(conflict.startYear),
    endDate: conflict.endYear != null ? isoYear(conflict.endYear) : undefined,
    location: {
      '@type': 'Place',
      name: conflict.locations?.[0],
      geo: {
        '@type': 'GeoCoordinates',
        latitude: conflict.coordinates[1],
        longitude: conflict.coordinates[0],
      },
    },
    superEvent: parents.some((p) => p.record)
      ? parents
          .filter((p) => p.record)
          .map((p) => ({ '@type': 'Event', name: p.record!.name, url: `${getSiteUrl()}/c/${p.record!.id}` }))
      : undefined,
    sameAs: conflict.wikipediaUrl ?? undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* globals.css locks html/body with overflow:hidden for the map page;
          prose pages need normal document scrolling. */}
      <style>{`html, body { overflow: auto !important; height: auto !important; }`}</style>
      <main
        className="font-display permalink-prose"
        style={{
          background: 'var(--ink-0)',
          color: 'var(--ink-text)',
          padding: '40px 24px 64px',
          minHeight: '100vh',
        }}
      >
        <article style={{ maxWidth: 680, margin: '0 auto' }}>
          <header style={{ marginBottom: 28 }}>
            <div
              className="flex items-baseline justify-between gap-4"
              style={{ paddingBottom: 12, borderBottom: '1px solid var(--rule)' }}
            >
              <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }} aria-label="War Atlas home">
                <Wordmark size={22} />
              </a>
              <a
                href={appHref}
                className="font-mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  borderBottom: '1px solid currentColor',
                  paddingBottom: 2,
                }}
              >
                Open in the atlas →
              </a>
            </div>
            <p
              className="font-mono"
              style={{
                margin: '28px 0 8px',
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ink-text-2)',
              }}
            >
              {importanceLabel(conflict.importance)}
              <span style={{ color: 'var(--ink-faint)', margin: '0 8px' }} aria-hidden>·</span>
              <span style={{ textTransform: 'none' }}>{formatSpan(conflict.startYear, conflict.endYear)}</span>
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.08,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
              }}
            >
              {conflict.name}
            </h1>
            {conflict.locations?.length > 0 && (
              <p
                className="font-ui"
                style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-text-2)' }}
              >
                {conflict.locations.slice(0, 6).join(' · ')}
              </p>
            )}
          </header>

          {conflict.hook && (
            <p
              style={{
                fontStyle: 'italic',
                fontSize: 19,
                lineHeight: 1.4,
                margin: '0 0 20px',
                paddingBottom: 20,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              {conflict.hook}
            </p>
          )}

          {/* Casualty line — the range with its source, never a bare headline. */}
          <section style={{ margin: '0 0 20px', paddingBottom: 20, borderBottom: '1px solid var(--rule)' }}>
            <p className="eyebrow" style={{ margin: '0 0 6px' }}>Estimated casualties</p>
            {conflict.casualties == null && !conflict.casualtyRange ? (
              <p style={{ margin: 0, fontStyle: 'italic', fontSize: 14, color: 'var(--ink-muted)' }}>
                Casualty figures unrecorded for this conflict.
              </p>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 26, lineHeight: 1.1, letterSpacing: '-0.018em' }}>
                  {hasRange
                    ? `${formatCasualties(conflict.casualtyRange!.low)} – ${formatCasualties(conflict.casualtyRange!.high)}`
                    : formatCasualties(conflict.casualties ?? conflict.casualtyRange?.low)}
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', marginLeft: 10, letterSpacing: 0 }}>
                    {hasRange ? 'estimated dead' : 'single estimate · no range published'}
                  </span>
                </p>
                {hasRange && conflict.casualties != null && (
                  <p className="font-mono" style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
                    <span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>HEADLINE</span>
                    {formatCasualties(conflict.casualties)} — the single figure used on the map
                  </p>
                )}
                {conflict.casualtyRange?.notes && (
                  <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-text-2)' }}>
                    {conflict.casualtyRange.notes}
                  </p>
                )}
                {conflict.casualtyRange && (
                  <p className="font-mono" style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
                    <span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>SOURCE</span>
                    {conflict.casualtyRange.source || 'unrecorded'}
                  </p>
                )}
              </>
            )}
          </section>

          <div style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--ink-text)' }}>
            {conflict.narrative && (
              <>
                <p className="eyebrow" style={{ margin: '0 0 6px' }}>What happened</p>
                <p style={{ margin: '0 0 16px' }}>{conflict.narrative}</p>
              </>
            )}
            {conflict.significance && (
              <>
                <p className="eyebrow" style={{ margin: '0 0 6px', color: 'var(--amber)' }}>Why it mattered</p>
                <p style={{ margin: '0 0 16px', color: 'var(--ink-text-2)' }}>{conflict.significance}</p>
              </>
            )}
            {!conflict.narrative && conflict.description && (
              <p style={{ margin: '0 0 16px' }}>{conflict.description}</p>
            )}
            {!conflict.hook && !conflict.narrative && !conflict.description && (
              <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'var(--ink-muted)' }}>
                No editorial summary yet for this record. The dates, location and
                sources below are what the dataset holds.
              </p>
            )}
          </div>

          {/* Belligerents */}
          {conflict.countries?.length > 0 && (
            <Section eyebrow="Belligerents" count={conflict.countries.length}>
              <ul className="two-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {conflict.countries.map((name) => (
                  <li key={name} style={{ fontSize: 14, lineHeight: 1.5, padding: '2px 0' }}>
                    {name}
                  </li>
                ))}
              </ul>
              {polities.length > 0 && (
                <p className="font-mono" style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.7 }}>
                  <span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>ON THE MAP</span>
                  {polities.map((e, i) => (
                    <span key={e.id}>
                      {i > 0 && <span aria-hidden> · </span>}
                      <a href={`/e/${e.id}`}>{e.name}</a>
                    </span>
                  ))}
                </p>
              )}
            </Section>
          )}

          {/* Part of / sub-conflicts */}
          {(parents.length > 0 || children.length > 0) && (
            <Section eyebrow="Conflict graph">
              {parents.length > 0 && (
                <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.6 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginRight: 8, letterSpacing: '0.04em' }}>
                    PART OF
                  </span>
                  {parents.map((p, i) => (
                    <span key={p.label}>
                      {i > 0 && <span style={{ color: 'var(--ink-faint)' }}> · </span>}
                      {p.record ? <a href={`/c/${p.record.id}`}>{p.record.name}</a> : p.label}
                    </span>
                  ))}
                </p>
              )}
              {children.length > 0 && (
                <>
                  <p className="font-mono" style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
                    SUB-CONFLICTS · {children.length}
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {children.slice(0, CHILD_CAP).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-baseline justify-between gap-3"
                        style={{ padding: '5px 0', borderBottom: '1px dotted var(--rule)', fontSize: 14 }}
                      >
                        <a href={`/c/${c.id}`}>{c.name}</a>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
                          {formatCompactRange(c.startYear, c.endYear)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {children.length > CHILD_CAP && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>
                      + {children.length - CHILD_CAP} more in the atlas.
                    </p>
                  )}
                </>
              )}
            </Section>
          )}

          {/* Sources */}
          {(sources.length > 0 || conflict.wikipediaUrl) && (
            <Section eyebrow="Sources">
              <ol style={{ margin: 0, paddingLeft: '1.4em', fontSize: 14, lineHeight: 1.6 }}>
                {sources.map((s, i) => (
                  <li key={`${i}-${s.label}`} style={{ padding: '3px 0', borderBottom: '1px dotted var(--rule)' }}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                    ) : (
                      s.label
                    )}
                  </li>
                ))}
                {conflict.wikipediaUrl && (
                  <li style={{ padding: '3px 0' }}>
                    <a href={conflict.wikipediaUrl} target="_blank" rel="noopener noreferrer">
                      Wikipedia
                    </a>
                    <span style={{ color: 'var(--ink-muted)' }}> — text reused under CC BY-SA 4.0</span>
                  </li>
                )}
              </ol>
            </Section>
          )}

          <p style={{ marginTop: 32 }}>
            <a
              href={appHref}
              className="font-ui"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 40,
                padding: '0 16px',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                background: 'var(--ink-text)',
                color: 'var(--ink-0)',
                border: '1px solid var(--ink-text)',
              }}
            >
              Open in the atlas →
            </a>
            <span className="font-ui" style={{ marginLeft: 14, fontSize: 13, color: 'var(--ink-muted)' }}>
              Seeks the timeline to {formatYear(conflict.startYear)} and opens this record.
            </span>
          </p>

          <footer
            className="font-mono"
            style={{
              marginTop: 40,
              paddingTop: 12,
              borderTop: '1px dashed var(--rule)',
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--ink-faint)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>{formatCoordinates(conflict.coordinates)} · {yearRange.toUpperCase()}</span>
            <span>WARS-ATLAS / CONFLICT / {conflict.id.toUpperCase()}</span>
          </footer>
          <p className="font-ui" style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>
            Cite as: {conflict.name} ({yearRange}). War Atlas. {canonical} ·{' '}
            <a href="/sources" style={{ color: 'inherit' }}>Sources &amp; methodology</a>
          </p>
        </article>
      </main>
      <style>{`
        .permalink-prose a { color: var(--indigo); text-decoration: none; border-bottom: 1px solid currentColor; }
        .permalink-prose a:hover { color: var(--ink-text); }
        .permalink-prose .two-col { columns: 2; column-gap: 24px; }
        @media (max-width: 480px) { .permalink-prose .two-col { columns: 1; } }
      `}</style>
    </>
  );
}

function Section({
  eyebrow,
  count,
  children,
}: {
  eyebrow: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section style={{ margin: '0 0 20px', paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
      <p className="eyebrow" style={{ margin: '0 0 10px' }}>
        {eyebrow}
        {count != null && (
          <span className="font-mono" style={{ marginLeft: 8, color: 'var(--ink-faint)', letterSpacing: 0 }}>
            {count}
          </span>
        )}
      </p>
      {children}
    </section>
  );
}
