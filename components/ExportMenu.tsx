'use client';

import { useState } from 'react';
import { Conflict } from '@/lib/types';

interface Props {
  conflicts: Conflict[];
  currentYear: number;
}

/**
 * Researcher export: download active conflicts as CSV or GeoJSON.
 * Tucked into the bottom-right of the map, above the timeline.
 */
export default function ExportMenu({ conflicts, currentYear }: Props) {
  const [open, setOpen] = useState(false);

  const downloadCSV = () => {
    const rows: string[] = [];
    rows.push([
      'id', 'name', 'startYear', 'endYear', 'lon', 'lat',
      'countries', 'casualties', 'casualties_low', 'casualties_high',
      'casualties_source', 'importance', 'wikipediaUrl', 'description',
    ].join(','));

    for (const c of conflicts) {
      const cells = [
        c.id,
        csvEscape(c.name),
        c.startYear,
        c.endYear ?? '',
        c.coordinates[0],
        c.coordinates[1],
        csvEscape((c.countries ?? []).join('; ')),
        c.casualties ?? '',
        c.casualtyRange?.low ?? '',
        c.casualtyRange?.high ?? '',
        csvEscape(c.casualtyRange?.source ?? ''),
        c.importance,
        c.wikipediaUrl ?? '',
        csvEscape(c.description ?? ''),
      ];
      rows.push(cells.join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    triggerDownload(blob, `wars-atlas-${Math.round(currentYear)}.csv`);
    setOpen(false);
  };

  const downloadGeoJSON = () => {
    const fc = {
      type: 'FeatureCollection' as const,
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
          description: c.description,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    triggerDownload(blob, `wars-atlas-${Math.round(currentYear)}.geojson`);
    setOpen(false);
  };

  return (
    <div className="absolute bottom-32 right-4 z-20 pointer-events-auto hidden md:block">
      <button
        onClick={() => setOpen(!open)}
        className="bg-wars-panel/85 backdrop-blur-xl border border-wars-border/70 rounded-md px-3 py-2 text-[11px] text-wars-muted hover:text-wars-text hover:border-wars-border transition-colors flex items-center gap-2"
        aria-expanded={open}
        title="Export current view"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1 L6 8 M3 5 L6 8 L9 5 M2 10 L10 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export
      </button>
      {open && (
        <div className="mt-1 bg-wars-panel/95 backdrop-blur-xl border border-wars-border rounded-md overflow-hidden text-[11px] min-w-[10rem]">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-wars-muted/70 border-b border-wars-border/50">
            {conflicts.length} conflicts
          </div>
          <button
            onClick={downloadCSV}
            className="w-full text-left px-3 py-2 text-wars-text hover:bg-wars-border/30 transition-colors"
          >
            Download CSV
          </button>
          <button
            onClick={downloadGeoJSON}
            className="w-full text-left px-3 py-2 text-wars-text hover:bg-wars-border/30 transition-colors border-t border-wars-border/50"
          >
            Download GeoJSON
          </button>
          <div className="px-3 py-1.5 text-[10px] text-wars-muted/60 border-t border-wars-border/50">
            CC-BY citation appreciated
          </div>
        </div>
      )}
    </div>
  );
}

function csvEscape(s: string | undefined | null): string {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
