'use client';

import { memo, useState } from 'react';
import type { Conflict } from '@/lib/types';
import { downloadConflictsCSV, downloadConflictsGeoJSON } from '@/lib/export';
import BorderLegend from './BorderLegend';

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

/** Structural "nothing is filtering" check. The object identity check the
 *  page used to make (`filters === DEFAULT_FILTERS`) fails as soon as any
 *  field has been edited and reset by hand. */
export function isDefaultFilters(f: ConflictFilters): boolean {
  return (
    f.minImportance <= DEFAULT_FILTERS.minImportance &&
    f.region === DEFAULT_FILTERS.region &&
    f.search.trim() === '' &&
    f.minDurationYears <= DEFAULT_FILTERS.minDurationYears
  );
}

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
  /** Controlled open state (the mobile dock's Search tab opens the sheet).
   *  Omit both to let the panel manage its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Conflicts + year for the mobile sheet's Export row (the desktop
   *  ExportMenu is a separate control). */
  exportConflicts?: Conflict[];
  currentYear?: number;
  /** Open the command palette (global, all-years search). The panel's own
   *  search box only filters the conflicts active this year; this renders
   *  the hand-off hint / button. */
  onOpenSearch?: () => void;
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

const IMPORTANCE_LABEL: Record<number, string> = {
  1: 'Minor', 2: 'Regional', 3: 'Significant', 4: 'Major', 5: 'World-changing',
};

/** Five lightness steps of vermilion (hue 28). Neighbouring steps differ by
 *  ≥ 1.4:1 in luminance so the ramp reads without relying on hue. */
const IMPORTANCE_RAMP: Record<number, string> = {
  1: 'oklch(0.34 0.17 28)',
  2: 'oklch(0.45 0.17 28)',
  3: 'oklch(0.56 0.17 28)',
  4: 'oklch(0.68 0.17 28)',
  5: 'oklch(0.80 0.14 28)',
};

const FIELD_BG = 'oklch(0.16 0.012 250 / 0.6)';

// Chevron for the restyled native <select> (ink-muted stroke).
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2396928a' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")";

const fieldStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 8px',
  minHeight: 32,
  background: FIELD_BG,
  border: '1px solid var(--rule)',
  borderRadius: 0,
  color: 'var(--ink-text)',
};

/**
 * Filter panel — collapsible panel below the TopBar on desktop; a bottom
 * sheet on mobile (opened from the dock's Search tab) that also carries the
 * border legend and the export row, which have no other home on phones.
 */
function FilterPanel({
  filters,
  onChange,
  totalActive,
  filteredCount,
  matches = [],
  selectedConflict = null,
  onSelectMatch,
  open: openProp,
  onOpenChange,
  exportConflicts,
  currentYear = 0,
  onOpenSearch,
}: Props) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
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

  const navBtn: React.CSSProperties = {
    background: FIELD_BG,
    border: '1px solid var(--rule)',
    borderRadius: 0,
  };

  return (
    <div
      data-avoid
      // Mobile: anchor in the TopBar's right area, inline with the LIVE
      // button (44px tap targets, 8px from the top). Desktop: below the
      // TopBar with the full "Filter" pill + active count. This root is a
      // stacking context, so while the mobile sheet is open it is raised
      // above the Timeline (z-30) and the map chrome; the dock (z-30) is
      // left uncovered by the scrim.
      className={`absolute top-2 right-[100px] sm:top-[62px] sm:right-[74px] ${open ? 'z-50' : 'z-30'} sm:z-20 pointer-events-auto`}
      style={{ width: 'auto' }}
    >
      {/* Range-input styling can't be done inline (pseudo-elements). */}
      <style>{`
        .fp-range { -webkit-appearance: none; appearance: none; width: 100%; height: 24px; background: transparent; margin: 0; }
        .fp-range::-webkit-slider-runnable-track { height: 2px; background: var(--rule-strong); }
        .fp-range::-moz-range-track { height: 2px; background: var(--rule-strong); }
        .fp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; margin-top: -6px; background: var(--ink-text); border: 1px solid var(--ink-0); border-radius: 0; cursor: pointer; }
        .fp-range::-moz-range-thumb { width: 14px; height: 14px; background: var(--ink-text); border: 1px solid var(--ink-0); border-radius: 0; cursor: pointer; }
        .fp-range:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
        .fp-select:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
        .fp-select option { background: oklch(0.20 0.014 250); color: oklch(0.94 0.012 85); }
      `}</style>

      <button
        onClick={() => setOpen(!open)}
        className="font-ui inline-flex items-center transition-colors h-11 sm:h-8"
        style={{
          fontSize: 11,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderRadius: 0,
          background: isFiltering
            ? 'oklch(0.78 0.14 78 / 0.10)'
            : open
              ? 'color-mix(in oklch, var(--ink-text) 10%, transparent)'
              : 'var(--surface-chrome, oklch(0.20 0.014 250 / 0.85))',
          border: `1px solid ${
            isFiltering
              ? 'var(--amber)'
              : open
                ? 'color-mix(in oklch, var(--ink-text) 45%, transparent)'
                : 'var(--rule-strong)'
          }`,
          color: isFiltering ? 'var(--amber)' : open ? 'var(--ink-text)' : 'var(--ink-text-2)',
          backdropFilter: 'blur(var(--blur-chrome, 8px))',
          WebkitBackdropFilter: 'blur(var(--blur-chrome, 8px))',
          cursor: 'pointer',
        }}
        aria-expanded={open}
        aria-pressed={open}
        aria-label={open ? 'Close filters' : 'Open filters'}
        title="Filters"
      >
        {/* Icon-only on mobile (44×44). Desktop shows full pill with text + counts. */}
        <span
          className="inline-flex items-center justify-center sm:hidden h-full"
          style={{ width: 42 }}
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
              style={{ fontSize: 11, letterSpacing: '0.02em' }}
            >
              {filteredCount}/{totalActive}
            </span>
          )}
        </span>
      </button>

      {open && (
        <>
          {/* Mobile scrim — tap outside the sheet to close. */}
          <div
            className="sm:hidden fixed inset-x-0 top-0 z-30"
            style={{
              bottom: 'calc(46px + env(safe-area-inset-bottom, 0px))',
              background: 'oklch(0.10 0.012 250 / 0.5)',
            }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            // Mobile: bottom sheet above the tab dock. Desktop: flows
            // directly below the pill.
            className="fixed inset-x-0 z-40 overflow-y-auto sm:overflow-visible sm:static sm:z-auto sm:mt-1 sm:w-[244px] sm:max-h-none"
            style={{
              bottom: 'calc(46px + env(safe-area-inset-bottom, 0px))',
              maxHeight: 'min(72dvh, 560px)',
              background: 'var(--surface-sheet, oklch(0.20 0.014 250 / 0.97))',
              backdropFilter: 'blur(var(--blur-panel, 18px))',
              WebkitBackdropFilter: 'blur(var(--blur-panel, 18px))',
              border: '1px solid var(--rule-strong)',
              padding: 14,
            }}
            role="dialog"
            aria-label="Filters"
          >
            {/* Sheet header (mobile only) */}
            <div className="sm:hidden flex items-center justify-between mb-3">
              <div className="eyebrow" style={{ fontSize: 11 }}>
                Filters{isFiltering ? ` · ${filteredCount}/${totalActive} conflicts` : ''}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-11 h-11 -mr-2 -mt-2 text-wars-muted hover:text-wars-text"
                style={{ background: 'transparent', border: 'none', borderRadius: 0, fontSize: 18, cursor: 'pointer' }}
                aria-label="Close filters"
              >
                ×
              </button>
            </div>

            {/* Search — scoped to the conflicts active THIS year. The global
                palette (⌘K / `/`) searches every year; the hint under the
                box points there. */}
            <div className="mb-3">
              <label htmlFor="filter-search" className="eyebrow block mb-1.5">Filter this year</label>
              <input
                id="filter-search"
                type="text"
                value={filters.search}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                placeholder="name, country, description…"
                className="w-full font-ui placeholder-wars-faint"
                style={fieldStyle}
                aria-describedby="filter-search-hint"
              />
              {onOpenSearch ? (
                <button
                  id="filter-search-hint"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenSearch();
                  }}
                  className="font-ui mt-1.5 text-left w-full text-wars-muted hover:text-wars-text transition-colors min-h-[44px] sm:min-h-0"
                  style={{
                    fontSize: 12,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span className="hidden sm:inline">
                    Press <kbd className="font-mono" style={{ fontSize: 11, color: 'var(--ink-text-2)' }}>/</kbd> to search all years
                  </span>
                  <span className="sm:hidden">Search all years →</span>
                </button>
              ) : (
                <div
                  id="filter-search-hint"
                  className="font-ui mt-1.5 text-wars-muted"
                  style={{ fontSize: 12 }}
                >
                  Only the conflicts active this year are filtered.
                </div>
              )}
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
                    className="inline-flex items-center justify-center transition-colors hover:text-wars-text disabled:opacity-30 disabled:cursor-default w-11 h-11 sm:w-8 sm:h-6"
                    style={{ ...navBtn, cursor: matches.length < 2 ? 'default' : 'pointer' }}
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
                    style={{ fontSize: 11, letterSpacing: '0.04em' }}
                    aria-live="polite"
                  >
                    {currentIdx >= 0 ? `${currentIdx + 1} of ${matches.length}` : `${matches.length} match${matches.length === 1 ? '' : 'es'}`}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={matches.length < 2 && currentIdx >= 0}
                    className="inline-flex items-center justify-center transition-colors hover:text-wars-text disabled:opacity-30 disabled:cursor-default w-11 h-11 sm:w-8 sm:h-6"
                    style={{ ...navBtn, cursor: matches.length < 2 && currentIdx >= 0 ? 'default' : 'pointer' }}
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
              <label htmlFor="filter-region" className="eyebrow block mb-1.5">Region</label>
              <select
                id="filter-region"
                value={filters.region}
                onChange={(e) =>
                  onChange({ ...filters, region: e.target.value as ConflictFilters['region'] })
                }
                className="fp-select w-full font-ui"
                style={{
                  ...fieldStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  paddingRight: 28,
                  backgroundImage: CHEVRON,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  cursor: 'pointer',
                }}
              >
                {REGIONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Importance — five stepped swatches on a lightness ramp, each
                labelled; the current minimum carries an ivory outline. */}
            <div className="mb-3">
              <div id="filter-importance-label" className="eyebrow block mb-1.5">
                Min importance · {IMPORTANCE_LABEL[filters.minImportance]}
              </div>
              <div className="flex gap-1" role="group" aria-labelledby="filter-importance-label">
                {[1, 2, 3, 4, 5].map((step) => {
                  const active = step >= filters.minImportance;
                  const current = filters.minImportance === step;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => onChange({ ...filters, minImportance: step })}
                      aria-pressed={current}
                      aria-label={`${IMPORTANCE_LABEL[step]} (${step} of 5)`}
                      className="flex-1 flex flex-col items-center justify-end gap-1 transition-colors min-h-[44px] sm:min-h-[30px]"
                      style={{
                        padding: '3px 2px',
                        background: 'transparent',
                        border: `1px solid ${current ? 'var(--ink-text)' : 'transparent'}`,
                        borderRadius: 0,
                        cursor: 'pointer',
                      }}
                      title={IMPORTANCE_LABEL[step]}
                    >
                      <span
                        aria-hidden
                        className="block w-full"
                        style={{
                          height: 10,
                          background: active ? IMPORTANCE_RAMP[step] : FIELD_BG,
                          border: `1px solid ${active ? 'transparent' : 'var(--rule)'}`,
                        }}
                      />
                      <span
                        className="font-mono tabular-nums"
                        style={{
                          fontSize: 11,
                          lineHeight: '13px',
                          color: active ? 'var(--ink-text-2)' : 'var(--ink-muted)',
                        }}
                      >
                        {step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Min duration */}
            <div className="mb-3">
              <label htmlFor="filter-duration" className="eyebrow block mb-1.5">
                Min duration ·{' '}
                {filters.minDurationYears === 0
                  ? 'any'
                  : `${filters.minDurationYears}y`}
              </label>
              <input
                id="filter-duration"
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
                className="fp-range"
                style={{ accentColor: 'var(--ink-text)' }}
              />
            </div>

            {isFiltering && (
              <button
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="font-ui w-full text-wars-muted hover:text-wars-text transition-colors mt-2 min-h-[44px] sm:min-h-0"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 0,
                  borderTop: '1px solid var(--rule)',
                  cursor: 'pointer',
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                Reset all filters
              </button>
            )}

            {/* Mobile-only: the legend and export have no other home on
                phones (BorderLegend and ExportMenu are desktop-only). */}
            <div className="sm:hidden mt-3 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
              <BorderLegend variant="inline" />
            </div>
            {exportConflicts && (
              <div className="sm:hidden mt-3 pt-3" style={{ borderTop: '1px solid var(--rule)' }}>
                <div className="eyebrow mb-1.5">
                  Export · {exportConflicts.length} conflicts
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => downloadConflictsCSV(exportConflicts, currentYear)}
                    className="font-ui flex-1 min-h-[44px] hover:text-wars-text transition-colors"
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: FIELD_BG,
                      border: '1px solid var(--rule)',
                      borderRadius: 0,
                      color: 'var(--ink-text-2)',
                      cursor: 'pointer',
                    }}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadConflictsGeoJSON(exportConflicts, currentYear)}
                    className="font-ui flex-1 min-h-[44px] hover:text-wars-text transition-colors"
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: FIELD_BG,
                      border: '1px solid var(--rule)',
                      borderRadius: 0,
                      color: 'var(--ink-text-2)',
                      cursor: 'pointer',
                    }}
                  >
                    GeoJSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(FilterPanel);
