'use client';

import { useState } from 'react';
import type { Conflict } from '@/lib/types';

export interface ConflictFilters {
  /** Minimum importance 1-5; 1 means "show all". */
  minImportance: number;
  /** Region key — null means all. */
  region: 'all' | 'europe' | 'mena' | 'africa' | 'americas' | 'east-asia' | 'south-asia' | 'oceania';
  /** Free-text search applied to name/description/countries. */
  search: string;
  /** Show only conflicts with importance ≥ this AND duration ≥ years */
  minDurationYears: number;
}

export const DEFAULT_FILTERS: ConflictFilters = {
  minImportance: 1,
  region: 'all',
  search: '',
  minDurationYears: 0,
};

interface Props {
  filters: ConflictFilters;
  onChange: (f: ConflictFilters) => void;
  totalActive: number;
  filteredCount: number;
  /** Currently-active conflicts that pass the filter, in deterministic order
   * (the same order the map and list panel iterate). Used to power the
   * prev/next match navigator inside the open panel. */
  matches?: Conflict[];
  /** The currently selected conflict, if any — used to highlight which
   * match is "current" in the navigator and to anchor next/prev stepping. */
  selectedConflict?: Conflict | null;
  /** Called when the user clicks ◀ / ▶ in the match navigator. The page
   * handles the rest (panning the map, opening the sidebar). */
  onSelectMatch?: (c: Conflict) => void;
}

const REGIONS: { key: ConflictFilters['region']; label: string; bbox?: [number, number, number, number] }[] = [
  { key: 'all', label: 'All regions' },
  { key: 'europe', label: 'Europe', bbox: [-11, 35, 50, 72] },
  { key: 'mena', label: 'Middle East / N. Africa', bbox: [-15, 12, 60, 42] },
  { key: 'africa', label: 'Sub-Saharan Africa', bbox: [-18, -36, 52, 18] },
  { key: 'americas', label: 'Americas', bbox: [-170, -56, -34, 73] },
  { key: 'east-asia', label: 'East Asia', bbox: [95, 18, 150, 55] },
  { key: 'south-asia', label: 'South + SE Asia', bbox: [60, -10, 145, 35] },
  { key: 'oceania', label: 'Oceania / Pacific', bbox: [110, -50, 180, 0] },
];

export function regionBboxFor(region: ConflictFilters['region']): [number, number, number, number] | null {
  return REGIONS.find((r) => r.key === region)?.bbox ?? null;
}

/**
 * Filter panel — collapsible panel above the timeline. Applies live filters to
 * which conflicts are shown on the map and in the list panel.
 */
export default function FilterPanel({
  filters,
  onChange,
  totalActive,
  filteredCount,
  matches = [],
  selectedConflict = null,
  onSelectMatch,
}: Props) {
  const [open, setOpen] = useState(false);
  const isFiltering =
    filters.minImportance > 1 ||
    filters.region !== 'all' ||
    filters.search.length > 0 ||
    filters.minDurationYears > 0;

  // Match navigator state. Index of the selected conflict within the
  // current `matches` array, or -1 if the selection isn't (or no longer
  // is) part of the filtered set. We don't store our own index in state
  // — derive from `selectedConflict` so navigation stays in sync if the
  // selection changes elsewhere (sidebar close, conflict-dot click, etc).
  const currentIdx = selectedConflict
    ? matches.findIndex((m) => m.id === selectedConflict.id)
    : -1;
  const canNavigate = matches.length > 0 && !!onSelectMatch;
  // Where ◀ / ▶ should land. If nothing in the filtered set is selected
  // (currentIdx = -1), ◀ goes to the LAST and ▶ goes to the FIRST so the
  // user can always start stepping. Otherwise wrap around the array.
  const goPrev = () => {
    if (!canNavigate) return;
    const next = currentIdx <= 0 ? matches.length - 1 : currentIdx - 1;
    onSelectMatch!(matches[next]);
  };
  const goNext = () => {
    if (!canNavigate) return;
    const next = currentIdx < 0 || currentIdx >= matches.length - 1 ? 0 : currentIdx + 1;
    onSelectMatch!(matches[next]);
  };

  return (
    <div
      // Mobile: anchor in the TopBar's right area, inline with the LIVE
      // button. The mobile TopBar pads `py-2` (8px) so the filter button's
      // top edge needs to match — 8px from the top of the viewport — so it
      // optically sits in the same row as the ? and Live buttons (both also
      // 32px tall now).
      // Desktop: original placement below the TopBar with the full "Filter"
      // pill + active count.
      className="absolute top-2 right-[88px] sm:top-[62px] sm:right-[74px] z-30 sm:z-20 pointer-events-auto"
      style={{ width: 'auto' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="font-ui inline-flex items-center transition-colors h-8"
        style={{
          fontSize: 11,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: isFiltering
            ? 'oklch(0.78 0.14 78 / 0.10)'
            : 'oklch(0.20 0.014 250 / 0.85)',
          border: `1px solid ${isFiltering ? 'var(--amber)' : 'var(--rule-strong)'}`,
          color: isFiltering ? 'var(--amber)' : 'var(--ink-text-2)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          cursor: 'pointer',
        }}
        aria-expanded={open}
        aria-label={open ? 'Close filters' : 'Open filters'}
        title="Filters"
      >
        {/* Icon-only on mobile. Desktop shows full pill with text + counts.
            On mobile, the inner span fills the 32px h-8 button (border-box
            makes the outer footprint also 32px) so it lines up with the
            ?  and Live buttons in the same row. */}
        <span
          className="inline-flex items-center justify-center sm:hidden h-full"
          style={{ width: 30 }}
        >
          <svg width="13" height="13" viewBox="0 0 11 11" aria-hidden="true">
            <path
              d="M1 2 L10 2 M3 5.5 L8 5.5 M5 9 L6 9"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span
          className="hidden sm:inline-flex items-center justify-between gap-2 w-[244px] h-full px-3"
        >
          <span className="inline-flex items-center gap-2">
            <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
              <path
                d="M1 2 L10 2 M3 5.5 L8 5.5 M5 9 L6 9"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </svg>
            Filter
          </span>
          {isFiltering && (
            <span
              className="font-mono text-wars-muted"
              style={{ fontSize: 10, letterSpacing: '0.02em' }}
            >
              {filteredCount}/{totalActive}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          // On mobile the trigger is icon-only and pinned to the topbar
          // row, so the expanded panel pops out anchored to its RIGHT edge
          // (extending leftward) with a fixed width that fits a Pixel-class
          // viewport. On desktop the panel flows directly below the pill.
          className="absolute right-0 top-full mt-1 sm:relative sm:mt-1 w-[min(320px,calc(100vw-32px))] sm:w-[244px]"
          style={{
            background: 'oklch(0.20 0.014 250 / 0.95)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid var(--rule-strong)',
            padding: 14,
          }}
        >
          {/* Search */}
          <div className="mb-3">
            <label className="eyebrow block mb-1.5">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="name, country, description…"
              className="w-full font-ui text-wars-text placeholder-wars-faint"
              style={{
                fontSize: 12.5,
                padding: '5px 8px',
                background: 'oklch(0.16 0.012 250 / 0.6)',
                border: '1px solid var(--rule)',
                outline: 'none',
              }}
            />
            {/* Match navigator — appears once the filter narrows the set.
                ◀ N/M ▶ pattern: click prev/next to step through filtered
                matches on the map. Reads the index from selectedConflict so
                the position stays in sync with sidebar/map selections. */}
            {canNavigate && (
              <div
                className="flex items-center justify-between mt-2 font-ui"
                style={{ fontSize: 11, color: 'var(--ink-text-2)' }}
              >
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={matches.length < 2}
                  className="inline-flex items-center justify-center transition-colors hover:text-wars-text disabled:opacity-30 disabled:cursor-default"
                  style={{
                    width: 28,
                    height: 24,
                    background: 'oklch(0.16 0.012 250 / 0.6)',
                    border: '1px solid var(--rule)',
                    cursor: matches.length < 2 ? 'default' : 'pointer',
                  }}
                  aria-label="Previous match"
                  title="Previous match"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path
                      d="M6.5 1.5 L3 5 L6.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span
                  className="font-mono text-wars-muted"
                  style={{ fontSize: 10.5, letterSpacing: '0.04em' }}
                  aria-live="polite"
                >
                  {currentIdx >= 0 ? `${currentIdx + 1} of ${matches.length}` : `${matches.length} match${matches.length === 1 ? '' : 'es'}`}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={matches.length < 2 && currentIdx >= 0}
                  className="inline-flex items-center justify-center transition-colors hover:text-wars-text disabled:opacity-30 disabled:cursor-default"
                  style={{
                    width: 28,
                    height: 24,
                    background: 'oklch(0.16 0.012 250 / 0.6)',
                    border: '1px solid var(--rule)',
                    cursor: matches.length < 2 && currentIdx >= 0 ? 'default' : 'pointer',
                  }}
                  aria-label="Next match"
                  title="Next match"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path
                      d="M3.5 1.5 L7 5 L3.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Region */}
          <div className="mb-3">
            <label className="eyebrow block mb-1.5">Region</label>
            <select
              value={filters.region}
              onChange={(e) =>
                onChange({ ...filters, region: e.target.value as ConflictFilters['region'] })
              }
              className="w-full font-ui text-wars-text"
              style={{
                fontSize: 12.5,
                padding: '5px 8px',
                background: 'oklch(0.16 0.012 250 / 0.6)',
                border: '1px solid var(--rule)',
                outline: 'none',
              }}
            >
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Importance — 5 stepped bars instead of slider */}
          <div className="mb-3">
            <label className="eyebrow block mb-1.5">
              Min importance · {IMPORTANCE_LABEL[filters.minImportance]}
            </label>
            <div className="flex gap-1" role="group" aria-label="Minimum importance">
              {[1, 2, 3, 4, 5].map((step) => {
                const active = step <= filters.minImportance;
                return (
                  <button
                    key={step}
                    onClick={() => onChange({ ...filters, minImportance: step })}
                    aria-pressed={filters.minImportance === step}
                    className="flex-1 transition-colors"
                    style={{
                      height: 18,
                      background: active
                        ? step >= 4
                          ? 'var(--vermilion)'
                          : 'var(--vermilion-2)'
                        : 'oklch(0.16 0.012 250 / 0.6)',
                      border: '1px solid var(--rule)',
                      cursor: 'pointer',
                    }}
                    title={IMPORTANCE_LABEL[step]}
                  />
                );
              })}
            </div>
          </div>

          {/* Min duration */}
          <div className="mb-3">
            <label className="eyebrow block mb-1.5">
              Min duration ·{' '}
              {filters.minDurationYears === 0
                ? 'any'
                : `${filters.minDurationYears}y`}
            </label>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={filters.minDurationYears}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minDurationYears: parseInt(e.target.value, 10),
                })
              }
              className="w-full"
            />
          </div>

          {isFiltering && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="font-ui w-full text-wars-muted hover:text-wars-text transition-colors mt-2 pt-2"
              style={{
                fontSize: 11,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--rule)',
                cursor: 'pointer',
                paddingTop: 8,
              }}
            >
              Reset all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const IMPORTANCE_LABEL: Record<number, string> = {
  1: 'Minor', 2: 'Regional', 3: 'Significant', 4: 'Major', 5: 'World-changing',
};
