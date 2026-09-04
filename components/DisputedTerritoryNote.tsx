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

  // Editorial chrome — .surface-chrome, matching the Mapbox zoom +/- group
  // and the ExportMenu button below. Desktop: 32x32 icon-only square
  // sitting directly above the Export button at right:24px. Mobile: 44x44
  // touch target. Open state is ivory-tinted, never amber.
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
        type="button"
        onClick={() => setExpanded(!expanded)}
        // 44x44 touch target on mobile, 32x32 square chip on desktop —
        // same square chrome as Export. SVG icon instead of the unicode ⓘ
        // glyph, which renders as a heavy filled circle in most font stacks.
        className={`surface-chrome hover-tint text-wars-muted transition-colors flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 ${expanded ? 'pressed-ivory' : ''}`}
        aria-expanded={expanded}
        aria-controls="disputed-note-body"
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
          className="surface-panel absolute right-0 bottom-full mb-1 px-3.5 py-3 max-h-72 overflow-y-auto"
          style={{ width: 320, maxWidth: 'calc(100vw - 1.5rem)' }}
          id="disputed-note-body"
        >
          <h3 className="eyebrow m-0 pb-1.5 mb-2" style={{ borderBottom: '1px solid var(--rule)' }}>
            Notes on disputed borders
          </h3>
          <p className="font-display text-wars-text-2 m-0 mb-2" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            Modern borders come from Mapbox&apos;s boundary data (default worldview), which
            approximates internationally recognized borders. These designations are not
            endorsements:
          </p>
          <ul className="font-display text-wars-text-2 m-0 p-0 list-none space-y-1.5" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {DISPUTED_REGIONS.map((r) => (
              <li key={r.name}>
                <strong className="text-wars-text" style={{ fontWeight: 500 }}>{r.name}:</strong> {r.note}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="font-ui mt-3 text-wars-muted hover:text-wars-text transition-colors"
            style={{ fontSize: 12, letterSpacing: '0.02em', background: 'transparent', border: 'none', padding: '4px 0', cursor: 'pointer', borderBottom: '1px solid var(--rule-strong)' }}
          >
            Dismiss for this session
          </button>
        </div>
      )}
    </div>
  );
}
