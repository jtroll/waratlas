import { Conflict, ActiveConflict } from './types';
import { formatYear, formatCasualties, formatYearRange } from './format';

// Re-exported for compatibility — the canonical implementations live in
// lib/format.ts.
export { formatYear, formatCasualties };

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
  // Entries spanning more than this many years are era-scale summaries
  // ("Classic Maya City-State Wars"). They stay on the map but lose callout
  // priority so they stop winning the label slots at sparse years.
  const ERA_SCALE_YEARS = 300;

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

      const span = (c.endYear ?? currentYear) - c.startYear;
      const importanceScore = span > ERA_SCALE_YEARS
        ? c.importance * 20 - 40
        : c.importance * 20;

      // Active conflicts get a large priority boost so they always render on top
      const displayPriority =
        importanceScore +
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
 * slow when significant conflicts start/end (the interesting transitions).
 *
 * Tuned so a full −3100 → present run takes roughly five minutes
 * (scratch simulation: ~5.2 min at 20 fps). Density and importance still
 * slow the modern era down — 1900–2000 runs at ~6 yr/s vs ~40 yr/s in the
 * Bronze Age — but the density floor keeps the crowded centuries moving.
 */
export function getAutoSpeed(currentYear: number, allConflicts: Conflict[]): number {
  const TRANSITION_SPEED = 20;   // years/sec while a significant conflict starts/ends
  const ACTIVE_SPEED = 40;       // years/sec during mid-conflict (base, reduced by density)
  const MAX_SPEED = 1200;        // years/sec through empty stretches
  const LOOKAHEAD = 8;           // slow down this many years before next conflict
  const TRANSITION_MIN_IMPORTANCE = 3; // minor entries start every year; ignore them
  const DENSITY_FLOOR = 0.45;

  // Count active conflicts and detect transitions
  let activeCount = 0;
  let nearTransition = false;
  let totalImportance = 0;

  for (const c of allConflicts) {
    const end = c.endYear === null ? Infinity : c.endYear;
    if (currentYear >= c.startYear && currentYear <= end) {
      activeCount++;
      totalImportance += c.importance;
      if (c.importance >= TRANSITION_MIN_IMPORTANCE) {
        const nearStart = currentYear - c.startYear < 3;
        const nearEnd = c.endYear !== null && end - currentYear < 3;
        if (nearStart || nearEnd) nearTransition = true;
      }
    }
  }

  if (activeCount > 0) {
    // Density-aware slowdown: more simultaneous conflicts = slower playback
    // so viewers can absorb what's happening
    const densityFactor = Math.max(DENSITY_FLOOR, 1 - (activeCount - 1) * 0.04);
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

/** Plain-text citation used by the Cite buttons (sidebar + mobile dock). */
export function conflictCitation(c: Conflict, origin: string): string {
  return `${c.name} (${formatYearRange(c.startYear, c.endYear)}). War Atlas. ${origin}/c/${c.id}`;
}

export function getMajorConflicts(allConflicts: Conflict[]): Conflict[] {
  return allConflicts.filter((c) => c.importance >= 4);
}
