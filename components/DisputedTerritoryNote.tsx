'use client';

import { useState } from 'react';

/**
 * Disclaimer about contested borders. Shown only in modern eras (>= 1900) where
 * the basemap's modern boundary lines (Mapbox boundary data) carry implicit
 * political stances on disputed territories. Dismissible per-session.
 */

const DISPUTED_REGIONS = [
  { name: 'Crimea', note: 'Shown as Ukrainian per Mapbox\u2019s boundary data; Russia has occupied since 2014.' },
  { name: 'Taiwan', note: 'Shown as separate from China; the PRC claims it.' },
  { name: 'Israel / Palestine', note: 'West Bank, Gaza, Golan, and East Jerusalem are shown per Mapbox\u2019s boundary conventions; status remains contested.' },
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

  // Editorial chrome — matches the Mapbox zoom +/- group and the
  // ExportMenu button below. Square corners, hairline border, dark
  // glass surface. Desktop: 32x32 icon-only square sitting directly
  // above the Export button at right:24px. Mobile: 44x44 touch target.
  const chromeSurface: React.CSSProperties = {
    background: 'oklch(0.20 0.014 250 / 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid var(--rule-strong)',
  };

  return (
    <div
      // z-30 raises this above InfoBoxLayer (z-20) so the disputed-borders
      // disclaimer never gets covered by a conflict callout. Stacks above
      // the Mapbox attribution (i) chip, which globals.css pins at
      // bottom:176px (desktop) / calc(170px + safe-area) (mobile) with a
      // 24px-tall button — so its top edge is at 200 / 194px. This chip
      // sits 16px above that (216 / 210px) so the two never overlap.
      className="absolute right-3 sm:right-6 z-30 pointer-events-auto bottom-[calc(210px+env(safe-area-inset-bottom,0px))] sm:bottom-[216px]"
      role="region"
      aria-label="Disputed territory note"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        // Mobile: rounded 44x44 touch target (legacy). Desktop: 32x32
        // square icon-only chip matching the editorial chrome of the
        // Export button (dark glass, hairline border, muted-gray glyph).
        // SVG icon used instead of the unicode ⓘ glyph because that
        // character renders as a heavy filled circle in most font stacks
        // and reads as black against the dark surface even when tinted.
        className="rounded-md sm:rounded-none text-wars-muted hover:text-wars-text transition-colors flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8"
        style={chromeSurface}
        aria-expanded={expanded}
        aria-label="Notes on disputed borders"
        title="Notes on disputed borders"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          style={{ color: 'var(--ink-text-2)' }}
        >
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <circle cx="7" cy="4" r="0.7" fill="currentColor" />
          <line x1="7" y1="6.4" x2="7" y2="10.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      {expanded && (
        <div
          // Anchored to the right edge of the button, opening upward so the
          // note doesn't collide with the Export button below. 320px wide,
          // capped to viewport on small screens.
          className="absolute right-0 bottom-full mb-1 px-3 py-2 text-[11px] text-wars-muted leading-relaxed max-h-72 overflow-y-auto"
          style={{
            ...chromeSurface,
            background: 'oklch(0.20 0.014 250 / 0.95)',
            width: 320,
            maxWidth: 'calc(100vw - 1.5rem)',
          }}
        >
          <div
            className="eyebrow pb-1.5 mb-2"
            style={{ borderBottom: '1px solid var(--rule)' }}
          >
            Notes on disputed borders
          </div>
          <p className="text-wars-text/90 mb-2">
            Modern borders come from Mapbox&apos;s boundary data (default worldview), which
            approximates internationally recognized borders. These designations are not
            endorsements:
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
