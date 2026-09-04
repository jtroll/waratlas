'use client';

import { memo, useMemo, useRef } from 'react';
import { ActiveConflict, Conflict } from '@/lib/types';
import { formatYear, formatSpan, formatCasualties } from '@/lib/format';
import { useFocusTrap } from '@/lib/focus-trap';

interface ConflictListPanelProps {
  conflicts: ActiveConflict[];
  currentYear: number;
  onConflictClick: (conflict: Conflict) => void;
  onClose: () => void;
  selectedId: string | null;
}

/**
 * Left-hand list of the conflicts active in the current year. Rows carry
 * name · span · belligerents · casualties. The empty state is designed, not
 * a blank: a quiet year is a real state of the dataset and says so.
 */
function ConflictListPanel({
  conflicts,
  currentYear,
  onConflictClick,
  onClose,
  selectedId,
}: ConflictListPanelProps) {
  const activeConflicts = useMemo(() => conflicts.filter(c => c.isActive), [conflicts]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(panelRef, true);

  return (
    <div
      ref={panelRef}
      // On mobile this is `inset-0` (full screen) — but inset-0 puts the
      // bottom flush with the screen edge, hidden by the MobileTabDock.
      // Override `bottom` to sit above the dock instead.
      className="sidebar-enter surface-sheet border-0 sm:border-r fixed sm:absolute inset-0 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:inset-auto sm:bottom-0 sm:top-0 sm:left-0 w-full sm:max-w-sm z-40 overflow-hidden flex flex-col"
      role="dialog"
      aria-labelledby="conflict-list-title"
    >
      {/* Header — sticky at top of panel */}
      <div className="flex-shrink-0 hairline-b px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-mono text-wars-text-2 m-0 mb-1.5" style={{ letterSpacing: '0.04em' }}>
            {formatYear(Math.round(currentYear))}
            <span className="text-wars-faint mx-2" aria-hidden>·</span>
            {activeConflicts.length} active
          </p>
          <h2
            id="conflict-list-title"
            className="font-display text-display-m text-wars-text m-0"
            style={{ fontWeight: 400 }}
          >
            Active conflicts
          </h2>
        </div>
        <button type="button" onClick={onClose} className="icon-btn flex-shrink-0" aria-label="Close conflict list">
          <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
            <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {activeConflicts.length === 0 ? (
          <div className="px-6 py-10">
            <p className="eyebrow m-0 mb-3">A quiet year</p>
            <p
              className="font-display italic text-wars-text m-0"
              style={{ fontSize: 17, lineHeight: 1.35, textWrap: 'balance' as React.CSSProperties['textWrap'] }}
            >
              No conflict in the dataset is recorded as active in {formatYear(Math.round(currentYear))}.
            </p>
            <p className="font-display text-wars-text-2 m-0 mt-3" style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              Either the world was at relative peace, or the records for this period are thin —
              pre-modern war records are uneven, and filters narrow the set further.
            </p>
            <p
              className="font-mono text-mono text-wars-muted m-0 mt-5 pt-3"
              style={{ borderTop: '1px dashed var(--rule)' }}
            >
              Try ±50 years on the timeline, or clear the filters.
            </p>
          </div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {activeConflicts.map((c) => {
              const selected = c.id === selectedId;
              const belligerents = c.countries.slice(0, 4).join(' · ');
              return (
                <li key={c.id} className="hairline-b">
                  <button
                    type="button"
                    onClick={() => onConflictClick(c)}
                    aria-current={selected ? 'true' : undefined}
                    className="hover-tint w-full text-left px-5 py-3 transition-colors"
                    style={{
                      // Unselected rows leave background to .hover-tint.
                      background: selected ? 'color-mix(in oklch, var(--amber) 8%, transparent)' : undefined,
                      // Amber = selection; the left rule marks the open entry.
                      boxShadow: selected ? 'inset 2px 0 0 var(--amber)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-[7px] flex-shrink-0 w-1.5 h-1.5"
                        style={{ background: 'var(--vermilion)', opacity: c.opacity }}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            className="font-display text-wars-text"
                            style={{ fontSize: 14.5, lineHeight: 1.3, fontWeight: selected ? 500 : 400 }}
                          >
                            {c.name}
                          </span>
                          <span className="font-mono text-mono text-wars-faint flex-shrink-0 tabular-nums">
                            {c.casualties ? `${formatCasualties(c.casualties)} dead` : ''}
                          </span>
                        </div>
                        <div className="font-mono text-mono text-wars-muted mt-1">
                          {formatSpan(c.startYear, c.endYear)}
                        </div>
                        {belligerents && (
                          <div className="font-ui text-wars-text-2 mt-0.5 truncate" style={{ fontSize: 12 }}>
                            {belligerents}
                            {c.countries.length > 4 && (
                              <span className="text-wars-faint"> +{c.countries.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(ConflictListPanel);
