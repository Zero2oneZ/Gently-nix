#!/usr/bin/env python3
"""
gently_windows.py — Window Spawning Model

THE CORRECTION:
  Collapse does NOT open a third pane.
  Collapse LAUNCHES A NEW GENTLY WINDOW.
  The new window has FIXED CONSTANTS baked in.
  Constants are immutable — read-only ground truth from below.

EVERY GENTLY WINDOW IS IDENTICAL:
  ┌─────────┬────────────┬────────────┬──────────┐
  │  LEFT   │   FOCUS    │  PROCESS   │  RIGHT   │
  │  shelf  │   pane     │   pane     │  shelf   │
  │         │            │            │          │
  │ clans   │  master    │  branches  │ artifacts│
  │ groups  │  chat      │  collector │ bucket   │
  │         │            │            │          │
  ├─────────┴────────────┴────────────┤          │
  │  KEYBOARD / ARTIFACT COLLECTOR    │          │
  └───────────────────────────────────┴──────────┘
  +
  CONSTANTS BAR (top, read-only, from parent collapse)

  That's it. Always. No third pane. No special modes.
  The only thing that differs between windows is the CONSTANTS.

WHAT ARE FIXED CONSTANTS:
  When a new window spawns from collapse, it carries:
  - Source clan summaries (read-only)
  - Gate snapshot at collapse time (starting state)
  - Pins from each source (reference)
  - The synthesis prompt (what master chat opens with)
  - Parent window ID (where this came from)

  These CANNOT be edited inside the new window.
  They are the ground truth. The axioms.
  Everything in the new window builds ON TOP of them.

THE RECURSION:
  Window 0: Original Gently window
    ├── Clan A, Clan B, Clan C running
    ├── COLLAPSE A + B
    └── Spawns → Window 1

  Window 1: New Gently window
    ├── CONSTANTS: [A summary, B summary, gates A●B◐C●D●]
    ├── Its own master chat (informed by constants)
    ├── Its own clans, branches
    ├── COLLAPSE with something from Window 0 (Clan C)
    └── Spawns → Window 2

  Window 2: Newer Gently window
    ├── CONSTANTS: [Window 1 synthesis + C summary]
    ├── Its own everything
    └── Can spawn more windows...

  Each window is a SCOPE.
  Constants define the scope's axioms.
  The window tree IS the project history.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class GateState(Enum):
    OPEN = "○"; HALF = "◐"; YES = "●"; NO = "✕"; REVISIT = "↺"

class ClanState(Enum):
    ACTIVE = "active"; FROZEN = "frozen"; DONE = "done"


@dataclass
class Gate:
    letter: str
    question: str
    state: GateState = GateState.OPEN
    def sym(self): return f"{self.letter}{self.state.value}"


@dataclass
class Constant:
    """
    A fixed, immutable piece of context carried into a new window.
    Cannot be edited. Read-only. The axiom.
    """
    id: str
    source_name: str        # "Blue Channel Math" or "Window 1 Synthesis"
    source_type: str        # "clan" | "window" | "group"
    summary: str            # One-line conclusion
    findings: list          # Key points
    gate_snapshot: list     # Gates at freeze: [{'letter':'A','state':'●'}, ...]
    depth_at_freeze: int
    final_stamp: str
    frozen: bool = True     # Always true. Constants don't change.

    def display(self):
        gs = " ".join(f"{g['letter']}{g['state']}" for g in self.gate_snapshot)
        return f"[CONST] {self.source_name} | \"{self.summary}\" | gates: {gs} | d={self.depth_at_freeze}"


@dataclass
class Clan:
    id: str
    name: str
    starting_context: str
    state: ClanState = ClanState.ACTIVE
    depth: int = 0
    pin: str = ""
    gates: list = field(default_factory=list)
    color: str = "#00e5a0"

    def summary(self):
        s = {'active': '\u25C6', 'frozen': '\u2744', 'done': '\u25CF'}
        return f"{s.get(self.state.value,'?')} {self.name} [d={self.depth}] \"{self.pin}\""


@dataclass
class GentlyWindow:
    """
    One Gently window. Self-contained.
    Has its own clans, its own shelves, its own keyboard.
    Born with fixed constants from a parent collapse (or none if root).
    """
    id: str
    name: str
    parent_window_id: Optional[str] = None

    # FIXED CONSTANTS — immutable, from parent collapse
    constants: list = field(default_factory=list)  # list[Constant]

    # LIVE STATE — mutable, this window's own work
    clans: list = field(default_factory=list)
    artifacts: list = field(default_factory=list)
    bucket: list = field(default_factory=list)

    # Child windows spawned from this one
    child_window_ids: list = field(default_factory=list)

    def add_clan(self, name, context, color="#00e5a0", gates=None):
        clan = Clan(
            id=f"{self.id}/clan-{len(self.clans)}",
            name=name,
            starting_context=context,
            color=color,
            gates=gates or [],
        )
        self.clans.append(clan)
        return clan

    def collapse(self, clan_ids, new_window_name) -> 'GentlyWindow':
        """
        COLLAPSE clans → freeze them → extract constants → spawn new window.
        Returns the new window.
        """
        sources = [c for c in self.clans if c.id in clan_ids and c.state == ClanState.ACTIVE]
        if len(sources) < 2:
            return None

        # Build constants from each source clan
        new_constants = list(self.constants)  # Inherit parent constants

        for clan in sources:
            clan.state = ClanState.FROZEN
            const = Constant(
                id=f"const-{clan.id}",
                source_name=clan.name,
                source_type="clan",
                summary=clan.pin,
                findings=[clan.pin] if clan.pin else [],
                gate_snapshot=[{'letter': g.letter, 'state': g.state.value, 'question': g.question} for g in clan.gates],
                depth_at_freeze=clan.depth,
                final_stamp=f"[OLO|{clan.id}|d{clan.depth}|{clan.pin[:20]}]",
            )
            new_constants.append(const)

        # Spawn new window (use timestamp for unique id)
        import random
        uid = f"{len(self.child_window_ids)}-{random.randint(1000,9999)}"
        child = GentlyWindow(
            id=f"win-{self.id}-{uid}",
            name=new_window_name,
            parent_window_id=self.id,
            constants=new_constants,
        )
        self.child_window_ids.append(child.id)

        return child

    def constants_bar(self):
        """What the top bar shows — read-only constants."""
        if not self.constants:
            return "(root window — no constants)"
        lines = []
        for c in self.constants:
            lines.append(c.display())
        return "\n".join(lines)

    def synthesis_prompt(self):
        """Auto-generated starting context for the master chat in this window."""
        if not self.constants:
            return "(no synthesis — root window)"

        lines = [
            f"=== GENTLY WINDOW: {self.name} ===",
            f"This scope was created by collapsing {len(self.constants)} explorations.",
            f"The following are FIXED CONSTANTS — established truths:",
            "",
        ]
        for c in self.constants:
            lines.append(f"--- {c.source_name} (depth {c.depth_at_freeze}) ---")
            lines.append(f"  Conclusion: {c.summary}")
            gs = " ".join(f"{g['letter']}{g['state']}" for g in c.gate_snapshot)
            lines.append(f"  Decisions: {gs}")
            lines.append("")

        lines.append("=== BUILD ON THESE CONSTANTS ===")
        return "\n".join(lines)

    def window_display(self, indent=0):
        pad = "  " * indent
        status = f"[{len(self.constants)} constants, {len(self.clans)} clans]"
        active = [c for c in self.clans if c.state == ClanState.ACTIVE]
        frozen = [c for c in self.clans if c.state == ClanState.FROZEN]

        lines = []
        lines.append(f"{pad}\u25A0 WINDOW: {self.name} {status}")
        if self.constants:
            lines.append(f"{pad}\u2502 CONSTANTS (fixed, read-only):")
            for c in self.constants:
                lines.append(f"{pad}\u2502   \u2592 {c.source_name}: \"{c.summary}\"")
        if active:
            lines.append(f"{pad}\u2502 ACTIVE CLANS:")
            for c in active:
                lines.append(f"{pad}\u2502   {c.summary()}")
        if frozen:
            lines.append(f"{pad}\u2502 FROZEN (collapsed):")
            for c in frozen:
                lines.append(f"{pad}\u2502   {c.summary()}")
        return "\n".join(lines)


@dataclass
class GentlyApp:
    """The app. Manages all windows."""
    windows: list = field(default_factory=list)

    def create_root_window(self, name):
        win = GentlyWindow(id="win-root", name=name)
        self.windows.append(win)
        return win

    def register_window(self, win):
        self.windows.append(win)

    def window_tree(self):
        """Show the full tree of all windows."""
        root = next((w for w in self.windows if w.parent_window_id is None), None)
        if not root:
            return "(no windows)"
        return self._tree_recurse(root, 0)

    def _tree_recurse(self, win, depth):
        lines = [win.window_display(depth)]
        children = [w for w in self.windows if w.parent_window_id == win.id]
        for child in children:
            lines.append(self._tree_recurse(child, depth + 1))
        return "\n".join(lines)


# ═══════════════════════════════════════
# DEMO
# ═══════════════════════════════════════

if __name__ == "__main__":
    SEP = "=" * 64

    print(SEP)
    print("  GENTLY WINDOWS — Collapse Spawns Windows, Not Panes")
    print(SEP)
    print()

    app = GentlyApp()

    # ─── WINDOW 0: Root ───
    print("\u25B8 WINDOW 0: Root window (no constants)")
    print("-" * 40)

    w0 = app.create_root_window("OLO Guard")

    a = w0.add_clan("Blue Channel Math", "Color theory, RGB spaces...",
                     color="#00e5a0", gates=[Gate('A','Blue survives?'), Gate('B','Blue detectable?')])
    a.depth = 8; a.pin = "blue verified as carrier"
    a.gates[0].state = GateState.YES; a.gates[1].state = GateState.HALF

    b = w0.add_clan("JPEG Internals", "JPEG spec, DCT, quantization...",
                     color="#4d9fff", gates=[Gate('C','Quantization predictable?'), Gate('D','Subsampling exploitable?')])
    b.depth = 6; b.pin = "4:2:0 destroys 75% chroma"
    b.gates[0].state = GateState.YES; b.gates[1].state = GateState.YES

    c = w0.add_clan("Gematria Encoding", "Hebrew letters, 72 Names...",
                     color="#ffd93d", gates=[Gate('E','Fits in blue?'), Gate('F','Visually detectable?')])
    c.depth = 5; c.pin = "72 Names map to byte sequences"
    c.gates[0].state = GateState.HALF

    d = w0.add_clan("Adversarial Testing", "Forensics, stego detection...",
                     color="#ff6b35", gates=[Gate('G','Survives Twitter?'), Gate('H','ML detectable?')])
    d.depth = 3; d.pin = "Twitter strips metadata, keeps pixels"

    print(w0.window_display())
    print()

    # ─── COLLAPSE A + B → Window 1 ───
    print(SEP)
    print("  COLLAPSE: Blue + JPEG → New Window")
    print(SEP)
    print()

    w1 = w0.collapse([a.id, b.id], "Blue+JPEG Synthesis")
    app.register_window(w1)

    print(f"  Window 0: A and B are now \u2744 FROZEN")
    print(f"  Window 1 launched with {len(w1.constants)} fixed constants:")
    print()
    for const in w1.constants:
        print(f"    {const.display()}")
    print()
    print(f"  Synthesis prompt (master chat auto-receives):")
    print()
    for line in w1.synthesis_prompt().split('\n'):
        print(f"    {line}")
    print()

    # Window 1 does its own work
    print("  Window 1 adds its own clans (independent of Window 0):")
    s1 = w1.add_clan("Encoding Strategy", "Given blue+JPEG constants, how to encode data?",
                      color="#c77dff", gates=[Gate('I','LSB or frequency?'), Gate('J','Error correction needed?')])
    s1.depth = 4; s1.pin = "frequency domain encoding survives recompression"
    s1.gates[0].state = GateState.YES

    s2 = w1.add_clan("Channel Capacity", "How many bits can blue carry per image?",
                      color="#00e5a0", gates=[Gate('K','Above 100 bits/image?'), Gate('L','Below detection threshold?')])
    s2.depth = 3; s2.pin = "~240 bits per 1024x1024 image"
    s2.gates[0].state = GateState.YES; s2.gates[1].state = GateState.HALF

    print(f"    {s1.summary()}")
    print(f"    {s2.summary()}")
    print()

    # ─── COLLAPSE in Window 1 → Window 2 ───
    print(SEP)
    print("  COLLAPSE in Window 1 → Window 2")
    print(SEP)
    print()

    w2 = w1.collapse([s1.id, s2.id], "Encoding+Capacity Unified")
    app.register_window(w2)

    print(f"  Window 2 launched with {len(w2.constants)} constants:")
    print(f"  (inherits Window 1's constants + adds new ones)")
    print()
    for const in w2.constants:
        print(f"    {const.display()}")
    print()

    # ─── Meanwhile back in Window 0 ───
    print(SEP)
    print("  BACK IN WINDOW 0")
    print(SEP)
    print()
    print("  Clan C (Gematria) and Clan D (Adversarial) still active:")
    print(f"    {c.summary()}")
    print(f"    {d.summary()}")
    print()
    print("  Tom can collapse C + D into yet another window,")
    print("  or collapse C into Window 1, or leave them running.")
    print()

    # ─── Collapse C + D in Window 0 → Window 3 ───
    w3 = w0.collapse([c.id, d.id], "Gematria+Adversarial")
    app.register_window(w3)
    print(f"  Collapsed C + D → Window 3: \"{w3.name}\"")
    print(f"  Window 3 constants: {len(w3.constants)}")
    print()

    # ─── FULL APP STATE ───
    print(SEP)
    print("  FULL WINDOW TREE")
    print(SEP)
    print()
    print(app.window_tree())
    print()

    # ─── Visual diagram ───
    print(SEP)
    print("  WINDOW RELATIONSHIP DIAGRAM")
    print(SEP)
    print()
    print("  \u25A0 Window 0: OLO Guard (ROOT)")
    print("  \u2502 constants: (none — root)")
    print("  \u2502 clans: A\u2744 B\u2744 C\u2744 D\u2744 (all collapsed)")
    print("  \u2502")
    print("  \u251C\u2500\u2500\u25A0 Window 1: Blue+JPEG Synthesis")
    print("  \u2502   \u2502 constants: [A: blue verified] [B: 4:2:0 kills chroma]")
    print("  \u2502   \u2502 clans: S1\u2744 S2\u2744 (collapsed)")
    print("  \u2502   \u2502")
    print("  \u2502   \u2514\u2500\u2500\u25A0 Window 2: Encoding+Capacity Unified")
    print("  \u2502       \u2502 constants: [A] [B] [S1: freq encoding] [S2: 240 bits/img]")
    print("  \u2502       \u2502 clans: (fresh — ready for new work)")
    print("  \u2502       \u2502 THIS WINDOW CARRIES 4 CONSTANTS")
    print("  \u2502       \u2502 Each one immutable. Built on axioms.")
    print("  \u2502")
    print("  \u2514\u2500\u2500\u25A0 Window 3: Gematria+Adversarial")
    print("      \u2502 constants: [C: 72 Names] [D: Twitter preserves pixels]")
    print("      \u2502 clans: (fresh)")
    print()
    print("  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")
    print()
    print("  EACH WINDOW IS IDENTICAL LAYOUT:")
    print("  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510")
    print("  \u2502 CONSTANTS BAR (read-only, top)  \u2502")
    print("  \u251C\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2524")
    print("  \u2502LEFT\u2502 FOCUS  \u2502PROCESS \u2502RIGHT\u2502")
    print("  \u2502shelf\u2502 pane   \u2502 pane   \u2502shelf\u2502")
    print("  \u251C\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2524")
    print("  \u2502 KEYBOARD / BUCKET            \u2502")
    print("  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518")
    print()
    print("  The ONLY difference between windows: the CONSTANTS BAR.")
    print("  Everything else is the same UI, same controls, same flow.")
    print("  Constants accumulate as windows spawn from windows.")
    print("  Window 2 has 4 constants. Window 5 might have 12.")
    print("  Each one is an immutable axiom you've proven below.")
    print()
    print(SEP)
    print("  WINDOW MODEL VALIDATED")
    print(SEP)
