'use client';

import { ActiveConflict, Conflict } from '@/lib/types';
import { formatYear, formatCasualties } from '@/lib/conflicts';

interface ConflictListPanelProps {
  conflicts: ActiveConflict[];
  currentYear: number;
  onConflictClick: (conflict: Conflict) => void;
  onClose: () => void;
  selectedId: string | null;
}

export default function ConflictListPanel({
  conflicts,
  currentYear,
  onConflictClick,
  onClose,
  selectedId,
}: ConflictListPanelProps) {
  const activeConflicts = conflicts.filter(c => c.isActive);

  return (
    <div
      // On mobile this is `inset-0` (full screen) — but inset-0 puts the
      // bottom flush with the screen edge, hidden by the MobileTabDock.
      // Override `bottom` to sit above the dock instead.
      className="sidebar-enter fixed sm:absolute inset-0 bottom-[calc(46px+env(safe-area-inset-bottom,0px))] sm:inset-auto sm:bottom-0 sm:top-0 sm:left-0 w-full sm:max-w-sm z-40 bg-wars-panel/98 backdrop-blur-md sm:border-r border-wars-border overflow-hidden flex flex-col"
      role="dialog"
      aria-label="Active conflicts list"
    >
      {/* Header — sticky at top of panel */}
      <div className="flex-shrink-0 border-b border-wars-border p-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-wars-text">
            Active Conflicts
          </h2>
          <p className="text-xs text-wars-muted mt-0.5">
            {formatYear(Math.round(currentYear))} · {activeConflicts.length} conflicts
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-wars-border/50 flex items-center justify-center hover:bg-wars-border transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {activeConflicts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3 opacity-40" aria-hidden="true">☮</div>
            <p className="text-sm text-wars-text font-medium mb-1">A relatively quiet moment</p>
            <p className="text-[11px] text-wars-muted leading-relaxed">
              No major conflicts mapped at this exact year. Either the world was at relative peace,
              or our records for this period are sparse — pre-modern war records are uneven.
            </p>
            <p className="text-[11px] text-wars-muted/70 mt-3">
              Try scrubbing the timeline by ±50 years to find nearby conflicts.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-wars-border/50">
            {activeConflicts.map((c) => (
              <button
                key={c.id}
                onClick={() => onConflictClick(c)}
                className={`w-full text-left px-4 py-3 hover:bg-wars-border/20 transition-colors ${
                  c.id === selectedId ? 'bg-wars-accent/10 border-l-2 border-l-wars-accent' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-1.5 flex-shrink-0">
                    <div
                      className="w-2 h-2 rounded-full bg-wars-red"
                      style={{ opacity: c.opacity }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-wars-text leading-tight">
                      {c.name}
                    </h3>
                    <p className="text-[11px] text-wars-muted mt-0.5">
                      {formatYear(c.startYear)}
                      {c.endYear && c.endYear !== c.startYear ? ` – ${formatYear(c.endYear)}` : ''}
                      {!c.endYear && c.startYear > 2000 ? ' – present' : ''}
                    </p>
                    <p className="text-[11px] text-wars-muted/70 mt-0.5 truncate">
                      {c.countries.slice(0, 4).join(' vs ')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-[10px] text-wars-muted/50">
                      {c.casualties ? formatCasualties(c.casualties) : ''}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
