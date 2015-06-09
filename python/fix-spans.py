#!/usr/bin/env python

import argparse
import re
import os
import text
import sys

parser = argparse.ArgumentParser(description='Offset all spans above a certain value by a certain amount.')
parser.add_argument('--start', type=int,
    help="Offset span values above this number.")
parser.add_argument('--offset', type=int,
    help="Offset span values by this amount.")
parser.add_argument('--file',
    help="File containing spans.")
parser.add_argument('--outfile',
    help="File to write containing spans.")

args = parser.parse_args()

def read_volume_spans():
  spantext = open(args.file).read()
  splitspans = re.split(r"\|", spantext)
  spans = []
  for span in splitspans:
    spanparts = re.split(r"\$", span)
    beg = int(spanparts[1])
    if beg >= args.start:
      beg += args.offset
      spanparts[1] = "%s" % beg
    end = int(spanparts[2])
    if end >= args.start:
      end += args.offset
      spanparts[2] = "%s" % end
    spans.append('$'.join(spanparts))
  combined_spans = '|'.join(spans)
  with open(args.outfile, "w") as f:
    f.write(combined_spans)

read_volume_spans()
