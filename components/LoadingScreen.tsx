/**
 * Full-screen loading state shown until the conflict data and the map
 * style are ready. No byte progress is available, so there is no percent
 * bar — an indeterminate hairline sweep and the tagline, nothing that
 * pretends to know how far along it is.
 *
 * Also home to the shared <Wordmark /> (serif italic vermilion "War" +
 * upright ivory "Atlas"), so the loading, error, 404, permalink and prose
 * pages all set the name the same way the TopBar does.
 */

export function Wordmark({
  size = 22,
  as: Tag = 'span',
  className = '',
}: {
  size?: number;
  as?: 'span' | 'h1' | 'div';
  className?: string;
}) {
  return (
    <Tag
      className={`font-display ${className}`}
      style={{
        margin: 0,
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: 'var(--ink-text)',
      }}
    >
      <span style={{ fontStyle: 'italic', color: 'var(--vermilion)' }}>War</span>
      <span style={{ marginLeft: Math.round(size * 0.18) }}>Atlas</span>
    </Tag>
  );
}

export default function LoadingScreen() {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--ink-0)' }}
      role="status"
      aria-live="polite"
      aria-label="Loading the atlas"
    >
      <div className="text-center px-6" style={{ maxWidth: 360 }}>
        <Wordmark size={34} as="h1" />
        <p
          className="font-display italic m-0 mt-3"
          style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--ink-muted)' }}
        >
          An interactive cartography of thousands of named wars across human history
        </p>

        {/* Indeterminate hairline sweep — a short ivory segment travels
            along a faint rule. Static under prefers-reduced-motion. */}
        <div
          className="relative mx-auto mt-6 overflow-hidden"
          style={{ width: 160, height: 1, background: 'var(--rule)' }}
          aria-hidden
        >
          <div
            className="loading-sweep absolute inset-y-0 left-0"
            style={{ width: '25%', background: 'var(--ink-text-2)' }}
          />
        </div>
        <p
          className="font-mono m-0 mt-3 uppercase"
          style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-faint)' }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
