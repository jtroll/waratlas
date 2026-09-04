#!/usr/bin/env python3
"""
r15_add_polities.py — Phase 4 (r15): add the polities the audit (M3/M4) found
absent from data/empires.json, at full precision from aourednik/historical-basemaps.

    python3 scripts/r15_add_polities.py            # idempotent: ids already present are skipped
    HBM_DIR=/path/to/cache python3 scripts/r15_add_polities.py

Rules honoured (docs/data-review/polities-r15.md has the per-feature log):
  * geometry is copied verbatim from the HBM snapshot (no rounding, no
    simplification); where several HBM features make up one polity their
    polygons are concatenated into one MultiPolygon, coordinates untouched;
  * four polities that HBM does not draw (Athens, Sparta, Nicaea, Phoenicia)
    are hand-traced: the HBM coastline is clipped to a hand-drawn inland
    boundary, the result carries accurate:false / borderStyle:'dashed' and
    has >= 40 vertices;
  * never overlaps an existing feature of the same polity (checked by id);
  * data/empires.json is re-serialised exactly as it is now
    (json.dumps(..., ensure_ascii=False), no indent, no trailing newline);
  * Wikipedia summaries are fetched for the new ids when the network allows;
    failures are logged, never fatal.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

from shapely.algorithms.polylabel import polylabel
from shapely.geometry import MultiPolygon, Point, Polygon, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
EMPIRES = ROOT / 'data' / 'empires.json'
WIKI = ROOT / 'data' / 'empire-wikipedia.json'
HBM_DIR = Path(os.environ.get('HBM_DIR', '/tmp/waratlas-hbm'))
HBM_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{}.geojson'
WIKI_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/{}'
UA = 'WarAtlas/1.0 (https://github.com/jtroll/waratlas; contact: jtroll@gmail.com) r15-polities/1.0'

KEY_ORDER = ['id', 'name', 'startYear', 'endYear', 'color', 'accurate', 'labelPoint', 'borderStyle',
             'source', 'sourceDetail', 'polityType', 'borderYear', 'matchedRegion',
             'handCraftedNote', 'borderNote']

LOG: list[str] = []


def log(msg: str) -> None:
    LOG.append(msg)
    print(msg)


# --------------------------------------------------------------------------- HBM

def hbm_load(year: str) -> dict:
    HBM_DIR.mkdir(parents=True, exist_ok=True)
    fn = HBM_DIR / f'world_{year}.geojson'
    if not fn.exists() or fn.stat().st_size < 1000:
        req = urllib.request.Request(HBM_URL.format(year), headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r, open(fn, 'wb') as out:
            out.write(r.read())
    return json.load(open(fn, encoding='utf-8'))


def hbm_features(year: str, name: str, subjecto: str | None = None) -> list[dict]:
    out = []
    for f in hbm_load(year)['features']:
        p = f['properties']
        if p.get('NAME') == name and (subjecto is None or p.get('SUBJECTO') == subjecto):
            out.append(f)
    if not out:
        raise KeyError(f'{name!r} not in world_{year}')
    return out


def polys_of(geometry: dict) -> list:
    """Polygon coordinate arrays of a GeoJSON geometry, untouched."""
    if geometry['type'] == 'Polygon':
        return [geometry['coordinates']]
    if geometry['type'] == 'MultiPolygon':
        return list(geometry['coordinates'])
    raise ValueError(geometry['type'])


def merged_geometry(feats: list[dict]) -> dict:
    """Concatenate the polygons of several HBM features into one geometry (no coordinate edits)."""
    polys = []
    for f in feats:
        polys.extend(polys_of(f['geometry']))
    if len(polys) == 1:
        return {'type': 'Polygon', 'coordinates': polys[0]}
    return {'type': 'MultiPolygon', 'coordinates': polys}


def vertex_count(geometry: dict) -> int:
    return sum(len(r) for poly in polys_of(geometry) for r in poly)


# --------------------------------------------------------------------------- helpers

def largest_polygon(geom):
    if geom.geom_type == 'MultiPolygon':
        return max(geom.geoms, key=lambda p: p.area)
    return geom


def pole(geometry: dict, label=None) -> list[float]:
    """Pole of inaccessibility of the largest polygon; `label` = [lon, lat] hint: if it lies inside the
    geometry it is used as-is, otherwise the pole of the polygon containing it (else the largest)."""
    g = shape(geometry)
    if label is not None:
        pt = Point(label)
        if g.contains(pt):
            return [float(label[0]), float(label[1])]
        for poly in (g.geoms if g.geom_type == 'MultiPolygon' else [g]):
            if poly.contains(pt):
                g = poly
                break
    poly = largest_polygon(g)
    pt = polylabel(poly, tolerance=0.001)
    if not poly.contains(pt):
        pt = poly.representative_point()
    return [round(pt.x, 3), round(pt.y, 3)]


def only_polygons(geom):
    """Reduce a shapely result to Polygon/MultiPolygon (drops any line/point slivers)."""
    if geom.geom_type == 'Polygon':
        return geom
    if geom.geom_type == 'MultiPolygon':
        return geom
    parts = [g for g in getattr(geom, 'geoms', []) if g.geom_type in ('Polygon', 'MultiPolygon')]
    flat = []
    for g in parts:
        flat.extend(g.geoms if g.geom_type == 'MultiPolygon' else [g])
    return MultiPolygon(flat) if len(flat) > 1 else flat[0]


def to_geojson(geom) -> dict:
    m = mapping(geom)
    def conv(c):
        return [conv(x) for x in c] if isinstance(c, (list, tuple)) and c and isinstance(c[0], (list, tuple)) else [float(c[0]), float(c[1])]
    return {'type': m['type'], 'coordinates': conv(m['coordinates'])}


def clip(source_geoms: list, window: Polygon):
    """Intersect the union of the HBM source polygons with a hand-drawn window."""
    src = unary_union([shape(g) for g in source_geoms])
    return only_polygons(src.intersection(window))


def props(fid, name, s, e, color, accurate, geometry, source, detail, ptype, border_year=None,
          matched=None, hand_note=None, border_note=None, label=None) -> OrderedDict:
    p = OrderedDict()
    p['id'] = fid
    p['name'] = name
    p['startYear'] = s
    p['endYear'] = e
    p['color'] = color
    p['accurate'] = accurate
    p['labelPoint'] = pole(geometry, label)
    p['borderStyle'] = 'solid' if (accurate and ptype == 'state') else 'dashed'
    p['source'] = source
    p['sourceDetail'] = detail
    p['polityType'] = ptype
    if border_year is not None:
        p['borderYear'] = border_year
    if matched is not None:
        p['matchedRegion'] = matched
    if hand_note:
        p['handCraftedNote'] = hand_note
    if border_note:
        p['borderNote'] = border_note
    return p


def feature(p: OrderedDict, geometry: dict) -> OrderedDict:
    return OrderedDict([('type', 'Feature'), ('properties', p), ('geometry', geometry)])


# --------------------------------------------------------------------------- definitions

def hbm_pull(fid, name, s, e, color, year, hbm_names, ptype='state', border_note=None,
             accurate=True, subjecto=None, wiki=None, label=None):
    """A feature copied verbatim from one or more HBM features of one snapshot."""
    return {'kind': 'hbm', 'id': fid, 'name': name, 'start': s, 'end': e, 'color': color, 'year': year,
            'hbm': hbm_names if isinstance(hbm_names, list) else [hbm_names], 'ptype': ptype,
            'note': border_note, 'accurate': accurate, 'subjecto': subjecto, 'wiki': wiki, 'label': label}


NEW = [
    # --- Soviet Union: two slices, HBM 1938 (interwar) and HBM 1960 (Cold-War extent, incl. Kaliningrad,
    #     Tuva, Karelia, Sakhalin/Kurils). 1945 snapshot also considered: same outline plus 20 island slivers.
    hbm_pull('soviet-union-1938', 'Soviet Union (interwar)', 1922, 1945, '#B22222', '1938', 'USSR',
             border_note='HBM 1938 outline (pre-1939 borders); the USSR was founded 30 Dec 1922.',
             wiki='Soviet Union'),
    hbm_pull('soviet-union-1960', 'Soviet Union (Cold War)', 1945, 1991, '#B22222', '1960', 'USSR',
             border_note='HBM 1960 outline = the post-1945 extent (Kaliningrad, Tuva, Karelia, South Sakhalin, Kurils); dissolved 26 Dec 1991.',
             wiki='Soviet Union'),
    # --- Kingdom of Prussia: three slices; after 1871 it is a member state of the German Empire (german-empire).
    hbm_pull('kingdom-of-prussia-1715', 'Kingdom of Prussia (1715)', 1701, 1741, '#3d3d52', '1715',
             ['Brandenburg', 'Prussia'], subjecto='Prussia',
             border_note='HBM 1715: Brandenburg + Ducal Prussia (SUBJECTO=Prussia) merged; before the conquest of Silesia (1742).',
             wiki='Kingdom of Prussia'),
    hbm_pull('kingdom-of-prussia-1783', 'Kingdom of Prussia (1783)', 1742, 1814, '#3d3d52', '1783', 'Prussia',
             border_note='HBM 1783 (two features merged): with Silesia (1742) and West Prussia (1772); the 1793/95 partition gains and the 1807 Tilsit losses are not shown.',
             wiki='Kingdom of Prussia'),
    hbm_pull('kingdom-of-prussia-1815', 'Kingdom of Prussia (1815)', 1815, 1871, '#3d3d52', '1815', 'Prussia',
             border_note='HBM 1815 (five features merged): post-Vienna borders incl. the Rhine Province and Westphalia; ends 1871 when the German Empire feature takes over (the kingdom persisted inside the Reich until 1918).',
             wiki='Kingdom of Prussia'),
    # --- Sumer / Ur III
    hbm_pull('sumer-ur-iii', 'Sumer (Ur III)', -2900, -2004, '#6F4E37', 'bc2000', 'Ur',
             border_note='HBM -2000 "Ur" outline = the Third Dynasty of Ur (c. 2112-2004 BCE). Used for the whole Sumerian period: Early Dynastic Sumer (c. 2900-2350 BCE) was a mosaic of city-states in the same region, so the outline is a regional envelope, not a single state border.',
             wiki='Sumer', label=[45.8, 31.6]),
    # --- Kingdom of Israel and Judah
    hbm_pull('kingdom-of-israel-judah', 'Kingdom of Israel and Judah', -1000, -586, '#7B5184', 'bc1000',
             'Kingdom of David and Solomon', accurate=False,
             border_note='HBM -1000 "Kingdom of David and Solomon": the maximal biblical extent (to the Euphrates). The archaeologically attested kingdoms of Israel (to 722 BCE) and Judah (to 586 BCE) were far smaller, so the feature is marked approximate.',
             wiki='Kingdom of Israel (united monarchy)', label=[35.2, 31.8]),
    # --- Novgorod Republic
    hbm_pull('novgorod-republic', 'Novgorod Republic', 1136, 1478, '#5a7d9a', '1300', 'Novgorod',
             wiki='Novgorod Republic'),
    # --- Kingdom of Sicily (Norman, then Hohenstaufen/Angevin until the Vespers split)
    hbm_pull('kingdom-of-sicily', 'Kingdom of Sicily', 1130, 1282, '#CD5C5C', '1200', 'Dutchy of Benevento',
             border_note='HBM 1200 labels the whole Norman-Hohenstaufen kingdom (Sicily + the Mezzogiorno) "Dutchy of Benevento"; the geometry is the Kingdom of Sicily. Founded 1130 (Roger II), Hohenstaufen from 1194, Angevin from 1266; ends 1282 when the Sicilian Vespers split it (europe-naples continues the mainland).',
             wiki='Kingdom of Sicily'),
    # --- Visigoths: Toulouse (418-507) then Toledo (507-711)
    hbm_pull('visigothic-kingdom-toulouse', 'Visigothic Kingdom (Toulouse)', 418, 507, '#708238', '500', 'Visigoths',
             border_note='Aquitanian kingdom before the defeat at Vouillé (507).', wiki='Visigothic Kingdom'),
    hbm_pull('visigothic-kingdom-toledo', 'Visigothic Kingdom (Toledo)', 507, 711, '#708238', '600', 'Visigothic Kingdom',
             border_note='Hispanic kingdom after Vouillé; Septimania retained. Ends with the Umayyad conquest (711).',
             wiki='Visigothic Kingdom'),
    # --- Ostrogoths, Vandals, Lombards
    hbm_pull('ostrogothic-kingdom', 'Ostrogothic Kingdom', 493, 553, '#789262', '500', 'Ostrogoths',
             wiki='Ostrogothic Kingdom'),
    hbm_pull('vandal-kingdom', 'Vandal Kingdom', 435, 534, '#9c6b4f', '500', 'Vandals',
             border_note='Vandal and Alan kingdom of Carthage; Sardinia, Corsica and the Balearics as in HBM 500.',
             wiki='Vandal Kingdom'),
    hbm_pull('lombard-kingdom', 'Lombard Kingdom', 568, 774, '#6b8e5a', '600', 'Lombard principalities',
             border_note='HBM 600 "Lombard principalities" = the kingdom in the north plus the duchies of Spoleto and Benevento.',
             wiki='Kingdom of the Lombards'),
    # --- Samanids, Balhae, Toungoo, Kazan
    hbm_pull('samanid-empire', 'Samanid Empire', 819, 999, '#c0824a', '900', 'Samanid Empire', wiki='Samanid Empire'),
    hbm_pull('balhae', 'Balhae', 698, 926, '#7b9e89', '900', 'Balhae',
             border_note='HBM 900 outline (HBM 800 draws the same state as "Parhae").', wiki='Balhae'),
    hbm_pull('toungoo-burma', 'Toungoo Burma', 1510, 1752, '#4a7d8c', '1650', 'Ava',
             border_note='HBM 1650 "Ava" = the Restored Toungoo (Nyaungyan) kingdom. The First Toungoo Empire of Bayinnaung (1539-99) was much larger (Lan Na, Siam, Lan Xang); HBM 1600 draws only its collapse (Pegu + "Burmese kingdoms").',
             wiki='Toungoo dynasty'),
    hbm_pull('kazan-khanate', 'Kazan Khanate', 1438, 1552, '#bc8f5a', '1530', 'Kazan Khanate',
             border_note='HBM 1530 outline (only 12 vertices in the source; HBM 1500 still merges Kazan into the Golden Horde).',
             wiki='Khanate of Kazan'),
]

# Hand-traced (HBM coastline clipped to a hand-drawn inland boundary). Windows are lon/lat.
ATTICA_WINDOW = Polygon([(23.45, 37.5), (23.45, 38.02), (23.40, 38.25), (23.55, 38.37), (24.15, 38.37),
                         (24.30, 38.10), (24.30, 37.5)])
PELOPONNESE_WINDOW = Polygon([(20.9, 36.2), (20.9, 38.1), (21.5, 38.1), (21.6, 37.98), (22.6, 37.98),
                              (22.6, 38.05), (23.15, 38.05), (23.15, 37.9), (23.6, 37.9), (23.6, 36.2)])
ARGOLID_BLOCK = Polygon([(22.5, 37.45), (22.5, 37.85), (22.95, 37.85), (22.95, 37.45)])
NICAEA_WINDOW = Polygon([(25.8, 35.8), (25.8, 41.6), (32.3, 41.6), (32.3, 41.1), (31.3, 40.3), (30.7, 39.6),
                         (30.1, 38.7), (29.7, 38.1), (29.3, 37.5), (29.3, 35.8)])
# Phoenicia: coast from Tyre's hinterland to Arwad; inland edge follows the Mount Lebanon / Nusayriyah crest.
LEBANON_CREST = [(35.30, 33.05), (35.35, 33.12), (35.40, 33.20), (35.45, 33.27), (35.50, 33.33), (35.53, 33.39),
                 (35.55, 33.45), (35.58, 33.52), (35.60, 33.58), (35.63, 33.64), (35.65, 33.70), (35.68, 33.76),
                 (35.70, 33.82), (35.74, 33.88), (35.78, 33.95), (35.81, 34.02), (35.84, 34.08), (35.87, 34.14),
                 (35.90, 34.20), (35.93, 34.25), (35.96, 34.30), (35.99, 34.35), (36.02, 34.40), (36.04, 34.45),
                 (36.06, 34.50), (36.08, 34.55), (36.10, 34.60), (36.12, 34.66), (36.13, 34.72), (36.14, 34.78),
                 (36.15, 34.85), (36.14, 34.90), (36.13, 34.95), (36.12, 35.00), (36.10, 35.05)]
PHOENICIA_WINDOW = Polygon([(34.5, 33.05), (34.5, 35.05)] + list(reversed(LEBANON_CREST)))


def hand_traced_definitions():
    greek = hbm_features('bc500', 'Greek city-states')
    mainland_feat = max(greek, key=lambda f: vertex_count(f['geometry']))
    mainland_polys = polys_of(mainland_feat['geometry'])
    mainland = {'type': 'Polygon', 'coordinates': mainland_polys[0]}
    # Delian League islands: Euboea + the Cyclades (every island polygon of the feature east of 24.2E and
    # south of 39.1N) except Melos (neutral until 416 BCE) and Crete (never a member).
    islands = []
    for poly in mainland_polys[1:]:
        P = Polygon(poly[0])
        minx, miny, maxx, maxy = P.bounds
        if maxy > 39.1 or miny < 36.0:
            continue          # Crete (35N) / anything north of Euboea
        if minx >= 24.2 and maxx <= 24.7 and 36.6 <= miny <= 36.9:
            continue          # Melos
        islands.append({'type': 'Polygon', 'coordinates': poly})
    athens = clip([mainland], ATTICA_WINDOW)
    athens = only_polygons(unary_union([athens] + [shape(g) for g in islands]))
    sparta = clip([mainland], PELOPONNESE_WINDOW.difference(ARGOLID_BLOCK))

    byz = hbm_features('1200', 'Byzantine Empire')[0]
    byz_polys = polys_of(byz['geometry'])
    anatolia = max(byz_polys, key=lambda poly: Polygon(poly[0]).area)
    nicaea = clip([{'type': 'Polygon', 'coordinates': anatolia}], NICAEA_WINDOW)

    hitt = hbm_features('bc1000', 'Hittites')[0]['geometry']
    david = hbm_features('bc1000', 'Kingdom of David and Solomon')[0]['geometry']
    phoenicia = clip([hitt, david], PHOENICIA_WINDOW)

    return [
        dict(id='athens-delian-league', name='Athens (Delian League)', start=-478, end=-404, color='#4682B4',
             geom=athens, ptype='confederation', wiki='Delian League', label=[23.73, 38.0],
             detail="hand-traced: HBM -500 'Greek city-states' coastline clipped to Attica; Euboea and the Cyclades (minus Melos) added as League members (r15)",
             hand='Attica bounded inland by a hand-drawn Megarid/Parnes/Kithairon line; the island polygons are HBM. Ionian and Hellespontine members lie outside the HBM Greek polygon and are not shown.'),
        dict(id='sparta-peloponnesian-league', name='Sparta (Peloponnesian League)', start=-550, end=-366, color='#8B0000',
             geom=sparta, ptype='confederation', wiki='Peloponnesian League',
             detail="hand-traced: HBM -500 'Greek city-states' coastline clipped to the Peloponnese minus Achaea and the Argolid (r15)",
             hand='Peloponnese south of a hand-drawn Achaea boundary, with the Argive plain cut out (Argos never joined). Megara and Boeotia (members at times) are not included.'),
        dict(id='empire-of-nicaea', name='Empire of Nicaea', start=1204, end=1261, color='#4169E1',
             geom=nicaea, ptype='state', wiki='Empire of Nicaea',
             detail="hand-traced: HBM 1200 'Byzantine Empire' Anatolian polygon clipped west of a hand-drawn Sangarius-Phrygia-Meander frontier (r15)",
             hand='Coast is HBM 1200; the eastern edge (Heraclea Pontica - Sangarius - Philadelphia - Meander) is the approximate frontier with the Sultanate of Rum c. 1250; the Black Sea coast east of Heraclea went to Trebizond/Rum. Closes the Byzantine 1204-1261 gap alongside latin-empire.'),
        dict(id='phoenicia', name='Phoenicia', start=-1200, end=-539, color='#5f9ea0',
             geom=phoenicia, ptype='confederation', wiki='Phoenicia',
             detail="hand-traced: HBM -1000 coastline (Hittites / Kingdom of David and Solomon polygons) clipped to a hand-drawn Mount Lebanon crest line (r15)",
             hand='Coastal strip from the Tyre hinterland to Arwad; inland edge follows the Lebanon range crest. The city-states were Assyrian/Babylonian tributaries from the 8th century BCE and became a Persian satrapy in 539 BCE.'),
    ]


# --------------------------------------------------------------------------- wikipedia

def fetch_wiki(title: str) -> dict | None:
    from urllib.parse import quote
    req = urllib.request.Request(WIKI_URL.format(quote(title.replace(' ', '_'))), headers={'User-Agent': UA, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.load(r)
    if d.get('type') == 'disambiguation' or not d.get('extract'):
        return None
    return OrderedDict([
        ('title', d.get('title', title)),
        ('description', d.get('description', '')),
        ('extract', d['extract']),
        ('url', d.get('content_urls', {}).get('desktop', {}).get('page', f'https://en.wikipedia.org/wiki/{title.replace(" ", "_")}')),
        ('fetchedAt', datetime.now(timezone.utc).isoformat()),
        ('license', 'CC BY-SA 4.0'),
    ])


# --------------------------------------------------------------------------- main

def main() -> None:
    raw = EMPIRES.read_text(encoding='utf-8')
    data = json.loads(raw, object_pairs_hook=OrderedDict)
    assert json.dumps(data, ensure_ascii=False) == raw, 'empires.json serialisation drifted; refusing to write'
    feats = data['features']
    byid = {f['properties']['id'] for f in feats}
    added = []

    for d in NEW:
        if d['id'] in byid:
            log(f"skip {d['id']}: already present")
            continue
        src = []
        for n in d['hbm']:
            src.extend(hbm_features(d['year'], n, d['subjecto']))
        geom = merged_geometry(src)
        yr = int(d['year'].replace('bc', '-'))
        by = yr if d['start'] <= yr <= d['end'] else None
        detail = f"historical-basemaps:{d['year']}:{' + '.join(d['hbm'])} (r15)"
        p = props(d['id'], d['name'], d['start'], d['end'], d['color'], d['accurate'], geom,
                  'historical-basemaps', detail, d['ptype'], border_year=by, matched=d['hbm'][0],
                  border_note=d['note'], label=d['label'])
        feats.append(feature(p, geom))
        byid.add(d['id'])
        added.append((d['id'], d.get('wiki')))
        log(f"add {d['id']}: {d['name']} {d['start']}..{d['end']} <- world_{d['year']} {d['hbm']} "
            f"({len(src)} feature(s), {vertex_count(geom)} vertices, {geom['type']}, labelPoint {p['labelPoint']})")

    for d in hand_traced_definitions():
        if d['id'] in byid:
            log(f"skip {d['id']}: already present")
            continue
        geom = to_geojson(d['geom'])
        n = vertex_count(geom)
        assert n >= 40, f"{d['id']}: hand-traced geometry has only {n} vertices"
        p = props(d['id'], d['name'], d['start'], d['end'], d['color'], False, geom,
                  'hand-crafted-from-atlases', d['detail'], d['ptype'], hand_note=d['hand'], label=d.get('label'))
        feats.append(feature(p, geom))
        byid.add(d['id'])
        added.append((d['id'], d.get('wiki')))
        log(f"add {d['id']}: {d['name']} {d['start']}..{d['end']} hand-traced ({n} vertices, {geom['type']}, labelPoint {p['labelPoint']})")

    if added:
        EMPIRES.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        log(f"wrote {EMPIRES.relative_to(ROOT)}: {len(feats)} features (+{len(added)})")
    else:
        log('nothing to add')

    # Wikipedia summaries (best effort)
    wraw = WIKI.read_text(encoding='utf-8')
    wiki = json.loads(wraw, object_pairs_hook=OrderedDict)
    assert json.dumps(wiki, ensure_ascii=False, indent=1) == wraw, 'empire-wikipedia.json serialisation drifted'
    changed = False
    for fid, title in added:
        if not title or fid in wiki:
            continue
        try:
            entry = fetch_wiki(title)
        except Exception as exc:  # network is blocked in some environments
            log(f"wiki {fid}: fetch failed ({exc.__class__.__name__}: {str(exc)[:80]})")
            continue
        if entry is None:
            log(f"wiki {fid}: no usable summary for {title!r}")
            continue
        wiki[fid] = entry
        changed = True
        log(f"wiki {fid}: {entry['title']}")
    if changed:
        WIKI.write_text(json.dumps(wiki, ensure_ascii=False, indent=1), encoding='utf-8')
        log(f"wrote {WIKI.relative_to(ROOT)}")

    (ROOT / 'docs' / 'data-review' / 'polities-r15.log').write_text('\n'.join(LOG) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
