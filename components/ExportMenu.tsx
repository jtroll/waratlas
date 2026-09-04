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
  // TopBar "Live" button: .surface-chrome (dark glass, hairline, square),
  // 11px uppercase. Right-aligned at 24px (right-6) so the right edge
  // agrees with the zoom controls. Open state is ivory-tinted, not amber.
  const chromeBtn: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-text-2)',
    cursor: 'pointer',
    lineHeight: 1,
  };

  return (
    <div className="absolute bottom-32 right-6 z-20 pointer-events-auto hidden md:block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`surface-chrome hover-tint font-ui inline-flex items-center justify-center gap-2 transition-colors h-8 px-3 ${open ? 'pressed-ivory' : ''}`}
        style={chromeBtn}
        aria-expanded={open}
        aria-haspopup="menu"
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
          className="surface-panel mt-1 overflow-hidden min-w-[11rem]"
          role="menu"
          aria-label="Export formats"
        >
          <div
            className="font-mono text-mono text-wars-muted px-3 py-2"
            style={{ borderBottom: '1px solid var(--rule)', letterSpacing: '0.04em' }}
          >
            {conflicts.length.toLocaleString('en-US')} conflicts · {Math.round(currentYear) < 0 ? `${-Math.round(currentYear)} BCE` : Math.round(currentYear)}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={downloadCSV}
            className="hover-tint font-ui w-full text-left px-3 py-2.5 text-wars-text transition-colors"
            style={{ fontSize: 12.5, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Download CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={downloadGeoJSON}
            className="hover-tint font-ui w-full text-left px-3 py-2.5 text-wars-text transition-colors"
            style={{ fontSize: 12.5, background: 'transparent', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--rule)' }}
          >
            Download GeoJSON
          </button>
          <div
            className="font-display italic px-3 py-2 text-wars-muted"
            style={{ fontSize: 11.5, borderTop: '1px solid var(--rule)' }}
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
