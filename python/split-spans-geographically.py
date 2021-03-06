#!/usr/bin/env python

import argparse
import re
import json
import bz2
import pointpoly

# This can operate in two modes. If --split, it will generate separate
# TextDB files, one for each geographic region. If --lda, it will
# determine the distribution of topics in each geographic region.
# The arguments --spans, --geojson and --output must be given; if --lda,
# --doc-topics and --topic-keys are also required.

parser = argparse.ArgumentParser(description='Split a TextDB database of War of the Rebellion text geographically')
parser.add_argument('--spans', required=True,
    help="TextDB data file containing spans. Can be bzipped.")
parser.add_argument('--geojson', required=True,
    help="""File containing polygons delimiting geographic regions, in GeoJSON
format.""")
parser.add_argument('--output', required=True,
    help="""If '--split', TextDB prefix for outputting resulting split files.
If '--lda', file to output geographic topic proportions to.""")
parser.add_argument('--doc-topics',
    help="Mallet output file containing document topic proportions.")
parser.add_argument('--topic-keys',
    help="Mallet output file containing topic keys (top words in each topic).")
parser.add_argument('--split', action='store_true',
    help="Generate separate TextDB files, one per geographic region.")
parser.add_argument('--lda', action='store_true',
    help="Determine the distribution of topics in each geographic region.")
parser.add_argument('--latex', action='store_true',
    help="Output region topics in LaTeX format instead of human-readable.")
parser.add_argument('--num-top-topics', '--ntop', type=int,
    help="Number of top topics per region to output.")
parser.add_argument('--num-top-regions', '--nreg', type=int,
    help="Number of top regions to output.")
parser.add_argument('--max-lines', type=int,
    help="Maximum lines in TextDB file to process (for debugging).")

args = parser.parse_args()

def need(arg):
  if not getattr(args, arg):
    parser.error("Must specify argument --%s" % arg.replace('_', '-'))

if args.lda:
  need('doc_topics')
  need('topic_keys')

def read_geojson():
#   { "type": "Feature", "properties": { "id": 9, "name": "union northeast" }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -80.733761638116064, 49.315922328733151 ], [ -67.556931805969739, 49.26485614345269 ], [ -67.036622789357097, 46.102978273268214 ], [ -66.156099838166483, 41.580292205789149 ], [ -73.57869081047528, 40.260671801046179 ], [ -73.998452987511882, 40.452157075873522 ], [ -80.520278187471689, 40.752655134211572 ], [ -80.733761638116064, 49.315922328733151 ] ] ] } },
  regions = {}
  with open(args.geojson) as jfil:
    js = json.load(jfil)
  for feat in js['features']:
    name = feat['properties']['name'].replace(" ", "-")
    assert feat['geometry']['type'] == "Polygon"
    coords = feat['geometry']['coordinates']
    if len(coords) > 1:
      raise RuntimeError("Don't know what to do with top-level multiple coords: %s" % coords)
    coords = coords[0]
    regions[name] = coords
  return regions

def read_doc_topics():
  doc_topics = {}
  num_topics = 0
  print "Reading document topics file %s ..." % (args.doc_topics)
  with open(args.doc_topics) as dt:
    # Skip header line
    next(dt)
    for line in dt:
      line = line.strip()
      fields = line.split("\t")
      # Get document name and massage it to format used in TextDB file
      # (vol1.79 in TextDB file, 1.predicted-spans.79 in LDA doc-topics
      docname = re.sub("^([0-9]+)\.predicted-spans\.([0-9]+)$", r"vol\1.\2",
          fields[1])
      fields = fields[2:] # Ignore doc number and name
      assert len(fields) % 2 == 0
      if num_topics == 0:
        num_topics = len(fields) / 2
      else:
        assert len(fields) == num_topics * 2
      for i in xrange(len(fields)):
        if i % 2 == 0:
          fields[i] = int(fields[i])
        else:
          fields[i] = float(fields[i])
      doc_topics[docname] = fields
  print "Reading document topics file %s ... done." % (args.doc_topics)
  return num_topics, doc_topics

def read_topic_keys():
  keys = []
  with open(args.topic_keys) as tk:
    for line in tk:
      line = line.strip()
      fields = line.split("\t")
      keys.append(fields[2])
  return keys

civil_war_region_coords = read_geojson()

# Find index of coordinate and title fields in input schema file
schemafn = re.sub(r'^(.*)\.data\.txt(\.bz2)?$', r'\1.schema.txt', args.spans)
with open(schemafn) as schemafile:
  schemafields = next(schemafile).strip()
schemafields = schemafields.split("\t")
coordfield = schemafields.index('coord')
titlefield = schemafields.index('title')

# Open input data file
if args.spans.endswith(".bz2"):
  spanfile = bz2.BZ2File(args.spans)
else:
  spanfile = open(args.spans)

def yield_lines_and_regions():
  print "Reading data file %s ..." % (args.spans)
  numlines = 0
  for line in spanfile:
    numlines += 1
    if args.max_lines and numlines > args.max_lines:
      break
    if numlines % 10000 == 0:
      print "%s lines read" % numlines
    if line.endswith('\n'):
      line = line[0:-1]
    fields = re.split("\t", line)
    lat, lon = re.split(",", fields[coordfield])
    lat = float(lat)
    lon = float(lon)

    for reg in civil_war_region_coords:
      regcoords = civil_war_region_coords[reg]
      # Check the point, but also check slightly jittered points in each of
      # four directions in case we're exactly on a line (in which case we
      # might get a false value for the regions on both sides of the line).
      if (pointpoly.point_inside_polygon(lon, lat, regcoords) or
          pointpoly.point_inside_polygon(lon + 0.0001, lat, regcoords) or
          pointpoly.point_inside_polygon(lon - 0.0001, lat, regcoords) or
          pointpoly.point_inside_polygon(lon, lat + 0.0001, regcoords) or
          pointpoly.point_inside_polygon(lon, lat - 0.0001, regcoords)):
        break
    else:
      reg = "unknown"
    yield (line, fields, reg)

def split_sentence_in_two(sent):
  l = len(sent) / 2
  while l < len(sent) and sent[l] != ' ':
    l += 1
  return [sent[0:l], sent[l+1:]]

def prettify_region_name(name):
  name = name.replace("-", " ")
  name = re.sub(r"\b([a-z])", lambda m: m.group(1).upper(), name)
  name = name.replace("Trans ", "Trans-")
  return name

if args.split:
  regfiles = {}
  # Write out schema files for geographic regions
  for reg in civil_war_region_coords.keys() + ['unknown']:
    regfiles[reg] = open("%s-%s.data.txt" % (args.output, reg), "w")
    with open("%s-%s.schema.txt" % (args.output, reg), "w") as schemafile:
      print >>schemafile, "%s" % schemafields
      print >>schemafile, "corpus-type\tgeneric"
      print >>schemafile, "split\ttraining"
      print >>schemafile, "region\t%s" % reg

  for line, fields, reg in yield_lines_and_regions():
    print >>regfiles[reg], "%s" % line

if args.lda:
  # Maybe read doc-topics file
  num_topics, doc_topics = read_doc_topics()
  topic_keys = read_topic_keys()

  # Initialize topic proportions for each region
  region_proportions = {}
  for reg in civil_war_region_coords.keys() + ['unknown']:
    region_proportions[reg] = [0.0] * num_topics

  # Initialize total and per-region count of lines
  num_lines = 0
  region_span_count = {}
  for reg in civil_war_region_coords.keys() + ['unknown']:
    region_span_count[reg] = 0

  # Process lines in input TextDB file
  for line, fields, reg in yield_lines_and_regions():
    title = fields[titlefield]
    if title not in doc_topics:
      print "Skipping doc %s, not in doc topics" % title
    else:
      region_span_count[reg] += 1
      num_lines += 1
      topicprops = doc_topics[title]
      assert len(topicprops) == num_topics * 2
      for i in xrange(num_topics):
        region_proportions[reg][topicprops[i * 2]] += topicprops[i * 2 + 1]

  # Output topic proportions for each region
  with open(args.output, "w") as outfile:

    if args.latex:
      print >>outfile, r"""\begin{tabular}{|l||r|l|}
\hline
\textbf{Topic} & \textbf{Prop\%} & \textbf{Top words} \\
\hline"""
    else:
      print >>outfile, "Total num-lines: %s" % num_lines
    reg_with_props = [(reg, props, region_span_count[reg])
        for reg, props in region_proportions.iteritems()]
    reg_with_props = sorted(reg_with_props, key=lambda x: -x[2])
    nreg = args.num_top_regions or len(reg_with_props)
    reg_with_props = reg_with_props[0:nreg]
    for reg, props, regcount in reg_with_props:
      # Normalize topic proportions
      totalprops = sum(props)
      if totalprops > 0.0:
        for i in xrange(len(props)):
          props[i] /= totalprops
      indexed_props = [(i, props[i]) for i in xrange(len(props))]
      sorted_props = sorted(indexed_props, key=lambda x: -x[1])
      ntop = args.num_top_topics or len(sorted_props)
      sorted_props = sorted_props[0:ntop]
      prettyreg = prettify_region_name(reg)
      if args.latex:
        print >>outfile, r"""\hline
\multicolumn{3}{|c|}{\textbf{Region: %s (%s spans, %0.2f\%%)}} \\
\hline""" % (prettyreg, regcount, 100.0 * float(regcount) / num_lines)
        for index, prop in sorted_props:
          words1, words2 = split_sentence_in_two(topic_keys[index])
          print >>outfile, r"""%s & %0.2f & \shortstack[l]{%s \\ %s} \\
\hline""" % (index, 100.0 * prop, words1, words2)
      else:
        print >>outfile, "Region: %s (%s spans, %0.2f%%)" % (
            prettyreg, regcount, 100.0 * float(regcount) / num_lines)
        for index, prop in sorted_props:
          print >>outfile, "%s\t%0.2f\t%s" % (
              index, 100.0 * prop, topic_keys[index])
    if args.latex:
      print >>outfile, r"""\end{tabular}"""
