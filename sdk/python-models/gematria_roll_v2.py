#!/usr/bin/env python3
"""
GEMATRIA ROLLING SCRIPT v2 — SHEM HAMEPHORASH EDITION
======================================================
The 72 Names of God are derived from Exodus 14:19-21 using
a boustrophedon cipher:
  - Verse 19: written right-to-left (normal Hebrew)
  - Verse 20: REVERSED (left-to-right)
  - Verse 21: written right-to-left (normal Hebrew)
Each column of 3 letters = one of the 72 Names.

This script:
  1. Transliterates input across Greek, Latin, Hebrew
  2. Calculates gematria/isopsephy per layer
  3. Maps to the 72 Names via modular indexing & gematria matching
  4. Shows YHWH Tetragrammaton analysis
  5. Cross-references associated Psalms and angel names
  6. Performs deep Kabbalistic reduction

Usage: python3 gematria_roll_v2.py "your text here"
"""

import sys
import time
import math

# ============================================================
# ANSI COLORS
# ============================================================
CYAN    = '\033[96m'
YELLOW  = '\033[93m'
GREEN   = '\033[92m'
MAGENTA = '\033[95m'
RED     = '\033[91m'
WHITE   = '\033[97m'
BLUE    = '\033[94m'
BOLD    = '\033[1m'
DIM     = '\033[2m'
RESET   = '\033[0m'
ULINE   = '\033[4m'

# ============================================================
# THE TETRAGRAMMATON — YHWH / יהוה
# ============================================================
YHWH = 'יהוה'
YHWH_VALUE = 26  # Yod(10) + He(5) + Vav(6) + He(5)

YHWH_EXPANSIONS = {
    'Av':       {'name': 'עב (72)',  'spelling': 'יוד הי ויו הי',   'value': 72,  'world': 'Atzilut (Emanation)',   'element': 'Fire'},
    'Sag':      {'name': 'סג (63)',  'spelling': 'יוד הי ואו הי',   'value': 63,  'world': 'Briah (Creation)',      'element': 'Water'},
    'Mah':      {'name': 'מה (45)',  'spelling': 'יוד הא ואו הא',   'value': 45,  'world': 'Yetzirah (Formation)',  'element': 'Air'},
    'Ban':      {'name': 'בן (52)',  'spelling': 'יוד הה וו הה',    'value': 52,  'world': 'Assiah (Action)',        'element': 'Earth'},
}

# ============================================================
# EXODUS 14:19-21 — SOURCE OF THE 72 NAMES
# ============================================================
# Each verse has exactly 72 Hebrew letters (excluding spaces/punctuation)
# The boustrophedon method: v19 normal, v20 REVERSED, v21 normal

EXODUS_14_19 = "ויסע מלאך האלהים ההלך לפני מחנה ישראל וילך מאחריהם ויסע עמוד הענן מפניהם ויעמד מאחריהם"
EXODUS_14_20 = "ויבא בין מחנה מצרים ובין מחנה ישראל ויהי הענן והחשך ויאר את הלילה ולא קרב זה אל זה כל הלילה"
EXODUS_14_21 = "ויט משה את ידו על הים ויולך יהוה את הים ברוח קדים עזה כל הלילה וישם את הים לחרבה ויבקעו המים"

def strip_spaces(text):
    """Remove spaces and punctuation, keep only Hebrew letters."""
    return ''.join(ch for ch in text if '\u0590' <= ch <= '\u05FF')

# ============================================================
# THE 72 NAMES OF GOD — SHEM HAMEPHORASH
# ============================================================
# Each entry: (hebrew_3_letters, transliteration, meaning, angel_name, associated_psalm_number, psalm_verse)

SHEM_HAMEPHORASH = [
    # 1-8: Keter/Chesed quadrant
    ('והו', 'Vehu',     'God elevated above all',        'Vehuiah',     3,  'Ps 3:3 — YHWH, how many are my foes'),
    ('ילי', 'Yeli',     'God who hears cries',           'Jeliel',      22, 'Ps 22:19 — But You, YHWH, be not far'),
    ('סיט', 'Sit',      'God, hope of all creatures',    'Sitael',      91, 'Ps 91:2 — I say of YHWH, my refuge'),
    ('עלם', 'Alam',     'God hidden',                    'Elemiah',     6,  'Ps 6:4 — Return YHWH, rescue my soul'),
    ('מהש', 'Mahash',   'God who saves',                 'Mahasiah',    34, 'Ps 34:4 — I sought YHWH and He answered'),
    ('ללה', 'Lelah',    'God praiseworthy',              'Lelahel',     9,  'Ps 9:11 — Those who know Your Name trust'),
    ('אכא', 'Aka',      'God of patience',               'Achaiah',     103,'Ps 103:8 — YHWH is compassionate'),
    ('כהת', 'Kahat',    'God adorable',                  'Cahethel',    95, 'Ps 95:6 — Come, let us worship and bow'),

    # 9-16: Chokmah/Gevurah quadrant
    ('הזי', 'Hezi',     'God of mercy',                  'Haziel',      25, 'Ps 25:6 — Remember Your mercies, YHWH'),
    ('אלד', 'Alad',     'God of grace',                  'Aladiah',     33, 'Ps 33:22 — Your lovingkindness be upon us'),
    ('לאו', 'Lav',      'God exalted',                   'Lauviah I',   18, 'Ps 18:46 — YHWH lives, blessed be my Rock'),
    ('ההע', 'Haha',     'God the refuge',                'Hahaiah',     10, 'Ps 10:1 — Why, YHWH, do You stand far off'),
    ('יזל', 'Yezal',    'God glorified',                 'Iezalel',     98, 'Ps 98:4 — Shout to YHWH, all the earth'),
    ('מבה', 'Mebah',    'God eternal',                   'Mebahel',     9,  'Ps 9:9 — YHWH is a refuge for the oppressed'),
    ('הרי', 'Hari',     'God the creator',               'Hariel',      94, 'Ps 94:22 — YHWH has been my stronghold'),
    ('הקם', 'Hakam',    'God of the universe',           'Hekamiah',    88, 'Ps 88:1 — YHWH, God of my salvation'),

    # 17-24: Binah/Tiferet quadrant
    ('לאו', 'Lav',      'God admirable',                 'Lauviah II',  8,  'Ps 8:1 — YHWH, our Lord, how majestic'),
    ('כלי', 'Kali',     'God prompt to help',            'Caliel',      35, 'Ps 35:24 — Vindicate me, YHWH my God'),
    ('לוו', 'Luv',      'God praised',                   'Leuviah',     40, 'Ps 40:1 — I waited patiently for YHWH'),
    ('פהל', 'Pahal',    'God the redeemer',              'Pahaliah',    120,'Ps 120:1-2 — I called to YHWH in distress'),
    ('נלך', 'Nelak',    'God the only one',              'Nelchael',    31, 'Ps 31:14 — I trust in You, YHWH'),
    ('ייי', 'Yeyay',    'God\'s right hand',             'Yeiayel',     121,'Ps 121:5 — YHWH is your guardian'),
    ('מלה', 'Melah',    'God who delivers from evil',    'Melahel',     121,'Ps 121:8 — YHWH guards your going out'),
    ('חהו', 'Chahav',   'God the good in Himself',       'Haheuiah',    33, 'Ps 33:18 — The eye of YHWH is on those'),

    # 25-32: Chesed/Netzach quadrant
    ('נתה', 'Natah',    'God of wonders',                'Nith-Haiah',  9,  'Ps 9:1 — I will praise You YHWH'),
    ('האא', 'Haaa',     'God of wisdom',                 'Haaiah',      119,'Ps 119:145 — I call with all my heart'),
    ('ירת', 'Yerat',    'God punisher of evil',          'Yerathel',    140,'Ps 140:1 — Rescue me, YHWH, from evil'),
    ('שאה', 'Shaah',    'God who gives joy',             'Seheiah',     71, 'Ps 71:12 — God, be not far from me'),
    ('ריי', 'Reyay',    'God against the impious',       'Reiyel',      54, 'Ps 54:4 — Behold, God is my helper'),
    ('אום', 'Aom',      'God of patience',               'Omael',       71, 'Ps 71:5 — You are my hope, O Lord YHWH'),
    ('לכב', 'Lekav',    'God inspiring',                 'Lecabel',     71, 'Ps 71:16 — I will come in the strength'),
    ('ושר', 'Vashar',   'God the just',                  'Vasariah',    33, 'Ps 33:4 — The word of YHWH is right'),

    # 33-40: Gevurah/Hod quadrant
    ('יחו', 'Yechav',   'God who knows all',             'Yehuiah',     94, 'Ps 94:11 — YHWH knows the thoughts'),
    ('להח', 'Lahach',   'God the merciful',              'Lehahiah',    131,'Ps 131:3 — Israel, hope in YHWH'),
    ('כוק', 'Kavak',    'God who gives joy',             'Chavaquiah',  116,'Ps 116:1 — I love YHWH because He hears'),
    ('מנד', 'Menad',    'God the honorable',             'Menadel',     26, 'Ps 26:8 — YHWH, I love the house'),
    ('אני', 'Ani',      'God of virtues',                'Aniel',       80, 'Ps 80:3 — God, restore us'),
    ('חעם', 'Chaam',    'God of the universe',           'Haamiah',     91, 'Ps 91:9 — Because you made YHWH your dwelling'),
    ('רהע', 'Rahaa',    'God who pardons sinners',       'Rehael',      30, 'Ps 30:10 — Hear, YHWH, and be gracious'),
    ('ייז', 'Yeyaz',    'God who makes joy',             'Ieiazel',     88, 'Ps 88:14 — Why, YHWH, do you reject me'),

    # 41-48: Tiferet/Yesod quadrant
    ('ההה', 'Hahah',    'God in three persons',          'Hahahel',     120,'Ps 120:2 — YHWH, deliver my soul'),
    ('מיכ', 'Mik',      'God, house of the virtuous',    'Mikael',      121,'Ps 121:7 — YHWH will keep you from harm'),
    ('וול', 'Veval',    'God the dominator',             'Veuliah',     88, 'Ps 88:13 — I cry to You YHWH'),
    ('ילה', 'Yelah',    'God who hears generations',     'Yelahiah',    119,'Ps 119:108 — Accept my freewill offerings'),
    ('סאל', 'Saal',     'God mover of all things',       'Sealiah',     94, 'Ps 94:18 — When I said my foot slips'),
    ('ערי', 'Ari',      'God the revealer',              'Ariel',       145,'Ps 145:9 — YHWH is good to all'),
    ('עשל', 'Ashal',    'God the just judge',            'Asaliah',     104,'Ps 104:24 — How many are Your works YHWH'),
    ('מיה', 'Miyah',    'God the good father',           'Mihael',      98, 'Ps 98:2 — YHWH has made known His salvation'),

    # 49-56: Netzach/Malkhut quadrant
    ('והו', 'Vehu',     'God the great and exalted',     'Vehuel',      145,'Ps 145:3 — Great is YHWH and praiseworthy'),
    ('דני', 'Dani',     'God the merciful judge',        'Daniel',      103,'Ps 103:8 — YHWH is compassionate'),
    ('החש', 'Hachash',  'God the hidden',                'Hahasiah',    104,'Ps 104:31 — The glory of YHWH endures'),
    ('עמם', 'Amam',     'God, beauty over all',          'Imamiah',     7,  'Ps 7:17 — I will praise YHWH'),
    ('ננא', 'Nana',     'God who humbles the proud',     'Nanael',      119,'Ps 119:75 — I know YHWH your judgments'),
    ('נית', 'Nit',      'God, king of heaven',           'Nithael',     103,'Ps 103:19 — YHWH established His throne'),
    ('מבה', 'Mebah',    'God eternal',                   'Mebahiah',    102,'Ps 102:12 — You, YHWH, sit enthroned'),
    ('פוי', 'Poy',      'God who sustains all',          'Poyel',       145,'Ps 145:14 — YHWH upholds all who fall'),

    # 57-64: Hod quadrant
    ('נמם', 'Nemam',    'God praiseworthy',              'Nemamiah',    115,'Ps 115:11 — You who fear YHWH, trust'),
    ('ייל', 'Yeyel',    'God who hears sighs',           'Yeialel',     6,  'Ps 6:3 — Be gracious to me YHWH'),
    ('הרח', 'Harach',   'God who knows all',             'Harahel',     113,'Ps 113:3 — From rising to setting sun'),
    ('מצר', 'Matzar',   'God the just deliverer',        'Mitzrael',    145,'Ps 145:17 — YHWH is righteous in all'),
    ('ומב', 'Vamab',    'God above all things',          'Umabel',      113,'Ps 113:2 — Blessed be the Name of YHWH'),
    ('יהה', 'Yahah',    'God the supreme being',         'Iahhel',      119,'Ps 119:159 — See how I love Your precepts'),
    ('ענו', 'Anav',     'God of delights',               'Anauel',      100,'Ps 100:2 — Serve YHWH with gladness'),
    ('מחי', 'Mechi',    'God who vivifies',              'Mehiel',      33, 'Ps 33:18 — The eye of YHWH'),

    # 65-72: Yesod/Malkhut quadrant
    ('דמב', 'Damab',    'God over the humble',           'Damabiah',    90, 'Ps 90:13 — Return YHWH! How long?'),
    ('מנק', 'Manak',    'God who nourishes all',         'Manakel',     38, 'Ps 38:21 — Do not forsake me YHWH'),
    ('איע', 'Aya',      'God of delights',               'Eyael',       37, 'Ps 37:4 — Delight yourself in YHWH'),
    ('חבו', 'Chabav',   'God the generous giver',        'Habuhiah',    106,'Ps 106:1 — Give thanks to YHWH'),
    ('ראה', 'Raah',     'God who sees all',              'Rochel',      16, 'Ps 16:5 — YHWH is my chosen portion'),
    ('יבם', 'Yabam',    'God producer of all',           'Jabamiah',    1,  'Ps 1:6 — YHWH knows the way'),
    ('היי', 'Hayay',    'God master of the universe',    'Haiyael',     109,'Ps 109:30 — I will greatly praise YHWH'),
    ('מום', 'Mum',      'God the end of the universe',   'Mumiah',      116,'Ps 116:7 — Return to your rest, my soul'),
]

# ============================================================
# TRANSLITERATION & GEMATRIA TABLES
# ============================================================

ENG_TO_GREEK = {
    'a': 'α', 'b': 'β', 'c': 'κ', 'd': 'δ', 'e': 'ε',
    'f': 'φ', 'g': 'γ', 'h': 'η', 'i': 'ι', 'j': 'ξ',
    'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'o': 'ο',
    'p': 'π', 'q': 'κ', 'r': 'ρ', 's': 'σ', 't': 'τ',
    'u': 'υ', 'v': 'β', 'w': 'ω', 'x': 'ξ', 'y': 'ψ',
    'z': 'ζ', ' ': ' ',
    'th': 'θ', 'ph': 'φ', 'ch': 'χ', 'ps': 'ψ',
}

ENG_TO_LATIN = {
    'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e',
    'f': 'f', 'g': 'g', 'h': 'h', 'i': 'i', 'j': 'i',
    'k': 'c', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o',
    'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't',
    'u': 'v', 'v': 'v', 'w': 'vv', 'x': 'x', 'y': 'y',
    'z': 'z', ' ': ' ',
}

ENG_TO_HEBREW = {
    'a': 'א', 'b': 'ב', 'c': 'כ', 'd': 'ד', 'e': 'א',
    'f': 'פ', 'g': 'ג', 'h': 'ה', 'i': 'י', 'j': 'ג',
    'k': 'כ', 'l': 'ל', 'm': 'מ', 'n': 'נ', 'o': 'ע',
    'p': 'פ', 'q': 'ק', 'r': 'ר', 's': 'ס', 't': 'ת',
    'u': 'ו', 'v': 'ו', 'w': 'ו', 'x': 'קס', 'y': 'י',
    'z': 'ז', ' ': ' ',
    'sh': 'ש', 'ch': 'ח', 'th': 'ת', 'tz': 'צ', 'ts': 'צ',
}

GREEK_VALUES = {
    'α': 1, 'β': 2, 'γ': 3, 'δ': 4, 'ε': 5,
    'ζ': 7, 'η': 8, 'θ': 9, 'ι': 10, 'κ': 20,
    'λ': 30, 'μ': 40, 'ν': 50, 'ξ': 60, 'ο': 70,
    'π': 80, 'ρ': 100, 'σ': 200, 'τ': 300, 'υ': 400,
    'φ': 500, 'χ': 600, 'ψ': 700, 'ω': 800,
    'ς': 200,
}

HEBREW_VALUES = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
    'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60,
    'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400,
    'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
}

LATIN_VALUES = {chr(i): i - 96 for i in range(97, 123)}

# Sephirot with expanded info
SEPHIROT = {
    1: {'name': 'Keter',    'english': 'Crown',        'color': WHITE,   'body': 'Above head',      'planet': 'Primum Mobile'},
    2: {'name': 'Chokmah',  'english': 'Wisdom',       'color': CYAN,    'body': 'Right brain',     'planet': 'Zodiac/Stars'},
    3: {'name': 'Binah',    'english': 'Understanding','color': MAGENTA, 'body': 'Left brain',      'planet': 'Saturn'},
    4: {'name': 'Chesed',   'english': 'Mercy',        'color': BLUE,    'body': 'Right arm',       'planet': 'Jupiter'},
    5: {'name': 'Gevurah',  'english': 'Severity',     'color': RED,     'body': 'Left arm',        'planet': 'Mars'},
    6: {'name': 'Tiferet',  'english': 'Beauty',       'color': YELLOW,  'body': 'Heart/torso',     'planet': 'Sun'},
    7: {'name': 'Netzach',  'english': 'Victory',      'color': GREEN,   'body': 'Right leg',       'planet': 'Venus'},
    8: {'name': 'Hod',      'english': 'Splendor',     'color': YELLOW,  'body': 'Left leg',        'planet': 'Mercury'},
    9: {'name': 'Yesod',    'english': 'Foundation',   'color': MAGENTA, 'body': 'Reproductive',    'planet': 'Moon'},
}

# ============================================================
# CORE FUNCTIONS
# ============================================================

def transliterate(text, mapping):
    text = text.lower()
    result = []
    i = 0
    while i < len(text):
        if i + 1 < len(text):
            digraph = text[i:i+2]
            if digraph in mapping:
                result.append(mapping[digraph])
                i += 2
                continue
        ch = text[i]
        if ch in mapping:
            result.append(mapping[ch])
        else:
            result.append(ch)
        i += 1
    return ''.join(result)


def calc_gematria(text, values):
    return sum(values.get(ch, 0) for ch in text)


def reduce_to_single(n):
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n


def name_gematria(hebrew_3):
    """Calculate gematria of a 3-letter Name of God."""
    return sum(HEBREW_VALUES.get(ch, 0) for ch in hebrew_3)


def derive_72_names_from_exodus():
    """
    Derive the 72 Names from Exodus 14:19-21 using
    the boustrophedon method.
    """
    v19 = strip_spaces(EXODUS_14_19)
    v20 = strip_spaces(EXODUS_14_20)
    v21 = strip_spaces(EXODUS_14_21)

    # Verse 20 is REVERSED (boustrophedon)
    v20_reversed = v20[::-1]

    names = []
    for i in range(72):
        if i < len(v19) and i < len(v20_reversed) and i < len(v21):
            name = v19[i] + v20_reversed[i] + v21[i]
            names.append(name)
    return names, v19, v20_reversed, v21


def find_matching_names(value, method='modular'):
    """Find Names of God that relate to the input gematria value."""
    matches = []

    # Method 1: Modular index (value mod 72)
    mod_idx = value % 72
    if mod_idx == 0:
        mod_idx = 72
    if 1 <= mod_idx <= 72:
        matches.append(('modular', mod_idx, SHEM_HAMEPHORASH[mod_idx - 1]))

    # Method 2: Direct gematria match
    for i, (heb, trans, meaning, angel, psalm, verse) in enumerate(SHEM_HAMEPHORASH):
        nv = name_gematria(heb)
        if nv == value:
            matches.append(('exact', i + 1, SHEM_HAMEPHORASH[i]))
        elif nv == reduce_to_single(value):
            matches.append(('reduced', i + 1, SHEM_HAMEPHORASH[i]))

    # Method 3: YHWH division (value / 26 proximity)
    yhwh_quotient = value / YHWH_VALUE
    yhwh_nearest = round(yhwh_quotient)
    if 1 <= yhwh_nearest <= 72 and abs(yhwh_quotient - yhwh_nearest) < 0.5:
        matches.append(('yhwh_division', yhwh_nearest, SHEM_HAMEPHORASH[yhwh_nearest - 1]))

    return matches


def rolling_print(text, delay=0.02, color=''):
    for ch in text:
        sys.stdout.write(f"{color}{ch}{RESET}")
        sys.stdout.flush()
        time.sleep(delay)
    print()


def sep(char='─', width=70, color=DIM):
    print(f"{color}{char * width}{RESET}")


def print_bar(value, reduced, label, color, max_val=3000):
    bar_len = min(int(value / max_val * 50), 50)
    bar = '█' * bar_len + '░' * (50 - bar_len)
    print(f"  {color}{label:<12}{RESET} {DIM}│{RESET} {color}{bar}{RESET} {BOLD}{value}{RESET} → {color}{reduced}{RESET}")


# ============================================================
# MAIN EXECUTION
# ============================================================

def run(instruction):
    print()
    sep('═', 70, CYAN)
    rolling_print("  ⟁ SHEM HAMEPHORASH — GEMATRIA ROLLING SCRIPT v2 ⟁", delay=0.015, color=f"{BOLD}{CYAN}")
    sep('═', 70, CYAN)

    # ─── Source: Exodus 14:19-21 ───
    print()
    print(f"  {BOLD}{WHITE}THE SOURCE: EXODUS 14:19-21{RESET}")
    print(f"  {DIM}Three verses × 72 letters each = 216 letters{RESET}")
    print(f"  {DIM}Boustrophedon: v19 normal, v20 REVERSED, v21 normal{RESET}")
    print()

    derived_names, v19_stripped, v20_rev, v21_stripped = derive_72_names_from_exodus()

    # Show the three verses with direction indicators
    print(f"  {GREEN}v19 →  {v19_stripped[:36]}{RESET}")
    print(f"  {GREEN}       {v19_stripped[36:]}{RESET}")
    print(f"  {RED}v20 ←  {v20_rev[:36]}{RESET}  {DIM}(reversed){RESET}")
    print(f"  {RED}       {v20_rev[36:]}{RESET}")
    print(f"  {GREEN}v21 →  {v21_stripped[:36]}{RESET}")
    print(f"  {GREEN}       {v21_stripped[36:]}{RESET}")

    print()
    sep()

    # ─── YHWH / Tetragrammaton ───
    print()
    print(f"  {BOLD}{WHITE}THE TETRAGRAMMATON — {YHWH} — YHWH = {YHWH_VALUE}{RESET}")
    print()
    for key, exp in YHWH_EXPANSIONS.items():
        world_color = CYAN if exp['element'] == 'Fire' else BLUE if exp['element'] == 'Water' else GREEN if exp['element'] == 'Air' else YELLOW
        print(f"  {world_color}{key:<5}{RESET} {exp['name']:<8} = {BOLD}{exp['value']}{RESET}  {DIM}│{RESET} {exp['spelling']}")
        print(f"        {DIM}{exp['world']} — {exp['element']}{RESET}")
    print()
    print(f"  {DIM}72 + 63 + 45 + 52 = 232 → {reduce_to_single(232)}{RESET}")
    print(f"  {DIM}Note: YHWH-Av (עב) = 72, the number of Names{RESET}")

    print()
    sep('═', 70, WHITE)

    # ─── Input Processing ───
    print()
    print(f"  {BOLD}{WHITE}INPUT:{RESET} {BOLD}{instruction}{RESET}")
    print()
    sep()

    # ─── Layer 1: Greek (L→R) ───
    greek = transliterate(instruction, ENG_TO_GREEK)
    greek_val = calc_gematria(greek, GREEK_VALUES)
    greek_red = reduce_to_single(greek_val)

    print()
    print(f"  {CYAN}LAYER 1 │ ΕΛΛΗΝΙΚΑ │ Greek (L→R) — Isopsephy{RESET}")
    rolling_print(f"  {greek}", delay=0.03, color=CYAN)
    print(f"  {DIM}Value: {greek_val} → {greek_red}{RESET}")

    # ─── Layer 2: Latin (L→R) ───
    latin = transliterate(instruction, ENG_TO_LATIN).upper()
    latin_val = calc_gematria(latin.lower(), LATIN_VALUES)
    latin_red = reduce_to_single(latin_val)

    print()
    print(f"  {YELLOW}LAYER 2 │ LATINA │ Latin (L→R) — Ordinal{RESET}")
    rolling_print(f"  {latin}", delay=0.03, color=YELLOW)
    print(f"  {DIM}Value: {latin_val} → {latin_red}{RESET}")

    # ─── Layer 3: Greek (R→L) ───
    greek_rtl = greek[::-1]
    print()
    print(f"  {GREEN}LAYER 3 │ ΑΡΧΑΪΚΑ │ Greek (R→L archaic) — Boustrophedon{RESET}")
    rolling_print(f"  {greek_rtl}", delay=0.03, color=GREEN)
    print(f"  {DIM}Value: {greek_val} → {greek_red} (mirror confirmed){RESET}")

    # ─── Layer 4: Hebrew (R→L) ───
    hebrew = transliterate(instruction, ENG_TO_HEBREW)
    hebrew_val = calc_gematria(hebrew, HEBREW_VALUES)
    hebrew_red = reduce_to_single(hebrew_val)
    hebrew_rtl = hebrew[::-1]

    print()
    print(f"  {MAGENTA}LAYER 4 │ עברית │ Hebrew (R→L) — Gematria{RESET}")
    rolling_print(f"  {hebrew_rtl}", delay=0.03, color=MAGENTA)
    print(f"  {DIM}Value: {hebrew_val} → {hebrew_red}{RESET}")

    # ─── Gematria Confirmation ───
    print()
    sep('═', 70, WHITE)
    print(f"  {BOLD}{WHITE}⟁ GEMATRIA CONFIRMATION ⟁{RESET}")
    sep('─', 70, DIM)
    print()

    max_v = max(greek_val, latin_val, hebrew_val, 1)
    print_bar(greek_val, greek_red, "Greek", CYAN, max_v)
    print_bar(latin_val, latin_red, "Latin", YELLOW, max_v)
    print_bar(greek_val, greek_red, "Greek(R)", GREEN, max_v)
    print_bar(hebrew_val, hebrew_red, "Hebrew", MAGENTA, max_v)

    print()

    # Cross-script alignment
    all_reduced = [greek_red, latin_red, greek_red, hebrew_red]
    unique = set(all_reduced)
    if len(unique) == 1:
        print(f"  {GREEN}{BOLD}✓ PERFECT ALIGNMENT — all layers → {all_reduced[0]}{RESET}")
    elif len(unique) == 2:
        print(f"  {YELLOW}{BOLD}◐ PARTIAL ALIGNMENT — {all_reduced}{RESET}")
    else:
        print(f"  {RED}{BOLD}✗ DIVERGENT — {all_reduced}{RESET}")

    total = greek_val + latin_val + hebrew_val
    total_red = reduce_to_single(total)
    print(f"  {DIM}Sum: {greek_val} + {latin_val} + {hebrew_val} = {total} → {total_red}{RESET}")

    # ─── Sephirot Mapping ───
    print()
    sep('═', 70, MAGENTA)
    print(f"  {BOLD}{MAGENTA}⟁ SEPHIROT MAPPING ⟁{RESET}")
    sep('─', 70, DIM)
    print()

    for val, label, color in [(greek_red, "Greek", CYAN), (latin_red, "Latin", YELLOW),
                               (hebrew_red, "Hebrew", MAGENTA), (total_red, "Grand", WHITE)]:
        if val in SEPHIROT:
            s = SEPHIROT[val]
            print(f"  {color}{label:<8}{RESET} → {s['color']}{BOLD}{s['name']}{RESET} ({s['english']})")
            print(f"           {DIM}Body: {s['body']} │ Planet: {s['planet']}{RESET}")

    # ─── 72 NAMES MATCHING ───
    print()
    sep('═', 70, YELLOW)
    print(f"  {BOLD}{YELLOW}⟁ SHEM HAMEPHORASH — 72 NAMES OF GOD ⟁{RESET}")
    sep('─', 70, DIM)
    print()

    # Check each gematria value against the 72 Names
    for val, label, color in [(hebrew_val, "Hebrew Gematria", MAGENTA),
                               (greek_val, "Greek Isopsephy", CYAN),
                               (total, "Grand Total", WHITE)]:
        matches = find_matching_names(val)
        if matches:
            print(f"  {color}{BOLD}{label} ({val}):{RESET}")
            seen = set()
            for method, idx, (heb, trans, meaning, angel, psalm_num, psalm_ref) in matches:
                if idx in seen:
                    continue
                seen.add(idx)
                nv = name_gematria(heb)
                angel_suffix = "el" if angel.endswith("el") or angel.endswith("ael") else "iah" if angel.endswith("iah") or angel.endswith("yah") else ""

                print(f"    {BOLD}#{idx:>2}{RESET} {MAGENTA}{heb}{RESET} ({trans})")
                print(f"        {DIM}Meaning:{RESET} {meaning}")
                print(f"        {DIM}Angel:{RESET} {angel}  {DIM}│ Name value:{RESET} {nv}")
                print(f"        {DIM}Psalm:{RESET} {psalm_ref}")
                print(f"        {DIM}Method:{RESET} {method}")
                print()
        else:
            print(f"  {color}{label} ({val}): {DIM}no direct Name match{RESET}")
            print()

    # ─── YHWH RELATIONSHIP ───
    print()
    sep('═', 70, GREEN)
    print(f"  {BOLD}{GREEN}⟁ YHWH RELATIONSHIP ANALYSIS ⟁{RESET}")
    sep('─', 70, DIM)
    print()

    for val, label, color in [(hebrew_val, "Hebrew", MAGENTA),
                               (greek_val, "Greek", CYAN),
                               (total, "Grand", WHITE)]:
        quotient = val / YHWH_VALUE
        remainder = val % YHWH_VALUE
        print(f"  {color}{label:<8}{RESET} {val} ÷ {YHWH_VALUE} (YHWH) = {BOLD}{quotient:.2f}{RESET}")
        print(f"           {DIM}Quotient: {int(val // YHWH_VALUE)} remainder {remainder}{RESET}")

        # Check against 4 YHWH expansions
        for key, exp in YHWH_EXPANSIONS.items():
            exp_quot = val / exp['value']
            if abs(exp_quot - round(exp_quot)) < 0.15:
                print(f"           {GREEN}≈ {int(round(exp_quot))} × {key} ({exp['value']}){RESET}")
        print()

    # ─── WORD-LEVEL GEMATRIA ───
    words = instruction.strip().split()
    if len(words) > 1:
        print()
        sep('═', 70, BLUE)
        print(f"  {BOLD}{BLUE}⟁ WORD-LEVEL ANALYSIS ⟁{RESET}")
        sep('─', 70, DIM)
        print()

        for word in words:
            w_heb = transliterate(word, ENG_TO_HEBREW)
            w_grk = transliterate(word, ENG_TO_GREEK)
            w_hv = calc_gematria(w_heb, HEBREW_VALUES)
            w_gv = calc_gematria(w_grk, GREEK_VALUES)
            w_hr = reduce_to_single(w_hv) if w_hv > 0 else 0
            w_gr = reduce_to_single(w_gv) if w_gv > 0 else 0

            name_idx = (w_hv % 72) if w_hv > 0 else 0
            if name_idx == 0 and w_hv > 0:
                name_idx = 72

            print(f"  {BOLD}{word}{RESET}")
            print(f"    Hebrew: {MAGENTA}{w_heb[::-1]}{RESET} = {w_hv} → {w_hr}", end='')
            if 1 <= name_idx <= 72:
                n = SHEM_HAMEPHORASH[name_idx - 1]
                print(f"  {DIM}│ Name #{name_idx}: {n[0]} ({n[1]}){RESET}")
            else:
                print()
            print(f"    Greek:  {CYAN}{w_grk}{RESET} = {w_gv} → {w_gr}")

            if w_hr in SEPHIROT:
                s = SEPHIROT[w_hr]
                print(f"    {DIM}Sephira: {s['name']} ({s['english']}){RESET}")
            print()

    # ─── BOUSTROPHEDON DERIVATION DEMO ───
    print()
    sep('═', 70, RED)
    print(f"  {BOLD}{RED}⟁ BOUSTROPHEDON DERIVATION (first 12 Names) ⟁{RESET}")
    print(f"  {DIM}Reading columns: v19[i] + v20_reversed[i] + v21[i]{RESET}")
    sep('─', 70, DIM)
    print()

    for i in range(min(12, len(derived_names))):
        dn = derived_names[i]
        stored = SHEM_HAMEPHORASH[i]
        nv = name_gematria(dn)
        match_mark = f"{GREEN}✓{RESET}" if dn == stored[0] else f"{YELLOW}≈{RESET}"

        v19_ch = v19_stripped[i] if i < len(v19_stripped) else '?'
        v20_ch = v20_rev[i] if i < len(v20_rev) else '?'
        v21_ch = v21_stripped[i] if i < len(v21_stripped) else '?'

        print(f"  {match_mark} #{i+1:>2}  {GREEN}{v19_ch}{RESET}{RED}{v20_ch}{RESET}{GREEN}{v21_ch}{RESET} = {MAGENTA}{BOLD}{dn}{RESET}  ({stored[1]:<10}) {DIM}= {nv} │ {stored[3]}{RESET}")

    print(f"\n  {DIM}... {len(derived_names)} Names derived from 216 sacred letters{RESET}")

    # ─── FINAL SEAL ───
    print()
    sep('═', 70, CYAN)
    grand_sephira = SEPHIROT.get(total_red, {})
    if grand_sephira:
        gs = grand_sephira
        print(f"  {BOLD}GRAND SEAL:{RESET} {gs['color']}{BOLD}{gs['name']}{RESET} ({gs['english']}) — {total} → {total_red}")
        print(f"  {DIM}{gs['body']} │ {gs['planet']}{RESET}")
    else:
        print(f"  {BOLD}GRAND SEAL:{RESET} {total} → {total_red}")

    print()
    print(f"  {DIM}\"Out of many, One.\" — The Names return to {YHWH}{RESET}")
    sep('═', 70, CYAN)
    print()


# ============================================================
if __name__ == '__main__':
    if len(sys.argv) > 1:
        instruction = ' '.join(sys.argv[1:])
    elif not sys.stdin.isatty():
        instruction = sys.stdin.read().strip()
    else:
        print(f"\n  {BOLD}Enter instruction:{RESET} ", end='')
        instruction = input().strip()

    if not instruction:
        print(f"  {RED}No instruction provided.{RESET}")
        sys.exit(1)

    run(instruction)
