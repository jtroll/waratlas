'use client';

import { useEffect, useRef, useState } from 'react';
import { formatYear, formatCoordinates } from '@/lib/format';
import { useFocusTrap } from '@/lib/focus-trap';

export interface CityFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id?: string;
    name: string;
    modernName?: string | null;
    foundedYear?: number | null;
    endYear?: number | null;
    importance?: number;
  };
}

export interface CityCollection {
  type?: 'FeatureCollection';
  features: CityFeature[];
}

interface Props {
  /** When set, opens the modal showing all name-period entries at this coord. */
  coords: [number, number] | null;
  citiesData: CityCollection | null;
  onClose: () => void;
}

function formatY(y: number | null | undefined): string {
  if (y === null || y === undefined) return '?';
  return formatYear(y);
}

/**
 * Modal shown when the user clicks a city dot. Lists every recorded name period
 * for that location: e.g. Byzantium → Constantinople → Konstantiniyye → Istanbul.
 */
export default function CityTimelineModal({ coords, citiesData, onClose }: Props) {
  const [matches, setMatches] = useState<CityFeature[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!coords || !citiesData) {
      setMatches([]);
      return;
    }
    // Match cities within 0.15° of the click (about 16 km — generous, since clicks are imprecise)
    const TOL = 0.15;
    const found = citiesData.features.filter((f) => {
      const c = f.geometry.coordinates;
      return Math.abs(c[0] - coords[0]) < TOL && Math.abs(c[1] - coords[1]) < TOL;
    });
    // Sort by founded year ascending
    found.sort((a, b) => (a.properties.foundedYear ?? 0) - (b.properties.foundedYear ?? 0));
    setMatches(found);
  }, [coords, citiesData]);

  // Close on Escape
  useEffect(() => {
    if (!coords) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coords, onClose]);

  const open = !!coords && matches.length > 0;
  useFocusTrap(panelRef, open);

  if (!open || !coords) return null;

  return (
    <div
      className="scrim fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="surface-sheet relative w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-timeline-title"
      >
        <div className="surface-sheet border-0 hairline-b sticky top-0 px-5 pt-4 pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-mono text-wars-text-2 m-0 mb-1.5" style={{ letterSpacing: '0.04em' }}>
              {formatCoordinates(coords)}
              <span className="text-wars-faint mx-2" aria-hidden>·</span>
              {matches.length} record{matches.length === 1 ? '' : 's'}
            </p>
            <h2
              id="city-timeline-title"
              className="font-display text-display-m text-wars-text m-0"
              style={{ fontWeight: 400 }}
            >
              Names through time
            </h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn flex-shrink-0" aria-label="Close city timeline">
            <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
              <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* Lineage list — each name period is a row on a vertical rule, so the
            sequence Byzantium → Constantinople → Istanbul reads as one line. */}
        <ol className="px-5 pt-4 pb-2 m-0 list-none relative">
          <div className="absolute top-6 bottom-6 w-px" style={{ left: 23, background: 'var(--rule-strong)' }} aria-hidden />
          {matches.map((m, i) => {
            const p = m.properties;
            const dateRange = `${formatY(p.foundedYear)} – ${p.endYear ? formatY(p.endYear) : 'present'}`;
            return (
              <li key={`${p.name}-${p.foundedYear}-${i}`} className="relative pl-6 py-2.5">
                <span
                  className="absolute top-[18px] w-1.5 h-1.5"
                  style={{ left: 1, background: i === matches.length - 1 ? 'var(--ink-text)' : 'var(--ink-2)', border: '1px solid var(--rule-strong)' }}
                  aria-hidden
                />
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-display-s text-wars-text m-0" style={{ fontWeight: 400 }}>
                    {p.name}
                  </h3>
                  <span className="font-mono text-mono text-wars-muted flex-shrink-0">{dateRange}</span>
                </div>
                {p.modernName && p.modernName !== p.name && (
                  <p className="font-ui text-wars-muted m-0 mt-0.5" style={{ fontSize: 12 }}>
                    Modern: {p.modernName}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        <p
          className="font-display italic text-wars-muted mx-5 mb-4 mt-2 pt-3 m-0"
          style={{ fontSize: 12.5, lineHeight: 1.5, borderTop: '1px solid var(--rule)' }}
        >
          City name records often have uncertain dates, especially before 1500. Treat these as
          approximate.
        </p>
      </div>
    </div>
  );
}
