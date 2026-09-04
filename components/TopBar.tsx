'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { formatCasualties, formatYear } from '@/lib/format';
import { formatApprox } from '@/lib/casualty-rate';
import { EXHIBITS } from '@/lib/exhibits';
import AboutModal from './AboutModal';

interface TopBarProps {
  currentYear: number;
  activeCount: number;
  totalCount: number;
  onJumpToLive: () => void;
  onShowAllConflicts: () => void;
  /** Open the guided tour on a curated exhibit (lib/exhibits.ts). The
   *  Tour button opens a small menu of exhibits; picking one calls this.
   *  Optional: callers without tour state can omit it and the button
   *  won't render. */
  onOpenExhibit?: (exhibitId: string) => void;
  /** Controlled open state of the exhibit menu, so the mobile dock's Tour
   *  tab can open the same menu as a sheet. */
  exhibitMenuOpen?: boolean;
  onExhibitMenuOpenChange?: (open: boolean) => void;
  /** Open the command palette (global search). Renders the magnifier. */
  onOpenSearch?: () => void;
  /** Deaths attributed to this year and the running total through it
   *  (lib/casualty-rate.ts: headline tolls spread over each conflict's
   *  active years). */
  deathsThisYear: number;
  cumulativeDeaths: number;
  /** First year of the dataset, for the cumulative tally's label. */
  minYear: number;
  /** When true, suppress the (?), Search, Tour, and Live chrome buttons
   *  (the caller's `t` toggle hides the rest of the map-overlay chrome).
   *  The wordmark, tagline, and the stat tallies stay visible — flex
   *  layout shifts the tallies to the right edge as the chrome cluster
   *  shrinks. */
  chromeHidden?: boolean;
  /** While the guided tour is open the `?` shortcut is ignored so the tour's
   *  own keyboard handling isn't fought over. */
  tourOpen?: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * TOPBAR — masthead style.
 *
 * Wordmark: italic vermilion "War" + upright "Atlas" in Source Serif.
 * Hairline rule + serif italic tagline beside it.
 *
 * Stats: labeled mini-stats (display-serif number + 11px eyebrow). Active
 * count is vermilion when non-zero. The two death tallies are honest
 * per-year figures (see lib/casualty-rate.ts) with a method tooltip.
 *
 * Chrome buttons: 12px Inter Tight uppercase, square corners, hairline
 * borders. Tour opens a small exhibit menu; the magnifier opens the
 * command palette.
 * ─────────────────────────────────────────────────────────── */
const RESTING: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--rule-strong)',
  color: 'var(--ink-text-2)',
};
const PRESSED: React.CSSProperties = {
  background: 'color-mix(in oklch, var(--ink-text) 10%, transparent)',
  border: '1px solid color-mix(in oklch, var(--ink-text) 45%, transparent)',
  color: 'var(--ink-text)',
};

const METHOD_NOTE =
  'Method: each conflict’s headline casualty figure is spread evenly across the calendar years it was active. ' +
  'Conflicts with no recorded toll are excluded. Overlapping records (a campaign and the war it belongs to) may double count. ' +
  'Estimates only — see each conflict’s casualty range and sources.';

function Tally({
  value,
  label,
  color = 'var(--ink-text)',
  title,
  className = '',
  onClick,
}: {
  value: string;
  label: string;
  color?: string;
  title?: string;
  className?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className="font-display tabular-nums"
        style={{ fontSize: 18, fontWeight: 500, color, lineHeight: 1 }}
      >
        {value}
      </span>
      <span className="eyebrow mt-1" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
        {label}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`flex-col items-end leading-none hover:opacity-90 transition-opacity ${className}`}
        title={title}
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        {inner}
      </button>
    );
  }
  return (
    <div className={`flex-col items-end leading-none ${className}`} title={title}>
      {inner}
    </div>
  );
}

function TopBar({
  currentYear,
  activeCount,
  totalCount,
  onJumpToLive,
  onShowAllConflicts,
  onOpenExhibit,
  exhibitMenuOpen = false,
  onExhibitMenuOpenChange,
  onOpenSearch,
  deathsThisYear,
  cumulativeDeaths,
  minYear,
  chromeHidden = false,
  tourOpen = false,
}: TopBarProps) {
  const isLive = Math.round(currentYear) >= new Date().getFullYear() - 1;
  const [showInfo, setShowInfo] = useState(false);
  const tourBtnRef = useRef<HTMLButtonElement>(null);

  // Open About on `?` key (when not focused in an input)
  useEffect(() => {
    if (tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (target?.isContentEditable) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowInfo(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen]);

  // Exhibit menu: Escape and outside-click close it.
  useEffect(() => {
    if (!exhibitMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onExhibitMenuOpenChange?.(false);
        tourBtnRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      // Both the desktop popover and the mobile sheet are in the DOM while
      // open (CSS picks one), so test by role rather than by a single ref.
      if (t && (t.closest('[role="menu"]') || tourBtnRef.current?.contains(t))) return;
      onExhibitMenuOpenChange?.(false);
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [exhibitMenuOpen, onExhibitMenuOpenChange]);

  const thisYearFigure = formatApprox(deathsThisYear, formatCasualties);
  const cumulativeFigure = formatApprox(cumulativeDeaths, formatCasualties);
  const sinceLabel = `since ${formatYear(minYear)}`;

  const exhibitRows = EXHIBITS.map((ex) => (
    <button
      key={ex.id}
      type="button"
      role="menuitem"
      onClick={() => {
        onExhibitMenuOpenChange?.(false);
        onOpenExhibit?.(ex.id);
      }}
      className="hover-tint w-full text-left flex flex-col gap-1 transition-colors"
      style={{
        padding: '10px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--rule)',
        borderRadius: 0,
        cursor: 'pointer',
        color: 'var(--ink-text)',
      }}
    >
      <span className="font-display" style={{ fontSize: 14, lineHeight: 1.25, letterSpacing: '-0.005em' }}>
        {ex.title}
      </span>
      <span className="font-ui" style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--ink-muted)' }}>
        {ex.summary}
      </span>
    </button>
  ));

  return (
    <div
      data-avoid
      className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
      style={{
        background:
          'linear-gradient(to bottom, oklch(0.16 0.012 250 / 0.85), oklch(0.16 0.012 250 / 0))',
      }}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3.5 gap-3 sm:gap-4">
        {/* ─ Wordmark + tagline ─ */}
        <div className="pointer-events-auto flex items-center sm:items-baseline gap-2 sm:gap-3.5 min-w-0">
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--ink-text)',
            }}
          >
            <span style={{ fontStyle: 'italic', color: 'var(--vermilion)' }}>
              War
            </span>
            <span style={{ marginLeft: 4 }}>Atlas</span>
          </h1>

          <span
            aria-hidden
            className="hidden sm:inline-block"
            style={{ height: 14, width: 1, background: 'var(--rule-strong)' }}
          />

          <span
            className="font-display italic text-wars-muted hidden md:inline truncate"
            style={{ fontSize: 12, letterSpacing: '0.005em' }}
          >
            An interactive cartography of thousands of named wars across human history
          </span>

          {/* About button (also `?` key). Mobile: 44×44 tap target. Desktop:
              24×24 chip inline with the wordmark. Suppressed when chromeHidden. */}
          {!chromeHidden && (
            <button
              onClick={() => setShowInfo(true)}
              className="flex-shrink-0 inline-flex items-center justify-center w-11 h-11 sm:w-6 sm:h-6 text-wars-muted hover:text-wars-text transition-colors"
              style={{
                border: '1px solid var(--rule-strong)',
                borderRadius: 0,
                fontSize: 12,
                lineHeight: 1,
                background: 'transparent',
              }}
              title="About & methodology (?)"
              aria-label="Open About and methodology"
            >
              ?
            </button>
          )}
          <AboutModal open={showInfo} onClose={() => setShowInfo(false)} />
        </div>

        {/* ─ Stats + chrome ─ */}
        <div className="pointer-events-auto flex items-center gap-5 sm:gap-6">
          {/* Active conflicts — rendered at 0 too ("0 active") so the list
              panel's quiet-moment empty state stays reachable. */}
          <Tally
            className="hidden sm:flex"
            value={String(activeCount)}
            label="active"
            color={activeCount > 0 ? 'var(--vermilion)' : 'var(--ink-faint)'}
            title="View all active conflicts"
            onClick={onShowAllConflicts}
          />

          <Tally className="hidden md:flex" value={totalCount.toLocaleString()} label="mapped" />

          {/* Deaths this year — a per-year share, not the summed totals of
              everything active (which made 1939–45 all read ~170M). */}
          {thisYearFigure && (
            <Tally
              className="hidden lg:flex"
              value={thisYearFigure}
              label="deaths this year"
              title={`Deaths attributed to ${formatYear(currentYear)}. ${METHOD_NOTE}`}
            />
          )}

          {cumulativeFigure && (
            <Tally
              className="hidden xl:flex"
              value={cumulativeFigure}
              label={`cumulative · ${sinceLabel}`}
              title={`Running total of attributed deaths from ${formatYear(minYear)} through ${formatYear(currentYear)}. ${METHOD_NOTE}`}
            />
          )}

          {/* Vertical hairline separating tallies from the chrome cluster. */}
          {!chromeHidden && (
            <span
              aria-hidden
              className="hidden sm:inline-block"
              style={{ height: 18, width: 1, background: 'var(--rule-strong)' }}
            />
          )}

          {/* Search — opens the command palette (⌘K / Ctrl-K, or `/`). */}
          {!chromeHidden && onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="icon-btn hidden sm:inline-flex"
              style={{ borderRadius: 0 }}
              aria-label="Search conflicts, empires and cities (⌘K)"
              title="Search all years (⌘K or /)"
              aria-keyshortcuts="Meta+K Control+K /"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
                <path d="M9.2 9.2 L12.6 12.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {/* Tour — opens the exhibit menu. Desktop only; the mobile dock's
              Tour tab opens the same menu as a sheet. */}
          {!chromeHidden && onOpenExhibit && (
            <div className="relative hidden sm:block">
              <button
                ref={tourBtnRef}
                onClick={() => onExhibitMenuOpenChange?.(!exhibitMenuOpen)}
                className="font-ui inline-flex items-center justify-center gap-2 transition-colors hover:text-wars-text h-8 px-3"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderRadius: 0,
                  ...(tourOpen || exhibitMenuOpen ? PRESSED : RESTING),
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-pressed={tourOpen}
                aria-haspopup="menu"
                aria-expanded={exhibitMenuOpen}
                aria-label="Open the guided tour"
                title="Guided tour and exhibits"
              >
                <svg width="8" height="10" viewBox="0 0 8 10" aria-hidden="true" style={{ opacity: 0.7 }}>
                  <path
                    d="M1.5 1 L6 5 L1.5 9"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Tour
              </button>

              {exhibitMenuOpen && (
                <div
                  role="menu"
                  aria-label="Exhibits"
                  className="surface-panel absolute right-0 mt-1 z-40"
                  style={{ width: 300, boxShadow: 'var(--shadow-pop)' }}
                >
                  <div className="eyebrow" style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--rule)' }}>
                    Exhibits · {EXHIBITS.length}
                  </div>
                  {exhibitRows}
                </div>
              )}
            </div>
          )}

          {/* Live button — 44px tall on mobile (tap target); 32px on desktop. */}
          {!chromeHidden && (
            <button
              onClick={onJumpToLive}
              className="font-ui inline-flex items-center justify-center gap-2 transition-colors hover:text-wars-text h-11 sm:h-8 px-3"
              style={{
                fontSize: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                borderRadius: 0,
                ...(isLive ? PRESSED : RESTING),
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-pressed={isLive}
              aria-label="Jump to live (current year)"
            >
              <span
                aria-hidden
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background: isLive ? 'var(--vermilion)' : 'var(--ink-3)',
                  boxShadow: isLive
                    ? '0 0 0 3px oklch(0.62 0.18 28 / 0.18)'
                    : 'none',
                }}
              />
              Live
            </button>
          )}
        </div>
      </div>

      {/* Mobile exhibit sheet — the dock's Tour tab opens it. */}
      {exhibitMenuOpen && onOpenExhibit && (
        <div className="sm:hidden pointer-events-auto">
          <div
            className="scrim fixed inset-x-0 top-0 z-30"
            style={{ bottom: 'calc(46px + env(safe-area-inset-bottom, 0px))' }}
            onClick={() => onExhibitMenuOpenChange?.(false)}
            aria-hidden
          />
          <div
            role="menu"
            aria-label="Exhibits"
            className="surface-sheet fixed inset-x-0 z-40 overflow-y-auto"
            style={{
              bottom: 'calc(46px + env(safe-area-inset-bottom, 0px))',
              maxHeight: 'min(60dvh, 480px)',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--rule)' }}>
              <span className="eyebrow">Exhibits · {EXHIBITS.length}</span>
              <button
                type="button"
                onClick={() => onExhibitMenuOpenChange?.(false)}
                className="inline-flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-wars-muted hover:text-wars-text"
                style={{ background: 'transparent', border: 'none', borderRadius: 0, fontSize: 18, cursor: 'pointer' }}
                aria-label="Close exhibits"
              >
                ×
              </button>
            </div>
            {exhibitRows}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TopBar);
