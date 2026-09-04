/**
 * Shared formatters for years, spans, casualty figures and importance
 * labels. Pure functions — safe in server components, client components
 * and node scripts alike. Every UI surface should import from here rather
 * than keeping a local copy (the local copies used to disagree on BCE,
 * year 0, "present" and rounding).
 */

/** "3100 BCE", "476 CE", "1544". Year 0 does not exist historically and is
 *  rendered as "1 BCE". */
export function formatYear(year: number): string {
  const y = Math.round(year);
  if (y < 0) return `${-y} BCE`;
  if (y === 0) return '1 BCE';
  if (y < 1000) return `${y} CE`;
  return `${y}`;
}

/** Split form for big displays: { num: '2500', suffix: 'BCE' }. */
export function formatYearParts(year: number): { num: string; suffix: 'BCE' | 'CE' } {
  const y = Math.round(year);
  if (y < 0) return { num: String(-y), suffix: 'BCE' };
  if (y === 0) return { num: '1', suffix: 'BCE' };
  return { num: String(y), suffix: 'CE' };
}

/** "1939 – 1945", "1991 – present", "1544" (single year). An endYear of
 *  null means ongoing regardless of how long ago it started. */
export function formatYearRange(start: number, end: number | null | undefined): string {
  if (end == null) return `${formatYear(start)} – present`;
  if (end === start) return formatYear(start);
  return `${formatYear(start)} – ${formatYear(end)}`;
}

/** "6 years", "1 year", "Ongoing"; empty string for a single-year entry
 *  (never "0 years"). */
export function formatDuration(start: number, end: number | null | undefined): string {
  if (end == null) return 'Ongoing';
  const n = end - start;
  if (n <= 0) return '';
  return n === 1 ? '1 year' : `${n} years`;
}

/** Range plus duration on one line: "1939 – 1945 · 6 years",
 *  "1991 – present · ongoing", "1544". */
export function formatSpan(start: number, end: number | null | undefined): string {
  const range = formatYearRange(start, end);
  if (end == null) return `${range} · ongoing`;
  const dur = formatDuration(start, end);
  return dur ? `${range} · ${dur}` : range;
}

/** Compact range for dense rows: "336–323 BCE", "1939–45", "476–493 CE",
 *  "1991–present", "1544". BCE-aware; never slices the sign off a year. */
export function formatCompactRange(start: number, end: number | null | undefined): string {
  if (end == null) return `${formatYear(start)}–present`;
  if (end === start) return formatYear(start);
  if (start < 0 && end < 0) return `${-start}–${-end} BCE`;
  if (start < 0 || end === 0) return `${formatYear(start)}–${formatYear(end)}`;
  if (start >= 1000 && end >= 1000 && Math.floor(start / 100) === Math.floor(end / 100)) {
    return `${start}–${String(end % 100).padStart(2, '0')}`;
  }
  if (start < 1000 && end < 1000) return `${start}–${end} CE`;
  return `${formatYear(start)}–${formatYear(end)}`;
}

/** "1.2M", "85K", "4,200"; null → "—". One style everywhere. */
export function formatCasualties(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n.toLocaleString('en-US');
}

export function importanceLabel(i: number): string {
  switch (i) {
    case 5: return 'World-changing';
    case 4: return 'Major conflict';
    case 3: return 'Significant';
    case 2: return 'Regional';
    default: return 'Minor';
  }
}

/** Decade bucket label for grouping: "1940s", "490s BCE". Years are
 *  floored toward −∞ so -495 lands in "500s BCE", not "490s BCE". */
export function formatDecade(year: number): string {
  const d = Math.floor(year / 10) * 10;
  if (d < 0) return `${-d}s BCE`;
  if (d === 0) return '0s CE';
  if (d < 1000) return `${d}s CE`;
  return `${d}s`;
}

/** "48.85°N · 2.35°E" from a [lon, lat] pair. */
export function formatCoordinates([lon, lat]: readonly [number, number]): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
