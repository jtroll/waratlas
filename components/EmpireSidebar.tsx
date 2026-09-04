'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Conflict } from '@/lib/types';
import { DATA_URLS } from '@/lib/data-urls';
import {
  formatYear,
  formatYearRange,
  formatDuration,
  formatCompactRange,
  formatCasualties,
  importanceLabel,
} from '@/lib/format';
import { getEmpireDescription } from '@/lib/empire-descriptions';
import { useFocusTrap } from '@/lib/focus-trap';
import { SheetActions } from './Sidebar';

/**
 * Wikipedia summary cache shape (matches public/empire-wikipedia.json
 * produced by scripts/fetch_wikipedia_summaries.py).
 */
interface WikipediaEntry {
  title: string;
  description?: string | null;
  extract: string;
  url?: string | null;
  fetchedAt: string;
  license: string;
}

/** Shared singleton so multiple sidebar mounts don't re-fetch the JSON. */
let wikipediaCachePromise: Promise<Record<string, WikipediaEntry>> | null = null;
function loadWikipediaCache(): Promise<Record<string, WikipediaEntry>> {
  if (wikipediaCachePromise) return wikipediaCachePromise;
  wikipediaCachePromise = fetch(DATA_URLS.empireWikipedia)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({} as Record<string, WikipediaEntry>));
  return wikipediaCachePromise;
}

/** What kind of polity a feature was. Only `state` earns a solid border. */
export type PolityType =
  | 'state'
  | 'tributary'
  | 'confederation'
  | 'culture'
  | 'nomadic-range'
  | 'chiefdom';

/** Provenance enum for the polygon; the free-text detail lives in
 *  `sourceDetail`. */
export type EmpireSource =
  | 'historical-basemaps'
  | 'hand-crafted-from-atlases'
  | 'reconstructed-clipped-country'
  | 'approximate-cultural-extent'
  | 'cliopatria-seshat'
  | 'manual';

const SOURCE_LABELS: Record<EmpireSource, string> = {
  'historical-basemaps': 'aourednik / historical-basemaps',
  'hand-crafted-from-atlases': 'hand-crafted from scholarly atlases',
  'reconstructed-clipped-country': 'reconstructed from Natural Earth country boundaries',
  'approximate-cultural-extent': 'approximate cultural extent (no primary GIS source)',
  'cliopatria-seshat': 'Cliopatria / Seshat Global History Databank (CC BY 4.0)',
  'manual': 'manual construction / verification',
};

function sourceLabel(source: string): string {
  return (SOURCE_LABELS as Record<string, string>)[source] ?? source;
}

/**
 * Properties carried on every empire feature in public/empires.json.
 * (Geometry isn't in here — the sidebar only needs metadata + bbox.)
 */
export interface EmpireProperties {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  color?: string;
  /** True when the polygon is from canonical historical-basemaps data, a
   *  whole-country Natural Earth union, or a hand-crafted polygon based on
   *  scholarly maps. False / absent for clip-to-country approximations. */
  accurate?: boolean;
  /** "solid" or "dashed" — encodes border-style on the map. */
  borderStyle?: 'solid' | 'dashed';
  /** Where the polygon came from (enum; legacy free text tolerated). */
  source?: EmpireSource | string;
  /** Verbatim provenance detail — the atlas page, LiDAR survey, basemap
   *  snapshot name, etc. — preserved from the pre-enum free-text source. */
  sourceDetail?: string;
  /** Editorial note on the border itself (what was clipped, where the
   *  line is most uncertain). */
  borderNote?: string;
  /** When source === historical-basemaps, the year-snapshot used. */
  borderYear?: number;
  /** When source === historical-basemaps, the matched feature name. */
  matchedRegion?: string;
  /** When source === hand-crafted-from-atlases, a brief sourcing note. */
  handCraftedNote?: string;
  /** What kind of polity this was, used to drive border rendering and the
   *  sidebar caption. Only `state` empires earn solid borders even if the
   *  polygon is well-traced — for the others the underlying historical
   *  reality lacked a surveyed frontier. */
  polityType?: PolityType | string;
  /** Optional bbox (minLon, minLat, maxLon, maxLat) — computed by caller. */
  bbox?: [number, number, number, number];
}

interface Props {
  empire: EmpireProperties;
  /** All conflicts — used to surface the major wars active during this empire. */
  allConflicts: Conflict[];
  /** Click handler for navigating to a conflict. */
  onConflictClick: (c: Conflict) => void;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────────
 * EMPIRE SIDEBAR — editorial detail panel for a polygon click.
 *
 * Mirrors the conflict Sidebar's hierarchy:
 *   Header        — mono line: swatch · EMPIRE · dates · duration;
 *                   serif title + action toolbar (Cite · Link · Wikipedia · Close)
 *   Hook          — italic display serif (curated for top empires)
 *   Narrative     — "What it was" prose
 *   Significance  — "Why it mattered" with amber eyebrow
 *   Borders       — confidence + source attribution + dashed/solid swatch
 *   Active wars   — top-importance conflicts overlapping the empire's lifetime
 *   Footer        — bbox + ID, mono, dashed top rule
 *
 * Only one of EmpireSidebar / Sidebar can be open at once — handled in
 * app/page.tsx via mutually-exclusive selected state.
 * ─────────────────────────────────────────────────────────── */

/** Heading shown above the source-attribution swatch. The dashed/solid state
 *  is already decided in the parent; this just gives it a name that reflects
 *  why the line is dashed — polygon fidelity vs. the polity itself being a
 *  cultural sphere or nomadic range. */
function bordersHeading(isDashed: boolean, polityType?: string): string {
  if (!isDashed) return 'Reconstructed borders';
  switch (polityType) {
    case 'tributary':     return 'Tributary network';
    case 'confederation': return 'Confederation';
    case 'culture':       return 'Cultural sphere';
    case 'nomadic-range': return 'Nomadic range';
    case 'chiefdom':      return 'Chiefdom';
    default:              return 'Approximate borders';
  }
}

/** One-sentence explanation paired with the heading. When the polygon itself
 *  is well-traced (isAccurate=true) but rendered dashed because of polity
 *  type, the caption explains that distinction explicitly so the reader
 *  doesn't think we just didn't bother sourcing it. */
function bordersCaption(
  isDashed: boolean,
  polityType?: string,
  isAccurate?: boolean,
): string {
  if (!isDashed) {
    return 'Solid borders are reconstructed from canonical historical-basemap data or hand-crafted from scholarly atlases.';
  }
  switch (polityType) {
    case 'tributary':
      return isAccurate
        ? 'The center is well-attested, but the line is a tribute-relationship periphery rather than a surveyed frontier.'
        : 'A paramount-chiefdom-style polity with tributary peripheries; exact extent is contested.';
    case 'confederation':
      return isAccurate
        ? 'A confederation of independent groups sharing identity. The shape reflects member-territory union, not a unified state.'
        : 'A confederation of independent groups; member territories shifted and overlapped, so the perimeter is approximate.';
    case 'culture':
      return isAccurate
        ? 'An archaeological culture defined by material remains. The line is a probability cloud, not a frontier.'
        : 'An archaeological culture; extent is defined by where its material remains have been found rather than by political control.';
    case 'nomadic-range':
      return isAccurate
        ? 'A pastoralist or hunter-gatherer range. Seasonal use shifted across decades, so the line is the rough envelope of a moving territory.'
        : 'A pastoralist or hunter-gatherer range whose extent shifted constantly with seasons and alliances.';
    case 'chiefdom':
      return isAccurate
        ? 'A paramount chiefdom with tributary peripheries. The center is well-attested; the outer line marks the reach of tribute and kinship, not a surveyed frontier.'
        : 'A paramount chiefdom with tributary peripheries; extent is inferred from settlement and tribute patterns and remains approximate.';
    default:
      return 'Dashed borders mark empires whose extent we can date but whose precise frontiers are contested or undocumented.';
  }
}

function EmpireSidebar({
  empire,
  allConflicts,
  onConflictClick,
  onClose,
}: Props) {
  const e = empire;
  const desc = getEmpireDescription(e.id);
  const isAccurate = !!e.accurate;

  // Wikipedia extract (lazy-loaded, optional). Only attempts to fetch the
  // cache file once per app session via the singleton above.
  const [wiki, setWiki] = useState<WikipediaEntry | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadWikipediaCache().then((cache) => {
      if (cancelled) return;
      setWiki(cache[e.id] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [e.id]);
  // Solid borders are reserved for empires that BOTH have a faithful polygon
  // (accurate=true) AND were administratively-bordered states. Tributary,
  // confederation, culture, nomadic-range and chiefdom types render dashed
  // regardless.
  const isStatePolity = e.polityType === 'state' || e.polityType === undefined;
  const isDashed = e.borderStyle === 'dashed' || !isAccurate || !isStatePolity;
  const duration = formatDuration(e.startYear, e.endYear);
  // "Copied" confirmation after a successful clipboard write (~1.5 s).
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setCopied(false);
  }, [e.id]);
  // Non-modal: focus lands on Close on open and returns on close.
  useFocusTrap(asideRef, true, { trap: false, initialFocus: closeRef });

  // Permalink for citations — empires don't have a /e/[id] route yet, so this
  // builds a year-anchored deep-link that scrolls the timeline to the empire's
  // start year. It's a useful share target even without a per-empire page.
  const permalink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/#year=${e.startYear}`
      : `/#year=${e.startYear}`;

  // Conflicts whose lifetime overlaps the empire's. We restrict to importance ≥ 3
  // so the list stays short and editorial-grade.
  const overlappingConflicts = useMemo(() => {
    const empireEnd = e.endYear ?? new Date().getFullYear();
    const matches = allConflicts.filter((c) => {
      if (c.importance < 3) return false;
      const cEnd = c.endYear ?? c.startYear;
      // Lifetime overlap test
      return c.startYear <= empireEnd && cEnd >= e.startYear;
    });
    // Sort by importance (desc), then by start year (asc)
    matches.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return a.startYear - b.startYear;
    });
    return matches.slice(0, 12);
  }, [allConflicts, e.startYear, e.endYear]);

  const handleCite = async () => {
    const citation = `${e.name} (${formatYearRange(e.startYear, e.endYear)}). War Atlas. ${permalink}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
    } catch {
      // ignore — clipboard might be blocked
    }
  };

  // Tone for the swatch — falls back to vermilion if the empire color is
  // missing or non-hex.
  const swatchColor = e.color && /^#?[0-9a-f]{3,8}$/i.test(e.color) ? e.color : 'var(--vermilion)';

  return (
    <aside
      ref={asideRef}
      className="sidebar-sheet surface-sheet border-0 border-t sm:border-t-0 sm:border-l
                 fixed sm:absolute z-40 flex flex-col overflow-hidden
                 left-0 right-0 top-auto h-[72dvh] sm:h-auto
                 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:bottom-0
                 sm:top-0 sm:right-0 sm:left-auto
                 w-full sm:max-w-[460px]"
      style={{ color: 'var(--ink-text)', boxShadow: 'var(--shadow-pop)' }}
      role="dialog"
      aria-labelledby="empire-sidebar-title"
    >
      {/* Mobile drag handle */}
      <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'var(--rule-strong)',
          }}
        />
      </div>

      {/* ─── Header (sticky: outside the scroll container) ───── */}
      <header className="px-5 sm:px-6 pt-2 sm:pt-4 pb-4 hairline-b flex-shrink-0">
        <div
          className="font-mono text-mono text-wars-text-2 flex items-center gap-2 flex-wrap"
          style={{ letterSpacing: '0.04em' }}
        >
          <span
            className="inline-block w-2.5 h-2.5 flex-shrink-0"
            style={{
              background: swatchColor,
              opacity: 0.8,
              border: isDashed ? '1px dashed currentColor' : '1px solid currentColor',
              color: swatchColor,
            }}
            aria-hidden
          />
          <span className="uppercase">{isDashed ? 'Empire · approximate' : 'Empire'}</span>
          <span className="text-wars-faint" aria-hidden>·</span>
          <span>{formatYearRange(e.startYear, e.endYear)}</span>
          {duration && (
            <>
              <span className="text-wars-faint" aria-hidden>·</span>
              <span>{duration}</span>
            </>
          )}
          <span role="status" aria-live="polite" className="ml-auto text-wars-text">
            {copied ? 'Copied' : ''}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3 mt-2">
          <h2
            id="empire-sidebar-title"
            className="font-display text-display-l text-wars-text flex-1 min-w-0"
            style={{
              fontWeight: 400,
              margin: 0,
              paddingTop: 2,
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            {e.name}
          </h2>
          <SheetActions
            onCite={handleCite}
            permalink={permalink}
            wikipediaUrl={wiki?.url ?? null}
            onClose={onClose}
            closeRef={closeRef}
            closeLabel={`Close ${e.name}`}
          />
        </div>
      </header>

      {/* ─── Body (scrollable) ──────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 sm:px-6 pb-8">
        {/* HOOK — italic display serif */}
        {desc?.hook && (
          <div className="py-5 hairline-b">
            <p
              className="font-display text-display-s text-wars-text m-0 italic"
              style={{
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {desc.hook}
            </p>
          </div>
        )}

        {/* NARRATIVE */}
        {desc?.narrative && (
          <section className="py-5 hairline-b" aria-labelledby="es-narrative">
            <h3 id="es-narrative" className="eyebrow mb-2.5 m-0">What it was</h3>
            <p
              className="font-display text-wars-text m-0"
              style={{
                fontSize: 14.5,
                lineHeight: 1.6,
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {desc.narrative}
            </p>
          </section>
        )}

        {/* SIGNIFICANCE — amber eyebrow signals commentary */}
        {desc?.significance && (
          <section className="py-5 hairline-b" aria-labelledby="es-significance">
            <h3 id="es-significance" className="eyebrow mb-2.5 m-0" style={{ color: 'var(--amber)' }}>
              Why it mattered
            </h3>
            <p
              className="font-display text-wars-text-2 m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {desc.significance}
            </p>
          </section>
        )}

        {/* WIKIPEDIA EXTRACT — supplements curated content (when present),
            or fills the body for empires without a curated description.
            CC-BY-SA license requires clear attribution + a link to the source. */}
        {wiki?.extract && (
          <section className="py-5 hairline-b" aria-labelledby="es-wiki">
            <h3 id="es-wiki" className="eyebrow mb-2.5 m-0">
              {desc ? 'From Wikipedia' : 'Overview'}
            </h3>
            <p
              className="font-display text-wars-text m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {wiki.extract}
            </p>
            <p
              className="font-mono mt-2.5 text-wars-faint"
              style={{ fontSize: 12, letterSpacing: '0.02em' }}
            >
              {wiki.url ? (
                <a
                  href={wiki.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-wars-text transition-colors"
                  style={{
                    color: 'var(--indigo)',
                    textDecoration: 'none',
                    borderBottom: '1px solid currentColor',
                  }}
                >
                  Wikipedia: {wiki.title}
                </a>
              ) : (
                <span>Wikipedia: {wiki.title}</span>
              )}
              <span className="text-wars-faint mx-1.5">·</span>
              <span>{wiki.license}</span>
            </p>
          </section>
        )}

        {/* If we have NO curated content AND no Wikipedia extract, show
            a graceful note instead. */}
        {!desc && !wiki?.extract && (
          <div className="py-5 hairline-b">
            <p
              className="font-display italic text-wars-muted m-0"
              style={{ fontSize: 14, lineHeight: 1.55 }}
            >
              No editorial summary yet for {e.name}. The borders shown reflect
              what we have in the dataset; conflicts active during this period
              are listed below.
            </p>
          </div>
        )}

        {/* BORDERS & ACCURACY */}
        <section className="py-5 hairline-b" aria-labelledby="es-borders">
          <h3 id="es-borders" className="eyebrow mb-2.5 m-0">Borders &amp; accuracy</h3>
          <div className="flex items-center gap-3 mb-2">
            <svg width="44" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="44"
                y2="3"
                stroke={swatchColor}
                strokeWidth={isDashed ? 1.2 : 1.5}
                strokeDasharray={isDashed ? '4 4' : undefined}
                opacity="0.85"
              />
            </svg>
            <span
              className="font-display text-wars-text"
              style={{ fontSize: 14.5, fontWeight: 500 }}
            >
              {bordersHeading(isDashed, e.polityType)}
            </span>
          </div>
          <p
            className="font-display italic text-wars-text-2 m-0"
            style={{ fontSize: 13, lineHeight: 1.55 }}
          >
            {bordersCaption(isDashed, e.polityType, isAccurate)}
          </p>

          {/* Source attribution — only when we have any */}
          {(e.source || e.sourceDetail || e.borderNote || e.borderYear || e.matchedRegion || e.handCraftedNote) && (
            <ul className="mt-3 space-y-1.5">
              {e.source && (
                <li className="font-mono text-mono text-wars-faint">
                  <span className="text-wars-muted mr-1.5">SOURCE</span>
                  {sourceLabel(e.source)}
                </li>
              )}
              {e.sourceDetail && (
                <li className="font-mono text-mono text-wars-faint break-words">
                  <span className="text-wars-muted mr-1.5">DETAIL</span>
                  {e.sourceDetail}
                </li>
              )}
              {e.borderYear !== undefined && (
                <li className="font-mono text-mono text-wars-faint">
                  <span className="text-wars-muted mr-1.5">SNAPSHOT</span>
                  {formatYear(e.borderYear)}
                </li>
              )}
              {e.matchedRegion && (
                <li className="font-mono text-mono text-wars-faint">
                  <span className="text-wars-muted mr-1.5">MATCHED</span>
                  {e.matchedRegion}
                </li>
              )}
              {e.handCraftedNote && (
                <li
                  className="font-display italic text-wars-text-2"
                  style={{ fontSize: 12, lineHeight: 1.5 }}
                >
                  {e.handCraftedNote}
                </li>
              )}
              {e.borderNote && (
                <li
                  className="font-display italic text-wars-text-2"
                  style={{ fontSize: 12.5, lineHeight: 1.5 }}
                >
                  <span className="font-mono not-italic text-mono text-wars-muted mr-1.5">NOTE</span>
                  {e.borderNote}
                </li>
              )}
            </ul>
          )}
        </section>

        {/* ACTIVE DURING THIS PERIOD */}
        {overlappingConflicts.length > 0 && (
          <section className="py-5 hairline-b" aria-labelledby="es-wars">
            <h3 id="es-wars" className="eyebrow mb-2.5 m-0">
              Major wars during this period
            </h3>
            <div className="space-y-1.5">
              {overlappingConflicts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onConflictClick(c)}
                  className="block w-full text-left transition-colors hover:text-wars-text"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="font-display text-wars-text"
                      style={{ fontSize: 13.5, lineHeight: 1.3, fontWeight: 400 }}
                    >
                      {c.name}
                    </span>
                    <span className="font-mono text-mono text-wars-faint flex-shrink-0">
                      {formatCompactRange(c.startYear, c.endYear)}
                    </span>
                  </div>
                  <div className="font-mono text-mono text-wars-faint mt-0.5 uppercase" style={{ letterSpacing: '0.04em' }}>
                    {importanceLabel(c.importance)}
                    {c.casualties != null && (
                      <span className="normal-case"> · {formatCasualties(c.casualties)} dead</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="font-mono text-mono text-wars-faint flex justify-between gap-3 flex-wrap mt-5 pt-3"
          style={{ borderTop: '1px dashed var(--rule)' }}
        >
          <span>
            {e.bbox
              ? `${e.bbox[0].toFixed(1)}°,${e.bbox[1].toFixed(1)}° → ${e.bbox[2].toFixed(1)}°,${e.bbox[3].toFixed(1)}°`
              : ''}
          </span>
          <span>WARS-ATLAS / EMPIRE / {e.id.toUpperCase()}</span>
        </footer>
      </div>
    </aside>
  );
}

export default memo(EmpireSidebar);
