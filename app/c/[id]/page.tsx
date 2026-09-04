import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findConflict, resolveConflictId } from '@/lib/server/conflict-index';
import { formatYearRange } from '@/lib/format';
import { getSiteUrl } from '@/lib/site-url';

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
        style={{
          background: '#0a0e17',
          color: '#e7e9ef',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          maxWidth: '60ch',
          margin: '0 auto',
          lineHeight: 1.6,
          minHeight: '100vh',
        }}
      >
        <h1 style={{ color: '#fff', marginBottom: '0.25rem' }}>{conflict.name}</h1>
        <p style={{ color: '#8a8f9b', marginTop: 0 }}>
          {yearRange}
          {conflict.countries?.length > 0 && <> &middot; {conflict.countries.slice(0, 4).join(' vs ')}</>}
        </p>
        {conflict.hook && (
          <p style={{ fontSize: '1.1em', color: '#fff' }}>{conflict.hook}</p>
        )}
        {conflict.narrative && <p>{conflict.narrative}</p>}
        {conflict.significance && (
          <p style={{ borderLeft: '3px solid #444', paddingLeft: '1rem', color: '#bbb' }}>
            {conflict.significance}
          </p>
        )}
        {!conflict.hook && !conflict.narrative && conflict.description && (
          <p>{conflict.description}</p>
        )}
        <p style={{ marginTop: '2rem' }}>
          <a href={appHref} style={{ color: '#e63946' }}>
            View on the War Atlas →
          </a>
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85em', color: '#666' }}>
          Redirecting…
        </p>
      </main>
    </>
  );
}
