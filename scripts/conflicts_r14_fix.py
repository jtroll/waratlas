#!/usr/bin/env python3
"""
conflicts_r14_fix.py — War Atlas conflict-dataset defect pass (review round 14).

Reads public/conflicts.json and the tables under scripts/data/, applies the r14
fixes (partOf resolution + stub parents, casualty/range corrections, exact-duplicate
merges, Draw removal, anachronistic belligerent labels, coordinate fixes,
importance floor, small text fixes, polity canonicalisation) and writes:

  public/conflicts.json                 (pretty-printed, 2-space indent, key order preserved)
  scripts/data/id_redirects.json        {oldId: newId} for merged / renamed / deleted records
  scripts/data/parent_unresolved.json   partOf strings that still do not resolve to an id
  <log dir>/r14_log.json                machine-readable change log used by docs/data-review/conflicts-r14.md

Usage: python3 scripts/conflicts_r14_fix.py [--countries ne_50m.geojson] [--log DIR] [--dry-run]
Python 3 stdlib only; shapely is optional (point-in-country pass is skipped without it).
"""
import argparse, collections, copy, difflib, json, math, os, re, sys, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONF = os.path.join(ROOT, 'public', 'conflicts.json')
DATA = os.path.join(ROOT, 'scripts', 'data')
KEY_ORDER = ['id', 'name', 'startYear', 'endYear', 'coordinates', 'locations', 'countries', 'partOf',
             'casualties', 'casualtyRange', 'wikipediaUrl', 'importance', 'description',
             'hook', 'narrative', 'significance', 'sources']
LOG = collections.defaultdict(list)
HCED_LABEL_PREFIX = 'HCED — Miller & Bakar'


def is_hced(r):
    return r['id'].startswith('battle-') and r.get('wikipediaUrl') is None and any(
        s['label'].startswith(HCED_LABEL_PREFIX) for s in r.get('sources', []))


def setk(r, k, v):
    """Set key k, inserting it at its canonical position if absent (preserves existing key order)."""
    if k in r:
        r[k] = v
        return
    items = list(r.items())
    pos = KEY_ORDER.index(k) if k in KEY_ORDER else len(KEY_ORDER)
    idx = len(items)
    for i, (kk, _) in enumerate(items):
        kp = KEY_ORDER.index(kk) if kk in KEY_ORDER else -1
        if kp > pos and kk != 'id':
            idx = i
            break
    items.insert(idx, (k, v))
    r.clear()
    r.update(items)


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s


# ---------------------------------------------------------------- normaliser (shared with the alias table build)
ORD = {'1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth',
       '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth'}
SYN = {'wars': 'war', 'rebellions': 'rebellion', 'british': 'anglo', 'turkish': 'ottoman', 'turko': 'ottoman',
       'turco': 'ottoman', 'turk': 'ottoman', 'turcoman': 'turkoman', 'peleponesian': 'peloponnesian',
       'peloponesian': 'peloponnesian', 'peleponnesian': 'peloponnesian', 'hugenot': 'huguenot', 'gempei': 'genpei',
       'coaliton': 'coalition', 'invasions': 'invasion', 'conquests': 'conquest', 'campaigns': 'campaign',
       'risings': 'rising', 'revolts': 'revolt', 'uprisings': 'uprising', 'mithradatic': 'mithridatic',
       'castillian': 'castilian', 'ghibeline': 'ghibelline', 'guelf': 'guelph', 'pakistan': 'pakistani',
       'achaen': 'achaean', 'americas': ''}
STOP = {'the', 'of', 'and', 'in', 'war', 'a', 'an', 'on'}


def norm(s):
    s = s.lower().replace('’', "'").replace("'", '').replace('-', ' ').replace('–', ' ').replace('/', ' ')
    s = re.sub(r'^\s*y\s+', '', s)
    s = s.replace('(war at sea', '')
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    w = [ORD.get(x, x) for x in s.split()]
    w = [SYN.get(x, x) for x in w]
    w = [x for x in w if x and x not in STOP]
    return ' '.join(w)


def key(s):
    return ' '.join(sorted(set(norm(s).split())))


# ---------------------------------------------------------------- generic helpers
def span_ok(child, parent, tol=1):
    ce = child['endYear'] if child['endYear'] is not None else 2030
    pe = parent['endYear'] if parent['endYear'] is not None else 2030
    return child['startYear'] >= parent['startYear'] - tol and ce <= pe + tol


def in_bbox(r, bbox):
    lon, lat = r['coordinates']
    return bbox[0] <= lon <= bbox[2] and bbox[1] <= lat <= bbox[3]


def union_sources(a, b):
    out = list(a or [])
    labels = {s['label'] for s in out}
    for s in b or []:
        if s['label'] not in labels:
            out.append(s)
            labels.add(s['label'])
    return out


# ================================================================ STAGE 0: load
def load():
    with open(CONF, encoding='utf-8') as f:
        raw = f.read()
    indent = 2 if raw.startswith('[\n  {') else 4
    return json.loads(raw), indent


# ================================================================ STAGE A: id normalisation + small fixes (task 7)
ID_RENAMES = {
    'spanish-moorish-Granada': 'spanish-moorish-granada',
    'americas-tupac-amaru-II-rebellion-1780': 'americas-tupac-amaru-ii-rebellion-1780',
    'lê-mạc-wars-1533': 'le-mac-wars-1533',
    'trịnh-nguyễn-wars-1627': 'trinh-nguyen-wars-1627',
    'trịnh-nguyễn-wars-1627b': 'trinh-nguyen-wars-1627b',
    'battle-of-tacan-a': 'battle-of-tacana',
    'nanjing-massacre-context': 'nanjing-massacre',
    'khauas-hottentot-uprising': 'khauas-nama-uprising',
}
CLODFELTER = 'Clodfelter, Warfare and Armed Conflicts (4th ed., 2017)'
CAMPAIGN_RENAMES = {  # HCED "Battle of <country>" rows that are campaigns; accepted English names
    'battle-of-albania': 'Italian invasion of Albania',
    'battle-of-berlin': 'Battle of Berlin (RAF air campaign)',
    'battle-of-borneo': 'Borneo campaign (1945)',
    'battle-of-cambodia': 'Cambodian campaign',
    'battle-of-ceylon': 'Indian Ocean raid (Easter Sunday Raid)',
    'battle-of-champagne': 'Second Battle of Champagne',
    'battle-of-champagne-1914': 'First Battle of Champagne',
    'battle-of-colorado': 'Battle of the Colorado River (1840)',
    'battle-of-greece': 'Greco-Italian War',
    'battle-of-guam': 'Capture of Guam (1898)',
    'battle-of-iran': 'Anglo-Soviet invasion of Iran',
    'battle-of-iraq': 'Anglo-Iraqi War',
    'battle-of-jamaica': 'Invasion of Jamaica (1655)',
    'battle-of-java': 'Invasion of Java (1811)',
    'battle-of-lebanon': 'Syria–Lebanon campaign (Lebanon)',
    'battle-of-syria': 'Syria–Lebanon campaign',
    'battle-of-malaya': 'Malayan campaign',
    'battle-of-malta': 'French invasion of Malta',
    'battle-of-manchuria': 'Soviet invasion of Manchuria',
    'battle-of-norway': 'Norwegian campaign',
    'battle-of-panama': 'Sack of Panama (1671)',
    'battle-of-quebec': 'Capture of Quebec (1629)',
    'battle-of-quebec-1711': 'Quebec Expedition (1711)',
    'battle-of-quebec-1759': 'Battle of the Plains of Abraham',
    'battle-of-quebec-1760': 'Battle of Sainte-Foy',
    'battle-of-sardinia': 'Capture of Sardinia (1708)',
    'battle-of-sicily': 'Allied invasion of Sicily',
    'battle-of-maine': 'USS Maine explosion',
}


def stage_small_fixes(recs):
    byid = {r['id']: r for r in recs}
    redirects = {}
    # id renames (slug / mojibake / pejorative / container)
    for old, new in ID_RENAMES.items():
        if old in byid:
            byid[old]['id'] = new
            redirects[old] = new
            LOG['id_renames'].append({'old': old, 'new': new})
    for r in recs:
        r['partOf'] = [ID_RENAMES.get(p, p) for p in r['partOf']]
    byid = {r['id']: r for r in recs}
    # wikiLink -> wikipediaUrl
    n = 0
    for r in recs:
        if 'wikiLink' in r:
            if not r.get('wikipediaUrl') and r['wikiLink']:
                r['wikipediaUrl'] = r['wikiLink']
                n += 1
            del r['wikiLink']
    LOG['wikilink'] = [{'copied': n}]
    # Clodfelter label variants
    for r in recs:
        for s in r.get('sources', []):
            if s['label'].startswith('Clodfelter') and s['label'] != CLODFELTER:
                s['label'] = CLODFELTER
                LOG['clodfelter'].append(r['id'])
    # date sign error
    r = byid['persian-reconquest-of-egypt-artaxerxes-iii']
    if r['endYear'] == 351:
        r['endYear'] = -332
        LOG['date_fixes'].append({'id': r['id'], 'field': 'endYear', 'old': 351, 'new': -332, 'why': 'sign error; reconquest completed 343-332 BCE'})
    # mahdist description
    r = byid['mahdist-war']
    if 'See per-war entries' in r['description']:
        r['description'] = ("Rising of Muhammad Ahmad, the self-proclaimed Mahdi, against Egyptian rule in Sudan; "
                            "the Mahdists took Khartoum in 1885 and ruled until Kitchener's Anglo-Egyptian army "
                            "destroyed their army at Omdurman in 1898.")
        LOG['text_fixes'].append({'id': r['id'], 'field': 'description', 'why': 'truncated "See per-w…" text replaced'})
    # Khauas Nama
    r = byid['khauas-nama-uprising']
    r['name'] = 'Khauas Nama uprising'
    r['countries'] = ['German Empire', 'Khauas Nama']
    LOG['text_fixes'].append({'id': r['id'], 'field': 'name', 'why': 'replaced pejorative "Hottentot" with Nama'})
    # Tacaná
    r = byid['battle-of-tacana']
    r['name'] = 'Battle of Tacaná'
    r['description'] = r['description'].replace('Tacan~a', 'Tacaná')
    LOG['text_fixes'].append({'id': r['id'], 'field': 'name', 'why': 'mojibake "Tacan~a" -> Tacaná'})
    # Nanjing massacre record: real event, keep as a properly named record
    r = byid['nanjing-massacre']
    r['name'] = 'Battle of Nanjing and Nanjing Massacre'
    r['partOf'] = ['second-sino-japanese-war']
    LOG['text_fixes'].append({'id': r['id'], 'field': 'name/partOf', 'why': 'container-style id renamed; linked to the Second Sino-Japanese War'})
    # Kyiv: only events after 1991
    for r in recs:
        if r['startYear'] > 1991:
            if 'Kiev' in r['name']:
                r['name'] = r['name'].replace('Kiev', 'Kyiv'); LOG['kyiv'].append(r['id'])
            r['locations'] = [l.replace('Kiev', 'Kyiv') for l in r['locations']]
    # campaign renames
    for i, new in CAMPAIGN_RENAMES.items():
        if i in byid:
            LOG['campaign_renames'].append({'id': i, 'old': byid[i]['name'], 'new': new})
            byid[i]['name'] = new
    # Freeman's Farm year (HCED 1776 -> 1777)
    r = byid['battle-of-freeman-s-farm']
    if r['startYear'] == 1776:
        r['startYear'] = r['endYear'] = 1777
        r['description'] = r['description'].replace('(1776)', '(1777)')
        LOG['date_fixes'].append({'id': r['id'], 'field': 'startYear/endYear', 'old': 1776, 'new': 1777, 'why': 'First Battle of Saratoga was fought 19 Sep 1777'})
    return redirects


# ================================================================ STAGE B: exact-duplicate merges (task 3)
# (loser, winner, options). Winner keeps its id unless the loser is referenced by more partOf entries.
MERGES = [
    ('battle-of-somme', 'battle-somme', {}),
    ('war-of-spanish-succession', 'war-spanish-succession', {'coords': 'loser'}),
    ('war-of-austrian-succession', 'war-austrian-succession', {}),
    ('croatian-independence-war', 'croatian-war-independence', {}),
    ('battle-of-nile-1798', 'battle-of-the-nile', {'partOf': ['french-revolution-wars']}),
    ('battle-of-hundred-regiments-offensive', 'hundred-regiments-offensive', {'partOf': ['second-sino-japanese-war']}),
    ('opium-war-first', 'first-opium-war', {}),
    ('opium-war-second-2', 'opium-war-second', {}),
    ('barons-war-first-2', 'barons-war-first', {}),
    ('barons-war-second-2', 'barons-war-second', {}),
    ('swedish-polish-war-2', 'swedish-polish-war', {}),
    ('talas-battle-tang', 'battle-of-talas', {'coords': 'winner', 'name': 'Battle of Talas',
                                             'countries': ['Tang Dynasty', 'Abbasid Caliphate', 'Karluks']}),
    ('battle-of-amgala', 'battle-of-amgala-1976', {'coords': 'loser', 'partOf': ['western-sahara-conflict']}),
    ('battle-of-ogaden', 'battle-of-the-ogaden-1936', {'partOf': ['second-italo-ethiopian-war-1935'], 'replace_partOf': True}),
    ('battle-of-ifni', 'ifni-war', {}),
    ('battle-of-alresford', 'battle-of-cheriton', {}),
    ('battle-of-granicus', 'battle-of-the-granicus', {}),
    ('battle-of-hydaspes', 'battle-of-the-hydaspes', {}),
    ('battle-of-marchfeld', 'battle-on-the-marchfeld', {}),
    ('battle-of-thames', 'battle-of-the-thames', {}),
    ('korean-japanese-invasion', 'korean-invasions-toyotomi', {}),
    ('insurgency-in-aceh', 'aceh-rebellion-1976', {}),
    ('americas-grenada-invasion-1983', 'grenada-invasion', {}),
    ('rwandan-genocide-and-civil-war', 'rwandan-civil-war-1990', {}),
    ('nagorno-karabakh-war-2020-2', 'nagorno-karabakh-war-2020', {}),
    ('battle-of-poland', 'invasion-poland', {}),
    ('battle-of-tunisia', 'tunisian-campaign', {}),
]
DELETES = {  # container / notes records that are not conflicts -> redirect target
    'united-nations-interventions-timeline': 'nato-interventions',
    'hundred-years-war-individual-battles': 'hundred-years-war',
    'korean-war-additional-operations': 'korean-war',
}


def richness(r):
    return (bool(r.get('hook')) + bool(r.get('narrative')) + bool(r.get('casualtyRange')) + bool(r.get('wikipediaUrl'))
            + (r['casualties'] is not None) + len(r.get('sources', [])) * 0.1 + (0 if is_hced(r) else 1))


def merge_records(win, lose, opt):
    """Fold `lose` into `win` in place. Returns note list."""
    notes = []
    for k in ('hook', 'narrative', 'significance', 'casualtyRange', 'wikipediaUrl'):
        if not win.get(k) and lose.get(k):
            setk(win, k, lose[k]); notes.append(f'{k} from {lose["id"]}')
    if win['casualties'] is None and lose['casualties'] is not None:
        win['casualties'] = lose['casualties']; notes.append('casualties from loser')
    if lose['importance'] > win['importance']:
        win['importance'] = lose['importance']; notes.append('importance max')
    src = union_sources(win.get('sources'), lose.get('sources'))
    if src:
        setk(win, 'sources', src)
    if (not win['countries'] or win['countries'] == ['Draw']) and lose['countries']:
        win['countries'] = [c for c in lose['countries'] if c != 'Draw']
    if opt.get('countries'):
        win['countries'] = opt['countries']
    if opt.get('coords') == 'loser':
        win['coordinates'] = lose['coordinates']; notes.append('coordinates from loser')
    if opt.get('name'):
        win['name'] = opt['name']
    if opt.get('replace_partOf'):
        win['partOf'] = list(opt['partOf'])
    else:
        for p in lose['partOf'] + opt.get('partOf', []):
            if p not in win['partOf']:
                win['partOf'].append(p)
    for l in lose['locations']:
        if l not in win['locations'] and len(win['locations']) < 4 and not is_hced(lose):
            win['locations'].append(l)
    # description: replace an HCED template description with a real one
    if re.match(r'^Battle of .* \(\-?\d+(?: BCE)?\), part of ', win['description']) and not re.match(r'^Battle of .* \(', lose['description']):
        win['description'] = lose['description']; notes.append('description from loser')
    return notes


def stage_merges(recs, redirects):
    byid = {r['id']: r for r in recs}
    refcount = collections.Counter()
    for r in recs:
        for p in r['partOf']:
            refcount[p] += 1
    removed = set()
    for lose_id, win_id, opt in MERGES:
        if lose_id not in byid or win_id not in byid:
            LOG['merge_skipped'].append((lose_id, win_id)); continue
        lose, win = byid[lose_id], byid[win_id]
        if refcount[lose_id] > refcount[win_id]:
            # keep the more-referenced id but the richer content
            lose, win = win, lose
            lose_id, win_id = win_id, lose_id
        notes = merge_records(win, lose, opt)
        redirects[lose_id] = win_id
        removed.add(lose_id)
        LOG['merges'].append({'kept': win_id, 'removed': lose_id, 'name': win['name'], 'notes': notes})
    for d, target in DELETES.items():
        if d in byid:
            removed.add(d); redirects[d] = target
            LOG['deleted'].append({'id': d, 'name': byid[d]['name'], 'redirect': target})
    recs[:] = [r for r in recs if r['id'] not in removed]
    for r in recs:
        r['partOf'] = [redirects.get(p, p) for p in r['partOf']]
        r['partOf'] = list(dict.fromkeys(r['partOf']))
    # Russo-Ukrainian War umbrella (2014-present): the 2022 record and the Crimea annexation become its children
    byid = {r['id']: r for r in recs}
    for cid in ('russo-ukrainian-war-2022', 'ukraine-crimea-annexation'):
        if cid in byid and 'russo-ukrainian-war' not in byid[cid]['partOf']:
            byid[cid]['partOf'].append('russo-ukrainian-war')
            LOG['partof_reassigned'].append({'child': cid, 'old': None, 'new': 'russo-ukrainian-war'})
    # Three Kingdoms triplicate: keep the 184-280 umbrella; the two 220-280 records become sub-scope children
    byid = {r['id']: r for r in recs}
    for cid in ('three-kingdoms-china', 'three-kingdoms-wars'):
        c = byid[cid]
        c['partOf'] = ['three-kingdoms-war-184']
        old = c['casualties']
        c['casualties'] = 20000000
        c['casualtyRange']['notes'] = ('Sub-period (220-280) of the Three Kingdoms Wars record (184-280); overlapping estimates. '
                                       'Census-based 20-36M population loss is largely unregistered population, not deaths.')
        LOG['casualties'].append({'id': cid, 'old': old, 'new': 20000000, 'range': '20,000,000-36,000,000 (unchanged)',
                                  'why': 'headline was below its own range; set to the low bound and marked as sub-scope of three-kingdoms-war-184'})


# ================================================================ STAGE C: partOf resolution (task 1)
DATE_FIXES = {  # (child, parent-after-resolution) -> action
    ('aksumite-invasion-of-himyar-gdr', 'axumite-invasions'): ('drop',),
    ('aksumite-invasion-of-himyar-kaleb', 'axumite-invasions'): ('parent-dates', 518, 570),
    ('aksumbeja-conflicts', 'axum-kingdom-expansion'): ('parent-dates', 100, 700),
    ('aksumite-conquest-of-meroe', 'axum-kingdom-expansion'): ('parent-dates', 100, 700),
    ('axumite-aksum-nubian-wars', 'axum-kingdom-expansion'): ('parent-dates', 100, 700),
    ('aksumnoba-war-of-ezana', 'axum-kingdom-expansion'): ('parent-dates', 100, 700),
    ('aksumagaw-wars', 'axum-kingdom-expansion'): ('parent-dates', 100, 700),
    ('southeast-asian-conflicts', 'khmer-cham-wars'): ('child-dates', 802, 1200),
    ('songhai-mali-conflicts', 'songhai-expansion'): ('drop',),
    ('portuguese-conquest-of-angola', 'kongo-portuguese-conflicts'): ('drop',),
    ('battle-of-mbumbi', 'portuguese-njinga-wars'): ('reassign', 'kongo-portuguese-war-of-1622'),
    ('portuguese-njinga-wars', 'kongo-portuguese-conflicts'): ('drop',),
    ('french-invasion-egypt', 'napoleonic-wars'): ('reassign', 'french-revolution-wars'),
    ('fanteasante-wars', 'anglo-ashanti-wars'): ('drop',),
    ('bornu-resistance-to-the-sokoto-jihad', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('bornusokoto-wars', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('kololo-migration', 'mfecane'): ('drop',),
    ('battle-of-adwa-style-defeat-sokotokebbi-war-argungu', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('battle-of-dogali', 'italian-ethiopian-wars'): ('reassign', 'italian-conquest-of-eritrea'),
    ('battle-of-lugalo', 'maji-maji-rebellion'): ('reassign', 'hehe-wars'),
    ('battle-of-coatit', 'italian-conquest-of-eritrea'): ('reassign', 'first-italo-ethiopian-war-1895'),
    ('anglo-sokoto-conquest-of-bida', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('anglo-sokoto-war', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('satiru-revolt', 'sokoto-jihad-of-usman-dan-fodio'): ('drop',),
    ('second-sino-japanese-war', 'world-war-2'): ('drop',),
    ('south-kordofan-conflict', 'sudanese-conflict-in-south-kordofan-and-blue-nile'): ('drop',),
    ('boko-haram-insurgency-in-cameroon', 'boko-haram-insurgency-2009'): ('parent-dates', 2009, None),
    ('diffa-insurgency', 'boko-haram-insurgency-2009'): ('parent-dates', 2009, None),
    ('operation-eagle-claw-mnjtf', 'lake-chad-crisis'): ('parent-dates', 2009, None),
    ('crimean-crisis', 'russo-ukrainian-war-2022'): ('reassign', 'russo-ukrainian-war'),
    ('donbas-war', 'russo-ukrainian-war-2022'): ('reassign', 'russo-ukrainian-war'),
    ('snake-war', 'american-frontier-wars'): ('reassign', 'american-indian-wars-long-term'),
    ('colorado-war', 'american-frontier-wars'): ('reassign', 'american-indian-wars-long-term'),
    ('red-river-war', 'american-frontier-wars'): ('reassign', 'american-indian-wars-long-term'),
    ('battle-of-washita-river', 'american-frontier-wars'): ('reassign', 'american-indian-wars-long-term'),
    ('bear-river-massacre', 'american-frontier-wars'): ('reassign', 'american-indian-wars-long-term'),
    ('battle-of-troy', 'trojan-war'): ('parent-dates', -1194, -1184),
    ('battle-of-moncada', 'cuban-revolution'): ('parent-dates', 1953, 1959),
}
# Curated parents whose recorded dates are wrong or too narrow (fixed regardless of children)
PARENT_DATE_FIXES = {
    'argentine-civil-wars': (1814, 1880, 'Argentine Civil Wars ran 1814-1880 (Wikipedia); record said 1829-1852'),
    'chilean-independence-war': (1810, 1826, 'Chilean War of Independence ended with the fall of Chiloé in 1826'),
    'maratha-mughal-wars': (1657, 1707, "Shivaji's first raids on Mughal territory began in 1657"),
    'norman-conquest-england': (1066, 1071, 'conquest completed with the Harrying of the North and the fall of Ely (1071)'),
    'anglo-scottish-wars': (1296, 1560, 'Anglo-Scottish Wars ran from 1296 to the 1550s (Wikipedia scope); record ended 1357'),
    'trojan-war': (-1194, -1184, 'traditional dating; the fall of Troy is placed in 1184 BCE'),
    'cuban-revolution': (1953, 1959, 'the revolution is dated from the Moncada attack of 26 July 1953'),
    'axum-kingdom-expansion': (100, 700, 'Aksumite wars continued into the 7th century (Himyar, Beja, Noba)'),
    'axumite-invasions': (518, 570, "Kaleb's first Himyar expedition was in 518"),
    'boko-haram-insurgency-2009': (2009, None, 'ongoing'),
    'lake-chad-crisis': (2009, None, 'ongoing'),
    'southeast-asian-conflicts': (802, 1200, 'Khmer Empire founded 802; record previously started in 600'),
    'kalmar-union-wars': (1389, 1523, 'the union was forged by the war of 1389 (Åsle/Falköping)'),
    'guelph-ghibelline-wars': (1115, 1350, 'Guelph-Ghibelline fighting in the Italian cities continued into the 14th century (Montecatini 1315, Altopascio 1325)'),
    'anglo-dutch-wars': (1652, 1784, 'the series comprises four wars, the last in 1780-1784'),
}
EXTRA_STUBS = [  # stubs needed for out-of-range curated children (in addition to parent_stubs.json)
    {'id': 'russo-ukrainian-war', 'name': 'Russo-Ukrainian War (2014–present)', 'startYear': 2014, 'endYear': None,
     'aliases': [], 'importance': 4, 'partOf': [],
     'wikipediaUrl': 'https://en.wikipedia.org/wiki/Russo-Ukrainian_War',
     'description': 'War between Russia and Ukraine that began with the annexation of Crimea and the war in Donbas in 2014 and escalated into the full-scale invasion of 2022.',
     'coordinates': [34.0, 48.5], 'countries': ['Russia', 'Ukraine']},
]
EXTRA_ALIASES = {  # name strings that match a curated record but need era routing (HCED reuses names loosely)
    'Russo-Polish War': [{'id': 'russo-polish-war-1605', 'from': 1605, 'to': 1618}, {'id': 'russo-polish-war', 'from': 1654, 'to': 1667},
                         {'id': 'polish-russian-war-of-1792', 'from': 1792, 'to': 1792}, {'id': 'polish-soviet-war', 'from': 1919, 'to': 1921}],
    'Sino-Vietnamese War': [{'id': 'song-ai-co-viet-war', 'from': 980, 'to': 981}, {'id': 'ly-song-war', 'from': 1075, 'to': 1077},
                            {'id': 'ming-ho-war', 'from': 1406, 'to': 1407}, {'id': 'ming-invasion-vietnam', 'from': 1407, 'to': 1427},
                            {'id': 'sino-vietnamese-war', 'from': 1979, 'to': 1979}],
    'Colombian Civil War': [{'id': 'colombian-civil-wars-19th', 'from': 1830, 'to': 1902}, {'id': 'colombian-civil-war', 'from': 1964, 'to': 2017}],
    'Colombian War of Independence': [{'id': 'colombian-independence-war', 'from': 1810, 'to': 1819}, {'id': 'colombian-independence', 'from': 1810, 'to': 1824}],
    'Peruvian War of Independence': [{'id': 'peruvian-independence-upper-peru', 'from': 1809, 'to': 1820}, {'id': 'peruvian-independence-war', 'from': 1821, 'to': 1826}],
    'Zulu Civil War': [{'id': 'zulu-civil-war', 'from': 1818, 'to': 1828}, {'id': 'anglo-zulu-civil-war-usuthu-vs-mandlakazi', 'from': 1883, 'to': 1888}],
    "King George's War": [{'id': 'jenkins-ear-war', 'from': 1739, 'to': 1743}, {'id': 'king-george-war', 'from': 1744, 'to': 1748}],
    "King William's War": [{'id': 'king-williams-war', 'from': 1688, 'to': 1697}, {'id': 'king-george-war', 'from': 1744, 'to': 1748}],
    'War of the Spanish Succession': [{'id': 'war-spanish-succession', 'from': 1701, 'to': 1714}, {'id': 'war-of-the-quadruple-alliance', 'from': 1718, 'to': 1720}],
    'Gallic Wars': [{'id': 'gallic-wars-caesar', 'from': -58, 'to': -50}, {'id': 'roman-gallic-wars', 'from': -390, 'to': -50}],
    'Iran-Iraq War': [{'id': 'iran-iraq-war', 'from': 1980, 'to': 1988}, {'id': 'world-war-1', 'from': 1914, 'to': 1918}],
    'Gulf War': [{'id': 'gulf-war', 'from': 1990, 'to': 1991}, {'id': 'iraq-war', 'from': 2003, 'to': 2011}],
    'Eritrean War of Independence': [{'id': 'eritrean-war-independence-1961', 'from': 1961, 'to': 1991}, {'id': 'eritrea-ethiopia-border-war', 'from': 1998, 'to': 2000}],
    'Mongol Invasion of the Middle East': [{'id': 'mongol-invasion-middle-east', 'from': 1219, 'to': 1260}, {'id': 'mamluk-ilkhanid-wars', 'from': 1260, 'to': 1323}],
    'Guatemalan Civil War': [{'id': 'guatemalan-civil-war', 'from': 1960, 'to': 1996}, {'id': 'central-american-wars-19th', 'from': 1823, 'to': 1907}],
    'Ethiopian Civil War': [{'id': 'ethiopian-civil-war', 'from': 1974, 'to': 1991}, {'id': 'zemene-mesafint', 'from': 1769, 'to': 1855}],
    'Napoleonic Wars': [{'id': 'napoleonic-wars', 'from': 1803, 'to': 1815}, {'id': 'french-revolution-wars', 'from': 1792, 'to': 1802}, {'id': 'pyrenees-conflicts', 'from': 711, 'to': 1000}],
    'Mughal-Maratha Wars': [{'id': 'maratha-mughal-wars', 'from': 1657, 'to': 1707}, {'id': 'mughal-maratha-wars', 'from': 1680, 'to': 1750}],
    'Taiping Rebellion': [{'id': 'taiping-rebellion', 'from': 1850, 'to': 1864}, {'id': 'nian-rebellion', 'from': 1851, 'to': 1868}],
    'Spanish Conquest of Peru': [{'id': 'spanish-conquest-peru', 'from': 1524, 'to': 1572}],
}


def resolve_partof(recs, aliases, stubs):
    byid = {r['id']: r for r in recs}
    byname = collections.defaultdict(list)
    for r in recs:
        byname[r['name']].append(r)
    curated = [r for r in recs if not is_hced(r)]
    idx = collections.defaultdict(set)
    for r in curated:
        for k in (norm(r['name']), norm(r['id'].replace('-', ' ')), key(r['name']), key(r['id'].replace('-', ' '))):
            if k:
                idx[k].add(r['id'])
    stubmap = {s['id']: s for s in stubs}

    def cand_ok(cid, child):
        if cid in byid:
            return span_ok(child, byid[cid])
        if cid in stubmap:
            return span_ok(child, stubmap[cid])
        return False

    def from_rules(rules, child):
        for d in rules:
            if 'from' in d:
                if not (d['from'] <= child['startYear'] <= d['to']):
                    continue
                if 'bbox' in d and not in_bbox(child, d['bbox']):
                    continue
                if cand_ok(d['id'], child):
                    return d['id']
            else:  # fallback
                if cand_ok(d['id'], child):
                    return d['id']
        return None

    fuzzy_index = collections.defaultdict(list)
    for k, v in aliases.items():
        fuzzy_index[norm(k)].append(v)
    for r in curated:
        fuzzy_index[norm(r['name'])].append(r['id'])
    for s_ in stubs:
        fuzzy_index[norm(s_['name'])].append(s_['id'])
    fuzzy_keys = [k for k in fuzzy_index if k]
    stats = collections.Counter()
    unresolved = collections.Counter()
    unresolved_kind = collections.defaultdict(collections.Counter)
    stub_children = collections.defaultdict(list)
    for r in recs:
        new = []
        for p in r['partOf']:
            target = None; how = None
            # 1. alias table (raw string or name string with era rules)
            rules = aliases.get(p)
            if rules is not None:
                if isinstance(rules, str):
                    rules = [{'id': rules}]
                target = from_rules(rules, r)
                how = 'alias'
            # 2. exact id
            if target is None and p in byid:
                if span_ok(r, byid[p]):
                    target, how = p, 'id'
                else:
                    act = DATE_FIXES.get((r['id'], p))
                    if act:
                        if act[0] == 'drop':
                            LOG['partof_dropped'].append({'child': r['id'], 'parent': p, 'why': 'child dates outside parent; not part of it'})
                            stats['dropped'] += 1
                            continue
                        elif act[0] == 'reassign':
                            target, how = act[1], 'reassign'
                            LOG['partof_reassigned'].append({'child': r['id'], 'old': p, 'new': act[1]})
                        else:
                            target, how = p, 'id'  # parent/child dates are fixed below
                    else:
                        target, how = p, 'id-daterisk'
            # 3. exact name
            if target is None and p in byname:
                for cand in byname[p]:
                    if span_ok(r, cand):
                        target, how = cand['id'], 'name'; break
            # 4. normalised match
            if target is None:
                cands = idx.get(norm(p)) or idx.get(key(p)) or set()
                for cid in sorted(cands):
                    if span_ok(r, byid[cid]):
                        target, how = cid, 'normalised'; break
            # 5. fuzzy match against alias keys and curated names (typo variants), still date-checked
            if target is None:
                np_ = norm(p)
                if len(np_) >= 8:
                    for m in difflib.get_close_matches(np_, fuzzy_keys, n=6, cutoff=0.88):
                        for cand in fuzzy_index[m]:
                            t = from_rules(cand, r) if isinstance(cand, list) else (cand if cand_ok(cand, r) else None)
                            if t:
                                target, how = t, 'fuzzy'; break
                        if target:
                            break
            if target is None:
                new.append(p)
                unresolved[p] += 1
                kind = 'no-candidate'
                if p in byid or p in byname or p in aliases or idx.get(norm(p)) or idx.get(key(p)):
                    kind = 'date-mismatch'
                unresolved_kind[kind][p] += 1
                stats['unresolved'] += 1
                continue
            if target == r['id']:
                LOG['partof_dropped'].append({'child': r['id'], 'parent': p, 'why': 'resolved to itself (string named the record\'s own war)'})
                stats['dropped'] += 1
                continue
            if target not in new:
                new.append(target)
            stats[how] += 1
            if how == 'fuzzy':
                LOG['fuzzy'].append({'child': r['id'], 'year': r['startYear'], 'raw': p, 'target': target})
            if target in stubmap:
                stub_children[target].append(r)
        r['partOf'] = new
    LOG['partof_stats'] = dict(stats)
    return unresolved, unresolved_kind, stub_children


def apply_parent_date_fixes(recs):
    byid = {r['id']: r for r in recs}
    for pid, (s, e, why) in PARENT_DATE_FIXES.items():
        r = byid.get(pid)
        if r and (r['startYear'], r['endYear']) != (s, e):
            LOG['date_fixes'].append({'id': pid, 'field': 'startYear/endYear', 'old': f"{r['startYear']}-{r['endYear']}", 'new': f'{s}-{e}', 'why': why})
            r['startYear'], r['endYear'] = s, e
    for (cid, pid), act in DATE_FIXES.items():
        if act[0] == 'child-dates' and cid in byid:
            r = byid[cid]
            LOG['date_fixes'].append({'id': cid, 'field': 'startYear/endYear', 'old': f"{r['startYear']}-{r['endYear']}", 'new': f'{act[1]}-{act[2]}', 'why': 'era record trimmed to the parent war (see PARENT_DATE_FIXES)'})
            r['startYear'], r['endYear'] = act[1], act[2]


def build_stubs(recs, stubs, stub_children):
    """Create stub parent records for stubs that have children (or are parents of created stubs)."""
    byid = {r['id']: r for r in recs}
    stubmap = {s['id']: s for s in stubs}
    needed = set(stub_children)
    changed = True
    while changed:
        changed = False
        for sid in list(needed):
            for p in stubmap[sid].get('partOf', []):
                if p in stubmap and p not in needed:
                    needed.add(p); changed = True
    created = []
    for s in stubs:
        if s['id'] not in needed:
            continue
        if s['id'] in byid:
            LOG['stub_collision'].append(s['id']); continue
        kids = stub_children.get(s['id'], [])
        # centroid of direct children (+ stub children if any)
        pts = [k['coordinates'] for k in kids]
        for other in stubs:
            if s['id'] in other.get('partOf', []) and other['id'] in needed:
                pts += [k['coordinates'] for k in stub_children.get(other['id'], [])]
        if 'coordinates' in s:
            coords = s['coordinates']
        elif pts:
            coords = [round(sum(p[0] for p in pts) / len(pts), 2), round(sum(p[1] for p in pts) / len(pts), 2)]
        else:
            coords = [0.0, 0.0]
        cc = collections.Counter()
        for k in kids:
            for c in k['countries']:
                if c and c != 'Draw':
                    cc[c] += 1
        countries = s.get('countries') or [c for c, _ in cc.most_common(6)]
        lc = collections.Counter()
        for k in kids:
            for l in k['locations']:
                lc[l] += 1
        locations = [l for l, _ in lc.most_common(4)]
        ys = [k['startYear'] for k in kids]
        if ys and (min(ys) < s['startYear'] - 1 or max(ys) > (s['endYear'] if s['endYear'] is not None else 2030) + 1):
            LOG['stub_date_warn'].append({'id': s['id'], 'stub': f"{s['startYear']}-{s['endYear']}", 'children': f'{min(ys)}-{max(ys)}'})
        imp = s['importance']
        if len(kids) >= 40:
            imp = max(imp, 4)
        rec = {
            'id': s['id'], 'name': s['name'], 'startYear': s['startYear'], 'endYear': s['endYear'],
            'coordinates': coords, 'locations': locations, 'countries': countries, 'partOf': list(s.get('partOf', [])),
            'casualties': None, 'wikipediaUrl': s.get('wikipediaUrl'), 'importance': imp, 'description': s['description'],
            'sources': [{'label': 'Derived from HCED child battles; see Wikipedia', 'url': s.get('wikipediaUrl')}],
        }
        recs.append(rec)
        created.append({'id': s['id'], 'name': s['name'], 'children': len(kids), 'years': f"{s['startYear']}-{s['endYear']}"})
    LOG['stubs_created'] = created


# ================================================================ STAGE D: casualties (task 2)
CASUALTY_FIXES = [
    # id, headline, (low, high) or None to keep, notes or None, justification
    ('battle-kadesh', 10000, None, None, 'no reliable count; chariot battle deaths on both sides unlikely to exceed the 5-15k range'),
    ('persian-wars-greece', 100000, None, None, 'Herodotean totals are inflated; 100k deaths across 490-479 BCE is the mid-range'),
    ('thermopylae-battle', 4000, (2500, 20000), 'Greek dead ~4,000 (Herodotus); Persian losses reported as 20,000 are considered exaggerated', 'range 30k-100k was nonsense (it was the Persian army size); headline = Greek dead'),
    ('first-punic-war', 400000, None, None, 'headline below its range; naval disasters alone cost Rome >100k men; ~400k both sides'),
    ('punic-wars', 1200000, None, None, 'aggregate of the three wars (~400k + ~500k-1M + ~150k) sits inside the 1-2M range'),
    ('second-punic-war', 500000, None, None, 'headline below range; Roman military dead ~300k plus Italian and Spanish civilian losses'),
    ('cannae-battle', 55000, (50000, 76000), 'Roman dead 48,200 (Livy) to 70,000 (Polybius) plus ~6,000 Carthaginians', 'range brought in line with the ancient sources; headline is the Livy-based estimate plus Carthaginian dead'),
    ('third-punic-war', 150000, None, None, 'headline above range; Carthage\'s population was largely killed or enslaved but ~50k survived; 150k mid-range'),
    ('jewish-roman-wars', 600000, (300000, 1700000), 'Josephus (1.1M, 66-73) and Cassius Dio (580k, 132-135) are considered inflated', 'range widened to span modern and ancient figures; headline mid-range'),
    ('yellow-turban-rebellion', 2000000, (500000, 7000000), 'upper figures attribute the whole late-Han census decline to the revolt', 'headline (7M) was the maximal claim; 2M is the usual middle estimate'),
    ('byzantine-arab-wars', 1000000, None, None, 'headline above range; aggregate over eight centuries is unknowable; set to range mid-point'),
    ('reconquista-iberia', 1000000, None, None, 'headline below range; set to the low bound'),
    ('mongol-invasion-china', 20000000, (10000000, 40000000), 'Jin/Song census fell from ~120M to ~60M; how much was death rather than unregistered population is disputed', 'the 30-60M range was the raw census differential; range and headline reduced'),
    ('mongol-conquest-song', 15000000, None, None, 'headline below range; set to low bound (sub-record of mongol-invasion-china)'),
    ('mongol-invasion-middle-east', 2000000, (1000000, 5000000), 'Baghdad 1258 alone 90k-800k; chronicler figures of 1M+ for Merv, Nishapur and Herat are exaggerated', 'range raised; headline reduced to 2M'),
    ('yuan-conquest-south-china', 2000000, None, None, 'headline above range; set to the high bound'),
    ('timurid-invasions', 5000000, (1000000, 17000000), 'commonly cited 17M (~5% of world population) is an upper estimate', 'range raised to include the standard 17M figure; headline unchanged'),
    ('timurid-conquests', 5000000, (1000000, 17000000), 'commonly cited 17M is an upper estimate; duplicate of timurid-invasions (see review)', 'as timurid-invasions'),
    ('ottoman-conquest-constantinople', 10000, (5000, 20000), '~4,000 defenders killed, several thousand Ottoman dead, plus civilians killed in the sack', 'range raised; headline 10k'),
    ('sengoku-period', 500000, None, None, 'headline above range; no reliable aggregate; set to high bound (duplicate of sengoku-period-japan, see review)'),
    ('sengoku-period-japan', 500000, None, None, 'headline above range; set to high bound'),
    ('ottoman-hungarian-wars-16th', 500000, None, None, 'headline above range; mid-range'),
    ('spanish-conquest-aztec-empire', 240000, (100000, 240000), 'combat and siege deaths 1519-1521 only; the 1520 smallpox epidemic (millions) is counted under spanish-conquest-mexico', 'record scoped to combat deaths so it no longer contradicts its range; duplicate of spanish-conquest-mexico (see review)'),
    ('korean-war-resistance-1592', 500000, (100000, 1000000), 'Korean dead incl. famine often cited as ~1M; combat deaths far lower', 'range widened to the often-cited 1M; headline mid-range'),
    ('dutch-expansion-asia', 300000, None, None, 'headline above range; set to high bound'),
    ('manchu-conquest-china', 3000000, None, None, 'headline above range; set to high bound (duplicate cluster with qing-conquest-ming/ming-qing-transition, see review)'),
    ('ming-qing-transition', 2000000, None, None, 'headline above range; set to high bound'),
    ('maratha-mughal-wars', 500000, None, None, 'headline above range; set to high bound'),
    ('russo-turkish-wars', 1000000, (500000, 1500000), 'aggregate of twelve wars 1676-1878; 1877-78 alone ~200,000 dead', 'range raised so the 1M headline is inside it'),
    ('war-austrian-succession', 500000, None, None, 'merged record: headline (300k) fell below the range (400-800k) inherited from war-of-austrian-succession; ~500k deaths is the usual estimate'),
    ('american-revolution', 50000, (37000, 70000), 'US ~25,000 dead incl. disease and prison ships; British/German ~24,000; French and Spanish ~15,000', 'headline 300k was total casualties/impact, not deaths'),
    ('french-revolution-wars', 1500000, None, None, 'headline above range; set to high bound (includes the Vendée)'),
    ('napoleonic-wars-italian-campaigns', 200000, (100000, 300000), 'Italian theatre 1796-1814 only', 'range had been copied from the whole Napoleonic Wars'),
    ('war-sixth-coalition', 500000, (300000, 800000), '1813-14 campaigns; the 1812 Russian campaign is a separate record', 'headline 800k double-counted the Russian campaign'),
    ('mfecane', 1000000, None, None, 'headline below range; 1-2M is the standard estimate; set to low bound'),
    ('second-anglo-afghan-war', 30000, (15000, 50000), 'British ~10,000 dead (mostly disease); Afghan losses several thousand in battle plus civilians', 'range 50-150k was wrong'),
    ('eastern-front-wwi', 6000000, (4000000, 9000000), '~3.5M military dead (Russia 1.8-2.2M, Austria-Hungary ~1M, Germany ~0.3M, Romania ~0.3M) plus civilian and disease deaths', 'range 7-12M was too high for deaths; headline raised to 6M'),
    ('gallipoli-campaign', 130000, (110000, 190000), 'deaths: Allied ~56,000, Ottoman 56,000-87,000; total casualties incl. wounded ~500,000', 'headline and range had been casualties, not deaths'),
    ('anglo-afghan-war-1919', 3000, (2000, 5000), 'British-Indian ~1,750 dead (mostly disease); Afghan ~1,000+', 'range 10-50k was wrong'),
    ('chinese-civil-war', 8000000, None, None, 'headline below range; 8M is a common mid estimate for 1927-49 (range 7-20M unchanged)'),
    ('barbarossa-operation', 5000000, None, '1941-42 invasion campaign; total Eastern Front deaths 1941-45 (~27-30M) are counted under World War II', 'headline 27M was the whole Soviet WWII death toll'),
    ('pacific-war', 5000000, (4000000, 8000000), 'excludes the China theatre (second-sino-japanese-war); includes Japanese-occupation famines', 'range 2-4M too low for a theatre that killed ~2.5M Japanese servicemen alone'),
    ('chinese-civil-war-main', 6000000, None, None, 'headline below range; set to low bound'),
    ('syrian-civil-war', 600000, (350000, 620000), 'SOHR ~617,000 (2024); UN ~350,000 documented by 2021', 'range raised to current SOHR figure'),
    ('tigray-war-2020', 400000, (160000, 600000), 'Ghent University estimates 300,000-600,000 incl. famine; battlefield deaths ~160,000+', 'range raised; headline mid-range'),
    ('india-pakistan-war-1971', 12000, (8000, 15000), 'military dead of the 13-day war; Bangladeshi civilian deaths are under bangladesh-liberation-war', 'headline 3M was the Bangladesh genocide upper bound'),
    ('third-indo-pakistan-war', 12000, (8000, 15000), 'military dead of the 13-day war (duplicate of india-pakistan-war-1971, see review)', 'as india-pakistan-war-1971'),
    ('bangladesh-liberation-war', 1000000, (300000, 3000000), 'overlapping estimates: same deaths as bangladesh-genocide; 300k (independent studies) to 3M (Bangladesh official)', 'headline moved from upper bound to central estimate'),
    ('bangladesh-genocide', 1000000, (300000, 3000000), 'overlapping estimates: same deaths as bangladesh-liberation-war; 300k (independent studies) to 3M (Bangladesh official)', 'headline moved from upper bound to central estimate'),
    ('somme-offensive', 310000, (300000, 350000), 'deaths only (British ~130k, French ~50k, German ~160k); total casualties incl. wounded ~1.0-1.2M', 'headline 2M was more than the total casualties; duplicate of battle-somme (see review)'),
    ('battle-somme', 310000, (300000, 350000), 'deaths only (British ~130k, French ~50k, German ~160k); total casualties incl. wounded ~1.0-1.2M', 'headline 1M was total casualties incl. wounded'),
    ('verdun-offensive', 305000, (300000, 330000), 'deaths only (French ~163k, German ~143k); total casualties ~700k+', 'headline 1M was above total casualties; duplicate of battle-verdun (see review)'),
    ('battle-verdun', 305000, (300000, 330000), 'deaths only (French ~163k, German ~143k); total casualties ~700k+', 'headline 700k was total casualties incl. wounded'),
]


def stage_casualties(recs):
    byid = {r['id']: r for r in recs}
    for cid, head, rng, notes, why in CASUALTY_FIXES:
        r = byid.get(cid)
        if not r:
            LOG['casualty_skipped'].append(cid); continue
        old = r['casualties']; oldr = r.get('casualtyRange')
        r['casualties'] = head
        if rng:
            cr = dict(oldr) if oldr else {}
            cr['low'], cr['high'] = rng
            if notes:
                cr['notes'] = notes
            if 'source' not in cr:
                cr['source'] = 'r14 editorial review'
            setk(r, 'casualtyRange', {k: cr[k] for k in ('low', 'high', 'source', 'notes') if k in cr})
        elif notes and oldr:
            oldr['notes'] = notes
        LOG['casualties'].append({'id': cid, 'old': old, 'new': head,
                                  'range': (f"{oldr['low']:,}-{oldr['high']:,} -> " if oldr and rng and (oldr['low'], oldr['high']) != rng else '') + (f'{rng[0]:,}-{rng[1]:,}' if rng else (f"{oldr['low']:,}-{oldr['high']:,} (unchanged)" if oldr else 'none')),
                                  'why': why})


# ================================================================ STAGE E: Draw + era labels (task 4) + polity aliases (task 8)
def stage_belligerents(recs, era_rules, polity):
    n_draw = 0
    for r in recs:
        if 'Draw' in r['countries']:
            r['countries'] = [c for c in r['countries'] if c != 'Draw']
            n_draw += 1
            LOG['draw_ids'].append(r['id'])
            if not r['countries'] and 'Outcome: indecisive' not in r['description']:
                r['description'] = r['description'].rstrip() + ' Outcome: indecisive.'
    LOG['draw_count'] = n_draw
    era_counts = collections.Counter()
    for r in recs:
        new = []
        for c in r['countries']:
            rep = c
            for rule in era_rules:
                if rule['label'] == c and rule['from'] <= r['startYear'] <= rule['to'] and ('bbox' not in rule or in_bbox(r, rule['bbox'])):
                    rep = rule['replace']; break
            if rep != c:
                era_counts[f'{c} -> {rep}'] += 1
            new.append(rep)
        r['countries'] = list(dict.fromkeys(new))
    LOG['era_counts'] = dict(era_counts)
    pol = collections.Counter()
    applied = {k: v['canonical'] for k, v in polity.items() if v.get('apply') and v['canonical'] != '(remove)'}
    for r in recs:
        new = []
        for c in r['countries']:
            t = applied.get(c, c)
            if t != c:
                if c in ('Great Britain', 'Britain', 'Kingdom of Great Britain', 'British', 'United Kingdom and Commonwealth') and r['startYear'] < 1707:
                    t = 'England'
                pol[f'{c} -> {t}'] += 1
            new.append(t)
        r['countries'] = list(dict.fromkeys(new))
    LOG['polity_counts'] = dict(pol)


# ================================================================ STAGE F: coordinates (task 5)
COORD_FIXES = {
    'battle-of-freeman-s-farm': ([-73.63, 43.00], 'was mid-Pacific; Freeman\'s Farm is at Saratoga NY'),
    'battle-of-ututlan': ([-91.17, 14.76], 'longitude sign flip (Guatemala)'),
    'battle-of-bahia': ([-38.51, -12.97], 'was open Atlantic; Salvador da Bahia'),
    'battle-of-kagera': ([31.0, -1.0], 'was DRC interior; Kagera salient'),
    'battle-of-el-menabba': ([-3.6, 31.95], 'was in Algeria; El Menabba is by Boudenib, eastern Morocco'),
    'battle-of-admin-box': ([92.3, 20.9], 'was in Bangladesh; Ngakyedauk Pass'),
    'battle-of-arakan': ([93.0, 20.5], 'was in the Bay of Bengal; Arakan coast'),
    'battle-of-arakan-1943': ([93.0, 20.5], 'was in the Bay of Bengal; Arakan coast'),
    'battle-of-arakan-1944': ([93.0, 20.5], 'was in the Bay of Bengal; Arakan coast'),
    'battle-of-focchies': ([26.75, 38.67], 'lat/lon were swapped; Foça near Izmir'),
    'battle-of-kuju': ([125.24, 39.98], 'was in Liaoning; Kusong, North Korea'),
    'ottoman-conquest-northern-africa': ([3.06, 36.75], 'was central Anatolia; Algiers'),
    'ottoman-conquest-yemen': ([44.21, 15.37], 'was central Anatolia; Sana\'a'),
    'wars-of-the-diadochi': ([32.2, 38.8], 'was central Anatolia; Ipsus area'),
    'macedonian-conquest-alexander': ([43.3, 36.6], 'was Nefud desert; Gaugamela'),
    'portuguese-expansion-africa': ([34.85, -19.85], 'was Tanzanian interior; Sofala/Mozambique coast'),
    'dutch-portuguese-wars-1602': ([102.25, 2.19], 'was null island; Malacca'),
}
LABEL_FIXES = {
    'battle-of-cuzco-hills': ['Cuba'], 'battle-of-lircay': ['Chile'], 'battle-of-pucara': ['Peru'],
    'battle-of-ap-bac': ['Vietnam'], 'battle-of-italica': ['Spain'], 'battle-of-morval': ['France'],
    'battle-of-chosin': ['North Korea'], 'battle-of-leh': ['India'], 'battle-of-dundia-khera': ['India'],
    'battle-of-erestfer': ['Estonia'], 'battle-of-hummelshof': ['Estonia'], 'battle-of-jungfernhof': ['Latvia'],
}
NE_ALIASES = {'united states': 'united states of america', 'czech republic': 'czechia', 'bosnia and herzegovina': 'bosnia and herz.',
              'democratic republic of the congo': 'dem. rep. congo', 'dr congo': 'dem. rep. congo', 'republic of the congo': 'congo',
              'central african republic': 'central african rep.', 'south sudan': 's. sudan', 'dominican republic': 'dominican rep.',
              'equatorial guinea': 'eq. guinea', 'western sahara': 'w. sahara', 'eswatini': 'eswatini', 'swaziland': 'eswatini',
              'solomon islands': 'solomon is.', "cote d'ivoire": "côte d'ivoire", 'ivory coast': "côte d'ivoire", 'macedonia': 'north macedonia',
              'east timor': 'timor-leste', 'turkey': 'türkiye', 'myanmar': 'myanmar', 'burma': 'myanmar', 'north korea': 'north korea',
              'south korea': 'south korea', 'united kingdom': 'united kingdom', 'russia': 'russia', 'iran': 'iran', 'syria': 'syria',
              'laos': 'laos', 'vietnam': 'vietnam', 'bolivia': 'bolivia', 'venezuela': 'venezuela', 'tanzania': 'tanzania',
              'palestine': 'palestine', 'brunei': 'brunei', 'cape verde': 'cabo verde', 'sao tome and principe': 'são tomé and principe',
              'the gambia': 'gambia', 'the bahamas': 'bahamas', 'micronesia': 'micronesia', 'saint kitts and nevis': 'st. kitts and nevis',
              'saint lucia': 'saint lucia', 'saint vincent and the grenadines': 'st. vin. and gren.', 'northern mariana islands': 'n. mariana is.',
              'falkland islands': 'falkland is.', 'french southern territories': 'fr. s. antarctic lands', 'british virgin islands': 'british virgin is.',
              'cayman islands': 'cayman is.', 'marshall islands': 'marshall is.', 'faroe islands': 'faeroe is.', 'antigua and barbuda': 'antigua and barb.',
              'hong kong': 'hong kong', 'kosovo': 'kosovo', 'somaliland': 'somaliland', 'taiwan': 'taiwan', 'greenland': 'greenland',
              'puerto rico': 'puerto rico', 'guam': 'guam', 'new caledonia': 'new caledonia', 'french polynesia': 'fr. polynesia'}


def stage_coordinates(recs, countries_path):
    byid = {r['id']: r for r in recs}
    for cid, (xy, why) in COORD_FIXES.items():
        r = byid.get(cid)
        if r:
            LOG['coord_fixes'].append({'id': cid, 'old': r['coordinates'], 'new': xy, 'why': why})
            r['coordinates'] = xy
    for cid, loc in LABEL_FIXES.items():
        r = byid.get(cid)
        if r and r['locations'] != loc:
            LOG['label_fixes'].append({'id': cid, 'old': r['locations'], 'new': loc})
            r['locations'] = loc
    if not countries_path or not os.path.exists(countries_path):
        LOG['pic_pass'] = 'skipped (no country polygons)'
        return
    try:
        from shapely.geometry import shape, Point
        from shapely.strtree import STRtree
    except ImportError:
        LOG['pic_pass'] = 'skipped (shapely not installed)'
        return
    with open(countries_path, encoding='utf-8') as f:
        gj = json.load(f)
    polys = {}
    feats = [(shape(ft['geometry']), ft['properties']) for ft in gj['features']]
    for g, pr in feats:  # own names first so dependencies never claim their sovereign's name
        for k in ('NAME', 'NAME_LONG', 'ADMIN', 'NAME_EN', 'BRK_NAME'):
            v = pr.get(k)
            if v:
                polys.setdefault(v.lower(), g)
    for g, pr in feats:
        v = pr.get('SOVEREIGNT')
        if v and pr.get('TYPE') in ('Sovereign country', 'Country') and pr.get('ADMIN') == v:
            polys.setdefault(v.lower(), g)
    geoms = list({id(g): g for g in polys.values()}.values())
    tree = STRtree(geoms)
    names_by_geom = collections.defaultdict(list)
    for n, g in polys.items():
        names_by_geom[id(g)].append(n)
    fixed = 0; mism = []
    for r in recs:
        if not is_hced(r) or len(r['locations']) != 1 or r['id'] in COORD_FIXES:
            continue
        loc = r['locations'][0].lower()
        loc = NE_ALIASES.get(loc, loc)
        g = polys.get(loc)
        if g is None:
            continue
        lon, lat = r['coordinates']
        pt = Point(lon, lat)
        if g.buffer(0.35).contains(pt):
            continue
        variants = {'lon-flip': (-lon, lat), 'lat-flip': (lon, -lat), 'both-flip': (-lon, -lat), 'swap': (lat, lon)}
        hits = [k for k, v in variants.items() if -180 <= v[0] <= 180 and -90 <= v[1] <= 90 and g.buffer(0.2).contains(Point(*v))]
        if len(hits) == 1 and g.distance(pt) > 3.0:  # far from the named country; offshore naval battles are left alone
            v = variants[hits[0]]
            LOG['coord_fixes'].append({'id': r['id'], 'old': [lon, lat], 'new': [v[0], v[1]], 'why': f'point-in-country: {hits[0]} puts it inside {r["locations"][0]}'})
            r['coordinates'] = [v[0], v[1]]
            fixed += 1
        else:
            inside = []
            for gi in tree.query(pt):
                gg = geoms[gi]
                if gg.contains(pt):
                    inside += names_by_geom[id(gg)][:1]
            mism.append({'id': r['id'], 'name': r['name'], 'year': r['startYear'], 'label': r['locations'][0], 'point_in': inside[:1], 'coords': [lon, lat]})
    LOG['pic_pass'] = f'{fixed} sign/swap fixes; {len(mism)} label/pin mismatches listed for review'
    LOG['pic_mismatch'] = mism


# ================================================================ STAGE G: importance floor (task 6)
REVIEW_SECONDARIES = {  # secondary -> primary of judgment-call duplicate clusters (importance floor skipped if primary carries it)
    'three-kingdoms-wars': 'three-kingdoms-war-184', 'three-kingdoms-china': 'three-kingdoms-war-184',
    'first-chinese-civil-war': 'chinese-civil-war', 'chinese-civil-war-main': 'chinese-civil-war',
    'korean-war-resistance-1592': 'imjin-war-korean-perspective', 'korean-invasions-toyotomi': 'imjin-war-korean-perspective', 'imjin-war-second-phase': 'imjin-war-korean-perspective',
    'spanish-conquest-aztec-empire': 'spanish-conquest-mexico', 'french-huguenot-wars': 'french-wars-of-religion',
    'sengoku-period-japan': 'sengoku-period', 'sengoku-period-conflicts': 'sengoku-period',
    'somme-offensive': 'battle-somme', 'verdun-offensive': 'battle-verdun',
    'third-indo-pakistan-war': 'india-pakistan-war-1971', 'bangladesh-genocide': 'bangladesh-liberation-war',
    'timurid-conquests': 'timurid-invasions', 'manchu-conquest-china': 'qing-conquest-ming', 'ming-qing-transition': 'qing-conquest-ming',
    'swedish-great-northern-war': 'great-northern-war', 'spanish-conquest-peru': 'spanish-conquest-inca-empire',
    'mozambique-civil-war-2': 'mozambique-civil-war', 'donbas-war-2': 'donbas-war', 'rwandan-genocide': 'rwandan-civil-war-1990',
    'south-sudan-independence-war': 'sudanese-civil-war', 'afghan-soviet-war-extended': 'soviet-afghanistan-war',
    'anti-japanese-invasion-war-china': 'second-sino-japanese-war', 'dungan-revolt': 'dungan-rebellion', 'xinjiang-conflicts': 'dungan-rebellion',
    'zimbabwe-civil-war': 'rhodesian-bush-war', 'zimbabwe-bush-war-1964': 'rhodesian-bush-war', 'french-revolution-wars-1792': 'french-revolution-wars',
    'north-african-campaign': 'north-africa-campaign', 'western-desert-campaign': 'north-africa-campaign',
    'metacom-war': 'king-philips-war', 'colombian-conflict': 'colombian-civil-war', 'americas-colombian-conflict-farc-1964': 'colombian-civil-war',
    'guatemala-internal-conflict': 'guatemalan-civil-war', 'el-salvador-civil-war': 'salvadoran-civil-war', 'biafran-war': 'nigerian-civil-war',
    'troubles-northern-ireland-1968': 'northern-ireland-conflict-the-troubles', 'greek-turkish-war': 'greco-turkish-war', 'polish-bolshevik-war': 'polish-soviet-war',
    'warlord-era-1916': 'warlord-era', 'northern-expedition-1926': 'first-northern-expedition', 'liberian-civil-war-first': 'liberian-civil-war',
    'chechen-wars-first': 'chechen-wars', 'aceh-conflict': 'aceh-rebellion-1976', 'us-invasion-grenada': 'grenada-invasion',
    'italian-wars-third': 'spanish-french-wars', 'french-italian-wars': 'spanish-french-wars', 'dutch-revolt-start': 'eighty-years-war',
    'delhi-invasion-timur': 'timurid-invasion-india', 'saxon-wars': 'charlemagne-saxon-wars', 'deluge-swedish-invasion-1655': 'polish-swedish-war',
    'war-of-spanish-succession-extended': 'war-spanish-succession', 'great-heathen-army': 'viking-england-great-heathen-867',
    'americas-caste-war-yucatan-1847': 'caste-war-yucatan', 'confederation-peru-bolivia': 'americas-war-confederation-1836',
    'triple-alliance-war-detail': 'war-of-triple-alliance', 'falkland-islands-war': 'falklands-war', 'georgia-south-ossetia-war': 'georgia-russia-war',
    'operation-cast-lead': 'gaza-war-2008', 'operation-protective-edge': 'gaza-war-2014', 'israel-hamas-war-2023': 'gaza-war-2023',
    'transnistrian-war': 'transnistria-war-1992', 'nagorno-karabakh-war': 'nagorno-karabakh-1988', 'tuareg-rebellion-1962-64': 'first-tuareg-rebellion-mali',
    'tuareg-rebellion-19901995': 'second-tuareg-rebellion', 'burundian-civil-war': 'burundi-civil-war', 'ivory-coast-civil-war': 'first-ivorian-civil-war',
    'mali-war-2012': 'mali-crisis', 'libyan-civil-war-2011': 'first-libyan-civil-war', 'second-libyan-civil-war': 'libyan-civil-war-2014',
    'yemeni-civil-war-2015': 'yemeni-civil-war', 'boko-haram-insurgency': 'boko-haram-insurgency-2009', 'isis-in-iraq-and-syria': 'isis-conflict-iraq-syria',
    'kashmir-conflict': 'kashmir-conflict-ongoing', 'lord-s-resistance-army-insurgency': 'lords-resistance-army-uganda',
    'communist-rebellion-in-the-philippines': 'communal-insurgency-philippines-1969', 'indonesian-war-independence': 'indonesian-national-revolution-1945',
    'anarchy-in-england-1135-1153': 'anarchy-stephen', 'americas-pueblo-revolt-1680': 'pueblo-revolt', 'anglo-spanish-armada': 'anglo-spanish-war-1585-1604',
    'conquest-of-tunis-1574': 'ottoman-conquest-tunis', 'ottoman-conquest-cyprus': 'ottoman-venetian-war-1570', 'cyprus-war-1570': 'ottoman-venetian-war-1570',
    'fourth-ottoman-venetian-war-1499': 'ottoman-venetian-war-1499', 'ottoman-venetian-crete-extended': 'ottoman-venetian-war-crete',
    'spanish-conquest-granada': 'spanish-moorish-granada', 'colombian-independence': 'colombian-independence-war', 'brazilian-independence': 'brazilian-independence-war',
    'egyptian-ottoman-war-1831': 'first-egyptian-ottoman-war', 'russo-ottoman-war-1768': 'russo-turkish-war-1768-1774', 'sikh-wars': 'anglo-sikh-wars',
    'maori-wars': 'new-zealand-land-wars', 'zulu-wars': 'anglo-zulu-war', 'egyptian-campaign-napoleon': 'french-invasion-egypt', 'hundred-days-campaign': 'hundred-days',
    'americas-tikal-calakmul-wars-562': 'tikal-calakmul-rivalry', 'toltec-maya-conflict': 'toltec-maya-conflicts', 'americas-inca-chimor-conquest-1470': 'inca-chimor-conquest',
    'americas-arauco-war-1536': 'araucanian-war-mapuche-resistance', 'americas-french-intervention-mexico-1861': 'americas-french-intervention-mexico-1861',
}


def stage_importance(recs):
    byid = {r['id']: r for r in recs}
    for r in recs:
        c = r['casualties']
        if c is None:
            continue
        floor = 5 if c >= 3000000 else 4 if c >= 1000000 else 0
        if floor and r['importance'] < floor:
            prim = REVIEW_SECONDARIES.get(r['id'])
            if prim and prim in byid and byid[prim]['importance'] >= floor:
                LOG['importance_skipped'].append({'id': r['id'], 'primary': prim, 'floor': floor})
                continue
            LOG['importance'].append({'id': r['id'], 'name': r['name'], 'casualties': c, 'old': r['importance'], 'new': floor})
            r['importance'] = floor


# ================================================================ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--countries', default=os.environ.get('NE_COUNTRIES', ''))
    ap.add_argument('--log', default=os.path.join(DATA, '..', '..', 'docs', 'data-review'))
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    recs, indent = load()
    LOG['before'] = {'records': len(recs)}
    aliases = json.load(open(os.path.join(DATA, 'parent_aliases.json'), encoding='utf-8'))
    aliases.update(EXTRA_ALIASES)
    stubs = json.load(open(os.path.join(DATA, 'parent_stubs.json'), encoding='utf-8')) + EXTRA_STUBS
    era_rules = json.load(open(os.path.join(DATA, 'belligerent_era_aliases.json'), encoding='utf-8'))
    polity = json.load(open(os.path.join(DATA, 'polity_aliases.json'), encoding='utf-8'))

    # partOf baseline
    ids = {r['id'] for r in recs}; names = {r['name'] for r in recs}
    tot = sum(len(r['partOf']) for r in recs)
    res = sum(1 for r in recs for p in r['partOf'] if p in ids or p in names)
    LOG['before']['partof_refs'] = tot; LOG['before']['partof_resolved'] = res

    redirects = stage_small_fixes(recs)
    stage_merges(recs, redirects)
    apply_parent_date_fixes(recs)
    unresolved, unres_kind, stub_children = resolve_partof(recs, aliases, stubs)
    stage_casualties(recs)
    stage_belligerents(recs, era_rules, polity)
    build_stubs(recs, stubs, stub_children)
    stage_coordinates(recs, a.countries)
    stage_importance(recs)

    # final partOf audit
    byid = {r['id']: r for r in recs}
    tot2 = sum(len(r['partOf']) for r in recs)
    res2 = sum(1 for r in recs for p in r['partOf'] if p in byid)
    LOG['after'] = {'records': len(recs), 'partof_refs': tot2, 'partof_resolved': res2,
                    'unresolved_strings': len(unresolved), 'unresolved_refs': sum(unresolved.values())}
    LOG['unresolved_top'] = unresolved.most_common(60)
    LOG['unresolved_kind'] = {k: sum(v.values()) for k, v in unres_kind.items()}
    out_of_range = []
    for r in recs:
        for p in r['partOf']:
            if p in byid and not span_ok(r, byid[p]):
                out_of_range.append({'child': r['id'], 'child_years': f"{r['startYear']}-{r['endYear']}", 'parent': p, 'parent_years': f"{byid[p]['startYear']}-{byid[p]['endYear']}"})
    LOG['out_of_range_remaining'] = out_of_range

    if a.dry_run:
        print(json.dumps({k: LOG[k] for k in ('before', 'after', 'partof_stats', 'unresolved_kind')}, indent=1))
        return
    with open(CONF, 'w', encoding='utf-8') as f:
        json.dump(recs, f, indent=indent, ensure_ascii=False)  # no trailing newline, as in the original file
    with open(os.path.join(DATA, 'id_redirects.json'), 'w', encoding='utf-8') as f:
        json.dump(dict(sorted(redirects.items())), f, indent=1, ensure_ascii=False)
    with open(os.path.join(DATA, 'parent_unresolved.json'), 'w', encoding='utf-8') as f:
        json.dump({'note': 'partOf strings that still do not resolve to a record id after r14; counts are child records. '
                           'Kept verbatim so the source attribution is not lost; the validator accepts these strings.',
                   'strings': dict(sorted(unresolved.items(), key=lambda x: -x[1]))}, f, indent=1, ensure_ascii=False)
    os.makedirs(a.log, exist_ok=True)
    with open(os.path.join(a.log, 'r14_log.json'), 'w', encoding='utf-8') as f:
        json.dump(LOG, f, indent=1, ensure_ascii=False, default=list)
    print(json.dumps({k: LOG[k] for k in ('before', 'after', 'partof_stats', 'unresolved_kind', 'pic_pass', 'draw_count')}, indent=1))
    print('stubs created:', len(LOG['stubs_created']), 'merges:', len(LOG['merges']), 'deleted:', len(LOG['deleted']),
          'casualty changes:', len(LOG['casualties']), 'importance changes:', len(LOG['importance']),
          'coord fixes:', len(LOG['coord_fixes']), 'out-of-range remaining:', len(out_of_range))


if __name__ == '__main__':
    main()
