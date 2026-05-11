export interface CasualtyRange {
  low: number;
  high: number;
  source?: string;
  notes?: string;
}

export interface Conflict {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  coordinates: [number, number]; // [lon, lat]
  locations: string[];
  countries: string[];
  partOf: string[];
  casualties: number | null;
  /** Optional researcher-grade range with source attribution. Where present,
   * the UI shows the range alongside the headline figure. */
  casualtyRange?: CasualtyRange;
  wikipediaUrl: string | null;
  importance: number; // 1-5
  description: string;
  /** Tiered description fields (set for top ~200 conflicts). */
  hook?: string;
  narrative?: string;
  significance?: string;
  /** Researcher-grade source attribution (top ~100 conflicts). */
  sources?: { label: string; url?: string | null }[];
}

export interface TimelineState {
  currentYear: number;
  isPlaying: boolean;
  playbackSpeed: number; // years per second (base speed for manual modes)
  speedMode: 'auto' | 'manual';
  minYear: number;
  maxYear: number;
}

export interface ActiveConflict extends Conflict {
  isActive: boolean;
  opacity: number;
  displayPriority: number;
}

export interface ScreenPosition {
  x: number;
  y: number;
}
