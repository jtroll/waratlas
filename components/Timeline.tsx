'use client';

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TimelineState, Conflict } from '@/lib/types';
import { formatYear, formatYearParts } from '@/lib/format';
import { playbackStore, usePlaybackRate, usePlaybackYear } from '@/lib/playback-store';
import {
  createAxis,
  densityHeight,
  formatBucketRange,
  type DensityBucket,
  type TimelineAxis,
} from '@/lib/timeline-axis';

interface TimelineProps {
  timeline: TimelineState;
  allConflicts: Conflict[];
  onPlay: () => void;
  onYearChange: (year: number) => void;
  onSpeedChange: (speed: number) => void;
  onSpeedModeChange: (mode: 'auto' | 'manual') => void;
  /** When true, render a one-time "press Play" tooltip above the play
   *  button. Set by app/page.tsx after the user finishes the opening tour
   *  and cleared automatically when they press Play. Desktop-only — on
   *  mobile the prompt would crowd the small play button. */
  showPlayPrompt?: boolean;
  /** Span of the currently selected conflict or empire, drawn as a bracket
   *  on the track so the timeline is the shared axis of the interface. */
  selectedSpan?: { startYear: number; endYear: number | null; label: string; kind: 'conflict' | 'empire' } | null;
}

/* ─────────────────────────────────────────────────────────────
 * Timeline — bespoke data-vis, not a slider.
 *
 *   Axis      piecewise-linear (lib/timeline-axis.ts): five era segments
 *             with fixed width shares, so the 226 years since 1800 (half
 *             the conflicts) get 35% of the track instead of 4%. Each
 *             boundary is drawn as an honest axis break: hairline + ⫽.
 *   Density   histogram, one bar per bucket with bucket width following
 *             the axis (250 y in the Bronze Age, 10 y after 1800). Height
 *             is log-scaled so pre-1500 buckets are visible. Every
 *             conflict counts; importance only scales the weight, and
 *             importance ≥ 4 is stacked as a brighter cap.
 *   Hover     ivory hairline + mono chip: bucket range, count, top three
 *             names. Click seeks, drag scrubs, keyboard steps.
 *   Playhead  2 px amber bar with a 12 px grabbable handle; the bloom
 *             breathes only while playing (never under reduced motion).
 *   Selection the selected conflict / empire span is bracketed above the
 *             bars (vermilion / uncertain), label in mono.
 *   Readout   serif year (click → type a year), live "▶ 2.1 yr/s" while
 *             playing, honest speed pills (Auto · 5 · 50 · 500 yr/s).
 * ─────────────────────────────────────────────────────────── */

const SPEED_OPTIONS = [
  { label: 'Auto', value: 0,   mode: 'auto'   as const, title: 'Adaptive speed' },
  { label: '5',    value: 5,   mode: 'manual' as const, title: '5 years per second' },
  { label: '50',   value: 50,  mode: 'manual' as const, title: '50 years per second' },
  { label: '500',  value: 500, mode: 'manual' as const, title: '500 years per second' },
];

// Track geometry (px, measured from the bottom of the track).
const TICKS_H = 16;              // tick marks + labels under the baseline
const HIST_H = 36;               // histogram bars above the baseline
const BRACKET_H = 18;            // selected-span bracket + label zone
const TRACK_H = TICKS_H + 1 + HIST_H + BRACKET_H;   // 71
const HIST_BOTTOM = TICKS_H + 1; // bars sit on the 1 px baseline
const ERA_H = 14;                // era-label row above the track
const HANDLE_W = 12;
const HANDLE_H = 10;
const NARROW_TRACK = 480;        // below this: majors only, coarser fit

const VERMILION_PAST = 'oklch(0.62 0.18 28 / 0.55)';
const VERMILION_FUTURE = 'oklch(0.62 0.18 28 / 0.18)';
const VERMILION_CAP_PAST = 'oklch(0.72 0.19 30 / 0.95)';
const VERMILION_CAP_FUTURE = 'oklch(0.72 0.19 30 / 0.40)';
const STRIP_BG = 'oklch(0.16 0.012 250 / 0.96)';

/** Measured pixel width of an element (0 before mount). Updates only on
 *  resize, so the component re-renders when the track changes size, not
 *  on every pointer move. */
function useMeasuredWidth<T extends HTMLElement>(ref: React.RefObject<T>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.round(el.getBoundingClientRect().width));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/* ── Leaf: playhead (re-renders per frame while playing) ─────────── */
function Playhead({
  axis,
  currentYear,
  isPlaying,
}: {
  axis: TimelineAxis;
  currentYear: number;
  isPlaying: boolean;
}) {
  const storeYear = usePlaybackYear();
  const year = isPlaying ? storeYear : currentYear;
  const pos = axis.yearToPos(year);
  return (
    <div
      className="absolute"
      style={{
        left: `${pos * 100}%`,
        bottom: HIST_BOTTOM,
        width: 2,
        height: HIST_H + HANDLE_H,
        transform: 'translateX(-1px)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {isPlaying && (
        <div
          aria-hidden
          className="absolute timeline-bloom"
          style={{
            left: -2,
            bottom: 0,
            width: 6,
            height: HIST_H,
            background:
              'linear-gradient(to top, oklch(0.78 0.14 78 / 0.5), oklch(0.78 0.14 78 / 0))',
            filter: 'blur(2px)',
          }}
        />
      )}
      {/* Bar */}
      <div
        className="absolute"
        style={{ left: 0, bottom: 0, width: 2, height: HIST_H, background: 'var(--amber)' }}
      />
      {/* Handle — the one part of the playhead that takes the pointer */}
      <svg
        className="absolute timeline-handle"
        width={HANDLE_W}
        height={HANDLE_H}
        viewBox={`0 0 ${HANDLE_W} ${HANDLE_H}`}
        style={{
          left: -(HANDLE_W / 2) + 1,
          top: 0,
          pointerEvents: 'auto',
          color: 'var(--amber)',
        }}
        aria-hidden
      >
        <path d={`M0 0 H${HANDLE_W} V${HANDLE_H - 4} L${HANDLE_W / 2} ${HANDLE_H} L0 ${HANDLE_H - 4} Z`} fill="currentColor" />
      </svg>
    </div>
  );
}

/* ── Leaf: live rate readout (≤ 4 updates/s while playing) ──────── */
function RateReadout({ mode }: { mode: 'auto' | 'manual' }) {
  const rate = usePlaybackRate();
  return (
    <span
      className="font-mono tabular-nums"
      style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--amber)' }}
      aria-live="off"
      title={mode === 'auto' ? 'Adaptive speed — slows down where history is dense' : 'Playback speed'}
    >
      ▶ {rate.toFixed(1)} yr/s
    </span>
  );
}

/* ── Year readout: serif display that becomes a number input on click ── */
function YearReadout({
  year,
  minYear,
  maxYear,
  isPlaying,
  speedMode,
  size,
  onCommit,
}: {
  year: number;
  minYear: number;
  maxYear: number;
  isPlaying: boolean;
  speedMode: 'auto' | 'manual';
  size: 'l' | 's';
  onCommit: (year: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parts = formatYearParts(year);
  const fontSize = size === 'l' ? 28 : 22;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const el = inputRef.current;
    setEditing(false);
    if (!el) return;
    const v = parseInt(el.value, 10);
    if (!Number.isFinite(v)) return;
    onCommit(Math.max(minYear, Math.min(maxYear, v)));
  };

  if (editing) {
    return (
      <div className={size === 'l' ? 'text-right' : ''} style={{ minWidth: size === 'l' ? 100 : undefined }}>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={minYear}
          max={maxYear}
          step={1}
          defaultValue={Math.round(year)}
          className="timeline-year-input font-mono tabular-nums text-wars-text"
          style={{
            width: size === 'l' ? 100 : 96,
            fontSize: size === 'l' ? 20 : 18,
            lineHeight: 1.2,
            padding: '2px 6px',
            background: 'oklch(0.20 0.014 250)',
            border: '1px solid var(--amber)',
            borderRadius: 'var(--r-chip)',
            textAlign: size === 'l' ? 'right' : 'left',
          }}
          aria-label="Go to year (BCE as a negative number)"
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }}
          onBlur={commit}
        />
        <div
          className="font-mono"
          style={{ fontSize: 10, lineHeight: '14px', letterSpacing: '0.04em', color: 'var(--ink-faint)', marginTop: 2 }}
        >
          BCE as negative · Enter to go
        </div>
      </div>
    );
  }

  return (
    <div className={size === 'l' ? 'text-right' : ''} style={{ minWidth: size === 'l' ? 100 : undefined }}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-display tabular-nums text-wars-text"
        style={{
          fontSize,
          lineHeight: 1,
          letterSpacing: '-0.018em',
          fontWeight: 400,
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'text',
          minHeight: size === 's' ? 32 : undefined,
        }}
        title="Click to type a year (BCE as a negative number)"
        aria-label={`Current year ${formatYear(year)}. Click to type a year.`}
      >
        {parts.num}
        <span
          className="font-mono text-wars-muted"
          style={{ fontSize: 11, letterSpacing: '0.05em', marginLeft: 6 }}
        >
          {parts.suffix}
        </span>
      </button>
      {/* Reserve the line so the rate appearing does not shift layout. */}
      <div style={{ height: 14, lineHeight: '14px', marginTop: 2 }}>
        {isPlaying && <RateReadout mode={speedMode} />}
      </div>
    </div>
  );
}

/* ── Speed pills ─────────────────────────────────────────────────── */
function SpeedPills({
  timeline,
  onSpeedChange,
  onSpeedModeChange,
  dense,
}: {
  timeline: TimelineState;
  onSpeedChange: (speed: number) => void;
  onSpeedModeChange: (mode: 'auto' | 'manual') => void;
  dense: boolean;
}) {
  const isActive = (o: (typeof SPEED_OPTIONS)[number]) =>
    o.mode === 'auto'
      ? timeline.speedMode === 'auto'
      : timeline.speedMode === 'manual' && timeline.playbackSpeed === o.value;
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Playback speed">
      {SPEED_OPTIONS.map((option) => {
        const active = isActive(option);
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => {
              if (option.mode === 'auto') onSpeedModeChange('auto');
              else { onSpeedModeChange('manual'); onSpeedChange(option.value); }
            }}
            className="font-mono tabular-nums transition-colors"
            style={{
              fontSize: 11,
              lineHeight: '14px',
              letterSpacing: '0.04em',
              padding: dense ? '6px 8px' : '4px 8px',
              minWidth: dense ? 34 : undefined,
              border: '1px solid',
              borderColor: active ? 'var(--amber)' : 'var(--rule)',
              color: active ? 'var(--amber)' : 'var(--ink-muted)',
              background: active ? 'oklch(0.78 0.14 78 / 0.10)' : 'transparent',
            }}
            aria-pressed={active}
            title={option.title}
          >
            {option.label}
          </button>
        );
      })}
      <span
        className="font-mono"
        style={{ fontSize: 10, letterSpacing: '0.04em', color: 'var(--ink-faint)', marginLeft: 2 }}
        aria-hidden
      >
        yr/s
      </span>
    </div>
  );
}

/* ── Play / pause / replay ───────────────────────────────────────── */
function PlayButton({
  timeline,
  onPlay,
  showPlayPrompt,
}: {
  timeline: TimelineState;
  onPlay: () => void;
  showPlayPrompt: boolean;
}) {
  const atEnd = !timeline.isPlaying && timeline.currentYear >= timeline.maxYear;
  const title = timeline.isPlaying
    ? 'Pause (Space)'
    : atEnd
      ? 'Replay from the start'
      : 'Play (Space)';
  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={onPlay}
        className="w-11 h-11 sm:w-10 sm:h-10 inline-flex items-center justify-center hover:opacity-90 transition-opacity"
        style={{
          border: '1px solid var(--rule-strong)',
          // Tinted while playing — the "you are watching this" cue.
          background: timeline.isPlaying ? 'oklch(0.78 0.14 78 / 0.12)' : 'transparent',
          color: 'var(--amber)',
          boxShadow: showPlayPrompt
            ? '0 0 0 2px oklch(0.78 0.14 78 / 0.35), 0 0 16px 4px oklch(0.78 0.14 78 / 0.20)'
            : undefined,
        }}
        title={title}
        aria-label={
          timeline.isPlaying
            ? 'Pause timeline playback'
            : atEnd
              ? 'Replay timeline from the start'
              : 'Play timeline playback'
        }
        aria-pressed={timeline.isPlaying}
      >
        {timeline.isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <rect x="2" y="2" width="3" height="10" fill="currentColor" />
            <rect x="9" y="2" width="3" height="10" fill="currentColor" />
          </svg>
        ) : atEnd ? (
          // ↺ replay
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M8 2.5a5.5 5.5 0 1 1-4.9 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M2.2 2.4 L3.4 6.2 L7.2 5.2 Z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M3 2 L12 7 L3 12 Z" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Post-tour prompt — desktop only. Anchored to the button's left
          edge so it extends rightward into open space. */}
      {showPlayPrompt && (
        <div
          className="hidden sm:flex absolute bottom-full mb-3 left-0 items-center pointer-events-none whitespace-nowrap"
          role="status"
          aria-live="polite"
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--amber)',
              background: 'oklch(0.18 0.014 250 / 0.97)',
              border: '1px solid var(--amber)',
              padding: '6px 10px',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            Press Play to watch the world change
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '100%',
              left: 20,
              transform: 'translateY(-1px) rotate(45deg)',
              width: 8,
              height: 8,
              background: 'oklch(0.18 0.014 250 / 0.97)',
              borderRight: '1px solid var(--amber)',
              borderBottom: '1px solid var(--amber)',
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
function Timeline({
  timeline,
  allConflicts,
  onPlay,
  onYearChange,
  onSpeedChange,
  onSpeedModeChange,
  showPlayPrompt = false,
  selectedSpan = null,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackPx = useMeasuredWidth(trackRef);
  const narrow = trackPx > 0 && trackPx < NARROW_TRACK;

  // Hover chrome is driven imperatively (refs, not state) so pointer moves
  // never re-render the histogram.
  const hoverLineRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const chipYearRef = useRef<HTMLSpanElement>(null);
  const chipRangeRef = useRef<HTMLSpanElement>(null);
  const chipCountRef = useRef<HTMLSpanElement>(null);
  const chipNamesRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);

  const axis = useMemo(
    () => createAxis(timeline.minYear, timeline.maxYear),
    [timeline.minYear, timeline.maxYear]
  );

  const buckets = useMemo(() => axis.densityBuckets(allConflicts), [axis, allConflicts]);
  const maxWeight = useMemo(() => buckets.reduce((m, b) => Math.max(m, b.weight), 0), [buckets]);

  const ticks = useMemo(
    () => (trackPx > 0 ? axis.ticks(trackPx, { minors: !narrow }) : []),
    [axis, trackPx, narrow]
  );

  // Era labels: full label if it fits the segment, else the short one,
  // else nothing (the ⫽ breaks still mark the segment).
  const eraLabels = useMemo(() => {
    const charPx = 6.9; // Inter Tight 10.5px uppercase + 0.10em tracking
    return axis.segments.map((s) => {
      const px = (s.pos1 - s.pos0) * trackPx;
      const fits = (t: string) => t.length * charPx + 8 <= px;
      const text = trackPx === 0 ? s.label : fits(s.label) ? s.label : fits(s.short) ? s.short : null;
      return { ...s, text };
    });
  }, [axis, trackPx]);

  // Forget frame history when playback stops so the rate readout never
  // shows a stale number on the next Play.
  useEffect(() => {
    if (!timeline.isPlaying) playbackStore.resetRate();
  }, [timeline.isPlaying]);

  /* ── Seek helpers ── */
  const posFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      onYearChange(axis.posToYear(posFromClientX(clientX)));
    },
    [axis, onYearChange, posFromClientX]
  );

  /* ── Hover chip (imperative) ── */
  const hideHover = useCallback(() => {
    if (hoverLineRef.current) hoverLineRef.current.style.opacity = '0';
    if (chipRef.current) chipRef.current.style.opacity = '0';
  }, []);

  const updateHover = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      const line = hoverLineRef.current;
      const chip = chipRef.current;
      if (!track || !line || !chip || buckets.length === 0) return;
      const rect = track.getBoundingClientRect();
      const pos = posFromClientX(clientX);
      const year = axis.posToYear(pos);
      const b = buckets[axis.bucketIndexAt(buckets, year)];
      const x = pos * rect.width;

      line.style.left = `${x}px`;
      line.style.opacity = '1';

      if (chipYearRef.current) chipYearRef.current.textContent = formatYear(year);
      if (chipRangeRef.current) chipRangeRef.current.textContent = formatBucketRange(b.startYear, b.endYear);
      if (chipCountRef.current) {
        chipCountRef.current.textContent =
          b.count === 1 ? '1 conflict' : `${b.count.toLocaleString('en-US')} conflicts`;
      }
      if (chipNamesRef.current) {
        const names = b.top.map((t) => t.name).join(', ');
        chipNamesRef.current.textContent = names ? (b.count > b.top.length ? `${names}…` : names) : '';
      }
      chip.style.opacity = '1';
      // Clamp the chip inside the track once its width is known.
      const w = chip.offsetWidth;
      const left = Math.max(w / 2, Math.min(rect.width - w / 2, x));
      chip.style.left = `${left}px`;
    },
    [axis, buckets, posFromClientX]
  );

  /* ── Pointer handlers (capture-based drag) ── */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    seekFromEvent(e.clientX);
    updateHover(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current && e.buttons === 1) seekFromEvent(e.clientX);
    if (e.pointerType === 'mouse' || draggingRef.current) updateHover(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    if (e.pointerType !== 'mouse') hideHover();
    else {
      const rect = trackRef.current?.getBoundingClientRect();
      if (rect && (e.clientX < rect.left || e.clientX > rect.right)) hideHover();
    }
  };
  const handlePointerLeave = () => {
    if (!draggingRef.current) hideHover();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // stopPropagation so the window-level ±10-year handler in
    // app/page.tsx doesn't also fire.
    const step = e.shiftKey ? 50 : 1;
    const cur = timeline.currentYear;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(timeline.minYear, cur - step);
    else if (e.key === 'ArrowRight') next = Math.min(timeline.maxYear, cur + step);
    else if (e.key === 'Home') next = timeline.minYear;
    else if (e.key === 'End') next = timeline.maxYear;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onYearChange(next);
  };

  /* ── Selected span geometry ── */
  const span = useMemo(() => {
    if (!selectedSpan) return null;
    const start = Math.max(timeline.minYear, selectedSpan.startYear);
    const end = Math.min(timeline.maxYear, selectedSpan.endYear ?? timeline.maxYear);
    const p0 = axis.yearToPos(start);
    const p1 = axis.yearToPos(Math.max(end, start));
    return {
      p0,
      p1,
      color: selectedSpan.kind === 'conflict' ? 'var(--vermilion)' : 'var(--uncertain)',
      label: selectedSpan.label,
      // Right-align the label when the bracket starts in the last third
      // so it stays readable instead of being clipped at the track edge.
      anchorEnd: p0 > 0.66,
    };
  }, [selectedSpan, axis, timeline.minYear, timeline.maxYear]);

  return (
    // Mobile: sit ABOVE the MobileTabDock (~46px + safe-area). Desktop:
    // anchor to the very bottom.
    <div className="absolute left-0 right-0 z-30 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:bottom-0">
      {/* Top fade — keeps map visible behind the strip */}
      <div
        className="h-12 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, oklch(0.16 0.012 250 / 0.85) 0%, transparent 100%)',
        }}
      />

      <div className="px-3 sm:px-6 pb-3 pt-2 hairline-strong-t" style={{ background: STRIP_BG }}>
        {/* Mobile-only top row: year + speed pills. */}
        <div className="flex sm:hidden items-start justify-between gap-2 mb-1">
          <YearReadout
            year={timeline.currentYear}
            minYear={timeline.minYear}
            maxYear={timeline.maxYear}
            isPlaying={timeline.isPlaying}
            speedMode={timeline.speedMode}
            size="s"
            onCommit={onYearChange}
          />
          <SpeedPills
            timeline={timeline}
            onSpeedChange={onSpeedChange}
            onSpeedModeChange={onSpeedModeChange}
            dense
          />
        </div>

        <div className="flex items-end gap-3 sm:gap-4">
          <div className="pb-[14px] sm:pb-[15px]">
            <PlayButton timeline={timeline} onPlay={onPlay} showPlayPrompt={showPlayPrompt} />
          </div>

          {/* Track column: era row + track. `relative` so the hover chip
              can hang above it without being clipped. */}
          <div className="flex-1 relative min-w-0">
            {/* Hover chip — sits above the era row */}
            <div
              ref={chipRef}
              aria-hidden
              className="absolute font-mono whitespace-nowrap pointer-events-none"
              style={{
                bottom: `calc(100% + 4px)`,
                left: 0,
                transform: 'translateX(-50%)',
                opacity: 0,
                transition: 'opacity var(--dur-fast)',
                fontSize: 11,
                lineHeight: '16px',
                letterSpacing: '0.02em',
                color: 'var(--ink-text)',
                background: 'oklch(0.18 0.014 250 / 0.97)',
                border: '1px solid var(--rule-strong)',
                padding: '3px 8px',
                boxShadow: 'var(--shadow-pop)',
                zIndex: 40,
                maxWidth: 'min(760px, 94vw)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span ref={chipYearRef} style={{ color: 'var(--amber)' }} />
              <span style={{ color: 'var(--ink-faint)' }}> · </span>
              <span ref={chipRangeRef} />
              <span style={{ color: 'var(--ink-faint)' }}> · </span>
              <span ref={chipCountRef} />
              <span style={{ color: 'var(--ink-faint)' }}> · </span>
              <span ref={chipNamesRef} style={{ color: 'var(--ink-muted)' }} />
            </div>

            {/* Era labels, laid out inside their segment */}
            <div className="relative" style={{ height: ERA_H, marginBottom: 2 }} aria-hidden>
              {eraLabels.map((s) => (
                <div
                  key={s.from}
                  className="absolute flex items-center justify-center overflow-hidden"
                  style={{ left: `${s.pos0 * 100}%`, width: `${(s.pos1 - s.pos0) * 100}%`, height: ERA_H }}
                >
                  {s.text && (
                    <button
                      type="button"
                      tabIndex={-1}
                      className="eyebrow timeline-era-btn text-wars-faint whitespace-nowrap"
                      style={{ fontSize: 10.5, lineHeight: `${ERA_H}px` }}
                      title={`${s.label}: ${formatYear(s.from)} – ${formatYear(s.to)}. Click to jump to ${formatYear(s.from)}.`}
                      onClick={() => onYearChange(s.from)}
                    >
                      {s.text}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Track */}
            <div
              ref={trackRef}
              className="relative cursor-pointer timeline-track"
              style={{ height: TRACK_H }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              role="slider"
              aria-label="Timeline scrubber: select a year"
              aria-valuemin={timeline.minYear}
              aria-valuemax={timeline.maxYear}
              aria-valuenow={Math.round(timeline.currentYear)}
              aria-valuetext={formatYear(timeline.currentYear)}
              aria-orientation="horizontal"
              tabIndex={0}
              onKeyDown={handleKeyDown}
            >
              {/* Axis-break hairlines through the histogram zone */}
              {axis.axisBreaks().map((b) => (
                <div
                  key={`brk-${b.year}`}
                  aria-hidden
                  className="absolute"
                  style={{
                    left: `${b.pos * 100}%`,
                    bottom: HIST_BOTTOM,
                    width: 1,
                    height: HIST_H,
                    background: 'var(--rule-strong)',
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* Histogram — one bar per bucket, width follows the axis */}
              {buckets.map((b) => {
                const h = densityHeight(b.weight, maxWeight);
                if (h === 0) return null;
                const p0 = axis.yearToPos(b.startYear);
                const p1 = axis.yearToPos(b.endYear);
                const mid = (b.startYear + b.endYear) / 2;
                const past = mid <= timeline.currentYear;
                const barH = Math.max(1.5, h * HIST_H);
                const capH = b.weightMajor > 0
                  ? Math.max(1, barH * (b.weightMajor / b.weight))
                  : 0;
                return (
                  <div
                    key={b.startYear}
                    className="absolute"
                    style={{
                      left: `${p0 * 100}%`,
                      width: `max(1px, calc(${(p1 - p0) * 100}% - 1px))`,
                      bottom: HIST_BOTTOM,
                      height: barH,
                      background: past ? VERMILION_PAST : VERMILION_FUTURE,
                      pointerEvents: 'none',
                    }}
                  >
                    {capH > 0 && (
                      <div
                        className="absolute left-0 right-0 top-0"
                        style={{ height: capH, background: past ? VERMILION_CAP_PAST : VERMILION_CAP_FUTURE }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Baseline */}
              <div
                aria-hidden
                className="absolute left-0 right-0"
                style={{ bottom: TICKS_H, height: 1, background: 'var(--rule-strong)', pointerEvents: 'none' }}
              />

              {/* Ticks + labels below the baseline; ⫽ at each break */}
              {ticks.map((t) => (
                <div
                  key={t.year}
                  aria-hidden
                  className="absolute"
                  style={{ left: `${t.pos * 100}%`, bottom: 0, height: TICKS_H, pointerEvents: 'none' }}
                >
                  <div
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      width: 1,
                      height: t.major ? 5 : 3,
                      background: t.major ? 'var(--rule-strong)' : 'var(--rule)',
                    }}
                  />
                  {t.isBreak && (
                    <span
                      className="font-mono absolute"
                      style={{
                        left: -4,
                        top: -7,
                        fontSize: 10,
                        lineHeight: '10px',
                        color: 'var(--ink-faint)',
                        background: STRIP_BG,
                        padding: '0 1px',
                      }}
                    >
                      ⫽
                    </span>
                  )}
                  {t.label && (
                    <span
                      className="font-mono absolute whitespace-nowrap text-wars-faint"
                      style={{
                        top: 6,
                        fontSize: 10,
                        lineHeight: '10px',
                        letterSpacing: '0.02em',
                        ...(t.align === 'start'
                          ? { left: 0 }
                          : t.align === 'end'
                            ? { right: 0 }
                            : { left: 0, transform: 'translateX(-50%)' }),
                      }}
                    >
                      {t.label}
                    </span>
                  )}
                </div>
              ))}

              {/* Selected conflict / empire span — bracket + label,
                  clipped to the track, never takes the pointer */}
              {span && (
                <div
                  aria-hidden
                  className="absolute left-0 right-0 overflow-hidden"
                  style={{ top: 0, height: BRACKET_H, pointerEvents: 'none', zIndex: 3 }}
                >
                  <div
                    className="absolute"
                    style={{
                      left: `${span.p0 * 100}%`,
                      width: `max(2px, ${(span.p1 - span.p0) * 100}%)`,
                      top: BRACKET_H - 5,
                      height: 5,
                      borderTop: `1px solid ${span.color}`,
                      borderLeft: `1px solid ${span.color}`,
                      borderRight: `1px solid ${span.color}`,
                      boxSizing: 'border-box',
                    }}
                  />
                  <span
                    className="font-mono absolute whitespace-nowrap"
                    style={{
                      ...(span.anchorEnd
                        ? { right: `${(1 - span.p1) * 100}%` }
                        : { left: `${span.p0 * 100}%` }),
                      top: 0,
                      fontSize: 10,
                      lineHeight: '12px',
                      letterSpacing: '0.03em',
                      color: span.color,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {span.label}
                  </span>
                </div>
              )}

              {/* Hover hairline (ivory) */}
              <div
                ref={hoverLineRef}
                aria-hidden
                className="absolute"
                style={{
                  left: 0,
                  bottom: HIST_BOTTOM,
                  width: 1,
                  height: HIST_H,
                  background: 'oklch(0.94 0.012 85 / 0.7)',
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              />

              <Playhead axis={axis} currentYear={timeline.currentYear} isPlaying={timeline.isPlaying} />
            </div>
          </div>

          {/* Year readout — desktop only (mobile renders it in the top row). */}
          <div className="hidden sm:block flex-shrink-0 pb-[6px]">
            <YearReadout
              year={timeline.currentYear}
              minYear={timeline.minYear}
              maxYear={timeline.maxYear}
              isPlaying={timeline.isPlaying}
              speedMode={timeline.speedMode}
              size="l"
              onCommit={onYearChange}
            />
          </div>

          {/* Speed control — desktop only. */}
          <div className="hidden sm:flex flex-shrink-0 items-center pb-[22px]">
            <SpeedPills
              timeline={timeline}
              onSpeedChange={onSpeedChange}
              onSpeedModeChange={onSpeedModeChange}
              dense={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Timeline);
