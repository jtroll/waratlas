import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

interface Conflict {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  coordinates: [number, number];
  countries: string[];
  description: string;
  hook?: string;
  narrative?: string;
  significance?: string;
  importance: number;
  casualties: number | null;
}

function loadConflicts(): Conflict[] {
  try {
    const p = path.join(process.cwd(), 'public', 'conflicts.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')) as Conflict[];
  } catch {
    return [];
  }
}

function findConflict(id: string): Conflict | null {
  const conflicts = loadConflicts();
  return conflicts.find((c) => c.id === id) ?? null;
}

function formatYear(year: number) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year < 1000) return `${year} CE`;
  return `${year}`;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const conflict = findConflict(params.id);
  if (!conflict) {
    return {
      title: 'Conflict not found · Wars Atlas',
      description: 'This conflict could not be found in the Wars Atlas dataset.',
    };
  }
  const yearRange =
    conflict.endYear && conflict.endYear !== conflict.startYear
      ? `${formatYear(conflict.startYear)} – ${formatYear(conflict.endYear)}`
      : formatYear(conflict.startYear);
  const summary =
    conflict.hook ?? conflict.description ?? `Conflict in ${yearRange}.`;
  const description = summary.length > 200 ? summary.slice(0, 197) + '...' : summary;

  const title = `${conflict.name} (${yearRange}) · Wars Atlas`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Wars Atlas',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

/**
 * Per-conflict permalink. Renders an HTML stub with proper meta tags
 * (so social previews and search engines work) and then redirects the
 * user into the main app pre-scrolled to the conflict's year.
 */
export default function ConflictPage({ params }: { params: { id: string } }) {
  const conflict = findConflict(params.id);
  if (!conflict) {
    redirect('/');
  }
  const yearRange =
    conflict.endYear && conflict.endYear !== conflict.startYear
      ? `${formatYear(conflict.startYear)} – ${formatYear(conflict.endYear)}`
      : formatYear(conflict.startYear);
  const targetYear = conflict.startYear;

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
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0; url=/#year=${targetYear}&conflict=${conflict.id}`} />
        <link rel="canonical" href={`/c/${conflict.id}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        style={{
          background: '#0a0e17',
          color: '#e7e9ef',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          maxWidth: '60ch',
          margin: '0 auto',
          lineHeight: 1.6,
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
          <a href={`/#year=${targetYear}&conflict=${conflict.id}`} style={{ color: '#e63946' }}>
            View on the Wars Atlas →
          </a>
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85em', color: '#666' }}>
          Redirecting…
        </p>
      </body>
    </html>
  );
}
