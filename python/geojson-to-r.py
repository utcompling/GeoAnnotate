#!/usr/bin/env python

import argparse
import re
import json

# This can operate in two modes. If --split, it will generate separate
# TextDB files, one for each geographic region. If --lda, it will
# determine the distribution of topics in each geographic region.
# The arguments --spans, --geojson and --output must be given; if --lda,
# --doc-topics and --topic-keys are also required.

parser = argparse.ArgumentParser(description='Convert GeoJSON of theaters of Civil War into polygons for input into R.')
parser.add_argument('--geojson', required=True,
    help="""File containing polygons delimiting geographic regions, in GeoJSON
format.""")
parser.add_argument('--output', required=True,
    help="""File to output.""")

args = parser.parse_args()

#def need(arg):
#  if not getattr(args, arg):
#    parser.error("Must specify argument --%s" % arg.replace('_', '-'))

def read_geojson():
#   { "type": "Feature", "properties": { "id": 9, "name": "union northeast" }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -80.733761638116064, 49.315922328733151 ], [ -67.556931805969739, 49.26485614345269 ], [ -67.036622789357097, 46.102978273268214 ], [ -66.156099838166483, 41.580292205789149 ], [ -73.57869081047528, 40.260671801046179 ], [ -73.998452987511882, 40.452157075873522 ], [ -80.520278187471689, 40.752655134211572 ], [ -80.733761638116064, 49.315922328733151 ] ] ] } },
  regions = {}
  with open(args.geojson) as jfil:
    js = json.load(jfil)
  for feat in js['features']:
    name = feat['properties']['name'].replace(" ", "-")
    id = feat['properties']['id']
    assert feat['geometry']['type'] == "Polygon"
    coords = feat['geometry']['coordinates']
    if len(coords) > 1:
      raise RuntimeError("Don't know what to do with top-level multiple coords: %s" % coords)
    coords = coords[0]
    regions[name] = (id, coords)
  return regions

regions = read_geojson()
# Get list of (name, id, coords)
flattened_regions = [(name, idcoords[0], idcoords[1]) for name, idcoords in regions.iteritems()]
# Sort by id
flattened_regions = sorted(flattened_regions, key=lambda x:x[1])
with open(args.output, "w") as of:
  print >>of, "lat  long  group  name"
  for name, id, coords in flattened_regions:
    for lon, lat in coords:
      print >>of, "%s  %s  %s  %s" % (lat, lon, id, name)

