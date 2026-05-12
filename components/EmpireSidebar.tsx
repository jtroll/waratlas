'use client';

import { useEffect, useMemo, useState } from 'react';
import { Conflict } from '@/lib/types';
import { formatYear } from '@/lib/conflicts';
import { getEmpireDescription } from '@/lib/empire-descriptions';

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
  wikipediaCachePromise = fetch('/empire-wikipedia.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({} as Record<string, WikipediaEntry>));
  return wikipediaCachePromise;
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
  /** Where the polygon came from. */
  source?: 'historical-basemaps' | 'hand-crafted-from-atlases' | string;
  /** When source === historical-basemaps, the year-snapshot used. */
  borderYear?: number;
  /** When source === historical-basemaps, the matched feature name. */
  matchedRegion?: string;
  /** When source === hand-crafted-from-atlases, a brief sourcing note. */
  handCraftedNote?: string;
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
 *   Header        — confidence eyebrow + ID + close
 *   Title         — serif name; mono date range + duration
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

function importanceLabel(i: number): string {
  switch (i) {
    case 5: return 'World-changing';
    case 4: return 'Major conflict';
    case 3: return 'Significant';
    case 2: return 'Regional';
    default: return 'Minor';
  }
}

function fmtCasualty(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function shortYear(y: number): string {
  return y < 0 ? `${-y} BCE` : `${y}`;
}

export default function EmpireSidebar({
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
  const isDashed = e.borderStyle === 'dashed' || !isAccurate;
  const duration = e.endYear ? e.endYear - e.startYear : null;

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
    const yearRange =
      e.endYear && e.endYear !== e.startYear
        ? `${formatYear(e.startYear)}–${formatYear(e.endYear)}`
        : formatYear(e.startYear);
    const citation = `${e.name} (${yearRange}). War Atlas. ${permalink}`;
    try {
      await navigator.clipboard.writeText(citation);
    } catch {
      // ignore — clipboard might be blocked
    }
  };

  // Tone for the swatch — falls back to vermilion if the empire color is
  // missing or non-hex.
  const swatchColor = e.color && /^#?[0-9a-f]{3,8}$/i.test(e.color) ? e.color : 'rgb(200, 85, 59)';

  return (
    <aside
      className="sidebar-sheet fixed sm:absolute z-40 flex flex-col overflow-hidden
                 left-0 right-0 top-auto h-[72dvh] sm:h-auto
                 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:bottom-0
                 sm:top-0 sm:right-0 sm:left-auto
                 w-full sm:max-w-[460px]"
      style={{
        background: 'oklch(0.18 0.014 250 / 0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--rule-strong)',
        color: 'var(--ink-text)',
        boxShadow: 'var(--shadow-pop)',
      }}
      role="dialog"
      aria-label={`Details for ${e.name}`}
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

      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="px-6 pt-3 sm:pt-5 pb-4 hairline-b flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="inline-block w-2.5 h-2.5"
            style={{
              background: swatchColor,
              opacity: 0.8,
              border: isDashed
                ? '1px dashed currentColor'
                : '1px solid currentColor',
              color: swatchColor,
            }}
            aria-hidden
          />
          <span className="eyebrow">Empire</span>
          <span className="font-mono text-mono-xs text-wars-faint ml-auto">
            {e.id}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-2 inline-flex items-center justify-center w-[22px] h-[22px] text-wars-muted hover:text-wars-text transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--rule-strong)',
            }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <path
                d="M1 1 L8 8 M8 1 L1 8"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
          </button>
        </div>

        <h2
          className="font-display text-display-l text-wars-text"
          style={{
            fontWeight: 400,
            margin: 0,
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}
        >
          {e.name}
        </h2>

        <div
          className="font-mono mt-2.5 text-meta text-wars-text-2"
          style={{ letterSpacing: '0.05em' }}
        >
          {formatYear(e.startYear)}
          {e.endYear && e.endYear !== e.startYear
            ? ` — ${formatYear(e.endYear)}`
            : ''}
          {duration !== null && (
            <>
              <span className="text-wars-faint mx-2">·</span>
              {duration} years
            </>
          )}
        </div>
      </header>

      {/* ─── Body (scrollable) ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
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
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">What it was</div>
            <p
              className="font-display text-wars-text m-0"
              style={{
                fontSize: 14.5,
                lineHeight: 1.65,
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
          <section className="py-5 hairline-b">
            <div
              className="eyebrow mb-2.5"
              style={{ color: 'var(--amber)' }}
            >
              Why it mattered
            </div>
            <p
              className="font-display italic text-wars-text-2 m-0"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
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
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">
              {desc ? 'From Wikipedia' : 'Overview'}
            </div>
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
              style={{ fontSize: 10, letterSpacing: '0.02em' }}
            >
              {wiki.url ? (
                <a
                  href={wiki.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-wars-accent transition-colors"
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
        <section className="py-5 hairline-b">
          <div className="eyebrow mb-2.5">Borders &amp; accuracy</div>
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
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              {isDashed ? 'Approximate borders' : 'Reconstructed borders'}
            </span>
          </div>
          <p
            className="font-display italic text-wars-text-2 m-0"
            style={{ fontSize: 13, lineHeight: 1.55 }}
          >
            {isDashed
              ? 'Dashed borders mark empires whose extent we can date but whose precise frontiers are contested or undocumented.'
              : 'Solid borders are reconstructed from canonical historical-basemap data or hand-crafted from scholarly atlases.'}
          </p>

          {/* Source attribution — only when we have any */}
          {(e.source || e.borderYear || e.matchedRegion || e.handCraftedNote) && (
            <ul className="mt-3 space-y-1.5">
              {e.source === 'historical-basemaps' && (
                <li className="font-mono text-mono-xs text-wars-faint">
                  <span className="text-wars-muted mr-1.5">SOURCE</span>
                  aourednik / historical-basemaps
                </li>
              )}
              {e.source === 'hand-crafted-from-atlases' && (
                <li className="font-mono text-mono-xs text-wars-faint">
                  <span className="text-wars-muted mr-1.5">SOURCE</span>
                  hand-crafted from scholarly atlases
                </li>
              )}
              {e.source &&
                e.source !== 'historical-basemaps' &&
                e.source !== 'hand-crafted-from-atlases' && (
                  <li className="font-mono text-mono-xs text-wars-faint">
                    <span className="text-wars-muted mr-1.5">SOURCE</span>
                    {e.source}
                  </li>
                )}
              {e.borderYear !== undefined && (
                <li className="font-mono text-mono-xs text-wars-faint">
                  <span className="text-wars-muted mr-1.5">SNAPSHOT</span>
                  {formatYear(e.borderYear)}
                </li>
              )}
              {e.matchedRegion && (
                <li className="font-mono text-mono-xs text-wars-faint">
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
            </ul>
          )}
        </section>

        {/* ACTIVE DURING THIS PERIOD */}
        {overlappingConflicts.length > 0 && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">
              Major wars during this period
            </div>
            <div className="space-y-1.5">
              {overlappingConflicts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onConflictClick(c)}
                  className="block w-full text-left transition-colors hover:text-wars-accent"
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
                    <span className="font-mono text-mono-xs text-wars-faint flex-shrink-0">
                      {shortYear(c.startYear)}
                      {c.endYear && c.endYear !== c.startYear
                        ? `–${String(Math.abs(c.endYear)).slice(-2)}`
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span
                      className="eyebrow"
                      style={{ fontSize: 9, color: 'var(--ink-faint)' }}
                    >
                      {importanceLabel(c.importance)}
                    </span>
                    {c.casualties != null && (
                      <span className="font-mono text-mono-xs text-wars-faint">
                        · {fmtCasualty(c.casualties)} dead
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Editorial action row */}
        <section className="py-5">
          <div className="flex flex-wrap gap-2 items-center text-meta text-wars-muted">
            <button
              onClick={handleCite}
              className="font-ui hover:text-wars-text transition-colors"
              style={{
                color: 'var(--indigo)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                borderBottom: '1px solid currentColor',
                paddingBottom: 1,
                fontSize: 11,
              }}
              aria-label="Copy citation to clipboard"
            >
              Cite this entry
            </button>
            <span className="text-wars-faint">·</span>
            <a
              href={permalink}
              className="font-ui hover:text-wars-text transition-colors"
              style={{
                color: 'var(--indigo)',
                textDecoration: 'none',
                borderBottom: '1px solid currentColor',
                paddingBottom: 1,
                fontSize: 11,
              }}
            >
              Permalink
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="font-mono text-mono-xs text-wars-faint flex justify-between mt-3 pt-3"
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
