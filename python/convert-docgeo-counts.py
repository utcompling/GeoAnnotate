#!/usr/bin/python

import argparse
import re

# Convert a file of lines like this:
#
# apr-9-523pm 120
# apr-13-214am 183
# apr-14-816am 201
# apr-16-836pm 216
# apr-17-905pm 216
# apr-20-204am 439
# apr-20-211am 478
# ...
#
# Convert into day offsets. Output R data (offset, date, count).

parser = argparse.ArgumentParser(description='Convert docgeo counts from dates to date offsets')
parser.add_argument('--file', help='Input file')
parser.add_argument('--start', help='Starting offset', type=int, default=0)

args = parser.parse_args()

days = [('jan', 31), ('feb', 28), ('mar', 31), ('apr', 30), ('may', 31),
    ('jun', 30), ('jul', 31), ('aug', 31), ('sep', 30), ('oct', 31),
    ('nov', 30),  ('dec', 31)]
day_offsets = {}

sofar = 0
for month, length in days:
  day_offsets[month] = sofar
  sofar += length

# Convert time to fractional day offset
def parse_time(time):
  m = re.match(r'^([0-9]+?)([0-9][0-9])([ap])m$', time)
  if not m:
    print "Bad time: %s" % time
    return 0
  hour = int(m.group(1))
  minute = int(m.group(2))
  if hour == 12:
    hour = 0
  if m.group(3) == 'p':
    hour += 12
  return float(hour * 60 + minute) / (60 * 24)

print "offset count date"
for line in open(args.file):
  date, count = line.strip().split(" ")
  month, day, time = date.split("-")
  day_offset = day_offsets[month] + int(day) + parse_time(time) - args.start
  print "%s %s %s" % (day_offset, count, date)
