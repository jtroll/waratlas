'use client';

import { Conflict } from '@/lib/types';
import { formatCasualties as fmt } from '@/lib/format';

/**
 * CasualtyRange — bespoke microvisualization.
 *
 * Three deliberate decisions:
 *   1. Logarithmic axis from 100 to ~130M. Orders of magnitude is what
 *      historians actually argue about; a linear scale collapses small wars
 *      into nothing, and a 1K floor collapsed the 104 conflicts under 1,000.
 *   2. Range band, not a single bar — but only when a range was published.
 *      When low === high (10,300+ conflicts carry a single figure) we draw a
 *      lone labelled notch and say so, instead of a fake 0.6%-wide band.
 *   3. The point estimate is labelled with its value, and the source line is
 *      always rendered — "source: unrecorded" makes absence visible.
 *
 * Ranges with source attribution are a researcher-credibility requirement;
 * nothing here hides a number.
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

const TICKS: Array<[number, string]> = [
  [1e2, '100'],
  [1e3, '1K'],
  [1e4, '10K'],
  [1e5, '100K'],
  [1e6, '1M'],
  [1e7, '10M'],
  [1e8, '100M'],
];

const LOG_MIN = 2;       // 100
const LOG_MAX = 8.1;     // ~130M ceiling
const LOG_SPAN = LOG_MAX - LOG_MIN;

const log10 = (v: number) => Math.log10(Math.max(1, v));
const pct = (v: number) =>
  Math.max(0, Math.min(1, (log10(v) - LOG_MIN) / LOG_SPAN)) * 100;

/** Keep a centred label inside the axis near either edge. */
function labelTransform(p: number): string {
  if (p < 7) return 'translateX(0)';
  if (p > 93) return 'translateX(-100%)';
  return 'translateX(-50%)';
}

const BAND_FILL = 'color-mix(in oklch, var(--vermilion) 18%, transparent)';
const BAND_EDGE = 'color-mix(in oklch, var(--vermilion) 60%, transparent)';
const WHISKER = 'color-mix(in oklch, var(--vermilion) 90%, transparent)';

export function CasualtyRange({
  casualties,
  range,
  showHeadline = true,
}: CasualtyRangeProps) {
  if (casualties == null && !range) {
    return (
      <p className="font-display italic text-body-s text-wars-muted m-0">
        Casualty figures unrecorded for this conflict.
      </p>
    );
  }

  const lo = range?.low ?? casualties ?? 0;
  const hi = range?.high ?? casualties ?? 0;
  // Never invent a point estimate: a range without a headline figure draws
  // the band alone; a degenerate range (low === high) is a single figure.
  const hasRange = !!range && hi > lo;
  const point = casualties ?? (!hasRange ? lo : null);
  const pointPct = point != null && point > 0 ? pct(point) : null;

  return (
    <div className="pt-1">
      {showHeadline && (
        <div className="flex items-baseline gap-2 mb-3.5">
          <div
            className="font-display tabular-nums text-wars-text"
            style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.018em' }}
          >
            {hasRange ? (
              <>
                {fmt(lo)}
                <span className="text-wars-muted mx-1.5" style={{ fontWeight: 300 }}>–</span>
                {fmt(hi)}
              </>
            ) : (
              fmt(point ?? lo)
            )}
          </div>
          <span className="eyebrow ml-auto">{hasRange ? 'published range' : 'single estimate'}</span>
        </div>
      )}

      {/* Axis */}
      <div className="relative h-14" role="img" aria-label={
        hasRange
          ? `Estimated ${fmt(lo)} to ${fmt(hi)} dead${point != null ? `, point estimate ${fmt(point)}` : ''}, on a log scale from 100 to 100 million`
          : `Single estimate of ${fmt(point ?? lo)} dead, on a log scale from 100 to 100 million`
      }>
        {/* baseline */}
        <div className="absolute inset-x-0 top-[30px] h-px" style={{ background: 'var(--rule)' }} />

        {/* ticks */}
        {TICKS.map(([v, label]) => (
          <div
            key={v}
            className="absolute top-[26px]"
            style={{ left: `${pct(v)}%` }}
          >
            <div className="w-px h-2" style={{ background: 'var(--rule-strong)' }} />
            <div
              className="font-mono text-mono text-wars-muted mt-1 whitespace-nowrap"
              style={{ transform: labelTransform(pct(v)) }}
            >
              {label}
            </div>
          </div>
        ))}

        {hasRange && (
          <>
            {/* range band */}
            <div
              className="absolute top-[20px] h-5 border-y"
              style={{
                left: `${pct(lo)}%`,
                width: `${Math.max(pct(hi) - pct(lo), 0.6)}%`,
                background: BAND_FILL,
                borderColor: BAND_EDGE,
              }}
            />
            {/* whiskers */}
            <div
              className="absolute top-4 w-px h-7"
              style={{ left: `${pct(lo)}%`, background: WHISKER }}
            />
            <div
              className="absolute top-4 w-px h-7"
              style={{ left: `${pct(hi)}%`, background: WHISKER }}
            />
          </>
        )}

        {/* point estimate notch + value label */}
        {pointPct != null && point != null && (
          <div
            className="absolute top-[14px] h-8 w-px bg-wars-text"
            style={{ left: `${pointPct}%` }}
          >
            <div
              className="absolute -top-1.5 -left-[3px] w-[7px] h-[7px] bg-wars-text"
              style={{ transform: 'rotate(45deg)' }}
            />
            <div
              className="absolute font-mono text-mono text-wars-text whitespace-nowrap"
              style={{ top: -18, transform: labelTransform(pointPct) }}
            >
              {fmt(point)}
            </div>
          </div>
        )}
      </div>

      {!hasRange && (
        <p className="mt-1 font-display italic text-meta text-wars-muted m-0">
          no range published{casualties == null ? '' : ' · point estimate only'}
        </p>
      )}
      {range?.notes && (
        <p className="mt-2.5 font-display text-body-s text-wars-text-2 m-0" style={{ lineHeight: 1.55 }}>
          {range.notes}
        </p>
      )}
      {range && (
        <p className="mt-1.5 font-mono text-mono text-wars-faint m-0">
          <span className="text-wars-muted mr-1.5">SOURCE</span>
          {range.source || 'unrecorded'}
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
          background: 'color-mix(in oklch, var(--vermilion) 70%, transparent)',
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
