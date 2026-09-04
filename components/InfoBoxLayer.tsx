'use client';

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { ActiveConflict, Conflict, ScreenPosition } from '@/lib/types';
import { formatYearRange } from '@/lib/format';
import { MapViewHandle } from './MapView';

interface InfoBoxLayerProps {
  conflicts: ActiveConflict[];
  /** The MapView handle ref. Read at call time (it is null on the first
   *  render; the layer subscribes to map moves through it in an effect). */
  mapRef: RefObject<MapViewHandle | null>;
  onConflictClick: (conflict: Conflict) => void;
  selectedId: string | null;
}

interface PositionedBox {
  conflict: ActiveConflict;
  clusterSize: number;   // total conflicts in this cluster
  dotScreen: ScreenPosition;
  boxX: number;
  boxY: number;
  angle: number;         // which angle we placed it at (for connector line)
}

/** What React renders: identity + label data. Positions live in a ref and
 *  are written straight to the DOM (see applyPositions). */
interface RenderedBox {
  conflict: ActiveConflict;
  clusterSize: number;
}

interface BoxPosition {
  x: number;
  y: number;
  dotX: number;
  dotY: number;
  opacity: number;
}

const BOX_W = 230;
const BOX_H = 85;
const CLUSTER_PX = 100;
const DOT_OFFSET = 22; // distance from dot center to box edge

// 8 candidate angles (in radians): right, upper-right, up, upper-left, left, lower-left, down, lower-right
const ANGLES = [
  0,                    // right
  -Math.PI / 4,         // upper-right
  -Math.PI / 2,         // up
  -3 * Math.PI / 4,     // upper-left
  Math.PI,              // left
  3 * Math.PI / 4,      // lower-left
  Math.PI / 2,          // down
  Math.PI / 4,          // lower-right
];

function getBoxPosition(
  dotX: number,
  dotY: number,
  angle: number,
  screenW: number,
  screenH: number
): { x: number; y: number } {
  // Place box center at offset from dot in the given angle direction
  const dist = DOT_OFFSET + Math.max(BOX_W, BOX_H) / 2;
  const cx = dotX + Math.cos(angle) * dist;
  const cy = dotY + Math.sin(angle) * dist;

  // Convert from center to top-left
  let x = cx - BOX_W / 2;
  let y = cy - BOX_H / 2;

  // Clamp to screen bounds (with margins for top bar and timeline)
  x = Math.max(8, Math.min(x, screenW - BOX_W - 8));
  y = Math.max(60, Math.min(y, screenH - BOX_H - 140));

  return { x, y };
}

function boxesOverlap(
  a: { x: number; y: number },
  b: { x: number; y: number },
  padding: number = 8
): boolean {
  return !(
    a.x + BOX_W + padding < b.x ||
    b.x + BOX_W + padding < a.x ||
    a.y + BOX_H + padding < b.y ||
    b.y + BOX_H + padding < a.y
  );
}

/**
 * Placement algorithm — unchanged from the state-driven version: project,
 * priority-sort, cluster, cap by zoom, force the selection in, then pick
 * the best of 8 angles per box and skip boxes that can only overlap.
 */
function placeBoxes(
  conflicts: ActiveConflict[],
  map: MapViewHandle,
  selectedId: string | null,
  screenW: number,
  screenH: number
): PositionedBox[] {
  const zoom = map.getZoom();
  const active = conflicts.filter(c => c.isActive && c.opacity > 0.5);

  // Project all active conflicts to screen coords
  const projected: { conflict: ActiveConflict; screen: ScreenPosition }[] = [];
  for (const c of active) {
    const pos = map.project(c.coordinates);
    if (pos && pos.x > -50 && pos.x < screenW + 50 && pos.y > -50 && pos.y < screenH + 50) {
      projected.push({ conflict: c, screen: pos });
    }
  }

  // Sort by priority
  projected.sort((a, b) => b.conflict.displayPriority - a.conflict.displayPriority);

  // Cluster nearby dots
  const used = new Set<string>();
  const clusters: { primary: ActiveConflict; count: number; screen: ScreenPosition }[] = [];

  for (const item of projected) {
    if (used.has(item.conflict.id)) continue;
    used.add(item.conflict.id);

    let count = 1;
    for (const other of projected) {
      if (used.has(other.conflict.id)) continue;
      const dx = item.screen.x - other.screen.x;
      const dy = item.screen.y - other.screen.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_PX) {
        count++;
        used.add(other.conflict.id);
      }
    }

    // If selected conflict is in this cluster, swap it to primary
    if (selectedId) {
      const selItem = projected.find(p => p.conflict.id === selectedId && !clusters.some(cl => cl.primary.id === p.conflict.id));
      if (selItem) {
        const dx = item.screen.x - selItem.screen.x;
        const dy = item.screen.y - selItem.screen.y;
        if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_PX) {
          clusters.push({ primary: selItem.conflict, count, screen: selItem.screen });
          continue;
        }
      }
    }

    clusters.push({ primary: item.conflict, count, screen: item.screen });
  }

  // Limit visible boxes. On mobile we cap at 3 — the screen is narrow
  // and the boxes are 230px wide, so showing more would stack them on
  // top of each other. The skip-on-overlap pass below ensures we never
  // end up with visually overlapping callouts even at the cap.
  const isMobile = screenW < 640;
  const maxBoxes = isMobile
    ? 3
    : zoom > 5 ? 12 : zoom > 3 ? 8 : 6;
  const visibleClusters = clusters.slice(0, maxBoxes);

  // If a conflict is selected but didn't make the cut, force-add it.
  if (selectedId) {
    const selectedInVisible = visibleClusters.some(cl => cl.primary.id === selectedId);
    if (!selectedInVisible) {
      const selectedCluster = clusters.find(cl => cl.primary.id === selectedId);
      if (selectedCluster) {
        visibleClusters.push(selectedCluster);
      } else {
        const selProj = projected.find(p => p.conflict.id === selectedId);
        if (selProj) {
          visibleClusters.push({ primary: selProj.conflict, count: 1, screen: selProj.screen });
        } else {
          const selConflict = conflicts.find(c => c.id === selectedId);
          if (selConflict) {
            const pos = map.project(selConflict.coordinates);
            if (pos && pos.x > -50 && pos.x < screenW + 50 && pos.y > -50 && pos.y < screenH + 50) {
              visibleClusters.push({ primary: selConflict, count: 1, screen: pos });
            }
          }
        }
      }
    }
  }

  // Place boxes using best-fit angle to avoid overlaps. If no angle
  // exists that avoids overlap with already-placed boxes, SKIP this
  // box entirely (clean map > crowded text). Exception: the selected
  // conflict is forced through even if it has to overlap.
  const placedBoxes: PositionedBox[] = [];

  for (const cluster of visibleClusters) {
    const isSelectedCluster = cluster.primary.id === selectedId;
    let bestAngle = ANGLES[0];
    let bestPos = getBoxPosition(cluster.screen.x, cluster.screen.y, bestAngle, screenW, screenH);
    let bestScore = -Infinity;
    let bestOverlaps = true;

    for (const angle of ANGLES) {
      const pos = getBoxPosition(cluster.screen.x, cluster.screen.y, angle, screenW, screenH);

      // Hard test: does this angle overlap any already-placed box?
      let overlaps = false;
      for (const placed of placedBoxes) {
        if (boxesOverlap(pos, { x: placed.boxX, y: placed.boxY })) {
          overlaps = true;
          break;
        }
      }

      // Score: prefer no overlaps, prefer staying on screen, prefer right/upper-right
      let score = 100;
      if (overlaps) score -= 200;
      if (pos.x <= 10 || pos.x >= screenW - BOX_W - 10) score -= 30;
      if (pos.y <= 65 || pos.y >= screenH - BOX_H - 145) score -= 30;
      if (angle === 0) score += 5;
      if (angle === -Math.PI / 4) score += 3;

      if (score > bestScore) {
        bestScore = score;
        bestAngle = angle;
        bestPos = pos;
        bestOverlaps = overlaps;
      }
    }

    // If the best position still overlaps and this isn't the user's
    // selected conflict, skip it rather than create visual mud. The
    // dot itself remains on the map; users can still click it.
    if (bestOverlaps && !isSelectedCluster) continue;

    placedBoxes.push({
      conflict: cluster.primary,
      clusterSize: cluster.count,
      dotScreen: cluster.screen,
      boxX: bestPos.x,
      boxY: bestPos.y,
      angle: bestAngle,
    });
  }

  return placedBoxes;
}

/**
 * On-map callouts.
 *
 * Positions are recomputed on every map `move` (rAF-coalesced) and on
 * every change of the active set / selection, but React state only
 * changes when the SET of visible boxes (ids + cluster counts) changes.
 * Otherwise the new positions are written directly to the card transforms
 * and the connector line endpoints. All connectors share one SVG.
 */
function InfoBoxLayer({
  conflicts,
  mapRef,
  onConflictClick,
  selectedId,
}: InfoBoxLayerProps) {
  const [boxes, setBoxes] = useState<RenderedBox[]>([]);
  const signatureRef = useRef('');
  const positionsRef = useRef<Map<string, BoxPosition>>(new Map());
  // Latest ActiveConflict per rendered id. The state's conflict object can
  // be a frame behind (or predate the lazy text merge), so clicks resolve
  // through here.
  const latestRef = useRef<Map<string, ActiveConflict>>(new Map());
  const cardEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const lineEls = useRef<Map<string, SVGLineElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  // Latest inputs for the move handler, which is subscribed once.
  const inputsRef = useRef({ conflicts, selectedId });
  inputsRef.current = { conflicts, selectedId };

  const applyPositions = useCallback(() => {
    positionsRef.current.forEach((p, id) => {
      const card = cardEls.current.get(id);
      if (card) {
        card.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        card.style.opacity = String(p.opacity);
      }
      const line = lineEls.current.get(id);
      if (line) {
        line.setAttribute('x1', String(p.dotX));
        line.setAttribute('y1', String(p.dotY));
        line.setAttribute('x2', String(p.x + BOX_W / 2));
        line.setAttribute('y2', String(p.y + BOX_H / 2));
      }
    });
  }, []);

  const compute = useCallback(() => {
    const map = mapRef.current;
    if (!map || typeof window === 'undefined') return;
    const { conflicts: list, selectedId: sel } = inputsRef.current;
    const placed = placeBoxes(list, map, sel, window.innerWidth, window.innerHeight);

    const positions = new Map<string, BoxPosition>();
    const latest = new Map<string, ActiveConflict>();
    let signature = '';
    for (const b of placed) {
      positions.set(b.conflict.id, {
        x: b.boxX,
        y: b.boxY,
        dotX: b.dotScreen.x,
        dotY: b.dotScreen.y,
        opacity: b.conflict.opacity,
      });
      latest.set(b.conflict.id, b.conflict);
      signature += `${b.conflict.id}:${b.clusterSize}|`;
    }
    positionsRef.current = positions;
    latestRef.current = latest;

    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      // The layout effect below applies positions after this render.
      setBoxes(placed.map((b) => ({ conflict: b.conflict, clusterSize: b.clusterSize })));
    } else {
      applyPositions();
    }
  }, [mapRef, applyPositions]);

  // Inputs changed (new active set, selection) → recompute now.
  useEffect(() => {
    compute();
  }, [compute, conflicts, selectedId]);

  // Map moved → recompute at most once per animation frame, outside React.
  useEffect(() => {
    const map = mapRef.current;
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        compute();
      });
    };
    const unsubscribe = map ? map.onMove(schedule) : undefined;
    window.addEventListener('resize', schedule);
    return () => {
      unsubscribe?.();
      window.removeEventListener('resize', schedule);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mapRef, compute]);

  // After every render, put the (possibly new) elements where the last
  // computation said they go — before paint.
  useLayoutEffect(() => {
    applyPositions();
  });

  const handleClick = useCallback(
    (id: string, fallback: ActiveConflict) => {
      onConflictClick(latestRef.current.get(id) ?? fallback);
    },
    [onConflictClick],
  );

  if (boxes.length === 0) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {/* One shared SVG for every connector line */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        {boxes.map((box) => {
          const isSelected = box.conflict.id === selectedId;
          return (
            <line
              key={box.conflict.id}
              ref={(el) => {
                if (el) lineEls.current.set(box.conflict.id, el);
                else lineEls.current.delete(box.conflict.id);
              }}
              stroke={isSelected ? 'rgba(245,158,11,0.35)' : 'rgba(230,57,70,0.2)'}
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          );
        })}
      </svg>

      {boxes.map((box) => {
        const isSelected = box.conflict.id === selectedId;
        return (
          <div
            key={box.conflict.id}
            ref={(el) => {
              if (el) cardEls.current.set(box.conflict.id, el);
              else cardEls.current.delete(box.conflict.id);
            }}
            className="absolute pointer-events-auto"
            style={{
              left: 0,
              top: 0,
              width: BOX_W,
              // Position (transform) and opacity are written directly to the
              // element. No transform transition: the card and its connector
              // move together during drags.
              transition: 'opacity 0.2s',
              zIndex: isSelected ? 10 : 1,
              willChange: 'transform',
            }}
          >
            <div
              className={`info-box-enter bg-wars-panel/95 backdrop-blur-lg border rounded-lg p-2.5 cursor-pointer transition-colors hover:border-wars-accent/50 ${
                isSelected
                  ? 'border-wars-accent shadow-lg shadow-wars-accent/20'
                  : 'border-wars-border'
              }`}
              onClick={() => handleClick(box.conflict.id, box.conflict)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-1.5 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-wars-red conflict-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-semibold text-wars-text leading-tight truncate">
                    {box.conflict.name}
                  </h3>
                  <p className="text-[10px] text-wars-muted mt-0.5">
                    {formatYearRange(box.conflict.startYear, box.conflict.endYear)}
                  </p>
                  {box.conflict.countries.length > 0 && (
                    <p className="text-[10px] text-wars-muted/70 mt-0.5 truncate">
                      {box.conflict.countries.slice(0, 3).join(' vs ')}
                      {box.conflict.countries.length > 3
                        ? ` +${box.conflict.countries.length - 3}`
                        : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      className="text-[10px] text-wars-accent hover:text-wars-accent/80 font-medium flex items-center gap-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(box.conflict.id, box.conflict);
                      }}
                    >
                      Learn more
                      <svg width="8" height="8" viewBox="0 0 10 10">
                        <path d="M3 1 L7 5 L3 9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </button>
                    {box.clusterSize > 1 && (
                      <span className="text-[10px] text-wars-muted/50">
                        +{box.clusterSize - 1} nearby
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(InfoBoxLayer);
