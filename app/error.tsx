'use client';

import { useEffect } from 'react';
import { EditorialNotice, NoticeButton } from '@/components/ErrorBoundary';

/**
 * Next.js framework error boundary — catches errors that escape the
 * component-level <ErrorBoundary> in app/page.tsx (RSC fetch failures,
 * route-level throws, etc.). Uses the same EditorialNotice card as
 * ErrorBoundary so both failure paths look identical.
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
      style={{ background: 'var(--ink-0)', color: 'var(--ink-text)' }}
    >
      <EditorialNotice
        status="Status · Unexpected error"
        title="The atlas hit an unexpected error"
        detail={error.digest ? `digest: ${error.digest}` : null}
        role="alert"
        actions={
          <>
            <NoticeButton primary onClick={reset}>Try again</NoticeButton>
            <NoticeButton onClick={() => window.location.reload()}>Reload page</NoticeButton>
          </>
        }
      >
        The page failed to render. This usually clears with a reload — try
        that first. If it persists, let us know with the digest below.
      </EditorialNotice>
    </main>
  );
}
