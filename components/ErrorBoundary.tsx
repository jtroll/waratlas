'use client';

import React, { Component, ReactNode } from 'react';
import { Wordmark } from './LoadingScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/* ─────────────────────────────────────────────────────────────
 * Editorial notice card shared by every failure path: wordmark, a mono
 * status line, serif heading, body, optional mono detail, and a button
 * row (primary = ivory fill / ink text, secondary = hairline).
 * app/error.tsx and app/not-found.tsx mirror this treatment.
 * ─────────────────────────────────────────────────────────── */

export function NoticeButton({
  primary,
  onClick,
  children,
}: {
  primary?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-ui uppercase transition-colors ${primary ? '' : 'hover-tint'}`}
      style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.04em',
        height: 40,
        padding: '0 16px',
        cursor: 'pointer',
        background: primary ? 'var(--ink-text)' : 'transparent',
        color: primary ? 'var(--ink-0)' : 'var(--ink-text-2)',
        border: primary ? '1px solid var(--ink-text)' : '1px solid var(--rule-strong)',
      }}
    >
      {children}
    </button>
  );
}

export function EditorialNotice({
  status,
  title,
  children,
  detail,
  actions,
  role,
}: {
  status: string;
  title: string;
  children: ReactNode;
  detail?: string | null;
  actions?: ReactNode;
  role?: 'alert';
}) {
  return (
    <div
      className="max-w-md w-full p-6 sm:p-7"
      role={role}
      style={{ background: 'var(--ink-1)', border: '1px solid var(--rule-strong)', color: 'var(--ink-text)' }}
    >
      <Wordmark size={24} />
      <p
        className="font-mono uppercase m-0 mt-4"
        style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-muted)' }}
      >
        {status}
      </p>
      <h2
        className="font-display m-0 mt-1.5"
        style={{ fontSize: 22, lineHeight: 1.2, fontWeight: 400, letterSpacing: '-0.012em' }}
      >
        {title}
      </h2>
      <div
        className="font-display m-0 mt-3"
        style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-text-2)' }}
      >
        {children}
      </div>
      {detail && (
        <pre
          className="font-mono text-left overflow-x-auto m-0 mt-4 px-3 py-2"
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'var(--ink-muted)',
            background: 'var(--ink-0)',
            border: '1px solid var(--rule)',
          }}
        >
          {detail}
        </pre>
      )}
      {actions && <div className="flex flex-wrap gap-2 mt-5">{actions}</div>}
    </div>
  );
}

function modifierKey(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
}

/**
 * App-level error boundary. Catches React render errors so the app shows
 * a graceful message instead of a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('War Atlas: render error', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--ink-0)' }}>
          <EditorialNotice
            status="Status · Render error"
            title="The atlas hit a rendering error"
            detail={this.state.error?.message}
            role="alert"
            actions={
              <>
                <NoticeButton primary onClick={this.reset}>Try again</NoticeButton>
                <NoticeButton onClick={() => window.location.reload()}>Reload page</NoticeButton>
              </>
            }
          >
            The data file may still be loading. Try again, or a hard refresh
            ({modifierKey()}+Shift+R) — and report a bug if it persists.
          </EditorialNotice>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Full-screen panel shown when conflicts.json fails to load (network error,
 * non-2xx, malformed JSON). Same treatment as the boundary fallback above,
 * with a Retry that re-runs the fetch instead of reloading the page.
 */
export function DataLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--ink-0)' }}>
      <EditorialNotice
        status="Status · Data unavailable"
        title="Couldn’t load the atlas data"
        detail={message}
        role="alert"
        actions={
          <>
            <NoticeButton primary onClick={onRetry}>Retry</NoticeButton>
            <NoticeButton onClick={() => window.location.reload()}>Reload page</NoticeButton>
          </>
        }
      >
        The conflict dataset failed to download. Check your connection and try again — if it
        keeps failing, the site may be mid-deploy.
      </EditorialNotice>
    </div>
  );
}

/**
 * Inline fallback used by MapView when the Mapbox token is missing or
 * the data files fail to load. Keeps the rest of the UI usable.
 */
export function MapboxTokenFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'var(--ink-0)' }}>
      <EditorialNotice status="Status · Map unavailable" title="The map needs a Mapbox token">
        <p className="m-0">
          The map needs a Mapbox access token to render. The token in this build is missing or
          expired. The timeline and conflict list still work.
        </p>
        <p className="m-0 mt-3" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
          If you&apos;re a developer running locally, copy <Code>.env.local.example</Code> to{' '}
          <Code>.env.local</Code>, add your Mapbox token, and restart the dev server.
        </p>
      </EditorialNotice>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="font-mono px-1"
      style={{ fontSize: '0.9em', background: 'var(--ink-0)', border: '1px solid var(--rule)', borderRadius: 2 }}
    >
      {children}
    </code>
  );
}
