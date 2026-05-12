'use client';

import { useState } from 'react';

interface Props {
  /** Currently active tab. */
  active: 'map' | 'tour' | 'search' | 'cite';
  /** Callbacks when a tab is tapped. */
  onTour: () => void;
  onSearch: () => void;
  onCite: () => void;
  /** Map tab is the default — tapping it just dismisses any open panel. */
  onMap: () => void;
}

/**
 * Mobile tab dock (step 8 of redesign).
 *
 * 4-up bottom nav: Map / Tour / Search / Cite. Active tab gets a vermilion
 * top-border accent. Hidden on screens ≥ sm — desktop has its own chrome.
 *
 * Sits at the very bottom of the viewport above the timeline. The Sidebar's
 * bottom-sheet renders ABOVE this when open and pushes the dock out of the
 * way visually (z-stacked).
 */
export default function MobileTabDock({
  active,
  onTour,
  onSearch,
  onCite,
  onMap,
}: Props) {
  const tabs: Array<{ key: Props['active']; label: string; onClick: () => void }> = [
    { key: 'map',    label: 'Map',    onClick: onMap    },
    { key: 'tour',   label: 'Tour',   onClick: onTour   },
    { key: 'search', label: 'Search', onClick: onSearch },
    { key: 'cite',   label: 'Cite',   onClick: onCite   },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex"
      style={{
        background: 'oklch(0.16 0.012 250 / 0.96)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid var(--rule-strong)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
      aria-label="Primary"
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={t.onClick}
            className="flex-1 font-ui transition-colors"
            style={{
              padding: '10px 0 12px',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              borderTop: isActive
                ? '1px solid var(--vermilion)'
                : '1px solid transparent',
              color: isActive ? 'var(--ink-text)' : 'var(--ink-muted)',
              cursor: 'pointer',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Tiny hook to track which tab is "active" given the app's open-state. Used by
 * the page composer to compute the dock's `active` prop without lifting a lot
 * of new state.
 */
export function useMobileTab({
  tourOpen,
  filterOpen,
  sidebarOpen,
}: {
  tourOpen: boolean;
  filterOpen: boolean;
  sidebarOpen: boolean;
}): Props['active'] {
  if (tourOpen) return 'tour';
  if (filterOpen) return 'search';
  if (sidebarOpen) return 'cite';
  return 'map';
}

/**
 * Local fallback if the consumer doesn't track filter-open state separately.
 * Keeps the tab dock harmless to drop in.
 */
export function useDefaultTabState() {
  const [active, setActive] = useState<Props['active']>('map');
  return [active, setActive] as const;
}
