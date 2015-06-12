#!/usr/bin/env python

import argparse
import re
import os

parser = argparse.ArgumentParser(description='Predict locations for volume spans in War of the Rebellion using toponyms')
parser.add_argument('--predicted-spans', '--ps', required=True,
    help="Directory containing predicted spans with embedded toponyms.")
parser.add_argument('--filter-regex', '--fr', help="Regex to filter spans.")
parser.add_argument('--document-info', '--di', required=True,
    help='Wikipedia document info file, used for getting redirects.')
parser.add_argument('--combined-document-info', '--cdi', required=True,
    help='Wikipedia combined document info file.')
parser.add_argument('--links', required=True,
    help='Wikipedia links file.')
parser.add_argument('-o', '--output', required=True,
    help="Prefix for written-out TextDB database containing predictions.")

args = parser.parse_args()

# Map from redirects to canonical article name
redirects = {}
# Map from canonical article name to lat/long coordinates
coordinates = {}
# Map from canonical article name to incoming links
#incoming_links = {}
# Map from anchor text to canonical articles
anchor_text_map = {}

bounding_box = [25.0,-126.0,49.0,-60.0]
bogus_toponyms = set(['camp', 'united states', 'cavalry', 'central', 'church', 'city', 'commonwealth', 'east', 'field', 'gulf', 'heights', 'hill', 'hills', 'hospital', 'house', 'isle', 'lake', 'north', 'northeast', 'northern', 'northwest', 'park', 'point', 'ridge', 'river', 'rivers', 'road', 'roads', 'rock', 'run', 'san', 'santa', 'south', 'southwest', 'southwestern', 'state', 'states', 'tank', 'top', 'tree', 'west', 'wood', 'woods', 'cav', 'dept', 'dist', 'esq', 'etc', 'hdqrs', 'mil', 'ord', 'sub', 'surg', 'u. s', 'u.s', 'vols'])
abbr_to_states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DC": "District of Columbia",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "VI": "Virgin Islands",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

state_abbrs = set(x.lower() for x in abbr_to_states)
states = set(x.lower() for x in abbr_to_states.itervalues())
longer_state_abbrs = set(['ala', 'ariz', 'ark', 'cal', 'colo', 'conn', 'dak',
  'del', 'fla', 'ill', 'ind', 'kans', 'mass', 'mex', 'mich', 'minn', 'miss',
  'n. ala', 'nebr', 'nev', 'oreg', 'penn', 's. c.', 'ten', 'tenn', 'tex',
  'wash', 'west va', 'wis'])
def is_state(toponym):
  return toponym in states or toponym in state_abbrs or toponym in longer_state_abbrs

def coord_in_bounding_box(coord):
  minlat, minlon, maxlat, maxlon = bounding_box
  lat, lon = coord
  return lat >= minlat and lat <= maxlat and lon >= minlon and lon <= maxlon

def read_combined_document_info():
  print "Reading combined document info file %s ..." % args.combined_document_info
  cdifile = open(args.combined_document_info)
  next(cdifile)
  for line in cdifile:
    fields = re.split("\t", line)
    if len(fields) != 10:
      print "Wrong number of fields in combined document info, expected 10, found %s: %s" % (len(fields), line)
    else:
      id, title, split, coord, ilinks, redir, namespace, is_list_of, is_disambig, is_list = fields
      title = title.lower()
      lat, lon = re.split(",", coord)
      coord = [float(lat), float(lon)]
      if coord_in_bounding_box(coord):
        if title in coordinates:
          print "Already saw %s with coord %s (new coord %s)" % (
              title, coordinates[title], coord)
        else:
          coordinates[title] = coord
        #incoming_links[title] = int(ilinks)

# Do this after reading the combined document info so we can check for
# redirects whether the redirected-to article has a coordinate.
def read_document_info():
  print "Reading document info file %s ..." % args.document_info
  difile = open(args.document_info)
  next(difile)
  for line in difile:
    fields = re.split("\t", line)
    if len(fields) != 8:
      print "Wrong number of fields in document info, expected 8, found %s: %s" % (len(fields), line)
    else:
      id, title, split, redir, namespace, is_list_of, is_disambig, is_list = fields
      title = title.lower()
      redir = redir.lower()
      if redir and redir in coordinates:
        redirects[title] = redir

def canonicalize_article(art):
  if art in coordinates:
    return art
  if art in redirects:
    return redirects[art]
  return None

def lookup_toponym(toponym):
  if toponym in anchor_text_map:
    art = canonicalize_article(anchor_text_map[toponym])
  else:
    art = canonicalize_article(toponym)
  if not art:
    return None
  if art in coordinates:
    return coordinates[art]
  print "Strange: Encountered canonicalized article %s without coordinate" % (
      art)
  return None

# Do this after reading document info and combined document info
def read_links():
  print "Reading links file %s ..." % args.links
  linksfile = open(args.links)
  # Skip till we find a blank line, indicating the start of
  # anchor text->article mapping
  for line in linksfile:
    line = line.strip()
    if not line:
      break

  anchor_text = None
  articles = []
  skip = False

  def process_anchor_text():
    for art in articles:
      canon = canonicalize_article(art)
      if canon:
        #print "Mapping %s to %s (coord %s)" % (anchor_text, canon, coordinates[canon])
        anchor_text_map[anchor_text] = canon
        break

  for line in linksfile:
    line = line.strip()
    m = re.match(r"-------- Anchor text->article for (.*):$", line)
    if m:
      if anchor_text:
        process_anchor_text()
      anchor_text = m.group(1).lower()
      articles = []
      skip = False
    elif re.match(r"-------- Anchor text->article for", line):
      if anchor_text:
        process_anchor_text()
      anchor_text = None
      articles = []
      skip = True
    elif not skip:
      m = re.match(r"(.*) = (.*)$", line)
      if not m:
        print "Strange line: %s" % line
      else:
        articles.append(m.group(1).lower())
  if anchor_text:
    process_anchor_text()
  # Manually do some hacking
  anchor_text_map['washington'] = 'washington, d.c.'

def get_span_coord(spanid, spantext, outfile):
  toponyms = []
  for topspan in re.finditer(r'<toponym>(.*?)</toponym>', spantext):
    toponym = topspan.group(1).lower()
    if toponym:
      # Remove a final period. Many of these are state abbrs, but some aren't,
      # and we handle the state abbrs by listing them.
      if toponym[-1] == '.':
        toponym = toponym[0:-1]
      if toponym not in bogus_toponyms:
        toponyms.append(toponym)
  # First, find first non-state toponym (this skips "Washington" even though
  # it maps to a city)
  for toponym in toponyms:
    if not is_state(toponym):
      coord = lookup_toponym(toponym)
      if coord:
        return [toponym, coord]
      else:
        print "Unrecognized toponym: %s" % toponym
  # Then find a state toponym, but not "Washington" (the city, but also
  # listed in states).
  for toponym in toponyms:
    if toponym != 'washington':
      coord = lookup_toponym(toponym)
      if coord:
        return [toponym, coord]
  # Then find "Washington"
  for toponym in toponyms:
    coord = lookup_toponym(toponym)
    if coord:
      return [toponym, coord]
  return None

def do_predicted_spans(outfile):
  for spanfile in os.listdir(args.predicted_spans):
    m = re.match(r"([0-9]+)\.", spanfile)
    if not m:
      print "Unable to parse span filename %s" % spanfile
      print 'File name format should be e.g. "60.predicted-spans" for volume 60'
    else:
      vol = m.group(1)
      print "Processing predicted spans in volume %s" % vol
      filetext = open(args.predicted_spans + "/" + spanfile).read()
      spanno = 1
      spans = []
      for span in re.finditer(r'^-----+ BEGIN SPAN -----+$(.*?)^-----+ END SPAN -----+$', filetext, re.M | re.S):
        spantext = span.group(1)
        if not args.filter_regex or re.search(args.filter_regex, spantext):
          spans.append(["%s" % spanno, None, spantext])
        spanno += 1
      for spanid, _, spantext in spans:
        coord = get_span_coord(spanid, spantext, outfile)
        toponym = ""
        if coord:
          toponym, coord = coord
          lat, lon = coord
          coord = "%s,%s" % (lat, lon)
        else:
          coord = ""
        line = "vol%s.%s\t%s\t%s\t%s\t%s\t\n" % (vol, spanid, vol, spanid, toponym, coord)
        outfile.write(line)

def write_schema_file(schemafile):
  print >>schemafile, "title\tvol\tspan\ttoponym\tcoord\tunigram-counts"
  print >>schemafile, "corpus-type\tgeneric"
  print >>schemafile, "split\ttraining"

read_combined_document_info()
read_document_info()
read_links()

outdir = os.path.dirname(args.output)
if outdir and not os.path.exists(outdir):
  os.makedirs(outdir)
outfile = open("%s.data.txt" % args.output, "w")
do_predicted_spans(outfile)
outfile.close()
schemafile = open("%s.schema.txt" % args.output, "w")
write_schema_file(schemafile)
schemafile.close()
