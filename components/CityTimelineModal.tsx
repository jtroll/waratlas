'use client';

import { useEffect, useState } from 'react';
import { formatYear } from '@/lib/format';

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

  if (!coords) return null;
  if (matches.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-timeline-title"
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-wars-panel border border-wars-border rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-wars-panel/95 backdrop-blur-xl border-b border-wars-border px-5 py-3 flex items-start justify-between">
          <div>
            <h2 id="city-timeline-title" className="text-base font-bold text-wars-text">
              Names through time
            </h2>
            <p className="text-[11px] text-wars-muted mt-0.5">
              {coords[1].toFixed(2)}°{coords[1] >= 0 ? 'N' : 'S'}, {coords[0].toFixed(2)}°{coords[0] >= 0 ? 'E' : 'W'} · {matches.length} record{matches.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-wars-border/50 flex items-center justify-center hover:bg-wars-border transition-colors"
            aria-label="Close city timeline"
          >
            <svg width="12" height="12" viewBox="0 0 14 14">
              <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ol className="px-5 py-4 space-y-2">
          {matches.map((m, i) => {
            const p = m.properties;
            const dateRange = `${formatY(p.foundedYear)}${p.endYear ? ` – ${formatY(p.endYear)}` : ' – present'}`;
            return (
              <li
                key={`${p.name}-${p.foundedYear}-${i}`}
                className="bg-wars-bg/40 border border-wars-border/40 rounded p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-wars-text">{p.name}</h3>
                  <span className="text-[11px] text-wars-muted/80 flex-shrink-0">{dateRange}</span>
                </div>
                {p.modernName && p.modernName !== p.name && (
                  <p className="text-[11px] text-wars-muted/70 mt-0.5">Modern: {p.modernName}</p>
                )}
              </li>
            );
          })}
        </ol>

        <div className="px-5 pb-4 text-[11px] text-wars-muted/70 leading-relaxed">
          City name records often have uncertain dates, especially before 1500. Treat these as
          approximate.
        </div>
      </div>
    </div>
  );
}
