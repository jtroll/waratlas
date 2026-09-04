"""Hand-traced replacement polygons used by scripts/empires_fix_r14.py.

Each polygon is traced vertex-by-vertex from well-known geographic anchors
(coastlines, rivers, mountain ranges, named cities) following the extents
shown in standard historical atlases (Roaf, Cultural Atlas of Mesopotamia;
Barraclough, Times Atlas of World History; Shepherd, Historical Atlas).
Coordinates are (lon, lat) in WGS84.  No vertex is rounded or simplified
after tracing.
"""

# Neo-Assyrian Empire at its greatest extent (c. 671-650 BC, Esarhaddon /
# Ashurbanipal): Lower and Middle Egypt to Thebes, the Levant, Cilicia,
# upper Mesopotamia to the Urartian frontier, the western Zagros, Elam
# (Susiana) and Babylonia to the head of the Persian Gulf.  Cyprus (tributary
# island kings) is not drawn.
ASSYRIA_PEAK = [
    (29.80, 31.20), (30.50, 31.50), (31.50, 31.45), (32.30, 31.25), (33.50, 31.10),
    (34.25, 31.35), (34.80, 32.20), (34.95, 32.85), (35.10, 33.30), (35.50, 33.90),
    (35.85, 34.50), (35.90, 35.30), (36.00, 36.50), (35.55, 36.65), (35.00, 36.80),
    (34.50, 36.75), (33.60, 36.30), (33.20, 36.80), (34.00, 37.50), (35.30, 37.90),
    (36.50, 38.30), (38.30, 38.60), (39.50, 38.50), (40.50, 38.40), (41.50, 38.30),
    (42.80, 37.90), (43.80, 37.50), (44.70, 37.20), (45.50, 36.50), (46.50, 35.80),
    (47.00, 34.80), (47.50, 33.80), (48.50, 33.00), (49.20, 32.00), (49.50, 30.80),
    (49.00, 30.20), (48.00, 29.80), (47.50, 29.40), (46.80, 29.50), (44.50, 30.50),
    (42.50, 31.50), (41.00, 32.50), (39.50, 32.00), (38.00, 31.50), (36.50, 31.00),
    (35.50, 30.00), (35.00, 29.50), (34.50, 29.80), (33.80, 30.00), (33.00, 30.50),
    (32.60, 29.90), (32.40, 29.50), (32.00, 28.50), (31.60, 27.50), (31.30, 26.50),
    (32.50, 26.10), (33.00, 25.60), (32.90, 25.20), (32.20, 25.30), (31.90, 25.90), (30.80, 26.50),
    (30.60, 27.50), (30.80, 28.50), (30.50, 29.30), (30.20, 30.20), (29.90, 30.80),
    (29.80, 31.20),
]

# Neo-Babylonian (Chaldean) Empire at its greatest extent (c. 560 BC,
# Nebuchadnezzar II / Nabonidus): Mesopotamia from the Persian Gulf to the
# Taurus foothills (Harran, Carchemish), Syria, Phoenicia, Judah and Philistia
# to the Brook of Egypt, Edom, and the north-Arabian oases to Tayma.  The
# Median frontier runs along the Taurus / Zagros foothills; Cilicia and Elam
# are outside.
NEO_BABYLONIAN = [
    (33.80, 31.10), (34.50, 31.70), (34.80, 32.20), (34.95, 32.85), (35.10, 33.30),
    (35.50, 33.90), (35.85, 34.50), (35.90, 35.30), (36.00, 36.50), (35.60, 36.70),
    (36.30, 37.20), (37.00, 37.50), (38.00, 37.80), (38.80, 38.00), (39.80, 38.00),
    (40.70, 37.90), (41.80, 37.60), (42.80, 37.30), (43.50, 36.90), (44.30, 36.40),
    (45.00, 35.50), (45.60, 34.60), (46.20, 33.60), (46.80, 32.60), (47.50, 32.00),
    (47.80, 31.00), (48.20, 30.30), (48.50, 29.90), (48.00, 29.60), (47.50, 29.40),
    (46.50, 29.60), (45.00, 29.80), (43.50, 30.30), (42.00, 30.80), (40.50, 30.50),
    (39.50, 29.50), (39.00, 28.20), (38.60, 27.15), (37.90, 27.25), (37.20, 28.50),
    (36.50, 29.30), (35.60, 29.60), (35.00, 29.40), (34.90, 29.55), (34.40, 30.00),
    (34.20, 30.60), (33.80, 31.10),
]

# Valois Burgundian State c. 1475 (Charles the Bold), two blocks:
#  (1) the Duchy of Burgundy with the Auxerrois, Charolais and Maconnais, and
#      the Free County of Burgundy (Franche-Comte);
#  (2) the Burgundian Netherlands: Flanders, Artois, Boulonnais, the Somme
#      towns (held until Jan 1477), Hainaut, Namur, Brabant, Limburg/Overmaas,
#      Luxembourg, Holland and Zeeland.  The Prince-Bishopric of Liege (a
#      Burgundian protectorate, not a possession) is cut out as two holes (core around Liege/Huy/Dinant/Hasselt, and the
#      Entre-Sambre-et-Meuse exclave); the
#      Calais Pale (English), Cambresis and the Sticht of Utrecht are left
#      outside.  Guelders (conquered 1473, lost 1477) and the Alsatian pledge
#      lands (1469-1474) are not drawn.
BURGUNDY_SOUTH = [
    (3.55, 47.95), (3.90, 48.15), (4.40, 48.20), (4.90, 48.10), (5.30, 47.95),
    (5.90, 47.95), (6.20, 47.90), (6.60, 47.85), (6.85, 47.70), (6.85, 47.50),
    (6.60, 47.35), (6.90, 47.10), (6.50, 46.85), (6.10, 46.55), (5.85, 46.35),
    (5.55, 46.30), (5.40, 46.40), (5.20, 46.55), (4.95, 46.45), (4.90, 46.20),
    (4.60, 46.20), (4.35, 46.30), (4.00, 46.40), (3.85, 46.60), (3.75, 46.90),
    (3.60, 47.20), (3.50, 47.50), (3.45, 47.75), (3.55, 47.95),
]

BURGUNDY_NETHERLANDS_OUTER = [
    (1.55, 50.20), (1.58, 50.40), (1.58, 50.72), (1.60, 50.88), (1.85, 50.82),
    (2.10, 50.88), (2.15, 50.98), (2.40, 51.05), (2.90, 51.24), (3.20, 51.35),
    (3.50, 51.42), (3.45, 51.55), (3.70, 51.75), (3.85, 51.90), (4.05, 52.00),
    (4.25, 52.15), (4.50, 52.42), (4.60, 52.65), (4.72, 52.90), (4.95, 52.92),
    (5.15, 52.80), (5.30, 52.68), (5.08, 52.55), (5.00, 52.38), (5.15, 52.32),
    (5.05, 52.15), (4.98, 52.00), (5.10, 51.88), (5.25, 51.78), (5.50, 51.70),
    (5.85, 51.70), (5.85, 51.45), (5.70, 51.20), (5.90, 51.05), (6.10, 50.85),
    (6.15, 50.65), (6.20, 50.45), (6.35, 50.30), (6.45, 50.05), (6.45, 49.85),
    (6.55, 49.65), (6.45, 49.45), (6.35, 49.30), (6.15, 49.25), (5.85, 49.35),
    (5.55, 49.45), (5.30, 49.60), (5.05, 49.75), (5.00, 49.90), (4.85, 50.00),
    (4.60, 50.00), (4.40, 50.10), (4.20, 50.05), (4.00, 49.95), (3.75, 50.00),
    (3.55, 50.05), (3.45, 50.15), (3.50, 50.30), (3.35, 50.28), (3.00, 50.20),
    (3.10, 50.05), (3.35, 49.90), (3.30, 49.75), (3.00, 49.75), (2.70, 49.70),
    (2.50, 49.70), (2.20, 49.75), (1.90, 49.90), (1.70, 50.00), (1.55, 50.20),
]

BURGUNDY_LIEGE_HOLE = [
    (4.85, 50.20), (5.00, 50.40), (5.20, 50.62), (5.10, 50.80), (5.20, 50.90),
    (5.30, 51.00), (5.60, 51.05), (5.75, 50.90), (5.75, 50.70), (5.65, 50.55),
    (5.40, 50.35), (5.20, 50.15), (4.85, 50.20),
]

# Liege's Entre-Sambre-et-Meuse exclave (Thuin, Fosses, Florennes)
BURGUNDY_LIEGE_WEST_HOLE = [
    (4.25, 50.30), (4.45, 50.45), (4.65, 50.40), (4.75, 50.28), (4.60, 50.15),
    (4.35, 50.20), (4.25, 50.30),
]


def ring(pts):
    return [[float(x), float(y)] for x, y in pts]


ASSYRIA_PEAK_GEOMETRY = {"type": "Polygon", "coordinates": [ring(ASSYRIA_PEAK)]}
NEO_BABYLONIAN_GEOMETRY = {"type": "Polygon", "coordinates": [ring(NEO_BABYLONIAN)]}
BURGUNDY_GEOMETRY = {
    "type": "MultiPolygon",
    "coordinates": [
        [ring(BURGUNDY_NETHERLANDS_OUTER), ring(BURGUNDY_LIEGE_HOLE), ring(BURGUNDY_LIEGE_WEST_HOLE)],
        [ring(BURGUNDY_SOUTH)],
    ],
}
