'use client';

import { useState } from 'react';

/**
 * Legend for every kind of line on the map.
 *
 * Two blocks. The first explains solid vs dashed empire borders — that
 * distinction encodes how historically accurate each polygon is and must
 * survive every restyle. The second appears from 1900, when the basemap's
 * modern boundary lines start carrying political stances, and holds the
 * contested-territory disclaimer. The disclaimer used to be a separate
 * floating (i) chip stacked directly above the Mapbox attribution (i),
 * which drew the identical glyph 16 px away; border caveats belong with
 * the border key, not in a second icon that looks like attribution.
 *
 * 'floating' (default) pins the legend bottom-left of the map on desktop;
 * 'inline' renders the same content as a plain block (no positioning, no
 * surface, no blur) so the mobile filter sheet can embed it — the legend
 * has to exist on phones too.
 */

const DISPUTED_REGIONS = [
  { name: 'Crimea', note: 'Shown as Ukrainian; Russia has occupied since 2014.' },
  { name: 'Taiwan', note: 'Shown as separate from China; the PRC claims it.' },
  {
    name: 'Israel / Palestine',
    note: 'The West Bank, Gaza, Golan and East Jerusalem follow Mapbox’s conventions; their status remains contested.',
  },
  {
    name: 'Kashmir',
    note: 'India, Pakistan and China all claim portions; the de-facto Line of Control is approximated.',
  },
  { name: 'Tibet', note: 'Shown within China per international recognition; many Tibetans dispute this.' },
  {
    name: 'Western Sahara',
    note: 'Largely controlled by Morocco; sovereignty contested by the Sahrawi (Polisario).',
  },
  { name: 'Northern Cyprus', note: 'De-facto independent, recognized only by Turkey.' },
  { name: 'Somaliland', note: 'De-facto independent since 1991; not internationally recognized.' },
  {
    name: 'Abkhazia / S. Ossetia / Transnistria',
    note: 'De-facto separate from Georgia and Moldova respectively.',
  },
];

interface BorderLegendProps {
  variant?: 'floating' | 'inline';
  /** Current year. The modern-borders block appears from 1900. */
  year?: number;
}

export default function BorderLegend({ variant = 'floating', year = 0 }: BorderLegendProps) {
  const inline = variant === 'inline';
  const [expanded, setExpanded] = useState(false);
  const showModern = year >= 1900;
  const Tag = inline ? 'div' : 'aside';

  return (
    <Tag
      className={
        inline
          ? 'block'
          : 'surface-panel absolute bottom-32 left-6 z-20 pointer-events-auto hidden md:block'
      }
      style={
        inline
          ? undefined
          : {
              // Widen while the contested list is open so the prose has a
              // readable measure; the panel is bottom-anchored, so it grows
              // upward and rightward without moving.
              width: expanded && showModern ? 300 : 220,
              padding: '10px 14px 12px',
              transition: 'width var(--dur-base, 180ms) var(--ease-out)',
            }
      }
      role={inline ? 'group' : 'region'}
      aria-label="Map legend"
    >
      <p className="eyebrow m-0 mb-2">Empire borders</p>

      <div className="flex items-center gap-2.5 mb-1.5">
        <svg width="22" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="22" y2="3" stroke="var(--ink-text-2)" strokeWidth="1.5" />
        </svg>
        <span className="font-ui text-wars-text-2" style={{ fontSize: 12 }}>Reconstructed</span>
      </div>

      <div className="flex items-center gap-2.5 mb-2">
        <svg width="22" height="6" aria-hidden="true">
          <line
            x1="0"
            y1="3"
            x2="22"
            y2="3"
            stroke="var(--uncertain)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
        </svg>
        <span className="font-ui text-wars-text-2" style={{ fontSize: 12 }}>Approximate</span>
      </div>

      <p
        className="font-display italic text-wars-muted"
        style={{
          fontSize: 11.5,
          lineHeight: 1.45,
          margin: '6px 0 0',
          paddingTop: 6,
          borderTop: '1px solid var(--rule)',
        }}
      >
        Dashed lines mark empires whose extent we can date but whose borders are
        contested in the literature.
      </p>

      {showModern && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--rule)' }}>
          <p className="eyebrow m-0 mb-1.5">Modern borders</p>
          <p
            className="font-ui text-wars-muted m-0"
            style={{ fontSize: 11.5, lineHeight: 1.45 }}
          >
            Drawn from Mapbox&apos;s boundary data (default worldview). The
            designations are not endorsements.
          </p>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="font-ui hover:text-wars-text transition-colors inline-flex items-center gap-1.5"
            style={{
              fontSize: 12,
              marginTop: 6,
              padding: '2px 0',
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-text-2)',
              cursor: 'pointer',
            }}
            aria-expanded={expanded}
            aria-controls="legend-disputed-list"
          >
            <svg
              width="7"
              height="9"
              viewBox="0 0 7 9"
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: 'transform var(--dur-fast, 120ms) var(--ease-out)',
              }}
            >
              <path
                d="M1.5 1 L5 4.5 L1.5 8"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {DISPUTED_REGIONS.length} contested territories
          </button>

          {expanded && (
            <ul
              id="legend-disputed-list"
              className="font-display text-wars-text-2 m-0 p-0 list-none"
              style={{
                fontSize: 12,
                lineHeight: 1.45,
                marginTop: 6,
                // Bounded so the expanded legend can never run up into the
                // era card or the masthead on short viewports; the full list
                // also lives on /sources.
                maxHeight: inline ? undefined : 'min(170px, calc(100dvh - 500px))',
                overflowY: inline ? undefined : 'auto',
              }}
            >
              {DISPUTED_REGIONS.map((r) => (
                <li key={r.name} style={{ marginBottom: 6 }}>
                  <strong className="text-wars-text" style={{ fontWeight: 500 }}>
                    {r.name}:
                  </strong>{' '}
                  {r.note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Tag>
  );
}
