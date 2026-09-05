'use client';

/**
 * Persistent legend explaining what solid vs dashed empire borders mean —
 * the distinction encodes how historically accurate each polygon is and
 * must survive every restyle.
 *
 * 'floating' (default) pins the legend bottom-left of the map on desktop;
 * 'inline' renders the same content as a plain block (no positioning, no
 * surface, no blur) so the mobile filter sheet can embed it — the legend
 * has to exist on phones too.
 */
interface BorderLegendProps {
  variant?: 'floating' | 'inline';
}

export default function BorderLegend({ variant = 'floating' }: BorderLegendProps) {
  const inline = variant === 'inline';
  const Tag = inline ? 'div' : 'aside';
  return (
    <Tag
      className={
        inline
          ? 'block'
          : 'surface-panel absolute bottom-32 left-6 z-20 pointer-events-auto hidden md:block'
      }
      style={inline ? undefined : { width: 220, padding: '10px 14px 12px' }}
      role={inline ? 'group' : 'region'}
      aria-label="Empire border legend"
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
    </Tag>
  );
}
