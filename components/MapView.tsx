'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import { ActiveConflict, Conflict, ScreenPosition } from '@/lib/types';
import { DATA_URLS } from '@/lib/data-urls';
import type { CameraState } from '@/lib/hash';
import { MapboxTokenFallback } from './ErrorBoundary';
import type { EmpireProperties } from './EmpireSidebar';

interface MapViewProps {
  activeConflicts: ActiveConflict[];
  currentYear: number;
  onConflictClick: (conflict: Conflict) => void;
  onConflictDotClick: (conflict: Conflict) => void;
  selectedConflictId: string | null;
  /** Fires on Mapbox's `load` event (style ready). The page uses it to
   *  lift the loading screen instead of guessing with a timeout. Zoom is
   *  covered by onMapMove — Mapbox fires `move` during zooms too. */
  onMapLoad?: () => void;
  /** Optional per-`move` callback. Prefer MapViewHandle.onMove for anything
   *  that needs to react per frame — it doesn't go through React state. */
  onMapMove?: () => void;
  /** Called when the user clicks a city dot. Receives the city's coordinates. */
  onCityClick?: (coords: [number, number]) => void;
  /** Called when the user clicks an empire polygon. Receives the empire's
   *  feature properties (plus a computed bbox). Conflict-marker clicks take
   *  precedence — if a conflict dot is at the same point, this won't fire. */
  onEmpireClick?: (empire: EmpireProperties) => void;
  /** id of the currently-selected empire (so we can tone the polygon). */
  selectedEmpireId?: string | null;
  /** Fires once the historical layers (empires + cities) are on the map —
   *  from then on getEmpire / getEmpireBbox on the handle resolve ids. */
  onHistoricalLoad?: () => void;
  /** Camera the map is CREATED with (a `lat/lon/zoom` deep link). Read once
   *  at construction, so it lands before any conflict / empire fly-to. */
  initialCamera?: CameraState | null;
}

export interface FlyToOptions {
  /** Target zoom. Default: max(current zoom, 4). */
  zoom?: number;
  /** Animation length in ms (default 900). */
  duration?: number;
  /** Screen-space offset [x, y] applied to the target so a point can be
   *  centred in the part of the map not covered by a side panel. */
  offset?: [number, number];
}

export interface FlyToConflictOptions extends FlyToOptions {
  /** When true, always fly. When false (default) only fly if the point is
   *  outside the visible viewport (`inset` shrinks that viewport). */
  pan?: boolean;
  /** Viewport insets in px (panels covering the map) used for the
   *  visibility check and to offset the target. */
  inset?: { top?: number; right?: number; bottom?: number; left?: number };
}

export interface MapViewHandle {
  project: (lngLat: [number, number]) => ScreenPosition | null;
  getZoom: () => number;
  /** Subscribe to Mapbox `move` (fires during pans and zooms) plus the
   *  initial `load`. Returns an unsubscribe. Listeners run synchronously on
   *  Mapbox's event, outside React, so a per-frame subscriber (the callout
   *  layer) can position DOM directly without a state round-trip. */
  onMove: (listener: () => void) => () => void;
  /** Fly the map to fit the given bounding box. Used by the opening tour to
   *  pan the camera to the area being discussed on each stop. The padding
   *  leaves room for the tour card pinned to the bottom of the screen. */
  flyToBbox: (
    bbox: [number, number, number, number],
    opts?: { padding?: { top: number; bottom: number; left: number; right: number }; maxZoom?: number },
  ) => void;
  /** Ease the camera to a point (900 ms; instant under reduced motion). */
  flyTo: (lngLat: [number, number], opts?: FlyToOptions) => void;
  /** Bring a conflict into view. Returns true if the camera moved. */
  flyToConflict: (conflict: Conflict, opts?: FlyToConflictOptions) => boolean;
  /** Is the point inside the (inset) visible viewport? */
  isInView: (lngLat: [number, number], inset?: FlyToConflictOptions['inset']) => boolean;
  /** Full-geometry bbox of an empire (available once empires.json loaded). */
  getEmpireBbox: (id: string) => [number, number, number, number] | undefined;
  /** Feature properties of an empire by id (for selecting from a deep link). */
  getEmpire: (id: string) => EmpireProperties | undefined;
  /** Move keyboard focus to the map canvas (arrow keys then pan). */
  focus: () => void;
  /** Current centre + zoom, or null before the map exists. */
  getCamera: () => CameraState | null;
  /** Jump (or ease, with `animate`) the camera to a centre + zoom. */
  setCamera: (camera: CameraState, opts?: { animate?: boolean }) => void;
  /** Subscribe to Mapbox `moveend` (the camera has settled after a pan,
   *  zoom or programmatic fly). Returns an unsubscribe. */
  onMoveEnd: (listener: () => void) => () => void;
}

const REDUCED_MOTION = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Map GeoJSON feature properties → the EmpireSidebar payload. */
function toEmpireProperties(
  props: Record<string, unknown>,
  bbox: [number, number, number, number] | undefined,
): EmpireProperties {
  return {
    id: String(props.id),
    name: String(props.name ?? ''),
    startYear: Number(props.startYear ?? 0),
    endYear: props.endYear == null ? null : Number(props.endYear),
    color: typeof props.color === 'string' ? props.color : undefined,
    accurate: props.accurate === true,
    borderStyle: props.borderStyle === 'dashed' ? 'dashed' as const : props.borderStyle === 'solid' ? 'solid' as const : undefined,
    source: typeof props.source === 'string' ? props.source : undefined,
    sourceDetail: typeof props.sourceDetail === 'string' ? props.sourceDetail : undefined,
    borderNote: typeof props.borderNote === 'string' ? props.borderNote : undefined,
    borderYear:
      typeof props.borderYear === 'number'
        ? props.borderYear
        : typeof props.borderYear === 'string'
          ? Number(props.borderYear)
          : undefined,
    matchedRegion: typeof props.matchedRegion === 'string' ? props.matchedRegion : undefined,
    handCraftedNote: typeof props.handCraftedNote === 'string' ? props.handCraftedNote : undefined,
    polityType: typeof props.polityType === 'string' ? props.polityType : undefined,
    bbox,
  };
}

// Palette equivalents (Mapbox GL JS 3.30 does not parse oklch() literals;
// these are the sRGB conversions of the tokens in app/globals.css):
//   --vermilion oklch(0.62 0.18 28) → rgb(222, 79, 68)
//   --amber     oklch(0.78 0.14 78) → rgb(232, 171, 62)
//   --ink-text  oklch(0.94 0.012 85) → rgb(239, 235, 226)
//   --ink-0     oklch(0.16 0.012 250) → rgb(9, 14, 18)
const VERMILION = 'rgb(222, 79, 68)';
const AMBER = 'rgb(232, 171, 62)';
const IVORY = 'rgb(239, 235, 226)';
const INK = 'rgb(9, 14, 18)';

/** Zoom-scaled version of a per-feature expression. Mapbox only accepts
 *  ["zoom"] as the input of a top-level interpolate, so the zoom curve has
 *  to be the outer expression and the data-driven part goes in each stop. */
function zoomScaled(
  build: (k: number) => mapboxgl.ExpressionSpecification | number,
  k15: number, k4: number, k7: number,
): mapboxgl.ExpressionSpecification {
  return ['interpolate', ['linear'], ['zoom'], 1.5, build(k15), 4, build(k4), 7, build(k7)];
}

/** Importance-stop radius, scaled by zoom so the world view stays legible
 *  while every dot remains on the map (no clustering, no zoom gating). */
function zoomRadius(r1: number, r3: number, r5: number): mapboxgl.ExpressionSpecification {
  const byImportance = (k: number): mapboxgl.ExpressionSpecification => [
    'interpolate', ['linear'], ['get', 'importance'],
    1, r1 * k, 3, r3 * k, 5, r5 * k,
  ];
  return [
    'interpolate', ['linear'], ['zoom'],
    1.5, byImportance(0.55),
    4, byImportance(0.8),
    7, byImportance(1),
  ];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';
const HAS_VALID_TOKEN = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE' && MAPBOX_TOKEN.length > 20;

/** Compute a [minLon, minLat, maxLon, maxLat] bbox from a GeoJSON geometry.
 *  Used by the empire click handler to enrich the EmpireSidebar payload. */
type NestedCoords = number[] | NestedCoords[];

function computeBbox(g: GeoJSON.Geometry): [number, number, number, number] | undefined {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (c: NestedCoords): void => {
    if (typeof c[0] === 'number') {
      const [x, y] = c as number[];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else {
      for (const child of c as NestedCoords[]) visit(child);
    }
  };
  if ('coordinates' in g) visit(g.coordinates as NestedCoords);
  if (!isFinite(minX)) return undefined;
  return [minX, minY, maxX, maxY];
}

/** Approximate planar area (shoelace, in degrees²) of a closed ring.
 *  We only need it for relative ordering, not real-world units, so we
 *  don't bother with spherical-excess correction. */
function ringArea(ring: number[][]): number {
  let s = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(s) / 2;
}

/** Sum of outer-ring areas across a Polygon or MultiPolygon, used to
 *  order empire features largest-first so smaller ones render on top
 *  and stay clickable when they sit inside a larger one (e.g. Kingdom
 *  of Ankole inside British Colonial Africa). Holes ignored — they don't
 *  affect the size ranking meaningfully. */
function featureArea(f: GeoJSON.Feature): number {
  const g = f.geometry as GeoJSON.Geometry;
  if (g.type === 'Polygon') {
    const c = g.coordinates as number[][][];
    return c.length > 0 ? ringArea(c[0]) : 0;
  }
  if (g.type === 'MultiPolygon') {
    const polys = g.coordinates as number[][][][];
    let sum = 0;
    for (const poly of polys) if (poly.length > 0) sum += ringArea(poly[0]);
    return sum;
  }
  return 0;
}

// Layers in the Mapbox dark-v11 style that show modern borders/labels
// We'll control these via opacity as the timeline approaches present day
interface ModernBorderLayer {
  id: string;
  paintProperty: 'line-opacity' | 'text-opacity';
  fadeStart: number;
  fadeEnd: number;
  maxOpacity: number;
}

const MODERN_BORDER_LAYERS: ModernBorderLayer[] = [
  {
    id: 'admin-0-boundary',
    paintProperty: 'line-opacity',
    fadeStart: 1900,
    fadeEnd: 1990,
    maxOpacity: 0.5,
  },
  {
    id: 'admin-0-boundary-disputed',
    paintProperty: 'line-opacity',
    fadeStart: 1900,
    fadeEnd: 1990,
    maxOpacity: 0.5,
  },
  {
    id: 'admin-0-boundary-bg',
    paintProperty: 'line-opacity',
    fadeStart: 1900,
    fadeEnd: 1990,
    maxOpacity: 0.5,
  },
  {
    id: 'admin-1-boundary',
    paintProperty: 'line-opacity',
    fadeStart: 1950,
    fadeEnd: 2000,
    maxOpacity: 0.4,
  },
  {
    id: 'country-label',
    paintProperty: 'text-opacity',
    fadeStart: 1900,
    fadeEnd: 1990,
    maxOpacity: 0.5,
  },
  {
    id: 'state-label',
    paintProperty: 'text-opacity',
    fadeStart: 1950,
    fadeEnd: 2000,
    maxOpacity: 0.4,
  },
];

// City/settlement layers to show/hide based on era
const SETTLEMENT_LAYERS = [
  'settlement-major-label',
  'settlement-minor-label',
  'settlement-subdivision-label',
];

/** Point inside the viewport minus panel insets (with a small margin so a
 *  dot hugging the edge still counts as "needs a pan"). */
function isInView(
  m: mapboxgl.Map | null,
  lngLat: [number, number],
  inset: FlyToConflictOptions['inset'] = {},
): boolean {
  if (!m) return false;
  try {
    const p = m.project(lngLat);
    const w = m.getContainer().clientWidth;
    const h = m.getContainer().clientHeight;
    const margin = 24;
    return (
      p.x >= (inset.left ?? 0) + margin &&
      p.x <= w - (inset.right ?? 0) - margin &&
      p.y >= (inset.top ?? 0) + margin &&
      p.y <= h - (inset.bottom ?? 0) - margin
    );
  } catch {
    return false;
  }
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    activeConflicts,
    currentYear,
    onConflictClick,
    onConflictDotClick,
    selectedConflictId,
    onMapLoad,
    onMapMove,
    onCityClick,
    onEmpireClick,
    selectedEmpireId,
    onHistoricalLoad,
    initialCamera,
  },
  ref
) {
  const onHistoricalLoadRef = useRef(onHistoricalLoad);
  useEffect(() => { onHistoricalLoadRef.current = onHistoricalLoad; }, [onHistoricalLoad]);
  const onCityClickRef = useRef(onCityClick);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);
  const onMapLoadRef = useRef(onMapLoad);
  useEffect(() => { onMapLoadRef.current = onMapLoad; }, [onMapLoad]);
  // The init effect runs once; handlers it installs read the latest props
  // through refs so a changed callback is never a stale closure.
  const onConflictDotClickRef = useRef(onConflictDotClick);
  useEffect(() => { onConflictDotClickRef.current = onConflictDotClick; }, [onConflictDotClick]);
  const onMapMoveRef = useRef(onMapMove);
  useEffect(() => { onMapMoveRef.current = onMapMove; }, [onMapMove]);
  // Non-blocking notices. bordersError: cities/empires fetch failed (the
  // conflict dots still render); tileError: Mapbox rejected the token.
  const [bordersError, setBordersError] = useState<string | null>(null);
  const [tileError, setTileError] = useState<string | null>(null);
  const retryHistoricalRef = useRef<(() => Promise<boolean>) | null>(null);
  // Bumped when the historical layers arrive late (after a retry) so the
  // year-driven filter effect re-runs for the new layers.
  const [bordersVersion, setBordersVersion] = useState(0);
  // Last integer year we pushed empire/city/border updates for. During
  // timeline auto-play, currentYear advances as a float ~60×/sec, but every
  // filter and opacity expression below is keyed on Math.round(currentYear) —
  // so within a single integer year the Mapbox work is byte-for-byte
  // identical. Re-running setFilter/setPaintProperty against the 427 large
  // empire MultiPolygons 60×/sec (vs once per integer year) was the dominant
  // source of per-frame allocation + WebGL buffer churn behind the reported
  // Firefox memory growth. NaN sentinel forces the first run through.
  const lastEmpireYearRef = useRef<number>(NaN);
  const onEmpireClickRef = useRef(onEmpireClick);
  useEffect(() => { onEmpireClickRef.current = onEmpireClick; }, [onEmpireClick]);
  const hoveredEmpireIdRef = useRef<string | null>(null);
  const selectedEmpireIdRef = useRef<string | null>(selectedEmpireId ?? null);
  useEffect(() => {
    selectedEmpireIdRef.current = selectedEmpireId ?? null;
  }, [selectedEmpireId]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const activeConflictsRef = useRef<ActiveConflict[]>(activeConflicts);
  const currentYearRef = useRef(currentYear);
  // Per-frame move subscribers (see MapViewHandle.onMove). Lives in a ref so
  // subscriptions survive the map being created after the subscriber mounts.
  const moveListenersRef = useRef<Set<() => void>>(new Set());
  const notifyMove = () => {
    moveListenersRef.current.forEach((l) => l());
  };
  const moveEndListenersRef = useRef<Set<() => void>>(new Set());
  // Read once by the init effect; a later prop change must not re-create
  // the map.
  const initialCameraRef = useRef<CameraState | null | undefined>(initialCamera);
  // Empire id → [minLon, minLat, maxLon, maxLat], computed once over the
  // full (un-clipped) geometry when empires.json loads. The click handler
  // used to compute this from the rendered geometry, which is tile-clipped,
  // so a large empire got the bbox of the visible tiles.
  const empireBboxRef = useRef<Map<string, [number, number, number, number]>>(new Map());
  // Empire id → raw feature properties, for getEmpire(id) (deep links).
  const empirePropsRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  useEffect(() => {
    activeConflictsRef.current = activeConflicts;
  }, [activeConflicts]);

  useEffect(() => {
    currentYearRef.current = currentYear;
  }, [currentYear]);

  useImperativeHandle(ref, () => ({
    project: (lngLat: [number, number]) => {
      if (!map.current) return null;
      try {
        const point = map.current.project(lngLat as mapboxgl.LngLatLike);
        return { x: point.x, y: point.y };
      } catch {
        return null;
      }
    },
    getZoom: () => map.current?.getZoom() ?? 2,
    onMove: (listener: () => void) => {
      moveListenersRef.current.add(listener);
      return () => {
        moveListenersRef.current.delete(listener);
      };
    },
    flyToBbox: (bbox, opts) => {
      const m = map.current;
      if (!m) return;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      // Default padding pushes the focal region above the bottom-anchored
      // tour card. Mobile uses a lighter bottom padding than before — heavy
      // padding made fitBounds unable to satisfy the welcome stop (world
      // view) under the map's minZoom (1.5), so the call silently no-op'd.
      const padding = opts?.padding ?? (isMobile
        ? { top: 50, bottom: 320, left: 16, right: 16 }
        : { top: 70, bottom: 320, left: 60, right: 60 });
      const maxZoom = opts?.maxZoom ?? 5;
      const bounds: [[number, number], [number, number]] = [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ];
      // Use cameraForBounds → easeTo so the call is robust to padding that
      // exceeds the map size (which fitBounds rejects). cameraForBounds
      // returns the best-fit camera Mapbox can offer.
      // Respect prefers-reduced-motion: a non-essential easeTo becomes an
      // instant jump for those users.
      const essential = !(
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      );
      const run = () => {
        try {
          const cam = m.cameraForBounds(bounds, { padding, maxZoom });
          if (cam) {
            m.easeTo({ ...cam, duration: 1100, essential });
          } else {
            // Fallback: just centre on the bbox at a reasonable zoom.
            const cx = (bbox[0] + bbox[2]) / 2;
            const cy = (bbox[1] + bbox[3]) / 2;
            m.easeTo({ center: [cx, cy], zoom: 2, duration: 1100, essential });
          }
        } catch (err) {
          // Surface errors instead of silently swallowing so we notice
          // regressions in production logs.
          // eslint-disable-next-line no-console
          console.warn('flyToBbox failed', err);
        }
      };
      // If the style isn't ready, wait for the next `idle` (fires after
      // every style change, unlike `load`, which fires exactly once).
      if (m.isStyleLoaded()) run();
      else m.once('idle', run);
    },
    flyTo: (lngLat, opts) => {
      const m = map.current;
      if (!m) return;
      const run = () => {
        try {
          m.easeTo({
            center: lngLat,
            zoom: opts?.zoom ?? Math.max(m.getZoom(), 4),
            duration: REDUCED_MOTION() ? 0 : opts?.duration ?? 900,
            offset: opts?.offset ?? [0, 0],
            essential: false,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('flyTo failed', err);
        }
      };
      if (m.isStyleLoaded()) run();
      else m.once('idle', run);
    },
    isInView: (lngLat, inset) => isInView(map.current, lngLat, inset),
    flyToConflict: (conflict, opts) => {
      const m = map.current;
      if (!m) return false;
      const inset = opts?.inset ?? {};
      const visible = isInView(m, conflict.coordinates, inset);
      if (!opts?.pan && visible) return false;
      // Centre the point in the uncovered part of the viewport: shift the
      // target by half of each panel inset.
      const offset: [number, number] = opts?.offset ?? [
        ((inset.left ?? 0) - (inset.right ?? 0)) / 2,
        ((inset.top ?? 0) - (inset.bottom ?? 0)) / 2,
      ];
      const current = m.getZoom();
      // Never zoom out below the current zoom; an off-screen point is
      // simply centred at the current zoom (or 4, whichever is larger).
      const zoom = opts?.zoom ?? Math.max(current, 4);
      const run = () => {
        try {
          m.easeTo({
            center: conflict.coordinates,
            zoom,
            duration: REDUCED_MOTION() ? 0 : opts?.duration ?? 900,
            offset,
            essential: false,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('flyToConflict failed', err);
        }
      };
      if (m.isStyleLoaded()) run();
      else m.once('idle', run);
      return true;
    },
    getEmpireBbox: (id) => empireBboxRef.current.get(id),
    getEmpire: (id) => {
      const props = empirePropsRef.current.get(id);
      return props ? toEmpireProperties(props, empireBboxRef.current.get(id)) : undefined;
    },
    focus: () => {
      try {
        map.current?.getCanvas().focus();
      } catch {
        /* no map yet */
      }
    },
    getCamera: () => {
      const m = map.current;
      if (!m) return null;
      try {
        const c = m.getCenter();
        return { lat: c.lat, lon: c.lng, zoom: m.getZoom() };
      } catch {
        return null;
      }
    },
    setCamera: (camera, opts) => {
      const m = map.current;
      if (!m) return;
      const target = { center: [camera.lon, camera.lat] as [number, number], zoom: camera.zoom };
      try {
        if (opts?.animate && !REDUCED_MOTION()) m.easeTo({ ...target, duration: 900, essential: false });
        else m.jumpTo(target);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('setCamera failed', err);
      }
    },
    onMoveEnd: (listener: () => void) => {
      moveEndListenersRef.current.add(listener);
      return () => {
        moveEndListenersRef.current.delete(listener);
      };
    },
  }), []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!HAS_VALID_TOKEN) return;  // fallback handled in render

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // A `lat/lon/zoom` deep link becomes the construction camera — no
    // animation, and it is in place before any fly-to can run.
    const cam = initialCameraRef.current;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: cam ? [cam.lon, cam.lat] : [20, 30],
      zoom: cam ? Math.max(1.5, Math.min(12, cam.zoom)) : 2,
      minZoom: 1.5,
      maxZoom: 12,
      projection: 'mercator',
      // Mapbox terms require visible © Mapbox + © OpenStreetMap attribution.
      // Keep the control enabled but compact so it tucks into the corner.
      attributionControl: false,
    });

    // Mapbox/OSM attribution — required by ToS. Compact mode keeps it visually
    // light while remaining always-visible (one-click expands to full credits).
    m.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
        customAttribution: [
          'Empires from <a href="/sources" target="_blank" rel="noopener">historical-basemaps & atlases</a>',
          'Conflicts via <a href="/sources" target="_blank" rel="noopener">Wikipedia, Clodfelter, UCDP</a>',
        ],
      }),
      'bottom-right'
    );

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    // Historical cities + empire borders. Split out so a failed fetch
    // (offline, 5xx, malformed JSON) can't take the conflict layers down
    // with it, and so the notice's Retry can re-run just this part.
    const loadHistoricalLayers = async (): Promise<boolean> => {
      if (m.getSource('empires')) return true;
      let citiesData: GeoJSON.FeatureCollection;
      let empiresData: GeoJSON.FeatureCollection;
      try {
        const [citiesRes, empiresRes] = await Promise.all([
          fetch(DATA_URLS.cities),
          fetch(DATA_URLS.empires),
        ]);
        if (!citiesRes.ok) throw new Error(`cities: HTTP ${citiesRes.status}`);
        if (!empiresRes.ok) throw new Error(`empires: HTTP ${empiresRes.status}`);
        [citiesData, empiresData] = await Promise.all([
          citiesRes.json() as Promise<GeoJSON.FeatureCollection>,
          empiresRes.json() as Promise<GeoJSON.FeatureCollection>,
        ]);
        if (!Array.isArray(citiesData?.features) || !Array.isArray(empiresData?.features)) {
          throw new Error('malformed GeoJSON');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('War Atlas: historical borders failed to load', err);
        setBordersError('Historical borders failed to load');
        return false;
      }
      if (map.current !== m) return false; // unmounted mid-fetch

      // On the retry path the conflict layers already exist — insert the
      // historical layers beneath them so the dots stay on top.
      const beforeId = m.getLayer('conflict-glow') ? 'conflict-glow' : undefined;

      // ——— Add historical cities source ———
      m.addSource('cities', {
        type: 'geojson',
        data: citiesData as GeoJSON.FeatureCollection,
      });

      // City labels — filtered by current year dynamically
      m.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': [
            'interpolate', ['linear'], ['get', 'importance'],
            1, 10,
            2, 11,
            3, 13,
          ],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-anchor': 'bottom',
          'text-offset': [0, -0.5],
          'text-allow-overlap': false,
          'text-optional': true,
          'text-padding': 4,
        },
        paint: {
          'text-color': 'rgba(239, 235, 226, 0.72)',
          'text-halo-color': 'rgba(9, 14, 18, 0.9)',
          'text-halo-width': 1.5,
          'text-opacity': 0, // set dynamically
        },
      }, beforeId);

      // Small dot for city location
      m.addLayer({
        id: 'city-dots',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'importance'],
            1, 1.5,
            2, 2,
            3, 2.5,
          ],
          'circle-color': 'rgba(239, 235, 226, 0.6)',
          'circle-opacity': 0, // set dynamically
        },
      }, beforeId);

      // Invisible 8px hit area so the 1.5–2.5px city dots are actually
      // clickable (the click/hover handlers below bind to this layer).
      m.addLayer({
        id: 'city-hit',
        type: 'circle',
        source: 'cities',
        filter: ['==', ['get', 'foundedYear'], 999999],
        paint: {
          'circle-radius': 8,
          'circle-color': 'rgba(0,0,0,0)',
          'circle-opacity': 0,
        },
      }, beforeId);

      // ——— Add historical empire borders ———
      // Sort features largest-first so Mapbox renders smaller polygons on
      // top of larger ones within the empire-fill layer. Without this, a
      // small empire sitting inside a sprawling one (Kingdom of Ankole
      // inside British Colonial Africa; Sultanate of Zanzibar inside
      // British East Africa) gets hidden under the larger fill and isn't
      // clickable — queryRenderedFeatures returns features in render
      // order so the topmost (smallest, last-drawn) becomes feats[0].
      // Mutating in place is fine; empiresData is local to this load
      // handler and the sorted order is what we want everywhere downstream
      // (label source builds from .features in the same order).
      (empiresData as GeoJSON.FeatureCollection).features.sort(
        (a, b) => featureArea(b) - featureArea(a)
      );

      // One pass over the full geometry for the click handler's bbox.
      const bboxes = new Map<string, [number, number, number, number]>();
      const propsById = new Map<string, Record<string, unknown>>();
      for (const f of (empiresData as GeoJSON.FeatureCollection).features) {
        const id = (f.properties as { id?: unknown } | null)?.id;
        if (typeof id !== 'string' || !f.geometry) continue;
        propsById.set(id, (f.properties ?? {}) as Record<string, unknown>);
        try {
          const b = computeBbox(f.geometry as GeoJSON.Geometry);
          if (b) bboxes.set(id, b);
        } catch {
          /* bbox is optional in the sidebar UI */
        }
      }
      empireBboxRef.current = bboxes;
      empirePropsRef.current = propsById;

      // promoteId tells Mapbox to use properties.id as the feature id, which
      // is required for setFeatureState() to work (used for hover tone below).
      m.addSource('empires', {
        type: 'geojson',
        data: empiresData as GeoJSON.FeatureCollection,
        promoteId: 'id',
      });

      // ——— Build a Point source for empire labels ———
      // Each empire gets exactly one label at its precomputed labelPoint
      // (avoids the Mapbox "one label per MultiPolygon part" issue)
      // areaRank (0 = largest) feeds symbol-sort-key so the biggest empires
      // win label collisions explicitly rather than by source order.
      const labelFeatures: GeoJSON.Feature[] = (empiresData as GeoJSON.FeatureCollection).features
        .filter((f) => Array.isArray((f.properties as { labelPoint?: unknown } | null)?.labelPoint))
        .map((f, areaRank) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: (f.properties as { labelPoint: [number, number] }).labelPoint,
          },
          properties: { ...f.properties, areaRank },
        }));
      m.addSource('empire-labels', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: labelFeatures },
      });

      // Empire fill (semi-transparent)
      // Initial impossible-match filter so nothing renders until currentYear effect runs
      m.addLayer({
        id: 'empire-fill',
        type: 'fill',
        source: 'empires',
        filter: ['==', ['get', 'startYear'], 999999],
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0,
        },
      }, beforeId);

      // Empire border line — solid for accurate basemap borders
      m.addLayer({
        id: 'empire-border-solid',
        type: 'line',
        source: 'empires',
        filter: ['==', ['get', 'startYear'], 999999],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.5,
          'line-opacity': 0,
        },
      }, beforeId);

      // Empire border line — dashed for approximate hand-drawn borders
      m.addLayer({
        id: 'empire-border-dashed',
        type: 'line',
        source: 'empires',
        filter: ['==', ['get', 'startYear'], 999999],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.2,
          'line-opacity': 0,
          'line-dasharray': [4, 4],
        },
      }, beforeId);

      // Selected-empire outline: an ivory ring on top of the coloured
      // border so the selection still reads after the cursor leaves.
      // Opacity is feature-state driven (0 unless selected).
      m.addLayer({
        id: 'empire-border-selected',
        type: 'line',
        source: 'empires',
        filter: ['==', ['get', 'startYear'], 999999],
        paint: {
          'line-color': IVORY,
          'line-width': 2.5,
          'line-opacity': 0,
        },
      }, beforeId);

      // Empire label — uses the dedicated Point source so each empire gets exactly ONE label
      // Initial filter is impossible-to-match so no labels show until currentYear effect runs
      // Ivory text (the empire colour lives in the fill/border only), quiet
      // 11px regular so the labels recede behind the conflict layer. Mapbox's
      // glyph catalogue has no Source Serif, so DIN Pro stays.
      m.addLayer({
        id: 'empire-label',
        type: 'symbol',
        source: 'empire-labels',
        filter: ['==', ['get', 'startYear'], 999999],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
          'text-letter-spacing': 0.08,
          'text-max-width': 10,
          'text-allow-overlap': false,
          'symbol-sort-key': ['get', 'areaRank'],
        },
        paint: {
          'text-color': 'rgba(239, 235, 226, 0.92)',
          'text-opacity': 0,
          'text-halo-color': 'rgba(9, 14, 18, 0.85)',
          'text-halo-width': 1.4,
        },
      }, beforeId);

      // City click: open the city-name-timeline modal
      m.on('click', 'city-hit', (e) => {
        if (e.features?.[0]?.geometry?.type === 'Point') {
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          if (onCityClickRef.current) {
            e.originalEvent.stopPropagation();
            onCityClickRef.current(coords);
          }
        }
      });
      m.on('mouseenter', 'city-hit', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'city-hit', () => {
        m.getCanvas().style.cursor = '';
      });

      // ─── Empire hover & click ───────────────────────────────────────
      // Hover: paint a feature-state on whichever empire-fill is under the
      // cursor. We compute the topmost (smallest area) feature so that when
      // multiple polygons overlap we hover the one most likely the user means.
      // Click: only fire if NO conflict marker is at the same point — the
      // conflict click handlers above run independently, so we just check
      // queryRenderedFeatures here to suppress when a dot has priority.

      const empireLayersForHit = ['empire-fill'];
      const conflictHitLayers = ['conflict-glow', 'conflict-mid', 'conflict-points'];

      const setEmpireHover = (id: string | null) => {
        const prev = hoveredEmpireIdRef.current;
        if (prev === id) return;
        if (prev != null) {
          m.setFeatureState(
            { source: 'empires', id: prev },
            { hover: false }
          );
        }
        hoveredEmpireIdRef.current = id;
        if (id != null) {
          m.setFeatureState(
            { source: 'empires', id },
            { hover: true }
          );
        }
      };

      m.on('mousemove', 'empire-fill', (e) => {
        const feats = e.features;
        if (!feats || feats.length === 0) return;
        // Pick the topmost (last rendered) — Mapbox returns features in
        // top-to-bottom z order, so feats[0] is the most-foreground polygon.
        const id = (feats[0].properties as { id?: string } | null)?.id ?? null;
        // Only show the empire-pointer cursor when a conflict isn't also there
        const conflictHits = m.queryRenderedFeatures(e.point, { layers: conflictHitLayers });
        if (conflictHits.length === 0) {
          m.getCanvas().style.cursor = 'pointer';
        }
        setEmpireHover(id);
      });
      m.on('mouseleave', 'empire-fill', () => {
        setEmpireHover(null);
        // Don't clobber the cursor if we left the empire onto a conflict dot
        if (m.getCanvas().style.cursor === 'pointer') {
          // leave it; the dot's mouseenter will keep/refresh it
        }
        m.getCanvas().style.cursor = '';
      });

      m.on('click', 'empire-fill', (e) => {
        // Conflict markers always win — a click on a dot should open the
        // conflict sidebar, not the empire underneath.
        const conflictHits = m.queryRenderedFeatures(e.point, { layers: conflictHitLayers });
        if (conflictHits.length > 0) return;

        const feats = e.features;
        if (!feats || feats.length === 0) return;
        const props = feats[0].properties as Record<string, unknown> | null;
        if (!props || !props.id) return;

        // Full-geometry bbox precomputed at load (rendered geometry is
        // tile-clipped, so it can't be used here).
        const bbox = empireBboxRef.current.get(String(props.id));

        const empireProps = toEmpireProperties(props, bbox);

        if (onEmpireClickRef.current) {
          e.originalEvent.stopPropagation();
          onEmpireClickRef.current(empireProps);
        }
      });

      setBordersError(null);
      // Make the year-driven filter/opacity effect re-run for the new layers.
      lastEmpireYearRef.current = NaN;
      setBordersVersion((v) => v + 1);
      onHistoricalLoadRef.current?.();
      return true;
    };
    retryHistoricalRef.current = loadHistoricalLayers;

    m.on('load', async () => {
      onMapLoadRef.current?.();

      // ——— Editorial basemap polish (step 7) ———
      // Deepen the ocean so the basemap reads as the darkest thing on screen.
      // Walk all background layers and paint water with our deep ink color;
      // safe-no-op'd if the layer doesn't exist on this style version.
      try {
        const style = m.getStyle();
        for (const layer of style?.layers ?? []) {
          // Mapbox dark-v11 has 'water' and sometimes 'water-shadow' / 'water-pattern'
          if (layer.type === 'fill' && layer.id.startsWith('water')) {
            m.setPaintProperty(layer.id, 'fill-color', '#06090f');
          }
        }
      } catch {
        // ignore — non-fatal
      }

      // ——— Initialize modern political borders (hidden until timeline reaches 1900) ———
      for (const layer of MODERN_BORDER_LAYERS) {
        if (m.getLayer(layer.id)) {
          m.setLayoutProperty(layer.id, 'visibility', 'none');
          m.setPaintProperty(layer.id, layer.paintProperty, 0);
        }
      }

      // ——— Hide ALL built-in city labels (we use our own historical ones) ———
      for (const layerId of SETTLEMENT_LAYERS) {
        if (m.getLayer(layerId)) {
          m.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }

      await loadHistoricalLayers();
      if (map.current !== m) return;

      // ——— Conflict layers (on top of empires) ———
      // promoteId so the selected dot is a feature-state flag (like the
      // empire hover/selected states) instead of a property baked into the
      // data — selecting a conflict no longer re-uploads the whole set.
      m.addSource('conflicts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'id',
      });
      const isSelected: mapboxgl.ExpressionSpecification = [
        'boolean', ['feature-state', 'selected'], false,
      ];

      // ─── 3-layer conflict markers (step 7 of redesign) ───────────────
      // Every conflict is a dot at every zoom and every year — no
      // clustering, no zoom gating. Radii and the glow opacity are
      // zoom-interpolated (see zoomRadius) so the world view is legible
      // while the dense field of dots stays intact. Colours are the sRGB
      // equivalents of the palette tokens (VERMILION / AMBER / IVORY).

      // Outer breathing ring — soft vermilion fill, big radius; fades
      // toward (never to) 5% at world zoom so 100+ dots don't smear.
      m.addLayer({
        id: 'conflict-glow',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': zoomRadius(10, 18, 30),
          'circle-color': VERMILION,
          'circle-opacity': zoomScaled((k) => ['*', ['get', 'opacity'], k], 0.05, 0.08, 0.10),
          'circle-blur': 1.1,
        },
      });

      // Mid ring — hairline stroke, transparent fill
      m.addLayer({
        id: 'conflict-mid',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': zoomRadius(6, 10, 16),
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1.5, 0.6, 4, 0.8, 7, 1],
          'circle-stroke-color': [
            'case',
            isSelected, 'rgba(232, 171, 62, 0.85)',
            'rgba(222, 79, 68, 0.7)',
          ],
          'circle-stroke-opacity': ['get', 'opacity'],
        },
      });

      // Inner dot — vermilion, amber when selected. Sized so it stays
      // legible at low zoom even without an InfoBoxLayer label drawing
      // the eye to it (the InfoBoxLayer caps at 6–12 boxes; everything
      // else needs to be visible on its own).
      m.addLayer({
        id: 'conflict-points',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': zoomRadius(4, 6.5, 10),
          'circle-color': [
            'case',
            isSelected, AMBER,
            VERMILION,
          ],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': zoomScaled((k) => ['case', isSelected, 1.5, k], 0.3, 0.4, 0.5),
          'circle-stroke-color': [
            'case',
            isSelected, 'rgba(239, 235, 226, 0.6)',
            'rgba(9, 14, 18, 0.7)',
          ],
          'circle-stroke-opacity': ['get', 'opacity'],
        },
      });

      // Selection halo — a 1.5px ivory ring just outside the amber dot so
      // the selection reads even against amber-ish empire fills.
      m.addLayer({
        id: 'conflict-selected-halo',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': zoomRadius(7.5, 10, 13.5),
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': ['case', isSelected, 1.5, 0],
          'circle-stroke-color': IVORY,
          'circle-stroke-opacity': ['case', isSelected, 0.95, 0],
        },
      });

      // Pulse — extra soft halo for world-changing conflicts only
      m.addLayer({
        id: 'conflict-pulse',
        type: 'circle',
        source: 'conflicts',
        filter: ['>=', ['get', 'importance'], 5],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 10, 4, 14, 7, 18],
          'circle-color': VERMILION,
          'circle-opacity': zoomScaled((k) => ['*', ['get', 'opacity'], k], 0.05, 0.065, 0.08),
          'circle-blur': 0.8,
        },
      });

      // Click + hover handlers for the marker triplet.
      // Bind to ALL three layers so users can hit any part of the breathing
      // ring or the dot — much more forgiving target than the 5px dot alone.
      const conflictMarkerLayers = ['conflict-glow', 'conflict-mid', 'conflict-points'];
      const handleMarkerClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        const feat = e.features?.[0];
        if (!feat?.properties) return;
        const id = feat.properties.id as string;
        const conflict = activeConflictsRef.current.find((c) => c.id === id);
        if (!conflict) return;
        e.originalEvent.stopPropagation();
        onConflictDotClickRef.current(conflict);
      };
      for (const layerId of conflictMarkerLayers) {
        m.on('click', layerId, handleMarkerClick);
        m.on('mouseenter', layerId, () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', layerId, () => {
          m.getCanvas().style.cursor = '';
        });
      }

      setMapLoaded(true);
      // Subscribers (callout layer) may have projected before the map
      // existed; give them a pass now that it can project.
      notifyMove();
    });

    // Log the first Mapbox error (tile 401/403, style fetch failures, bad
    // expressions) once, and surface token rejections as a notice — an
    // expired token otherwise renders as a silent black canvas.
    let loggedMapError = false;
    m.on('error', (ev) => {
      const err = ev.error as (Error & { status?: number }) | undefined;
      if (!loggedMapError) {
        loggedMapError = true;
        // eslint-disable-next-line no-console
        console.error('War Atlas: Mapbox error', err ?? ev);
      }
      const status = err?.status;
      const message = String(err?.message ?? '');
      if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|access token/i.test(message)) {
        setTileError('Map tiles failed to load (Mapbox token rejected)');
      }
    });

    m.on('move', () => {
      notifyMove();
      onMapMoveRef.current?.();
    });
    m.on('moveend', () => {
      moveEndListenersRef.current.forEach((l) => l());
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Update conflict points — only when the active set changes (once per
  // integer year during playback). Selection is feature-state below.
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: activeConflicts.map(c => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: c.coordinates },
        properties: {
          id: c.id,
          name: c.name,
          importance: c.importance,
          opacity: c.opacity,
          casualties: c.casualties,
        },
      })),
    };

    const source = map.current.getSource('conflicts') as mapboxgl.GeoJSONSource;
    if (source) source.setData(geojson);
  }, [activeConflicts, mapLoaded]);

  // Selected conflict → feature-state.selected. Feature state is keyed by
  // the promoted id and survives setData, so a selection made while the dot
  // is off-map applies as soon as it appears.
  const previousSelectedConflictRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const prev = previousSelectedConflictRef.current;
    const next = selectedConflictId ?? null;
    if (prev === next) return;
    if (!m.getSource('conflicts')) return;
    if (prev != null) {
      m.setFeatureState({ source: 'conflicts', id: prev }, { selected: false });
    }
    if (next != null) {
      m.setFeatureState({ source: 'conflicts', id: next }, { selected: true });
    }
    previousSelectedConflictRef.current = next;
  }, [selectedConflictId, mapLoaded]);

  // Helper: compute opacity for modern borders based on year
  const computeModernBorderOpacity = (year: number, fadeStart: number, fadeEnd: number, maxOpacity: number): number => {
    if (year < fadeStart) return 0;
    if (year > fadeEnd) return maxOpacity;
    return ((year - fadeStart) / (fadeEnd - fadeStart)) * maxOpacity;
  };

  // Sync selected empire id → feature-state.selected on the empires source.
  // We store the previous id so we can clear it without enumerating every
  // empire in the dataset.
  const previousSelectedEmpireRef = useRef<string | null>(null);
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const prev = previousSelectedEmpireRef.current;
    const next = selectedEmpireId ?? null;
    if (prev === next) return;
    if (prev != null) {
      m.setFeatureState({ source: 'empires', id: prev }, { selected: false });
    }
    if (next != null) {
      m.setFeatureState({ source: 'empires', id: next }, { selected: true });
    }
    previousSelectedEmpireRef.current = next;
  }, [selectedEmpireId, mapLoaded]);

  // Update empire visibility based on current year
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const year = Math.round(currentYear);

    // Skip if the integer year hasn't changed since the last push. Everything
    // below is a pure function of `year` (the rounded value), so re-running it
    // for sub-year float steps during auto-play just re-does identical Mapbox
    // work. This collapses ~60 empire/city/border re-filters per second down
    // to at most one per integer year crossed. See lastEmpireYearRef above.
    if (year === lastEmpireYearRef.current) return;
    lastEmpireYearRef.current = year;

    // Filter empires to only show ones active at the current year
    // Each empire fades in/out over ~20 year transitions
    const FADE = 20;

    // We use a filter + opacity approach: filter to empires that overlap
    // the current year (with fade buffer), and set opacity based on how
    // "into" the empire's timespan we are
    const filter: mapboxgl.FilterSpecification = [
      'all',
      ['<=', ['get', 'startYear'], year + FADE],
      ['>=', ['get', 'endYear'], year - FADE],
    ];

    // Historical layers are absent if cities/empires.json failed to load;
    // skip them (conflict dots + modern borders below still update).
    const hasEmpires = !!m.getLayer('empire-fill');
    const hasCities = !!m.getLayer('city-labels');

    if (hasEmpires) {
    m.setFilter('empire-fill', filter);
    // Solid borders are reserved for empires where BOTH (a) the polygon is
    // faithful to its source (accurate=true) AND (b) the underlying polity
    // had administrative frontiers (polityType === 'state'). Everything else
    // — tributary networks, cultural confederations, archaeological cultures,
    // nomadic ranges, chiefdoms — renders dashed regardless of polygon
    // quality, because pretending those had fixed borders would itself be
    // inaccurate.
    m.setFilter('empire-border-solid', [
      'all',
      ...filter.slice(1),
      ['==', ['get', 'accurate'], true],
      ['==', ['get', 'polityType'], 'state'],
    ]);
    m.setFilter('empire-border-dashed', [
      'all',
      ...filter.slice(1),
      ['any',
        ['!=', ['get', 'accurate'], true],
        ['!=', ['get', 'polityType'], 'state'],
      ],
    ]);
    m.setFilter('empire-label', filter);
    if (m.getLayer('empire-border-selected')) m.setFilter('empire-border-selected', filter);

    // Opacity: full (1.0) within the empire's actual span, fading in/out
    // for FADE years before/after. This way an empire of duration 3 still
    // shows at full opacity throughout its actual existence.
    //
    // - year < startYear - FADE: not visible (filtered out)
    // - startYear - FADE <= year < startYear: fading in (0 → 1)
    // - startYear <= year <= endYear: full opacity (1)
    // - endYear < year <= endYear + FADE: fading out (1 → 0)
    // - year > endYear + FADE: not visible (filtered out)
    const opacityExpr: mapboxgl.ExpressionSpecification = [
      'case',
      // Fade in: year is in (startYear-FADE, startYear)
      ['<', year, ['get', 'startYear']],
        ['max', 0, ['/', ['-', year, ['-', ['get', 'startYear'], FADE]], FADE]],
      // Fade out: year is in (endYear, endYear+FADE)
      ['>', year, ['get', 'endYear']],
        ['max', 0, ['/', ['-', ['+', ['get', 'endYear'], FADE], year], FADE]],
      // Default: within the empire's span — full opacity
      1,
    ];

    // Editorial fill opacity (step 7) — 28% base, bumped to 40% on hover and
    // 44% on selected. Hover/selected boost is via feature-state, which only
    // works because the empires source uses promoteId: 'id'.
    const hoverBoost: mapboxgl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 0.44,
      ['boolean', ['feature-state', 'hover'], false], 0.40,
      0.28,
    ];
    // Resting opacities bumped (solid 0.7→0.85, dashed 0.5→0.65) so the
    // colored historical borders stay legible against the near-black basemap
    // — HN feedback flagged borders as nearly invisible at rest.
    const lineHoverBoost: mapboxgl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 1.0,
      ['boolean', ['feature-state', 'hover'], false], 0.95,
      0.85,
    ];
    const dashedHoverBoost: mapboxgl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 0.85,
      ['boolean', ['feature-state', 'hover'], false], 0.78,
      0.65,
    ];
    const lineWidthBoost: mapboxgl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2.5,
      ['boolean', ['feature-state', 'hover'], false], 2.0,
      1.5,
    ];
    const dashedWidthBoost: mapboxgl.ExpressionSpecification = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2.0,
      ['boolean', ['feature-state', 'hover'], false], 1.6,
      1.2,
    ];

    m.setPaintProperty('empire-fill', 'fill-opacity', ['*', opacityExpr, hoverBoost]);
    m.setPaintProperty('empire-border-solid', 'line-opacity', ['*', opacityExpr, lineHoverBoost]);
    m.setPaintProperty('empire-border-solid', 'line-width', lineWidthBoost);
    m.setPaintProperty('empire-border-dashed', 'line-opacity', ['*', opacityExpr, dashedHoverBoost]);
    m.setPaintProperty('empire-border-dashed', 'line-width', dashedWidthBoost);
    m.setPaintProperty('empire-label', 'text-opacity', ['*', opacityExpr, 0.8]);
    if (m.getLayer('empire-border-selected')) {
      m.setPaintProperty('empire-border-selected', 'line-opacity', [
        '*', opacityExpr,
        ['case', ['boolean', ['feature-state', 'selected'], false], 0.6, 0],
      ]);
    }
    }

    // ——— Filter cities to only show ones that exist at the current year ———
    if (hasCities) {
    const cityFilter: mapboxgl.FilterSpecification = [
      'all',
      ['<=', ['get', 'foundedYear'], year],
      ['any',
        ['==', ['get', 'endYear'], null],
        ['>=', ['get', 'endYear'], year],
      ],
    ];

    m.setFilter('city-labels', cityFilter);
    m.setFilter('city-dots', cityFilter);
    if (m.getLayer('city-hit')) m.setFilter('city-hit', cityFilter);

    // Fade cities in over 50 years after founding
    const CITY_FADE = 50;
    const cityOpacityExpr: mapboxgl.ExpressionSpecification = [
      'min',
        ['/', ['-', year, ['get', 'foundedYear']], CITY_FADE],
        1,
    ];

    m.setPaintProperty('city-labels', 'text-opacity', ['*', cityOpacityExpr, 0.7]);
    m.setPaintProperty('city-dots', 'circle-opacity', ['*', cityOpacityExpr, 0.6]);
    }

    // ——— Update modern political borders opacity as timeline approaches present ———
    for (const layer of MODERN_BORDER_LAYERS) {
      if (!m.getLayer(layer.id)) continue;
      const opacity = computeModernBorderOpacity(year, layer.fadeStart, layer.fadeEnd, layer.maxOpacity);
      if (year < layer.fadeStart) {
        m.setLayoutProperty(layer.id, 'visibility', 'none');
      } else {
        m.setLayoutProperty(layer.id, 'visibility', 'visible');
        m.setPaintProperty(layer.id, layer.paintProperty, opacity);
      }
    }
  }, [currentYear, mapLoaded, bordersVersion]);

  // Show fallback when token is missing — keeps the rest of the UI usable
  if (!HAS_VALID_TOKEN) {
    return <MapboxTokenFallback />;
  }

  const notice = bordersError ?? tileError;

  return (
    <>
      <div id="map" ref={mapContainer} tabIndex={-1} className="absolute inset-0 w-full h-full" />
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 text-[11px] text-wars-muted whitespace-nowrap"
          style={{
            top: 64,
            background: 'oklch(0.20 0.014 250 / 0.92)',
            border: '1px solid var(--rule-strong)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span>{notice}</span>
          <span className="text-wars-faint">·</span>
          <button
            onClick={() => {
              if (bordersError) void retryHistoricalRef.current?.();
              else window.location.reload();
            }}
            className="font-ui uppercase hover:text-wars-text transition-colors"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.04em',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--amber)',
            }}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
});

export default memo(MapView);
