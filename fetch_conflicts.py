#!/usr/bin/env python3
"""
Fetch all military conflicts from Wikidata using SPARQL.
Pulls: name, start/end dates, location coordinates, belligerents,
casualties, Wikipedia URL, and conflict type.
"""

import json
import time
import requests
import sys
from datetime import datetime

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

# We query in batches to avoid timeouts. Wikidata has thousands of conflicts.
# Q178561 = "military conflict" (and subclasses via wdt:P31/wdt:P279*)
QUERY_TEMPLATE = """
SELECT DISTINCT
  ?conflict ?conflictLabel
  ?startDate ?endDate
  ?coord
  ?locationLabel
  ?countryLabel
  ?partOfLabel
  ?casualties
  ?article
WHERE {{
  ?conflict wdt:P31/wdt:P279* wd:Q178561 .

  OPTIONAL {{ ?conflict wdt:P580 ?startDate . }}
  OPTIONAL {{ ?conflict wdt:P582 ?endDate . }}
  OPTIONAL {{ ?conflict wdt:P625 ?coord . }}
  OPTIONAL {{ ?conflict wdt:P276 ?location . }}
  OPTIONAL {{ ?conflict wdt:P17 ?country . }}
  OPTIONAL {{ ?conflict wdt:P361 ?partOf . }}
  OPTIONAL {{ ?conflict wdt:P1120 ?casualties . }}

  OPTIONAL {{
    ?article schema:about ?conflict .
    ?article schema:isPartOf <https://en.wikipedia.org/> .
  }}

  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,fr,de,es" . }}
}}
ORDER BY ?startDate
LIMIT {limit}
OFFSET {offset}
"""

def fetch_batch(offset, limit=2000):
    """Fetch a batch of conflicts from Wikidata."""
    query = QUERY_TEMPLATE.format(limit=limit, offset=offset)
    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": "WarsAtlas/1.0 (conflict-history-project)"
    }

    for attempt in range(3):
        try:
            resp = requests.get(
                WIKIDATA_SPARQL,
                params={"query": query},
                headers=headers,
                timeout=120
            )
            if resp.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()["results"]["bindings"]
        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt+1}, retrying...")
            time.sleep(10)
        except Exception as e:
            print(f"  Error on attempt {attempt+1}: {e}")
            time.sleep(10)

    return []

def parse_date(date_str):
    """Parse Wikidata date string to year (handles BCE dates)."""
    if not date_str:
        return None
    # Wikidata uses ISO 8601 with possible negative years for BCE
    try:
        if date_str.startswith("-"):
            # BCE date like -0752-01-01T00:00:00Z
            year = int(date_str.split("-")[1]) * -1
            return year
        else:
            year = int(date_str.split("-")[0].lstrip("+"))
            return year
    except (ValueError, IndexError):
        return None

def parse_coord(coord_str):
    """Parse Wikidata coordinate string 'Point(lon lat)' to [lon, lat]."""
    if not coord_str:
        return None
    try:
        # Format: "Point(12.345 67.890)"
        parts = coord_str.replace("Point(", "").replace(")", "").split()
        return [float(parts[0]), float(parts[1])]
    except (ValueError, IndexError):
        return None

def get_value(binding, key):
    """Safely extract a value from a SPARQL binding."""
    if key in binding:
        return binding[key]["value"]
    return None

def main():
    print("=" * 60)
    print("WARS ATLAS - Wikidata Conflict Scraper")
    print("=" * 60)

    all_results = []
    offset = 0
    batch_size = 2000

    while True:
        print(f"\nFetching batch at offset {offset}...")
        batch = fetch_batch(offset, batch_size)

        if not batch:
            print(f"  No more results (or error). Stopping.")
            break

        print(f"  Got {len(batch)} rows")
        all_results.extend(batch)

        if len(batch) < batch_size:
            print(f"  Last batch (fewer than {batch_size} results)")
            break

        offset += batch_size
        time.sleep(2)  # Be polite to Wikidata

    print(f"\nTotal raw rows: {len(all_results)}")

    # Aggregate rows by conflict (multiple rows per conflict due to JOINs)
    conflicts = {}

    for row in all_results:
        qid = get_value(row, "conflict")
        if not qid:
            continue

        # Extract Q-ID
        qid = qid.split("/")[-1]

        if qid not in conflicts:
            conflicts[qid] = {
                "id": qid,
                "name": get_value(row, "conflictLabel") or "Unknown conflict",
                "startYear": None,
                "endYear": None,
                "coordinates": None,
                "locations": set(),
                "countries": set(),
                "partOf": set(),
                "casualties": None,
                "wikipediaUrl": None,
            }

        c = conflicts[qid]

        # Dates
        start = parse_date(get_value(row, "startDate"))
        end = parse_date(get_value(row, "endDate"))
        if start is not None and (c["startYear"] is None or start < c["startYear"]):
            c["startYear"] = start
        if end is not None and (c["endYear"] is None or end > c["endYear"]):
            c["endYear"] = end

        # Coordinates
        coord = parse_coord(get_value(row, "coord"))
        if coord and not c["coordinates"]:
            c["coordinates"] = coord

        # Locations
        loc = get_value(row, "locationLabel")
        if loc:
            c["locations"].add(loc)

        # Countries
        country = get_value(row, "countryLabel")
        if country:
            c["countries"].add(country)

        # Part of (larger conflict)
        part_of = get_value(row, "partOfLabel")
        if part_of:
            c["partOf"].add(part_of)

        # Casualties (take the max reported)
        cas = get_value(row, "casualties")
        if cas:
            try:
                cas_num = int(float(cas))
                if c["casualties"] is None or cas_num > c["casualties"]:
                    c["casualties"] = cas_num
            except ValueError:
                pass

        # Wikipedia URL
        wiki = get_value(row, "article")
        if wiki and not c["wikipediaUrl"]:
            c["wikipediaUrl"] = wiki

    # Convert sets to lists for JSON serialization
    result_list = []
    for c in conflicts.values():
        c["locations"] = sorted(c["locations"])
        c["countries"] = sorted(c["countries"])
        c["partOf"] = sorted(c["partOf"])
        result_list.append(c)

    # Sort by start year
    result_list.sort(key=lambda x: x["startYear"] if x["startYear"] is not None else 9999)

    # Stats
    with_dates = sum(1 for c in result_list if c["startYear"] is not None)
    with_coords = sum(1 for c in result_list if c["coordinates"] is not None)
    with_wiki = sum(1 for c in result_list if c["wikipediaUrl"] is not None)
    with_countries = sum(1 for c in result_list if c["countries"])

    print(f"\n{'=' * 60}")
    print(f"RESULTS SUMMARY")
    print(f"{'=' * 60}")
    print(f"Total unique conflicts: {len(result_list)}")
    print(f"With start dates:       {with_dates} ({100*with_dates//max(len(result_list),1)}%)")
    print(f"With coordinates:       {with_coords} ({100*with_coords//max(len(result_list),1)}%)")
    print(f"With Wikipedia URL:     {with_wiki} ({100*with_wiki//max(len(result_list),1)}%)")
    print(f"With countries:         {with_countries} ({100*with_countries//max(len(result_list),1)}%)")

    # Date range
    dated = [c for c in result_list if c["startYear"] is not None]
    if dated:
        earliest = dated[0]
        latest = dated[-1]
        print(f"Earliest conflict:      {earliest['name']} ({earliest['startYear']})")
        print(f"Latest conflict:        {latest['name']} ({latest['startYear']})")

    # Save
    output_path = "/sessions/modest-laughing-franklin/wars-atlas/data/conflicts_raw.json"
    with open(output_path, "w") as f:
        json.dump(result_list, f, indent=2, ensure_ascii=False)

    print(f"\nSaved to {output_path}")
    print(f"File size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")

if __name__ == "__main__":
    import os
    main()
