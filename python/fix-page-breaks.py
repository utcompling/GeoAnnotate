#!/usr/bin/python

import argparse
import re

parser = argparse.ArgumentParser(description='Fix page breaks in War of The Rebellion text')
parser.add_argument('files', nargs='*',
                   help='Files to process')

args = parser.parse_args()
for file in args.files:
  outfile = open(file + ".joined-pagebreak", "w")
  text = ''.join(open(file).readlines())
  pages = re.split("PAGEBREAK\n", text)
  # Remove empty pages
  pages = [x for x in pages if x]
  for i in xrange(0, len(pages) - 1):
    # Remove extraneous blank lines
    pages[i] = re.sub("\n\n\n+", "\n\n", pages[i])
    # Undo HTML entities
    pages[i] = re.sub("&amp;", "&", pages[i])
    pages[i] = re.sub("&lt;", "<", pages[i])
    pages[i] = re.sub("&gt;", ">", pages[i])
    # Do the following a second time to handle cases of
    # &amp;amp;, which are common
    pages[i] = re.sub("&amp;", "&", pages[i])
    m = re.match(r"^( *\[*CHAP\. [A-Z]+\.\]* *\n\n?)(.*)", pages[i], re.S)
    if m:
      pages[i] = m.group(2)
      print "Removed CHAP heading on page %s:\n[%s]\n" % (i, m.group(1))
    m = re.match("(.*?)(\n?(?: *[0-9]+|S) *(?:R R(?: *[-_VY]+ *[^\n]*)?|R *-+ *[^\n]*)\n)(.*)$", pages[i], re.S)
    if m:
      pages[i] = m.group(1) + m.group(3)
      print "Removed R R notation on page %s:\n[%s]\n" % (i, m.group(2))
    m = re.match(r"(.*?\n)(\n* *------+\n( *(?:[*+#@$|^\\/&~=>!?]|[abc] |[abc][A-Z])[^\n]*\n|\n)* *-------+\n+(?:[*+#@$|^\\/&~=>!?] *[A-Z][^\n]*\n|\n)*)$", pages[i], re.S)
    if m:
      pages[i] = m.group(1)
      print "Removed footnote on page %s:\n[%s]\n" % (i, m.group(2))
    m = re.match("(.*?\n)(\n*[*]?MAP[^\n]*\n+)$", pages[i], re.S)
    if m:
      pages[i] = m.group(1)
      print "Removed MAP notation on page %s:\n[%s]\n" % (i, m.group(2))
    while pages[i] and pages[i][-1] == "\n":
      pages[i] = pages[i][0:-1]
    if "\n" not in pages[i]:
      lastlinelen = len(pages[i])
    else:
      m = re.match(".*\n([^\n]*)$", pages[i], re.S)
      assert m
      lastlinelen = len(m.group(1))
    shortline = lastlinelen < 60
    join = False
    hyphenjoin = False
    if not pages[i]:
      continue
    if len(pages[i]) >= 2 and pages[i][-1] == '-' and pages[i][-2].islower():
      if shortline:
        msg = "PAGEBREAK SHORT-LINE HYPHEN, NOT JOINED"
      else:
        msg = "PAGEBREAK HYPHEN-JOINED"
        hyphenjoin = True
        join = True
    elif pages[i + 1] and pages[i + 1][0].islower():
      if shortline:
        msg = "PAGEBREAK SHORT-LINE NEXT PAGE STARTS LOWERCASE, NOT JOINED"
      else:
        msg = "PAGEBREAK NEXT PAGE STARTS LOWERCASE, JOINED"
        join = True
    elif len(pages[i]) >= 3 and pages[i][-1] == '.' and pages[i][-2].isupper() and pages[i][-3] in ['.', ' ']:
      if shortline:
        msg = "PAGEBREAK SHORT-LINE ENDS WITH ABBREVIATION PERIOD, NOT JOINED"
      else:
        msg = "PAGEBREAK ENDS ABBREV-PERIOD, JOINED"
        join = True
    elif pages[i][-1] == '.':
      msg = "PAGEBREAK ENDS PERIOD, NOT JOINED"
    elif len(pages[i]) >= 2 and pages[i][-1] == '*' and pages[i][-2] == '.':
      msg = "PAGEBREAK ENDS PERIOD STAR, NOT JOINED"
    elif len(pages[i]) >= 2 and pages[i][-1] == '"' and pages[i][-2] == '.':
      msg = "PAGEBREAK ENDS PERIOD QUOTE, NOT JOINED"
    elif pages[i][-1] == ':':
      msg = "PAGEBREAK ENDS COLON, NOT JOINED"
    elif pages[i][-1] == ',':
      if shortline:
        msg = "PAGEBREAK ENDS SHORT-LINE COMMA, NOT JOINED"
      else:
        msg = "PAGEBREAK ENDS COMMA, JOINED"
        join = True
    else:
      if shortline:
        msg = "PAGEBREAK ENDS SHORT-LINE OTHER, NOT JOINED"
      else:
        msg = "PAGEBREAK ENDS OTHER, JOINED"
        join = True

    print "Page %s: %s" % (i, msg)
    if hyphenjoin:
      outfile.write(pages[i][0:-1])
    elif join:
      outfile.write(pages[i] + " ")
    else:
      outfile.write(pages[i])
      outfile.write("\n\n")
    outfile.write("\n%s\n" % msg)

  outfile.close()

