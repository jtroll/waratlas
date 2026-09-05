'use client';

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { Conflict } from '@/lib/types';
import { isConflictActiveAt } from '@/lib/conflicts';
import { formatCompactRange, formatYear } from '@/lib/format';
import { useFocusTrap } from '@/lib/focus-trap';
import {
  searchAll,
  type CitySearchFeature,
  type EmpireSearchEntry,
} from '@/lib/search';

interface Props {
  open: boolean;
  onClose: () => void;
  conflicts: readonly Conflict[];
  empires: readonly EmpireSearchEntry[];
  cities: readonly CitySearchFeature[];
  currentYear: number;
  /** Seek (if needed), select and fly to the conflict. */
  onSelectConflict: (c: Conflict) => void;
  /** Select the empire via the `#empire=` path and fit its borders. */
  onSelectEmpire: (e: EmpireSearchEntry) => void;
  /** Fly to the city and open its name timeline (no seek). */
  onSelectCity: (c: CitySearchFeature) => void;
  /** Footer entry: open the year-scoped filter panel instead. */
  onOpenFilters?: () => void;
}

type Item =
  | { kind: 'conflict'; id: string; conflict: Conflict }
  | { kind: 'empire'; id: string; empire: EmpireSearchEntry }
  | { kind: 'city'; id: string; city: CitySearchFeature };

const GROUP_LABEL: Record<Item['kind'], string> = {
  conflict: 'Conflicts',
  empire: 'Empires',
  city: 'Cities',
};

/* ─────────────────────────────────────────────────────────────
 * COMMAND PALETTE — global search (⌘K / Ctrl-K, or `/`).
 *
 * One input; results grouped Conflicts / Empires / Cities (top 8 / 5 / 5
 * by score, then importance — lib/search.ts). Keyboard: ↑ ↓ move, ↵
 * opens, Esc closes. Each row: serif 14px name, mono 11px span, then the
 * belligerents (conflicts), "empire · 1206–1368", or the modern name and
 * founding year (cities). A conflict that is active in the current year
 * carries a moss "active" tag (the token reserved for exactly that).
 *
 * Desktop: a 560px sheet centred near the top over a scrim. Mobile: a
 * full-width sheet anchored to the top so the soft keyboard has room.
 * The dialog is aria-modal, which also tells the page's key dispatcher to
 * stand down while it is open.
 * ─────────────────────────────────────────────────────────── */
function CommandPalette({
  open,
  onClose,
  conflicts,
  empires,
  cities,
  currentYear,
  onSelectConflict,
  onSelectEmpire,
  onSelectCity,
  onOpenFilters,
}: Props) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, { initialFocus: inputRef });

  // Fresh query on every open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const results = useMemo(
    () => (open ? searchAll(deferredQuery, { conflicts, empires, cities }) : null),
    [open, deferredQuery, conflicts, empires, cities],
  );

  const items = useMemo<Item[]>(() => {
    if (!results) return [];
    return [
      ...results.conflicts.map((h) => ({ kind: 'conflict' as const, id: `c:${h.item.id}`, conflict: h.item })),
      ...results.empires.map((h) => ({
        kind: 'empire' as const,
        id: `e:${h.item.id ?? h.item.name}`,
        empire: h.item,
      })),
      ...results.cities.map((h) => ({
        kind: 'city' as const,
        id: `t:${h.item.properties.id ?? h.item.properties.name}:${h.item.geometry.coordinates.join(',')}`,
        city: h.item,
      })),
    ];
  }, [results]);

  // Keep the highlight on a real row as the list changes under it.
  useEffect(() => {
    setActive((a) => (items.length === 0 ? 0 : Math.min(a, items.length - 1)));
  }, [items]);

  // Scroll the highlighted row into view on keyboard moves.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = useCallback(
    (item: Item) => {
      onClose();
      if (item.kind === 'conflict') onSelectConflict(item.conflict);
      else if (item.kind === 'empire') onSelectEmpire(item.empire);
      else onSelectCity(item.city);
    },
    [onClose, onSelectConflict, onSelectEmpire, onSelectCity],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length) setActive((a) => (a + 1) % items.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length) setActive((a) => (a - 1 + items.length) % items.length);
      return;
    }
    if (e.key === 'Home' && items.length) {
      e.preventDefault();
      setActive(0);
      return;
    }
    if (e.key === 'End' && items.length) {
      e.preventDefault();
      setActive(items.length - 1);
      return;
    }
    if (e.key === 'Enter') {
      const item = items[active];
      if (item) {
        e.preventDefault();
        choose(item);
      }
    }
  };

  if (!open) return null;

  const trimmed = query.trim();
  const activeId = items[active]?.id;

  // Rows, with a group heading before the first row of each kind.
  const rows: React.ReactNode[] = [];
  let lastKind: Item['kind'] | null = null;
  items.forEach((item, index) => {
    if (item.kind !== lastKind) {
      lastKind = item.kind;
      rows.push(
        <div
          key={`h:${item.kind}`}
          role="presentation"
          className="eyebrow"
          style={{ padding: '10px 16px 4px', borderTop: rows.length ? '1px solid var(--rule)' : 'none' }}
        >
          {GROUP_LABEL[item.kind]}
        </div>,
      );
    }
    rows.push(
      <Row
        key={item.id}
        item={item}
        index={index}
        selected={index === active}
        currentYear={currentYear}
        onHover={() => setActive(index)}
        onChoose={() => choose(item)}
      />,
    );
  });

  return (
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      {/* Scrim — click to close. */}
      <div className="scrim absolute inset-0" onClick={onClose} aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search all years"
        className="surface-sheet absolute inset-x-0 top-0 sm:inset-x-auto sm:left-1/2 sm:top-[12vh] sm:-translate-x-1/2 sm:w-[560px] flex flex-col"
        style={{
          maxHeight: 'min(80dvh, 640px)',
          boxShadow: 'var(--shadow-pop)',
          borderTop: 'none',
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: '1px solid var(--rule-strong)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3" fill="none" />
            <path d="M9.2 9.2 L12.6 12.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search conflicts, empires and cities across all years…"
            className="font-ui flex-1 min-w-0 placeholder-wars-faint"
            style={{
              fontSize: 16,
              height: 52,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ink-text)',
            }}
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={activeId ? `palette-${activeId}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button
            type="button"
            onClick={onClose}
            className="sm:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-wars-muted hover:text-wars-text"
            style={{ background: 'transparent', border: 'none', borderRadius: 0, fontSize: 18, cursor: 'pointer' }}
            aria-label="Close search"
          >
            ×
          </button>
          <kbd
            className="hidden sm:inline-flex font-mono items-center h-5 px-1.5"
            style={{
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'var(--ink-muted)',
              border: '1px solid var(--rule)',
              borderRadius: 2,
            }}
            aria-hidden
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="palette-results"
          role="listbox"
          aria-label="Results"
          className="flex-1 overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          {items.length > 0 ? (
            rows
          ) : (
            <div className="font-display italic" style={{ padding: '18px 16px 20px', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-muted)' }}>
              {trimmed
                ? <>No conflicts, empires or cities match <span style={{ color: 'var(--ink-text-2)', fontStyle: 'normal' }}>“{trimmed}”</span>.</>
                : <>Type a war, a battle, an empire or a city — the atlas is searched across every year, and the timeline follows your choice.</>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-4 font-mono"
          style={{
            minHeight: 36,
            fontSize: 11,
            letterSpacing: '0.04em',
            color: 'var(--ink-muted)',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <span className="hidden sm:inline" aria-hidden>↑↓ move · ↵ open · esc close</span>
          <span className="sm:hidden" aria-hidden>All years</span>
          {onOpenFilters && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFilters();
              }}
              className="font-ui hover:text-wars-text transition-colors min-h-[44px] sm:min-h-0"
              style={{
                fontSize: 12,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                padding: 0,
                color: 'var(--ink-text-2)',
                cursor: 'pointer',
              }}
            >
              Filter this year →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  item,
  index,
  selected,
  currentYear,
  onHover,
  onChoose,
}: {
  item: Item;
  index: number;
  selected: boolean;
  currentYear: number;
  onHover: () => void;
  onChoose: () => void;
}) {
  let name: string;
  let span: string;
  let detail: React.ReactNode;
  let activeNow = false;

  if (item.kind === 'conflict') {
    const c = item.conflict;
    name = c.name;
    span = formatCompactRange(c.startYear, c.endYear);
    activeNow = isConflictActiveAt(c, Math.round(currentYear));
    const sides = (c.countries ?? []).slice(0, 3).join(' · ');
    detail = sides || (c.locations ?? []).slice(0, 2).join(' · ') || null;
  } else if (item.kind === 'empire') {
    const e = item.empire;
    name = e.name;
    span = formatCompactRange(e.startYear, e.endYear);
    detail = 'empire';
  } else {
    const p = item.city.properties;
    name = p.name;
    span = p.foundedYear != null ? `founded ${formatYear(p.foundedYear)}` : 'city';
    detail = p.modernName && p.modernName !== p.name ? `city · now ${p.modernName}` : 'city';
  }

  return (
    <div
      id={`palette-${item.id}`}
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseMove={onHover}
      onClick={onChoose}
      className="flex items-baseline gap-3 cursor-pointer"
      style={{
        padding: '8px 16px',
        minHeight: 44,
        background: selected ? 'var(--tint-ivory-2)' : 'transparent',
        color: 'var(--ink-text)',
        transition: 'background var(--dur-fast)',
      }}
    >
      <span
        className="font-display truncate"
        style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '-0.005em', minWidth: 0 }}
      >
        {name}
      </span>
      <span
        className="font-mono flex-shrink-0"
        style={{ fontSize: 11, letterSpacing: '0.02em', color: 'var(--ink-text-2)' }}
      >
        {span}
      </span>
      {detail && (
        <span
          className="font-ui truncate ml-auto text-right"
          style={{ fontSize: 12, color: 'var(--ink-muted)', minWidth: 0, maxWidth: '45%' }}
        >
          {detail}
        </span>
      )}
      {activeNow && (
        <span
          className="font-mono flex-shrink-0"
          style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--moss)' }}
          title={`Active in ${formatYear(currentYear)}`}
        >
          active
        </span>
      )}
    </div>
  );
}

export default memo(CommandPalette);
