#!/usr/bin/env python3
"""
Scan public/empires.json for polygons with shape pathology — primitives
(rectangles, ovals, half-circles) and large territories with too few anchors.

Heuristics:
  - SQUARE       : 4-vertex ring whose bbox fill exceeds 0.95
  - circle-iso=X : isoperimetric ratio > 0.85 with <15 vertices and area >4 deg^2
                   (real compact regions can score 0.85+ with >=15 vertices,
                    so we don't flag those)
  - few-verts    : total vertex count <20 with area >50 deg^2

Iso ratio = 4*pi*A / P^2  (1.0 perfect circle, 0.785 square, real boundaries 0.4-0.7).

Run from repo root:
    python3 scripts/scan_shape_pathology.py
"""
from __future__ import annotations
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMPIRES = ROOT / 'public' / 'empires.json'


def ring_metrics(ring):
    n = len(ring) - 1 if ring[0] == ring[-1] else len(ring)
    if n < 3:
        return None
    xs = [p[0] for p in ring[:n]]
    ys = [p[1] for p in ring[:n]]
    area = abs(sum(xs[i] * ys[(i + 1) % n] - xs[(i + 1) % n] * ys[i] for i in range(n))) / 2.0
    bbox = (min(xs), min(ys), max(xs), max(ys))
    bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    per = sum(math.hypot(xs[(i + 1) % n] - xs[i], ys[(i + 1) % n] - ys[i]) for i in range(n))
    return n, area, bbox, bbox_area, per


def feature_polygons(feat):
    g = feat['geometry']
    if g['type'] == 'Polygon':
        yield g['coordinates']
    elif g['type'] == 'MultiPolygon':
        for poly in g['coordinates']:
            yield poly


def shape_score(feat):
    total_v = 0
    largest_a = 0.0
    largest = None
    for poly in feature_polygons(feat):
        m = ring_metrics(poly[0])
        if m is None:
            continue
        n, area, *_ = m
        total_v += n
        if area > largest_a:
            largest_a = area
            largest = m
    if largest is None:
        return None
    n, area, bbox, bbox_area, per = largest
    iso = (4 * math.pi * area) / (per * per) if per > 0 else 0
    fill = area / bbox_area if bbox_area > 0 else 0
    return {'verts': n, 'total_v': total_v, 'area': area, 'iso': iso, 'fill': fill}


def main():
    data = json.loads(EMPIRES.read_text())
    flagged = []
    for feat in data['features']:
        s = shape_score(feat)
        if not s:
            continue
        flags = []
        if s['verts'] == 4 and s['fill'] > 0.95:
            flags.append('SQUARE')
        if s['iso'] > 0.85 and s['area'] > 4 and s['verts'] < 15:
            flags.append(f"circle-iso={s['iso']:.2f}")
        if s['total_v'] < 20 and s['area'] > 50:
            flags.append('few-verts')
        if flags:
            flagged.append((feat['properties']['id'], s, flags))

    if not flagged:
        print('No geometric offenders found.')
        return

    print(f"{'id':45s} {'verts':>5s} {'area':>7s} {'iso':>5s} {'fill':>5s}  flags")
    print('-' * 100)
    for fid, s, flags in flagged:
        print(f"{fid:45s} {s['verts']:>5d} {s['area']:>7.1f} {s['iso']:>5.2f} {s['fill']:>5.2f}  {' | '.join(flags)}")
    print(f"\n{len(flagged)} flagged of {len(data['features'])} features")


if __name__ == '__main__':
    main()
