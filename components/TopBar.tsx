'use client';

import { useState, useEffect } from 'react';
import { ActiveConflict } from '@/lib/types';
import AboutModal from './AboutModal';

interface TopBarProps {
  currentYear: number;
  activeCount: number;
  totalCount: number;
  onJumpToLive: () => void;
  onShowAllConflicts: () => void;
  activeConflicts: ActiveConflict[];
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
export default function TopBar({
  currentYear,
  activeCount,
  totalCount,
  onJumpToLive,
  onShowAllConflicts,
  activeConflicts,
}: TopBarProps) {
  const isLive = Math.round(currentYear) >= new Date().getFullYear() - 1;
  const [showInfo, setShowInfo] = useState(false);

  // Open About on `?` key (when not focused in an input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowInfo(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const estCasualtiesThisYear = (() => {
    const total = activeConflicts
      .filter((c) => c.isActive && c.casualties)
      .reduce((sum, c) => sum + (c.casualties || 0), 0);
    if (total === 0) return null;
    if (total >= 1_000_000) return `~${(total / 1_000_000).toFixed(1)}M`;
    if (total >= 1_000) return `~${(total / 1_000).toFixed(0)}K`;
    return `~${total}`;
  })();

  return (
    <div
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
            An interactive cartography of every named war in human history
          </span>

          {/* Data freshness eyebrow — hidden on small screens; matches the
              existing tagline's breakpoint. Keeps ongoing-conflict figures
              honest under viral traffic that may be days/weeks behind. */}
          <span
            aria-hidden
            className="hidden lg:inline-block"
            style={{ height: 10, width: 1, background: 'var(--rule)' }}
          />
          <span
            className="font-mono hidden lg:inline truncate"
            style={{
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
            }}
            title="Dataset version. Casualty figures for ongoing conflicts are point-in-time snapshots — see About → Methodology."
          >
            Data · May 2026
          </span>

          {/* About button (also `?` key)
              Mobile: 32×32 square so it visually matches the Filter and Live
              buttons in the same row. Desktop: small 20×20 chip inline with
              the wordmark/tagline. */}
          <button
            onClick={() => setShowInfo(true)}
            className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 sm:w-5 sm:h-5 text-wars-muted hover:text-wars-text transition-colors"
            style={{
              border: '1px solid var(--rule-strong)',
              fontSize: 12,
              lineHeight: 1,
              background: 'transparent',
            }}
            title="About & methodology (?)"
            aria-label="Open About and methodology"
          >
            ?
          </button>
          <AboutModal open={showInfo} onClose={() => setShowInfo(false)} />
        </div>

        {/* ─ Stats + chrome ─ */}
        <div className="pointer-events-auto flex items-center gap-5 sm:gap-6">
          {/* Active conflicts */}
          {activeCount > 0 && (
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
                  color: 'var(--vermilion)',
                  lineHeight: 1,
                }}
              >
                {activeCount}
              </span>
              <span
                className="eyebrow mt-1"
                style={{ fontSize: 9, color: 'var(--ink-faint)' }}
              >
                active
              </span>
            </button>
          )}

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
              style={{ fontSize: 9, color: 'var(--ink-faint)' }}
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
                style={{ fontSize: 9, color: 'var(--ink-faint)' }}
              >
                est. dead this year
              </span>
            </div>
          )}

          <span
            aria-hidden
            className="hidden sm:inline-block"
            style={{ height: 18, width: 1, background: 'var(--rule-strong)' }}
          />

          {/* Live button — 32px tall on mobile to match the ? / Filter
              buttons in the same row. Desktop keeps the slightly looser
              vertical rhythm. */}
          <button
            onClick={onJumpToLive}
            className="font-ui inline-flex items-center justify-center gap-2 transition-colors hover:text-wars-text h-8 px-3"
            style={{
              fontSize: 11,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid var(--rule-strong)',
              color: isLive ? 'var(--vermilion)' : 'var(--ink-text-2)',
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
        </div>
      </div>
    </div>
  );
}
