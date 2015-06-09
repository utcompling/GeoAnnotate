#!/usr/bin/env python

import argparse
import re
import os

parser = argparse.ArgumentParser(description='Insert or remove toponym indicators into/from War of The Rebellion text')
parser.add_argument('--remove', action='store_true',
    help="Remove toponym indicators from text rather than insert them.")
parser.add_argument('--spans',
    help="Directory containing toponym spans.")
parser.add_argument('--text', required=True,
    help='Directory containing volume text files')
parser.add_argument('--user', required=True,
    help='User whose toponym spans should be used.')
parser.add_argument('--output', required=True,
    help="Directory to output processed volume text files")

args = parser.parse_args()

volume_spans = {}
volume_text = {}

def read_volume_spans():
  for spanfile in os.listdir(args.spans):
    m = re.match("(.*)-([0-9]+).txt$", spanfile)
    if not m:
      print "Unable to parse span filename %s" % spanfile
      print 'File name format should be e.g. "Max Caldwalder-60.txt" where 60 means volume 60'
    else: 
      user = m.group(1)
      vol = m.group(2)
      if user == args.user:
        print "Parsing spans for user %s, volume %s" % (user, vol)
        spantext = open(args.spans + "/" + spanfile).read()
        splitspans = re.split(r"\|", spantext)
        spans = []
        for span in splitspans:
          spanparts = re.split(r"\$", span)
          if spanparts[0] == 'place':
            spans.append([int(spanparts[1]), int(spanparts[2])])
        volume_spans[vol] = spans

if not os.path.exists(args.output):
  os.makedirs(args.output)

if not args.remove:
  read_volume_spans()

for fn in os.listdir(args.text):
  m = re.match("(?:.*/)?0*([1-9][0-9]*).txt", fn)
  if not m:
    print "Unable to parse filename: %s" % fn
    print "File name format should be e.g. 001.txt where 001 means volume 1"
  else:
    voltext = open(os.path.join(args.text, fn)).read()
    vol = m.group(1)
    if vol in volume_spans:
      print "Adding toponyms to text for volume %s" % vol
      spans = sorted(volume_spans[vol], key=lambda x:-x[0])
      for span in spans:
        voltext = (voltext[0:span[0]] + "<toponym>" + voltext[span[0]:span[1]] +
            "</toponym>" + voltext[span[1]:])
    else:
      print "No spans for text for volume %s, copying" % vol
    open(os.path.join(args.output, fn), "w").write(voltext)
