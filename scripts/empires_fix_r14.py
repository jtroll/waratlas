#!/usr/bin/env python3
"""Data-review round 14: repair public/empires.json.

Covers (see docs/data-review/empires-r14.md for the narrative):
  1. wrong-continent polygons (Neo-Assyrian, Neo-Babylonian, Manchukuo)
     plus the mis-located Valois Burgundy polygon
  2. antimeridian audit (rings are already split; only Manchukuo changes)
  3. duplicate polities
  4. time-slice overlaps / gaps, Byzantine gap fills from HBM, borderYear fixes
  5. chronology corrections
  6. labelPoint recomputation (pole of inaccessibility) where the label
     falls outside the geometry
  7. taxonomy normalisation (polityType, source/sourceDetail, borderStyle)

Requires shapely.  HBM snapshots are read from --hbm-dir (downloaded from
github.com/aourednik/historical-basemaps when missing).

Run from the repo root:
    python3 scripts/empires_fix_r14.py [--hbm-dir DIR]

The script is written against the r13 state of empires.json and is guarded so
that re-running it on its own output is a no-op for every structural step.
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import urllib.request
from collections import OrderedDict
from pathlib import Path

from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union
from shapely.algorithms.polylabel import polylabel

sys.path.insert(0, str(Path(__file__).resolve().parent))
from empires_hand_traced_r14 import (  # noqa: E402
    ASSYRIA_PEAK_GEOMETRY, NEO_BABYLONIAN_GEOMETRY, BURGUNDY_GEOMETRY,
)

ROOT = Path(__file__).resolve().parent.parent
EMPIRES = ROOT / 'public' / 'empires.json'
WIKI = ROOT / 'public' / 'empire-wikipedia.json'
HBM_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_{}.geojson'

POLITY_TYPES = {'state', 'tributary', 'confederation', 'culture', 'nomadic-range', 'chiefdom'}
POLITY_MAP = {'kingdom': 'state', 'nation': 'state', 'city-state': 'state', 'hegemony': 'tributary'}
SOURCES = {'historical-basemaps', 'hand-crafted-from-atlases', 'reconstructed-clipped-country',
           'approximate-cultural-extent', 'cliopatria-seshat', 'manual'}

KEY_ORDER = ['id', 'name', 'startYear', 'endYear', 'color', 'accurate', 'labelPoint', 'borderStyle',
             'source', 'sourceDetail', 'polityType', 'borderYear', 'matchedRegion',
             'handCraftedNote', 'borderNote']

LOG: list[str] = []


def log(msg: str) -> None:
    LOG.append(msg)
    print(msg)


# --------------------------------------------------------------------------
# HBM access
# --------------------------------------------------------------------------

def hbm_load(hbm_dir: Path, year: str) -> dict:
    hbm_dir.mkdir(parents=True, exist_ok=True)
    fn = hbm_dir / f'world_{year}.geojson'
    if not fn.exists():
        urllib.request.urlretrieve(HBM_URL.format(year), fn)
    return json.load(open(fn))


def hbm_feature(hbm_dir: Path, year: str, name: str) -> dict:
    for f in hbm_load(hbm_dir, year)['features']:
        if f['properties'].get('NAME') == name:
            return f
    raise KeyError(f'{name} not in world_{year}')


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def reorder(props: dict) -> OrderedDict:
    out = OrderedDict()
    for k in KEY_ORDER:
        if k in props:
            out[k] = props[k]
    for k in props:
        if k not in out:
            out[k] = props[k]
    return out


def largest_polygon(geom):
    if geom.geom_type == 'MultiPolygon':
        return max(geom.geoms, key=lambda p: p.area)
    return geom


def pole(geom) -> list[float]:
    poly = largest_polygon(geom)
    pt = polylabel(poly, tolerance=0.001)
    if not poly.contains(pt):
        pt = poly.representative_point()
    return [round(pt.x, 3), round(pt.y, 3)]


def ring_span(ring) -> float:
    lons = [c[0] for c in ring]
    return max(lons) - min(lons)


def geom_rings(geometry):
    polys = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for poly in polys:
        for r in poly:
            yield r


def bbox(geometry):
    b = shape(geometry).bounds
    return [round(x, 2) for x in b]


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--hbm-dir', default=os.environ.get('HBM_DIR', str(ROOT / '.cache' / 'hbm')))
    args = ap.parse_args()
    hbm_dir = Path(args.hbm_dir)

    data = json.load(open(EMPIRES), object_pairs_hook=OrderedDict)
    feats = data['features']
    byid = {f['properties']['id']: f for f in feats}
    n_before = len(feats)

    def P(fid):
        return byid[fid]['properties']

    # ---------------------------------------------------------------- task 1
    log('== Task 1: wrong-continent polygons')
    f = byid['assyrian-empire-peak']
    log(f"  assyrian-empire-peak bbox before {bbox(f['geometry'])}")
    f['geometry'] = copy.deepcopy(ASSYRIA_PEAK_GEOMETRY)
    p = f['properties']
    p.update({'accurate': False, 'borderStyle': 'dashed',
              'source': 'hand-crafted-from-atlases',
              'sourceDetail': 'hand-traced (r14) from Roaf, Cultural Atlas of Mesopotamia; Times Atlas of World History — Neo-Assyrian Empire at greatest extent c. 671-650 BC. Replaces a pass-2 HBM pull that had matched Taiwan.',
              'borderYear': -670,
              'handCraftedNote': 'Greatest extent under Esarhaddon/Ashurbanipal: Egypt to Thebes, the Levant, Cilicia, upper Mesopotamia to the Urartian frontier, the western Zagros, Elam and Babylonia. Cyprus (tributary) not drawn.'})
    p.pop('matchedRegion', None)
    log(f"  assyrian-empire-peak bbox after  {bbox(f['geometry'])}")

    f = byid['neo-babylonian-empire']
    log(f"  neo-babylonian-empire bbox before {bbox(f['geometry'])}")
    f['geometry'] = copy.deepcopy(NEO_BABYLONIAN_GEOMETRY)
    p = f['properties']
    p.update({'accurate': False, 'borderStyle': 'dashed',
              'source': 'hand-crafted-from-atlases',
              'sourceDetail': 'hand-traced (r14) from Roaf, Cultural Atlas of Mesopotamia; Times Atlas of World History — Neo-Babylonian Empire c. 560 BC. HBM has no snapshot between -700 and -500 (the -500 pull had matched New Zealand).',
              'borderYear': -560,
              'handCraftedNote': 'Extent under Nebuchadnezzar II / Nabonidus: Mesopotamia, Syria, Phoenicia, Judah/Philistia to the Brook of Egypt, Edom and the north-Arabian oases to Tayma. Median frontier along the Taurus/Zagros foothills.'})
    p.pop('matchedRegion', None)
    log(f"  neo-babylonian-empire bbox after  {bbox(f['geometry'])}")

    f = byid['manchukuo']
    log(f"  manchukuo bbox before {bbox(f['geometry'])}")
    h = hbm_feature(hbm_dir, '1945', 'Manchuria')
    f['geometry'] = h['geometry']
    p = f['properties']
    p.update({'accurate': True, 'borderStyle': 'solid', 'source': 'historical-basemaps',
              'sourceDetail': 'historical-basemaps:1945:Manchuria (r14 re-pull; the pass-2 pull labelled historical-basemaps:1938:Manchukuo had matched Antarctica). HBM 1938 folds Manchukuo into the Empire of Japan; the 1930 and 1945 "Manchuria" outlines are identical and include Jehol.',
              'borderYear': 1945, 'matchedRegion': 'Manchuria'})
    log(f"  manchukuo bbox after  {bbox(f['geometry'])}")

    # Valois Burgundy: polygon was the HBM 1200 'Burgandy' (Kingdom of Arles)
    f = byid['kingdom-of-burgundy']
    log(f"  kingdom-of-burgundy bbox before {bbox(f['geometry'])}")
    f['geometry'] = copy.deepcopy(BURGUNDY_GEOMETRY)
    p = f['properties']
    p.update({'name': 'Duchy of Burgundy (Valois)', 'accurate': False, 'borderStyle': 'dashed',
              'source': 'hand-crafted-from-atlases',
              'sourceDetail': 'hand-traced (r14) from Shepherd, Historical Atlas (Burgundian State 1477); Times Atlas of World History. Replaces the HBM 1200 "Burgandy" polygon (Kingdom of Arles), which was the wrong polity for the Valois dukes 1363-1477.',
              'borderYear': 1475,
              'handCraftedNote': 'Burgundian State c. 1475: Duchy and Free County of Burgundy; Flanders, Artois, Boulonnais, the Somme towns, Hainaut, Namur, Brabant, Limburg, Luxembourg, Holland and Zeeland. Liege, Cambrai, Utrecht and the Calais Pale excluded; Guelders (1473-77) not drawn.'})
    p.pop('matchedRegion', None)
    log(f"  kingdom-of-burgundy bbox after  {bbox(f['geometry'])}")

    # ---------------------------------------------------------------- task 2
    log('== Task 2: antimeridian')
    for fid in ['pacific-tonga-tui', 'russian-empire', 'british-empire-1858', 'british-empire-1880',
                'british-empire-1900', 'british-empire-1921', 'british-empire-1939', 'british-empire-1947',
                'manchukuo']:
        g = byid[fid]['geometry']
        worst = max(ring_span(r) for r in geom_rings(g))
        log(f"  {fid}: feature bbox {bbox(g)}; widest single ring spans {worst:.2f} deg lon")
        assert worst <= 180, fid

    # ---------------------------------------------------------------- task 3
    log('== Task 3: duplicate polities')
    removals = {
        'republic-of-venice': 'duplicate of europe-venetian-republic (identical 114-vertex HBM 1500 outline; kept the accurate:true record)',
        'africa-aksumite-empire': 'duplicate of kingdom-of-axum (identical HBM 400 outline); kingdom-of-axum start moved to 100 CE',
        'africa-solomonic-dynasty': 'duplicate of ethiopian-empire (identical HBM 1914 outline, same 1270-1974 interval)',
        'africa-nubia-post-meroitic': 'duplicate of africa-nobatia-kingdom (identical 17-vertex outline; kept the HBM-sourced record)',
        'ashanti-empire': 'duplicate of africa-asante-empire (identical HBM 1800 outline); asante endYear extended to 1902',
        'africa-monomutapa': 'duplicate of africa-mutapa-empire (identical HBM 1500 outline, sub-interval)',
        'maratha-empire': 'duplicate of asia-maratha-confederacy (bbox IoU 0.96; kept the 132-vertex outline over the 59-vertex one)',
        'africa-sotho-kingdom': 'duplicate of africa-lesotho-kingdom (identical outline; Basutoland/Lesotho record already spans 1822-)',
        'portuguese-brazil': 'duplicate of americas-portuguese-brazil-1750 (identical 1026-vertex clipped-country outline) and overlapped the 1500-1750 HBM slice',
        'asia-qing-peak': 'duplicate of qing-dynasty-1790 (identical 728-vertex HBM 1800 outline, sub-interval 1760-1800)',
        'africa-mali-empire-peak': 'duplicate of africa-mali-empire (identical 52-vertex HBM 1325 outline, sub-interval 1320-1360)',
    }
    for fid, why in removals.items():
        if fid in byid:
            feats.remove(byid.pop(fid))
            log(f'  removed {fid}: {why}')
    # genuinely different slices -> non-overlapping
    P('asia-ashikaga-shogunate')['endYear'] = 1467
    P('asia-sengoku-ashikaga')['startYear'] = 1467
    P('europe-frankish-kingdom')['endYear'] = 800
    P('carolingian-empire')['startYear'] = 800
    log('  ashikaga 1338-1467 / sengoku-ashikaga 1467-1573; frankish 481-800 / carolingian 800-843')

    # ---------------------------------------------------------------- task 4
    log('== Task 4: slice overlaps / gaps')
    # Mughal
    P('mughal-early').update({'endYear': 1556, 'name': 'Mughal Empire (Babur–Humayun)'})
    P('asia-mughal-akbar').update({'startYear': 1556, 'endYear': 1605})
    P('mughal-peak').update({'startYear': 1605, 'endYear': 1658, 'name': 'Mughal Empire (Jahangir–Shah Jahan)'})
    if P('mughal-peak').get('borderYear') != 1650:
        h = hbm_feature(hbm_dir, '1650', 'Mughal Empire')
        byid['mughal-peak']['geometry'] = h['geometry']
        P('mughal-peak').update({'borderYear': 1650, 'matchedRegion': 'Mughal Empire', 'accurate': True,
                                 'source': 'historical-basemaps',
                                 'sourceDetail': 'historical-basemaps:1650:Mughal Empire (r14 re-pull, 192 vertices; the previous 51-vertex outline was a simplified copy of the 1700 snapshot and carried borderYear 1700 outside the 1605-1658 slice)'})
        log('  mughal-peak geometry replaced by HBM world_1650 "Mughal Empire"')
    P('asia-mughal-aurangzeb').update({'startYear': 1658, 'endYear': 1707})
    P('mughal-late').update({'startYear': 1707, 'endYear': 1857, 'name': 'Mughal Empire (Late)'})
    log('  Mughal: 1526-1556 / 1556-1605 / 1605-1658 / 1658-1707 / 1707-1857')
    # British India
    P('british-india-1765').update({'startYear': 1757, 'endYear': 1794})
    P('british-india-1805').update({'startYear': 1795, 'endYear': 1839})
    P('british-india-1850').update({'startYear': 1840, 'endYear': 1859})
    P('british-india').update({'startYear': 1860})
    log('  British India: 1757-1794 / 1795-1839 / 1840-1859 / 1860-1947')
    # Roman
    P('roman-empire-augustus')['endYear'] = 98
    log('  Roman: augustus -27-98 / trajan 98-180 / late 180-395')
    # United States
    P('americas-united-states-1848').update({'startYear': 1819, 'endYear': 1848})
    P('americas-united-states-1860').update({'startYear': 1849, 'endYear': 1861})
    log('  United States: 1848-slice 1819-1848 / 1860-slice 1849-1861')
    # British Empire gaps (1829, 1857, 1914-1918)
    P('british-empire-1815')['endYear'] = 1829
    P('british-empire-1837')['endYear'] = 1857
    P('british-empire-1900')['endYear'] = 1918
    P('british-empire-1900')['borderNote'] = 'Extended through 1918: the 1921 slice includes League of Nations mandates that did not exist before 1919.'
    log('  British Empire: 1815-slice ->1829, 1837-slice ->1857, 1900-slice ->1918')
    # Ethiopia family
    P('africa-ethiopian-empire-medieval').update({'endYear': 1855, 'name': 'Ethiopian Empire (Medieval–Gondarine)'})
    P('africa-ethiopian-empire-medieval')['borderNote'] = 'HBM 1450 extent kept through the Gondarine era; after the Adal war and the Oromo migrations (1543-1855) the state was confined to the northern highlands.'
    P('africa-ethiopian-empire-menelik').update({'startYear': 1855, 'endYear': 1900})
    P('ethiopian-empire').update({'startYear': 1900})
    P('ethiopian-empire')['borderNote'] = 'HBM 1914 outline (post-Adwa treaty borders); Italian occupation 1936-41 not shown as a separate polity.'
    log('  Ethiopia: medieval 1270-1855 / menelik 1855-1900 / ethiopian-empire 1900-1974')
    # Byzantine family
    P('eastern-roman-byzantine-early')['endYear'] = 527
    P('byzantine-justinian').update({'endYear': 600, 'name': 'Byzantine Empire (Justinian–Maurice)'})
    template = byid['byzantine-late-1025']
    idx = feats.index(template)
    new_slices = [
        ('byzantine-empire-700', '700', 'Eastern Roman Empire', 600, 750, 'Byzantine Empire (600-750)'),
        ('byzantine-empire-800', '800', 'Byzantine Empire', 750, 843, 'Byzantine Empire (750-843)'),
        ('byzantine-empire-1300', '1300', 'Byzantine Empire', 1261, 1350, 'Byzantine Empire (Palaiologan, 1261-1350)'),
        ('byzantine-empire-1400', '1400', 'Byzantine Empire', 1350, 1453, 'Byzantine Empire (Palaiologan, 1350-1453)'),
    ]
    insert_at = idx
    for fid, year, hname, s, e, label in new_slices:
        if fid in byid:
            continue
        h = hbm_feature(hbm_dir, year, hname)
        props = OrderedDict([
            ('id', fid), ('name', label), ('startYear', s), ('endYear', e),
            ('color', template['properties']['color']), ('accurate', True),
            ('labelPoint', pole(shape(h['geometry']))), ('borderStyle', 'solid'),
            ('source', 'historical-basemaps'),
            ('sourceDetail', f'historical-basemaps:{year}:{hname} (r14 gap fill)'),
            ('polityType', 'state'), ('borderYear', int(year)), ('matchedRegion', hname),
        ])
        nf = OrderedDict([('type', 'Feature'), ('properties', props), ('geometry', h['geometry'])])
        if s > 1204:
            feats.append(nf)
        else:
            feats.insert(insert_at, nf)
            insert_at += 1
        byid[fid] = nf
        log(f'  added {fid} {s}-{e} from HBM world_{year} "{hname}" bbox {bbox(h["geometry"])}')
    log('  Byzantium: 395-527 / 527-600 / 600-750 / 750-843 / 843-1204 / [1204-1261 Latin Empire+Nicaea gap] / 1261-1350 / 1350-1453')

    # borderYear outside [startYear, endYear]
    by_fixes = {
        'egyptian-old-kingdom': (None, 'kept-original geometry; no HBM snapshot inside -2686..-2181'),
        'egyptian-new-kingdom-late': (None, 'HBM -1000 "Egypt" outline; no snapshot inside -1200..-1070'),
        'assyrian-neo-early': (None, 'hand-traced, not an HBM snapshot'),
        'americas-hohokam': (None, 'HBM 1492 "Hohokam" outline; no in-range snapshot carries it'),
        'americas-ancestral-pueblo': (None, 'HBM 1492 "Pueblos" outline; no in-range snapshot carries it'),
        'africa-nobatia-kingdom': (600, 'HBM 600 "Nobatia" is vertex-identical to the 700 pull'),
        'asia-tangut-western-xia': (1100, 'HBM 1100 "Xixia" is vertex-identical to the 1000 pull'),
        'africa-mossi-wagadougou': (1880, 'HBM 1880 "Mossi States" is vertex-identical to the 1900 pull'),
        'ndongo-kingdom': (1500, 'HBM 1500 "Ndongo" is vertex-identical to the 1492 pull'),
        'americas-comancheria': (None, 'HBM 1492 "Nʉmʉnʉʉ (Comanche)" outline; the 1500-1600 Comanche polygons differ and no 1700+ snapshot carries one'),
    }
    for fid, (val, why) in by_fixes.items():
        p = P(fid)
        old = p.get('borderYear')
        if val is None:
            p.pop('borderYear', None)
        else:
            p['borderYear'] = val
        log(f'  borderYear {fid}: {old} -> {val} ({why})')

    # ---------------------------------------------------------------- task 5
    log('== Task 5: chronology')
    P('holy-roman-empire')['endYear'] = 1806
    P('holy-roman-empire')['borderNote'] = 'Extent shown is the HBM 1200 outline; the Empire persisted (with shifting membership) until its dissolution in 1806.'
    P('abbasid-caliphate')['endYear'] = 1258
    P('abbasid-caliphate')['borderNote'] = 'extent shown is the c.800 peak; the caliphate contracted to Iraq after c.945'
    P('africa-oyo-empire')['endYear'] = 1836
    P('vijayanagara-empire')['endYear'] = 1646
    P('pacific-tonga-tui')['endYear'] = 1865
    P('kingdom-of-axum').update({'startYear': 100, 'name': 'Kingdom of Aksum'})
    P('americas-wari-huari').update({'startYear': 600, 'endYear': 1000})
    P('americas-tiwanaku').update({'startYear': 550, 'endYear': 1000})
    P('americas-teotihuacan').update({'startYear': 100, 'endYear': 550})
    P('africa-mali-empire')['endYear'] = 1670
    P('russian-empire')['name'] = 'Russia (Tsardom, later Empire)'
    P('africa-swaziland-kingdom')['name'] = 'Eswatini (Swaziland)'
    log('  HRE ->1806, Abbasid ->1258, Oyo ->1836, Vijayanagara ->1646, Tonga ->1865, Aksum 100-, Wari 600-1000, '
        'Tiwanaku 550-1000, Teotihuacan 100-550, Mali ->1670, Russia renamed, Eswatini renamed')

    # ---------------------------------------------------------------- task 7 (before 6 so borderStyle is final)
    log('== Task 7: taxonomy')
    for f in feats:
        p = f['properties']
        for k in ('borderYear', 'matchedRegion'):
            if k in p and p[k] is None:
                del p[k]
        # polityType
        pt = p.get('polityType')
        if pt in POLITY_MAP:
            p['polityType'] = POLITY_MAP[pt]
        assert p['polityType'] in POLITY_TYPES, (p['id'], p['polityType'])
        # source / sourceDetail
        src = p['source']
        if src not in SOURCES or 'sourceDetail' not in p:
            detail = src
            if src.startswith('historical-basemaps'):
                new = 'historical-basemaps'
                if src.startswith('historical-basemaps:'):
                    parts = src.split(':', 2)
                    try:
                        yr = int(parts[1])
                        if 'borderYear' not in p and p['startYear'] <= yr <= p['endYear']:
                            p['borderYear'] = yr
                    except ValueError:
                        pass
                    if len(parts) == 3 and parts[2] and 'matchedRegion' not in p:
                        p['matchedRegion'] = parts[2]
            elif src.startswith('reconstructed-clipped-country'):
                new = 'reconstructed-clipped-country'
            elif src.startswith('hand-crafted-from-atlases') or src.startswith('hand-traced') or src.startswith('Wikipedia'):
                new = 'hand-crafted-from-atlases'
            elif src in ('approximate-cultural-extent', 'hand-crafted-cultural-extent'):
                new = 'approximate-cultural-extent'
            elif src.startswith('Cliopatria'):
                new = 'cliopatria-seshat'
            elif src in ('kept-original', 'manual-construction', 'manual-verification'):
                new = 'manual'
                # three kept-original records are documented (empires-corrections.json) as HBM pulls
                if p['id'] in ('egyptian-old-kingdom', 'egyptian-middle-kingdom', 'hittite-empire'):
                    new = 'historical-basemaps'
            elif src.startswith('downgraded'):
                new = 'manual'
                if p['id'] == 'egyptian-new-kingdom-late':
                    new = 'historical-basemaps'  # corrections rationale: HBM -1000 'Egypt' polygon
            else:
                raise SystemExit(f'unmapped source for {p["id"]}: {src}')
            if src in SOURCES and 'sourceDetail' in p:
                new = src
            p['source'] = new
            if 'sourceDetail' not in p:
                p['sourceDetail'] = detail
        # borderStyle rule
        want = 'solid' if (p['accurate'] is True and p['polityType'] == 'state') else 'dashed'
        if p.get('borderStyle') != want:
            p['borderStyle'] = want
        f['properties'] = reorder(p)

    # ---------------------------------------------------------------- task 6
    log('== Task 6: label points')
    moved = 0
    for f in feats:
        p = f['properties']
        g = shape(f['geometry'])
        if not g.contains(Point(p['labelPoint'])):
            old = p['labelPoint']
            p['labelPoint'] = pole(g)
            moved += 1
            log(f"  {p['id']}: {old} -> {p['labelPoint']}")
    log(f'  moved {moved} label points')

    # ---------------------------------------------------------------- write
    data['features'] = feats
    with open(EMPIRES, 'w') as fh:
        json.dump(data, fh, ensure_ascii=False)
    log(f'wrote {EMPIRES}: {n_before} -> {len(feats)} features')

    # wikipedia summaries: drop removed ids, clone the Byzantine entry for the new slices
    if WIKI.exists():
        wiki = json.load(open(WIKI), object_pairs_hook=OrderedDict)
        changed = False
        for fid in removals:
            if fid in wiki:
                del wiki[fid]
                changed = True
        for fid, *_ in new_slices:
            if fid not in wiki and 'byzantine-late-1025' in wiki:
                wiki[fid] = copy.deepcopy(wiki['byzantine-late-1025'])
                changed = True
        if changed:
            with open(WIKI, 'w') as fh:
                json.dump(wiki, fh, ensure_ascii=False, indent=1)
            log(f'updated {WIKI}')

    with open(ROOT / 'docs' / 'data-review' / 'empires-r14.log', 'w') as fh:
        fh.write('\n'.join(LOG) + '\n')


if __name__ == '__main__':
    main()
