'use client';

import { useEffect, useRef, useState } from 'react';

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
    blurb: 'An interactive cartography of every named war in human history — 1,340 conflicts and 372 empires across 5,000 years. Scrub the timeline at the bottom to watch borders shift; click a polygon for empire detail, click a red dot for a conflict. This project has been assembled via countless amazing open source resources, Claude Cowork, and several late nights.',
    hold: 9,
    bbox: [-160, -50, 180, 55],
  },
  {
    year: -2500, title: 'Cradle of cities', shortTitle: 'Cradle',
    blurb: 'Bronze Age Sumer, Egypt, and the Indus Valley fight the first wars we can name. Walls go up around the world’s earliest cities; civilization and conflict arrive together.',
    hold: 5,
    bbox: [22, 5, 80, 35],
  },
  {
    year: -490, title: 'Greco-Persian Wars', shortTitle: 'Greco-Persian',
    blurb: 'A coalition of Greek city-states halts the largest empire the world has yet seen. The Persian invasions force Athens, Sparta, and their neighbours into a fragile alliance.',
    hold: 5,
    bbox: [18, 20, 60, 40],
  },
  {
    year: -100, title: 'Two empires emerge', shortTitle: 'Two empires',
    blurb: 'Rome and Han China industrialize war on opposite ends of Eurasia, professional armies remaking the political map of half the world.',
    hold: 5,
    bbox: [-10, 8, 130, 45],
  },
  {
    year: 632, title: 'Arab conquests', shortTitle: 'Caliphate',
    blurb: 'In a century, the Caliphate reaches from Spain to the Indus. The Mediterranean is cut in half; the Sasanian Empire ceases to exist.',
    hold: 5,
    bbox: [-12, 0, 75, 38],
  },
  {
    year: 1240, title: 'Mongol century', shortTitle: 'Mongol',
    blurb: 'The largest contiguous land empire in history takes shape from the steppe. From Korea to Hungary, the rules of war and statecraft are rewritten in a generation.',
    hold: 5,
    bbox: [18, 8, 130, 48],
  },
  {
    year: 1521, title: 'Conquest of the Americas', shortTitle: 'Americas',
    blurb: 'Cortés enters Tenochtitlan; the demographic catastrophe of the Columbian exchange begins. New diseases and gunpowder collapse millennia-old civilizations within decades.',
    hold: 5,
    bbox: [-125, -55, -34, 50],
  },
  {
    year: 1815, title: 'Long peace, hidden wars', shortTitle: 'Long peace',
    blurb: 'Europe stabilizes after Napoleon while colonial wars expand across Africa, India, the Pacific. Great-power peace abroad coexists with industrial-scale conquest elsewhere.',
    hold: 5,
    bbox: [-15, 0, 95, 55],
  },
  {
    year: 1944, title: 'World War II', shortTitle: 'World War II',
    blurb: 'The deadliest conflict in human history reshapes the political map. By 1944 the Soviets push west, the Allies have landed in Normandy, and empires are about to dissolve.',
    hold: 5,
    bbox: [-15, 32, 50, 60],
  },
  {
    year: 1989, title: 'After the Cold War', shortTitle: 'After',
    blurb: 'Civil wars and insurgencies replace state-on-state conflict as the dominant form. The map gets denser even as the great powers fight each other less.',
    hold: 5,
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

function formatStopYear(y: number) {
  return y < 0 ? `${-y} BCE` : `${y} CE`;
}

function formatBigYear(y: number) {
  // Years are conventionally written without thousands separators
  // ("2500 BCE", not "2,500 BCE"). Casualty counts keep their commas;
  // years do not.
  if (y < 0) return { num: String(Math.abs(y)), suffix: 'BCE' };
  return { num: String(y), suffix: 'CE' };
}

/* ─────────────────────────────────────────────────────────────
 * OPENING TOUR — restyled as an editorial exhibit card.
 *
 * 720px-wide centered card on dimmed map. Header bar with amber
 * eyebrow + mono keyboard hints; oversized amber year next to a
 * serif title and italic blurb; 9-segment progress strip; inline
 * stops index in display serif (mono year + short name); footer
 * with Skip / Pause / Previous (outlined) / Next stop (amber).
 *
 * Auto-advance, pause/resume, and keyboard nav are unchanged
 * from the previous version (arrows, Enter, Space, Escape).
 * ─────────────────────────────────────────────────────────── */
export default function OpeningTour({ open, onClose, onFinish, onSeek, onFlyToBbox }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-advance timer (skipped when paused)
  useEffect(() => {
    if (!open || paused) return;
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
  }, [open, index, paused, onFinish]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
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

  if (!open) return null;
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;
  const isFirst = index === 0;
  // The intro stop has no year — we hide the giant amber year and let the
  // title + blurb breathe instead.
  const big = stop.year === null ? null : formatBigYear(stop.year);

  // Shared button base style — keeps Pause / Previous / Next visually
  // consistent (same height, same font, same letter-spacing). The only
  // visual diff is the Next button's amber fill.
  const ctrlBase: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '10px 14px',
    minHeight: 40,
    cursor: 'pointer',
    background: 'transparent',
    border: '1px solid var(--rule-strong)',
    color: 'var(--ink-text-2)',
    transition: 'color 120ms, background 120ms, opacity 120ms',
  };
  const ctrlPrimary: React.CSSProperties = {
    ...ctrlBase,
    background: 'var(--amber)',
    border: '1px solid var(--amber)',
    color: 'var(--ink-0)',
    fontWeight: 600,
  };
  const ctrlDisabled: React.CSSProperties = {
    cursor: 'not-allowed',
    opacity: 0.35,
    color: 'var(--ink-faint)',
  };

  return (
    <>
      {/* Soft dim — much lighter than before so the map stays legible while
          the tour is open. Tour is a guide, not a wall. */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, oklch(0.10 0.012 250 / 0) 0%, oklch(0.10 0.012 250 / 0.32) 60%, oklch(0.10 0.012 250 / 0.55) 100%)',
        }}
        aria-hidden
      />

      {/* Tour panel — bottom-anchored on desktop so the map stays visible
          above; full-width on mobile but capped at 56vh so the map peeks
          through. */}
      <div
        className="fixed left-0 right-0 z-40 flex items-end justify-center pointer-events-none px-3 sm:px-4"
        style={{
          // Anchored to bottom edge on every breakpoint, with a small inset
          // so the panel doesn't touch the timeline/dock. On mobile we lift
          // it higher to keep the map visible.
          bottom: 0,
          top: 'auto',
        }}
        role="dialog"
        aria-label="Guided tour"
      >
        <div
          className="pointer-events-auto relative w-full"
          style={{
            maxWidth: 720,
            background: 'oklch(0.18 0.014 250 / 0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--rule-strong)',
            color: 'var(--ink-text)',
            // Generous padding on desktop, tighter on mobile. Bottom padding
            // leaves room for the timeline + (on mobile) the tab dock.
            padding: '20px 22px 18px',
            // Limit total height so the user always sees some map.
            maxHeight: '56vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-pop)',
            // Lift above the timeline (~88–120px tall) and (on mobile) the
            // tab dock (~56px). 24px clear on desktop, 96px on mobile.
            marginBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 24px))',
          }}
        >
          {/* X close (Skip) — top-right corner. Single discrete affordance
              to leave the tour at any moment, separates "leave" from "navigate". */}
          <button
            onClick={onClose}
            aria-label="Close tour"
            className="absolute top-2 right-2 sm:top-3 sm:right-3 inline-flex items-center justify-center text-wars-muted hover:text-wars-text transition-colors"
            style={{
              width: 36,
              height: 36,
              background: 'transparent',
              border: '1px solid var(--rule)',
              cursor: 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
              <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>

          {/* Header bar */}
          <div
            className="flex justify-between items-baseline pb-3 pr-12"
            style={{ borderBottom: '1px solid var(--rule-strong)' }}
          >
            <div className="eyebrow" style={{ color: 'var(--amber)' }}>
              Exhibit · Stop {index + 1} of {STOPS.length}
            </div>
            <div
              className="font-mono text-wars-muted hidden md:block"
              style={{ fontSize: 10, letterSpacing: '0.04em' }}
            >
              ← prev · space to pause · esc to skip
            </div>
          </div>

          {/* Title + year (or title-only for intro stop) */}
          <div className="flex items-start gap-4 sm:gap-7 py-5">
            {big && (
              <div
                className="font-display tabular-nums flex-shrink-0 hidden sm:block"
                style={{
                  fontSize: 48,
                  lineHeight: 1,
                  fontWeight: 400,
                  color: 'var(--amber)',
                  letterSpacing: '-0.02em',
                }}
              >
                {big.num}
                <div
                  className="font-mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    color: 'oklch(0.78 0.14 78 / 0.7)',
                    marginTop: 4,
                  }}
                >
                  {big.suffix}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {/* Mobile-only year (inline, smaller) for non-intro stops. */}
              {big && (
                <div
                  className="font-mono sm:hidden mb-1.5"
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--amber)',
                  }}
                >
                  {big.num} {big.suffix}
                </div>
              )}
              <h2
                className="font-display"
                style={{
                  margin: 0,
                  fontSize: 'clamp(22px, 4.5vw, 30px)',
                  lineHeight: 1.1,
                  fontWeight: 400,
                  letterSpacing: '-0.015em',
                  color: 'var(--ink-text)',
                  textWrap: 'balance' as React.CSSProperties['textWrap'],
                }}
              >
                {stop.title}
              </h2>
              <p
                className="font-display italic"
                style={{
                  fontSize: 'clamp(14px, 2.6vw, 16px)',
                  lineHeight: 1.55,
                  color: 'var(--ink-text-2)',
                  margin: '12px 0 0',
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                  maxWidth: 540,
                }}
              >
                {stop.blurb}
              </p>
            </div>
          </div>

          {/* Progress strip — one segment per stop */}
          <div
            className="flex gap-1 pt-3 pb-2"
            style={{ borderTop: '1px solid var(--rule)' }}
            aria-hidden
          >
            {STOPS.map((_, i) => {
              const isPast = i < index;
              const isCurrent = i === index;
              return (
                <div
                  key={i}
                  className="flex-1 relative"
                  style={{
                    height: 2,
                    background: isPast
                      ? 'var(--ink-3)'
                      : isCurrent
                        ? 'oklch(0.78 0.14 78 / 0.25)'
                        : 'var(--ink-1)',
                  }}
                >
                  {isCurrent && !paused && (
                    <div
                      key={`fill-${i}-${paused}`}
                      className="absolute inset-y-0 left-0"
                      style={{
                        background: 'var(--amber)',
                        animation: `tour-progress ${stop.hold}s linear forwards`,
                      }}
                    />
                  )}
                  {isCurrent && paused && (
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: '50%',
                        background: 'var(--amber)',
                        opacity: 0.5,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Stops index — desktop only. Helpful on a wide screen, just
              clutter on mobile where progress strip already shows position. */}
          <div
            className="hidden md:flex flex-wrap mt-3 gap-x-5 gap-y-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {STOPS.map((s, i) => (
              <button
                key={`${i}-${s.shortTitle}`}
                onClick={() => setIndex(i)}
                className="flex items-baseline gap-1.5 transition-colors hover:text-wars-text"
                style={{
                  fontSize: 12,
                  fontStyle: i === index ? 'italic' : 'normal',
                  color: i === index ? 'var(--ink-text)' : 'var(--ink-faint)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                aria-current={i === index ? 'step' : undefined}
              >
                {s.year !== null && (
                  <span className="font-mono" style={{ fontSize: 10 }}>
                    {formatStopYear(s.year)}
                  </span>
                )}
                {s.shortTitle}
              </button>
            ))}
          </div>

          {/* Controls — three same-height buttons. Pause / Previous match;
              Next is the primary amber fill. Skip lives in the X above. */}
          <div
            className="flex items-center justify-end gap-2 mt-5 pt-4"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
            <button
              onClick={() => setPaused((p) => !p)}
              style={ctrlBase}
              aria-pressed={paused}
              aria-label={paused ? 'Resume tour' : 'Pause tour'}
              className="font-ui hover:text-wars-text"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => !isFirst && setIndex((i) => i - 1)}
              disabled={isFirst}
              style={isFirst ? { ...ctrlBase, ...ctrlDisabled } : ctrlBase}
              className="font-ui hover:text-wars-text"
            >
              ← Previous
            </button>
            <button
              onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
              style={ctrlPrimary}
              className="font-ui hover:opacity-90"
            >
              {isLast ? 'Finish →' : 'Next stop →'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes tour-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </>
  );
}
