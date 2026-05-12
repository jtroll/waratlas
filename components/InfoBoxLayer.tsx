'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { ActiveConflict, Conflict, ScreenPosition } from '@/lib/types';
import { formatYear } from '@/lib/conflicts';
import { MapViewHandle } from './MapView';

interface InfoBoxLayerProps {
  conflicts: ActiveConflict[];
  mapRef: MapViewHandle | null;
  onConflictClick: (conflict: Conflict) => void;
  selectedId: string | null;
  mapMoveCounter: number;
}

interface PositionedBox {
  conflict: ActiveConflict;
  clusterSize: number;   // total conflicts in this cluster
  dotScreen: ScreenPosition;
  boxX: number;
  boxY: number;
  angle: number;         // which angle we placed it at (for connector line)
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
  let cx = dotX + Math.cos(angle) * dist;
  let cy = dotY + Math.sin(angle) * dist;

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

export default function InfoBoxLayer({
  conflicts,
  mapRef,
  onConflictClick,
  selectedId,
  mapMoveCounter,
}: InfoBoxLayerProps) {
  const [boxes, setBoxes] = useState<PositionedBox[]>([]);

  const computePositions = useCallback(() => {
    if (!mapRef || typeof window === 'undefined') return;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const zoom = mapRef.getZoom();
    const active = conflicts.filter(c => c.isActive && c.opacity > 0.5);

    // Project all active conflicts to screen coords
    const projected: { conflict: ActiveConflict; screen: ScreenPosition }[] = [];
    for (const c of active) {
      const pos = mapRef.project(c.coordinates);
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
    let visibleClusters = clusters.slice(0, maxBoxes);

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
              const pos = mapRef.project(selConflict.coordinates);
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

    setBoxes(placedBoxes);
  }, [conflicts, mapRef, selectedId]);

  useEffect(() => {
    computePositions();
  }, [computePositions, mapMoveCounter]);

  if (boxes.length === 0) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      {boxes.map((box) => {
        const isSelected = box.conflict.id === selectedId;

        // Connector line endpoints
        const lineEndX = box.boxX + BOX_W / 2;
        const lineEndY = box.boxY + BOX_H / 2;

        return (
          <div key={box.conflict.id}>
            {/* Connector line */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              <line
                x1={box.dotScreen.x}
                y1={box.dotScreen.y}
                x2={lineEndX}
                y2={lineEndY}
                stroke={isSelected ? 'rgba(245,158,11,0.35)' : 'rgba(230,57,70,0.2)'}
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </svg>

            {/* Info card */}
            <div
              className="absolute pointer-events-auto"
              style={{
                left: box.boxX,
                top: box.boxY,
                width: BOX_W,
                opacity: box.conflict.opacity,
                transition: 'left 0.15s ease-out, top 0.15s ease-out, opacity 0.2s',
                zIndex: isSelected ? 10 : 1,
              }}
            >
              <div
                className={`info-box-enter bg-wars-panel/95 backdrop-blur-sm border rounded-lg p-2.5 cursor-pointer transition-colors hover:border-wars-accent/50 ${
                  isSelected
                    ? 'border-wars-accent shadow-lg shadow-wars-accent/20'
                    : 'border-wars-border'
                }`}
                onClick={() => onConflictClick(box.conflict)}
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
                      {formatYear(box.conflict.startYear)}
                      {box.conflict.endYear && box.conflict.endYear !== box.conflict.startYear
                        ? ` – ${formatYear(box.conflict.endYear)}`
                        : ''}
                      {!box.conflict.endYear && box.conflict.startYear > 2000 ? ' – present' : ''}
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
                          onConflictClick(box.conflict);
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
          </div>
        );
      })}
    </div>
  );
}
