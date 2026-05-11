'use client';

/**
 * Persistent legend explaining what solid vs dashed empire borders mean.
 * Sits in the bottom-left of the map, above the timeline.
 *
 * Editorial polish (step 6 of redesign): hairline borders, square corners,
 * eyebrow + serif italic explanatory note about why dashed exists.
 */
export default function BorderLegend() {
  return (
    <aside
      className="absolute bottom-32 left-6 z-20 pointer-events-auto hidden md:block"
      style={{
        width: 220,
        background: 'oklch(0.20 0.014 250 / 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--rule-strong)',
        padding: '10px 14px 12px',
      }}
      role="region"
      aria-label="Map legend"
    >
      <div className="eyebrow mb-2">Empire borders</div>

      <div className="flex items-center gap-2.5 mb-1.5">
        <svg width="22" height="6" aria-hidden="true">
          <line
            x1="0"
            y1="3"
            x2="22"
            y2="3"
            stroke="var(--ink-text-2)"
            strokeWidth="1.5"
          />
        </svg>
        <span className="font-ui text-meta text-wars-text-2">Reconstructed</span>
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
        <span className="font-ui text-meta text-wars-text-2">Approximate</span>
      </div>

      <p
        className="font-display italic text-wars-muted"
        style={{
          fontSize: 11,
          lineHeight: 1.45,
          margin: '6px 0 0',
          paddingTop: 6,
          borderTop: '1px solid var(--rule)',
        }}
      >
        Dashed lines mark empires whose extent we can date but whose borders are
        contested in the literature.
      </p>
    </aside>
  );
}
