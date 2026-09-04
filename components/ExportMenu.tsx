'use client';

import { memo, useState } from 'react';
import { Conflict } from '@/lib/types';

interface Props {
  conflicts: Conflict[];
  currentYear: number;
}

/**
 * Researcher export: download active conflicts as CSV or GeoJSON.
 * Tucked into the bottom-right of the map, above the timeline.
 */
function ExportMenu({ conflicts, currentYear }: Props) {
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
      ].map(csvCell);
      rows.push(cells.join(','));
    }
    // UTF-8 BOM so Excel decodes non-ASCII names (Đại Việt, Kościuszko…)
    // instead of showing mojibake.
    const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
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
          description: c.description ?? '',
        },
      })),
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    triggerDownload(blob, `wars-atlas-${Math.round(currentYear)}.geojson`);
    setOpen(false);
  };

  // Editorial chrome — matches the Mapbox zoom +/- group above and the
  // TopBar "Live" button. Square corners, hairline border, dark glass
  // surface, 11px uppercase. Right-aligned at 24px (right-6) so the
  // right edge agrees with the zoom controls.
  const chromeBtn: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: 'oklch(0.20 0.014 250 / 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid var(--rule-strong)',
    color: 'var(--ink-text-2)',
    cursor: 'pointer',
    lineHeight: 1,
  };

  return (
    <div className="absolute bottom-32 right-6 z-20 pointer-events-auto hidden md:block">
      <button
        onClick={() => setOpen(!open)}
        className="font-ui inline-flex items-center justify-center gap-2 transition-colors h-8 px-3 hover:text-wars-text"
        style={chromeBtn}
        aria-expanded={open}
        aria-label="Export current view"
        title="Export current view"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1 L6 8 M3 5 L6 8 L9 5 M2 10 L10 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export
      </button>
      {open && (
        <div
          className="mt-1 overflow-hidden text-[11px] min-w-[10rem]"
          style={{
            background: 'oklch(0.20 0.014 250 / 0.95)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--rule-strong)',
          }}
        >
          <div
            className="eyebrow px-3 py-1.5"
            style={{ borderBottom: '1px solid var(--rule)' }}
          >
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
            className="w-full text-left px-3 py-2 text-wars-text hover:bg-wars-border/30 transition-colors"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
            Download GeoJSON
          </button>
          <div
            className="px-3 py-1.5 text-[10px] text-wars-muted/60"
            style={{ borderTop: '1px solid var(--rule)' }}
          >
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
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Every cell goes through csvEscape. Text cells that start with = + - @
 *  are prefixed with a single quote so spreadsheet apps don't evaluate
 *  them as formulas (CSV injection). Numeric cells (years, coordinates,
 *  counts — including negative BCE years) are left as numbers. */
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return csvEscape(String(v));
  const guarded = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return csvEscape(guarded);
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

export default memo(ExportMenu);
