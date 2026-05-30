'use client';

import { useEffect, useRef } from 'react';
import { Conflict } from '@/lib/types';
import { formatYear } from '@/lib/conflicts';
import { CasualtyRange } from './CasualtyBar';

interface SidebarProps {
  conflict: Conflict;
  onClose: () => void;
  /** All conflicts — used to render parent/child graph. */
  allConflicts?: Conflict[];
  /** Click handler for navigating to a related conflict. */
  onConflictClick?: (c: Conflict) => void;
}

/* ─────────────────────────────────────────────────────────────
 * SIDEBAR — editorial conflict detail.
 *
 * Hierarchy (top → bottom, hairline dividers between sections):
 *   Header           — eyebrow + ID + close; serif title; mono dates
 *   Hook             — Source Serif italic 17px, no eyebrow
 *   What happened    — eyebrow + serif body
 *   Why it mattered  — amber eyebrow + serif italic body (commentary)
 *   Belligerents     — 2-col grid, mono index + name (no chips)
 *   Casualty range   — bespoke microvis (CasualtyRange)
 *   Conflict graph   — vertical lineage line
 *   Sources          — numbered ol with dotted dividers
 *   Footer           — coords + ID, mono, dashed top rule
 *
 * Ranges, not headlines. Source attribution always visible.
 * ─────────────────────────────────────────────────────────── */

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

function importanceLabel(i: number): string {
  switch (i) {
    case 5: return 'World-changing';
    case 4: return 'Major conflict';
    case 3: return 'Significant';
    case 2: return 'Regional';
    default: return 'Minor';
  }
}

export default function Sidebar({
  conflict,
  onClose,
  allConflicts,
  onConflictClick,
}: SidebarProps) {
  const c = conflict as Conflict & {
    hook?: string;
    narrative?: string;
    significance?: string;
  };
  const hasTiered = !!(c.hook || c.narrative || c.significance);

  // Scroll the panel back to the top whenever we switch wars. Without
  // this, clicking a related conflict (or another dot on the map) re-renders
  // new content into the same scrollable element but leaves the scroll
  // position where the user left it — so the new war's title / hook /
  // narrative are hidden above the fold and it looks like the panel didn't
  // update. Reset on conflict.id change.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [conflict.id]);

  // Permalink for citations
  const permalink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${c.id}`
      : `/c/${c.id}`;

  const handleCite = async () => {
    const yearRange = c.endYear && c.endYear !== c.startYear
      ? `${formatYear(c.startYear)}–${formatYear(c.endYear)}`
      : formatYear(c.startYear);
    const citation = `${c.name} (${yearRange}). War Atlas. ${permalink}`;
    try {
      await navigator.clipboard.writeText(citation);
    } catch {
      // Clipboard might be blocked; fall back to selection.
    }
  };

  return (
    <aside
      className="sidebar-sheet fixed sm:absolute z-40 flex flex-col overflow-hidden
                 left-0 right-0 top-auto h-[72dvh] sm:h-auto
                 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:bottom-0
                 sm:top-0 sm:right-0 sm:left-auto
                 w-full sm:max-w-[460px]"
      style={{
        background: 'oklch(0.18 0.014 250 / 0.97)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderTop: '1px solid var(--rule-strong)',
        color: 'var(--ink-text)',
        boxShadow: 'var(--shadow-pop)',
      }}
      role="dialog"
      aria-label={`Details for ${c.name}`}
    >
      {/* Mobile drag handle — decorative; tap area still clickable on the X */}
      <div
        className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0"
        aria-hidden
      >
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
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--vermilion)' }}
            aria-hidden
          />
          <span className="eyebrow">{importanceLabel(c.importance)}</span>
          <span className="font-mono text-mono-xs text-wars-faint ml-auto">
            {c.id}
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
          {c.name}
        </h2>

        <div
          className="font-mono mt-2.5 text-meta text-wars-text-2"
          style={{ letterSpacing: '0.05em' }}
        >
          {formatYear(c.startYear)}
          {c.endYear && c.endYear !== c.startYear
            ? ` — ${formatYear(c.endYear)}`
            : !c.endYear && c.startYear > 2000
              ? ' — present'
              : ''}
          <span className="text-wars-faint mx-2">·</span>
          {c.endYear
            ? `${c.endYear - c.startYear} years`
            : c.startYear > 2000
              ? 'Ongoing'
              : '< 1 year'}
        </div>
      </header>

      {/* ─── Body (scrollable) ──────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 pb-8">
        {/* HOOK — italic display serif */}
        {c.hook && (
          <div className="py-5 hairline-b">
            <p
              className="font-display text-display-s text-wars-text m-0 italic"
              style={{
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {c.hook}
            </p>
          </div>
        )}

        {/* NARRATIVE */}
        {c.narrative && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">What happened</div>
            <p
              className="font-display text-wars-text m-0"
              style={{
                fontSize: 14.5,
                lineHeight: 1.65,
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {c.narrative}
            </p>
          </section>
        )}

        {/* SIGNIFICANCE — amber eyebrow signals commentary */}
        {c.significance && (
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
              {c.significance}
            </p>
          </section>
        )}

        {/* Fallback (no tiered fields) — show flat description */}
        {!hasTiered && c.description && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">Overview</div>
            <p
              className="font-display text-wars-text m-0"
              style={{ fontSize: 14, lineHeight: 1.65, fontWeight: 400 }}
            >
              {c.description}
            </p>
          </section>
        )}

        {/* BELLIGERENTS — 2-col list, no chips */}
        {c.countries.length > 0 && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">Belligerents</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {c.countries.map((co, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-2 text-ui text-wars-text"
                >
                  <span className="font-mono text-mono-xs text-wars-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{co}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* "Part of" — clickable parent ref pills are ditched in favor
            of a simple inline list. */}
        {c.partOf.length > 0 && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-2.5">Part of</div>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {c.partOf.map((parent) => {
                const parentConflict = allConflicts?.find(
                  (a) => a.id === parent || a.name === parent
                );
                const label = parentConflict?.name ?? parent;
                if (parentConflict && onConflictClick) {
                  return (
                    <button
                      key={parent}
                      onClick={() => onConflictClick(parentConflict)}
                      className="font-display text-body text-wars-text hover:text-wars-accent transition-colors"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--rule-strong)',
                      }}
                    >
                      {label}
                    </button>
                  );
                }
                return (
                  <span
                    key={parent}
                    className="font-display text-body text-wars-text-2"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* CASUALTY RANGE — bespoke microvis */}
        {(c.casualties != null || c.casualtyRange) && (
          <section className="py-5 hairline-b">
            <div className="eyebrow mb-1">Estimated casualties</div>
            <CasualtyRange casualties={c.casualties} range={c.casualtyRange} />
          </section>
        )}

        {/* CONFLICT GRAPH */}
        {allConflicts && onConflictClick && (
          <section className="py-5 hairline-b">
            <ConflictGraphInline
              conflict={c}
              allConflicts={allConflicts}
              onConflictClick={onConflictClick}
            />
          </section>
        )}

        {/* SOURCES — numbered ol with dotted dividers + indigo links */}
        {((c.sources && c.sources.length > 0) || c.wikipediaUrl) && (
          <section className="py-5">
            {c.sources && c.sources.length > 0 && (
              <>
                <div className="eyebrow mb-2.5">Sources</div>
                <ol className="m-0 p-0 list-none">
                  {c.sources.map((s, i) => (
                    <li
                      key={i}
                      className="font-display flex gap-2.5 py-1.5 text-wars-text-2"
                      style={{
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        borderBottom:
                          i === c.sources!.length - 1
                            ? 'none'
                            : '1px dotted var(--rule)',
                      }}
                    >
                      <span
                        className="font-mono text-mono-xs text-wars-faint flex-shrink-0"
                        style={{ paddingTop: 2 }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-wars-text-2 hover:text-wars-accent transition-colors"
                          style={{
                            textDecoration: 'none',
                            borderBottom: '1px solid var(--rule)',
                            paddingBottom: 1,
                          }}
                        >
                          {s.label}
                        </a>
                      ) : (
                        <span>{s.label}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </>
            )}

            {/* Editorial action row — indigo links, no buttons */}
            <div className="mt-3.5 flex flex-wrap gap-2 items-center text-meta text-wars-muted">
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
                href={`/c/${c.id}`}
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
              {c.wikipediaUrl && (
                <>
                  <span className="text-wars-faint">·</span>
                  <a
                    href={c.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-ui hover:text-wars-text transition-colors"
                    style={{
                      color: 'var(--indigo)',
                      textDecoration: 'none',
                      borderBottom: '1px solid currentColor',
                      paddingBottom: 1,
                      fontSize: 11,
                    }}
                  >
                    Wikipedia
                  </a>
                </>
              )}
            </div>
          </section>
        )}

        {/* Footer — coords + ID, dashed top rule */}
        <footer
          className="font-mono text-mono-xs text-wars-faint flex justify-between mt-3 pt-3"
          style={{ borderTop: '1px dashed var(--rule)' }}
        >
          <span>
            {c.coordinates[1].toFixed(2)}°{c.coordinates[1] >= 0 ? 'N' : 'S'}
            {' · '}
            {c.coordinates[0].toFixed(2)}°{c.coordinates[0] >= 0 ? 'E' : 'W'}
          </span>
          <span>WARS-ATLAS / {c.id.toUpperCase()}</span>
        </footer>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Inline conflict graph — vertical lineage line, "You are here"
 * with amber square node, parents above + children/siblings below.
 *
 * Defined inline (not pulled from ConflictGraph.tsx) so the visual
 * structure here is owned by the sidebar redesign. Step 6 will
 * decide whether to extract it back out.
 * ─────────────────────────────────────────────────────────── */

interface GraphProps {
  conflict: Conflict;
  allConflicts: Conflict[];
  onConflictClick: (c: Conflict) => void;
}

function ConflictGraphInline({ conflict, allConflicts, onConflictClick }: GraphProps) {
  const parents = (conflict.partOf || [])
    .map((p) => allConflicts.find((c) => c.id === p || c.name === p))
    .filter((c): c is Conflict => Boolean(c));

  const children = allConflicts.filter((c) =>
    (c.partOf || []).some((p) => p === conflict.id || p === conflict.name)
  );

  const firstParent = parents[0];
  const siblings = firstParent
    ? allConflicts.filter(
        (c) =>
          c.id !== conflict.id &&
          (c.partOf || []).some(
            (p) => p === firstParent.id || p === firstParent.name
          )
      )
    : [];

  if (parents.length === 0 && children.length === 0) return null;

  return (
    <div className="pt-1">
      <div className="eyebrow mb-3.5">Conflict graph</div>

      {/* Vertical lineage line */}
      <div className="relative pl-3.5">
        <div
          className="absolute left-1 top-2 bottom-2 w-px"
          style={{ background: 'var(--rule-strong)' }}
        />

        {parents.map((p) => (
          <GraphRow
            key={p.id}
            c={p}
            role="parent"
            onClick={() => onConflictClick(p)}
          />
        ))}

        {/* Current node — amber square + "You are here" */}
        <div className="relative py-2 -ml-3.5 pl-3.5">
          <div
            className="absolute left-0 top-1/2 w-2 h-2 -translate-y-1/2"
            style={{ background: 'var(--amber)', borderRadius: 2 }}
          />
          <div
            className="font-display text-wars-text"
            style={{ fontSize: 15, fontWeight: 500 }}
          >
            {conflict.name}
            <span className="font-mono text-mono-xs text-wars-faint ml-2">
              {shortYear(conflict.startYear)}
            </span>
          </div>
          <div
            className="eyebrow mt-0.5"
            style={{ fontSize: 9, color: 'var(--ink-faint)' }}
          >
            You are here
          </div>
        </div>

        {children.length > 0 && (
          <div className="pt-1">
            <div
              className="eyebrow mb-2"
              style={{ fontSize: 9, color: 'var(--ink-muted)' }}
            >
              Includes {children.length} sub-conflict
              {children.length === 1 ? '' : 's'}
            </div>
            {children
              .slice()
              .sort((a, b) => a.startYear - b.startYear)
              .slice(0, 8)
              .map((c) => (
                <GraphRow
                  key={c.id}
                  c={c}
                  role="child"
                  onClick={() => onConflictClick(c)}
                />
              ))}
          </div>
        )}

        {firstParent && siblings.length > 0 && (
          <div className="pt-2">
            <div
              className="eyebrow mb-2"
              style={{ fontSize: 9, color: 'var(--ink-muted)' }}
            >
              Other parts of {firstParent.name}
            </div>
            {siblings.slice(0, 4).map((c) => (
              <GraphRow
                key={c.id}
                c={c}
                role="sibling"
                onClick={() => onConflictClick(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GraphRowProps {
  c: Conflict;
  role: 'parent' | 'child' | 'sibling';
  onClick: () => void;
}

function GraphRow({ c, role, onClick }: GraphRowProps) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left relative py-1.5 -ml-3.5 pl-3.5 hover:text-wars-text transition-colors"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      {/* Tick mark across the line */}
      <span
        className="absolute left-0 top-1/2 w-[9px] h-px"
        style={{ background: 'var(--rule-strong)' }}
      />
      {/* Square node */}
      <span
        className="absolute left-[1px] top-1/2 w-1.5 h-1.5 -translate-y-1/2"
        style={{
          background:
            role === 'parent' ? 'var(--vermilion)' : 'var(--ink-2)',
          border: '1px solid var(--rule-strong)',
          borderRadius: 1,
        }}
      />
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="font-display text-wars-text-2"
          style={{ fontSize: 13.5, lineHeight: 1.3, fontWeight: 400 }}
        >
          {c.name}
        </span>
        <span className="font-mono text-mono-xs text-wars-faint flex-shrink-0">
          {shortYear(c.startYear)}
          {c.endYear && c.endYear !== c.startYear
            ? `–${String(c.endYear).slice(-2)}`
            : ''}
        </span>
      </div>
      {c.casualties != null && (
        <div className="font-mono text-mono-xs text-wars-faint mt-0.5">
          {fmtCasualty(c.casualties)} dead
        </div>
      )}
    </button>
  );
}
