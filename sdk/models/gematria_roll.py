#!/usr/bin/env python3
"""
GEMATRIA ROLLING SCRIPT
========================
Takes English instruction → transliterates to Greek, Latin, Greek, Hebrew
Calculates gematria/isopsephy for each layer and confirms numerical alignment.

Boustrophedon-inspired: alternating script directions
  Layer 1: Greek (L→R, modern convention)
  Layer 2: Latin (L→R)
  Layer 3: Greek (R→L, archaic style)
  Layer 4: Hebrew (R→L, native direction)

Usage: python3 gematria_roll.py "your text here"
       or pipe: echo "your text" | python3 gematria_roll.py
"""

import sys
import time
import os

# ============================================================
# TRANSLITERATION MAPS
# ============================================================

# English phoneme → Greek letter mapping
ENG_TO_GREEK = {
    'a': 'α', 'b': 'β', 'c': 'κ', 'd': 'δ', 'e': 'ε',
    'f': 'φ', 'g': 'γ', 'h': 'η', 'i': 'ι', 'j': 'ξ',
    'k': 'κ', 'l': 'λ', 'm': 'μ', 'n': 'ν', 'o': 'ο',
    'p': 'π', 'q': 'κ', 'r': 'ρ', 's': 'σ', 't': 'τ',
    'u': 'υ', 'v': 'β', 'w': 'ω', 'x': 'ξ', 'y': 'ψ',
    'z': 'ζ', ' ': ' ',
    'th': 'θ', 'ph': 'φ', 'ch': 'χ', 'ps': 'ψ',
}

# English → Latin (classical orthography)
ENG_TO_LATIN = {
    'a': 'a', 'b': 'b', 'c': 'c', 'd': 'd', 'e': 'e',
    'f': 'f', 'g': 'g', 'h': 'h', 'i': 'i', 'j': 'i',
    'k': 'c', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o',
    'p': 'p', 'q': 'q', 'r': 'r', 's': 's', 't': 't',
    'u': 'v', 'v': 'v', 'w': 'vv', 'x': 'x', 'y': 'y',
    'z': 'z', ' ': ' ',
}

# English phoneme → Hebrew letter mapping
ENG_TO_HEBREW = {
    'a': 'א', 'b': 'ב', 'c': 'כ', 'd': 'ד', 'e': 'א',
    'f': 'פ', 'g': 'ג', 'h': 'ה', 'i': 'י', 'j': 'ג',
    'k': 'כ', 'l': 'ל', 'm': 'מ', 'n': 'נ', 'o': 'ע',
    'p': 'פ', 'q': 'ק', 'r': 'ר', 's': 'ס', 't': 'ת',
    'u': 'ו', 'v': 'ו', 'w': 'ו', 'x': 'קס', 'y': 'י',
    'z': 'ז', ' ': ' ',
    'sh': 'ש', 'ch': 'ח', 'th': 'ת', 'tz': 'צ', 'ts': 'צ',
}

# ============================================================
# GEMATRIA / ISOPSEPHY VALUE TABLES
# ============================================================

# Greek Isopsephy (classical values)
GREEK_VALUES = {
    'α': 1, 'β': 2, 'γ': 3, 'δ': 4, 'ε': 5,
    'ζ': 7, 'η': 8, 'θ': 9, 'ι': 10, 'κ': 20,
    'λ': 30, 'μ': 40, 'ν': 50, 'ξ': 60, 'ο': 70,
    'π': 80, 'ρ': 100, 'σ': 200, 'τ': 300, 'υ': 400,
    'φ': 500, 'χ': 600, 'ψ': 700, 'ω': 800,
    'ς': 200,  # final sigma same value
}

# Hebrew Gematria (standard/mispar hechrachi)
HEBREW_VALUES = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5,
    'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60,
    'ע': 70, 'פ': 80, 'צ': 90, 'ק': 100, 'ר': 200,
    'ש': 300, 'ת': 400,
    # Final forms (sofit) - same base values
    'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
}

# Latin ordinal values (A=1, B=2, ... Z=26)
LATIN_VALUES = {chr(i): i - 96 for i in range(97, 123)}

# ============================================================
# CORE FUNCTIONS
# ============================================================

def transliterate(text, mapping):
    """Transliterate text using a mapping, trying digraphs first."""
    text = text.lower()
    result = []
    i = 0
    while i < len(text):
        # Try digraph first
        if i + 1 < len(text):
            digraph = text[i:i+2]
            if digraph in mapping:
                result.append(mapping[digraph])
                i += 2
                continue
        # Single char
        ch = text[i]
        if ch in mapping:
            result.append(mapping[ch])
        else:
            result.append(ch)  # pass through unknown chars
        i += 1
    return ''.join(result)


def calc_gematria(text, values):
    """Calculate numerical value of text using given value table."""
    total = 0
    for ch in text:
        if ch in values:
            total += values[ch]
    return total


def reduce_to_single(n):
    """Reduce number to single digit (theosophic reduction)."""
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n


def reverse_text_words(text):
    """Reverse each word individually (boustrophedon per-word)."""
    return ' '.join(word[::-1] for word in text.split())


def reverse_full(text):
    """Full right-to-left reversal."""
    return text[::-1]


# ============================================================
# DISPLAY FUNCTIONS
# ============================================================

# ANSI color codes
CYAN = '\033[96m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
MAGENTA = '\033[95m'
RED = '\033[91m'
WHITE = '\033[97m'
BOLD = '\033[1m'
DIM = '\033[2m'
RESET = '\033[0m'
UNDERLINE = '\033[4m'

def rolling_print(text, delay=0.03, color=''):
    """Print text character by character with rolling effect."""
    for ch in text:
        sys.stdout.write(f"{color}{ch}{RESET}")
        sys.stdout.flush()
        time.sleep(delay)
    print()


def print_separator(char='─', width=60, color=DIM):
    """Print a separator line."""
    print(f"{color}{char * width}{RESET}")


def print_gematria_bar(value, reduced, label, color):
    """Print a visual gematria value bar."""
    bar_len = min(value // 10, 40)
    bar = '█' * bar_len + '░' * (40 - bar_len)
    print(f"  {color}{label:<12}{RESET} {DIM}│{RESET} {color}{bar}{RESET} {BOLD}{value}{RESET} → {color}{reduced}{RESET}")


def run(instruction):
    """Main execution: transliterate, display, and confirm via gematria."""

    # ── Header ──
    print()
    print_separator('═', 60, CYAN)
    rolling_print("  ⟁ GEMATRIA ROLLING SCRIPT ⟁", delay=0.02, color=f"{BOLD}{CYAN}")
    print_separator('═', 60, CYAN)
    print()

    # ── Input ──
    print(f"  {DIM}INPUT:{RESET} {WHITE}{BOLD}{instruction}{RESET}")
    print()
    print_separator()

    # ── Layer 1: GREEK (L→R) ──
    greek = transliterate(instruction, ENG_TO_GREEK)
    greek_val = calc_gematria(greek, GREEK_VALUES)
    greek_red = reduce_to_single(greek_val)

    print()
    print(f"  {CYAN}LAYER 1 │ ΕΛΛΗΝΙΚΑ │ Greek (L→R){RESET}")
    rolling_print(f"  {greek}", delay=0.04, color=CYAN)
    print(f"  {DIM}Isopsephy: {greek_val} → {greek_red}{RESET}")

    # ── Layer 2: LATIN (L→R) ──
    latin = transliterate(instruction, ENG_TO_LATIN).upper()
    latin_val = calc_gematria(latin.lower(), LATIN_VALUES)
    latin_red = reduce_to_single(latin_val)

    print()
    print(f"  {YELLOW}LAYER 2 │ LATINA │ Latin (L→R){RESET}")
    rolling_print(f"  {latin}", delay=0.04, color=YELLOW)
    print(f"  {DIM}Ordinal:   {latin_val} → {latin_red}{RESET}")

    # ── Layer 3: GREEK (R→L, archaic boustrophedon) ──
    greek_rtl = reverse_full(greek)
    # Same gematria value (addition is commutative)
    print()
    print(f"  {GREEN}LAYER 3 │ ΑΡΧΑΪΚΑ │ Greek (R→L archaic){RESET}")
    rolling_print(f"  {greek_rtl}", delay=0.04, color=GREEN)
    print(f"  {DIM}Isopsephy: {greek_val} → {greek_red} (mirror confirmed){RESET}")

    # ── Layer 4: HEBREW (R→L, native) ──
    hebrew = transliterate(instruction, ENG_TO_HEBREW)
    hebrew_val = calc_gematria(hebrew, HEBREW_VALUES)
    hebrew_red = reduce_to_single(hebrew_val)
    hebrew_rtl = reverse_full(hebrew)  # display R→L

    print()
    print(f"  {MAGENTA}LAYER 4 │ עברית │ Hebrew (R→L){RESET}")
    rolling_print(f"  {hebrew_rtl}", delay=0.04, color=MAGENTA)
    print(f"  {DIM}Gematria:  {hebrew_val} → {hebrew_red}{RESET}")

    # ── Gematria Confirmation Panel ──
    print()
    print_separator('═', 60, WHITE)
    print(f"  {BOLD}{WHITE}⟁ GEMATRIA CONFIRMATION ⟁{RESET}")
    print_separator('─', 60, DIM)
    print()

    print_gematria_bar(greek_val, greek_red, "Greek", CYAN)
    print_gematria_bar(latin_val, latin_red, "Latin", YELLOW)
    print_gematria_bar(greek_val, greek_red, "Greek(R)", GREEN)
    print_gematria_bar(hebrew_val, hebrew_red, "Hebrew", MAGENTA)

    print()
    print_separator('─', 60, DIM)

    # ── Cross-script analysis ──
    all_reduced = [greek_red, latin_red, greek_red, hebrew_red]
    unique_reduced = set(all_reduced)

    if len(unique_reduced) == 1:
        status = f"{GREEN}{BOLD}✓ PERFECT ALIGNMENT{RESET}"
        detail = f"All layers reduce to {all_reduced[0]}"
    elif len(unique_reduced) == 2:
        status = f"{YELLOW}{BOLD}◐ PARTIAL ALIGNMENT{RESET}"
        detail = f"Reduced values: {', '.join(str(v) for v in all_reduced)}"
    else:
        status = f"{RED}{BOLD}✗ DIVERGENT{RESET}"
        detail = f"Reduced values: {', '.join(str(v) for v in all_reduced)}"

    print(f"  Status:    {status}")
    print(f"  {DIM}{detail}{RESET}")

    # ── Sum confirmation ──
    total = greek_val + latin_val + hebrew_val
    total_red = reduce_to_single(total)
    print()
    print(f"  {DIM}Sum total:{RESET} {BOLD}{greek_val} + {latin_val} + {hebrew_val} = {total}{RESET}")
    print(f"  {DIM}Grand reduction:{RESET} {BOLD}{total_red}{RESET}")

    # ── Kabbalistic note ──
    kabbalah_notes = {
        1: "Keter (Crown) — Unity, divine will",
        2: "Chokmah (Wisdom) — Duality, creative force",
        3: "Binah (Understanding) — Form, structure",
        4: "Chesed (Mercy) — Expansion, abundance",
        5: "Gevurah (Severity) — Discipline, strength",
        6: "Tiferet (Beauty) — Harmony, balance",
        7: "Netzach (Victory) — Endurance, eternity",
        8: "Hod (Splendor) — Intellect, communication",
        9: "Yesod (Foundation) — Connection, transmission",
    }

    if total_red in kabbalah_notes:
        print(f"  {MAGENTA}Sephira: {kabbalah_notes[total_red]}{RESET}")

    print()
    print_separator('═', 60, CYAN)
    print(f"  {DIM}Boustrophedon layers complete.{RESET}")
    print()


# ============================================================
# MAIN
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
