# -*- coding: utf-8 -*-
'''
commons.text

Utilities to tokenize text mostly by white-space and
puntuation
'''

import re
from sys import maxunicode


def _regex_or(*items):
    '''Combine RE patterns via the OR operator'''

    return u'(' + u'|'.join(items) + u')'

_ELLIPSE_SUB = re.compile(ur"\.{2,}", re.UNICODE)

def _make_tokens_re():
    '''Construct the core tokenizer regex'''

    html_chars = ur"&\w+;"  # separates the junk that comes from > and < and &
    numbers_commas = ur"[\-\$]?\d{1,3}(?:,\d{3})+" # like 2,000,000
    times = ur"\d?\d:\d{2}"  # like 2:12
    acronyms = ur"(?:\w{1}\.{1})+"  # like U.T.
    emails = ur"[\w\.\d]+@[\w\.\d]+\.[\w]+" #catch email addresses
    money = ur"-?\$?\d+[.]\d+%?" #Catch money numerics
    urls = ur"https?://[-_/~%\w\d\.]*[_/~\w\d]" #Catch url addresses
    slashes = ur"[\w]+(?:[/\-][\w]+)+" #Grammatical / -
    sideways_text_emoji = r">?[:;=]['\-D\)\]\(\[pPdoO/\*3\\]+"
    hearts = "<+/?3+" # <3
    possessive_mentions = ur"@\w+" #splits possessive off of @jimbob's
    possessive_hashtags = ur"#\w+" #splits possessive off of #tcot's
    tags_contractions = ur"[\w]+['‘’][\w]+" #don't split don't and can't and it's
    ellipses = ur"\.{3}"
    en_em_dash = ur"-{2,3}" #Catch en and em dashes
    punct = u"[\"“”‘’'\\.\\?!…,:;»«\(\)]" #punctuation to split on
    all_other = ur"[^\s]" #Split any other weird chars that may have been missed

    if maxunicode == 65535:

        tags_mentions = ur"[\w#@\d%$\u00B0]+" #Group all of these things together
        other_punct = ur"[\u2014\u2013]" #Catch unicode em/en dash

        emoji_block0 = ur'[\u2600-\u27BF]'
        emoji_block1 = ur'[\uD83C][\uDF00-\uDFFF]'
        emoji_block1b = ur'[\uD83D][\uDC00-\uDE4F]'
        emoji_block2 = ur'[\uD83D][\uDE80-\uDEFF]'

        #Load the expressions
        regex_str = _regex_or(
            html_chars,
            numbers_commas,
            times,
            money,
            acronyms,
            possessive_mentions,
            possessive_hashtags,
            tags_contractions,
            emails,
            urls,
            sideways_text_emoji,
            ellipses,
            en_em_dash,
            slashes,
            punct,
            tags_mentions,
            emoji_block0,
            emoji_block1,
            emoji_block1b,
            emoji_block2,
            hearts,
            other_punct,
            all_other
        )
    else:

        tags_mentions = ur"[\w#@\d%$\U000000B0]+" #Group all of these things together
        other_punct = ur"[\U00002014\U00002013]" #Catch unicode em/en dash

        emoji_block0 = ur'[\U00002600-\U000027BF]'
        emoji_block1 = ur'[\U0001f300-\U0001f64F]'
        emoji_block2 = ur'[\U0001f680-\U0001f6FF]'

        #Load the expressions
        regex_str = _regex_or(
            html_chars,
            numbers_commas,
            times,
            money,
            acronyms,
            possessive_mentions,
            possessive_hashtags,
            tags_contractions,
            emails,
            urls,
            sideways_text_emoji,
            ellipses,
            en_em_dash,
            slashes,
            punct,
            tags_mentions,
            emoji_block0,
            emoji_block1,
            emoji_block2,
            hearts,
            other_punct,
            all_other
        )
    return re.compile(regex_str, re.UNICODE)

_TOKENS_RE = _make_tokens_re()


def tokenize(text):
    '''Tokenize text into a list of tokens

    Args:
      text (unicode): The text to tokenize

    Returns:
      A list of unicode tokens in sequence
    '''
    toks = text.replace(u"\u2026", "...")
    #toks = text.replace(u"\\n", " ")
    toks = _ELLIPSE_SUB.sub('...', toks)
    return _TOKENS_RE.findall(toks)

