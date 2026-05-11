'use client';

import { Conflict } from '@/lib/types';
import { formatYear, formatCasualties } from '@/lib/conflicts';

interface Props {
  conflict: Conflict;
  allConflicts: Conflict[];
  onConflictClick: (conflict: Conflict) => void;
}

/**
 * Shows a conflict's parent and child wars.
 * E.g. selecting WWII shows its 30+ children (Battle of Britain, Pacific, etc.).
 * Selecting Battle of Britain shows it's part of WWII.
 */
export default function ConflictGraph({ conflict, allConflicts, onConflictClick }: Props) {
  // Children: conflicts that have this conflict's id (or name) in their partOf
  const children = allConflicts.filter((c) =>
    (c.partOf ?? []).some((p) => p === conflict.id || p === conflict.name)
  );

  // Parents: conflicts whose id or name appears in this conflict's partOf
  const parentRefs = conflict.partOf ?? [];
  const parents = allConflicts.filter((c) =>
    parentRefs.some((p) => p === c.id || p === c.name)
  );

  // Siblings: other children of the same parent
  const siblings: Conflict[] = [];
  if (parents.length > 0) {
    const parent = parents[0];
    for (const c of allConflicts) {
      if (c.id === conflict.id) continue;
      if ((c.partOf ?? []).some((p) => p === parent.id || p === parent.name)) {
        siblings.push(c);
      }
    }
  }

  if (parents.length === 0 && children.length === 0) return null;

  return (
    <div className="space-y-3">
      {parents.length > 0 && (
        <Group label="Part of" items={parents} onClick={onConflictClick} />
      )}
      {children.length > 0 && (
        <Group
          label={`Includes ${children.length} sub-conflict${children.length === 1 ? '' : 's'}`}
          items={children.slice().sort((a, b) => a.startYear - b.startYear)}
          onClick={onConflictClick}
        />
      )}
      {siblings.length > 0 && parents.length > 0 && (
        <Group
          label={`Other parts of ${parents[0].name}`}
          items={siblings.slice(0, 6)}
          onClick={onConflictClick}
        />
      )}
    </div>
  );
}

function Group({
  label,
  items,
  onClick,
}: {
  label: string;
  items: Conflict[];
  onClick: (c: Conflict) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold text-wars-muted uppercase tracking-wider mb-2">
        {label}
      </h3>
      <div className="space-y-1">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onClick(c)}
            className="w-full text-left px-3 py-2 bg-wars-bg/40 hover:bg-wars-border/30 border border-wars-border/40 rounded text-[12px] transition-colors group"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-wars-text font-medium truncate group-hover:text-wars-accent">
                {c.name}
              </span>
              <span className="text-[10px] text-wars-muted/70 flex-shrink-0">
                {formatYear(c.startYear)}
                {c.endYear && c.endYear !== c.startYear ? `–${Math.abs(c.endYear) < 1000 ? c.endYear : (c.endYear % 100).toString().padStart(2,'0')}` : ''}
              </span>
            </div>
            {c.casualties != null && (
              <p className="text-[10px] text-wars-muted/70 mt-0.5">
                {formatCasualties(c.casualties)}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
