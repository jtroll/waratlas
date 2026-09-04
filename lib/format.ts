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

/* ─────────────────────────────────────────────────────────────
 * Empire helpers shared by the empire flyout (client) and the /e/[id]
 * permalink page (server). Pure; no data access.
 * ─────────────────────────────────────────────────────────── */

/** Strip a trailing year slice from an empire id: "british-empire-1815" →
 *  "british-empire", "ottoman-early" → "ottoman-early" (word suffixes are
 *  not slices). Used to group the time-slices of one polity. */
export function empireBaseId(id: string): string {
  return id.replace(/-\d{3,4}$/, '');
}

/** All ids in `allIds` that belong to the same polity as `empireId`: the id
 *  itself plus every id sharing its base name. `polityIds` on a conflict
 *  stores the slice active at the conflict's start year, so a match against
 *  any sibling slice still counts as "this empire". */
export function empireFamilyIds(empireId: string, allIds: readonly string[]): string[] {
  const base = empireBaseId(empireId);
  const out = new Set<string>([empireId]);
  for (const id of allIds) {
    if (id === empireId || empireBaseId(id) === base) out.add(id);
  }
  return Array.from(out);
}

/** Sort order for war lists: importance desc, casualties desc (unrecorded
 *  last), then start year asc. Structural so any record shape qualifies. */
export function compareWars(
  a: { importance: number; casualties: number | null; startYear: number },
  b: { importance: number; casualties: number | null; startYear: number },
): number {
  if (b.importance !== a.importance) return b.importance - a.importance;
  const ac = a.casualties ?? -1;
  const bc = b.casualties ?? -1;
  if (bc !== ac) return bc - ac;
  return a.startYear - b.startYear;
}

/** Human labels for the polygon-provenance enum on empire features. */
export const EMPIRE_SOURCE_LABELS: Record<string, string> = {
  'historical-basemaps': 'aourednik / historical-basemaps',
  'hand-crafted-from-atlases': 'hand-crafted from scholarly atlases',
  'reconstructed-clipped-country': 'reconstructed from Natural Earth country boundaries',
  'approximate-cultural-extent': 'approximate cultural extent (no primary GIS source)',
  'cliopatria-seshat': 'Cliopatria / Seshat Global History Databank (CC BY 4.0)',
  'manual': 'manual construction / verification',
};

export function empireSourceLabel(source: string): string {
  return EMPIRE_SOURCE_LABELS[source] ?? source;
}

/** "Empire", "Tributary network", "Cultural sphere" … the polity-type word
 *  used in eyebrows and captions. */
export function polityTypeLabel(polityType?: string | null): string {
  switch (polityType) {
    case 'tributary':     return 'Tributary network';
    case 'confederation': return 'Confederation';
    case 'culture':       return 'Cultural sphere';
    case 'nomadic-range': return 'Nomadic range';
    case 'chiefdom':      return 'Chiefdom';
    case 'state':         return 'State';
    default:              return 'Polity';
  }
}

/** Heading shown above the border swatch. Solid lines are always
 *  "Reconstructed borders"; dashed lines are named for the reason. */
export function bordersHeading(isDashed: boolean, polityType?: string | null): string {
  if (!isDashed) return 'Reconstructed borders';
  switch (polityType) {
    case 'tributary':
    case 'confederation':
    case 'culture':
    case 'nomadic-range':
    case 'chiefdom':
      return polityTypeLabel(polityType);
    default:
      return 'Approximate borders';
  }
}

/** One-sentence explanation paired with bordersHeading(). When the polygon
 *  is well-traced but dashed because of polity type, the caption says so
 *  explicitly so the reader doesn't think the line was simply unsourced. */
export function bordersCaption(
  isDashed: boolean,
  polityType?: string | null,
  isAccurate?: boolean,
): string {
  if (!isDashed) {
    return 'Solid borders are reconstructed from canonical historical-basemap data or hand-crafted from scholarly atlases.';
  }
  switch (polityType) {
    case 'tributary':
      return isAccurate
        ? 'The center is well-attested, but the line is a tribute-relationship periphery rather than a surveyed frontier.'
        : 'A paramount-chiefdom-style polity with tributary peripheries; exact extent is contested.';
    case 'confederation':
      return isAccurate
        ? 'A confederation of independent groups sharing identity. The shape reflects member-territory union, not a unified state.'
        : 'A confederation of independent groups; member territories shifted and overlapped, so the perimeter is approximate.';
    case 'culture':
      return isAccurate
        ? 'An archaeological culture defined by material remains. The line is a probability cloud, not a frontier.'
        : 'An archaeological culture; extent is defined by where its material remains have been found rather than by political control.';
    case 'nomadic-range':
      return isAccurate
        ? 'A pastoralist or hunter-gatherer range. Seasonal use shifted across decades, so the line is the rough envelope of a moving territory.'
        : 'A pastoralist or hunter-gatherer range whose extent shifted constantly with seasons and alliances.';
    case 'chiefdom':
      return isAccurate
        ? 'A paramount chiefdom with tributary peripheries. The center is well-attested; the outer line marks the reach of tribute and kinship, not a surveyed frontier.'
        : 'A paramount chiefdom with tributary peripheries; extent is inferred from settlement and tribute patterns and remains approximate.';
    default:
      return 'Dashed borders mark empires whose extent we can date but whose precise frontiers are contested or undocumented.';
  }
}

/** Solid borders need both a faithful polygon and a bordered state. */
export function isEmpireDashed(e: {
  accurate?: boolean;
  borderStyle?: string;
  polityType?: string | null;
}): boolean {
  const isStatePolity = e.polityType === 'state' || e.polityType == null;
  return e.borderStyle === 'dashed' || !e.accurate || !isStatePolity;
}
