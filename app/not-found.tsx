import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found · War Atlas',
  description: 'The page you are looking for is not in the atlas.',
};

/**
 * 404 page — also reached when a /c/[id] permalink references a conflict
 * that no longer exists in the dataset. We avoid hard-redirecting because
 * a redirect to "/" with no explanation feels like a bug; instead, surface
 * the miss and offer a link back home.
 */
export default function NotFound() {
  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'var(--ink-0, #06090f)', color: 'var(--ink-text, #ece3d3)' }}
    >
      <div className="max-w-md w-full text-center">
        <div className="font-display italic mb-4" style={{ color: 'var(--vermilion, #c8553b)', fontSize: 28 }}>
          War <span style={{ fontStyle: 'normal' }}>Atlas</span>
        </div>
        <p
          className="font-mono mb-2"
          style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-muted, #9ca3af)', textTransform: 'uppercase' }}
        >
          Status · 404 · Not in the atlas
        </p>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 400, marginBottom: 12 }}>
          This page isn&apos;t in the dataset.
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-text-2, #d1d5db)', lineHeight: 1.6 }}>
          The conflict, year, or section you tried to reach isn&apos;t indexed.
          Conflict IDs change as the dataset is normalized; the home page is the
          easiest way back to a known-good state.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 transition-colors"
          style={{
            background: 'transparent',
            border: '1px solid var(--vermilion, #c8553b)',
            color: 'var(--vermilion, #c8553b)',
            fontSize: 11,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Back to the atlas
        </Link>
      </div>
    </main>
  );
}
