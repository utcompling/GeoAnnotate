#!/usr/bin/env python

import argparse
import re
import os
import text
import sys

# Runs in one of three modes in conjunction with predicting spans of text
# in War of the Rebellion (WOTR).
#
# 1. Using '--train', generate Mallet training data. Read raw text of pages
#    100-199 from files in '--text' and corresponding annotated spans from
#    files in '--spans', and write Mallet training data to the file in
#    '--training-file'.
#
# 2. Using '--predict', generate features for the full WOTR text. Read raw
#    text of all pages from files in '--text' and write Mallet features to
#    the directory in '--predict-dir'.
#
# 3. Using '--predicted-spans', combine the Mallet predictions and raw text
#   to generate predicted spans. Read raw text of all pages from files in
#   '--text' and Mallet predictions from files in '--predictions' and
#   write predicted spans to files in '--predicted-spans-dir'.

parser = argparse.ArgumentParser(description='Generate features for finding article spans in War of The Rebellion text')
parser.add_argument('--simple-features', action='store_true',
    help="Skip features referring to lines other than the current one.")
parser.add_argument('--train', action='store_true', help="Generate Mallet training data.")
parser.add_argument('--spans',
    help="Directory containing spans for training data.")
parser.add_argument('--training-file',
    help="File to output containing training data.")
parser.add_argument('--predict-dir',
    help="Directory in which to output Mallet prediction data.")
parser.add_argument('--predict-suffix',
    default='.feats',
    help="Suffix to use for files containing Mallet prediction data.")
parser.add_argument('--predicted-spans-dir',
    help="Directory in which to output predicted spans.")
parser.add_argument('--predicted-spans-suffix',
    default='.predicted-spans',
    help="Suffix to use for files containing predicted spans.")
parser.add_argument('--debug', action='store_true',
    help="Output info to stdout to facilitate debugging feature generation.")
parser.add_argument('--text', required=True,
    help='Directory containing volume text files')
parser.add_argument('--predictions',
    help="Directory containing MALLET predictions")
parser.add_argument('--predict', action='store_true',
    help="Generate Mallet prediction data.")
parser.add_argument('--predicted-spans', action='store_true',
    help="Combine text with predictions to generate spans")

args = parser.parse_args()

def need(arg):
  if not getattr(args, arg):
    parser.error("Must specify argument --%s" % arg.replace('_', '-'))

if args.train:
  need('spans')
  need('training_file')
if args.predict:
  need('predict_dir')
if args.predicted_spans:
  need('predictions')
  need('predicted_spans_dir')

ranks = r"\b(Lieutenant|Lieut\.|First Lieutenant|Second Lieutenant|Brigadier|Brig\.|Captain|Capt\.|Major|Maj\.|Colonel|Col\.|General|Gen\.|Adjutant|Adjt\.|Commissioner|Com\.|Commissary|Secretary|Sec\.|Assistant|Asst\.|Surgeon|Surg\.|Chief|Provost|Prov\.|Judge|Acting|Actg\.|Agent|Inspector|Insp\.|Commanding|Comdg\.|Commander|Governor|Gov\.|President|Prest\.|Treasurer|State Treasurer|Chairman|Attorney|County Judge|Counsel|Quartermaster|Brevet|(A\. )?A\. A\. G\.)\b"
months = "January|February|March|April|May|June|July|August|September|October|November|December|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER"
date = r"\[?(%s)\]? ([1-9]|[123][0-9]), 186[0-9](\.|- *[0-9].*)" % months
ending_rank_re = r"(^|, )(%s)([, -].{0,70}?)\.\n" % ranks

def legal_position(i, offset, bp_length):
  return i + offset < bp_length and i + offset >= 0

#def check_punc(i, position, bp, punc):
#   #print i, bp[i + position]
#   return len(bp[i + position][1]) > 0 and bp[i + position][1][-1] == punc
#
#def check_period(i, position, bp):
#  return check_punc(i, position, bp, '.')
#
#def check_comma(i, position, bp):
#  return check_punc(i, position, bp, ',')
#
#def check_colon(i, position, bp):
#  return check_punc(i, position, bp, ':')

def first_token(i, position, bp):
  if len(bp[i + position][1]) > 0:
    tokens = text.tokenize(bp[i + position][1])
    #print tokens
    j = 0
    while j < len(tokens):
      if tokens[j] not in [u',', u'.', u':']:
        return tokens[j]
      j = j + 1
  return u"EMPTY"

def last_token(i, position, bp):
  if len(bp[i + position][1]) > 0:
    tokens = text.tokenize(bp[i + position][1])
    #print tokens
    j = len(tokens)-1
    while j > 0:
      if tokens[j] not in [u',', u'.', u':']:
        return tokens[j]
      j = j - 1
  return u"EMPTY"

def check_ending_rank(i, position, bp):
  # Check that we have a rank in a period-ending sentence, and we also
  # don't have a similar rank in the next two sentences.
  return (re.search(ending_rank_re, bp[i + position][1]) and
      not (i + position < len(bp) - 1 and re.search(ending_rank_re, bp[i + position + 1][1])) and
      not (i + position < len(bp) - 2 and re.search(ending_rank_re, bp[i + position + 2][1])))

def yield_flatten_features(features):
  for feat in features:
    if type(feat[0]) is list:
      for subfeat in feat:
        yield subfeat
    else:
      yield feat

def flatten_features(features):
  return [f for f in yield_flatten_features(features)]

def period_comma_colon(entry, skipbasic=False):
  pos, name, regex = entry
  feats = []
  if not skipbasic:
    feats.append([pos, name, regex + r"\n"])
  feats += [
      [pos, name + "-end_NonPunc", regex + r"[^.,:]\n"],
      [pos, name + "-end_Period", regex + r"\.\n"],
      [pos, name + "-end_Comma", regex + r",\n"],
      [pos, name + "-end_Colon", regex + r":\n"]
    ]
  return feats

def generate_features(paras, i, featdescs):
  features = []
  for featdesc in featdescs:
    pos, name, regex = featdesc
    match = re.search(regex, paras[i][1], re.M)
    match1last = i > 0 and re.search(regex, paras[i - 1][1], re.M)
    match2last = i > 1 and re.search(regex, paras[i - 2][1], re.M)
    match1next = i < len(paras) - 1 and re.search(regex, paras[i + 1][1], re.M)
    match2next = i < len(paras) - 2 and re.search(regex, paras[i + 2][1], re.M)
    if match:
      features.append(name)
    if not args.simple_features:
      if match1last:
        features.append(name + "-1")
      if match2last:
        features.append(name + "-2")
      if match1next:
        features.append(name + "+1")
      if match2next:
        features.append(name + "+2")
      if match or match1last:
        features.append(name + "-or-01")
      if match or match1next:
        features.append(name + "-or+01")
      if match or match1last or match2last:
        features.append(name + "-or-012")
      if match or match1next or match2next:
        features.append(name + "-or+012")
      if match and match1last:
        features.append(name + "-and-01")
      if match and match1next:
        features.append(name + "-and+01")
      if match and match1last and match2last:
        features.append(name + "-and-012")
      if match and match1next and match2next:
        features.append(name + "-and+012")
      if match or match1last or match1next:
        features.append(name + "-or-01+1")
      if match and match1last and match1next:
        features.append(name + "-and-01+1")
  return features
 
class FeatureVector:
  #feature_set elements = [position, feature_name, feature_function]

  #Simple Feature Functions return 0 or 1; none currently; previously
  #handled lines ending in period/comma/colon but that's now handled by
  #period_comma_colon()
  simple_feature_functions = flatten_features([
    [0, "rank", check_ending_rank],
    [1, "rank+1", check_ending_rank],
    [2, "rank+2", check_ending_rank],
    [-1, "rank-1", check_ending_rank],
    [-2, "rank-2", check_ending_rank],
  ])

  #Complex Feature Functions return a string rather than a 0 or 1
  complex_feature_functions = flatten_features([
  [0, "lastString", last_token],
  [-1, "lastString_prev", last_token],
  [0, "firstString", first_token],
  [-1, "firstString_prev", first_token],
  ])

  # Examples with or without a lowercase place in the middle:
  #
  # 20 AMITY PLACE, New York, July 19, 1863.
  # JOHNSON'S ISLAND, July 19, 1863.
  #
  # More examples (in this case, split into two lines):
  #
  # HEADQUARTERS,\nCape Girardeau, Mo., September 1, 1861.
  # HEADQUARTERS U. S. FORCES,\nCairo, Ill., September 2, 1861.
  # HDQRS. DISTRICT OF SOUTHEASTERN MISSOURI,\nCairo, September 3, 1861.
  # HEADQUARTERS EXPEDITION TO BELMONT,\nBelmont, Mo., September 2, 1861-6 p. m.
  # HEADQUARTERS MIDDLE DEPARTMENT, Numbers 197.\nBaltimore, MD., July 22, 1863.
  # HEADQUARTERS DEPARTMENT OF S. C., GA., AND FLA.,\nCharleston, S. C., July 23, 1863.
  #
  # Still to handle: Spread over two paras:
  #
  # U. S. GUNBOAT TAYLOR,
  #
  # Near Cairo, September 4, 1861.
  #
  cap_place = r"([0-9]+ )?[A-Z][A-Z.,' ]+"
  lc_place = r"[A-Z][a-z'.]+\.?( [A-Z][a-z'.]+)*"
  number_num = r"(Numbers?|Nos?\.) [0-9]+"
  opt_number_num = r"( %s[,.])?" % number_num
  lc_state_abbrev = r"((A-Z]\. )?[A-Z][A-Za-z]{1,5}\.|[A-Z]\. *[A-Z]\.)"

  re_feature_functions = flatten_features([
    [0, "PLACE", r"\b(HEADQUARTERS|HDQRS|ORDERS|OFFICE|DEPARTMENT|PRISON|CAMP|POST|FORT|HOTEL|GUN-?BOAT|STEAM-?BOAT|STEAMER|HOUSE|STATION|NEAR|BATTLE-FIELD|(IN|ON) (THE )?FIELD|ON BOARD)\b"],
    [0, "DATE", r"%s\n" % date],
    [0, "place-date", r"^%s,(%s[ \n]%s(, %s)?,)?[ \n]%s\n" % (cap_place, opt_number_num, lc_place, lc_state_abbrev, date)],
    [0, "Number", number_num],
    [0, "Report of", "Report of"],
    [0, "Indorsement", r"\[.*[Ii]ndorsement"],
    [0, "Inclosure", r"\[.*[Ii]nclosure"],
    [0, "salutation", r"(obedient servant|([Vv]ery|[Mm]ost) respectfully|Respectfully).*,"],
    [0, "i-salutation", "(I am|I have the honor).*(obedient servant|respectfully).*,"],
    [0, "with-respect-salutation", r"With .*respect,"],
    [0, "brackets", r"^\[.*\]"],
    [0, "start-brackets", r"^\["],
    #period_comma_colon([0, "rank", r"^(%s)[ -].{0,50}" % ranks]),
    period_comma_colon([0, "any", ""], skipbasic=True),
    period_comma_colon([0, "all-caps", r"^[A-Z][A-Z.,' ]+"]),
    period_comma_colon([0, "capsname", r"^([A-Z]+\.?|[A-Z]+\.? [A-Z]\.|[A-Z]\. ?[A-Z]\.) [A-Z]+"]),
    period_comma_colon([0, "begin-capsname", r"^([A-Z]+\.?|[A-Z]+\.? [A-Z]\.|[A-Z]\. ?[A-Z]\.) [A-Z]+.*"]),
    period_comma_colon([0, "shortline", r"^.{0,70}"]),
    period_comma_colon([0, "midline", r"^.{71,110}"]),
    period_comma_colon([0, "longline", r"^.{111,}"]),
  ])

  def __init__(self):
    pass

  def add_vol(self, biol_paras):
    i = 0
    vectors = []
    for bp in biol_paras:
      features = []
      for f in self.simple_feature_functions:
        if legal_position(i, f[0], len(biol_paras)) and f[-1](i, f[0], biol_paras):
          features.append(f[1])
      for f in self.complex_feature_functions:
        if legal_position(i, f[0], len(biol_paras)):
          result = f[-1](i, f[0], biol_paras)
        else:
          result = "NONE"
        features.append(f[1]+u'_'+result)
      features.extend(generate_features(biol_paras, i,
        self.re_feature_functions))
      vectors.append([biol_paras[i][0], biol_paras[i][1], features])
      i += 1
    #print vectors
    return vectors

  def write_mallet_train(self, outfile, vectorses):
    with open(outfile, 'w') as w:
      for vectors in vectorses:
        for v in vectors:
          w.write(u' '.join(v[-1]) + ' ' + v[0] + '\n')
        w.write('\n')

  def write_mallet_test(self, outfile, vectors):
    with open(outfile, 'w') as w:
      for v in vectors:
        w.write(u' '.join(v[-1]) + '\n')

volume_spans = {}
volume_user = {}
volume_io_spans = {}
volume_text = {}
volume_predictions = {}

def read_volume_text():
  for fn in os.listdir(args.text):
    m = re.match("(?:.*/)?0*([1-9][0-9]*).txt", fn)
    if not m:
      print "Unable to parse filename: %s" % fn
      print "File name format should be e.g. 001.txt where 001 means volume 1"
    else:
      volume_text[m.group(1)] = open(os.path.join(args.text, fn)).read()

# If true, ignore outside text that comes at the beginning and end of a file.
# This is generally a good idea because the spans may not include the whole
# file and we don't want unmarked spans to overly influence the
# computation of outside text.
ignore_bookending_outside_text = True

def read_volume_io_spans():
  for spanfile in os.listdir(args.spans):
    m = re.match("(.*)-([0-9]+).txt$", spanfile)
    if not m:
      print "Unable to parse span filename %s" % spanfile
      print 'File name format should be e.g. "Max Cadwalder-60.txt" where 60 means volume 60'
    else: 
      user = m.group(1)
      vol = m.group(2)
      print "Parsing spans for user %s, volume %s" % (user, vol)
      spantext = open(args.spans + "/" + spanfile).read()
      splitspans = re.split(r"\|", spantext)
      spans = []
      for span in splitspans:
        spanparts = re.split(r"\$", span)
        spans.append([int(spanparts[1]), int(spanparts[2])])
      if vol in volume_spans:
        num_existing_spans = len(volume_spans[vol])
        num_new_spans = len(spans)
        # Overwrite if more spans, or if same number of spans and new user
        # is Max or Ben, because we consider them more reliable than the
        # others
        if num_new_spans > num_existing_spans or (
            num_new_spans == num_existing_spans and
            user in ["Ben Wing", "Max Cadwalder"]):
          print "Volume %s: Overwriting existing user %s spans with spans from %s because more of them (%s > %s)" % (
              vol, volume_user[vol], user, num_new_spans,
              num_existing_spans)
        else:
          print "Volume %s: Not overwriting existing user %s spans with fewer spans from %s (%s < %s)" % (
              vol, volume_user[vol], user, num_new_spans,
              num_existing_spans)
          continue
      io_spans = []
      voltext = volume_text[vol]
      ind = 0
      for span in spans:
        if span[0] > ind and (ind != 0 or not ignore_bookending_outside_text):
          outside_text = voltext[ind:span[0]].strip()
          if outside_text:
            io_spans.append([False, outside_text])
        inside_text = voltext[span[0]:span[1]].strip()
        if inside_text:
          io_spans.append([True, inside_text])
        ind = span[1]
      if not ignore_bookending_outside_text:
        if ind < len(voltext):
          outside_text = voltext[ind:].strip()
          if outside_text:
            io_spans.append([False, outside_text])
      volume_user[vol] = user
      volume_spans[vol] = spans
      volume_io_spans[vol] = io_spans

def read_volume_predictions():
  for fn in os.listdir(args.predictions):
    m = re.match("(?:.*/)?0*([1-9][0-9]*).predictions", fn)
    if not m:
      print "Unable to parse filename: %s" % fn
      print "File name format should be e.g. 1.predictions for volume 1"
    else:
      volume_predictions[m.group(1)] = (
          [x.strip() for x in re.split("\n", open(os.path.join(args.predictions, fn)).read().strip())]
      )

def generate_paras(text):
  for para in re.split("\n\n", text.strip()):
    lines = [line.strip() for line in re.split("\n", para)]
    yield '\n'.join(lines) + '\n'

def get_biol_paras(vol):
  allparas = []
  for inside, text in volume_io_spans[vol]:
    paras = [para for para in generate_paras(text)]
    last_inside = 0
    for i in xrange(len(paras)):
      if not inside:
        last_inside += 1
        if last_inside < 3:
          allparas.append(["O", paras[i]])
      else:
        if i == 0:
          allparas.append(["B", paras[i]])
          last_inside = 0
        elif i == len(paras) - 1:
          allparas.append(["L", paras[i]])
          last_inside = 0
        else:
          allparas.append(["I", paras[i]])
          last_inside = 0
  return allparas

if args.train:
  read_volume_text()
  read_volume_io_spans()
  vols = sorted([vol for vol in volume_io_spans], key=lambda x:int(x))
  FV = FeatureVector()
  vectorses = []
  for vol in vols:
    print "Processing volume %s" % vol
    paras = get_biol_paras(vol)
    #allparas.append(paras)
    vectors = FV.add_vol(paras)
    if args.debug:
      for v in vectors:
        print v
    vectorses.append(vectors)
  FV.write_mallet_train(args.training_file, vectorses)

if args.predict:
  print "Begin Featurizing"
  read_volume_text()
  print "Done reading volume text"
  vols = sorted([vol for vol in volume_text], key=lambda x:int(x))
  if not os.path.exists(args.predict_dir):
    os.makedirs(args.predict_dir)
  for vol in vols:
    FV = FeatureVector()
    allparas = []
    for line in generate_paras(volume_text[vol]):
      allparas.append(['NONE', line])
    print vol
    vectors = FV.add_vol(allparas)
    if args.debug:
      for v in vectors:
        print v
    #print [para for para in generate_paras(volume_text[vol])][0]
    #print vectors[0]
    FV.write_mallet_test(args.predict_dir + "/" + str(vol) + args.predict_suffix, vectors)

if args.predicted_spans:
  print "Reading volume text"
  read_volume_text()
  print "Done reading volume text"
  print "Reading volume predictions"
  read_volume_predictions()
  print "Done reading volume predictions"
  vols = sorted([vol for vol in volume_predictions], key=lambda x:int(x))
  if not os.path.exists(args.predicted_spans_dir):
    os.makedirs(args.predicted_spans_dir)
  for vol in vols:
    allparas = [para for para in generate_paras(volume_text[vol])]
    predictions = volume_predictions[vol]
    if len(allparas) != len(predictions):
      print "WARNING: %s paragraphs but %s predictions, skipping volume %s" % (
          len(allparas), len(predictions), vol)
    else:
      with open(args.predicted_spans_dir + "/" + vol + args.predicted_spans_suffix, 'w') as w:
        first = True
        inside = False
        zipped = [[x, y] for x, y in zip(predictions, allparas)]

        # Try to manually adjust the span end to handle an addressee at the
        # end of the letter
        for i in xrange(len(zipped)):
          pred, para = zipped[i]
          if pred == "L":
            if i < len(zipped) - 2 and re.search(ending_rank_re, zipped[i + 2][1]):
              zipped[i][0] = "I"
              zipped[i+1][0] = "I"
              zipped[i+2][0] = "L"
              if i < len(zipped) - 3:
                if zipped[i+3][0] in ["I", "L"]:
                  zipped[i+3][0] = "B"
            elif i < len(zipped) - 1 and re.search(ending_rank_re, zipped[i + 1][1]):
              zipped[i][0] = "I"
              zipped[i+1][0] = "L"
              if i < len(zipped) - 2:
                if zipped[i+2][0] in ["I", "L"]:
                  zipped[i+2][0] = "B"

        inside = False
        for pred, para in zipped:
          if inside and (pred == "B" or pred == "O"):
            w.write("---------------- END SPAN ---------------\n")
            inside = False
          if not first:
            w.write("\n")
          first = False
          if pred == "B":
            w.write("---------------- BEGIN SPAN ---------------\n")
            inside = True
          w.write(para)
        if inside:
            w.write("---------------- END SPAN ---------------\n")

