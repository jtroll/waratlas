/**
 * URL hash deep links.
 *
 *   #year=1066&conflict=hastings-battle
 *   #year=1200&empire=mongol-empire
 *   #year=1942&lat=48.85&lon=2.35&zoom=4.2
 *   #exhibit=welcome
 *
 * `conflict` and `empire` are mutually exclusive (one right-side panel at a
 * time); when both are present `conflict` wins. Parsing is tolerant — the
 * hash may carry unknown keys, and a missing `year` is null.
 *
 * Camera (`lat`, `lon`, `zoom`) is written on every settled map move
 * (debounced) and applied once on load; a `conflict=` / `empire=` fly-to
 * still runs afterwards so the subject is guaranteed to be in view.
 */
export interface CameraState {
  lat: number;
  lon: number;
  zoom: number;
}

export interface HashState {
  year: number | null;
  conflictId: string | null;
  empireId: string | null;
  /** Curated exhibit (lib/exhibits.ts) to open the tour on. */
  exhibitId: string | null;
  /** Initial camera, present only when all three of lat/lon/zoom parse. */
  camera: CameraState | null;
}

export const EMPTY_HASH: HashState = {
  year: null,
  conflictId: null,
  empireId: null,
  exhibitId: null,
  camera: null,
};

/** Reference for the About / methodology page: one row per parameter.
 *  `HASH_PARAMS_DOC` is the same array (both names are in use); the
 *  plain-text form is `HASH_PARAMS_TEXT`. */
export interface HashParamDoc {
  param: string;
  description: string;
}
export const HASH_PARAMS: readonly HashParamDoc[] = [
  { param: 'year', description: 'Integer year the timeline is parked on (negative for BCE), e.g. year=-490.' },
  { param: 'conflict', description: 'Id of the conflict whose detail panel is open. The map flies to it on load and the year jumps to its start unless year= is also given.' },
  { param: 'empire', description: 'Id of the empire whose panel is open. Ignored when conflict= is present. The map fits its borders on load.' },
  { param: 'exhibit', description: 'Id of a curated exhibit; opens the guided tour on that exhibit. Present only while the tour is open.' },
  { param: 'lat, lon', description: 'Map centre in decimal degrees (two decimals). Written after every settled pan or zoom; applied once on load, before any conflict/empire fly-to.' },
  { param: 'zoom', description: 'Map zoom level (one decimal, 1.5–12). Applied together with lat and lon.' },
];
export const HASH_PARAMS_DOC: readonly HashParamDoc[] = HASH_PARAMS;

/** One "param — description" line per parameter. */
export const HASH_PARAMS_TEXT: string = HASH_PARAMS.map((p) => `${p.param} — ${p.description}`).join('\n');

function param(hash: string, key: string): string | null {
  const m = hash.match(new RegExp(`(?:^#|[#&?])${key}=([^&]+)`));
  return m ? m[1] : null;
}

function num(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseHash(hash: string): HashState {
  const yearMatch = hash.match(/(?:^#|[#&?])year=(-?\d+)/);
  const conflictMatch = hash.match(/(?:^#|[#&?])conflict=([\w\-.~%]+)/);
  const empireMatch = hash.match(/(?:^#|[#&?])empire=([\w\-.~%]+)/);
  const exhibitMatch = hash.match(/(?:^#|[#&?])exhibit=([\w\-.~%]+)/);
  const conflictId = conflictMatch ? safeDecode(conflictMatch[1]) : null;
  const lat = num(param(hash, 'lat'));
  const lon = num(param(hash, 'lon'));
  const zoom = num(param(hash, 'zoom'));
  const camera =
    lat != null && lon != null && zoom != null &&
    Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && zoom >= 0 && zoom <= 24
      ? { lat, lon, zoom }
      : null;
  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    conflictId,
    empireId: !conflictId && empireMatch ? safeDecode(empireMatch[1]) : null,
    exhibitId: exhibitMatch ? safeDecode(exhibitMatch[1]) : null,
    camera,
  };
}

export interface HashExtras {
  exhibitId?: string | null;
  camera?: CameraState | null;
}

export function buildHash(
  year: number,
  conflictId?: string | null,
  empireId?: string | null,
  extras?: HashExtras,
): string {
  let h = `#year=${Math.round(year)}`;
  if (conflictId) h += `&conflict=${encodeURIComponent(conflictId)}`;
  else if (empireId) h += `&empire=${encodeURIComponent(empireId)}`;
  if (extras?.exhibitId) h += `&exhibit=${encodeURIComponent(extras.exhibitId)}`;
  const cam = extras?.camera;
  if (cam) {
    h += `&lat=${round(cam.lat, 2)}&lon=${round(cam.lon, 2)}&zoom=${round(cam.zoom, 1)}`;
  }
  return h;
}

function round(n: number, decimals: number): string {
  const s = n.toFixed(decimals);
  // "-0.00" → "0.00"
  return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
