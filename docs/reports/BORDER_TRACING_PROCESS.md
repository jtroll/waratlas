# Border Tracing Process — War Atlas

This is the documented, repeatable process for replacing low-quality empire polygons in `public/empires.json` with hand-traced or canonically-sourced geometry. It is the process used in the 2026-05-17 border-accuracy pass and is meant to be re-run for future passes.

## When to trace

Run the shape-pathology scan first:

```bash
python3 scripts/scan_shape_pathology.py
```

A feature is flagged for replacement if **any** of:

| Heuristic | Threshold | What it catches |
|---|---|---|
| `verts == 4 && bbox_fill > 0.95` | — | Hand-drawn rectangles |
| `iso > 0.85 && verts < 25 && area > 4 deg²` | — | Auto-generated circles/ovals |
| `total_verts < 20 && area > 50 deg²` | — | Large territories with too few anchors |
| `borderStyle == 'dashed' && source ~ "clipped-country"` | — | Pie-slice artifacts from coastline clipping |

`iso` is the isoperimetric ratio `4πA / P²` — 1.0 is a perfect circle, 0.785 is a square, well-traced real boundaries land 0.4–0.7.

**Do not** trip the heuristic on the iso metric alone for vertex counts ≥ 25; real compact regions (Chaco Canyon, Tarascan heartland) legitimately score high.

## Source hierarchy

Use sources in this order. **Stop at the first hit that's substantially better than the current geometry.**

1. **`aourednik/historical-basemaps`** (already the project's primary source). Year-keyed GeoJSON files at `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{YEAR}.geojson`. Years available: -10000 through 2000 at 100–500 year steps, plus several specialty years (1492, 1715, 1783, 1815, 1914, 1938, 1945, 1994). Match by `properties.NAME` (case-insensitive substring), then validate by year-distance from the empire's `borderYear` and a bbox-center plausibility check.

2. **Wikipedia Commons** SVG maps. Look for files like `File:Empire_X_at_its_greatest_extent.svg`. Many include lat/lon grids or are projected over a basemap, so a path's coordinates can be converted to lat/lon with an affine transform from a handful of georeferenced anchor points.

3. **Wikipedia article prose**, used to construct a polygon vertex-by-vertex. Standard pattern: pull the territorial-extent paragraph (bounded by rivers, mountains, modern country names, named cities), convert each named anchor to a well-known lat/lon, walk the boundary clockwise with intermediate vertices filled in for any anchor-to-anchor stretch longer than ~100 km.

4. **Natural Earth 1:10m historical admin layers** for ~1800+ colonial-era polities only.

5. **Published scholarly atlases** as a last resort, cited by full reference (author, title, year, plate number).

**Not acceptable:** fan-made maps (r/imaginarymaps, Wikipedia user-talk speculation, etc.). These look high-effort but are speculative cartography.

## The mechanical process

### Step 1 — Identify the feature

```python
target_id = 'americas-coosa-chiefdom'
feat = by_id[target_id]
curr = feat['geometry']
```

Note its current `borderYear`, `accurate` flag, and `source`. The new polygon should be valid at that `borderYear`.

### Step 2 — Hunt in historical-basemaps first

The function `find_best_hb_match(keywords, border_year)` in `scripts/hand_trace_borders.py` does this: it walks every cached HB year file, finds features whose `NAME` contains any keyword, and ranks candidates by `(year_distance, -vertex_count)`. If the best candidate has ≥30 vertices and a bbox center within ~5° of the current center, use it directly.

Cache HB files locally with:

```bash
for year in 100 500 700 1000 1200 1300 1492 1500 1600 1700 1800 1815 1900; do
  curl -sL -o /tmp/hb_${year}.geojson \
    "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_${year}.geojson"
done
```

### Step 3 — Hand-trace when HB is insufficient

If HB has no match (or only a low-vertex shape), construct the polygon manually.

**Anchor selection.** For each empire, identify 5–15 geographic anchors from the Wikipedia article: river headwaters, river mouths, mountain passes, named cities at the frontier, points where the empire bordered a known polity. Look each up by name — coordinates are typically known to 0.1°.

**Walking the boundary.** Start at any anchor and walk clockwise (the GeoJSON spec wants outer rings counter-clockwise, but most renderers including Mapbox accept either; the loader normalizes if needed). For each anchor-to-anchor stretch:

- If the boundary follows a river: add intermediate vertices at every major bend.
- If it follows a coastline: pick anchor points at major capes/headlands, let the renderer interpolate.
- If it follows a watershed or ill-defined frontier: 2–3 intermediate vertices is enough.

Aim for one vertex per ~50–100 km of frontier for territories under 50 deg²; one per ~200 km for steppe/desert frontiers.

**Multipolygons.** Island empires (Ryukyu, Tahiti, Tonga) MUST be MultiPolygons — one polygon per significant island. Mapbox renders detached parts of a single Polygon as a single connected shape, which gives the wrong impression.

### Step 4 — Validate before writing

Run these checks for every new geometry:

| Check | Threshold | Rationale |
|---|---|---|
| Ring is closed | `ring[0] == ring[-1]` | GeoJSON spec |
| Ring has ≥ 4 vertices | — | Polygon needs ≥3 distinct |
| No self-intersection | `shapely.is_valid` | Mapbox renders self-intersections wrong |
| Bbox center within 5° of historical center | from Wikipedia | Catches wrong-hemisphere errors |
| Area within 0.3×–3× of current | — | Catches order-of-magnitude scale errors |
| No vertices in deep ocean for inland polities | bbox vs. Natural Earth coastline | Catches the Coosa-pie-slice failure mode |

The script `scripts/hand_trace_borders.py` runs the closure / vertex-count / bbox checks automatically.

### Step 5 — Update properties

```python
p['accurate'] = True
p['borderStyle'] = 'solid'
p['source'] = 'hand-traced-from:en.wikipedia.org/wiki/' + ARTICLE_SLUG  # or 'historical-basemaps:YEAR:NAME'
p['borderYear'] = YEAR_TRACED
p['handCraftedNote'] = 'one-sentence rationale incl. extent description'
p.pop('matchedRegion', None)  # only set when source is HB
```

### Step 6 — Re-run the pathology scan

Confirm the feature no longer trips the heuristics. Spot-check the rendered result by reloading the dev server.

## Tracing from raster images (advanced)

For empires where Wikipedia has only a raster map (PNG, JPG) and no SVG, the affine-transform method works:

1. Save the raster to `outputs/trace_input.png`.
2. Identify 4+ georeferenced anchor points visible in the image — modern cities, river mouths, lat/lon grid intersections. Record both their **pixel** coordinates (from inspecting the image) and **lat/lon** coordinates (known).
3. Solve the affine transform `(px, py) → (lon, lat)` using least-squares. Three anchors give an exact solution; four or more gives over-determined least squares that surfaces projection mismatches.
4. For each vertex you want to add: hover the image at high zoom, record the pixel coordinate, transform.
5. Validate the round-trip — feed each anchor's pixel coordinate through the transform and confirm the lat/lon is within 0.1°. Mismatch >0.5° means the source is on an unusual projection (e.g., Lambert conformal vs Mercator) and the affine assumption breaks down — switch to a per-region projection or pick a different source.

A worked example for a Lambert-projected map needs more anchors than for a Mercator one, because the affine approximation degrades faster from the projection center.

**What this process explicitly does NOT do:** automated edge-detection on a raster image. The cost of disambiguating which dark pixels represent the polygon's frontier vs. other map features (rivers, coastlines, labels) far exceeds the cost of clicking 20 vertices by hand. Trust a human eye on a high-resolution map over an OpenCV pipeline.

## Attribution and reproducibility

Every replacement must set `source` to a fetchable URL or a full bibliographic citation. The shape of the value is one of:

- `historical-basemaps:{YEAR}:{NAME}` — sourced from aourednik's repo
- `hand-traced-from:{HOSTNAME}/path` — sourced from a specific page (Wikipedia, Commons, scholarly site)
- `Wikipedia "{ARTICLE}"; {ADDITIONAL_CITATION}` — when combining multiple text sources

This is what the sidebar displays in the "Borders" section and what makes the project's claims verifiable.

## Pathology scan implementation

Save as `scripts/scan_shape_pathology.py`:

```python
import json, math
from collections import Counter
from pathlib import Path

def ring_metrics(ring):
    n = len(ring) - 1 if ring[0] == ring[-1] else len(ring)
    if n < 3: return None
    xs = [p[0] for p in ring[:n]]; ys = [p[1] for p in ring[:n]]
    a = sum(xs[i] * ys[(i+1)%n] - xs[(i+1)%n] * ys[i] for i in range(n)) / 2.0
    area = abs(a)
    bbox = (min(xs), min(ys), max(xs), max(ys))
    bbox_area = (bbox[2]-bbox[0]) * (bbox[3]-bbox[1])
    per = sum(math.hypot(xs[(i+1)%n]-xs[i], ys[(i+1)%n]-ys[i]) for i in range(n))
    return n, area, bbox, bbox_area, per

def scan(features):
    flagged = []
    for feat in features:
        g = feat['geometry']
        polys = g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        total_v, largest_a, largest_m = 0, 0, None
        for poly in polys:
            m = ring_metrics(poly[0])
            if m is None: continue
            n, area, *_ = m
            total_v += n
            if area > largest_a:
                largest_a, largest_m = area, m
        if not largest_m: continue
        n, area, bbox, bbox_area, per = largest_m
        iso = (4*math.pi*area) / (per*per) if per > 0 else 0
        fill = area / bbox_area if bbox_area > 0 else 0
        flags = []
        if n == 4 and fill > 0.95: flags.append('SQUARE')
        if iso > 0.85 and area > 4 and n < 25: flags.append(f'circle-iso={iso:.2f}')
        if total_v < 20 and area > 50: flags.append('few-verts')
        if flags:
            flagged.append((feat['properties']['id'], flags))
    return flagged

data = json.loads(Path('public/empires.json').read_text())
for fid, flags in scan(data['features']):
    print(f"  {fid:40s} {' | '.join(flags)}")
```

## Pass history

- **2026-05-17, J.T. + Claude**: First systematic pass. Marked 134 features as approximate per source-based rules; HB-upgraded 17 empires; hand-traced 12 from Wikipedia. Reduced offender list 30 → 16. Process documented above.
