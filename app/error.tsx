'use client';

import { useEffect } from 'react';

/**
 * Next.js framework error boundary — catches errors that escape the
 * component-level <ErrorBoundary> in app/page.tsx (RSC fetch failures,
 * route-level throws, etc.). Visual style mirrors ErrorBoundary so the
 * brand is consistent across both error paths.
 *
 * Distinct from app/global-error.tsx: that one runs only when the root
 * layout itself throws. This handler covers everything inside the layout.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('War Atlas: route error', error);
  }, [error]);

  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'var(--ink-0, #06090f)', color: 'var(--ink-text, #ece3d3)' }}
    >
      <div
        className="max-w-md w-full p-6 text-center"
        style={{
          background: 'var(--ink-1, #111827)',
          border: '1px solid var(--rule-strong, #1f2937)',
        }}
      >
        <div className="font-display italic" style={{ color: 'var(--vermilion, #c8553b)', fontSize: 28, marginBottom: 12 }}>
          War <span style={{ fontStyle: 'normal' }}>Atlas</span>
        </div>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8 }}>
          The atlas hit an unexpected error
        </h2>
        <p className="text-sm" style={{ color: 'var(--ink-muted, #9ca3af)', marginBottom: 16 }}>
          The page failed to render. This usually clears with a reload — try
          that first. If it persists, let us know with the digest below.
        </p>
        {error.digest && (
          <pre
            className="font-mono text-[10px] mb-4 px-2 py-1 text-left overflow-x-auto"
            style={{
              color: 'var(--ink-muted, #9ca3af)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--rule, rgba(255,255,255,0.08))',
            }}
          >
            digest: {error.digest}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--vermilion, #c8553b)',
              color: 'var(--vermilion, #c8553b)',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid var(--rule-strong, #1f2937)',
              color: 'var(--ink-text-2, #d1d5db)',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    </main>
  );
}
