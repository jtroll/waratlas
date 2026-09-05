'use client';

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Conflict } from '@/lib/types';
import type { YearEvents } from '@/lib/conflicts';
import { formatYear } from '@/lib/format';

interface Props {
  year: number;
  events: YearEvents;
  /** Select + fly to a conflict (the page's navigate handler). */
  onConflictClick: (c: Conflict) => void;
  /** "+N" overflow and the mobile eyebrow open the conflict list. */
  onShowAll: () => void;
  /** Distance (px) from the bottom of the map container to the ledger's
   *  bottom edge — measured by the page from the Timeline so the strip
   *  sits just above it on both breakpoints. */
  bottom: number;
  /** Left edge (px) — the page measures the border legend so the strip
   *  starts to its right on desktop (12 on mobile). */
  left?: number;
  /** A right-side panel is open: keep the strip clear of it. */
  panelOpen?: boolean;
}

const MAX_NAMES = 6;

/* ─────────────────────────────────────────────────────────────
 * THIS-YEAR LEDGER — what began and what ended in the current year.
 *
 * A slim chrome strip above the timeline: mono eyebrow "1939 · 12 began ·
 * 3 ended", then up to six names as buttons (serif 13px name, mono 11px
 * began/ended tag) and a "+N" overflow that opens the list panel. It
 * re-renders once per integer year (the page only commits integer years
 * during playback) with a 180 ms fade keyed on the year. Hidden when
 * nothing began or ended, and in hidden-chrome mode (the page omits it).
 * Mobile collapses to the eyebrow line, tappable to open the list.
 * ─────────────────────────────────────────────────────────── */
function YearLedger({ year, events, onConflictClick, onShowAll, bottom, left = 24, panelOpen = false }: Props) {
  const { started, ended } = events;

  // Merge both lists by importance so the six slots go to the conflicts
  // that matter, not to whichever list happens to come first. A single-
  // year record appears in both lists; show it once, tagged "began".
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: { c: Conflict; tag: 'began' | 'ended' }[] = [];
    const s = started.map((c) => ({ c, tag: 'began' as const }));
    const e = ended.map((c) => ({ c, tag: 'ended' as const }));
    let i = 0;
    let j = 0;
    while (i < s.length || j < e.length) {
      const pick =
        j >= e.length || (i < s.length && s[i].c.importance >= e[j].c.importance) ? s[i++] : e[j++];
      if (seen.has(pick.c.id)) continue;
      seen.add(pick.c.id);
      out.push(pick);
    }
    return out;
  }, [started, ended]);

  // Fit whole entries: measure each name button at its natural width and
  // show as many as the strip has room for (the rest fold into "+N")
  // instead of letting flex squeeze every name to "Worl…". Widths are
  // re-measured whenever the rows change (all candidates render for that
  // pass) and on resize.
  const candidates = rows.slice(0, MAX_NAMES);
  // The strip is inline-flex (it hugs its content), so the room available
  // is read from the fixed-width positioning wrapper minus the eyebrow —
  // measuring the strip itself would shrink with every hidden name and
  // collapse the fit to nothing.
  const wrapRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const namesRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef<number[]>([]);
  const [fit, setFit] = useState<{ rows: typeof rows; visible: number }>({ rows, visible: MAX_NAMES });
  if (fit.rows !== rows) setFit({ rows, visible: MAX_NAMES });
  const visible = fit.rows === rows ? fit.visible : MAX_NAMES;
  useLayoutEffect(() => {
    const el = namesRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const measure = () => {
      const btns = Array.from(el.querySelectorAll<HTMLElement>('[data-ledger-name]'));
      btns.forEach((b, i) => {
        if (b.offsetWidth > 0) widthsRef.current[i] = b.offsetWidth;
      });
      // Names container is desktop-only; on mobile nothing to fit.
      if (el.clientWidth === 0 && getComputedStyle(el).display === 'none') return;
      const avail = wrap.clientWidth - (eyebrowRef.current?.offsetWidth ?? 0) - 2;
      const total = candidates.length;
      let used = 0;
      let n = 0;
      for (let i = 0; i < total; i++) {
        const w = widthsRef.current[i] ?? 160;
        // Reserve room for "+N" unless this is the last entry overall.
        const last = i === total - 1 && rows.length === total;
        if (used + w + (last ? 0 : 48) > avail) break;
        used += w;
        n++;
      }
      setFit((prev) => (prev.rows === rows && prev.visible === n ? prev : { rows, visible: n }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // candidates derives from rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  if (rows.length === 0) return null;

  const shown = candidates.slice(0, visible);
  const overflow = rows.length - shown.length;
  const yearLabel = formatYear(year);
  const counts = [
    started.length ? `${started.length} began` : null,
    ended.length ? `${ended.length} ended` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const eyebrow = `${yearLabel} · ${counts}`;

  return (
    <div
      // Mobile: 12 px in from both edges. Desktop: start past the legend
      // (the page measures it) and stop short of the Export button, or of
      // the open side panel.
      ref={wrapRef}
      className={`absolute z-30 pointer-events-none right-3 ${panelOpen ? 'sm:right-[484px]' : 'sm:right-[140px]'}`}
      style={{ bottom, left }}
    >
      <style>{`
        @keyframes ledger-fade { from { opacity: 0; } to { opacity: 1; } }
        .ledger-enter { animation: ledger-fade var(--dur-base, 180ms) var(--ease-out); }
        @media (prefers-reduced-motion: reduce) { .ledger-enter { animation: none; } }
      `}</style>
      <div
        key={year}
        data-avoid
        className="surface-chrome ledger-enter pointer-events-auto inline-flex items-center max-w-full"
        style={{ minHeight: 30 }}
        role="region"
        aria-label={`Conflicts beginning and ending in ${formatYear(year)}`}
      >
        {/* Eyebrow. On mobile it is the whole strip and opens the list. */}
        <button
          type="button"
          onClick={onShowAll}
          className="sm:hidden font-mono hover-tint inline-flex items-center h-[44px] px-3 whitespace-nowrap"
          style={{
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-text-2)',
            background: 'transparent',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
          }}
          aria-label={`${eyebrow} — open the conflict list`}
        >
          <span style={{ color: 'var(--amber)' }}>{yearLabel}</span>
          <span style={{ color: 'var(--ink-faint)' }}>&nbsp;·&nbsp;</span>
          {counts}
        </button>
        <span
          ref={eyebrowRef}
          className="hidden sm:inline-flex font-mono items-center px-3 whitespace-nowrap self-stretch"
          style={{
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--ink-text-2)',
            borderRight: '1px solid var(--rule)',
          }}
        >
          <span style={{ color: 'var(--amber)' }}>{yearLabel}</span>
          <span style={{ color: 'var(--ink-faint)' }}>&nbsp;·&nbsp;</span>
          {counts}
        </span>

        {/* Names — desktop only. Every candidate is in the DOM (hidden
            beyond `visible`) so the fit pass can measure them. */}
        <div ref={namesRef} className="hidden sm:flex items-stretch min-w-0 flex-1 overflow-hidden">
          {candidates.map(({ c, tag }, i) => (
            <button
              key={`${c.id}-${tag}`}
              data-ledger-name
              type="button"
              onClick={() => onConflictClick(c)}
              className="hover-tint items-baseline gap-1.5 px-2.5 transition-colors"
              style={{
                display: i < visible ? 'inline-flex' : 'none',
                flex: 'none',
                background: 'transparent',
                border: 'none',
                borderRight: '1px solid var(--rule)',
                borderRadius: 0,
                color: 'var(--ink-text)',
                cursor: 'pointer',
                maxWidth: 220,
              }}
              title={`${c.name} — ${tag} ${formatYear(year)}`}
            >
              <span
                className="font-display truncate"
                style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '-0.005em' }}
              >
                {c.name}
              </span>
              <span
                className="font-mono flex-shrink-0"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: tag === 'began' ? 'var(--ink-muted)' : 'var(--ink-faint)',
                }}
              >
                {tag}
              </span>
            </button>
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={onShowAll}
              className="hover-tint font-mono inline-flex items-center px-2.5 transition-colors"
              style={{
                fontSize: 11,
                letterSpacing: '0.04em',
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                color: 'var(--ink-text-2)',
                cursor: 'pointer',
              }}
              aria-label={`${overflow} more — open the conflict list`}
              title="Open the full list for this year"
            >
              +{overflow}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(YearLedger);
