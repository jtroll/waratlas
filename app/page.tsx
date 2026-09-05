'use client';

import { memo, useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Conflict, ActiveConflict, ConflictTextMap, TimelineState } from '@/lib/types';
import {
  getActiveConflicts,
  getAutoSpeed,
  conflictCitation,
  buildYearIndex,
  buildConflictRelations,
  mergeConflictText,
  isConflictActiveAt,
  stepConflict,
  getYearEvents,
} from '@/lib/conflicts';
import { deathsInYear, cumulativeDeathsThrough } from '@/lib/casualty-rate';
import { DATA_URLS } from '@/lib/data-urls';
import { parseHash, buildHash, EMPTY_HASH, type HashState, type CameraState } from '@/lib/hash';
import { getExhibit } from '@/lib/exhibits';
import type { EmpireSearchEntry, CitySearchFeature } from '@/lib/search';
import { playbackStore } from '@/lib/playback-store';
import idRedirects from '@/lib/generated/id-redirects.json';
import MapView, { type MapViewHandle, type FlyToConflictOptions } from '@/components/MapView';
import Timeline from '@/components/Timeline';
import Sidebar from '@/components/Sidebar';
import InfoBoxLayer from '@/components/InfoBoxLayer';
import TopBar from '@/components/TopBar';
import ConflictListPanel from '@/components/ConflictListPanel';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorBoundary, { DataLoadError } from '@/components/ErrorBoundary';
import BorderLegend from '@/components/BorderLegend';
import DisputedTerritoryNote from '@/components/DisputedTerritoryNote';
import EraPanel from '@/components/EraPanel';
import ExportMenu from '@/components/ExportMenu';
import OpeningTour from '@/components/OpeningTour';
import FilterPanel, { ConflictFilters, DEFAULT_FILTERS, isDefaultFilters, regionBboxFor } from '@/components/FilterPanel';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import CityTimelineModal, { type CityCollection } from '@/components/CityTimelineModal';
import MobileTabDock, { useMobileTab } from '@/components/MobileTabDock';
import EmpireSidebar, { type EmpireProperties } from '@/components/EmpireSidebar';
import SkipLink from '@/components/SkipLink';
import YearLedger from '@/components/YearLedger';
import CommandPalette from '@/components/CommandPalette';
import { empireFamilyIds } from '@/lib/format';
const MAX_YEAR = new Date().getFullYear();

// Components we don't own but render with stable props — memoised here so
// they skip the per-integer-year commits during playback.
const MemoBorderLegend = memo(BorderLegend);
const MemoDisputedTerritoryNote = memo(DisputedTerritoryNote);
const MemoEraPanel = memo(EraPanel);
const MemoMobileTabDock = memo(MobileTabDock);
const MemoCityTimelineModal = memo(CityTimelineModal);

type EmpireIndexEntry = EmpireSearchEntry;
const DEFAULT_EXHIBIT = 'welcome';
const TOUR_SEEN_KEY = 'wars-atlas-tour-seen';
// Old conflict id → new id for merged / renamed records (generated from
// scripts/data/id_redirects.json by scripts/build-data.mjs).
const ID_REDIRECTS: Record<string, string> = idRedirects;

/** Viewport insets (px) covered by the open right-side panel, so fly-to
 *  can centre a point in the part of the map the user can actually see.
 *  Desktop: the 460px sidebar plus the TopBar / Timeline strips. Mobile:
 *  the 72dvh bottom sheet. */
function panelInset(panelOpen: boolean): FlyToConflictOptions['inset'] {
  if (typeof window === 'undefined') return {};
  const mobile = window.innerWidth < 640;
  if (mobile) {
    return { top: 56, bottom: panelOpen ? Math.round(window.innerHeight * 0.72) : 160 };
  }
  return { top: 60, bottom: 140, right: panelOpen ? 460 : 0 };
}

/** Empire bbox fly padding: leave the right-side flyout uncovered. */
function empireFlyPadding(): { top: number; bottom: number; left: number; right: number } {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return mobile
    ? { top: 60, bottom: Math.round(window.innerHeight * 0.72) + 16, left: 16, right: 16 }
    : { top: 80, bottom: 160, left: 40, right: 500 };
}

function resolveConflictId(id: string): string {
  let cur = id;
  for (let i = 0; i < 8; i++) {
    const next = ID_REDIRECTS[cur];
    if (!next || next === cur) break;
    cur = next;
  }
  return cur;
}

// "Seen the tour" is a first-visit flag, so it lives in localStorage (one
// tour per browser, not per tab). sessionStorage is the fallback when
// localStorage is blocked.
function readTourSeen(): boolean {
  try {
    if (window.localStorage.getItem(TOUR_SEEN_KEY)) return true;
  } catch {
    // localStorage unavailable — fall through
  }
  try {
    return !!window.sessionStorage.getItem(TOUR_SEEN_KEY);
  } catch {
    return false;
  }
}
function markTourSeen(): void {
  try {
    window.localStorage.setItem(TOUR_SEEN_KEY, '1');
    return;
  } catch {
    // fall through to sessionStorage
  }
  try {
    window.sessionStorage.setItem(TOUR_SEEN_KEY, '1');
  } catch {
    // storage unavailable — the tour will show again next visit
  }
}

export default function Home() {
  // Core records (no long-text fields) arrive first and render the map;
  // the text file is merged in later (see conflicts below).
  const [coreConflicts, setCoreConflicts] = useState<Conflict[]>([]);
  const [textMap, setTextMap] = useState<ConflictTextMap | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  // Non-null once conflicts.json fails (network, non-2xx, malformed JSON).
  // Bumping loadAttempt re-runs the fetch.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  // Parsed synchronously from a lazy state initializer at mount, so the
  // values are captured before any effect can rewrite the hash.
  const [initialHash] = useState<HashState>(() =>
    typeof window !== 'undefined'
      ? parseHash(window.location.hash)
      : EMPTY_HASH,
  );

  const [timeline, setTimeline] = useState<TimelineState>({
    currentYear: -3000,
    isPlaying: false,
    playbackSpeed: 10,
    speedMode: 'auto',
    minYear: -3000,
    maxYear: MAX_YEAR,
  });

  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // Which curated exhibit the tour is running (lib/exhibits.ts). Written to
  // the hash as `exhibit=` only while the tour is open.
  const [tourExhibitId, setTourExhibitId] = useState<string | null>(null);
  // The Tour button's exhibit menu (a popover on desktop, a sheet on
  // mobile — the dock's Tour tab opens the same one).
  const [exhibitMenuOpen, setExhibitMenuOpen] = useState(false);
  // Command palette (⌘K / Ctrl-K / `/`): global search across all years.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Shown after the user finishes (rather than skips) the opening tour — a
  // small affordance pointing them at the Play button. Cleared when they
  // press Play, or on next tour finish.
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const [filters, setFilters] = useState<ConflictFilters>(DEFAULT_FILTERS);
  // Hidden-chrome mode (toggled with `t`). When true, all map-overlay UI
  // (Era panel, BorderLegend, FilterPanel, Tour/Live/Export/(?), Mapbox
  // zoom chip) is hidden so the user can see the bare map. The Mapbox
  // attribution chip stays (required by Mapbox's terms). The TopBar stat
  // tallies (active / mapped) stay visible and naturally shift to the
  // right edge because the chrome to their right disappears.
  const [chromeHidden, setChromeHidden] = useState(false);
  const [cityClickCoords, setCityClickCoords] = useState<[number, number] | null>(null);
  const [citiesData, setCitiesData] = useState<CityCollection | null>(null);
  // Empire detail flyout — mutually exclusive with the conflict sidebar.
  // Only one right-side panel is open at a time.
  const [selectedEmpire, setSelectedEmpire] = useState<EmpireProperties | null>(null);
  // Short-lived mobile toast (e.g. "Citation copied").
  const [toast, setToast] = useState<string | null>(null);
  // FilterPanel open state lives here so the mobile dock's Search tab can
  // open the sheet and Escape can close it.
  const [filterOpen, setFilterOpen] = useState(false);
  // The conflict the user was reading before the current one (related-
  // conflict clicks, list rows, [ / ] stepping). Rendered as a "← Previous"
  // chip under the TopBar.
  const [previousSelection, setPreviousSelection] = useState<Conflict | null>(null);
  // Historical layers (empires + cities) are on the map — getEmpire() works.
  const [empiresReady, setEmpiresReady] = useState(false);
  const handleHistoricalLoad = useCallback(() => setEmpiresReady(true), []);
  // A `conflict=` deep link waits here until the map can fly to it.
  const deepLinkConflictRef = useRef<Conflict | null>(null);

  // Load the core conflicts data at runtime instead of bundling
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    fetch(DATA_URLS.conflictsCore)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('conflicts data is not a non-empty array');
        }
        const list = data as Conflict[];
        setCoreConflicts(list);
        setDataLoaded(true);
        const minY = Math.min(...list.map(c => c.startYear));
        let initialYear = initialHash.year ?? minY;
        // If a conflict is specified, jump to its start year and open the
        // sidebar in the same commit as the data — no timeout to race.
        if (initialHash.conflictId) {
          const targetId = resolveConflictId(initialHash.conflictId);
          const target = list.find(c => c.id === targetId);
          if (target) {
            initialYear = target.startYear;
            setSelectedEmpire(null);
            setSelectedConflict(target);
            setSidebarOpen(true);
            deepLinkConflictRef.current = target;
          }
        }
        setTimeline(prev => ({
          ...prev,
          currentYear: Math.max(minY, Math.min(MAX_YEAR, initialYear)),
          minYear: minY,
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('War Atlas: failed to load conflicts data', err);
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, initialHash]);

  // Loading screen lifts once the data is in AND the map style has loaded
  // (or 4 s have passed — e.g. no token, blocked tiles), instead of a
  // fixed 800 ms guess.
  const [mapReady, setMapReady] = useState(false);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
  const handleMapLoad = useCallback(() => setMapStyleLoaded(true), []);
  useEffect(() => {
    if (!dataLoaded) return;
    if (mapStyleLoaded) {
      setMapReady(true);
      return;
    }
    const timer = setTimeout(() => setMapReady(true), 4000);
    return () => clearTimeout(timer);
  }, [dataLoaded, mapStyleLoaded]);

  // `#conflict=` deep link: once the data AND the map style are in, fly to
  // the conflict (the sidebar is already open from the data commit).
  useEffect(() => {
    if (!dataLoaded || !mapStyleLoaded) return;
    const target = deepLinkConflictRef.current;
    if (!target) return;
    deepLinkConflictRef.current = null;
    // With a `lat/lon/zoom` camera in the same link the map was created on
    // that framing; only move if the conflict would otherwise be hidden.
    const framed = initialHash.camera != null;
    mapRef.current?.flyToConflict(target, { pan: !framed, inset: panelInset(true) });
  }, [dataLoaded, mapStyleLoaded, initialHash.camera]);

  // `#empire=` deep link: needs the empire feature properties, which live
  // in MapView once empires.json has loaded. Select it and fit its bbox.
  const empireDeepLinkDoneRef = useRef(false);
  useEffect(() => {
    if (!dataLoaded || !empiresReady || empireDeepLinkDoneRef.current) return;
    const id = initialHash.empireId;
    if (!id) return;
    empireDeepLinkDoneRef.current = true;
    const empire = mapRef.current?.getEmpire(id);
    if (!empire) return;
    setSidebarOpen(false);
    setSelectedConflict(null);
    setSelectedEmpire(empire);
    if (initialHash.year == null) {
      setTimeline((prev) => ({
        ...prev,
        currentYear: Math.max(prev.minYear, Math.min(MAX_YEAR, empire.startYear)),
        isPlaying: false,
      }));
    }
    if (empire.bbox) {
      mapRef.current?.flyToBbox(empire.bbox, { padding: empireFlyPadding(), maxZoom: 5 });
    }
  }, [dataLoaded, empiresReady, initialHash]);

  // Long-text fields (description / hook / narrative / significance /
  // sources) live in a separate file so the map can paint without them.
  // Fetch once the map is ready, or as soon as something needs the text —
  // the sidebar, the list panel or a search term — whichever comes first.
  // A failed fetch is retried the next time one of those triggers changes.
  const textStatusRef = useRef<'idle' | 'loading' | 'done'>('idle');
  const needText =
    mapReady || sidebarOpen || listPanelOpen || paletteOpen || filters.search.trim() !== '';
  useEffect(() => {
    if (!dataLoaded || !needText || textStatusRef.current !== 'idle') return;
    textStatusRef.current = 'loading';
    let cancelled = false;
    fetch(DATA_URLS.conflictsText)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('conflicts text is not an object');
        }
        textStatusRef.current = 'done';
        setTextMap(data as ConflictTextMap);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('War Atlas: failed to load conflict text', err);
        textStatusRef.current = 'idle';
      });
    return () => {
      cancelled = true;
      if (textStatusRef.current === 'loading') textStatusRef.current = 'idle';
    };
  }, [dataLoaded, needText]);

  // The records everything renders from. Built once per (core, text) pair:
  // new objects only for records that gain text, in one pass.
  const conflicts = useMemo(
    () => (textMap ? mergeConflictText(coreConflicts, textMap) : coreConflicts),
    [coreConflicts, textMap],
  );
  const conflictById = useMemo(() => {
    const m = new Map<string, Conflict>();
    for (const c of conflicts) m.set(c.id, c);
    return m;
  }, [conflicts]);
  // Keep the selection pointing at the current record object so the open
  // sidebar sees the merged text fields.
  useEffect(() => {
    setSelectedConflict((prev) => {
      if (!prev) return prev;
      const next = conflictById.get(prev.id);
      return next && next !== prev ? next : prev;
    });
  }, [conflictById]);

  // Per-dataset indexes: O(1) auto-speed + fast active-set lookups for the
  // playback loop, and parent/child relations for the sidebar graph.
  const yearIndex = useMemo(() => (conflicts.length ? buildYearIndex(conflicts) : null), [conflicts]);
  const relations = useMemo(() => (conflicts.length ? buildConflictRelations(conflicts) : null), [conflicts]);

  // Load cities once for the timeline modal lookup
  useEffect(() => {
    fetch(DATA_URLS.cities)
      .then((r) => (r.ok ? (r.json() as Promise<CityCollection>) : null))
      .then((d) => setCitiesData(d && Array.isArray(d.features) ? d : null))
      .catch(() => {});
  }, []);

  // Lightweight empire index (name + year range) for the command palette.
  // Full empire geometry loads (and is parsed) exactly once, inside
  // MapView; this is the ~40 KB build-time index of the same features, so
  // search can find an empire by name even when the timeline is parked in
  // a completely different era.
  const [empireIndex, setEmpireIndex] = useState<EmpireIndexEntry[]>([]);
  useEffect(() => {
    fetch(DATA_URLS.empiresIndex)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((d) => {
        // Contract: [{ id, name, startYear, endYear }]. Tolerate a
        // FeatureCollection too so a stale manifest can't blank the index.
        const rows: unknown[] = Array.isArray(d)
          ? d
          : Array.isArray((d as { features?: unknown } | null)?.features)
            ? ((d as { features: unknown[] }).features.map(
                (f) => (f as { properties?: unknown }).properties ?? {},
              ))
            : [];
        setEmpireIndex(
          rows.map((row) => {
            const p = (row ?? {}) as { id?: unknown; name?: unknown; startYear?: unknown; endYear?: unknown };
            return {
              id: typeof p.id === 'string' ? p.id : undefined,
              name: String(p.name ?? ''),
              startYear: Number(p.startYear ?? 0),
              endYear: p.endYear == null ? null : Number(p.endYear),
            };
          }),
        );
      })
      .catch(() => {});
  }, []);

  // Active set for the current integer year.
  //
  // Keyed on the *rounded* year, not the raw float. During auto-play the
  // float advances ~60×/sec in a ref (see the playback loop) and React
  // state only changes when the integer year does, so this — and the
  // GeoJSON push into Mapbox downstream — runs at most once per integer
  // year crossed, while leaving the fade math intact.
  const renderYear = Math.round(timeline.currentYear);
  const activeConflicts = useMemo<ActiveConflict[]>(
    () => getActiveConflicts(renderYear, conflicts, yearIndex),
    [renderYear, conflicts, yearIndex],
  );

  // Apply user filters on top of year-active filtering
  const filteredActiveConflicts = useMemo(() => {
    if (isDefaultFilters(filters)) return activeConflicts;
    const bbox = regionBboxFor(filters.region);
    const search = filters.search.toLowerCase().trim();
    return activeConflicts.filter((c) => {
      if (c.importance < filters.minImportance) return false;
      if (filters.minDurationYears > 0) {
        const dur = (c.endYear ?? c.startYear) - c.startYear;
        if (dur < filters.minDurationYears) return false;
      }
      if (bbox) {
        const [lon, lat] = c.coordinates;
        if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) return false;
      }
      if (search) {
        const hay = [c.name, c.description, ...(c.countries ?? []), ...(c.locations ?? [])]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [activeConflicts, filters]);

  // Fully-active subsets (opacity 1, not fading) — computed once per active
  // set instead of once per consumer per render.
  const activeNow = useMemo(
    () => activeConflicts.filter((c) => c.isActive),
    [activeConflicts],
  );
  const filteredActiveNow = useMemo(
    () => (filteredActiveConflicts === activeConflicts
      ? activeNow
      : filteredActiveConflicts.filter((c) => c.isActive)),
    [filteredActiveConflicts, activeConflicts, activeNow],
  );
  // Ordered (by displayPriority) list the [ / ] shortcuts step through.
  const stepListRef = useRef<ActiveConflict[]>(filteredActiveNow);
  stepListRef.current = filteredActiveNow;

  // Track whether we were playing before a selection (for auto-resume)
  const wasPlayingRef = useRef(false);
  const mapRef = useRef<MapViewHandle>(null);
  const animFrameRef = useRef<number>();
  // Float playback year. The rAF loop advances this every frame and mirrors
  // it into the playback store (for the Timeline playhead); React state gets
  // the integer year only when it changes.
  const playYearRef = useRef<number>(timeline.currentYear);
  // Latest state / indexes for the playback loop — the effect is keyed on
  // isPlaying only, so it reads through refs instead of stale closures.
  const timelineRef = useRef<TimelineState>(timeline);
  timelineRef.current = timeline;
  const conflictsRef = useRef<Conflict[]>(conflicts);
  conflictsRef.current = conflicts;
  const yearIndexRef = useRef(yearIndex);
  yearIndexRef.current = yearIndex;
  // Latest year for handlers that need it without re-subscribing.
  const currentYearRef = useRef(timeline.currentYear);
  currentYearRef.current = timeline.currentYear;
  // Year the user was on when the tour opened — restored on Skip.
  const tourReturnYearRef = useRef<number | null>(null);

  // Opening the tour (first visit, Tour button, mobile dock) remembers the
  // year so Skip can put the user back where they were.
  const openTour = useCallback((exhibitId: string = DEFAULT_EXHIBIT) => {
    tourReturnYearRef.current = currentYearRef.current;
    setExhibitMenuOpen(false);
    setPaletteOpen(false);
    setTourExhibitId(getExhibit(exhibitId) ? exhibitId : DEFAULT_EXHIBIT);
    setTourOpen(true);
  }, []);
  const openDefaultTour = useCallback(() => openTour(DEFAULT_EXHIBIT), [openTour]);

  // Trigger the opening tour for first-time visitors (after data loads),
  // or the exhibit a `#exhibit=` deep link asks for (any visitor).
  useEffect(() => {
    if (!dataLoaded) return;
    if (initialHash.exhibitId && getExhibit(initialHash.exhibitId)) {
      const id = initialHash.exhibitId;
      const timer = setTimeout(() => openTour(id), 400);
      return () => clearTimeout(timer);
    }
    const hasYearHash = initialHash.year !== null || initialHash.conflictId !== null || initialHash.empireId !== null;
    if (readTourSeen() || hasYearHash) return;
    const timer = setTimeout(openDefaultTour, 800);
    return () => clearTimeout(timer);
  }, [dataLoaded, initialHash, openTour, openDefaultTour]);

  // URL hash + browser history.
  //
  // Selection changes (a conflict or empire opening/closing) are pushed so
  // browser Back returns to the previous panel; year scrubbing only
  // replaces the current entry (debounced) so a drag doesn't pile up
  // hundreds of entries. Gated on dataLoaded so the initial -3000 state
  // never overwrites a deep link before the data fetch has read it.
  const lastSelectionKeyRef = useRef<string | null>(null);
  // Set by the popstate handler: the next selection write comes from
  // history itself, so replace rather than push.
  const fromPopRef = useRef(false);
  // Last settled camera (moveend). Null until the user (or a fly-to) moves
  // the map, so a plain link stays short; seeded from a camera deep link
  // so a reload keeps its framing.
  const cameraRef = useRef<CameraState | null>(initialHash.camera);
  const exhibitForHash = tourOpen ? tourExhibitId : null;
  useEffect(() => {
    if (!dataLoaded) return;
    const year = Math.round(timeline.currentYear);
    const conflictId = selectedConflict?.id ?? null;
    const empireId = conflictId ? null : selectedEmpire?.id ?? null;
    const key = conflictId ? `c:${conflictId}` : empireId ? `e:${empireId}` : '';
    const hash = buildHash(year, conflictId, empireId, { exhibitId: exhibitForHash, camera: cameraRef.current });
    const state = { year, conflictId, empireId };
    const fromPop = fromPopRef.current;
    fromPopRef.current = false;

    if (lastSelectionKeyRef.current === null || key !== lastSelectionKeyRef.current) {
      const first = lastSelectionKeyRef.current === null;
      lastSelectionKeyRef.current = key;
      if (first || fromPop) window.history.replaceState(state, '', hash);
      else window.history.pushState(state, '', hash);
      return;
    }
    const timeout = setTimeout(() => {
      if (window.location.hash !== hash) window.history.replaceState(state, '', hash);
    }, 300);
    return () => clearTimeout(timeout);
  }, [dataLoaded, timeline.currentYear, selectedConflict, selectedEmpire, exhibitForHash]);

  // Camera deep link: after the map settles (`moveend`), rewrite the hash
  // with lat/lon/zoom — debounced 500 ms, replaceState only, so panning
  // never adds history entries. Reads the rest of the state through refs.
  const hashPartsRef = useRef({ year: 0, conflictId: null as string | null, empireId: null as string | null, exhibitId: null as string | null });
  hashPartsRef.current = {
    year: Math.round(timeline.currentYear),
    conflictId: selectedConflict?.id ?? null,
    empireId: selectedConflict ? null : selectedEmpire?.id ?? null,
    exhibitId: exhibitForHash,
  };
  useEffect(() => {
    if (!dataLoaded) return;
    const handle = mapRef.current;
    if (!handle) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = handle.onMoveEnd(() => {
      const cam = handle.getCamera();
      if (!cam) return;
      cameraRef.current = cam;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const parts = hashPartsRef.current;
        const hash = buildHash(parts.year, parts.conflictId, parts.empireId, { exhibitId: parts.exhibitId, camera: cam });
        if (window.location.hash !== hash) {
          window.history.replaceState({ year: parts.year, conflictId: parts.conflictId, empireId: parts.empireId }, '', hash);
        }
      }, 500);
    });
    return () => {
      unsub();
      if (t) clearTimeout(t);
    };
  }, [dataLoaded]);

  // Browser Back / Forward → restore that entry's selection and year.
  useEffect(() => {
    if (!dataLoaded) return;
    const onPop = (e: PopStateEvent) => {
      const raw = e.state as Partial<HashState> | null;
      const st: HashState =
        raw && ('conflictId' in raw || 'empireId' in raw || 'year' in raw)
          ? { ...EMPTY_HASH, year: raw.year ?? null, conflictId: raw.conflictId ?? null, empireId: raw.empireId ?? null }
          : parseHash(window.location.hash);
      fromPopRef.current = true;
      wasPlayingRef.current = false;
      setTimeline((prev) => ({
        ...prev,
        isPlaying: false,
        currentYear:
          st.year != null ? Math.max(prev.minYear, Math.min(MAX_YEAR, st.year)) : prev.currentYear,
      }));
      const conflict = st.conflictId ? conflictById.get(resolveConflictId(st.conflictId)) : undefined;
      if (conflict) {
        setSelectedEmpire(null);
        setSelectedConflict(conflict);
        setSidebarOpen(true);
        return;
      }
      const empire = st.empireId ? mapRef.current?.getEmpire(st.empireId) : undefined;
      setSidebarOpen(false);
      setSelectedConflict(null);
      setSelectedEmpire(empire ?? null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [dataLoaded, conflictById]);

  // "← Previous" chip: remember the conflict we navigated away from
  // (conflict → conflict only; closing the panel clears it).
  const lastSelectedRef = useRef<Conflict | null>(null);
  const selectedConflictIdForPrev = selectedConflict?.id ?? null;
  useEffect(() => {
    const prev = lastSelectedRef.current;
    if (selectedConflict) {
      if (prev && prev.id !== selectedConflict.id) setPreviousSelection(prev);
      lastSelectedRef.current = selectedConflict;
    } else {
      lastSelectedRef.current = null;
      setPreviousSelection(null);
    }
    // Keyed on the id: the text merge swaps the object without a navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConflictIdForPrev]);

  // Playback loop with auto-speed support.
  //
  // The float year lives in playYearRef and is advanced every animation
  // frame; each frame also writes it to the playback store, which only the
  // Timeline playhead subscribes to. React state (timeline.currentYear)
  // is committed only when Math.round(year) changes, so the page and its
  // subtree re-render once per integer year crossed rather than 60×/s.
  // getAutoSpeed reads the per-year index (O(1)) instead of scanning.
  //
  // useLayoutEffect so the store holds the loop's starting year before the
  // first paint after Play (matters for the restart-from-the-end case,
  // where the same commit moves the year to minYear).
  useLayoutEffect(() => {
    if (!timeline.isPlaying) return;

    playYearRef.current = timeline.currentYear;
    playbackStore.setYear(timeline.currentYear);
    let lastTime = performance.now();
    let lastCommitted = Math.round(timeline.currentYear);

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const st = timelineRef.current;

      const year = playYearRef.current;
      const speed = st.speedMode === 'auto'
        ? getAutoSpeed(year, yearIndexRef.current ?? conflictsRef.current)
        : st.playbackSpeed;

      const newYear = year + speed * delta;
      if (newYear >= st.maxYear) {
        playYearRef.current = st.maxYear;
        playbackStore.setYear(st.maxYear);
        setTimeline(prev => ({ ...prev, currentYear: prev.maxYear, isPlaying: false }));
        return;
      }
      playYearRef.current = newYear;
      playbackStore.setYear(newYear);

      const rounded = Math.round(newYear);
      if (rounded !== lastCommitted) {
        lastCommitted = rounded;
        setTimeline(prev => ({ ...prev, currentYear: rounded }));
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    // Only (re)start the loop when playback toggles — the year the loop
    // starts from is read at that moment; later state is read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.isPlaying]);

  const handlePlay = useCallback(() => {
    // Pressing Play also dismisses the post-tour "press Play" prompt.
    setShowPlayPrompt(false);
    setTimeline(prev => {
      const next = !prev.isPlaying;
      // If the user is manually pausing, drop the auto-resume intent so a
      // subsequent close doesn't override their explicit pause.
      if (!next) wasPlayingRef.current = false;
      // Play at the end of the timeline restarts from the beginning instead
      // of flickering the icon and stopping on the first tick.
      const restart = next && prev.currentYear >= prev.maxYear;
      return {
        ...prev,
        isPlaying: next,
        currentYear: restart ? prev.minYear : prev.currentYear,
      };
    });
  }, []);

  const handleYearChange = useCallback((year: number) => {
    // A scrub is an explicit pause — don't resume when a panel closes later.
    wasPlayingRef.current = false;
    setTimeline(prev => ({ ...prev, currentYear: year, isPlaying: false }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setTimeline(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);

  const handleSpeedModeChange = useCallback((mode: 'auto' | 'manual') => {
    setTimeline(prev => ({ ...prev, speedMode: mode }));
  }, []);

  // Open a conflict in the sidebar and pause the timeline. Also closes any
  // open empire flyout — only one right-side panel at a time.
  //
  // `pan: true` (list rows, related-conflict links, the filter navigator,
  // [ / ] stepping) always brings the dot into view and, if the conflict
  // isn't active at the current year, jumps the year to its start. The
  // default (callout "Details") only pans when the dot would be hidden —
  // off-screen or under the sidebar that is about to open.
  const handleConflictClick = useCallback((conflict: Conflict, opts?: { pan?: boolean }) => {
    const pan = opts?.pan ?? false;
    setTimeline(prev => {
      // Remember "was playing" across chained clicks. Only set the flag
      // when we're actually transitioning from playing → paused; never
      // overwrite it back to false (the close handler clears it).
      if (prev.isPlaying) wasPlayingRef.current = true;
      const year = pan && !isConflictActiveAt(conflict, Math.round(prev.currentYear))
        ? Math.max(prev.minYear, Math.min(MAX_YEAR, conflict.startYear))
        : prev.currentYear;
      return { ...prev, isPlaying: false, currentYear: year };
    });
    setSelectedEmpire(null);
    setSelectedConflict(conflict);
    setSidebarOpen(true);
    mapRef.current?.flyToConflict(conflict, { pan, inset: panelInset(true) });
  }, []);
  // Same, for components that call `onConflictClick(c)` with one argument
  // (Sidebar, EmpireSidebar, ConflictListPanel, FilterPanel navigator).
  const handleConflictNavigate = useCallback(
    (conflict: Conflict) => handleConflictClick(conflict, { pan: true }),
    [handleConflictClick],
  );
  const handlePreviousClick = useCallback(() => {
    if (previousSelection) handleConflictClick(previousSelection, { pan: true });
  }, [previousSelection, handleConflictClick]);

  // Click a dot on the map → select it (show its info box) but don't open sidebar
  const handleConflictDotClick = useCallback((conflict: Conflict) => {
    setTimeline(prev => {
      if (prev.isPlaying) wasPlayingRef.current = true;
      return { ...prev, isPlaying: false };
    });
    setSelectedConflict(conflict);
  }, []);

  // Close sidebar → deselect, resume playing if we were before
  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedConflict(null);
    if (wasPlayingRef.current) {
      setTimeline(prev => ({ ...prev, isPlaying: true }));
      wasPlayingRef.current = false;
    }
  }, []);

  // Click an empire polygon → open the empire flyout, close any conflict sidebar.
  const handleEmpireClick = useCallback((empire: EmpireProperties) => {
    setTimeline(prev => {
      if (prev.isPlaying) wasPlayingRef.current = true;
      return { ...prev, isPlaying: false };
    });
    setSidebarOpen(false);
    setSelectedConflict(null);
    setSelectedEmpire(empire);
  }, []);

  const handleCloseEmpire = useCallback(() => {
    setSelectedEmpire(null);
    if (wasPlayingRef.current) {
      setTimeline(prev => ({ ...prev, isPlaying: true }));
      wasPlayingRef.current = false;
    }
  }, []);

  // Jump to live (present day)
  const handleJumpToLive = useCallback(() => {
    wasPlayingRef.current = false;
    setTimeline(prev => ({
      ...prev,
      currentYear: MAX_YEAR,
      isPlaying: false,
    }));
    setSelectedConflict(null);
    setSidebarOpen(false);
  }, []);

  const handleCityClick = useCallback((coords: [number, number]) => {
    setCityClickCoords(coords);
  }, []);
  const handleCloseCityModal = useCallback(() => setCityClickCoords(null), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      // ⌘K / Ctrl-K opens the palette from anywhere, inputs included (the
      // palette closes itself on the same chord). Not while the tour runs.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        // Not over the tour or another modal (About, city names) — the
        // palette closes itself on the same chord.
        if (tourOpen || cityClickCoords || document.querySelector('[aria-modal="true"]')) return;
        e.preventDefault();
        setExhibitMenuOpen(false);
        setPaletteOpen(true);
        return;
      }
      // Native text inputs, selects and editable regions own their keys.
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) return;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      // The tour and the modal dialogs (About, city names) own the keyboard
      // while open — otherwise Space paused the tour AND started playback.
      if (tourOpen || cityClickCoords || document.querySelector('[aria-modal="true"]')) return;
      // Buttons and the timeline track consume Space / arrows themselves
      // (the track steps ±1; this handler stepping ±10 on top made it 11).
      // Escape and the letter shortcuts still work from those elements.
      const inControl =
        !!target && (target.closest('button') !== null || target.closest('[role="slider"]') !== null);
      const isNavKey = e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
      if (inControl && isNavKey) return;
      // With the map canvas focused, Mapbox's own keyboard handler owns the
      // arrows (pan) and +/- (zoom) — don't scrub the timeline on top.
      const canvasFocused =
        document.activeElement instanceof HTMLElement &&
        document.activeElement.classList.contains('mapboxgl-canvas');
      if (canvasFocused && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) return;

      switch (e.key) {
        case '/':
          // Global search. Shift-/ is `?` (About) on US layouts; leave
          // modifier combinations to the browser.
          if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) break;
          e.preventDefault();
          setExhibitMenuOpen(false);
          setPaletteOpen(true);
          break;
        case '[':
        case ']': {
          // Step through this year's conflicts by priority: select + fly.
          // Keeps the sidebar state as it is (open stays open).
          if (e.ctrlKey || e.metaKey || e.altKey) break;
          e.preventDefault();
          const next = stepConflict(
            stepListRef.current,
            selectedConflict?.id ?? null,
            e.key === ']' ? 1 : -1,
          );
          if (!next) break;
          setTimeline(prev => {
            if (prev.isPlaying) wasPlayingRef.current = true;
            return { ...prev, isPlaying: false };
          });
          setSelectedEmpire(null);
          setSelectedConflict(next);
          mapRef.current?.flyToConflict(next, { pan: true, inset: panelInset(sidebarOpen) });
          break;
        }
        case ' ':
          e.preventDefault();
          handlePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          wasPlayingRef.current = false;
          setTimeline(prev => ({
            ...prev,
            currentYear: Math.min(prev.maxYear, prev.currentYear + (e.shiftKey ? 100 : 10)),
            isPlaying: false,
          }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          wasPlayingRef.current = false;
          setTimeline(prev => ({
            ...prev,
            currentYear: Math.max(prev.minYear, prev.currentYear - (e.shiftKey ? 100 : 10)),
            isPlaying: false,
          }));
          break;
        case 'Escape':
          if (filterOpen) {
            setFilterOpen(false);
            break;
          }
          if (exhibitMenuOpen) {
            setExhibitMenuOpen(false);
            break;
          }
          if (selectedEmpire) handleCloseEmpire();
          if (sidebarOpen) handleCloseSidebar();
          else if (selectedConflict) setSelectedConflict(null); // dot-selected, no sidebar
          if (listPanelOpen) setListPanelOpen(false);
          break;
        case 'l':
        case 'L':
          handleJumpToLive();
          break;
        case 't':
        case 'T':
          // Hidden-chrome toggle. Skip when modifier keys are held so we
          // don't fight browser shortcuts (Ctrl/Cmd-T = new tab, etc).
          if (e.ctrlKey || e.metaKey || e.altKey) break;
          setChromeHidden((v) => !v);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlay,
    handleCloseSidebar,
    handleCloseEmpire,
    handleJumpToLive,
    sidebarOpen,
    listPanelOpen,
    filterOpen,
    exhibitMenuOpen,
    selectedEmpire,
    selectedConflict,
    tourOpen,
    cityClickCoords,
    setChromeHidden,
  ]);

  // Toggle a body-level class while chrome is hidden so the Mapbox zoom
  // control — which we don't render ourselves — can be hidden via
  // globals.css. Cleaner than reaching into Mapbox's DOM with refs every
  // render.
  useEffect(() => {
    if (chromeHidden) document.body.classList.add('chrome-hidden');
    else document.body.classList.remove('chrome-hidden');
    return () => document.body.classList.remove('chrome-hidden');
  }, [chromeHidden]);

  const handleShowAllConflicts = useCallback(() => {
    setListPanelOpen(true);
  }, []);

  // Chrome rectangles the callout layer must keep clear of. Everything with
  // `data-avoid` is measured; `data-avoid="wrap"` wrappers (display:
  // contents around components we don't own) contribute their children.
  // Re-measured when a panel opens/closes, on resize, and — via a
  // MutationObserver on <main> — whenever chrome mounts or unmounts on its
  // own (EraPanel, DisputedTerritoryNote). Panels slide in over ~280 ms,
  // so a second pass runs after the animation settles.
  const mainRef = useRef<HTMLElement>(null);
  const [avoidRects, setAvoidRects] = useState<DOMRect[]>([]);
  const measureAvoid = useCallback(() => {
    const root = mainRef.current;
    if (!root) return;
    const rects: DOMRect[] = [];
    root.querySelectorAll<HTMLElement>('[data-avoid]').forEach((el) => {
      const targets = el.getAttribute('data-avoid') === 'wrap'
        ? Array.from(el.children) as HTMLElement[]
        : [el];
      for (const t of targets) {
        const r = t.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rects.push(r);
      }
    });
    setAvoidRects((prev) => {
      if (prev.length === rects.length && prev.every((r, i) =>
        r.left === rects[i].left && r.top === rects[i].top && r.width === rects[i].width && r.height === rects[i].height)) {
        return prev;
      }
      return rects;
    });
  }, []);
  useEffect(() => {
    measureAvoid();
    const settle = setTimeout(measureAvoid, 400);
    return () => clearTimeout(settle);
  }, [measureAvoid, sidebarOpen, selectedEmpire, listPanelOpen, filterOpen, chromeHidden, previousSelection, mapReady]);
  useEffect(() => {
    const root = mainRef.current;
    if (!root) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      if (settle) clearTimeout(settle);
      t = setTimeout(measureAvoid, 50);
      settle = setTimeout(measureAvoid, 450);
    };
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => {
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      if (t) clearTimeout(t);
      if (settle) clearTimeout(settle);
    };
  }, [measureAvoid]);

  // Memoized so the OpeningTour's fly-to effect only runs when the stop
  // changes, not on every parent re-render (which would restart the
  // Mapbox animation mid-flight).
  const handleTourFlyToBbox = useCallback((bbox: [number, number, number, number]) => {
    mapRef.current?.flyToBbox(bbox);
  }, []);

  const handleCloseListPanel = useCallback(() => {
    setListPanelOpen(false);
  }, []);

  // Mobile "Cite" tab: copy the citation (same text as the sidebar's Cite
  // button) instead of navigating to /c/<id>, which reloaded the whole app.
  const handleMobileCite = useCallback(async () => {
    if (!selectedConflict) {
      handleShowAllConflicts();
      return;
    }
    try {
      await navigator.clipboard.writeText(
        conflictCitation(selectedConflict, window.location.origin),
      );
      setToast('Citation copied');
    } catch {
      setToast('Couldn’t copy — clipboard blocked');
    }
  }, [selectedConflict, handleShowAllConflicts]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  // Tour handlers — stable so the memoised OpeningTour only re-renders
  // when `open` changes.
  const handleTourClose = useCallback(() => {
    // Skipped — put the user back on the year they had before the
    // tour started moving the timeline.
    setTourOpen(false);
    setTourExhibitId(null);
    markTourSeen();
    const back = tourReturnYearRef.current;
    if (back != null) {
      setTimeline((prev) => ({ ...prev, currentYear: back, isPlaying: false }));
    }
  }, []);
  const handleTourFinish = useCallback(() => {
    // Completed the whole tour — bring them back to the start of the
    // timeline and prompt them to press Play to watch it unfold.
    setTourOpen(false);
    setTourExhibitId(null);
    markTourSeen();
    setTimeline((prev) => ({ ...prev, currentYear: prev.minYear, isPlaying: false }));
    setShowPlayPrompt(true);
  }, []);
  const handleTourSeek = useCallback((y: number) => {
    setTimeline((prev) => ({ ...prev, currentYear: y, isPlaying: false }));
  }, []);

  // Mobile dock
  const mobileTab = useMobileTab({
    tourOpen,
    exhibitMenuOpen,
    filterOpen,
    paletteOpen,
    sidebarOpen,
  });
  const handleMobileMap = useCallback(() => {
    if (sidebarOpen) handleCloseSidebar();
    if (listPanelOpen) handleCloseListPanel();
    if (filterOpen) setFilterOpen(false);
    setPaletteOpen(false);
    setExhibitMenuOpen(false);
  }, [sidebarOpen, listPanelOpen, filterOpen, handleCloseSidebar, handleCloseListPanel]);
  // Dock "Search" opens the command palette (all years); the year filter
  // sheet stays reachable from the Filter chip and the palette's footer.
  const handleMobileSearch = useCallback(() => {
    setFilterOpen(false);
    setPaletteOpen(true);
  }, []);
  // Dock "Tour" opens the exhibit sheet.
  const handleMobileTour = useCallback(() => setExhibitMenuOpen(true), []);

  // ── Command palette ──
  const handleOpenPalette = useCallback(() => {
    setExhibitMenuOpen(false);
    setPaletteOpen(true);
  }, []);
  const handleClosePalette = useCallback(() => setPaletteOpen(false), []);
  const handleOpenFiltersFromPalette = useCallback(() => setFilterOpen(true), []);
  // Empire chosen in the palette: select via the `#empire=` path (the
  // EmpireSidebar reads the feature properties MapView holds) and fit its
  // borders. Keeps the year if the empire exists now, else seeks to its
  // first year. If the empire layer is still loading, the pending id is
  // picked up by the effect below once it arrives.
  const pendingEmpireRef = useRef<string | null>(null);
  const selectEmpireById = useCallback((id: string, seekTo: number | null) => {
    const empire = mapRef.current?.getEmpire(id);
    if (!empire) return false;
    setTimeline((prev) => {
      if (prev.isPlaying) wasPlayingRef.current = true;
      const yearNow = Math.round(prev.currentYear);
      const activeNow = yearNow >= empire.startYear && yearNow <= (empire.endYear ?? MAX_YEAR);
      const target = activeNow ? prev.currentYear : (seekTo ?? empire.startYear);
      return { ...prev, isPlaying: false, currentYear: Math.max(prev.minYear, Math.min(MAX_YEAR, target)) };
    });
    setSidebarOpen(false);
    setSelectedConflict(null);
    setSelectedEmpire(empire);
    if (empire.bbox) {
      mapRef.current?.flyToBbox(empire.bbox, { padding: empireFlyPadding(), maxZoom: 5 });
    }
    return true;
  }, []);
  const handlePaletteEmpire = useCallback((e: EmpireIndexEntry) => {
    if (!e.id) return;
    if (!selectEmpireById(e.id, e.startYear)) {
      pendingEmpireRef.current = e.id;
      // Seek now so the timeline reflects the choice while the layer loads.
      setTimeline((prev) => ({
        ...prev,
        isPlaying: false,
        currentYear: Math.max(prev.minYear, Math.min(MAX_YEAR, e.startYear)),
      }));
    }
  }, [selectEmpireById]);

  // Exhibit stops can open a record: conflicts go through the normal
  // navigate path (select + fly); empires reuse the palette's selection.
  const empireIndexIds = useMemo(
    () => empireIndex.map((e) => e.id).filter((id): id is string => typeof id === "string" && id.length > 0),
    [empireIndex],
  );
  const handleTourSelectConflict = useCallback((id: string) => {
    const c = conflictById.get(resolveConflictId(id));
    if (c) handleConflictClick(c, { pan: false });
  }, [conflictById, handleConflictClick]);
  const handleTourSelectEmpire = useCallback((id: string) => {
    if (!selectEmpireById(id, null)) pendingEmpireRef.current = id;
  }, [selectEmpireById]);
  useEffect(() => {
    if (!empiresReady || !pendingEmpireRef.current) return;
    const id = pendingEmpireRef.current;
    pendingEmpireRef.current = null;
    selectEmpireById(id, null);
  }, [empiresReady, selectEmpireById]);
  // City chosen in the palette: no seek — fly there and open the name
  // timeline (the same modal a city-dot click opens).
  const handlePaletteCity = useCallback((city: CitySearchFeature) => {
    const coords = city.geometry.coordinates;
    mapRef.current?.flyTo(coords, { zoom: Math.max(mapRef.current.getZoom(), 5) });
    setCityClickCoords(coords);
  }, []);
  const cityFeatures = useMemo<readonly CitySearchFeature[]>(
    () => (citiesData?.features ?? []) as readonly CitySearchFeature[],
    [citiesData],
  );

  // ── This-year ledger + honest tallies ──
  const yearEvents = useMemo(
    () => (yearIndex ? getYearEvents(renderYear, yearIndex) : { started: [], ended: [] }),
    [renderYear, yearIndex],
  );
  const deathsThisYear = useMemo(
    () => (yearIndex ? deathsInYear(renderYear, yearIndex) : 0),
    [renderYear, yearIndex],
  );
  const cumulativeDeaths = useMemo(
    () => (yearIndex ? cumulativeDeathsThrough(renderYear, yearIndex) : 0),
    [renderYear, yearIndex],
  );
  // The ledger sits just above the Timeline; measure the Timeline root
  // (the first child of its display:contents wrapper) so the offset is
  // right on both breakpoints without duplicating its geometry here.
  const timelineWrapRef = useRef<HTMLDivElement>(null);
  const legendWrapRef = useRef<HTMLDivElement>(null);
  const [ledgerPos, setLedgerPos] = useState({ bottom: 160, left: 24 });
  useEffect(() => {
    const main = mainRef.current;
    const root = timelineWrapRef.current?.firstElementChild as HTMLElement | null;
    if (!main || !root) return;
    const measure = () => {
      const m = main.getBoundingClientRect();
      const r = root.getBoundingClientRect();
      // 8 px below the top of the Timeline's fade band — clear of the
      // strip and of its hover chip.
      const bottom = Math.max(0, Math.round(m.bottom - r.top - 8));
      // The border legend sits bottom-left (desktop); when its box reaches
      // into the ledger's band, start the ledger to its right.
      const mobile = window.innerWidth < 640;
      let left = mobile ? 12 : 24;
      const legend = legendWrapRef.current?.firstElementChild as HTMLElement | null;
      if (legend && !mobile) {
        const l = legend.getBoundingClientRect();
        const ledgerTop = m.bottom - bottom - 36;
        if (l.width > 0 && l.bottom > ledgerTop) left = Math.round(l.right - m.left + 12);
      }
      setLedgerPos((prev) => (prev.bottom === bottom && prev.left === left ? prev : { bottom, left }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(main);
    const legendEl = legendWrapRef.current?.firstElementChild;
    if (legendEl) ro.observe(legendEl);
    return () => ro.disconnect();
  }, [mapReady, chromeHidden]);
  const handleMobileCiteTap = useCallback(() => { void handleMobileCite(); }, [handleMobileCite]);

  const selectedConflictId = selectedConflict?.id ?? null;
  const handleRetry = useCallback(() => setLoadAttempt((a) => a + 1), []);
  const panelOpen = (sidebarOpen && !!selectedConflict) || !!selectedEmpire;
  // The Timeline marks the span of whatever the right-side panel shows.
  const selectedSpan = useMemo(() => {
    if (sidebarOpen && selectedConflict && !selectedEmpire) {
      return {
        startYear: selectedConflict.startYear,
        endYear: selectedConflict.endYear,
        label: selectedConflict.name,
        kind: 'conflict' as const,
      };
    }
    if (selectedEmpire) {
      return {
        startYear: selectedEmpire.startYear,
        endYear: selectedEmpire.endYear,
        label: selectedEmpire.name,
        kind: 'empire' as const,
      };
    }
    return null;
  }, [sidebarOpen, selectedConflict, selectedEmpire]);

  return (
    <ErrorBoundary>
    <ServiceWorkerRegistration />
    {/* 100dvh (dynamic viewport) instead of 100vh so Pixel/iOS Chrome
        URL-bar collapse doesn't shove the timeline + tab dock off-screen.
        Fallback to h-screen for browsers that don't yet understand dvh. */}
    <main ref={mainRef} className="relative w-screen h-screen overflow-hidden bg-wars-bg" style={{ height: '100dvh' }}>
      {/* First focusable element: jump past the chrome to the map
          (id="map", tabIndex -1 on MapView's container). */}
      <SkipLink href="#map">Skip to map</SkipLink>

      {/* Data-load error (with Retry) or loading screen */}
      {loadError ? (
        <DataLoadError message={loadError} onRetry={handleRetry} />
      ) : !mapReady && (
        <LoadingScreen />
      )}

      <MapView
        ref={mapRef}
        activeConflicts={filteredActiveConflicts}
        currentYear={renderYear}
        onConflictClick={handleConflictClick}
        onConflictDotClick={handleConflictDotClick}
        selectedConflictId={selectedConflictId}
        onMapLoad={handleMapLoad}
        onCityClick={handleCityClick}
        onEmpireClick={handleEmpireClick}
        selectedEmpireId={selectedEmpire?.id ?? null}
        onHistoricalLoad={handleHistoricalLoad}
        initialCamera={initialHash.camera}
      />

      {/* Map-overlay chrome. All of this is suppressed when the user
          presses `t` (chromeHidden=true) so the bare map can be inspected
          / screenshot-ed without UI cover. The Mapbox-owned zoom chip is
          hidden via the body.chrome-hidden rule in app/globals.css since
          we don't render it ourselves; the attribution chip stays. */}
      {!chromeHidden && (
        <>
          {/* Filter panel — top right */}
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            totalActive={activeNow.length}
            filteredCount={filteredActiveNow.length}
            // Match navigator: pass the currently-active filtered conflicts so
            // ◀ / ▶ inside the panel can step through them on the map. The
            // navigate variant opens the sidebar and pans to the match.
            matches={filteredActiveNow}
            selectedConflict={selectedConflict}
            onSelectMatch={handleConflictNavigate}
            open={filterOpen}
            onOpenChange={setFilterOpen}
            exportConflicts={filteredActiveNow}
            currentYear={renderYear}
            onOpenSearch={handleOpenPalette}
          />

          {/* "← Previous: X" — back to the conflict the user came from.
              Desktop only; sits under the TopBar on the left, clear of
              the Filter pill. */}
          {previousSelection && (
            <div data-avoid="wrap" style={{ display: 'contents' }}>
              <button
                type="button"
                onClick={handlePreviousClick}
                className="font-ui hidden sm:inline-flex absolute top-[62px] left-6 z-20 items-center gap-2 h-8 px-3 max-w-[320px] hover:text-wars-text transition-colors"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.01em',
                  background: 'var(--surface-chrome, oklch(0.20 0.014 250 / 0.85))',
                  backdropFilter: 'blur(var(--blur-chrome, 8px))',
                  WebkitBackdropFilter: 'blur(var(--blur-chrome, 8px))',
                  border: '1px solid var(--rule-strong)',
                  borderRadius: 0,
                  color: 'var(--ink-text-2)',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label={`Back to previous conflict: ${previousSelection.name}`}
                title={`Back to ${previousSelection.name}`}
              >
                <span aria-hidden>←</span>
                <span className="truncate">
                  <span style={{ color: 'var(--ink-muted)' }}>Previous:</span>{' '}
                  {previousSelection.name}
                </span>
              </button>
            </div>
          )}

          {/* Persistent legend explaining solid vs dashed borders */}
          <div ref={legendWrapRef} data-avoid="wrap" style={{ display: 'contents' }}>
            <MemoBorderLegend />
          </div>

          {/* Disputed-territory note in modern era */}
          <div data-avoid="wrap" style={{ display: 'contents' }}>
            <MemoDisputedTerritoryNote year={renderYear} />
          </div>

          {/* Era context panel — appears briefly when crossing era boundaries */}
          <div data-avoid="wrap" style={{ display: 'contents' }}>
            <MemoEraPanel year={renderYear} />
          </div>

          {/* Researcher CSV / GeoJSON export — uses filtered set so users can export their query */}
          <div data-avoid="wrap" style={{ display: 'contents' }}>
            <ExportMenu
              conflicts={filteredActiveNow}
              currentYear={renderYear}
            />
          </div>
        </>
      )}

      {/* Guided opening tour */}
      <OpeningTour
        open={tourOpen}
        exhibitId={tourExhibitId ?? undefined}
        onClose={handleTourClose}
        onFinish={handleTourFinish}
        onSeek={handleTourSeek}
        onFlyToBbox={handleTourFlyToBbox}
        onSelectConflict={handleTourSelectConflict}
        onSelectEmpire={handleTourSelectEmpire}
      />

      <TopBar
        currentYear={renderYear}
        activeCount={activeNow.length}
        totalCount={conflicts.length}
        onJumpToLive={handleJumpToLive}
        onShowAllConflicts={handleShowAllConflicts}
        onOpenExhibit={openTour}
        exhibitMenuOpen={exhibitMenuOpen}
        onExhibitMenuOpenChange={setExhibitMenuOpen}
        onOpenSearch={handleOpenPalette}
        // Per-year shares of the headline tolls (lib/casualty-rate.ts),
        // not the summed totals of everything active.
        deathsThisYear={deathsThisYear}
        cumulativeDeaths={cumulativeDeaths}
        minYear={timeline.minYear}
        // When chrome is hidden, TopBar suppresses the (?), Tour, and Live
        // chrome buttons but keeps the wordmark and the active/mapped
        // stat tallies. The flex layout pushes the tallies to the right
        // edge as the chrome cluster shrinks to zero.
        chromeHidden={chromeHidden}
        tourOpen={tourOpen}
      />

      {/* On-map conflict callouts. Suppressed in hidden-chrome mode (`t` key)
          so users who find the text boxes distracting have a way to clear
          them and see the bare map. */}
      {!chromeHidden && (
        <InfoBoxLayer
          conflicts={filteredActiveConflicts}
          mapRef={mapRef}
          onConflictClick={handleConflictClick}
          selectedId={selectedConflictId}
          avoidRects={avoidRects}
          compact={panelOpen}
          onShowNearby={handleShowAllConflicts}
        />
      )}

      {/* This-year ledger — what began and ended this year, just above
          the timeline. Suppressed with the rest of the chrome (`t`). */}
      {!chromeHidden && (
        <YearLedger
          year={renderYear}
          events={yearEvents}
          onConflictClick={handleConflictNavigate}
          onShowAll={handleShowAllConflicts}
          bottom={ledgerPos.bottom}
          left={ledgerPos.left}
          panelOpen={panelOpen}
        />
      )}

      <div ref={timelineWrapRef} data-avoid="wrap" style={{ display: 'contents' }}>
        <Timeline
          timeline={timeline}
          allConflicts={conflicts}
          onPlay={handlePlay}
          onYearChange={handleYearChange}
          onSpeedChange={handleSpeedChange}
          onSpeedModeChange={handleSpeedModeChange}
          showPlayPrompt={showPlayPrompt}
          selectedSpan={selectedSpan}
        />
      </div>

      {sidebarOpen && selectedConflict && !selectedEmpire && (
        <div data-avoid="wrap" style={{ display: 'contents' }}>
          <Sidebar
            conflict={selectedConflict}
            onClose={handleCloseSidebar}
            allConflicts={conflicts}
            relations={relations}
            onConflictClick={handleConflictNavigate}
          />
        </div>
      )}

      {selectedEmpire && (
        <div data-avoid="wrap" style={{ display: 'contents' }}>
          <EmpireSidebar
            empire={selectedEmpire}
            allConflicts={conflicts}
            siblingIds={empireFamilyIds(selectedEmpire.id, empireIndexIds)}
            onConflictClick={handleConflictNavigate}
            onClose={handleCloseEmpire}
          />
        </div>
      )}

      {listPanelOpen && (
        <div data-avoid="wrap" style={{ display: 'contents' }}>
          <ConflictListPanel
            conflicts={filteredActiveConflicts}
            currentYear={renderYear}
            onConflictClick={handleConflictNavigate}
            onClose={handleCloseListPanel}
            selectedId={selectedConflictId}
          />
        </div>
      )}

      {/* City name-timeline modal — shows all historical names for a clicked city location */}
      <MemoCityTimelineModal
        coords={cityClickCoords}
        citiesData={citiesData}
        onClose={handleCloseCityModal}
      />

      {/* Mobile toast (citation copied etc.) — sits just above the tab dock */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="surface-panel sm:hidden fixed left-1/2 -translate-x-1/2 z-50 font-mono text-[11px] px-3 py-2 whitespace-nowrap"
          style={{
            bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))',
            border: '1px solid var(--rule-strong)',
            color: 'var(--ink-text)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Command palette — ⌘K / Ctrl-K / `/`, the TopBar magnifier, the
          mobile dock's Search tab. */}
      <CommandPalette
        open={paletteOpen}
        onClose={handleClosePalette}
        conflicts={conflicts}
        empires={empireIndex}
        cities={cityFeatures}
        currentYear={renderYear}
        onSelectConflict={handleConflictNavigate}
        onSelectEmpire={handlePaletteEmpire}
        onSelectCity={handlePaletteCity}
        onOpenFilters={handleOpenFiltersFromPalette}
      />

      {/* Mobile tab dock — Map / Tour / Search / Cite, hidden on ≥sm */}
      <MemoMobileTabDock
        active={mobileTab}
        onMap={handleMobileMap}
        onTour={handleMobileTour}
        onSearch={handleMobileSearch}
        onCite={handleMobileCiteTap}
      />
    </main>
    </ErrorBoundary>
  );
}
