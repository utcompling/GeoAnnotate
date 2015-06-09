#!/usr/bin/env python

import argparse
import re
import os
import bz2

# This is used to generate a raw input file for Mallet LDA. Example of how
# to do this:
#
# ./generate-lda --input wotr-spans.may-18-715pm --output wotr.may-18-715pm.combined.input
#
# This needs to be further processed to produce a binary "cooked" file that
# is actually used by Mallet. Example of how to do that:
#
# ~/devel/mallet-2.0.7/bin/mallet import-file --input wotr.may-18-715pm.combined.input --output wotr.may-18-715pm.mallet --keep-sequence --remove-stopwords

parser = argparse.ArgumentParser(description='Generate LDA data for use with Mallet for some or all of given spans')
parser.add_argument('--filter-regex',
    help="Regex to filter spans.")
parser.add_argument('--input', required=True,
    help="Directory containing input files, or TextDB data file.")
parser.add_argument('--output',
    help="""File to output LDA data to. This argument can be omitted to just
get statistics on the number of spans.""")
parser.add_argument('--textdb', action="store_true",
    help="File in '--input' is a TextDB data file.")

args = parser.parse_args()

def process_wotr_files(of):
  total_no_handled_spans = 0
  total_no_spans = 0
  for fn in os.listdir(args.input):
    print fn,
    text = open(os.path.join(args.input, fn)).read()
    num_handled_spans = 0
    num_spans = 0
    for span in re.finditer(r'^-----+ BEGIN SPAN -----+$(.*?)^-----+ END SPAN -----+$', text, re.M | re.S):
      spantext = span.group(1)
      if not args.filter_regex or re.search(args.filter_regex, spantext):
        if of:
          # Index spans using 1-based index
          spanno = num_spans + 1
          of.write("%s.%s span %s\n" % (fn, spanno, spantext.strip().replace("\n", " ")))
        num_handled_spans += 1
      num_spans += 1
    print "%s handled-spans %s total-spans" % (num_handled_spans, num_spans)
    total_no_handled_spans += num_handled_spans
    total_no_spans += num_spans
  print "ALL %s handled-spans %s total-spans" % (
      total_no_handled_spans, total_no_spans)

def process_textdb(of):
  schemafn = re.sub(r'^(.*)\.data\.txt(\.bz2)?$', r'\1.schema.txt', args.input)
  with open(schemafn) as schemafile:
    schemafields = next(schemafile).strip()
  schemafields = schemafields.split("\t")
  titlefield = schemafields.index('title')
  textfield = schemafields.index('text')

  if args.input.endswith(".bz2"):
    spanfile = bz2.BZ2File(args.input)
  else:
    spanfile = open(args.input)

  num_handled_spans = 0
  num_spans = 0
  for line in spanfile:
    if line.endswith('\n'):
      line = line[0:-1]
    fields = re.split("\t", line)
    spantext = (fields[textfield].replace("%0C", "\f").replace("%0D", "\r").
        replace("%0A", "\n").replace("%09", "\t").replace("%25", "%"))
    title = fields[titlefield]
    if not args.filter_regex or re.search(args.filter_regex, spantext):
      if of:
        of.write("%s span %s\n" % (title, spantext.strip().replace("\n", " ")))
      num_handled_spans += 1
    num_spans += 1
  print "%s handled-spans %s total-spans" % (num_handled_spans, num_spans)

if args.textdb:
  procfn = process_textdb
else:
  procfn = process_wotr_files
if args.output:
  with open(args.output, "w") as of:
    procfn(of)
else:
  procfn(None)
