#!/usr/bin/env python3
"""
Assign a `polityType` to every feature in public/empires.json. The polity
type captures whether the polity had FIXED BORDERS as a matter of historical
reality, separate from the question of whether our polygon is well-traced.

Categories (matches BORDER_TRACING_PROCESS.md):

  state        — bureaucratic state with administrative provinces, taxation,
                 and a recorded frontier. Roman, Han, Ming, Mughal, Ottoman,
                 Bahmani Sultanate, Ryukyu Kingdom, modern nation-states,
                 colonial empires (their administrative units).

  tributary    — paramount chiefdom or tributary network. A real center,
                 a tributary periphery, no surveyed frontier line.
                 Coosa, Calusa, Tu'i Tonga, Toltec, Ife, Kanem, Mwene Mutapa.

  confederation — loose alliance of independent groups sharing identity.
                 Iroquois Confederacy, Huron Wendat, Maori iwi (collective),
                 Taíno chiefdoms (plural), Mossi states (plural), Hausa
                 city-states, Apache Confederacy, Maya Classic city-states.

  culture      — archaeological culture defined by material remains, not
                 by political organization.  Hohokam, Mogollon, Fremont,
                 Ancestral Pueblo, Mississippian, Olmec, Adena, Hopewell,
                 Teotihuacan as a cultural sphere, Indus Valley.

  nomadic-range — pastoralist or hunter-gatherer seasonal range. Pechenegs,
                 Comancheria, Lakota/Sioux territory, Xiongnu, Mapuche,
                 Patagonia/Tehuelche.

Rendering implication: only `state` gets solid borders. Everything else
renders dashed regardless of how good the polygon is.

Run from repo root:
    python3 scripts/assign_polity_type.py
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMPIRES = ROOT / 'public' / 'empires.json'


# Explicit overrides — when the id appears here, the category is used directly.
# Anything not in this map gets categorized by heuristic (default = 'state' if
# the name pattern matches a recognizable polity form; see classify_by_name).

POLITY_TYPE: dict[str, str] = {

    # ─── ARCHAEOLOGICAL CULTURES ─────────────────────────────────────
    # Defined by material remains across centuries, not by political control.
    'americas-hohokam':                  'culture',
    'americas-mogollon-culture':         'culture',
    'americas-ancestral-fremont':        'culture',
    'americas-ancestral-pueblo':         'culture',
    'americas-ancestral-puebloan-chaco': 'culture',
    'americas-mississippian-peak':       'culture',
    'americas-mississippian-cahokia':    'culture',
    'americas-olmec-heartland':          'culture',
    'americas-adena-culture':            'culture',
    'americas-hopewell-culture':         'culture',
    'americas-teotihuacan':              'culture',
    'americas-zapotec-monte-alban':      'culture',
    'americas-wari-huari':               'culture',
    'huari-empire':                      'culture',
    'americas-tiwanaku':                 'culture',
    'tiahuanaco-empire':                 'culture',
    'americas-chimu-north-coast':        'tributary',   # Chimu had a real state apparatus
    'chimu-empire':                      'tributary',
    'maya-classic-period':               'confederation', # network of independent city-states
    'americas-maya-classic':             'confederation',

    # ─── NOMADIC RANGES ──────────────────────────────────────────────
    # Pastoralist or hunter-gatherer territories with no fixed frontier.
    'asia-pechenegs':                    'nomadic-range',
    'americas-comancheria':              'nomadic-range',
    'americas-lakota-sioux':             'nomadic-range',
    'asia-xiongnu':                      'nomadic-range',
    'asia-xianbei':                      'nomadic-range',
    'asia-rouran':                       'nomadic-range',
    'asia-cumans-kipchaks':              'nomadic-range',
    'americas-mapuche-araucania':        'nomadic-range',
    'americas-patagonia-tehuelche':      'nomadic-range',
    'asia-dzungar-khanate':              'nomadic-range',
    'asia-first-turkic-gokturk':         'nomadic-range',
    'asia-eastern-gokturk':              'nomadic-range',
    'asia-eastern-gokturk-second':       'nomadic-range',
    'asia-western-gokturk':              'nomadic-range',
    'asia-uyghur-khaganate':             'nomadic-range',
    'africa-punt':                       'nomadic-range',  # uncertain — better than 'state'

    # ─── CONFEDERATIONS / PLURAL POLITIES ────────────────────────────
    'americas-iroquois-confederacy':     'confederation',
    'americas-huron-wendat':             'confederation',
    'americas-apache-confederacy':       'confederation',
    'americas-powhatan-confederacy':     'confederation',
    'americas-tupinamba-confederation':  'confederation',
    'americas-chibcha-muisca':           'confederation',
    'americas-mayapan-confederacy':      'confederation',
    'americas-mixtec-kingdoms':          'confederation',
    'americas-mixtec-confederation':     'confederation',
    'americas-taino-chiefdoms':          'confederation',
    'pacific-maori':                     'confederation',
    'pacific-samoan':                    'confederation',
    'africa-hausa-kingdoms':             'confederation',
    'africa-mossi-wagadougou':           'confederation',
    'africa-maravi-confederacy':         'confederation',
    'asia-pyu-city-states':              'confederation',
    'americas-tlaxcala':                 'confederation',
    'asia-maratha-confederacy':          'confederation',
    'maratha-empire':                    'confederation',
    'swiss-confederation':               'state',   # actually a federal state by 1848
    'kalmar-union':                      'state',
    'americas-argentine-confederation':  'state',   # federal but a state

    # ─── TRIBUTARY NETWORKS / PARAMOUNT CHIEFDOMS ────────────────────
    'americas-coosa-chiefdom':           'tributary',
    'americas-calusa-chiefdom':          'tributary',
    'americas-natchez-chiefdom':         'tributary',
    'americas-itza-kingdom':             'tributary',
    'americas-kowoj-kingdom':            'tributary',
    'americas-toltec-empire':            'tributary',
    'americas-inca-kingdom-cusco':       'tributary',  # pre-Tawantinsuyu
    'pacific-tonga-tui':                 'tributary',
    'africa-ife-kingdom':                'tributary',
    'africa-kanem-empire':               'tributary',
    'africa-kanem-bornu-empire':         'tributary',
    'africa-mwene-mutapa-empire':        'tributary',
    'africa-monomutapa':                 'tributary',
    'africa-mutapa-empire':              'tributary',
    'africa-great-zimbabwe':             'tributary',
    'kingdom-of-zimbabwe':               'tributary',
    'africa-torwa-state':                'tributary',
    'africa-rozvi-empire':               'tributary',
    'africa-luba-empire':                'tributary',
    'luba-kingdom':                      'tributary',
    'africa-lunda-empire':               'tributary',
    'ndongo-kingdom':                    'tributary',
    'africa-igala-kingdom':              'tributary',
    'africa-zagwe-dynasty':              'tributary',
    'africa-nubia-post-meroitic':        'tributary',
    'africa-nobatia-kingdom':            'tributary',
    'africa-makuria-kingdom':            'tributary',
    'africa-alodia-kingdom':             'tributary',
    'africa-toro-kingdom':               'tributary',
    'africa-ankole-kingdom':             'tributary',
    'africa-bunyoro-kitara':             'tributary',
    'africa-buganda-kingdom':            'tributary',
    'africa-rwanda-kingdom':             'tributary',
    'africa-burundi-kingdom':            'tributary',
    'africa-mthethwa-paramountcy':       'tributary',
    'africa-sotho-kingdom':              'tributary',
    'africa-ndebele-kingdom':            'tributary',
    'africa-ajuran-sultanate':           'tributary',  # nomadic-leaning sultanate
    'asia-khotan':                       'tributary',
    'asia-ferghana':                     'tributary',
    'asia-funan':                        'tributary',
    'asia-srivijaya':                    'tributary',  # maritime tributary network
    'srivijaya-empire':                  'tributary',
    'asia-bagan-kingdom':                'tributary',
    'asia-pagan-kingdom':                'tributary',
    'pagan-kingdom':                     'tributary',
    'asia-champa':                       'tributary',  # series of mandala polities
    'asia-chera-dynasty':                'tributary',
    'asia-pandya-empire':                'tributary',
    'asia-hoysala-empire':               'tributary',
    'asia-kakatiya-dynasty':             'tributary',
    'asia-yadava-dynasty':               'tributary',
    'asia-sukhothai-kingdom':            'tributary',
    'asia-lan-na-kingdom':               'tributary',
    'asia-lan-xang-kingdom':             'tributary',
    'africa-aksumite-empire':            'tributary',
    'kingdom-of-axum':                   'tributary',
    'africa-ghana-empire':               'tributary',
    'ghana-empire':                      'tributary',
    'asia-shang-dynasty':                'tributary',  # bronze-age chiefdom-network
    'mitanni-kingdom':                   'tributary',
    'africa-kongo-kingdom':              'tributary',
    'africa-benin-kingdom':              'tributary',
    'kingdom-of-benin':                  'tributary',
    'africa-oyo-empire':                 'tributary',
    'africa-mali-empire':                'tributary',
    'africa-mali-empire-peak':           'tributary',
    'africa-songhai-empire':             'tributary',
    'africa-asante-empire':              'tributary',
    'ashanti-empire':                    'tributary',
    'africa-dahomey-kingdom':            'tributary',
    'africa-ifat-sultanate':             'tributary',
    'africa-adal-sultanate':             'tributary',
    'africa-funj-sultanate':             'tributary',
    'africa-omani-zanzibar':             'tributary',
    'africa-wassoulou-empire':           'tributary',
    'africa-imerina-madagascar':         'tributary',
    'merina-kingdom':                    'tributary',
    'africa-gondar-period':              'tributary',

    # ─── STATES (explicit just for clarity in edge cases) ────────────
    'aztec-empire':                      'state',  # had administrative capital + tax rolls
    'americas-aztec-expansion':          'state',
    'americas-inca-tawantinsuyu':        'state',
    'inca-empire':                       'state',
    'americas-tarascan-purepecha':       'state',
    'mongol-empire':                     'state',  # state-like by Genghis's reorganization
    'asia-golden-horde':                 'state',
    'asia-ilkhanate':                    'state',
    'asia-chagatai-khanate':             'state',
    'crimean-khanate':                   'state',
    'asia-khanate-bukhara':              'state',
    'asia-khanate-khiva':                'state',
    'asia-khanate-kokand':               'state',
    'asia-khazar':                       'state',
    'timurid-empire':                    'state',
    'asia-kara-khitai':                  'state',
    'asia-ryukyu-kingdom':               'state',  # actual administrative kingdom
    'pacific-tahitian':                  'state',  # Pomare II unified kingdom
    'pacific-hawaiian-kingdom':          'state',
    'americas-republic-of-texas':        'state',
    'americas-republic-of-yucatan':      'state',
    'americas-confederate-states':       'state',
    'americas-mexican-empire-iturbide':  'state',
    'manchukuo':                         'state',
    'kingdom-of-jerusalem':              'state',
    'latin-empire':                      'state',
    'asia-sikh-empire':                  'state',
    'asia-afsharid-dynasty':             'state',
    'asia-zand-dynasty':                 'state',
    'durrani-empire':                    'state',
    'asia-qajar-dynasty':                'state',
    'asia-konbaung-burma':               'state',
    'asia-mataram-sultanate':            'state',
    'asia-malacca-sultanate':            'state',
    'asia-aceh-sultanate':               'state',
    'asia-sultanate-sulu':               'state',
    'asia-sultanate-maguindanao':        'state',
    'asia-brunei-sultanate':             'state',
    'asia-deccan-sultanate-bijapur':     'state',
    'asia-deccan-sultanate-ahmadnagar':  'state',
    'asia-deccan-sultanate-golconda':    'state',
    'siam-rattanakosin':                 'state',
    'ayutthaya-kingdom':                 'state',
    'asia-bahmani-sultanate':            'state',
    'asia-ghaznavid-empire':             'state',
    'asia-ghurid-empire':                'state',
    'asia-tangut-western-xia':           'state',
    'asia-khitan-liao':                  'state',
    'asia-jurchen-jin':                  'state',
    'delhi-sultanate':                   'state',
    'vijayanagara-empire':               'state',
    'gupta-empire':                      'state',
    'asia-maurya':                       'state',
    'kushan-empire':                     'state',
    'asia-pala-empire':                  'state',
    'asia-chola-empire':                 'state',
    'chola-dynasty':                     'state',
    'asia-khwarezmian':                  'state',
    'mena-great-seljuk':                 'state',
    'mena-seljuk-rum':                   'state',
    'mena-ayyubid-sultanate':            'state',
    'mena-mamluk-sultanate':             'state',
    'tibetan-empire':                    'state',
    'asia-nguyen-vietnam':               'state',
    'dai-viet-vietnam':                  'state',
    'asia-three-kingdoms':               'state',
    'goguryeo-kingdom':                  'state',
    'asia-goguryeo':                     'state',
    'asia-baekje-kingdom':               'state',
    'asia-silla':                        'state',
    'asia-goryeo':                       'state',
    'joseon-dynasty':                    'state',
    'korean-empire':                     'state',
    'asia-yamato-kingdom':               'state',
    'asia-heian-period':                 'state',
    'asia-kamakura-shogunate':           'state',
    'asia-ashikaga-shogunate':           'state',
    'asia-sengoku-ashikaga':             'state',
    'tokugawa-shogunate':                'state',
    'asia-majapahit':                    'state',
    'khmer-empire':                      'state',
    'asia-nabataean':                    'state',
    'africa-kush-kingdom':               'state',
    'africa-ethiopian-empire-medieval':  'state',
    'africa-ethiopian-empire-menelik':   'state',
    'africa-solomonic-dynasty':          'state',
    'ethiopian-empire':                  'state',
    'africa-sokoto-caliphate':           'state',
    'africa-zulu-kingdom':               'state',
    'africa-swaziland-kingdom':          'state',
    'africa-lesotho-kingdom':            'state',
    'africa-zanzibar-sultanate':         'state',
    'africa-south-african-republic':     'state',
    'africa-orange-free-state':          'state',
    'africa-mtimely':                    'state',
    'khedivate-of-egypt':                'state',
}


def classify_by_name(p: dict) -> str:
    """Heuristic classifier for any feature not in POLITY_TYPE above.
    Conservative: defaults to 'state' for anything matching a recognizable
    state-form, since most remaining ids are well-defined kingdoms/empires."""
    name = (p.get('name') or '').lower()
    pid = p.get('id', '').lower()

    # Strong confederation signals
    if 'confederation' in name or 'confederacy' in name or 'iwi' in name:
        return 'confederation'
    if 'states' in name and ('city' in name or 'plural' in name):
        return 'confederation'
    if 'chiefdoms' in name or 'kingdoms' in name:
        return 'confederation'
    if 'paramountcy' in name:
        return 'tributary'

    # Culture indicators
    if 'culture' in name or 'phenomenon' in name or 'tradition' in name:
        return 'culture'

    # Nomadic indicators
    if 'territory' in name or 'range' in name or 'patagonia' in pid:
        return 'nomadic-range'
    if 'khaganate' in name and any(s in name for s in ['gokturk', 'turkic', 'uyghur', 'rouran', 'avar']):
        return 'nomadic-range'

    # Tributary indicators
    if 'chiefdom' in name or 'paramount' in name:
        return 'tributary'

    # Default to state for anything else — empire, kingdom, dynasty, republic,
    # sultanate, caliphate, khanate (state-like), khedivate, principality,
    # duchy, county, colonial holdings.
    return 'state'


def assign_all():
    with open(EMPIRES) as f:
        data = json.load(f)

    from collections import Counter
    counts = Counter()
    flipped_to_dashed = []
    new_dashed = []

    for feat in data['features']:
        p = feat['properties']
        pid = p['id']
        existing_accurate = p.get('accurate', False)
        existing_border_style = p.get('borderStyle', 'dashed')

        # Determine polity type
        if pid in POLITY_TYPE:
            ptype = POLITY_TYPE[pid]
        else:
            ptype = classify_by_name(p)

        p['polityType'] = ptype
        counts[ptype] += 1

        # Apply rendering rule: only 'state' renders solid
        if ptype != 'state':
            if existing_accurate is True and existing_border_style == 'solid':
                flipped_to_dashed.append((pid, p.get('name', ''), ptype))
            # Force to dashed/approximate regardless of polygon fidelity
            p['accurate'] = False
            p['borderStyle'] = 'dashed'
            new_dashed.append(pid)
        # else: leave accurate/borderStyle as-is. State-type entries with
        # accurate=false (e.g. clipped-to-country) stay dashed via the
        # existing rule.

    with open(EMPIRES, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

    print("Polity type distribution:")
    for k, v in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {v:4d}  {k}")
    print(f"\n{len(flipped_to_dashed)} features flipped from solid -> dashed because of polity type:")
    for pid, name, ptype in sorted(flipped_to_dashed, key=lambda x: x[2]):
        print(f"  [{ptype:14s}]  {pid:40s} {name}")


if __name__ == '__main__':
    assign_all()
