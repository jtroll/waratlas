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
      // Visible on every breakpoint — mobile readers also need the disclaimer
      // about Crimea / Taiwan / Kashmir / etc., which are far more politically
      // charged than a UI nicety. On mobile we lift it above the timeline + tab
      // dock so it doesn't collide with playback controls.
      className="absolute right-3 sm:right-4 z-20 pointer-events-auto bottom-44 sm:bottom-32 max-w-[calc(100vw-1.5rem)] sm:max-w-xs"
      role="region"
      aria-label="Disputed territory note"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left bg-wars-panel/85 backdrop-blur-sm border border-wars-border/70 rounded-md px-3 py-2 text-[11px] text-wars-muted hover:text-wars-text hover:border-wars-border transition-colors"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <span className="text-wars-accent" aria-hidden="true">ⓘ</span>
          <span>Notes on disputed borders</span>
          <span className="ml-auto opacity-60" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded && (
        <div className="mt-1 bg-wars-panel/95 backdrop-blur-sm border border-wars-border rounded-md px-3 py-2 text-[11px] text-wars-muted leading-relaxed max-h-72 overflow-y-auto">
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
