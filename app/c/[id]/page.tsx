import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findConflict, resolveConflictId } from '@/lib/server/conflict-index';
import { formatYearRange, formatSpan, formatCasualties, importanceLabel } from '@/lib/format';
import { getSiteUrl } from '@/lib/site-url';
import { Wordmark } from '@/components/LoadingScreen';

// ISR: the conflict dataset changes on deploy, not per request. Cache each
// permalink for a day instead of parsing the 9 MB data file per hit.
export const revalidate = 86400;

interface RouteProps {
  params: { id: string };
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
 * Per-conflict permalink. Renders an HTML stub with proper meta tags
 * (so social previews and search engines work) and then redirects the
 * user into the main app pre-scrolled to the conflict's year.
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
  const targetYear = conflict.startYear;
  const appHref = `/#year=${targetYear}&conflict=${conflict.id}`;

  // schema.org Event JSON-LD for rich search results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: conflict.name,
    description: conflict.hook ?? conflict.description,
    startDate: conflict.startYear < 0 ? `-${String(-conflict.startYear).padStart(6, '0')}` : `${conflict.startYear}`,
    endDate: conflict.endYear ? (conflict.endYear < 0 ? `-${String(-conflict.endYear).padStart(6, '0')}` : `${conflict.endYear}`) : undefined,
    location: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        latitude: conflict.coordinates[1],
        longitude: conflict.coordinates[0],
      },
    },
  };

  return (
    <>
      {/* Browsers honour a refresh pragma wherever it appears in the
          document; React 18 does not hoist it, so it lands in <body>. */}
      <meta httpEquiv="refresh" content={`0; url=${appHref}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        className="font-display"
        style={{
          background: 'var(--ink-0)',
          color: 'var(--ink-text)',
          padding: '40px 24px 64px',
          minHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        <article style={{ maxWidth: 640, margin: '0 auto' }}>
          <header style={{ marginBottom: 28 }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }} aria-label="War Atlas home">
              <Wordmark size={22} />
            </a>
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
            {conflict.countries?.length > 0 && (
              <p
                className="font-ui"
                style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-text-2)' }}
              >
                {conflict.countries.slice(0, 6).join(' · ')}
                {conflict.countries.length > 6 && (
                  <span style={{ color: 'var(--ink-faint)' }}> +{conflict.countries.length - 6}</span>
                )}
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
                  {conflict.casualtyRange && conflict.casualtyRange.high > conflict.casualtyRange.low
                    ? `${formatCasualties(conflict.casualtyRange.low)} – ${formatCasualties(conflict.casualtyRange.high)}`
                    : formatCasualties(conflict.casualties ?? conflict.casualtyRange?.low)}
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', marginLeft: 10, letterSpacing: 0 }}>
                    {conflict.casualtyRange && conflict.casualtyRange.high > conflict.casualtyRange.low
                      ? 'estimated dead'
                      : 'single estimate · no range published'}
                  </span>
                </p>
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
            {conflict.narrative && <p style={{ margin: '0 0 16px' }}>{conflict.narrative}</p>}
            {conflict.significance && (
              <>
                <p className="eyebrow" style={{ margin: '0 0 6px', color: 'var(--amber)' }}>Why it mattered</p>
                <p style={{ margin: '0 0 16px', color: 'var(--ink-text-2)' }}>{conflict.significance}</p>
              </>
            )}
            {!conflict.hook && !conflict.narrative && conflict.description && (
              <p style={{ margin: '0 0 16px' }}>{conflict.description}</p>
            )}
          </div>

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
          </p>
          <p
            className="font-mono"
            style={{ marginTop: 12, fontSize: 11, letterSpacing: '0.06em', color: 'var(--ink-faint)' }}
          >
            REDIRECTING TO {yearRange.toUpperCase()} · WARS-ATLAS / {conflict.id.toUpperCase()}
          </p>
        </article>
      </main>
    </>
  );
}
