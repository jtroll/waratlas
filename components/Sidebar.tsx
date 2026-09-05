'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Conflict } from '@/lib/types';
import {
  conflictCitation,
  buildConflictRelations,
  getConflictChildren,
  resolveConflictRef,
  type ConflictRelations,
} from '@/lib/conflicts';
import {
  formatYear,
  formatYearRange,
  formatDuration,
  formatCompactRange,
  formatCasualties,
  formatDecade,
  formatCoordinates,
  importanceLabel,
} from '@/lib/format';
import { useFocusTrap } from '@/lib/focus-trap';
import { CasualtyRange } from './CasualtyBar';

interface SidebarProps {
  conflict: Conflict;
  onClose: () => void;
  /** All conflicts — used to render parent/child graph. */
  allConflicts?: Conflict[];
  /** Click handler for navigating to a related conflict. */
  onConflictClick?: (c: Conflict) => void;
  /** Parent/child index built once per dataset (lib/conflicts.ts). When
   *  omitted it is derived from allConflicts here. */
  relations?: ConflictRelations | null;
}

/* ─────────────────────────────────────────────────────────────
 * SIDEBAR — editorial conflict detail.
 *
 * Hierarchy (top → bottom, hairline dividers between sections):
 *   Header (sticky)  — mono line: importance · dates · duration;
 *                      serif title with a right-aligned action toolbar
 *                      (Cite · Link · Wikipedia · Close), always present
 *   Hook             — serif italic 17px; or, when no tiered prose exists,
 *                      the description in the same slot, upright 15px
 *   Casualties       — headline + bespoke microvis + source line
 *   What happened    — serif 14.5/1.6 upright
 *   Why it mattered  — amber eyebrow, upright, secondary ink
 *   Belligerents     — 2-col, capped at 8 with "+N more"
 *   Conflict graph   — parents breadcrumb, you-are-here node, children
 *                      grouped by decade, siblings under the first parent
 *   Sources          — numbered list with dotted dividers
 *   Footer           — coords + ID, mono, dashed top rule
 *
 * Ranges, not headlines. Source attribution always visible.
 * ─────────────────────────────────────────────────────────── */

const BELLIGERENT_CAP = 8;
const CHILD_CAP = 8;
const SIBLING_CAP = 5;

function Sidebar({
  conflict,
  onClose,
  allConflicts,
  onConflictClick,
  relations,
}: SidebarProps) {
  const c = conflict;
  const rel = useMemo(
    () => relations ?? (allConflicts ? buildConflictRelations(allConflicts) : null),
    [relations, allConflicts],
  );

  // Scroll the panel back to the top whenever we switch wars. Without
  // this, clicking a related conflict (or another dot on the map) re-renders
  // new content into the same scrollable element but leaves the scroll
  // position where the user left it. Reset on conflict.id change, along with
  // the disclosure toggles.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAllBelligerents, setShowAllBelligerents] = useState(false);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    setCopied(false);
    setShowAllBelligerents(false);
  }, [conflict.id]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  // Non-modal: focus lands on Close when the panel opens and returns to the
  // triggering element when it closes; Tab is free to leave for the map.
  useFocusTrap(asideRef, true, { trap: false, initialFocus: closeRef });

  const handleCite = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const citation = conflictCitation(c, origin);
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
    } catch {
      // Clipboard might be blocked; fall back to selection.
    }
  };
  const duration = formatDuration(c.startYear, c.endYear);

  // Hook slot: the curated hook when present; otherwise the flat description
  // stands in (upright, 15px) so the 97% of entries without tiered prose
  // don't open on an empty panel.
  const hookText = c.hook ?? (!c.narrative ? c.description : undefined);
  const hookIsCurated = !!c.hook;
  // If the description was used as the hook we don't repeat it below.
  const showDescription = !c.hook && !!c.narrative && !!c.description;

  const belligerents = showAllBelligerents
    ? c.countries
    : c.countries.slice(0, BELLIGERENT_CAP);
  const hiddenBelligerents = c.countries.length - belligerents.length;

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
      aria-labelledby="conflict-sidebar-title"
    >
      {/* Mobile drag handle — decorative */}
      <div className="sm:hidden flex justify-center pt-2 pb-1 flex-shrink-0" aria-hidden>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--rule-strong)' }} />
      </div>

      {/* ─── Header (sticky: sits outside the scroll container) ── */}
      <header className="px-5 sm:px-6 pt-2 sm:pt-4 pb-4 hairline-b flex-shrink-0">
        <div
          className="font-mono text-mono text-wars-text-2 flex items-center gap-2 flex-wrap"
          style={{ letterSpacing: '0.04em' }}
        >
          <span
            className="inline-block w-1.5 h-1.5 flex-shrink-0"
            style={{ background: 'var(--vermilion)' }}
            aria-hidden
          />
          <span className="uppercase">{importanceLabel(c.importance)}</span>
          <span className="text-wars-faint" aria-hidden>·</span>
          <span>{formatYearRange(c.startYear, c.endYear)}</span>
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
            id="conflict-sidebar-title"
            className="font-display text-display-l text-wars-text flex-1 min-w-0"
            style={{
              fontWeight: 400,
              margin: 0,
              paddingTop: 2,
              textWrap: 'balance' as React.CSSProperties['textWrap'],
            }}
          >
            {c.name}
          </h2>
          <SheetActions
            onCite={handleCite}
            permalink={`/c/${c.id}`}
            wikipediaUrl={c.wikipediaUrl}
            onClose={onClose}
            closeRef={closeRef}
            closeLabel={`Close ${c.name}`}
          />
        </div>
      </header>

      {/* ─── Body (scrollable) ──────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 sm:px-6 pb-8">
        {/* HOOK — curated italic, or the description standing in upright */}
        {hookText && (
          <div className="py-5 hairline-b">
            <p
              className={`font-display text-wars-text m-0 ${hookIsCurated ? 'italic text-display-s' : ''}`}
              style={{
                fontWeight: 400,
                ...(hookIsCurated ? {} : { fontSize: 15, lineHeight: 1.5 }),
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {hookText}
            </p>
          </div>
        )}

        {/* CASUALTIES — directly below the hook: the most-shared number
            should never sit below the fold. Absence is stated, not hidden. */}
        <section className="py-5 hairline-b" aria-labelledby="sb-casualties">
          <h3 id="sb-casualties" className="eyebrow mb-1 m-0">Estimated casualties</h3>
          <CasualtyRange casualties={c.casualties} range={c.casualtyRange} />
        </section>

        {/* NARRATIVE */}
        {c.narrative && (
          <section className="py-5 hairline-b" aria-labelledby="sb-narrative">
            <h3 id="sb-narrative" className="eyebrow mb-2.5 m-0">What happened</h3>
            <p
              className="font-display text-wars-text m-0"
              style={{
                fontSize: 14.5,
                lineHeight: 1.6,
                fontWeight: 400,
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {c.narrative}
            </p>
          </section>
        )}

        {/* SIGNIFICANCE — amber eyebrow signals commentary; upright so the
            hook (italic), narrative (upright ink) and this (upright, muted
            ink) read as three distinct voices. */}
        {c.significance && (
          <section className="py-5 hairline-b" aria-labelledby="sb-significance">
            <h3 id="sb-significance" className="eyebrow mb-2.5 m-0" style={{ color: 'var(--amber)' }}>
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
              {c.significance}
            </p>
          </section>
        )}

        {/* Description when it is not already in the hook slot */}
        {showDescription && (
          <section className="py-5 hairline-b" aria-labelledby="sb-overview">
            <h3 id="sb-overview" className="eyebrow mb-2.5 m-0">Overview</h3>
            <p
              className="font-display text-wars-text m-0"
              style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 400 }}
            >
              {c.description}
            </p>
          </section>
        )}

        {/* BELLIGERENTS — 2-col list, capped with a disclosure */}
        {c.countries.length > 0 && (
          <section className="py-5 hairline-b" aria-labelledby="sb-belligerents">
            <h3 id="sb-belligerents" className="eyebrow mb-2.5 m-0">
              Belligerents
              <span className="font-mono ml-2 text-wars-faint" style={{ letterSpacing: '0.02em', textTransform: 'none' }}>
                {c.countries.length}
              </span>
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 m-0 p-0 list-none">
              {belligerents.map((co, i) => (
                <li key={i} className="flex items-baseline gap-2 text-ui text-wars-text">
                  <span className="font-mono text-mono text-wars-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{co}</span>
                </li>
              ))}
            </ul>
            {(hiddenBelligerents > 0 || showAllBelligerents) && (
              <DisclosureButton
                onClick={() => setShowAllBelligerents((v) => !v)}
                expanded={showAllBelligerents}
                className="mt-2.5"
              >
                {showAllBelligerents ? 'Show fewer' : `+${hiddenBelligerents} more`}
              </DisclosureButton>
            )}
          </section>
        )}

        {/* CONFLICT GRAPH — parents, you-are-here, children, siblings */}
        <ConflictGraphInline
          conflict={c}
          relations={rel}
          onConflictClick={onConflictClick}
        />

        {/* SOURCES */}
        {c.sources && c.sources.length > 0 && (
          <section className="py-5 hairline-b" aria-labelledby="sb-sources">
            <h3 id="sb-sources" className="eyebrow mb-2.5 m-0">Sources</h3>
            <ol className="m-0 p-0 list-none">
              {c.sources.map((s, i) => (
                <li
                  key={i}
                  className="font-display flex gap-2.5 py-1.5 text-body-s text-wars-text-2"
                  style={{
                    borderBottom:
                      i === c.sources!.length - 1 ? 'none' : '1px dotted var(--rule)',
                  }}
                >
                  <span
                    className="font-mono text-mono text-wars-faint flex-shrink-0"
                    style={{ paddingTop: 3 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-wars-text-2 hover:text-wars-text transition-colors"
                      style={{
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--rule-strong)',
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
          </section>
        )}

        {/* Footer — coords + ID, dashed top rule */}
        <footer
          className="font-mono text-mono text-wars-faint flex justify-between gap-3 flex-wrap mt-5 pt-3"
          style={{ borderTop: '1px dashed var(--rule)' }}
        >
          <span>{formatCoordinates(c.coordinates)}</span>
          <span>WARS-ATLAS / {c.id.toUpperCase()}</span>
        </footer>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Header action toolbar — shared with EmpireSidebar.
 * 32×32 hairline icon buttons (44×44 on touch), always present.
 * ─────────────────────────────────────────────────────────── */

export interface SheetActionsProps {
  onCite: () => void;
  permalink: string;
  wikipediaUrl?: string | null;
  onClose: () => void;
  closeRef?: React.Ref<HTMLButtonElement>;
  closeLabel?: string;
}

export function SheetActions({
  onCite,
  permalink,
  wikipediaUrl,
  onClose,
  closeRef,
  closeLabel = 'Close',
}: SheetActionsProps) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0 -mr-1" role="group" aria-label="Entry actions">
      <button
        type="button"
        onClick={onCite}
        className="icon-btn"
        aria-label="Copy citation to clipboard"
        title="Cite this entry"
      >
        {/* Quotation marks */}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path
            d="M2 8.5 C2 5.5 3.5 3.5 6 3 L6 4.4 C4.6 4.9 3.8 5.9 3.7 7 L6 7 L6 11 L2 11 Z M8 8.5 C8 5.5 9.5 3.5 12 3 L12 4.4 C10.6 4.9 9.8 5.9 9.7 7 L12 7 L12 11 L8 11 Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <a
        href={permalink}
        className="icon-btn"
        aria-label="Permalink to this entry"
        title="Permalink"
      >
        {/* Chain link */}
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path
            d="M5.5 8.5 L8.5 5.5 M6 3.5 L7.5 2 A2.5 2.5 0 0 1 11 5.5 L9.5 7 M8 10.5 L6.5 12 A2.5 2.5 0 0 1 3 8.5 L4.5 7"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </a>
      {wikipediaUrl && (
        <a
          href={wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn font-display"
          aria-label="Read on Wikipedia (opens in a new tab)"
          title="Wikipedia"
          style={{ fontSize: 15, lineHeight: 1, fontWeight: 600 }}
        >
          <span aria-hidden>W</span>
        </a>
      )}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="icon-btn"
        aria-label={closeLabel}
        title="Close (Esc)"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
          <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}

/** Small "+N more / Show all" text button — 12px ui, hairline underline. */
export function DisclosureButton({
  onClick,
  expanded,
  className = '',
  children,
}: {
  onClick: () => void;
  expanded: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`font-ui text-wars-text-2 hover:text-wars-text transition-colors ${className}`}
      style={{
        fontSize: 12,
        letterSpacing: '0.02em',
        background: 'transparent',
        border: 'none',
        padding: '4px 0',
        cursor: 'pointer',
        borderBottom: '1px solid var(--rule-strong)',
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Conflict graph — one section for the whole relationship:
 *   Part of      — every parent as a breadcrumb line (clickable when the
 *                  record resolves; plain text when the ref is a bare name)
 *   You are here — amber square node (amber = selection)
 *   Sub-conflicts — grouped by start decade, capped with "Show all N"
 *   Siblings     — other parts of the first parent, capped
 * ─────────────────────────────────────────────────────────── */

interface GraphProps {
  conflict: Conflict;
  relations: ConflictRelations | null;
  onConflictClick?: (c: Conflict) => void;
}

interface ParentEntry {
  label: string;
  conflict?: Conflict;
}

function ConflictGraphInline({ conflict, relations, onConflictClick }: GraphProps) {
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [showAllSiblings, setShowAllSiblings] = useState(false);
  useEffect(() => {
    setShowAllChildren(false);
    setShowAllSiblings(false);
  }, [conflict.id]);

  const { parents, children, siblings, firstParent } = useMemo(() => {
    const parents: ParentEntry[] = (conflict.partOf || []).map((p) => ({
      label: (relations && resolveConflictRef(relations, p)?.name) ?? p,
      conflict: relations ? resolveConflictRef(relations, p) : undefined,
    }));
    const children = relations
      ? getConflictChildren(relations, conflict).slice().sort((a, b) => a.startYear - b.startYear)
      : [];
    const firstParent = parents.find((p) => p.conflict)?.conflict;
    const siblings =
      relations && firstParent
        ? getConflictChildren(relations, firstParent)
            .filter((c) => c.id !== conflict.id)
            .sort((a, b) => a.startYear - b.startYear)
        : [];
    return { parents, children, siblings, firstParent };
  }, [conflict, relations]);

  if (parents.length === 0 && children.length === 0) return null;

  const visibleChildren = showAllChildren ? children : children.slice(0, CHILD_CAP);
  const childGroups: Array<{ decade: string; items: Conflict[] }> = [];
  for (const ch of visibleChildren) {
    const decade = formatDecade(ch.startYear);
    const last = childGroups[childGroups.length - 1];
    if (last && last.decade === decade) last.items.push(ch);
    else childGroups.push({ decade, items: [ch] });
  }
  const visibleSiblings = showAllSiblings ? siblings : siblings.slice(0, SIBLING_CAP);

  return (
    <section className="py-5 hairline-b" aria-labelledby="sb-graph">
      <h3 id="sb-graph" className="eyebrow mb-3 m-0">Conflict graph</h3>

      {/* Parents — breadcrumb line */}
      {parents.length > 0 && (
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 mb-3">
          <span className="font-mono text-mono text-wars-muted uppercase" style={{ letterSpacing: '0.04em' }}>
            Part of
          </span>
          {parents.map((p, i) => (
            <span key={`${p.label}-${i}`} className="flex items-baseline gap-2">
              {i > 0 && <span className="text-wars-faint" aria-hidden>/</span>}
              {p.conflict && onConflictClick ? (
                <button
                  type="button"
                  onClick={() => onConflictClick(p.conflict!)}
                  className="font-display text-body text-wars-text hover:text-wars-text-2 transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--rule-strong)',
                  }}
                >
                  {p.label}
                </button>
              ) : (
                <span className="font-display text-body text-wars-text-2">{p.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Lineage line */}
      <div className="relative pl-3.5">
        <div className="absolute left-1 top-2 bottom-2 w-px" style={{ background: 'var(--rule-strong)' }} />

        {/* Current node — amber square (selection) */}
        <div className="relative py-1.5 -ml-3.5 pl-3.5" aria-current="true">
          <div
            className="absolute left-0 top-1/2 w-2 h-2 -translate-y-1/2"
            style={{ background: 'var(--amber)', borderRadius: 2 }}
          />
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-wars-text" style={{ fontSize: 15, fontWeight: 500 }}>
              {conflict.name}
            </span>
            <span className="font-mono text-mono text-wars-faint flex-shrink-0">
              {formatYear(conflict.startYear)}
            </span>
          </div>
          <div className="font-mono text-mono text-wars-muted uppercase mt-0.5" style={{ letterSpacing: '0.04em' }}>
            You are here
          </div>
        </div>

        {children.length > 0 && (
          <div className="pt-2">
            <div className="font-mono text-mono text-wars-muted uppercase mb-1" style={{ letterSpacing: '0.04em' }}>
              {children.length} sub-conflict{children.length === 1 ? '' : 's'}
            </div>
            {childGroups.map((g) => (
              <div key={g.decade}>
                <div
                  className="font-mono text-mono text-wars-faint mt-2 mb-0.5 -ml-3.5 pl-3.5 relative"
                  style={{ letterSpacing: '0.04em' }}
                >
                  <span
                    className="absolute left-0 top-1/2 w-[9px] h-px"
                    style={{ background: 'var(--rule)' }}
                    aria-hidden
                  />
                  {g.decade}
                </div>
                {g.items.map((ch) => (
                  <GraphRow key={ch.id} c={ch} role="child" onClick={onConflictClick} />
                ))}
              </div>
            ))}
            {children.length > CHILD_CAP && (
              <DisclosureButton
                onClick={() => setShowAllChildren((v) => !v)}
                expanded={showAllChildren}
                className="mt-2"
              >
                {showAllChildren ? 'Show fewer' : `Show all ${children.length}`}
              </DisclosureButton>
            )}
          </div>
        )}

        {firstParent && siblings.length > 0 && (
          <div className="pt-3">
            <div className="font-mono text-mono text-wars-muted uppercase mb-1" style={{ letterSpacing: '0.04em' }}>
              Other parts of {firstParent.name}
            </div>
            {visibleSiblings.map((s) => (
              <GraphRow key={s.id} c={s} role="sibling" onClick={onConflictClick} />
            ))}
            {siblings.length > SIBLING_CAP && (
              <DisclosureButton
                onClick={() => setShowAllSiblings((v) => !v)}
                expanded={showAllSiblings}
                className="mt-2"
              >
                {showAllSiblings ? 'Show fewer' : `+${siblings.length - SIBLING_CAP} more`}
              </DisclosureButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

interface GraphRowProps {
  c: Conflict;
  role: 'child' | 'sibling';
  onClick?: (c: Conflict) => void;
}

function GraphRow({ c, role, onClick }: GraphRowProps) {
  const inner = (
    <>
      {/* Tick mark across the line */}
      <span className="absolute left-0 top-1/2 w-[9px] h-px" style={{ background: 'var(--rule-strong)' }} />
      {/* Square node */}
      <span
        className="absolute left-[1px] top-1/2 w-1.5 h-1.5 -translate-y-1/2"
        style={{
          background: role === 'sibling' ? 'transparent' : 'var(--ink-2)',
          border: '1px solid var(--rule-strong)',
        }}
      />
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-body-s text-wars-text-2">{c.name}</span>
        <span className="font-mono text-mono text-wars-faint flex-shrink-0">
          {formatCompactRange(c.startYear, c.endYear)}
        </span>
      </span>
      {c.casualties != null && (
        <span className="block font-mono text-mono text-wars-faint mt-0.5">
          {formatCasualties(c.casualties)} dead
        </span>
      )}
    </>
  );
  if (!onClick) {
    return <div className="block w-full text-left relative py-1.5 -ml-3.5 pl-3.5">{inner}</div>;
  }
  return (
    <button
      type="button"
      onClick={() => onClick(c)}
      className="block w-full text-left relative py-1.5 -ml-3.5 pl-3.5 hover:text-wars-text transition-colors"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
    >
      {inner}
    </button>
  );
}

export default memo(Sidebar);
