'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Conflict, ActiveConflict, TimelineState } from '@/lib/types';
import { getActiveConflicts, getAutoSpeed, formatYear } from '@/lib/conflicts';
import MapView, { MapViewHandle } from '@/components/MapView';
import Timeline from '@/components/Timeline';
import Sidebar from '@/components/Sidebar';
import InfoBoxLayer from '@/components/InfoBoxLayer';
import TopBar from '@/components/TopBar';
import ConflictListPanel from '@/components/ConflictListPanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import BorderLegend from '@/components/BorderLegend';
import DisputedTerritoryNote from '@/components/DisputedTerritoryNote';
import EraPanel from '@/components/EraPanel';
import ExportMenu from '@/components/ExportMenu';
import OpeningTour from '@/components/OpeningTour';
import FilterPanel, { ConflictFilters, DEFAULT_FILTERS, regionBboxFor } from '@/components/FilterPanel';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import CityTimelineModal from '@/components/CityTimelineModal';
import MobileTabDock, { useMobileTab } from '@/components/MobileTabDock';
import EmpireSidebar, { type EmpireProperties } from '@/components/EmpireSidebar';
const MAX_YEAR = new Date().getFullYear();

export default function Home() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const MIN_YEAR = conflicts.length > 0
    ? Math.min(...conflicts.map(c => c.startYear))
    : -3000;

  // Load conflicts data at runtime instead of bundling
  useEffect(() => {
    fetch('/conflicts.json')
      .then(res => res.json())
      .then((data: Conflict[]) => {
        setConflicts(data);
        setDataLoaded(true);
        const minY = Math.min(...data.map(c => c.startYear));
        // Parse URL hash: #year=NNNN&conflict=ID
        const hash = window.location.hash;
        const yearMatch = hash.match(/year=(-?\d+)/);
        const conflictMatch = hash.match(/conflict=([\w\-]+)/);
        let initialYear = yearMatch ? parseInt(yearMatch[1], 10) : minY;
        // If a conflict is specified, jump to its start year and open the sidebar
        if (conflictMatch) {
          const target = data.find(c => c.id === conflictMatch[1]);
          if (target) {
            initialYear = target.startYear;
            setTimeout(() => {
              setSelectedConflict(target);
              setSidebarOpen(true);
            }, 200);
          }
        }
        setTimeline(prev => ({
          ...prev,
          currentYear: Math.max(minY, Math.min(MAX_YEAR, initialYear)),
          minYear: minY,
        }));
      })
      .catch(console.error);
  }, []);

  const [timeline, setTimeline] = useState<TimelineState>({
    currentYear: -3000,
    isPlaying: false,
    playbackSpeed: 10,
    speedMode: 'auto',
    minYear: -3000,
    maxYear: MAX_YEAR,
  });

  const [activeConflicts, setActiveConflicts] = useState<ActiveConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [mapMoveCounter, setMapMoveCounter] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  // Shown after the user finishes (rather than skips) the opening tour — a
  // small affordance pointing them at the Play button. Cleared when they
  // press Play, or on next tour finish.
  const [showPlayPrompt, setShowPlayPrompt] = useState(false);
  const [filters, setFilters] = useState<ConflictFilters>(DEFAULT_FILTERS);
  const [cityClickCoords, setCityClickCoords] = useState<[number, number] | null>(null);
  const [citiesData, setCitiesData] = useState<any>(null);
  // Empire detail flyout — mutually exclusive with the conflict sidebar.
  // Only one right-side panel is open at a time.
  const [selectedEmpire, setSelectedEmpire] = useState<EmpireProperties | null>(null);

  // Load cities once for the timeline modal lookup
  useEffect(() => {
    fetch('/cities.json').then((r) => r.json()).then(setCitiesData).catch(() => {});
  }, []);

  // Lightweight empire index (name + year range) for the FilterPanel search
  // auto-jump. Full empires.json (with geometry) loads inside MapView; we
  // duplicate just the metadata here so the search box can find an empire
  // by name even when the timeline is parked in a completely different era.
  // The fetch is cheap on the second hit thanks to the SW cache.
  const [empireIndex, setEmpireIndex] = useState<Array<{
    name: string;
    startYear: number;
    endYear: number | null;
  }>>([]);
  useEffect(() => {
    fetch('/empires.json')
      .then((r) => r.json())
      .then((d) => {
        setEmpireIndex(
          ((d?.features as any[]) || []).map((f) => ({
            name: String(f?.properties?.name ?? ''),
            startYear: Number(f?.properties?.startYear ?? 0),
            endYear:
              f?.properties?.endYear == null ? null : Number(f.properties.endYear),
          })),
        );
      })
      .catch(() => {});
  }, []);

  // Apply user filters on top of year-active filtering
  const filteredActiveConflicts = (() => {
    if (filters === DEFAULT_FILTERS) return activeConflicts;
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
  })();

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
    minYear: MIN_YEAR,
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
      setTimeline((prev) => ({
        ...prev,
        currentYear: clamped,
        // Stop playback so we don't immediately scroll past the matched era.
        isPlaying: false,
      }));
    }, 350);
    return () => clearTimeout(handle);
  }, [filters.search]);

  // Trigger opening tour for first-time visitors (after data loads)
  useEffect(() => {
    if (!dataLoaded) return;
    try {
      const seen = window.sessionStorage.getItem('wars-atlas-tour-seen');
      const hasYearHash = window.location.hash.includes('year=');
      if (!seen && !hasYearHash) {
        setTimeout(() => setTourOpen(true), 800);
      }
    } catch {
      // sessionStorage unavailable — skip tour
    }
  }, [dataLoaded]);

  // Update URL hash when year or selected conflict changes (debounced)
  useEffect(() => {
    const year = Math.round(timeline.currentYear);
    const timeout = setTimeout(() => {
      let newHash = `#year=${year}`;
      if (selectedConflict) newHash += `&conflict=${selectedConflict.id}`;
      if (window.location.hash !== newHash) {
        window.history.replaceState(null, '', newHash);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [timeline.currentYear, selectedConflict]);

  // Track whether we were playing before a selection (for auto-resume)
  const wasPlayingRef = useRef(false);
  const mapRef = useRef<MapViewHandle>(null);
  const animFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Update active conflicts when year changes
  useEffect(() => {
    const active = getActiveConflicts(timeline.currentYear, conflicts);
    setActiveConflicts(active);
  }, [timeline.currentYear, conflicts]);

  // Playback loop with auto-speed support
  useEffect(() => {
    if (!timeline.isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setTimeline(prev => {
        // Compute effective speed
        const speed = prev.speedMode === 'auto'
          ? getAutoSpeed(prev.currentYear, conflicts)
          : prev.playbackSpeed;

        const newYear = prev.currentYear + speed * delta;
        if (newYear >= prev.maxYear) {
          return { ...prev, currentYear: prev.maxYear, isPlaying: false };
        }
        return { ...prev, currentYear: newYear };
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [timeline.isPlaying]);

  const handlePlay = useCallback(() => {
    // Pressing Play also dismisses the post-tour "press Play" prompt.
    setShowPlayPrompt(false);
    setTimeline(prev => {
      const next = !prev.isPlaying;
      // If the user is manually pausing, drop the auto-resume intent so a
      // subsequent close doesn't override their explicit pause.
      if (!next) wasPlayingRef.current = false;
      return { ...prev, isPlaying: next };
    });
  }, []);

  const handleYearChange = useCallback((year: number) => {
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
    setTimeline(prev => ({
      ...prev,
      currentYear: MAX_YEAR,
      isPlaying: false,
    }));
    setSelectedConflict(null);
    setSidebarOpen(false);
  }, []);

  const handleMapMove = useCallback(() => {
    setMapMoveCounter(c => c + 1);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          setTimeline(prev => ({
            ...prev,
            currentYear: Math.min(prev.maxYear, prev.currentYear + (e.shiftKey ? 100 : 10)),
            isPlaying: false,
          }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setTimeline(prev => ({
            ...prev,
            currentYear: Math.max(prev.minYear, prev.currentYear - (e.shiftKey ? 100 : 10)),
            isPlaying: false,
          }));
          break;
        case 'Escape':
          if (selectedEmpire) handleCloseEmpire();
          if (sidebarOpen) handleCloseSidebar();
          if (listPanelOpen) setListPanelOpen(false);
          break;
        case 'l':
        case 'L':
          handleJumpToLive();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlay, handleCloseSidebar, handleCloseEmpire, handleJumpToLive, sidebarOpen, listPanelOpen, selectedEmpire]);

  const handleZoomChange = useCallback((zoom: number) => {
    // Zoom changes trigger map move which updates info box positions
  }, []);

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

  const [mapReady, setMapReady] = useState(false);

  // Map is ready when data is loaded + a short delay for map tiles
  useEffect(() => {
    if (dataLoaded) {
      const timer = setTimeout(() => setMapReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [dataLoaded]);

  return (
    <ErrorBoundary>
    <ServiceWorkerRegistration />
    {/* 100dvh (dynamic viewport) instead of 100vh so Pixel/iOS Chrome
        URL-bar collapse doesn't shove the timeline + tab dock off-screen.
        Fallback to h-screen for browsers that don't yet understand dvh. */}
    <main className="relative w-screen h-screen overflow-hidden bg-wars-bg" style={{ height: '100dvh' }}>
      {/* Loading screen */}
      {!mapReady && (
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
        currentYear={timeline.currentYear}
        onConflictClick={handleConflictClick}
        onConflictDotClick={handleConflictDotClick}
        selectedConflictId={selectedConflict?.id ?? null}
        onZoomChange={handleZoomChange}
        onMapMove={handleMapMove}
        onCityClick={(coords) => setCityClickCoords(coords)}
        onEmpireClick={handleEmpireClick}
        selectedEmpireId={selectedEmpire?.id ?? null}
      />

      {/* Filter panel — top right */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        totalActive={activeConflicts.filter((c) => c.isActive).length}
        filteredCount={filteredActiveConflicts.filter((c) => c.isActive).length}
      />

      {/* Persistent legend explaining solid vs dashed borders */}
      <BorderLegend />

      {/* Disputed-territory note in modern era */}
      <DisputedTerritoryNote year={Math.round(timeline.currentYear)} />

      {/* Era context panel — appears briefly when crossing era boundaries */}
      <EraPanel year={timeline.currentYear} />

      {/* Researcher CSV / GeoJSON export — uses filtered set so users can export their query */}
      <ExportMenu
        conflicts={filteredActiveConflicts.filter((c) => c.isActive)}
        currentYear={timeline.currentYear}
      />

      {/* Guided opening tour */}
      <OpeningTour
        open={tourOpen}
        onClose={() => {
          // Skipped — preserve whatever year the user was on.
          setTourOpen(false);
          try { window.sessionStorage.setItem('wars-atlas-tour-seen', '1'); } catch {}
        }}
        onFinish={() => {
          // Completed the whole tour — bring them back to the start of the
          // timeline and prompt them to press Play to watch it unfold.
          setTourOpen(false);
          try { window.sessionStorage.setItem('wars-atlas-tour-seen', '1'); } catch {}
          setTimeline((prev) => ({ ...prev, currentYear: prev.minYear, isPlaying: false }));
          setShowPlayPrompt(true);
        }}
        onSeek={(y) => setTimeline((prev) => ({ ...prev, currentYear: y, isPlaying: false }))}
        onFlyToBbox={handleTourFlyToBbox}
      />

      <TopBar
        currentYear={timeline.currentYear}
        activeCount={activeConflicts.filter(c => c.isActive).length}
        totalCount={conflicts.length}
        onJumpToLive={handleJumpToLive}
        onShowAllConflicts={handleShowAllConflicts}
        onOpenTour={() => setTourOpen(true)}
        activeConflicts={activeConflicts}
      />

      <InfoBoxLayer
        conflicts={filteredActiveConflicts}
        mapRef={mapRef.current}
        onConflictClick={handleConflictClick}
        selectedId={selectedConflict?.id ?? null}
        mapMoveCounter={mapMoveCounter}
      />

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
          currentYear={timeline.currentYear}
          onConflictClick={handleConflictClick}
          onClose={handleCloseListPanel}
          selectedId={selectedConflict?.id ?? null}
        />
      )}

      {/* City name-timeline modal — shows all historical names for a clicked city location */}
      <CityTimelineModal
        coords={cityClickCoords}
        citiesData={citiesData}
        onClose={() => setCityClickCoords(null)}
      />

      {/* Mobile tab dock — Map / Tour / Search / Cite, hidden on ≥sm */}
      <MobileTabDock
        active={useMobileTab({
          tourOpen,
          filterOpen: false, // FilterPanel manages its own open state internally
          sidebarOpen,
        })}
        onMap={() => {
          if (sidebarOpen) handleCloseSidebar();
          if (listPanelOpen) handleCloseListPanel();
        }}
        onTour={() => setTourOpen(true)}
        onSearch={() => handleShowAllConflicts()}
        onCite={() => {
          if (selectedConflict) {
            window.location.href = `/c/${selectedConflict.id}`;
          } else {
            handleShowAllConflicts();
          }
        }}
      />
    </main>
    </ErrorBoundary>
  );
}
