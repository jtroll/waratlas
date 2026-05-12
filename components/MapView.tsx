'use client';

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import { ActiveConflict, Conflict, ScreenPosition } from '@/lib/types';
import { MapboxTokenFallback } from './ErrorBoundary';

interface MapViewProps {
  activeConflicts: ActiveConflict[];
  currentYear: number;
  onConflictClick: (conflict: Conflict) => void;
  onConflictDotClick: (conflict: Conflict) => void;
  selectedConflictId: string | null;
  onZoomChange: (zoom: number) => void;
  onMapMove: () => void;
  /** Called when the user clicks a city dot. Receives the city's coordinates. */
  onCityClick?: (coords: [number, number]) => void;
  /** Called when the user clicks an empire polygon. Receives the empire's
   *  feature properties (plus a computed bbox). Conflict-marker clicks take
   *  precedence — if a conflict dot is at the same point, this won't fire. */
  onEmpireClick?: (empire: import('./EmpireSidebar').EmpireProperties) => void;
  /** id of the currently-selected empire (so we can tone the polygon). */
  selectedEmpireId?: string | null;
}

export interface MapViewHandle {
  project: (lngLat: [number, number]) => ScreenPosition | null;
  getZoom: () => number;
  /** Fly the map to fit the given bounding box. Used by the opening tour to
   *  pan the camera to the area being discussed on each stop. The padding
   *  leaves room for the tour card pinned to the bottom of the screen. */
  flyToBbox: (bbox: [number, number, number, number]) => void;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE';
const HAS_VALID_TOKEN = MAPBOX_TOKEN && MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN_HERE' && MAPBOX_TOKEN.length > 20;

/** Compute a [minLon, minLat, maxLon, maxLat] bbox from a GeoJSON geometry.
 *  Used by the empire click handler to enrich the EmpireSidebar payload. */
function computeBbox(g: GeoJSON.Geometry): [number, number, number, number] | undefined {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (c: any): void => {
    if (typeof c[0] === 'number') {
      const [x, y] = c as [number, number];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else {
      for (const child of c) visit(child);
    }
  };
  if ('coordinates' in g) visit(g.coordinates as any);
  if (!isFinite(minX)) return undefined;
  return [minX, minY, maxX, maxY];
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

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  {
    activeConflicts,
    currentYear,
    onConflictClick,
    onConflictDotClick,
    selectedConflictId,
    onZoomChange,
    onMapMove,
    onCityClick,
    onEmpireClick,
    selectedEmpireId,
  },
  ref
) {
  const onCityClickRef = useRef(onCityClick);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);
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
    flyToBbox: (bbox: [number, number, number, number]) => {
      const m = map.current;
      if (!m) return;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
      // Padding pushes the focal region above the bottom-anchored tour card.
      // Mobile uses a lighter bottom padding than before — heavy padding made
      // fitBounds unable to satisfy the welcome stop (world view) under the
      // map's minZoom (1.5), so the call silently no-op'd.
      const padding = isMobile
        ? { top: 50, bottom: 320, left: 16, right: 16 }
        : { top: 70, bottom: 320, left: 60, right: 60 };
      const bounds: [[number, number], [number, number]] = [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ];
      // Use cameraForBounds → easeTo so the call is robust to padding that
      // exceeds the map size (which fitBounds rejects). cameraForBounds
      // returns the best-fit camera Mapbox can offer.
      const run = () => {
        try {
          const cam = m.cameraForBounds(bounds, { padding, maxZoom: 5 });
          if (cam) {
            m.easeTo({ ...cam, duration: 1100, essential: true });
          } else {
            // Fallback: just centre on the bbox at a reasonable zoom.
            const cx = (bbox[0] + bbox[2]) / 2;
            const cy = (bbox[1] + bbox[3]) / 2;
            m.easeTo({ center: [cx, cy], zoom: 2, duration: 1100, essential: true });
          }
        } catch (err) {
          // Surface errors instead of silently swallowing so we notice
          // regressions in production logs.
          // eslint-disable-next-line no-console
          console.warn('flyToBbox failed', err);
        }
      };
      // If the style hasn't loaded yet, wait for it. Otherwise camera ops
      // can race the load event and get clobbered.
      if (m.isStyleLoaded()) run();
      else m.once('load', run);
    },
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!HAS_VALID_TOKEN) return;  // fallback handled in render

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 30],
      zoom: 2,
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

    m.on('load', async () => {
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

      // ——— Fetch data files at runtime ———
      const [citiesData, empiresData] = await Promise.all([
        fetch('/cities.json').then(r => r.json()),
        fetch('/empires.json').then(r => r.json()),
      ]);

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
          'text-color': 'rgba(200, 200, 210, 0.7)',
          'text-halo-color': 'rgba(10, 14, 23, 0.9)',
          'text-halo-width': 1.5,
          'text-opacity': 0, // set dynamically
        },
      });

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
          'circle-color': 'rgba(200, 200, 210, 0.5)',
          'circle-opacity': 0, // set dynamically
        },
      });

      // ——— Add historical empire borders ———
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
      const labelFeatures: GeoJSON.Feature[] = (empiresData as GeoJSON.FeatureCollection).features
        .filter((f) => f.properties && (f.properties as any).labelPoint)
        .map((f) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: (f.properties as any).labelPoint as [number, number],
          },
          properties: f.properties,
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
      });

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
      });

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
      });

      // Empire label — uses the dedicated Point source so each empire gets exactly ONE label
      // Initial filter is impossible-to-match so no labels show until currentYear effect runs
      m.addLayer({
        id: 'empire-label',
        type: 'symbol',
        source: 'empire-labels',
        filter: ['==', ['get', 'startYear'], 999999],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.18,
          'text-max-width': 10,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-opacity': 0,
          'text-halo-color': 'rgba(0, 0, 0, 0.8)',
          'text-halo-width': 1.5,
        },
      });

      // ——— Conflict layers (on top of empires) ———
      m.addSource('conflicts', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // ─── 3-layer conflict markers (step 7 of redesign) ───────────────
      // NOTE: Mapbox GL JS 3.3 does not parse oklch() color literals; that
      // landed in 3.5. So these layers use the rgba() equivalents of the
      // editorial palette tokens. The empire fill/border layers escape this
      // because their `color` is data-driven (hex strings stored on the
      // feature properties) — only inline color literals had to be rewritten.
      //
      // Palette equivalents:
      //   --vermilion oklch(0.62 0.18 28) ≈ rgba(200, 85, 59, 1)
      //   --amber     oklch(0.78 0.14 78) ≈ rgba(217, 153, 67, 1)
      //   --ink-text  oklch(0.94 0.012 85) ≈ rgba(236, 227, 211, 1)
      //   --ink-0     oklch(0.10 0.012 250) ≈ rgba(14, 18, 24, 1)

      // Outer breathing ring — soft 10% vermilion fill, big radius
      m.addLayer({
        id: 'conflict-glow',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'importance'],
            1, 10, 3, 18, 5, 30,
          ],
          'circle-color': 'rgb(200, 85, 59)',
          'circle-opacity': ['*', ['get', 'opacity'], 0.10],
          'circle-blur': 1.1,
        },
      });

      // Mid ring — 1px stroke, transparent fill
      m.addLayer({
        id: 'conflict-mid',
        type: 'circle',
        source: 'conflicts',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'importance'],
            1, 6, 3, 10, 5, 16,
          ],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-width': 1,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'isSelected'], true], 'rgba(217, 153, 67, 0.85)',
            'rgba(200, 85, 59, 0.7)',
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
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'importance'],
            1, 4, 3, 6.5, 5, 10,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'isSelected'], true], 'rgb(217, 153, 67)',
            'rgb(200, 85, 59)',
          ],
          'circle-opacity': ['get', 'opacity'],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'isSelected'], true], 1.5, 0.5,
          ],
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'isSelected'], true], 'rgba(236, 227, 211, 0.6)',
            'rgba(14, 18, 24, 0.7)',
          ],
          'circle-stroke-opacity': ['get', 'opacity'],
        },
      });

      // Pulse — extra soft halo for world-changing conflicts only
      m.addLayer({
        id: 'conflict-pulse',
        type: 'circle',
        source: 'conflicts',
        filter: ['>=', ['get', 'importance'], 5],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'importance'], 5, 18],
          'circle-color': 'rgb(200, 85, 59)',
          'circle-opacity': ['*', ['get', 'opacity'], 0.08],
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
        onConflictDotClick(conflict);
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

      // City click: open the city-name-timeline modal
      m.on('click', 'city-dots', (e) => {
        if (e.features?.[0]?.geometry?.type === 'Point') {
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          if (onCityClickRef.current) {
            e.originalEvent.stopPropagation();
            onCityClickRef.current(coords);
          }
        }
      });
      m.on('mouseenter', 'city-dots', () => {
        m.getCanvas().style.cursor = 'pointer';
      });
      m.on('mouseleave', 'city-dots', () => {
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

        // Compute a bbox for the clicked feature using the rendered geometry.
        // (We could pre-store bboxes on properties, but rendering-time is fine
        //  since this only runs on click.)
        let bbox: [number, number, number, number] | undefined;
        try {
          const g = feats[0].geometry as GeoJSON.Geometry;
          bbox = computeBbox(g);
        } catch {
          /* swallow — bbox is optional in the sidebar UI */
        }

        const empireProps = {
          id: String(props.id),
          name: String(props.name ?? ''),
          startYear: Number(props.startYear ?? 0),
          endYear: props.endYear == null ? null : Number(props.endYear),
          color: typeof props.color === 'string' ? props.color : undefined,
          accurate: props.accurate === true,
          borderStyle: props.borderStyle === 'dashed' ? 'dashed' as const : props.borderStyle === 'solid' ? 'solid' as const : undefined,
          source: typeof props.source === 'string' ? props.source : undefined,
          borderYear:
            typeof props.borderYear === 'number'
              ? props.borderYear
              : typeof props.borderYear === 'string'
                ? Number(props.borderYear)
                : undefined,
          matchedRegion: typeof props.matchedRegion === 'string' ? props.matchedRegion : undefined,
          handCraftedNote: typeof props.handCraftedNote === 'string' ? props.handCraftedNote : undefined,
          bbox,
        };

        if (onEmpireClickRef.current) {
          e.originalEvent.stopPropagation();
          onEmpireClickRef.current(empireProps);
        }
      });

      setMapLoaded(true);
    });

    m.on('zoom', () => {
      onZoomChange(m.getZoom());
      onMapMove();
    });
    m.on('move', () => {
      onMapMove();
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Update conflict points
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
          isSelected: c.id === selectedConflictId,
          casualties: c.casualties,
        },
      })),
    };

    const source = map.current.getSource('conflicts') as mapboxgl.GeoJSONSource;
    if (source) source.setData(geojson);
  }, [activeConflicts, selectedConflictId, mapLoaded]);

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

    m.setFilter('empire-fill', filter);
    m.setFilter('empire-border-solid', ['all', ...filter.slice(1), ['==', ['get', 'accurate'], true]]);
    m.setFilter('empire-border-dashed', ['all', ...filter.slice(1), ['!=', ['get', 'accurate'], true]]);
    m.setFilter('empire-label', filter);

    // Opacity: full (1.0) within the empire's actual span, fading in/out
    // for FADE years before/after. This way an empire of duration 3 still
    // shows at full opacity throughout its actual existence.
    //
    // - year < startYear - FADE: not visible (filtered out)
    // - startYear - FADE <= year < startYear: fading in (0 → 1)
    // - startYear <= year <= endYear: full opacity (1)
    // - endYear < year <= endYear + FADE: fading out (1 → 0)
    // - year > endYear + FADE: not visible (filtered out)
    const opacityExpr: mapboxgl.Expression = [
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
    const hoverBoost: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 0.44,
      ['boolean', ['feature-state', 'hover'], false], 0.40,
      0.28,
    ];
    const lineHoverBoost: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 1.0,
      ['boolean', ['feature-state', 'hover'], false], 0.95,
      0.7,
    ];
    const dashedHoverBoost: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 0.85,
      ['boolean', ['feature-state', 'hover'], false], 0.78,
      0.5,
    ];
    const lineWidthBoost: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2.5,
      ['boolean', ['feature-state', 'hover'], false], 2.0,
      1.5,
    ];
    const dashedWidthBoost: mapboxgl.Expression = [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2.0,
      ['boolean', ['feature-state', 'hover'], false], 1.6,
      1.2,
    ];

    m.setPaintProperty('empire-fill', 'fill-opacity', ['*', opacityExpr as any, hoverBoost as any]);
    m.setPaintProperty('empire-border-solid', 'line-opacity', ['*', opacityExpr as any, lineHoverBoost as any]);
    m.setPaintProperty('empire-border-solid', 'line-width', lineWidthBoost as any);
    m.setPaintProperty('empire-border-dashed', 'line-opacity', ['*', opacityExpr as any, dashedHoverBoost as any]);
    m.setPaintProperty('empire-border-dashed', 'line-width', dashedWidthBoost as any);
    m.setPaintProperty('empire-label', 'text-opacity', ['*', opacityExpr as any, 0.75]);

    // ——— Filter cities to only show ones that exist at the current year ———
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

    // Fade cities in over 50 years after founding
    const CITY_FADE = 50;
    const cityOpacityExpr: mapboxgl.Expression = [
      'min',
        ['/', ['-', year, ['get', 'foundedYear']], CITY_FADE],
        1,
    ];

    m.setPaintProperty('city-labels', 'text-opacity', ['*', cityOpacityExpr as any, 0.7]);
    m.setPaintProperty('city-dots', 'circle-opacity', ['*', cityOpacityExpr as any, 0.5]);

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
  }, [currentYear, mapLoaded]);

  // Show fallback when token is missing — keeps the rest of the UI usable
  if (!HAS_VALID_TOKEN) {
    return <MapboxTokenFallback />;
  }

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" />;
});

export default MapView;
