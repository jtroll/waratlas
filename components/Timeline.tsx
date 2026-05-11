'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { TimelineState, Conflict } from '@/lib/types';

interface TimelineProps {
  timeline: TimelineState;
  allConflicts: Conflict[];
  onPlay: () => void;
  onYearChange: (year: number) => void;
  onSpeedChange: (speed: number) => void;
  onSpeedModeChange: (mode: 'auto' | 'manual') => void;
}

/* ─────────────────────────────────────────────────────────────
 * Editorial timeline (step 4 of redesign).
 *
 * Replaces the per-conflict importance-bar swarm with:
 *   1. 50-year density histogram, importance-weighted
 *      (importance ≥ 3 = ×2, ≥ 4 = ×3). Past buckets are
 *      vermilion 55%, future buckets are dimmed to 18%.
 *   2. Era labels above (Bronze Age, Iron Age, Classical,
 *      Medieval, Early Modern, Modern), 9px uppercase eyebrow.
 *   3. Epoch ticks below the rail (CE, 1000, 1500, 1800, 1900,
 *      2000), JetBrains Mono 9px.
 *   4. Playhead — 2×14px amber bar + 6px amber down-arrow,
 *      with a 3px amber bloom underneath. No round dot.
 *   5. Year display — 28px Source Serif 4, mono "BCE/CE"
 *      suffix. Never transitions opacity (must feel weighted).
 *   6. Speed selector — Auto / 1× / 10× / 50× as mono pills.
 * ─────────────────────────────────────────────────────────── */

const SPEED_OPTIONS = [
  { label: 'Auto', value: 0,   mode: 'auto'   as const },
  { label: '1×',   value: 5,   mode: 'manual' as const },
  { label: '10×',  value: 100, mode: 'manual' as const },
  { label: '50×',  value: 500, mode: 'manual' as const },
];

const ERA_LABELS = [
  { year: -2500, label: 'Bronze Age' },
  { year: -1200, label: 'Iron Age' },
  { year: -500,  label: 'Classical' },
  { year: 476,   label: 'Medieval' },
  { year: 1453,  label: 'Early Modern' },
  { year: 1800,  label: 'Modern' },
];

const EPOCH_TICKS = [
  { year: 0,    label: 'CE' },
  { year: 1000, label: '1000' },
  { year: 1500, label: '1500' },
  { year: 1800, label: '1800' },
  { year: 1900, label: '1900' },
  { year: 2000, label: '2000' },
];

const ERA_PRESETS = [
  { label: 'Bronze Age', year: -2500 },
  { label: 'Greco-Persian', year: -490 },
  { label: 'Fall of Rome', year: 400 },
  { label: 'Crusades', year: 1100 },
  { label: 'Mongol Era', year: 1240 },
  { label: 'Renaissance', year: 1500 },
  { label: 'Napoleonic', year: 1805 },
  { label: 'World War I', year: 1914 },
  { label: 'World War II', year: 1939 },
  { label: 'Cold War', year: 1960 },
];

const BUCKET_SIZE = 50;     // years per histogram bucket
const HIST_HEIGHT = 36;     // px

function formatYearDisplay(year: number) {
  const y = Math.round(year);
  if (y < 0) return { num: Math.abs(y).toLocaleString(), suffix: 'BCE' };
  if (y === 0) return { num: '1', suffix: 'BCE' }; // there is no year 0
  return { num: y.toLocaleString(), suffix: 'CE' };
}

export default function Timeline({
  timeline,
  allConflicts,
  onPlay,
  onYearChange,
  onSpeedChange,
  onSpeedModeChange,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const yearRange = timeline.maxYear - timeline.minYear;
  const progress = (timeline.currentYear - timeline.minYear) / yearRange;
  const [showEraPresets, setShowEraPresets] = useState(false);

  /* ── Density histogram (memoized — pure function of conflicts + range) ── */
  const histogram = useMemo(() => {
    const start = Math.floor(timeline.minYear / BUCKET_SIZE) * BUCKET_SIZE;
    const end = Math.ceil(timeline.maxYear / BUCKET_SIZE) * BUCKET_SIZE;
    const nBuckets = Math.max(1, Math.round((end - start) / BUCKET_SIZE));
    const weights = new Array<number>(nBuckets).fill(0);

    for (const c of allConflicts) {
      const sy = c.startYear;
      const ey = c.endYear ?? c.startYear;
      const w =
        c.importance >= 4 ? 3 :
        c.importance >= 3 ? 2 : 1;
      const i0 = Math.max(0, Math.floor((sy - start) / BUCKET_SIZE));
      const i1 = Math.min(nBuckets - 1, Math.floor((ey - start) / BUCKET_SIZE));
      for (let i = i0; i <= i1; i++) weights[i] += w;
    }

    const max = Math.max(1, ...weights);
    return weights.map((w, i) => ({
      year: start + i * BUCKET_SIZE,
      weight: w,
      h: Math.max(1.5, (w / max) * HIST_HEIGHT),
    }));
  }, [allConflicts, timeline.minYear, timeline.maxYear]);

  /* ── Filtered era labels (drop any too close to neighbours) ── */
  const eras = useMemo(() => {
    const filtered: Array<{ year: number; label: string; position: number }> = [];
    for (const e of ERA_LABELS) {
      if (e.year < timeline.minYear || e.year > timeline.maxYear) continue;
      const position = (e.year - timeline.minYear) / yearRange;
      if (filtered.some((p) => Math.abs(p.position - position) < 0.08)) continue;
      filtered.push({ ...e, position });
    }
    return filtered;
  }, [timeline.minYear, timeline.maxYear, yearRange]);

  const ticks = useMemo(() => {
    return EPOCH_TICKS.filter(
      (t) => t.year >= timeline.minYear && t.year <= timeline.maxYear
    ).map((t) => ({
      ...t,
      position: (t.year - timeline.minYear) / yearRange,
    }));
  }, [timeline.minYear, timeline.maxYear, yearRange]);

  /* ── Click-anywhere-on-track to seek (no native range input painted) ── */
  const seekFromEvent = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onYearChange(timeline.minYear + pct * yearRange);
    },
    [onYearChange, timeline.minYear, yearRange]
  );

  const handleTrackPointer = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    seekFromEvent(e.clientX);
  };

  const handleSpeedClick = useCallback(
    (option: typeof SPEED_OPTIONS[number]) => {
      if (option.mode === 'auto') {
        onSpeedModeChange('auto');
      } else {
        onSpeedModeChange('manual');
        onSpeedChange(option.value);
      }
    },
    [onSpeedChange, onSpeedModeChange]
  );

  const isActiveSpeed = (option: typeof SPEED_OPTIONS[number]) => {
    if (option.mode === 'auto') return timeline.speedMode === 'auto';
    return timeline.speedMode === 'manual' && timeline.playbackSpeed === option.value;
  };

  const playheadLeft = `${progress * 100}%`;
  const yearDisplay = formatYearDisplay(timeline.currentYear);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30">
      {/* Top fade — keeps map visible behind the strip */}
      <div
        className="h-12 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, oklch(0.16 0.012 250 / 0.85) 0%, transparent 100%)',
        }}
      />

      <div
        className="px-6 pb-3 pt-2 hairline-strong-t"
        style={{ background: 'oklch(0.16 0.012 250 / 0.96)' }}
      >
        {/* Era jump presets — toggleable secondary row */}
        {showEraPresets && (
          <div className="flex flex-wrap gap-1.5 mb-2 mx-16">
            {ERA_PRESETS.map((era) => (
              <button
                key={era.label}
                onClick={() => onYearChange(era.year)}
                className="font-mono text-mono-xs text-wars-muted hover:text-wars-text transition-colors px-2 py-0.5"
                style={{
                  border: '1px solid var(--rule)',
                  background: 'transparent',
                  letterSpacing: '0.04em',
                }}
              >
                {era.label}
              </button>
            ))}
          </div>
        )}

        {/* Era labels (above the rail) */}
        <div className="relative h-3 mx-16 mb-1">
          {eras.map((era) => (
            <button
              key={era.label}
              onClick={() => setShowEraPresets((s) => !s)}
              className="absolute eyebrow text-wars-faint hover:text-wars-muted transition-colors whitespace-nowrap"
              style={{
                left: `${era.position * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: 9,
                lineHeight: '12px',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
              title="Click to show era jump buttons"
            >
              {era.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Play / pause */}
          <button
            onClick={onPlay}
            className="flex-shrink-0 w-10 h-10 inline-flex items-center justify-center hover:opacity-90 transition-opacity"
            style={{
              border: '1px solid var(--rule-strong)',
              background: timeline.isPlaying ? 'transparent' : 'oklch(0.78 0.14 78 / 0.12)',
              color: 'var(--amber)',
            }}
            title={timeline.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={timeline.isPlaying ? 'Pause timeline playback' : 'Play timeline playback'}
            aria-pressed={timeline.isPlaying}
          >
            {timeline.isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <rect x="2" y="2" width="3" height="10" fill="currentColor" />
                <rect x="9" y="2" width="3" height="10" fill="currentColor" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 2 L12 7 L3 12 Z" fill="currentColor" />
              </svg>
            )}
          </button>

          {/* Track */}
          <div className="flex-1 relative">
            <div
              ref={trackRef}
              className="relative cursor-pointer"
              style={{ height: HIST_HEIGHT + 16 }}
              onPointerDown={handleTrackPointer}
              onPointerMove={handleTrackPointerMove}
              role="slider"
              aria-label="Timeline scrubber: select a year"
              aria-valuemin={timeline.minYear}
              aria-valuemax={timeline.maxYear}
              aria-valuenow={Math.round(timeline.currentYear)}
              aria-valuetext={
                timeline.currentYear < 0
                  ? `${Math.abs(Math.round(timeline.currentYear))} BCE`
                  : `${Math.round(timeline.currentYear)} CE`
              }
              tabIndex={0}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 50 : 1;
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  onYearChange(Math.max(timeline.minYear, timeline.currentYear - step));
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  onYearChange(Math.min(timeline.maxYear, timeline.currentYear + step));
                }
              }}
            >
              {/* Histogram (anchored to baseline) */}
              <div
                className="absolute left-0 right-0 flex items-end"
                style={{ bottom: 8, height: HIST_HEIGHT }}
              >
                {histogram.map((b) => {
                  const isPast = b.year + BUCKET_SIZE / 2 <= timeline.currentYear;
                  return (
                    <div
                      key={b.year}
                      style={{
                        flex: 1,
                        height: `${b.h}px`,
                        marginRight: 1,
                        background: isPast
                          ? 'oklch(0.62 0.18 28 / 0.55)'
                          : 'oklch(0.62 0.18 28 / 0.18)',
                      }}
                    />
                  );
                })}
              </div>

              {/* Baseline rule */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: 7,
                  height: 1,
                  background: 'var(--rule-strong)',
                }}
              />

              {/* Epoch ticks (below baseline) */}
              {ticks.map((t) => (
                <div
                  key={t.year}
                  className="absolute"
                  style={{
                    left: `${t.position * 100}%`,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div
                    className="mx-auto"
                    style={{
                      width: 1,
                      height: 4,
                      background: 'var(--rule-strong)',
                      marginBottom: 1,
                    }}
                  />
                  <div
                    className="font-mono text-wars-faint"
                    style={{
                      fontSize: 9,
                      lineHeight: '11px',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t.label}
                  </div>
                </div>
              ))}

              {/* Playhead — bar + arrow + bloom */}
              <div
                className="absolute"
                style={{
                  left: playheadLeft,
                  bottom: 6,
                  height: HIST_HEIGHT + 4,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              >
                {/* Bloom */}
                <div
                  className="absolute"
                  style={{
                    left: -1.5,
                    bottom: 0,
                    width: 5,
                    height: '100%',
                    background:
                      'linear-gradient(to top, oklch(0.78 0.14 78 / 0.45), oklch(0.78 0.14 78 / 0))',
                    filter: 'blur(2px)',
                  }}
                />
                {/* Bar */}
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    bottom: 0,
                    width: 2,
                    height: '100%',
                    background: 'var(--amber)',
                  }}
                />
                {/* Down-arrow on top */}
                <svg
                  width="6"
                  height="6"
                  viewBox="0 0 6 6"
                  style={{
                    position: 'absolute',
                    left: -2,
                    top: -6,
                    color: 'var(--amber)',
                  }}
                >
                  <path d="M0 0 L6 0 L3 6 Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          {/* Year display — never transitions */}
          <div
            className="flex-shrink-0 text-right"
            style={{ minWidth: 100 }}
          >
            <div
              className="font-display tabular-nums text-wars-text"
              style={{
                fontSize: 28,
                lineHeight: 1,
                letterSpacing: '-0.018em',
                fontWeight: 400,
              }}
            >
              {yearDisplay.num}
              <span
                className="font-mono text-wars-muted ml-1.5"
                style={{ fontSize: 11, letterSpacing: '0.05em' }}
              >
                {yearDisplay.suffix}
              </span>
            </div>
          </div>

          {/* Speed control — mono pills */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {SPEED_OPTIONS.map((option) => {
              const active = isActiveSpeed(option);
              return (
                <button
                  key={option.label}
                  onClick={() => handleSpeedClick(option)}
                  className="font-mono transition-colors"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.04em',
                    padding: '4px 8px',
                    border: '1px solid',
                    borderColor: active ? 'var(--amber)' : 'var(--rule)',
                    color: active ? 'var(--amber)' : 'var(--ink-muted)',
                    background: active
                      ? 'oklch(0.78 0.14 78 / 0.10)'
                      : 'transparent',
                  }}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
