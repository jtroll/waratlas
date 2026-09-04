import type { Conflict } from '@/lib/types';

/**
 * Researcher export — CSV / GeoJSON downloads of a conflict set. Shared by
 * the desktop ExportMenu and the mobile filter sheet's export row.
 */

const CSV_HEADER = [
  'id', 'name', 'startYear', 'endYear', 'lon', 'lat',
  'countries', 'casualties', 'casualties_low', 'casualties_high',
  'casualties_source', 'importance', 'wikipediaUrl', 'description',
];

export function conflictsToCSV(conflicts: readonly Conflict[]): string {
  const rows: string[] = [CSV_HEADER.join(',')];
  for (const c of conflicts) {
    rows.push([
      c.id,
      c.name,
      c.startYear,
      c.endYear ?? '',
      c.coordinates[0],
      c.coordinates[1],
      (c.countries ?? []).join('; '),
      c.casualties ?? '',
      c.casualtyRange?.low ?? '',
      c.casualtyRange?.high ?? '',
      c.casualtyRange?.source ?? '',
      c.importance,
      c.wikipediaUrl ?? '',
      c.description ?? '',
    ].map(csvCell).join(','));
  }
  // UTF-8 BOM so Excel decodes non-ASCII names (Đại Việt, Kościuszko…).
  return '\ufeff' + rows.join('\n');
}

export function conflictsToGeoJSON(conflicts: readonly Conflict[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: conflicts.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: c.coordinates },
      properties: {
        id: c.id,
        name: c.name,
        startYear: c.startYear,
        endYear: c.endYear,
        countries: c.countries,
        casualties: c.casualties,
        casualtyRange: c.casualtyRange,
        importance: c.importance,
        wikipediaUrl: c.wikipediaUrl,
        description: c.description ?? '',
      },
    })),
  };
}

export function downloadConflictsCSV(conflicts: readonly Conflict[], year: number): void {
  const blob = new Blob([conflictsToCSV(conflicts)], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `wars-atlas-${Math.round(year)}.csv`);
}

export function downloadConflictsGeoJSON(conflicts: readonly Conflict[], year: number): void {
  const blob = new Blob([JSON.stringify(conflictsToGeoJSON(conflicts), null, 2)], {
    type: 'application/geo+json',
  });
  triggerDownload(blob, `wars-atlas-${Math.round(year)}.geojson`);
}

function csvEscape(s: string | undefined | null): string {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Text cells starting with = + - @ get a leading quote so spreadsheet apps
 *  don't evaluate them as formulas (CSV injection). Numbers pass through. */
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return csvEscape(String(v));
  const guarded = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return csvEscape(guarded);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
