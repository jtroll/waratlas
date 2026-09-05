import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  conflictsDuringEmpire,
  empireSiblingIds,
  findEmpire,
  getEmpireIndex,
  getEmpireWikipedia,
  warsOfEmpire,
} from '@/lib/server/conflict-index';
import {
  formatYear,
  formatYearRange,
  formatSpan,
  formatCompactRange,
  formatCasualties,
  importanceLabel,
  polityTypeLabel,
  bordersHeading,
  bordersCaption,
  empireSourceLabel,
  isEmpireDashed,
} from '@/lib/format';
import { getEmpireDescription } from '@/lib/empire-descriptions';
import { getSiteUrl } from '@/lib/site-url';
import { Wordmark } from '@/components/LoadingScreen';

// ISR: empire data changes on deploy, not per request.
export const revalidate = 86400;
export const dynamicParams = true;

const WARS_CAP = 24;

/** Every empire is prebuilt — a few hundred small pages. */
export function generateStaticParams(): { id: string }[] {
  return getEmpireIndex().ids.map((id) => ({ id }));
}

interface RouteProps {
  params: { id: string };
}

function isoYear(y: number): string {
  return y < 0 ? `-${String(-y).padStart(6, '0')}` : `${y}`;
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const empire = findEmpire(params.id);
  if (!empire) {
    return {
      title: 'Empire not found · War Atlas',
      description: 'This polity could not be found in the War Atlas dataset.',
      robots: { index: false },
    };
  }
  const yearRange = formatYearRange(empire.startYear, empire.endYear);
  const desc = getEmpireDescription(empire.id);
  const wiki = getEmpireWikipedia(empire.id);
  const summary =
    desc?.hook ?? wiki?.description ?? wiki?.extract ?? `${polityTypeLabel(empire.polityType)}, ${yearRange}.`;
  const description = summary.length > 200 ? summary.slice(0, 197) + '...' : summary;
  const canonical = `${getSiteUrl()}/e/${empire.id}`;
  const title = `${empire.name} (${yearRange}) · War Atlas`;
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
 * Per-empire permalink — the server-rendered twin of the empire flyout.
 * Name, span, polity type, border provenance, the curated description
 * and/or Wikipedia extract (with attribution), the belligerent join
 * ("Wars of this empire"), and a link into the atlas with the polygon
 * fitted and the flyout open.
 */
export default function EmpirePage({ params }: RouteProps) {
  const empire = findEmpire(params.id);
  if (!empire) notFound();
  const e = empire;

  const yearRange = formatYearRange(e.startYear, e.endYear);
  const appHref = `/#year=${e.startYear}&empire=${encodeURIComponent(e.id)}`;
  const canonical = `${getSiteUrl()}/e/${e.id}`;
  const desc = getEmpireDescription(e.id);
  const wiki = getEmpireWikipedia(e.id);
  const isDashed = isEmpireDashed(e);
  // Bordered states read "Empire" like the flyout; the other polity types
  // are named for what they were.
  const kindLabel =
    e.polityType === 'state' || !e.polityType ? 'Empire' : polityTypeLabel(e.polityType);
  const siblings = empireSiblingIds(e.id).filter((id) => id !== e.id);
  const siblingRecords = siblings
    .map((id) => findEmpire(id))
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.startYear - b.startYear);
  const wars = warsOfEmpire(e.id);
  const during = wars.length === 0 ? conflictsDuringEmpire(e) : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: e.name,
    description: desc?.hook ?? wiki?.description ?? undefined,
    url: canonical,
    temporalCoverage: `${isoYear(e.startYear)}/${e.endYear != null ? isoYear(e.endYear) : '..'}`,
    additionalType: `https://schema.org/${e.polityType === 'state' || !e.polityType ? 'Country' : 'AdministrativeArea'}`,
    geo: e.bbox
      ? {
          '@type': 'GeoShape',
          box: `${e.bbox[1]} ${e.bbox[0]} ${e.bbox[3]} ${e.bbox[2]}`,
        }
      : undefined,
    sameAs: wiki?.url ?? undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  background: e.color && /^#?[0-9a-f]{3,8}$/i.test(e.color) ? e.color : 'var(--vermilion)',
                  opacity: 0.8,
                  border: isDashed ? '1px dashed var(--ink-text-2)' : '1px solid var(--ink-text-2)',
                }}
              />
              <span>{isDashed ? `${kindLabel} · approximate` : kindLabel}</span>
              <span style={{ color: 'var(--ink-faint)' }} aria-hidden>·</span>
              <span style={{ textTransform: 'none' }}>{formatSpan(e.startYear, e.endYear)}</span>
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
              {e.name}
            </h1>
            {siblingRecords.length > 0 && (
              <p className="font-ui" style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-text-2)', lineHeight: 1.7 }}>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginRight: 8, letterSpacing: '0.04em' }}>
                  OTHER SLICES
                </span>
                {siblingRecords.map((s, i) => (
                  <span key={s.id}>
                    {i > 0 && <span style={{ color: 'var(--ink-faint)' }}> · </span>}
                    <a href={`/e/${s.id}`}>{formatCompactRange(s.startYear, s.endYear)}</a>
                  </span>
                ))}
              </p>
            )}
          </header>

          {desc?.hook && (
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
              {desc.hook}
            </p>
          )}

          <div style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--ink-text)' }}>
            {desc?.narrative && (
              <>
                <p className="eyebrow" style={{ margin: '0 0 6px' }}>What it was</p>
                <p style={{ margin: '0 0 16px' }}>{desc.narrative}</p>
              </>
            )}
            {desc?.significance && (
              <>
                <p className="eyebrow" style={{ margin: '0 0 6px', color: 'var(--amber)' }}>Why it mattered</p>
                <p style={{ margin: '0 0 16px', color: 'var(--ink-text-2)' }}>{desc.significance}</p>
              </>
            )}
          </div>

          {wiki?.extract && (
            <Section eyebrow={desc ? 'From Wikipedia' : 'Overview'}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>{wiki.extract}</p>
              <p className="font-mono" style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.02em' }}>
                {wiki.url ? (
                  <a href={wiki.url} target="_blank" rel="noopener noreferrer">Wikipedia: {wiki.title}</a>
                ) : (
                  <span>Wikipedia: {wiki.title}</span>
                )}
                <span style={{ margin: '0 6px' }}>·</span>
                {wiki.license ?? 'CC BY-SA 4.0'}
              </p>
            </Section>
          )}

          {!desc && !wiki?.extract && (
            <p style={{ margin: '0 0 16px', fontStyle: 'italic', color: 'var(--ink-muted)', fontSize: 15 }}>
              No editorial summary yet for {e.name}. The border provenance and
              the wars recorded for this polity are what the dataset holds.
            </p>
          )}

          {/* Borders & accuracy */}
          <Section eyebrow="Borders & accuracy">
            <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
              <svg width="44" height="6" aria-hidden>
                <line
                  x1="0" y1="3" x2="44" y2="3"
                  stroke={isDashed ? 'var(--uncertain)' : 'var(--ink-text-2)'}
                  strokeWidth={isDashed ? 1.2 : 1.5}
                  strokeDasharray={isDashed ? '4 4' : undefined}
                />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{bordersHeading(isDashed, e.polityType)}</span>
            </div>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: 14, lineHeight: 1.55, color: 'var(--ink-text-2)' }}>
              {bordersCaption(isDashed, e.polityType, !!e.accurate)}
            </p>
            <ul className="font-mono" style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.8 }}>
              {e.source && (
                <li><span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>SOURCE</span>{empireSourceLabel(e.source)}</li>
              )}
              {e.sourceDetail && (
                <li style={{ overflowWrap: 'anywhere' }}><span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>DETAIL</span>{e.sourceDetail}</li>
              )}
              {e.borderYear !== undefined && (
                <li><span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>SNAPSHOT</span>{formatYear(e.borderYear)}</li>
              )}
              {e.matchedRegion && (
                <li><span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>MATCHED</span>{e.matchedRegion}</li>
              )}
              {e.polityType && (
                <li><span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>POLITY TYPE</span>{e.polityType}</li>
              )}
            </ul>
            {(e.handCraftedNote || e.borderNote) && (
              <p style={{ margin: '8px 0 0', fontStyle: 'italic', fontSize: 13, lineHeight: 1.5, color: 'var(--ink-text-2)' }}>
                {e.handCraftedNote ?? e.borderNote}
              </p>
            )}
          </Section>

          {/* Wars of this empire */}
          {wars.length > 0 && (
            <Section eyebrow="Wars of this empire" count={wars.length}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-muted)' }}>
                Conflicts whose belligerents name this polity{siblings.length > 0 ? ' (any of its time-slices)' : ''}, best-documented first.
              </p>
              <WarList wars={wars.slice(0, WARS_CAP)} />
              {wars.length > WARS_CAP && (
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>
                  + {wars.length - WARS_CAP} more in the atlas.
                </p>
              )}
            </Section>
          )}
          {wars.length === 0 && during.length > 0 && (
            <Section eyebrow="Also during this period">
              <p style={{ margin: '0 0 8px', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-muted)' }}>
                No conflict record yet names this polity as a belligerent; these overlap its dates only.
              </p>
              <WarList wars={during} />
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
              Seeks the timeline to {formatYear(e.startYear)} and fits the map to these borders.
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
            <span>
              {e.bbox
                ? `${e.bbox[0].toFixed(1)}°,${e.bbox[1].toFixed(1)}° → ${e.bbox[2].toFixed(1)}°,${e.bbox[3].toFixed(1)}°`
                : yearRange.toUpperCase()}
            </span>
            <span>WARS-ATLAS / EMPIRE / {e.id.toUpperCase()}</span>
          </footer>
          <p className="font-ui" style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>
            Cite as: {e.name} ({yearRange}). War Atlas. {canonical} ·{' '}
            <a href="/sources" style={{ color: 'inherit' }}>Sources &amp; methodology</a>
          </p>
        </article>
      </main>
      <style>{`
        .permalink-prose a { color: var(--indigo); text-decoration: none; border-bottom: 1px solid currentColor; }
        .permalink-prose a:hover { color: var(--ink-text); }
      `}</style>
    </>
  );
}

function WarList({ wars }: { wars: { id: string; name: string; startYear: number; endYear: number | null; importance: number; casualties: number | null }[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {wars.map((c) => (
        <li key={c.id} style={{ padding: '6px 0', borderBottom: '1px dotted var(--rule)' }}>
          <div className="flex items-baseline justify-between gap-3">
            <a href={`/c/${c.id}`} style={{ fontSize: 14.5 }}>{c.name}</a>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>
              {formatCompactRange(c.startYear, c.endYear)}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.04em', marginTop: 2 }}>
            <span style={{ textTransform: 'uppercase' }}>{importanceLabel(c.importance)}</span>
            {c.casualties != null && <span> · {formatCasualties(c.casualties)} dead</span>}
          </div>
        </li>
      ))}
    </ul>
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
