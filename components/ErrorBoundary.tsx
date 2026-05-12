'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-wars-bg">
          <div className="max-w-md w-full bg-wars-panel border border-wars-border rounded-xl p-6 text-center">
            <div className="text-wars-red text-3xl mb-3" aria-hidden="true">
              ⚠
            </div>
            <h2 className="text-lg font-bold text-wars-text mb-2">Something went wrong</h2>
            <p className="text-sm text-wars-muted mb-4">
              The atlas hit a rendering error. The data file may be loading; try a hard refresh
              ({navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+R) — or report a bug if it
              persists.
            </p>
            {this.state.error && (
              <pre className="text-[10px] text-wars-muted/60 bg-wars-bg/60 border border-wars-border/40 rounded p-2 text-left overflow-x-auto mb-4">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.reset}
                className="px-4 py-2 bg-wars-accent/20 border border-wars-accent/40 rounded text-sm text-wars-accent hover:bg-wars-accent/30 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-wars-border/40 border border-wars-border rounded text-sm text-wars-muted hover:text-wars-text transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Inline fallback used by MapView when the Mapbox token is missing or
 * the data files fail to load. Keeps the rest of the UI usable.
 */
export function MapboxTokenFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-wars-bg p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-lg font-bold text-wars-text mb-2">Map unavailable</h2>
        <p className="text-sm text-wars-muted mb-3">
          The map needs a Mapbox access token to render. The token in this build is missing or
          expired.
        </p>
        <p className="text-xs text-wars-muted/70">
          If you&apos;re a developer running locally, copy <code className="font-mono px-1 bg-wars-bg/60 border border-wars-border/40 rounded">.env.local.example</code> to{' '}
          <code className="font-mono px-1 bg-wars-bg/60 border border-wars-border/40 rounded">.env.local</code> and add your Mapbox token, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
