'use client';

import { memo, useState } from 'react';
import { Conflict } from '@/lib/types';
import { downloadConflictsCSV, downloadConflictsGeoJSON } from '@/lib/export';

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
    downloadConflictsCSV(conflicts, currentYear);
    setOpen(false);
  };

  const downloadGeoJSON = () => {
    downloadConflictsGeoJSON(conflicts, currentYear);
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

export default memo(ExportMenu);
