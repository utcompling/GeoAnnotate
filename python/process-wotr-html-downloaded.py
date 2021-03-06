#!/usr/bin/python

import argparse
import os
import re

# This is for processing War of the Rebellion HTML as downloaded using
# wget, where there's a separate file for each page and each volume is
# in its own directory, e.g. a directory '001' for volume 1, with files
# '0100' through '0199' for the respective pages (and possibly others,
# which will be ignored).
parser = argparse.ArgumentParser(description='Process War of The Rebellion HTML')
parser.add_argument('dirs', nargs='*',
                   help='directories to process')

args = parser.parse_args()
for dir in args.dirs:
  outhtml = open(dir + ".html", "w")
  outtext = open(dir + ".txt", "w")
  for file in os.listdir(dir):
    #if re.match("01[0-9][0-9]$", file):
    if re.match("[0-9][0-9][0-9][0-9]$", file):
      start = False
      title = ""
      lines = []
      for line in open(dir + "/" + file, "r"):
        m = re.match('.*<h1 class="title" id="page-title">(.*)</h1>', line)
        if m:
          title = m.group(1).replace('"', '&quot;')
        if re.match('.*</div>', line):
          start = False
        if start:
          lines.append(line)
        if re.match('.*<div class="field-item ', line):
          start = True
      html = ''.join(lines)
      text = html
      html = '<span title="%s">\n%s</span>\n' % (title, html)
      text = text.replace("</p>\n<p>\n", "\n")
      text = text.replace("<p>", "")
      text = text.replace("</p>", "")
      text = text.replace("<br />", "\n")
      text = text.replace("<br>", "\n")
      text = re.sub("<[^>]*>", "", text)
      if text.endswith("\n\n"):
        text = text[0:-1]
      outhtml.write(html)
      outtext.write(text)
      outtext.write("PAGEBREAK\n")
  outtext.close()
  outhtml.close()

