'use client';

import { useState } from 'react';

/**
 * Disclaimer about contested borders. Shown only in modern eras (>= 1900) where
 * Natural Earth's modern country shapes carry implicit political stances on
 * disputed territories. Dismissible per-session.
 */

const DISPUTED_REGIONS = [
  { name: 'Crimea', note: 'Shown as Ukrainian per Natural Earth; Russia has occupied since 2014.' },
  { name: 'Taiwan', note: 'Shown as separate from China; the PRC claims it.' },
  { name: 'Israel / Palestine', note: 'West Bank, Gaza, Golan, and East Jerusalem are shown per Natural Earth conventions; status remains contested.' },
  { name: 'Kashmir', note: 'India, Pakistan, and China all claim portions; the de-facto Line of Control is approximated.' },
  { name: 'Tibet', note: 'Shown within China per international recognition; many Tibetans dispute this.' },
  { name: 'Western Sahara', note: 'Largely controlled by Morocco; sovereignty contested by the Sahrawi (Polisario).' },
  { name: 'Northern Cyprus', note: 'De-facto independent state recognized only by Turkey.' },
  { name: 'Somaliland', note: 'De-facto independent since 1991; not internationally recognized.' },
  { name: 'Abkhazia / S. Ossetia / Transnistria', note: 'De-facto separate from Georgia and Moldova respectively.' },
];

export default function DisputedTerritoryNote({ year }: { year: number }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show in modern era when the borders matter
  if (year < 1900 || dismissed) return null;

  return (
    <div
      // z-30 raises this above InfoBoxLayer (z-20) so the disputed-borders
      // disclaimer never gets covered by a conflict callout. On mobile we
      // also push it further up to clear the timeline + tab dock.
      className="absolute right-3 sm:right-4 z-30 pointer-events-auto bottom-44 sm:bottom-32 sm:max-w-xs"
      style={
        // When expanded we want a wide panel; when collapsed (mobile) the
        // icon button takes its own intrinsic size.
        expanded ? { maxWidth: 'calc(100vw - 1.5rem)' } : undefined
      }
      role="region"
      aria-label="Disputed territory note"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        // Mobile (default): icon-only square button. sm:+ shows the full
        // "Notes on disputed borders" label inline.
        className="bg-wars-panel/85 backdrop-blur-xl border border-wars-border/70 rounded-md text-wars-muted hover:text-wars-text hover:border-wars-border transition-colors text-[11px] flex items-center gap-2 justify-center w-11 h-11 sm:w-auto sm:h-auto sm:px-3 sm:py-2 sm:justify-start sm:text-left sm:w-full"
        aria-expanded={expanded}
        aria-label="Notes on disputed borders"
        title="Notes on disputed borders"
      >
        <span className="text-wars-accent inline-flex items-center justify-center" aria-hidden="true" style={{ fontSize: 16 }}>
          ⓘ
        </span>
        <span className="hidden sm:inline">Notes on disputed borders</span>
        <span className="ml-auto opacity-60 hidden sm:inline" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="mt-1 bg-wars-panel/95 backdrop-blur-xl border border-wars-border rounded-md px-3 py-2 text-[11px] text-wars-muted leading-relaxed max-h-72 overflow-y-auto" style={{ maxWidth: 'calc(100vw - 1.5rem)', width: 320 }}>
          <p className="text-wars-text/90 mb-2">
            Modern country shapes follow Natural Earth conventions, which approximate
            internationally recognized borders. These designations are not endorsements:
          </p>
          <ul className="space-y-1.5">
            {DISPUTED_REGIONS.map((r) => (
              <li key={r.name}>
                <strong className="text-wars-text">{r.name}:</strong> {r.note}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setDismissed(true)}
            className="mt-3 text-[10px] text-wars-muted/70 hover:text-wars-text transition-colors"
          >
            Dismiss for this session
          </button>
        </div>
      )}
    </div>
  );
}
