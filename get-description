#!/usr/bin/python

import argparse
import re

parser = argparse.ArgumentParser(description='Locate descriptions from HTML files')
parser.add_argument('files', nargs='*',
                   help='Files to process')

args = parser.parse_args()
for file in args.files:
  outfile = open(file + ".desc", "w")
  for line in open(file):
    if line.startswith("<span "):
      outfile.write(re.sub(" +", " ", re.sub('^<span title="War of the Rebellion: Serial [0-9]+ Page [0-9]+ (.*?)[.]?">$', r'\1', line.strip())))
      break
  outfile.close()
