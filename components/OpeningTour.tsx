'use client';

import { useEffect, useRef, useState } from 'react';

interface Stop {
  year: number;
  /** Full title (used in the headline of the card). */
  title: string;
  /** Short title used in the inline stops index at the bottom. */
  shortTitle: string;
  /** Italic editorial blurb shown beside the year. */
  blurb: string;
  /** Seconds to spend on this stop when auto-playing. */
  hold: number;
}

const STOPS: Stop[] = [
  {
    year: -2500, title: 'Cradle of cities', shortTitle: 'Cradle',
    blurb: 'Bronze Age Sumer, Egypt, and the Indus Valley fight the first wars we can name. Walls go up around the world’s earliest cities; civilization and conflict arrive together.',
    hold: 5,
  },
  {
    year: -490, title: 'Greco-Persian Wars', shortTitle: 'Greco-Persian',
    blurb: 'A coalition of Greek city-states halts the largest empire the world has yet seen. The Persian invasions force Athens, Sparta, and their neighbours into a fragile alliance.',
    hold: 5,
  },
  {
    year: -100, title: 'Two empires emerge', shortTitle: 'Two empires',
    blurb: 'Rome and Han China industrialize war on opposite ends of Eurasia, professional armies remaking the political map of half the world.',
    hold: 5,
  },
  {
    year: 632, title: 'Arab conquests', shortTitle: 'Caliphate',
    blurb: 'In a century, the Caliphate reaches from Spain to the Indus. The Mediterranean is cut in half; the Sasanian Empire ceases to exist.',
    hold: 5,
  },
  {
    year: 1240, title: 'Mongol century', shortTitle: 'Mongol',
    blurb: 'The largest contiguous land empire in history takes shape from the steppe. From Korea to Hungary, the rules of war and statecraft are rewritten in a generation.',
    hold: 5,
  },
  {
    year: 1521, title: 'Conquest of the Americas', shortTitle: 'Americas',
    blurb: 'Cortés enters Tenochtitlan; the demographic catastrophe of the Columbian exchange begins. New diseases and gunpowder collapse millennia-old civilizations within decades.',
    hold: 5,
  },
  {
    year: 1815, title: 'Long peace, hidden wars', shortTitle: 'Long peace',
    blurb: 'Europe stabilizes after Napoleon while colonial wars expand across Africa, India, the Pacific. Great-power peace abroad coexists with industrial-scale conquest elsewhere.',
    hold: 5,
  },
  {
    year: 1944, title: 'World War II', shortTitle: 'World War II',
    blurb: 'The deadliest conflict in human history reshapes the political map. By 1944 the Soviets push west, the Allies have landed in Normandy, and empires are about to dissolve.',
    hold: 5,
  },
  {
    year: 1989, title: 'After the Cold War', shortTitle: 'After',
    blurb: 'Civil wars and insurgencies replace state-on-state conflict as the dominant form. The map gets denser even as the great powers fight each other less.',
    hold: 5,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSeek: (year: number) => void;
}

function formatStopYear(y: number) {
  return y < 0 ? `${-y} BCE` : `${y} CE`;
}

function formatBigYear(y: number) {
  if (y < 0) return { num: Math.abs(y).toLocaleString(), suffix: 'BCE' };
  return { num: y.toLocaleString(), suffix: 'CE' };
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
export default function OpeningTour({ open, onClose, onSeek }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setPaused(false);
  }, [open]);

  // Seek to current stop's year whenever we change stops
  useEffect(() => {
    if (!open) return;
    onSeek(STOPS[index].year);
  }, [open, index, onSeek]);

  // Auto-advance timer (skipped when paused)
  useEffect(() => {
    if (!open || paused) return;
    const stop = STOPS[index];
    timerRef.current = setTimeout(() => {
      if (index < STOPS.length - 1) {
        setIndex((i) => i + 1);
      } else {
        onClose();
      }
    }, stop.hold * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, index, paused, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        if (index < STOPS.length - 1) setIndex((i) => i + 1);
        else onClose();
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
  }, [open, index, onClose]);

  if (!open) return null;
  const stop = STOPS[index];
  const isLast = index === STOPS.length - 1;
  const isFirst = index === 0;
  const big = formatBigYear(stop.year);

  return (
    <>
      {/* Dim wash over the map */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, oklch(0.10 0.012 250 / 0.40), oklch(0.10 0.012 250 / 0.92))',
        }}
        aria-hidden
      />

      <div
        className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none px-4"
        role="dialog"
        aria-label="Guided tour"
      >
        <div
          className="pointer-events-auto"
          style={{
            width: 'min(720px, 100%)',
            background: 'oklch(0.18 0.014 250 / 0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--rule-strong)',
            color: 'var(--ink-text)',
            padding: '24px 36px 20px',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {/* Header bar */}
          <div
            className="flex justify-between items-baseline pb-4"
            style={{ borderBottom: '1px solid var(--rule-strong)' }}
          >
            <div className="eyebrow" style={{ color: 'var(--amber)' }}>
              Exhibit · Stop {index + 1} of {STOPS.length}
            </div>
            <div
              className="font-mono text-wars-muted hidden sm:block"
              style={{ fontSize: 10, letterSpacing: '0.04em' }}
            >
              ← prev · space to pause · esc to skip
            </div>
          </div>

          {/* Title + year */}
          <div className="flex items-start gap-6 sm:gap-8 py-7">
            <div
              className="font-display tabular-nums flex-shrink-0"
              style={{
                fontSize: 56,
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
            <div className="flex-1 min-w-0">
              <h2
                className="font-display"
                style={{
                  margin: 0,
                  fontSize: 36,
                  lineHeight: 1.05,
                  fontWeight: 400,
                  letterSpacing: '-0.018em',
                  color: 'var(--ink-text)',
                  textWrap: 'balance' as React.CSSProperties['textWrap'],
                }}
              >
                {stop.title}
              </h2>
              <p
                className="font-display italic"
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: 'var(--ink-text-2)',
                  margin: '16px 0 0',
                  textWrap: 'pretty' as React.CSSProperties['textWrap'],
                  maxWidth: 540,
                }}
              >
                {stop.blurb}
              </p>
            </div>
          </div>

          {/* Progress strip — 9 segments */}
          <div
            className="flex gap-1 py-3"
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

          {/* Stops index */}
          <div
            className="flex flex-wrap mt-4 gap-x-5 gap-y-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {STOPS.map((s, i) => (
              <button
                key={s.year}
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
                <span className="font-mono" style={{ fontSize: 10 }}>
                  {formatStopYear(s.year)}
                </span>
                {s.shortTitle}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div
            className="flex items-center justify-between mt-6 pt-5"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
            <button
              onClick={onClose}
              className="font-ui text-wars-muted hover:text-wars-text transition-colors"
              style={{
                fontSize: 12,
                letterSpacing: '0.04em',
                background: 'transparent',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer',
              }}
            >
              Skip exhibit
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaused((p) => !p)}
                className="font-ui text-wars-muted hover:text-wars-text transition-colors"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  background: 'transparent',
                  border: '1px solid var(--rule)',
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                aria-pressed={paused}
                aria-label={paused ? 'Resume tour' : 'Pause tour'}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => !isFirst && setIndex((i) => i - 1)}
                disabled={isFirst}
                className="font-ui transition-colors"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  background: 'transparent',
                  border: '1px solid var(--rule-strong)',
                  color: isFirst ? 'var(--ink-faint)' : 'var(--ink-text-2)',
                  padding: '10px 16px',
                  cursor: isFirst ? 'not-allowed' : 'pointer',
                  opacity: isFirst ? 0.4 : 1,
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => (isLast ? onClose() : setIndex((i) => i + 1))}
                className="font-ui hover:opacity-90 transition-opacity"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  background: 'var(--amber)',
                  border: '1px solid var(--amber)',
                  color: 'var(--ink-0)',
                  padding: '10px 18px',
                  cursor: 'pointer',
                }}
              >
                {isLast ? 'Finish' : 'Next stop →'}
              </button>
            </div>
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
