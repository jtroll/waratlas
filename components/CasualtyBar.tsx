'use client';

import { Conflict } from '@/lib/types';

/**
 * CasualtyRange — bespoke microvisualization (step 3 of redesign).
 *
 * Three deliberate decisions:
 *   1. Logarithmic axis. Orders of magnitude is what historians actually
 *      argue about; a linear scale collapses small wars into nothing.
 *   2. Range band, not a single bar. Casualty figures are estimates with
 *      uncertainty — show the low/high explicitly with whiskers at each end.
 *   3. Diamond notch at the most-cited point estimate, with source attribution
 *      visible inline (not in a tooltip the researcher has to hunt for).
 *
 * Drop-in replacement for the old CasualtyBar — same import path. Kept the
 * old default export name as a re-export so existing call sites keep working
 * during the transition; the new structured API is exported as
 * CasualtyRange and is what Sidebar uses.
 */

interface CasualtyRangeProps {
  /** Headline / point estimate. */
  casualties: number | null;
  /** Optional researcher-grade range with source attribution. */
  range?: {
    low: number;
    high: number;
    source?: string;
    notes?: string;
  };
  /** Render the big formatted lo–hi label above the chart? Off by default
   *  in compact contexts (e.g. mobile cards) where the parent already shows
   *  the casualty headline. */
  showHeadline?: boolean;
}

function fmt(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n.toLocaleString();
}

const TICKS: Array<[number, string]> = [
  [1e3, '1K'],
  [1e4, '10K'],
  [1e5, '100K'],
  [1e6, '1M'],
  [1e7, '10M'],
  [1e8, '100M'],
];

const LOG_MIN = 3;       // 1K
const LOG_MAX = 8.1;     // ~130M ceiling
const LOG_SPAN = LOG_MAX - LOG_MIN;

const log10 = (v: number) => Math.log10(Math.max(1, v));
const pct = (v: number) =>
  Math.max(0, Math.min(1, (log10(v) - LOG_MIN) / LOG_SPAN)) * 100;

export function CasualtyRange({
  casualties,
  range,
  showHeadline = true,
}: CasualtyRangeProps) {
  const lo = range?.low ?? casualties ?? 0;
  const hi = range?.high ?? casualties ?? 0;

  if (casualties == null && !range) {
    return (
      <div className="text-meta text-wars-faint italic">
        Casualty figures unrecorded for this conflict.
      </div>
    );
  }

  return (
    <div className="pt-1">
      {showHeadline && (
        <div className="flex items-baseline gap-2 mb-3.5">
          <div
            className="font-display tabular-nums text-[28px] leading-none text-wars-text"
            style={{ letterSpacing: '-0.018em' }}
          >
            {fmt(lo)}
            <span className="text-wars-faint mx-1.5 font-light">–</span>
            {fmt(hi)}
          </div>
          <span className="eyebrow ml-auto text-wars-faint">
            estimated dead
          </span>
        </div>
      )}

      {/* Axis */}
      <div className="relative h-11">
        {/* baseline */}
        <div className="absolute inset-x-0 top-[22px] h-px bg-[var(--rule)]" />

        {/* ticks */}
        {TICKS.map(([v, label]) => (
          <div
            key={v}
            className="absolute top-[18px]"
            style={{ left: `${pct(v)}%` }}
          >
            <div className="w-px h-2 bg-[var(--rule-strong)]" />
            <div
              className="font-mono text-mono-xs text-wars-faint mt-1 whitespace-nowrap"
              style={{ transform: 'translateX(-50%)' }}
            >
              {label}
            </div>
          </div>
        ))}

        {/* range band */}
        <div
          className="absolute top-3 h-5 border-y"
          style={{
            left: `${pct(lo)}%`,
            width: `${Math.max(pct(hi) - pct(lo), 0.6)}%`,
            background: 'oklch(0.62 0.18 28 / 0.18)',
            borderColor: 'oklch(0.62 0.18 28 / 0.6)',
          }}
        />

        {/* whiskers */}
        <div
          className="absolute top-2 w-px h-7"
          style={{ left: `${pct(lo)}%`, background: 'oklch(0.62 0.18 28 / 0.9)' }}
        />
        <div
          className="absolute top-2 w-px h-7"
          style={{ left: `${pct(hi)}%`, background: 'oklch(0.62 0.18 28 / 0.9)' }}
        />

        {/* point estimate notch */}
        {casualties != null && casualties > 0 && (
          <div
            className="absolute top-1.5 h-8 w-px bg-wars-text"
            style={{ left: `${pct(casualties)}%` }}
          >
            <div
              className="absolute -top-1.5 -left-[3px] w-[7px] h-[7px] bg-wars-text"
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>
        )}
      </div>

      {range?.notes && (
        <p className="mt-2.5 text-meta text-wars-text-2 leading-relaxed">
          {range.notes}
        </p>
      )}
      {range?.source && (
        <p className="mt-1.5 font-mono text-mono-xs text-wars-faint">
          <span className="text-wars-muted mr-1.5">SOURCE</span>
          {range.source}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Compact bar — used in places like the StatCard quick-stats grid
 * where we don't want the full microvis chart. Just a tiny
 * log-scale bar, no ticks.
 * ─────────────────────────────────────────────────────────── */

interface CompactBarProps {
  casualties: number | null;
}

export function CompactCasualtyBar({ casualties }: CompactBarProps) {
  if (casualties == null || casualties === 0) return null;
  const width = `${pct(casualties)}%`;
  return (
    <div
      className="relative h-1 overflow-hidden rounded-chip"
      style={{ background: 'var(--rule)' }}
      aria-label="Casualty scale comparison"
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width,
          background: 'oklch(0.62 0.18 28 / 0.7)',
        }}
      />
    </div>
  );
}

/* Default export — kept for backwards compatibility with any code that
 * still imports CasualtyBar without naming it. */
export default function CasualtyBar({
  casualties,
}: {
  casualties: Conflict['casualties'];
}) {
  return <CompactCasualtyBar casualties={casualties} />;
}
