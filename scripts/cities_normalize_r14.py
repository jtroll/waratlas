#!/usr/bin/env python3
"""Data-review round 14: normalise data/cities.json (audit M7).

* name chains sharing one site get non-overlapping periods
  (earlier name endYear == next name foundedYear)
* pure duplicates are merged (Byzantium/Byzantion, Mainz x2, ...)
* records that were the same city at two slightly different coordinates are
  snapped onto one coordinate so the chain renders as one site
* five conflated sites get their real coordinates
* the Beijing 1368-1928 gap is filled
* every record gets a stable `id` slug (name + founded year)

Run from the repo root:  python3 scripts/cities_normalize_r14.py
Idempotent: matching is by (name, foundedYear) and every edit is a set.
"""
from __future__ import annotations

import json
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CITIES = ROOT / 'data' / 'cities.json'

# (name, foundedYear) -> reason.  Removed as duplicates of another record.
DROP = {
    ('Al-Fustat', 641): 'duplicate of Fustat 641-969',
    ('Kairo', 1517): 'German spelling; Cairo record covers it',
    ('Halab', -1500): 'duplicate of Aleppo',
    ('Athēnai', -1500): 'duplicate of Athens',
    ('Dimashq', -1500): 'duplicate of Damascus',
    ('Kabul', -500): 'duplicate of Kabul -1500',
    ('Izmir', -900): 'duplicate of Smyrna/İzmir chain',
    ('Delhi', 1911): 'duplicate of Delhi 1206- (New Delhi is the same site)',
    ("Chang'an", -1000): "duplicate of Chang'an -1100",
    ('Zhongguo', -1000): 'not a city name; Ji/Yanjing chain covers the site',
    ('Luoyang', -1000): 'duplicate of Luoyang -1100',
    ('Jeruzalem', -1000): 'duplicate of Jerusalem',
    ('Yerushalayim', -1000): 'duplicate of Jerusalem',
    ('Palmyrene', -750): 'duplicate of Palmyra',
    ('Trapezus', -756): 'duplicate of Trapezous',
    ('Byzantion', -657): 'duplicate of Byzantium',
    ('Banghazi', -600): 'duplicate of Benghazi',
    ('Lisbon', -500): 'Olisipo/Al-Ushbuna/Lisboa chain covers the site',
    ('Philippopolis', -342, (24.75, 42.15)): 'duplicate of Philippopolis at precise coordinates',
    ('Ōsaka', 1200): 'merged into Osaka (name attested 1496)',
    ('Milano', 500): 'merged into Milan',
    ('Seville', -200): 'duplicate of Hispalis/Ishbiliya/Sevilla chain',
    ('Cordoba', -169): 'duplicate of Corduba/Qurṭuba/Córdoba chain',
    ('Caesaraugusta', -27): 'duplicate of Caesaraugusta -14',
    ('Mainz', 12): 'duplicate of Mogontiacum/Mainz chain',
    ('Cologne', 50): 'duplicate of Colonia Agrippina/Köln chain',
    ('Vienna', 100): 'duplicate of Vindobona/Wien chain',
    ('Adrianopolis', 125): 'duplicate of Hadrianopolis',
    ('Edirne', 125): 'duplicate of Hadrianopolis/Edirne chain (and mis-placed at 41.14N)',
    ('Regensburg', -179): 'duplicate of Castra Regina/Regensburg chain (and mis-placed at 48.57N)',
    ('Jakarta', 1619): 'duplicate of Batavia/Jakarta chain',
    ('Venetia', 421): 'merged into Venice (founded 421)',
    ('Heian-kyo', 794): 'duplicate of Heian-kyō',
    ('Kyoto', 794): 'duplicate of Heian-kyō/Kyōto chain',
    ('Hanoi', 1010): 'duplicate of Thăng Long/Hà Nội chain',
    ('Moskva', 1147): 'duplicate of Moscow',
    ('Tenochtitlan', 1325): 'duplicate of Tenochtitlán',
    ('Mexico City', 1325): 'duplicate of Tenochtitlán/Ciudad de México chain',
    ('Phnom Penh', 1431): 'duplicate of Phnom Penh 1432 (and mis-placed)',
    ('Malacca', 1400): 'merged into Melaka (founded 1400)',
    ('Bucharest', 1459): 'duplicate of București',
    ('Mumbai', 1661): 'duplicate of Bombay/Mumbai chain',
    ('Bogota', 1538): 'duplicate of Santa Fe de Bogotá/Bogotá chain',
    ('Santiago', 1541, (-70.6693, -33.4489)): 'duplicate of Santiago at precise coordinates',
    ('Quebec City', 1608): 'duplicate of Québec',
    ('Ho Chi Minh City', 1698): 'duplicate of Saigon/Hồ Chí Minh City chain',
    ('Caracas', 1567): 'duplicate of Santiago de León de Caracas (and mis-placed at 66.59W)',
}

# (name, foundedYear) -> {field: value}.  'coords' sets the point.
SET = {
    # chains: end = next foundedYear
    ('Al-Qahira', 969): {'endYear': 1517},
    ('Cairo', 1538): {'foundedYear': 1517},
    ('Aleppo', -2000): {'coords': [37.1611, 36.2021], 'modernName': 'Aleppo'},
    ('Athens', -1400): {'coords': [23.7275, 37.9838], 'foundedYear': -1500, 'modernName': 'Athens'},
    ('Damascus', -1500): {'coords': [36.2765, 33.5138], 'modernName': 'Damascus'},
    ('Thebes', -2000): {'endYear': 641},
    ('Luxor', -1400): {'foundedYear': 641, 'modernName': 'Luxor'},
    # conflated sites -> real coordinates (the partner record was already right)
    ('Hama', -2000): {'coords': [36.75, 35.13]},
    ('Homs', -2000): {'coords': [36.72, 34.73]},
    ('Mosul', -700): {'coords': [43.13, 36.34]},
    ('Hermopolis', -1800): {'coords': [30.80, 27.78]},
    ('Minya', -1500): {'coords': [30.74, 28.11]},
    ('Jaffa', -1500): {'coords': [34.75, 32.05]},
    ('Tel Aviv', 1909): {'coords': [34.78, 32.08]},
    ('Kashi', -1500): {'endYear': 1300},
    ('Banaras', 1300): {'endYear': 1956},
    ('Varanasi', -1200): {'coords': [83.0007, 25.3176], 'foundedYear': 1956, 'modernName': 'Varanasi'},
    ("Chang'an", -1100): {'endYear': 1369},
    ('Zhongdu', 1153): {'endYear': 1271},
    ('Jerusalem', -1000): {'coords': [35.2137, 31.7683], 'endYear': 130, 'modernName': 'Jerusalem'},
    ('Al-Quds', 638): {'endYear': 1917},
    ('Palmyra', -1000): {'endYear': 273},
    ('Byzantium', -658): {'coords': [28.9784, 41.0082], 'foundedYear': -657},
    ('Istanbul', 1923): {'foundedYear': 1930},
    ('Benghazi', -500): {'foundedYear': -600},
    ('Belgrade', -500): {'coords': [20.4633, 44.8125], 'foundedYear': 500, 'endYear': 1521, 'modernName': 'Belgrade'},
    ('Singidunum', -3): {'foundedYear': -279},
    ('Olisipo', -205): {'endYear': 711},
    ('Nanjing', -500): {'coords': [118.7969, 32.0603], 'foundedYear': 1421, 'modernName': 'Nanjing'},
    ('Yingtian', 1368): {'endYear': 1421},
    ('Naniwa', -300): {'endYear': 1496},
    ('Osaka', 1583): {'foundedYear': 1496, 'modernName': 'Osaka'},
    ('Milan', 1402): {'foundedYear': 500, 'modernName': 'Milan'},
    ('Venice', 1402): {'foundedYear': 421, 'modernName': 'Venice'},
    ('Kiev', 482): {'coords': [30.5234, 50.4501], 'endYear': 1991},
    ('Kyiv', 482): {'foundedYear': 1991},
    ('Melaka', 1402): {'foundedYear': 1400},
    ('Yangon', 1755): {'coords': [96.1561, 16.8409], 'endYear': 1852, 'modernName': 'Yangon'},
    ('Sankt-Peterburg', 1703): {'endYear': 1914},
    ('Petrograd', 1914): {'endYear': 1924},
    ('Leningrad', 1914): {'foundedYear': 1924},
    ('St. Petersburg', 1703): {'coords': [30.3158, 59.9343], 'foundedYear': 1991, 'modernName': 'St Petersburg'},
    ('Stalingrad', 1925): {'endYear': 1961},
    ('Pavlovsk', 1779): {'name': 'Mariupol', 'endYear': 1948},
    ('Smyrna', -1500): {'endYear': 1922},
    ('Batavia', 1619): {'endYear': 1942},
}

# new records (appended)
ADD = [
    {'coords': [116.4074, 39.9042], 'name': 'Beiping', 'modernName': 'Beijing', 'foundedYear': 1368, 'endYear': 1421, 'importance': 2},
    {'coords': [116.4074, 39.9042], 'name': 'Beijing', 'modernName': 'Beijing', 'foundedYear': 1421, 'endYear': 1928, 'importance': 3},
    {'coords': [118.7969, 32.0603], 'name': 'Jinling', 'modernName': 'Nanjing', 'foundedYear': -333, 'endYear': 229, 'importance': 2},
    {'coords': [35.2137, 31.7683], 'name': 'Jerusalem', 'modernName': 'Jerusalem', 'foundedYear': 1917, 'endYear': None, 'importance': 3},
]


def slug(name: str) -> str:
    s = unicodedata.normalize('NFKD', name)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace('ʻ', '').replace("'", '').replace('’', '')
    s = re.sub(r'[^A-Za-z0-9]+', '-', s).strip('-').lower()
    return s or 'city'


def city_id(name: str, founded: int) -> str:
    yr = f'bc{abs(founded)}' if founded < 0 else str(founded)
    return f'{slug(name)}-{yr}'


def key(rec):
    p = rec['properties']
    return (p['name'], p['foundedYear'])


def main() -> None:
    data = json.load(open(CITIES), object_pairs_hook=OrderedDict)
    recs = data['features']
    n0 = len(recs)
    existing_ids = {r['properties'].get('id') for r in recs}

    # drops
    kept = []
    dropped = 0
    for r in recs:
        p = r['properties']
        k2 = key(r)
        k3 = (p['name'], p['foundedYear'], tuple(r['geometry']['coordinates']))
        if k2 in DROP or k3 in DROP:
            dropped += 1
            continue
        kept.append(r)
    recs = kept

    # sets (applied by original key, before rename)
    applied = set()
    for r in recs:
        k = key(r)
        if k in SET:
            for f, v in SET[k].items():
                if f == 'coords':
                    r['geometry']['coordinates'] = list(v)
                else:
                    r['properties'][f] = v
            applied.add(k)
    missing = set(SET) - applied
    if missing:
        # acceptable on re-run (records already renamed/re-dated); report anyway
        print('note: SET keys not found (already applied?):', sorted(missing))

    # adds
    have = {key(r) for r in recs}
    for a in ADD:
        k = (a['name'], a['foundedYear'])
        if k in have:
            continue
        props = OrderedDict([('name', a['name']), ('modernName', a['modernName']),
                             ('foundedYear', a['foundedYear']), ('endYear', a['endYear']),
                             ('importance', a['importance'])])
        recs.append(OrderedDict([('type', 'Feature'),
                                 ('geometry', OrderedDict([('type', 'Point'), ('coordinates', list(a['coords']))])),
                                 ('properties', props)]))

    # ids (name + founded year; suffix on the rare collision)
    seen: dict[str, int] = {}
    for r in recs:
        p = r['properties']
        base = city_id(p['name'], p['foundedYear'])
        cid = base
        if cid in seen:
            seen[base] += 1
            cid = f'{base}-{seen[base]}'
        else:
            seen[base] = 1
        props = OrderedDict([('id', cid)])
        for k, v in p.items():
            if k != 'id':
                props[k] = v
        r['properties'] = props

    data['features'] = recs
    with open(CITIES, 'w') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'cities: {n0} -> {len(recs)} records ({dropped} dropped, {len(recs) - (n0 - dropped)} added)')


if __name__ == '__main__':
    main()
