import { Conflict, ActiveConflict } from './types';

/**
 * Get conflicts active at a given year.
 */
export function getActiveConflicts(
  currentYear: number,
  allConflicts: Conflict[]
): ActiveConflict[] {
  // Fade-in is quick; fade-out adapts so ended conflicts don't clutter the "Live" view
  const FADE_IN_YEARS = 2;
  const FADE_OUT_YEARS = 2;

  // Count how many conflicts are fully active — used to dim faded ones more aggressively
  let activeCount = 0;
  for (const c of allConflicts) {
    const end = c.endYear === null ? Infinity : c.endYear;
    if (currentYear >= c.startYear && currentYear <= end) activeCount++;
  }
  // When many conflicts are active, dim faded ones harder so active ones stand out
  const fadeDimming = activeCount > 10 ? 0.6 : activeCount > 5 ? 0.75 : 1;

  return allConflicts
    .map((c) => {
      const end = c.endYear === null ? Infinity : c.endYear;
      const isWithin = currentYear >= c.startYear && currentYear <= end;
      const isNearStart = currentYear >= c.startYear - FADE_IN_YEARS && currentYear < c.startYear;
      const isNearEnd = c.endYear !== null && currentYear > end && currentYear <= end + FADE_OUT_YEARS;

      let opacity = 0;
      if (isWithin) opacity = 1;
      else if (isNearStart) opacity = (currentYear - (c.startYear - FADE_IN_YEARS)) / FADE_IN_YEARS;
      else if (isNearEnd) {
        const raw = 1 - (currentYear - end) / FADE_OUT_YEARS;
        opacity = raw * fadeDimming; // dim faded conflicts when many are active
      }

      if (opacity <= 0.01) return null;

      // Active conflicts get a large priority boost so they always render on top
      const displayPriority =
        c.importance * 20 +
        (c.casualties ? Math.log10(c.casualties) : 0) +
        (isWithin ? 50 : 0);

      return {
        ...c,
        isActive: isWithin,
        opacity: Math.max(0, Math.min(1, opacity)),
        displayPriority,
      };
    })
    .filter((c): c is ActiveConflict => c !== null)
    .sort((a, b) => b.displayPriority - a.displayPriority);
}

/**
 * Compute auto-speed: fast through gaps, moderate during long conflicts,
 * slow when conflicts start/end (the interesting transitions).
 */
export function getAutoSpeed(currentYear: number, allConflicts: Conflict[]): number {
  const TRANSITION_SPEED = 8;    // years/sec at conflict start/end transitions
  const ACTIVE_SPEED = 20;       // years/sec during mid-conflict (base, reduced by density)
  const MAX_SPEED = 1200;        // years/sec through empty stretches
  const LOOKAHEAD = 8;           // slow down this many years before next conflict

  // Count active conflicts and detect transitions
  let activeCount = 0;
  let nearTransition = false;
  let totalImportance = 0;

  for (const c of allConflicts) {
    const end = c.endYear === null ? Infinity : c.endYear;
    if (currentYear >= c.startYear && currentYear <= end) {
      activeCount++;
      totalImportance += c.importance;
      const nearStart = currentYear - c.startYear < 3;
      const nearEnd = c.endYear !== null && end - currentYear < 3;
      if (nearStart || nearEnd) nearTransition = true;
    }
  }

  if (activeCount > 0) {
    // Density-aware slowdown: more simultaneous conflicts = slower playback
    // so viewers can absorb what's happening
    const densityFactor = Math.max(0.15, 1 - (activeCount - 1) * 0.04);
    // High-importance conflicts also slow things down
    const importanceFactor = totalImportance > 20 ? 0.7 : totalImportance > 10 ? 0.85 : 1;

    if (nearTransition) return TRANSITION_SPEED * densityFactor * importanceFactor;
    return ACTIVE_SPEED * densityFactor * importanceFactor;
  }

  // No active conflicts — find distance to next one
  let minGap = Infinity;
  for (const c of allConflicts) {
    if (c.startYear > currentYear) {
      minGap = Math.min(minGap, c.startYear - currentYear);
    }
  }

  if (minGap <= LOOKAHEAD) {
    const t = minGap / LOOKAHEAD;
    return TRANSITION_SPEED + (MAX_SPEED - TRANSITION_SPEED) * t * t;
  }

  return MAX_SPEED;
}

export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  if (year < 1000) return `${year} CE`;
  return `${year}`;
}

export function formatCasualties(n: number | null): string {
  if (n === null) return 'Unknown';
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}K`;
  return `~${n}`;
}

export function getMajorConflicts(allConflicts: Conflict[]): Conflict[] {
  return allConflicts.filter((c) => c.importance >= 4);
}
