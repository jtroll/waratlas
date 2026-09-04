'use client';

import { memo, useState, useEffect } from 'react';
import { ActiveConflict } from '@/lib/types';
import { formatCasualties } from '@/lib/format';
import AboutModal from './AboutModal';

interface TopBarProps {
  currentYear: number;
  activeCount: number;
  totalCount: number;
  onJumpToLive: () => void;
  onShowAllConflicts: () => void;
  /** Reopen the guided opening tour. The tour shows automatically on first
   *  visit, but once dismissed it's invisible — this prop wires up a chrome
   *  button so desktop users can replay it. Optional: callers without
   *  tour state can omit it and the button won't render. */
  onOpenTour?: () => void;
  activeConflicts: ActiveConflict[];
  /** When true, suppress the (?), Tour, and Live chrome buttons (the
   *  caller's `t` toggle hides the rest of the map-overlay chrome).
   *  The wordmark, tagline, and the active/mapped stat tallies stay
   *  visible — flex layout shifts the tallies to the right edge as the
   *  chrome cluster shrinks. */
  chromeHidden?: boolean;
  /** While the guided tour is open the `?` shortcut is ignored so the tour's
   *  own keyboard handling isn't fought over. */
  tourOpen?: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * TOPBAR — masthead style (step 6 of redesign).
 *
 * Wordmark: italic vermilion "War" + upright "Atlas" in
 * Source Serif. Hairline rule + serif italic tagline beside it.
 *
 * Stats: labeled mini-stats (display-serif number + 9px
 * eyebrow). Active count is vermilion when non-zero.
 *
 * Chrome buttons: 11px Inter Tight uppercase, square corners,
 * hairline borders, no rounded pills (except the live dot).
 * ─────────────────────────────────────────────────────────── */
/** Chrome button surfaces. Pressed = ivory text on an ivory-tinted
 *  hairline; resting = secondary ink on the standard hairline. */
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

function TopBar({
  currentYear,
  activeCount,
  totalCount,
  onJumpToLive,
  onShowAllConflicts,
  onOpenTour,
  activeConflicts,
  chromeHidden = false,
  tourOpen = false,
}: TopBarProps) {
  const isLive = Math.round(currentYear) >= new Date().getFullYear() - 1;
  const [showInfo, setShowInfo] = useState(false);

  // Open About on `?` key (when not focused in an input)
  useEffect(() => {
    if (tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowInfo(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen]);

  const estCasualtiesThisYear = (() => {
    const total = activeConflicts
      .filter((c) => c.isActive && c.casualties)
      .reduce((sum, c) => sum + (c.casualties || 0), 0);
    if (total === 0) return null;
    return formatCasualties(total);
  })();

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
        {/* ─ Wordmark + tagline ─
            On desktop the wordmark line is items-baseline so the tagline sits
            on the same type baseline. On mobile we switch to items-center so
            the ? button optically aligns with the Live/filter buttons (which
            are both 32px squares on the right). */}
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

          {/* About button (also `?` key)
              Mobile: 44×44 tap target, matching the Filter and Live buttons
              in the same row. Desktop: 24×24 chip inline with the
              wordmark/tagline. Suppressed when chromeHidden. */}
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
          <button
            onClick={onShowAllConflicts}
            className="hidden sm:flex flex-col items-end leading-none hover:opacity-90 transition-opacity"
            title="View all active conflicts"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span
              className="font-display tabular-nums"
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: activeCount > 0 ? 'var(--vermilion)' : 'var(--ink-faint)',
                lineHeight: 1,
              }}
            >
              {activeCount}
            </span>
            <span
              className="eyebrow mt-1"
              style={{ fontSize: 11, color: 'var(--ink-muted)' }}
            >
              active
            </span>
          </button>

          {/* Total mapped */}
          <div className="hidden md:flex flex-col items-end leading-none">
            <span
              className="font-display tabular-nums"
              style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink-text)', lineHeight: 1 }}
            >
              {totalCount.toLocaleString()}
            </span>
            <span
              className="eyebrow mt-1"
              style={{ fontSize: 11, color: 'var(--ink-muted)' }}
            >
              mapped
            </span>
          </div>

          {/* Casualties this year */}
          {estCasualtiesThisYear && (
            <div className="hidden lg:flex flex-col items-end leading-none">
              <span
                className="font-display tabular-nums"
                style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink-text)', lineHeight: 1 }}
              >
                {estCasualtiesThisYear}
              </span>
              <span
                className="eyebrow mt-1"
                style={{ fontSize: 11, color: 'var(--ink-muted)' }}
              >
                est. dead this year
              </span>
            </div>
          )}

          {/* Vertical hairline separating tallies from the chrome cluster.
              Hidden when chromeHidden so there's nothing dangling to the
              right of the (now rightmost) "mapped" tally. */}
          {!chromeHidden && (
            <span
              aria-hidden
              className="hidden sm:inline-block"
              style={{ height: 18, width: 1, background: 'var(--rule-strong)' }}
            />
          )}

          {/* Tour relaunch — desktop only. Matches the Live button's chrome
              treatment (hairline border, square corners, 11px uppercase) so
              it reads as part of the same control cluster. The right-facing
              carrot signals "expands a panel" the same way the collapsed
              EraPanel tab does. Hidden when the parent didn't wire up a
              callback (e.g. in test harnesses) or when chromeHidden. */}
          {!chromeHidden && onOpenTour && (
            <button
              onClick={onOpenTour}
              className="font-ui hidden sm:inline-flex items-center justify-center gap-2 transition-colors hover:text-wars-text h-8 px-3"
              style={{
                fontSize: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                borderRadius: 0,
                ...(tourOpen ? PRESSED : RESTING),
                cursor: 'pointer',
                lineHeight: 1,
              }}
              aria-pressed={tourOpen}
              aria-label="Open the guided tour"
              title="Open the guided tour"
            >
              <svg
                width="8"
                height="10"
                viewBox="0 0 8 10"
                aria-hidden="true"
                style={{ opacity: 0.7 }}
              >
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
          )}

          {/* Live button — 44px tall on mobile (tap target) to match the
              ? / Filter buttons in the same row; 32px on desktop. Pressed
              (live) state is ivory + hairline, like every other pressed
              chrome control. Suppressed when chromeHidden. */}
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
    </div>
  );
}

export default memo(TopBar);
