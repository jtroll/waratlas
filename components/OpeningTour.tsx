'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { formatYear } from '@/lib/format';
import { useFocusTrap } from '@/lib/focus-trap';
import stats from '@/lib/generated/stats.json';

const STAT_CONFLICTS = `over ${(Math.floor(stats.conflicts / 1000) * 1000).toLocaleString('en-US')} conflicts`;
const STAT_EMPIRES = `${Math.floor(stats.empires / 100) * 100}+ empires`;

interface Stop {
  /** Year to seek the timeline to. `null` means do not seek (used by the
   *  intro stop, which just explains what the tool is). */
  year: number | null;
  /** Full title (used in the headline of the card). */
  title: string;
  /** Short title used in the inline stops index at the bottom. */
  shortTitle: string;
  /** Italic editorial blurb shown beside the year. */
  blurb: string;
  /** Seconds to spend on this stop when auto-playing. */
  hold: number;
  /** Optional bounding box to fly the map to on this stop, as
   *  [minLng, minLat, maxLng, maxLat]. `null` (or omitted) keeps the
   *  current camera. */
  bbox?: [number, number, number, number] | null;
}

const STOPS: Stop[] = [
  {
    year: null, title: 'Welcome to War Atlas', shortTitle: 'Start',
    blurb: `An interactive cartography of thousands of named wars across 5,000 years of history — ${STAT_CONFLICTS} and ${STAT_EMPIRES}. Scrub the timeline at the bottom to watch borders shift; click a polygon for empire detail, click a red dot for a conflict.`,
    hold: 12,
    bbox: [-160, -50, 180, 55],
  },
  {
    year: -2500, title: 'Cradle of cities', shortTitle: 'Cradle',
    blurb: 'Bronze Age Sumer, Egypt, and the Indus Valley fight the first wars we can name. Walls go up around the world’s earliest cities; civilization and conflict arrive together.',
    hold: 12,
    bbox: [22, 5, 80, 35],
  },
  {
    year: -490, title: 'Greco-Persian Wars', shortTitle: 'Greco-Persian',
    blurb: 'A coalition of Greek city-states halts the largest empire the world has yet seen. The Persian invasions force Athens, Sparta, and their neighbours into a fragile alliance.',
    hold: 12,
    bbox: [18, 20, 60, 40],
  },
  {
    year: -100, title: 'Two empires emerge', shortTitle: 'Two empires',
    blurb: 'Rome and Han China industrialize war on opposite ends of Eurasia, professional armies remaking the political map of half the world.',
    hold: 12,
    bbox: [-10, 8, 130, 45],
  },
  {
    year: 632, title: 'Arab conquests', shortTitle: 'Caliphate',
    blurb: 'In a century, the Caliphate reaches from Spain to the Indus. The Mediterranean is cut in half; the Sasanian Empire ceases to exist.',
    hold: 12,
    bbox: [-12, 0, 75, 38],
  },
  {
    year: 1240, title: 'Mongol century', shortTitle: 'Mongol',
    blurb: 'The largest contiguous land empire in history takes shape from the steppe. From Korea to Hungary, the rules of war and statecraft are rewritten in a generation.',
    hold: 12,
    bbox: [18, 8, 130, 48],
  },
  {
    year: 1521, title: 'Conquest of the Americas', shortTitle: 'Americas',
    blurb: 'Cortés enters Tenochtitlan; the demographic catastrophe of the Columbian exchange begins. New diseases and gunpowder collapse millennia-old civilizations within decades.',
    hold: 12,
    bbox: [-125, -55, -34, 50],
  },
  {
    year: 1815, title: 'Long peace, hidden wars', shortTitle: 'Long peace',
    blurb: 'Europe stabilizes after Napoleon while colonial wars expand across Africa, India, the Pacific. Great-power peace abroad coexists with industrial-scale conquest elsewhere.',
    hold: 12,
    bbox: [-15, 0, 95, 55],
  },
  {
    year: 1944, title: 'World War II', shortTitle: 'World War II',
    blurb: 'The deadliest conflict in human history reshapes the political map. By 1944 the Soviets push west, the Allies have landed in Normandy, and empires are about to dissolve.',
    hold: 12,
    bbox: [-15, 32, 50, 60],
  },
  {
    year: 1989, title: 'After the Cold War', shortTitle: 'After',
    blurb: 'Civil wars and insurgencies replace state-on-state conflict as the dominant form. The map gets denser even as the great powers fight each other less.',
    hold: 12,
    bbox: [-130, -50, 170, 65],
  },
];

interface Props {
  open: boolean;
  /** User dismissed the tour early (Skip/Escape/X). Should NOT reset the
   *  timeline — preserve wherever they were. */
  onClose: () => void;
  /** User completed the whole tour. Resets the timeline to the start and
   *  shows the "press Play" prompt. */
  onFinish: () => void;
  /** Seek the timeline. Used by per-stop year changes. */
  onSeek: (year: number) => void;
  /** Fly the map to a given bounding box on each stop. Optional —
   *  if omitted, the tour just seeks the timeline without panning. */
  onFlyToBbox?: (bbox: [number, number, number, number]) => void;
}

/* ─────────────────────────────────────────────────────────────
 * OPENING TOUR — an exhibit guide, not a wizard.
 *
 * A ≤560px sheet anchored bottom-left over the map on desktop (the map
 * does the talking; the card is a placard beside it) and a bottom sheet
 * ≤45vh on mobile. Mono eyebrow "Exhibit 3 · 490 BCE", serif title 26px,
 * italic serif blurb 16px, a thin progress rule, hairline buttons with
 * ivory text (Next is an ivory fill with ink text). No amber: amber is
 * reserved for the current year and selection.
 *
 * Mechanics unchanged: 12 s holds, pause on hover, arrows / Enter / Space /
 * Escape; Skip preserves the year. Focus moves into the card on open and
 * returns on close.
 * ─────────────────────────────────────────────────────────── */
function OpeningTour({ open, onClose, onFinish, onSeek, onFlyToBbox }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Auto-advance also holds while the pointer rests on the card, so a
  // reader isn't yanked to the next stop mid-sentence.
  const [hovering, setHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setPaused(false);
  }, [open]);

  // Seek to current stop's year whenever we change stops. The intro stop's
  // year is null (sentinel) — don't move the timeline for that one so the
  // user can see the present-day map state while reading the welcome.
  useEffect(() => {
    if (!open) return;
    const targetYear = STOPS[index].year;
    if (targetYear !== null) onSeek(targetYear);
  }, [open, index, onSeek]);

  // Pan/zoom the map to the stop's region on each step.
  useEffect(() => {
    if (!open || !onFlyToBbox) return;
    const bbox = STOPS[index].bbox;
    if (bbox) onFlyToBbox(bbox);
  }, [open, index, onFlyToBbox]);

  // Auto-advance timer (skipped when paused or while hovering the card)
  useEffect(() => {
    if (!open || paused || hovering) return;
    const stop = STOPS[index];
    timerRef.current = setTimeout(() => {
      if (index < STOPS.length - 1) {
        setIndex((i) => i + 1);
      } else {
        onFinish();
      }
    }, stop.hold * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, index, paused, hovering, onFinish]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        // Let a focused button keep its native Enter activation.
        if (e.key === 'Enter' && target?.tagName === 'BUTTON') return;
        e.preventDefault();
        if (index < STOPS.length - 1) setIndex((i) => i + 1);
        else onFinish();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) setIndex((i) => i - 1);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, onClose, onFinish]);

  // Focus moves to "Next" on open (the primary action) and returns to the
  // Tour button on close; Tab cycles within the card.
  useFocusTrap(cardRef, open, { initialFocus: nextRef });

  if (!open) return null;
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;
  const isFirst = index === 0;
  const total = STOPS.length;
  const eyebrow =
    stop.year === null
      ? `Exhibit ${index + 1} of ${total} · Introduction`
      : `Exhibit ${index + 1} of ${total} · ${formatYear(stop.year)}`;

  // Shared button base — hairline chrome, ivory text. Next is an ivory
  // fill with ink text. 40px tall so they clear the touch minimum.
  const ctrlBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '0 14px',
    height: 40,
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid var(--rule-strong)',
    color: 'var(--ink-text)',
    transition: 'color 120ms, background 120ms, opacity 120ms',
  };
  const ctrlPrimary: React.CSSProperties = {
    ...ctrlBase,
    background: 'var(--ink-text)',
    border: '1px solid var(--ink-text)',
    color: 'var(--ink-0)',
    fontWeight: 600,
  };
  const ctrlDisabled: React.CSSProperties = {
    cursor: 'not-allowed',
    opacity: 0.4,
  };
  const ctrlQuiet: React.CSSProperties = {
    ...ctrlBase,
    border: '1px solid transparent',
    color: 'var(--ink-text-2)',
    padding: '0 6px',
  };

  return (
    <>
      {/* Soft dim toward the card's corner so the map stays legible while
          the tour is open. Tour is a guide, not a wall. */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, color-mix(in oklch, var(--ink-0) 30%, transparent) 60%, color-mix(in oklch, var(--ink-0) 55%, transparent) 100%)',
        }}
        aria-hidden
      />

      {/* Placement: bottom-left over the map on desktop, clearing the
          timeline strip (which can publish --timeline-height); a bottom
          sheet above the tab dock on mobile. */}
      <div
        className="fixed z-40 pointer-events-none left-0 right-0 sm:right-auto sm:left-6"
        style={{ bottom: 0 }}
      >
        <div
          ref={cardRef}
          className="tour-card surface-sheet pointer-events-auto relative w-full sm:w-[min(560px,calc(100vw-48px))] border-x-0 border-b-0 sm:border"
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-blurb"
          style={{
            color: 'var(--ink-text)',
            boxShadow: 'var(--shadow-pop)',
            overflowY: 'auto',
          }}
        >
          <div className="px-5 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5">
            {/* Eyebrow row: exhibit number · year, keyboard hint, close */}
            <div className="flex items-center justify-between gap-3">
              <p
                className="font-mono m-0 uppercase text-wars-text-2"
                style={{ fontSize: 11, letterSpacing: '0.08em' }}
              >
                {eyebrow}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-wars-faint hidden md:inline"
                  style={{ fontSize: 11, letterSpacing: '0.02em' }}
                  aria-hidden
                >
                  ← → · space · esc
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Skip the tour"
                  className="icon-btn -mr-2"
                  title="Skip (Esc)"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
                    <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Title + blurb */}
            <h2
              id="tour-title"
              className="font-display text-wars-text"
              style={{
                margin: '10px 0 0',
                fontSize: 26,
                lineHeight: 1.1,
                fontWeight: 400,
                letterSpacing: '-0.018em',
                textWrap: 'balance' as React.CSSProperties['textWrap'],
              }}
            >
              {stop.title}
            </h2>
            <p
              id="tour-blurb"
              className="font-display italic"
              style={{
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--ink-text-2)',
                margin: '10px 0 0',
                textWrap: 'pretty' as React.CSSProperties['textWrap'],
              }}
            >
              {stop.blurb}
            </p>

            {/* Progress rule — one hairline; ivory fill for completed stops,
                the current stop's segment fills over its hold time. */}
            <div
              className="relative mt-4"
              style={{ height: 1, background: 'var(--rule)' }}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
              aria-label={`Stop ${index + 1} of ${total}`}
            >
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${(index / total) * 100}%`, background: 'var(--ink-text-2)' }}
              />
              {!paused && !hovering ? (
                <div
                  key={`fill-${index}`}
                  className="absolute inset-y-0"
                  style={{
                    left: `${(index / total) * 100}%`,
                    ['--seg' as string]: `${100 / total}%`,
                    background: 'var(--ink-text)',
                    animation: `tour-progress ${stop.hold}s linear forwards`,
                  }}
                />
              ) : (
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${(index / total) * 100}%`,
                    width: `${50 / total}%`,
                    background: 'var(--ink-text)',
                    opacity: 0.5,
                  }}
                />
              )}
            </div>

            {/* Stops index — desktop only. */}
            <nav
              className="hidden md:flex flex-wrap mt-3 gap-x-4 gap-y-1.5 font-display"
              aria-label="Tour stops"
            >
              {STOPS.map((s, i) => (
                <button
                  key={`${i}-${s.shortTitle}`}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="flex items-baseline gap-1.5 transition-colors hover:text-wars-text"
                  style={{
                    fontSize: 12.5,
                    fontStyle: i === index ? 'italic' : 'normal',
                    color: i === index ? 'var(--ink-text)' : 'var(--ink-muted)',
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 0',
                    cursor: 'pointer',
                    borderBottom: i === index ? '1px solid var(--ink-text)' : '1px solid transparent',
                  }}
                  aria-current={i === index ? 'step' : undefined}
                >
                  {s.year !== null && (
                    <span className="font-mono" style={{ fontSize: 11 }}>
                      {formatYear(s.year)}
                    </span>
                  )}
                  {s.shortTitle}
                </button>
              ))}
            </nav>

            {/* Controls — Skip (quiet) left; Pause · Previous · Next right. */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
              <button type="button" onClick={onClose} style={ctrlQuiet} className="font-ui hover:text-wars-text">
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  style={ctrlBase}
                  aria-pressed={paused}
                  aria-label={paused ? 'Resume tour' : 'Pause tour'}
                  className="font-ui hover-tint hidden sm:inline-flex items-center"
                >
                  {paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={() => !isFirst && setIndex((i) => i - 1)}
                  disabled={isFirst}
                  style={isFirst ? { ...ctrlBase, ...ctrlDisabled } : ctrlBase}
                  className="font-ui hover-tint inline-flex items-center"
                  aria-label="Previous stop"
                >
                  ← Prev
                </button>
                <button
                  ref={nextRef}
                  type="button"
                  onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
                  style={ctrlPrimary}
                  className="font-ui hover:opacity-90 inline-flex items-center"
                >
                  {isLast ? 'Finish →' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tour-card {
          /* Mobile: bottom sheet above the tab dock, ≤45vh. */
          max-height: 45vh;
          margin-bottom: calc(46px + env(safe-area-inset-bottom, 0px));
        }
        @media (min-width: 640px) {
          .tour-card {
            max-height: min(60vh, 520px);
            /* Sit above the timeline strip; Timeline may publish its own
               height as --timeline-height on :root. */
            margin-bottom: var(--timeline-height, 128px);
          }
        }
      `}</style>
    </>
  );
}

export default memo(OpeningTour);
