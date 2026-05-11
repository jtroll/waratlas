#!/usr/bin/env python3
"""
Fetch Wikipedia summaries for every empire in public/empires.json and write
them to public/empire-wikipedia.json. Run incrementally — already-fetched
entries are skipped on subsequent runs unless --force is passed.

Usage:
    python3 scripts/fetch_wikipedia_summaries.py
    python3 scripts/fetch_wikipedia_summaries.py --force        # re-fetch everything
    python3 scripts/fetch_wikipedia_summaries.py --only roman   # only ids matching this substring

Requires: requests (pip install requests)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

try:
    import requests
except ImportError:
    print('This script requires the `requests` library: pip install requests', file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
EMPIRES_PATH = ROOT / 'public' / 'empires.json'
OUTPUT_PATH = ROOT / 'public' / 'empire-wikipedia.json'

USER_AGENT = (
    'WarsAtlas/1.0 (https://github.com/wars-atlas; contact: jtroll@gmail.com) '
    'wikipedia-summary-fetcher/1.0'
)
SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/{title}'
RATE_LIMIT_DELAY = 0.2  # seconds between requests; ~5 req/sec — polite

# Hand-curated aliases for empire ids whose name doesn't directly map to a
# Wikipedia article title. Keyed by empire id; value is the canonical
# Wikipedia title (will be tried first, before any auto-generated candidates).
ID_TO_TITLE: dict[str, str] = {
    # Roman world
    'roman-republic-early':           'Roman Republic',
    'roman-republic-late':            'Roman Republic',
    'roman-empire-augustus':          'Roman Empire',
    'roman-empire-trajan':            'Roman Empire',
    'roman-empire-late':              'Roman Empire',
    'western-roman-empire':           'Western Roman Empire',
    'eastern-roman-byzantine-early':  'Byzantine Empire',
    'byzantine-justinian':            'Byzantine Empire under the Justinian dynasty',
    'byzantine-late-1025':            'Byzantine Empire',
    'achaemenid-persian-empire':      'Achaemenid Empire',
    'sassanid-empire':                'Sasanian Empire',
    'macedonian-alexander':           'Macedonian Empire',
    'carthaginian-empire':            'Carthage',
    'hittite-empire':                 'Hittite Empire',

    # Egypt
    'egyptian-old-kingdom':           'Old Kingdom of Egypt',
    'egyptian-middle-kingdom':        'Middle Kingdom of Egypt',
    'egyptian-new-kingdom-peak':      'New Kingdom of Egypt',
    'egyptian-new-kingdom-late':      'New Kingdom of Egypt',

    # East / South Asia
    'han-dynasty-china':              'Han dynasty',
    'asia-ming-dynasty':              'Ming dynasty',
    'ming-dynasty-1400':              'Ming dynasty',
    'qin-dynasty':                    'Qin dynasty',
    'sui-dynasty':                    'Sui dynasty',
    'asia-zhou-dynasty':              'Zhou dynasty',
    'asia-jin-dynasty':               'Jin dynasty (266–420)',
    'asia-tangut-western-xia':        'Western Xia',
    'song-dynasty-northern':          'Song dynasty',
    'song-dynasty-southern':          'Song dynasty',
    'asia-song-northern':             'Song dynasty',
    'asia-song-southern':             'Song dynasty',
    'asia-northern-southern-dynasties': 'Northern and Southern dynasties',
    'asia-western-gokturk':           'Western Turkic Khaganate',
    'asia-srivijaya':                 'Srivijaya',
    'srivijaya':                      'Srivijaya',
    'mongol-empire':                  'Mongol Empire',
    'tibetan-empire':                 'Tibetan Empire',
    'asia-maurya':                    'Maurya Empire',
    'gupta-empire':                   'Gupta Empire',
    'mughal-early':                   'Mughal Empire',
    'asia-mughal-akbar':              'Mughal Empire',
    'mughal-peak':                    'Mughal Empire',
    'asia-mughal-aurangzeb':          'Mughal Empire',
    'mughal-late':                    'Mughal Empire',
    'delhi-sultanate':                'Delhi Sultanate',
    'asia-bahmani-sultanate':         'Bahmani Sultanate',
    'asia-yadava-dynasty':            'Seuna (Yadava) dynasty',
    'asia-khotan':                    'Kingdom of Khotan',
    'asia-ghaznavid-empire':          'Ghaznavid dynasty',
    'asia-khazar':                    'Khazars',

    # Caliphates
    'rashidun-caliphate':             'Rashidun Caliphate',
    'umayyad-caliphate':              'Umayyad Caliphate',
    'abbasid-caliphate':              'Abbasid Caliphate',
    'umayyad-cordoba':                'Caliphate of Córdoba',

    # Steppe / Eurasia
    'kyivan-rus':                     'Kievan Rusʹ',
    'timurid-empire':                 'Timurid Empire',
    'safavid-empire':                 'Safavid Iran',

    # Ottomans
    'ottoman-early':                  'Ottoman Empire',
    'ottoman-mid':                    'Ottoman Empire',
    'ottoman-peak':                   'Ottoman Empire',
    'ottoman-late':                   'Ottoman Empire',

    # Britain / France / Spain colonial
    'british-empire-1700':            'British Empire',
    'british-empire-1750':            'British Empire',
    'british-empire-1763':            'British Empire',
    'british-empire-1783':            'British Empire',
    'british-empire-1815':            'British Empire',
    'british-empire-1837':            'British Empire',
    'british-empire-1858':            'British Empire',
    'british-empire-1880':            'British Empire',
    'british-empire-1900':            'British Empire',
    'british-empire-1921':            'British Empire',
    'british-empire-1939':            'British Empire',
    'british-empire-1947':            'British Empire',
    'british-india':                  'British Raj',
    'british-india-1765':             'Company rule in India',
    'british-india-1805':             'Company rule in India',
    'british-india-1850':             'Company rule in India',
    'british-colonial-africa':        'Colonisation of Africa',
    'americas-british-thirteen-colonies': 'Thirteen Colonies',
    'americas-british-north-america-canada': 'British North America',
    'french-colonial':                'French colonial empire',
    'spanish-americas':               'Spanish Empire',
    'spanish-philippines':            'Spanish East Indies',

    # Japan
    'empire-of-japan-1895':           'Empire of Japan',
    'empire-of-japan-1910':           'Empire of Japan',
    'empire-of-japan-1937':           'Empire of Japan',
    'empire-of-japan-1942':           'Empire of Japan',
    'asia-sengoku-ashikaga':          'Sengoku period',
    'manchukuo':                      'Manchukuo',

    # Africa
    'africa-mali-empire':             'Mali Empire',
    'africa-mali-empire-peak':        'Mali Empire',
    'africa-songhai-empire':          'Songhai Empire',
    'africa-aksumite-empire':         'Kingdom of Aksum',
    'kingdom-of-axum':                'Kingdom of Aksum',
    'africa-ghana-empire':            'Ghana Empire',
    'ghana-empire':                   'Ghana Empire',
    'africa-makuria-kingdom':         'Makuria',
    'africa-nubia-post-meroitic':     'Nubia',
    'africa-nobatia-kingdom':         'Nobatia',
    'africa-kanem-empire':            'Kanem Empire',
    'africa-kanem-bornu-empire':      'Kanem–Bornu Empire',
    'africa-ajuran-sultanate':        'Ajuran Sultanate',
    'africa-solomonic-dynasty':       'Solomonic dynasty',
    'ethiopian-empire':               'Ethiopian Empire',
    'africa-hausa-kingdoms':          'Hausa Kingdoms',
    'hausa-states':                   'Hausa Kingdoms',
    'almoravid-empire':               'Almoravid dynasty',
    'almohad-caliphate':              'Almohad Caliphate',
    'merina-kingdom':                 'Kingdom of Imerina',
    'africa-sokoto-caliphate':        'Sokoto Caliphate',
    'africa-igala-kingdom':           'Igala Kingdom',
    'africa-luba-empire':             'Kingdom of Luba',
    'africa-lunda-empire':            'Lunda Empire',

    # Americas
    'inca-empire':                    'Inca Empire',
    'aztec-empire':                   'Aztec Empire',
    'americas-comancheria':           'Comancheria',
    'americas-portuguese-brazil-1700': 'Colonial Brazil',
    'americas-ancestral-pueblo':      'Ancestral Puebloans',
    'americas-mississippian-cahokia': 'Cahokia',
    'americas-mississippian-peak':    'Mississippian culture',
    'americas-hopewell-culture':      'Hopewell tradition',
    'americas-adena-culture':         'Adena culture',
    'americas-mogollon-culture':      'Mogollon culture',
    'americas-hohokam':               'Hohokam',
    'americas-ancestral-fremont':     'Fremont culture',
    'americas-wari-huari':            'Wari Empire',
    'americas-tiwanaku':              'Tiwanaku',
    'americas-teotihuacan':           'Teotihuacan',
    'americas-inca-kingdom-cusco':    'Kingdom of Cuzco',
    'americas-lakota-sioux':          'Lakota people',

    # European medieval
    'kingdom-of-hungary':             'Kingdom of Hungary',
    'papal-states':                   'Papal States',
    'europe-venetian-republic':       'Republic of Venice',
    'kingdom-of-france':              'Kingdom of France',
    'kingdom-of-england':             'Kingdom of England',
    'kingdom-of-scotland':            'Kingdom of Scotland',
    'kingdom-of-navarre':             'Kingdom of Navarre',
    'holy-roman-empire':              'Holy Roman Empire',

    # --- Added during parallel population pass ---
    # Pre-Columbian / chiefdoms / confederations
    'americas-olmec-heartland':       'Olmecs',
    'americas-zapotec-monte-alban':   'Zapotec civilization',
    'americas-maya-classic':          'Maya civilization',
    'americas-calusa-chiefdom':       'Calusa',
    'americas-natchez-chiefdom':      'Natchez people',
    'americas-chibcha-muisca':        'Muisca Confederation',
    'americas-chimu-north-coast':     'Chimor',
    'americas-ancestral-puebloan-chaco': 'Chaco Canyon',
    'americas-kowoj-kingdom':         'Kowoj',
    'americas-mixtec-confederation':  'Mixtec',
    'americas-mixtec-kingdoms':       'Mixtec',
    'americas-taino-chiefdoms':       'Taíno',
    'americas-huron-wendat':          'Wyandot people',
    'americas-tarascan-purepecha':    'Tarascan state',
    'americas-mayapan-confederacy':   'Mayapan',
    'americas-coosa-chiefdom':        'Coosa chiefdom',
    'americas-tupinamba-confederation': 'Tupinambá people',
    'americas-inca-tawantinsuyu':     'Inca Empire',
    'americas-apache-confederacy':    'Apache',
    'americas-mapuche-araucania':     'Mapuche',
    'americas-patagonia-tehuelche':   'Tehuelche people',
    'americas-russian-america-alaska': 'Russian America',

    # Eurasia / steppe
    'asia-ferghana':                  'Dayuan',
    'asia-pyu-city-states':           'Pyu city-states',
    'asia-xiongnu':                   'Xiongnu',
    'asia-xianbei':                   'Xianbei',
    'asia-eastern-gokturk':           'Eastern Turkic Khaganate',
    'asia-eastern-gokturk-second':    'Second Turkic Khaganate',
    'asia-cumans-kipchaks':           'Cumans',
    'asia-khitan-liao':               'Liao dynasty',
    'asia-nguyen-vietnam':            'Nguyễn dynasty',

    # Mesopotamia / Levant
    'mitanni-kingdom':                'Mitanni',

    # Bulgaria
    'europe-bulgarian-first':         'First Bulgarian Empire',
    'europe-bulgarian-second':        'Second Bulgarian Empire',

    # Africa
    'africa-alodia-kingdom':          'Alodia',
    'africa-mossi-wagadougou':        'Mossi Kingdoms',
    'africa-monomutapa':              'Kingdom of Mutapa',
    'africa-mwene-mutapa-empire':     'Kingdom of Mutapa',
    'africa-rwanda-kingdom':          'Kingdom of Rwanda',
    'africa-maravi-confederacy':      'Maravi Empire',
    'africa-torwa-state':             'Torwa dynasty',
    'africa-swaziland-kingdom':       'Eswatini',
    'africa-omani-zanzibar':          'Omani Empire',
    'africa-gondar-period':           'Gondarine period',
    'africa-sotho-kingdom':           'Basotho',
    'africa-lesotho-kingdom':         'Lesotho',

    # Pacific
    'pacific-samoan':                 'History of Samoa',
    'pacific-maori':                  'Māori people',
    'pacific-tahitian':               'Kingdom of Tahiti',

    # Italy / colonial
    'italian-colonial-africa':        'Italian Empire',
}


def slugify_for_url(title: str) -> str:
    """Wikipedia REST URLs use underscores for spaces and percent-encode the rest."""
    return quote(title.replace(' ', '_'), safe='_')


def strip_parenthetical(name: str) -> str:
    """'British Empire (1815)' -> 'British Empire'."""
    return re.sub(r'\s*\([^)]*\)\s*', ' ', name).strip()


def candidate_titles(empire_id: str, name: str) -> list[str]:
    """
    Generate ordered candidate Wikipedia titles for an empire. The first
    successful fetch wins; later candidates are tried only on 404.
    """
    candidates: list[str] = []

    # 1. Hand-aliased title takes top priority
    if empire_id in ID_TO_TITLE:
        candidates.append(ID_TO_TITLE[empire_id])

    # 2. Cleaned name as-is
    cleaned = strip_parenthetical(name)
    if cleaned and cleaned not in candidates:
        candidates.append(cleaned)

    # 3. Common suffix variants
    for suffix in (' Empire', ' Dynasty', ' Kingdom', ' Caliphate', ' Sultanate'):
        if not cleaned.endswith(suffix):
            t = cleaned + suffix
            if t not in candidates:
                candidates.append(t)

    return candidates


def fetch_summary(title: str, session: requests.Session) -> dict[str, Any] | None:
    """
    Hit the Wikipedia REST API summary endpoint. Returns a normalized dict
    on success, None on 404, raises on other errors so the caller can retry
    or surface the problem.
    """
    url = SUMMARY_ENDPOINT.format(title=slugify_for_url(title))
    resp = session.get(url, timeout=15)
    if resp.status_code == 404:
        return None
    if resp.status_code == 429:
        # Rate limited — back off
        time.sleep(2.0)
        resp = session.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    # Wikipedia sometimes returns a 'disambiguation' type — treat those as misses
    if data.get('type') == 'disambiguation':
        return None

    extract = (data.get('extract') or '').strip()
    if not extract:
        return None

    return {
        'title': data.get('titles', {}).get('normalized') or data.get('title') or title,
        'description': data.get('description'),
        'extract': extract,
        'url': data.get('content_urls', {}).get('desktop', {}).get('page'),
        'fetchedAt': datetime.now(timezone.utc).isoformat(),
        'license': 'CC BY-SA 4.0',
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true', help='Re-fetch everything')
    parser.add_argument('--only', help='Only fetch ids containing this substring')
    parser.add_argument('--workers', type=int, default=8, help='Concurrent fetches (default 8)')
    parser.add_argument('--limit', type=int, default=0, help='Max empires to process this run (0 = all)')
    args = parser.parse_args()

    if not EMPIRES_PATH.exists():
        print(f'empires.json not found at {EMPIRES_PATH}', file=sys.stderr)
        return 1
    empires_data = json.loads(EMPIRES_PATH.read_text(encoding='utf-8'))

    # Load existing cache (incremental runs)
    cache: dict[str, Any] = {}
    if OUTPUT_PATH.exists() and not args.force:
        cache = json.loads(OUTPUT_PATH.read_text(encoding='utf-8'))

    # Dedup work: many empires share the same Wikipedia title (e.g. all
    # Mughal time slices → 'Mughal Empire'). Group by canonical title.
    work: list[tuple[str, str, list[str]]] = []  # (id, name, candidate_titles)
    for feature in empires_data['features']:
        props = feature.get('properties', {})
        eid = props.get('id')
        if not eid:
            continue
        if args.only and args.only not in eid:
            continue
        if eid in cache and not args.force:
            continue
        work.append((eid, props.get('name', ''), candidate_titles(eid, props.get('name', ''))))

    print(f'Total empires: {len(empires_data["features"])}')
    print(f'Already cached: {len(cache)}')
    print(f'To fetch: {len(work)}')
    if args.limit and args.limit < len(work):
        work = work[: args.limit]
        print(f'Limited this run to: {len(work)}')

    if not work:
        print('Nothing to do. Use --force to re-fetch.')
        return 0

    from concurrent.futures import ThreadPoolExecutor, as_completed
    from threading import Lock

    session = requests.Session()
    session.headers.update({
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
    })

    # Per-title cache so we only fetch each unique Wikipedia title once
    title_results: dict[str, dict[str, Any] | None] = {}
    title_lock = Lock()
    cache_lock = Lock()
    save_lock = Lock()
    unmatched: list[tuple[str, str]] = []

    def save_cache() -> None:
        with save_lock:
            OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
            with cache_lock:
                snapshot = dict(cache)
            tmp = OUTPUT_PATH.with_suffix('.json.tmp')
            tmp.write_text(
                json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8',
            )
            tmp.replace(OUTPUT_PATH)

    def process(item: tuple[str, str, list[str]]) -> tuple[str, str, dict[str, Any] | None]:
        eid, name, candidates = item
        result: dict[str, Any] | None = None
        for cand in candidates:
            with title_lock:
                cached_hit = cand in title_results
                if cached_hit:
                    result = title_results[cand]
            if cached_hit:
                if result is not None:
                    break
                continue
            try:
                result = fetch_summary(cand, session)
            except requests.HTTPError:
                with title_lock:
                    title_results[cand] = None
                result = None
                continue
            except requests.RequestException:
                with title_lock:
                    title_results[cand] = None
                result = None
                continue
            with title_lock:
                title_results[cand] = result
            if result is not None:
                break
        return eid, name, result

    completed = 0
    try:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(process, item): item for item in work}
            for fut in as_completed(futures):
                eid, name, result = fut.result()
                completed += 1
                if result is None:
                    print(f'[{completed:3d}/{len(work):3d}] {eid:40s} miss')
                    unmatched.append((eid, name))
                else:
                    with cache_lock:
                        cache[eid] = result
                    print(f'[{completed:3d}/{len(work):3d}] {eid:40s} ok ({len(result["extract"])} chars) -> {result["title"]!r}')
                    if completed % 10 == 0:
                        save_cache()
    finally:
        save_cache()

    print()
    print(f'Wrote {len(cache)} entries to {OUTPUT_PATH.relative_to(ROOT)}')
    if unmatched:
        print(f'\n{len(unmatched)} empires unmatched (need manual alias in ID_TO_TITLE):')
        for eid, name in unmatched:
            print(f'  {eid:48s} {name!r}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
