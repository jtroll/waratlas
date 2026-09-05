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
  /** Flat summary. Optional because the core data file ships without the
   *  long-text fields; they arrive later from the conflicts-text file and
   *  are merged in (see ConflictText). */
  description?: string;
  /** Tiered description fields (set for top ~200 conflicts). */
  hook?: string;
  narrative?: string;
  significance?: string;
  /** Canonical empire ids (from empires.json) for the belligerents, where a
   *  matching polity feature exists. Populated by the r15 belligerent
   *  canonicalisation; absent for records whose belligerents have no
   *  polygon in the atlas. */
  polityIds?: string[];
  /** Researcher-grade source attribution (top ~100 conflicts). */
  sources?: ConflictSource[];
}

export interface ConflictSource {
  label: string;
  url?: string | null;
}

/** The long-text fields split out of the core conflicts file. Loaded lazily
 *  (after the map is ready, or on first sidebar/search need) and merged into
 *  the Conflict records by id. */
export interface ConflictText {
  description?: string;
  hook?: string;
  narrative?: string;
  significance?: string;
  sources?: ConflictSource[];
}

export type ConflictTextMap = Record<string, ConflictText>;

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
