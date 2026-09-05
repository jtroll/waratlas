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
  /** Screen rectangles occupied by chrome (sidebar, panels, legend, top bar,
   *  timeline). Callouts are never placed over them, and dots underneath
   *  them get no callout. Measured by the page from `[data-avoid]`. */
  avoidRects?: DOMRect[];
  /** A side panel is open — show at most two callouts (the selection plus
   *  the top-priority conflict); the panel carries the detail. */
  compact?: boolean;
  /** "+N nearby" was pressed — open the conflict list. */
  onShowNearby?: () => void;
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

const BOX_W = 216;
const BOX_H = 78;
const CLUSTER_PX = 100;
const DOT_OFFSET = 22; // distance from dot center to box edge

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect, padding = 4): boolean {
  return !(
    a.x + a.w + padding < b.x ||
    b.x + b.w + padding < a.x ||
    a.y + a.h + padding < b.y ||
    b.y + b.h + padding < a.y
  );
}

function pointInRects(x: number, y: number, rects: readonly Rect[]): boolean {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function boxHitsAvoid(pos: { x: number; y: number }, rects: readonly Rect[]): boolean {
  const box = { x: pos.x, y: pos.y, w: BOX_W, h: BOX_H };
  for (const r of rects) if (rectsOverlap(box, r)) return true;
  return false;
}

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
  screenH: number,
  avoid: readonly Rect[],
  compact: boolean,
): PositionedBox[] {
  const zoom = map.getZoom();
  const active = conflicts.filter(c => c.isActive && c.opacity > 0.5);

  // Project all active conflicts to screen coords. Dots hidden under a
  // panel (avoid rect) get no callout — except the selection, which the
  // page pans into view.
  const projected: { conflict: ActiveConflict; screen: ScreenPosition }[] = [];
  for (const c of active) {
    const pos = map.project(c.coordinates);
    if (pos && pos.x > -50 && pos.x < screenW + 50 && pos.y > -50 && pos.y < screenH + 50) {
      if (c.id !== selectedId && pointInRects(pos.x, pos.y, avoid)) continue;
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
  // With a side panel open, two at most: the selection + the top priority.
  const isMobile = screenW < 640;
  const maxBoxes = compact
    ? 2
    : isMobile
      ? 3
      : zoom > 5 ? 12 : zoom > 3 ? 8 : 6;
  const visibleClusters = clusters.slice(0, maxBoxes);

  // If a conflict is selected but didn't make the cut, force-add it.
  if (selectedId) {
    const selectedInVisible = visibleClusters.some(cl => cl.primary.id === selectedId);
    if (!selectedInVisible) {
      if (compact && visibleClusters.length >= maxBoxes) visibleClusters.pop();
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

      // Hard test: does this angle overlap any already-placed box, or
      // land on chrome (sidebar, legend, top bar, timeline…)?
      let overlaps = boxHitsAvoid(pos, avoid);
      if (!overlaps) {
        for (const placed of placedBoxes) {
          if (boxesOverlap(pos, { x: placed.boxX, y: placed.boxY })) {
            overlaps = true;
            break;
          }
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
const NO_RECTS: DOMRect[] = [];

function InfoBoxLayer({
  conflicts,
  mapRef,
  onConflictClick,
  selectedId,
  avoidRects = NO_RECTS,
  compact = false,
  onShowNearby,
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
  const inputsRef = useRef({ conflicts, selectedId, avoidRects, compact });
  inputsRef.current = { conflicts, selectedId, avoidRects, compact };

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
    const { conflicts: list, selectedId: sel, avoidRects: rects, compact: cmp } = inputsRef.current;
    const avoid: Rect[] = [];
    for (const r of rects) {
      if (r.width > 0 && r.height > 0) avoid.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    const placed = placeBoxes(list, map, sel, window.innerWidth, window.innerHeight, avoid, cmp);

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
  }, [compute, conflicts, selectedId, avoidRects, compact]);

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
              stroke={isSelected ? 'var(--amber)' : 'var(--rule-strong)'}
              strokeOpacity={isSelected ? 0.7 : 1}
              strokeWidth="1"
              strokeDasharray={isSelected ? undefined : '3,3'}
            />
          );
        })}
      </svg>

      {boxes.map((box) => {
        const isSelected = box.conflict.id === selectedId;
        const nearby = box.clusterSize - 1;
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
            className="info-box-enter relative"
            style={{
              background: 'var(--surface-panel, oklch(0.20 0.014 250 / 0.95))',
              backdropFilter: 'blur(var(--blur-panel, 18px))',
              WebkitBackdropFilter: 'blur(var(--blur-panel, 18px))',
              border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--rule-strong)'}`,
              borderRadius: 0,
            }}
          >
            {/* The whole card is the button (a11y); "+N nearby" is a
                sibling control so buttons don't nest. */}
            <button
              type="button"
              onClick={() => handleClick(box.conflict.id, box.conflict)}
              className="block w-full text-left transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                borderRadius: 0,
                padding: '8px 10px 7px',
                cursor: 'pointer',
                color: 'var(--ink-text)',
                // Reserve the bottom-right corner for the nearby control.
                paddingRight: nearby > 0 ? 88 : 10,
              }}
              aria-label={`${box.conflict.name}, ${formatYearRange(box.conflict.startYear, box.conflict.endYear)}. Show details`}
            >
              <span className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="flex-shrink-0"
                  style={{
                    width: 6,
                    height: 6,
                    marginTop: 5,
                    background: isSelected ? 'var(--amber)' : 'var(--vermilion)',
                  }}
                />
                <span className="flex-1 min-w-0">
                  <span
                    className="block font-display truncate"
                    style={{ fontSize: 12.5, lineHeight: '16px', fontWeight: 500 }}
                  >
                    {box.conflict.name}
                  </span>
                  <span
                    className="block font-mono tabular-nums"
                    style={{ fontSize: 11, lineHeight: '14px', color: 'var(--ink-muted)', marginTop: 1 }}
                  >
                    {formatYearRange(box.conflict.startYear, box.conflict.endYear)}
                  </span>
                  {box.conflict.countries.length > 0 && (
                    <span
                      className="block font-ui truncate"
                      style={{ fontSize: 11, lineHeight: '14px', color: 'var(--ink-muted)' }}
                    >
                      {box.conflict.countries.slice(0, 3).join(' vs ')}
                      {box.conflict.countries.length > 3
                        ? ` +${box.conflict.countries.length - 3}`
                        : ''}
                    </span>
                  )}
                  <span
                    className="block font-ui"
                    style={{
                      fontSize: 12,
                      lineHeight: '16px',
                      marginTop: 3,
                      color: isSelected ? 'var(--amber)' : 'var(--ink-text-2)',
                    }}
                  >
                    Details ›
                  </span>
                </span>
              </span>
            </button>
            {nearby > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowNearby?.();
                }}
                className="absolute font-ui hover:text-wars-text transition-colors"
                style={{
                  right: 8,
                  bottom: 6,
                  fontSize: 12,
                  lineHeight: '16px',
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid var(--rule)',
                  borderRadius: 0,
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                aria-label={`${nearby} more ${nearby === 1 ? 'conflict' : 'conflicts'} nearby — open the list`}
                title="Open the list of active conflicts"
              >
                +{nearby} nearby
              </button>
            )}
          </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(InfoBoxLayer);
