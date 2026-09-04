import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/LoadingScreen';

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
      style={{ background: 'var(--ink-0)', color: 'var(--ink-text)' }}
    >
      <div
        className="max-w-md w-full p-6 sm:p-7"
        style={{ background: 'var(--ink-1)', border: '1px solid var(--rule-strong)' }}
      >
        <Wordmark size={24} />
        <p
          className="font-mono uppercase m-0 mt-4"
          style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-muted)' }}
        >
          Status · 404 · Not in the atlas
        </p>
        <h1
          className="font-display m-0 mt-1.5"
          style={{ fontSize: 22, lineHeight: 1.2, fontWeight: 400, letterSpacing: '-0.012em' }}
        >
          This page isn&apos;t in the dataset.
        </h1>
        <p
          className="font-display m-0 mt-3"
          style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-text-2)' }}
        >
          The conflict, year, or section you tried to reach isn&apos;t indexed.
          Conflict IDs change as the dataset is normalized; the home page is the
          easiest way back to a known-good state.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="font-ui inline-flex items-center uppercase transition-colors"
            style={{
              height: 40,
              padding: '0 16px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              background: 'var(--ink-text)',
              color: 'var(--ink-0)',
              border: '1px solid var(--ink-text)',
            }}
          >
            Back to the atlas
          </Link>
        </div>
      </div>
    </main>
  );
}
