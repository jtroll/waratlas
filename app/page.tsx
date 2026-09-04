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
} from '@/lib/conflicts';
import { DATA_URLS } from '@/lib/data-urls';
import { playbackStore } from '@/lib/playback-store';
import idRedirects from '@/lib/generated/id-redirects.json';
import MapView, { MapViewHandle } from '@/components/MapView';
import Timeline from '@/components/Timeline';
import Sidebar from '@/components/Sidebar';
import InfoBoxLayer from '@/components/InfoBoxLayer';
import TopBar from '@/components/TopBar';
import ConflictListPanel from '@/components/ConflictListPanel';
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
const MAX_YEAR = new Date().getFullYear();

// Components we don't own but render with stable props — memoised here so
// they skip the per-integer-year commits during playback.
const MemoBorderLegend = memo(BorderLegend);
const MemoDisputedTerritoryNote = memo(DisputedTerritoryNote);
const MemoEraPanel = memo(EraPanel);
const MemoMobileTabDock = memo(MobileTabDock);
const MemoCityTimelineModal = memo(CityTimelineModal);

interface EmpireIndexEntry {
  id?: string;
  name: string;
  startYear: number;
  endYear: number | null;
}
const TOUR_SEEN_KEY = 'wars-atlas-tour-seen';
// Old conflict id → new id for merged / renamed records (generated from
// scripts/data/id_redirects.json by scripts/build-data.mjs).
const ID_REDIRECTS: Record<string, string> = idRedirects;

/** Parse `#year=NNNN&conflict=ID`. Runs synchronously from a lazy state
 *  initializer at mount, so the values are captured before any effect can
 *  rewrite the hash (the URL-sync effect used to win the race against the
 *  data fetch and reset deep links to the start of the timeline). */
function parseHash(hash: string): { year: number | null; conflictId: string | null } {
  const yearMatch = hash.match(/year=(-?\d+)/);
  const conflictMatch = hash.match(/conflict=([\w\-]+)/);
  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    conflictId: conflictMatch ? conflictMatch[1] : null,
  };
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
  const [initialHash] = useState(() =>
    typeof window !== 'undefined'
      ? parseHash(window.location.hash)
      : { year: null, conflictId: null },
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

  // Long-text fields (description / hook / narrative / significance /
  // sources) live in a separate file so the map can paint without them.
  // Fetch once the map is ready, or as soon as something needs the text —
  // the sidebar, the list panel or a search term — whichever comes first.
  // A failed fetch is retried the next time one of those triggers changes.
  const textStatusRef = useRef<'idle' | 'loading' | 'done'>('idle');
  const needText =
    mapReady || sidebarOpen || listPanelOpen || filters.search.trim() !== '';
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

  // Lightweight empire index (name + year range) for the FilterPanel search
  // auto-jump. Full empire geometry loads (and is parsed) exactly once,
  // inside MapView; this is the ~40 KB build-time index of the same
  // features, so the search box can find an empire by name even when the
  // timeline is parked in a completely different era.
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

  // Auto-jump on search: when the FilterPanel's search box has a non-empty
  // term and nothing matches at the current year, hop the timeline to the
  // earliest year where a conflict OR an empire matching the term exists.
  // Without this, the filter is invisible from any era that doesn't already
  // contain its subject — typing "mongol" from 2500 BCE just shows "0/1" and
  // the user concludes the box is broken.
  //
  // Latest state goes through a ref so the effect itself only re-runs when
  // the search term changes — otherwise it would fire every time the user
  // scrubs the timeline and try to drag them back to the search match.
  const searchJumpStateRef = useRef<{
    currentYear: number;
    activeConflicts: ActiveConflict[];
    conflicts: Conflict[];
    empireIndex: typeof empireIndex;
    minYear: number;
  }>();
  searchJumpStateRef.current = {
    currentYear: timeline.currentYear,
    activeConflicts,
    conflicts,
    empireIndex,
    minYear: timeline.minYear,
  };
  useEffect(() => {
    const q = filters.search.toLowerCase().trim();
    if (!q) return;
    const handle = setTimeout(() => {
      const st = searchJumpStateRef.current;
      if (!st) return;
      const yearNow = Math.round(st.currentYear);

      const conflictName = (c: Conflict) => (c.name ?? '').toLowerCase();
      const empireName = (e: { name: string }) => (e.name ?? '').toLowerCase();
      const conflictDescHay = (c: Conflict) =>
        [c.description, ...(c.countries ?? []), ...(c.locations ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
      const matchesConflict = (c: Conflict) =>
        conflictName(c).includes(q) || conflictDescHay(c).includes(q);
      const matchesEmpire = (e: { name: string }) => empireName(e).includes(q);
      const empireActiveNow = (e: { startYear: number; endYear: number | null }) =>
        e.startYear <= yearNow && (e.endYear ?? MAX_YEAR) >= yearNow;

      // Already showing a match? Don't yank the timeline out from under
      // the user.
      if (st.activeConflicts.some(matchesConflict)) return;
      if (st.empireIndex.some((e) => empireActiveNow(e) && matchesEmpire(e))) return;

      // Tiered search across the full dataset — prefer NAME hits over
      // description-only hits, and within each tier prefer the earliest
      // year. Without tiers, typing "british" from 2500 BCE lands on a
      // 1500 CE colonial war whose description happens to mention the
      // British, when the user clearly meant the British Empire. Within
      // a tier, earliest-year wins so a unique-name match (Lagash-Umma)
      // hits exactly its year.
      const earliestNamedEmpire = st.empireIndex
        .filter(matchesEmpire)
        .reduce<typeof st.empireIndex[number] | null>(
          (best, e) => (best == null || e.startYear < best.startYear ? e : best),
          null,
        );
      const earliestNamedConflict = st.conflicts
        .filter((c) => conflictName(c).includes(q))
        .reduce<Conflict | null>(
          (best, c) => (best == null || c.startYear < best.startYear ? c : best),
          null,
        );
      const earliestDescConflict = st.conflicts
        .filter(
          (c) =>
            !conflictName(c).includes(q) && conflictDescHay(c).includes(q),
        )
        .reduce<Conflict | null>(
          (best, c) => (best == null || c.startYear < best.startYear ? c : best),
          null,
        );

      let target: number | null = null;
      // Tier 1: empire-name and conflict-name hits — both are explicit
      // labels. Take the earliest.
      if (earliestNamedEmpire || earliestNamedConflict) {
        if (earliestNamedEmpire && earliestNamedConflict) {
          target = Math.min(
            earliestNamedEmpire.startYear,
            earliestNamedConflict.startYear,
          );
        } else if (earliestNamedEmpire) {
          target = earliestNamedEmpire.startYear;
        } else if (earliestNamedConflict) {
          target = earliestNamedConflict.startYear;
        }
      } else if (earliestDescConflict) {
        // Tier 2: fall back to description-only matches.
        target = earliestDescConflict.startYear;
      }
      if (target == null) return;

      const clamped = Math.max(st.minYear, Math.min(MAX_YEAR, target));
      // Stop playback so we don't immediately scroll past the matched era —
      // and drop the auto-resume intent, since this pause is the user's.
      wasPlayingRef.current = false;
      setTimeline((prev) => ({
        ...prev,
        currentYear: clamped,
        isPlaying: false,
      }));
    }, 350);
    return () => clearTimeout(handle);
  }, [filters.search]);

  // Opening the tour (first visit, Tour button, mobile dock) remembers the
  // year so Skip can put the user back where they were.
  const openTour = useCallback(() => {
    tourReturnYearRef.current = currentYearRef.current;
    setTourOpen(true);
  }, []);

  // Trigger opening tour for first-time visitors (after data loads)
  useEffect(() => {
    if (!dataLoaded) return;
    const hasYearHash = initialHash.year !== null || initialHash.conflictId !== null;
    if (readTourSeen() || hasYearHash) return;
    const timer = setTimeout(openTour, 800);
    return () => clearTimeout(timer);
  }, [dataLoaded, initialHash, openTour]);

  // Update URL hash when year or selected conflict changes (debounced).
  // Gated on dataLoaded so the initial -3000 state never overwrites a deep
  // link before the data fetch has had a chance to read it.
  useEffect(() => {
    if (!dataLoaded) return;
    const year = Math.round(timeline.currentYear);
    const timeout = setTimeout(() => {
      let newHash = `#year=${year}`;
      if (selectedConflict) newHash += `&conflict=${selectedConflict.id}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [dataLoaded, timeline.currentYear, selectedConflict]);

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

  // Click "Learn more" on an info box → open sidebar, pause timeline.
  // Also closes any open empire flyout — only one right-side panel at a time.
  const handleConflictClick = useCallback((conflict: Conflict) => {
    setTimeline(prev => {
      // Remember "was playing" across chained clicks. Only set the flag
      // when we're actually transitioning from playing → paused; never
      // overwrite it back to false (the close handler clears it).
      if (prev.isPlaying) wasPlayingRef.current = true;
      return { ...prev, isPlaying: false };
    });
    setSelectedEmpire(null);
    setSelectedConflict(conflict);
    setSidebarOpen(true);
  }, []);

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

      switch (e.key) {
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
    filterOpen: false, // FilterPanel manages its own open state internally
    sidebarOpen,
  });
  const handleMobileMap = useCallback(() => {
    if (sidebarOpen) handleCloseSidebar();
    if (listPanelOpen) handleCloseListPanel();
  }, [sidebarOpen, listPanelOpen, handleCloseSidebar, handleCloseListPanel]);
  const handleMobileCiteTap = useCallback(() => { void handleMobileCite(); }, [handleMobileCite]);

  const selectedConflictId = selectedConflict?.id ?? null;
  const handleRetry = useCallback(() => setLoadAttempt((a) => a + 1), []);

  return (
    <ErrorBoundary>
    <ServiceWorkerRegistration />
    {/* 100dvh (dynamic viewport) instead of 100vh so Pixel/iOS Chrome
        URL-bar collapse doesn't shove the timeline + tab dock off-screen.
        Fallback to h-screen for browsers that don't yet understand dvh. */}
    <main className="relative w-screen h-screen overflow-hidden bg-wars-bg" style={{ height: '100dvh' }}>
      {/* Data-load error (with Retry) or loading screen */}
      {loadError ? (
        <DataLoadError message={loadError} onRetry={handleRetry} />
      ) : !mapReady && (
        <div className="absolute inset-0 z-50 bg-wars-bg flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-wars-text mb-2">
              <span className="text-wars-red">War</span> Atlas
            </h1>
            <p className="text-sm text-wars-muted">Loading 5,000 years of history...</p>
            <div className="mt-4 w-32 h-1 bg-wars-border rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-wars-accent rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
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
            // ◀ / ▶ inside the panel can step through them on the map. We use
            // the existing handleConflictClick so a match selection opens the
            // sidebar the same way clicking a callout does.
            matches={filteredActiveNow}
            selectedConflict={selectedConflict}
            onSelectMatch={handleConflictClick}
          />

          {/* Persistent legend explaining solid vs dashed borders */}
          <MemoBorderLegend />

          {/* Disputed-territory note in modern era */}
          <MemoDisputedTerritoryNote year={renderYear} />

          {/* Era context panel — appears briefly when crossing era boundaries */}
          <MemoEraPanel year={renderYear} />

          {/* Researcher CSV / GeoJSON export — uses filtered set so users can export their query */}
          <ExportMenu
            conflicts={filteredActiveNow}
            currentYear={renderYear}
          />
        </>
      )}

      {/* Guided opening tour */}
      <OpeningTour
        open={tourOpen}
        onClose={handleTourClose}
        onFinish={handleTourFinish}
        onSeek={handleTourSeek}
        onFlyToBbox={handleTourFlyToBbox}
      />

      <TopBar
        currentYear={renderYear}
        activeCount={activeNow.length}
        totalCount={conflicts.length}
        onJumpToLive={handleJumpToLive}
        onShowAllConflicts={handleShowAllConflicts}
        onOpenTour={openTour}
        // Only fully-active conflicts contribute to the casualty tally, so
        // the memoised subset gives the same total.
        activeConflicts={activeNow}
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
        />
      )}

      <Timeline
        timeline={timeline}
        allConflicts={conflicts}
        onPlay={handlePlay}
        onYearChange={handleYearChange}
        onSpeedChange={handleSpeedChange}
        onSpeedModeChange={handleSpeedModeChange}
        showPlayPrompt={showPlayPrompt}
      />

      {sidebarOpen && selectedConflict && !selectedEmpire && (
        <Sidebar
          conflict={selectedConflict}
          onClose={handleCloseSidebar}
          allConflicts={conflicts}
          relations={relations}
          onConflictClick={handleConflictClick}
        />
      )}

      {selectedEmpire && (
        <EmpireSidebar
          empire={selectedEmpire}
          allConflicts={conflicts}
          onConflictClick={handleConflictClick}
          onClose={handleCloseEmpire}
        />
      )}

      {listPanelOpen && (
        <ConflictListPanel
          conflicts={filteredActiveConflicts}
          currentYear={renderYear}
          onConflictClick={handleConflictClick}
          onClose={handleCloseListPanel}
          selectedId={selectedConflictId}
        />
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
          className="sm:hidden fixed left-1/2 -translate-x-1/2 z-50 font-mono text-[11px] px-3 py-2 whitespace-nowrap"
          style={{
            bottom: 'calc(58px + env(safe-area-inset-bottom, 0px))',
            background: 'oklch(0.20 0.014 250 / 0.95)',
            border: '1px solid var(--rule-strong)',
            color: 'var(--ink-text)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Mobile tab dock — Map / Tour / Search / Cite, hidden on ≥sm */}
      <MemoMobileTabDock
        active={mobileTab}
        onMap={handleMobileMap}
        onTour={openTour}
        onSearch={handleShowAllConflicts}
        onCite={handleMobileCiteTap}
      />
    </main>
    </ErrorBoundary>
  );
}
