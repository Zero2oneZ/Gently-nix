#!/usr/bin/env python3
"""
gently_tiers.py — Recursive Tier Model

THE KEY INSIGHT:
  Injecting into master doesn't "return" to master.
  It KILLS the master. The master becomes a branch.
  A new Gently-scope tab spawns ABOVE as the new master.
  The old master + its branches become a sub-tier.
  The demotion automatically creates a right shelf artifact.

HIERARCHY (recursive):
  Gently
    └── Project
         └── Tier 0 (current master — Gently scope tab)
              ├── LEFT: master chat (Claude tab)
              ├── RIGHT: branches in progress
              └── Tier 1 (auto-created on inject)
                   ├── [was the master, now a branch]
                   ├── [its branches preserved below it]
                   └── Tier 2 (next inject creates this)
                        └── ...turtles all the way down

WHAT HAPPENS ON INJECT:
  1. Branch artifact is ready in bucket
  2. User hits INJECT
  3. Current master STOPS being master
  4. Current master becomes branch[0] of a new sub-tier
  5. All current branches become siblings in that sub-tier
  6. A NEW Gently-scope tab opens as the new master
  7. The new master's stamp references the tier below
  8. Right shelf gets an auto-artifact:
     "Tier N conclusion: [pin] via [fork_type] with gates [A●B↺C○]"
  9. The artifact in the bucket gets stamped with tier transition metadata

THE RIGHT SHELF ARTIFACT IS AUTOMATIC:
  - Not manually collected
  - Created by the LOGIC of tier promotion
  - Contains: old master's final stamp, all branch pins, gate snapshot
  - It's the "what happened at that level" summary
  - Available for injection into the NEW master or any future tier
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum
import json


class ForkType(Enum):
    EXPLORE   = "explore"
    PIVOT     = "pivot"
    REFINE    = "refine"
    CHALLENGE = "challenge"
    MERGE     = "merge"
    DEAD      = "dead"

class GateState(Enum):
    OPEN    = "○"
    HALF    = "◐"
    YES     = "●"
    NO      = "✕"
    REVISIT = "↺"

class ConvState(Enum):
    OPEN = "OPEN"
    GATE = "GATE"
    DONE = "DONE"
    FORK = "FORK"
    HOLD = "HOLD"

class ArtifactOrigin(Enum):
    MANUAL    = "manual"      # User collected from branch
    TIER_AUTO = "tier-auto"   # Auto-created on tier promotion
    EDITED    = "edited"      # Modified in bucket
    INJECTED  = "injected"    # Already pushed up


# ═══════════════════════════════════════
# CORE
# ═══════════════════════════════════════

@dataclass
class Gate:
    letter: str
    question: str
    state: GateState = GateState.OPEN

    def cycle(self):
        order = [GateState.OPEN, GateState.HALF, GateState.YES, GateState.NO]
        if self.state in order:
            self.state = order[(order.index(self.state) + 1) % len(order)]

    def sym(self):
        return f"{self.letter}{self.state.value}"

    def snapshot(self):
        return {'letter': self.letter, 'question': self.question, 'state': self.state.value}


@dataclass
class Branch:
    id: str
    name: str
    fork_type: ForkType
    forked_at_depth: int
    depth: int = 0
    conv_state: ConvState = ConvState.OPEN
    pin: str = ""
    stamp_at_fork: str = ""

    def summary(self):
        ft = {'explore': '→', 'pivot': '↻', 'challenge': '⚔', 'refine': '▷', 'merge': '✧', 'dead': '✕'}
        status = '●' if self.conv_state == ConvState.DONE else '◐' if self.depth > 0 else '○'
        return f"{status} {ft.get(self.fork_type.value, '?')} {self.name} [d={self.depth}] \"{self.pin}\""


@dataclass
class Artifact:
    id: str
    name: str
    content: str
    origin: ArtifactOrigin
    source_tier: int              # Which tier level produced this
    source_branch: Optional[str]  # Branch id, or None if from master demotion
    gate_snapshot: list = field(default_factory=list)   # Gates at moment of creation
    stamp_at_creation: str = ""
    status: str = "available"     # available | staged | injected

    def display(self):
        origin_icon = {
            'manual': '✋', 'tier-auto': '⚙', 'edited': '✏', 'injected': '✓'
        }
        return f"[{origin_icon.get(self.origin.value, '?')}] {self.name} (tier {self.source_tier})"


@dataclass
class Tier:
    """
    One level of the recursive hierarchy.
    Contains the master state at that level plus its branches.
    When a tier gets "promoted" (inject happens), it freezes
    and a new tier spawns above it.
    """
    level: int
    master_depth: int = 0
    master_state: ConvState = ConvState.OPEN
    master_pin: str = ""
    branches: list = field(default_factory=list)   # list[Branch]
    frozen: bool = False      # True once promoted (tier closed)
    frozen_stamp: str = ""    # Final stamp when tier was frozen
    promoted_by: str = ""     # Artifact id that caused promotion

    def make_stamp(self, project_id, gates):
        gs = "".join(g.sym() for g in gates)
        ts = datetime.now().strftime("%m%dT%H%M")
        pin = self.master_pin[:25].replace(" ", "-") if self.master_pin else ""
        parts = [
            "OLO",
            f"\U0001F33Ft{self.level}/{project_id}",
            f"\U0001F4CD{self.master_depth}",
            f"\u26A1{self.master_state.value}",
            f"\U0001F512{gs}" if gs else "",
            f"\U0001F4CC{pin}" if pin else "",
        ]
        if self.level > 0:
            parts.append(f"\u2B06t{self.level - 1}")
        parts.append(f"\u23F1{ts}")
        return "[" + "|".join(p for p in parts if p) + "]"

    def summary(self):
        status = "\u2744 FROZEN" if self.frozen else "\u26A1 ACTIVE"
        return (
            f"Tier {self.level} [{status}] "
            f"master@d{self.master_depth} "
            f"state={self.master_state.value} "
            f"branches={len(self.branches)} "
            f"pin=\"{self.master_pin}\""
        )


@dataclass
class Project:
    id: str
    name: str
    color: str
    gates: list = field(default_factory=list)
    tiers: list = field(default_factory=list)     # list[Tier], index 0 = deepest/oldest
    artifacts: list = field(default_factory=list)  # Right shelf — all artifacts across tiers
    bucket: list = field(default_factory=list)     # Keyboard bucket — staged items

    def current_tier(self) -> Tier:
        """The active (unfrozen) tier = the current master level."""
        for t in reversed(self.tiers):
            if not t.frozen:
                return t
        # If all frozen, need a new one
        return self._new_tier()

    def _new_tier(self) -> Tier:
        t = Tier(level=len(self.tiers))
        self.tiers.append(t)
        return t

    def init_project(self):
        """Start with tier 0."""
        if not self.tiers:
            self._new_tier()

    def branch_from_master(self, name: str, fork_type: ForkType) -> Branch:
        """Fork a branch from current master. Lives in RIGHT pane."""
        tier = self.current_tier()
        branch = Branch(
            id=f"b{len(tier.branches)}-{name}",
            name=name,
            fork_type=fork_type,
            forked_at_depth=tier.master_depth,
            stamp_at_fork=tier.make_stamp(self.id, self.gates),
        )
        tier.branches.append(branch)
        return branch

    def collect_artifact(self, branch_id: str, name: str, content: str) -> Artifact:
        """Manually collect from a branch into the bucket."""
        tier = self.current_tier()
        art = Artifact(
            id=f"art-{len(self.artifacts)}",
            name=name,
            content=content,
            origin=ArtifactOrigin.MANUAL,
            source_tier=tier.level,
            source_branch=branch_id,
            gate_snapshot=[g.snapshot() for g in self.gates],
            stamp_at_creation=tier.make_stamp(self.id, self.gates),
        )
        self.artifacts.append(art)
        self.bucket.append(art)
        return art

    def inject(self, artifact_id: str) -> tuple:
        """
        THE BIG ONE.

        Injecting an artifact into the master triggers:
        1. Current tier FREEZES (master becomes historical)
        2. Auto-artifact created from the frozen tier's state
        3. New tier spawns above
        4. New master starts with knowledge of what's below
        5. Returns (new_tier, auto_artifact)
        """
        # Find the artifact
        art = next((a for a in self.bucket if a.id == artifact_id), None)
        if not art:
            return None, None

        art.status = "injected"

        # ─── STEP 1: Freeze current tier ───
        old_tier = self.current_tier()
        old_tier.frozen = True
        old_tier.frozen_stamp = old_tier.make_stamp(self.id, self.gates)
        old_tier.promoted_by = artifact_id

        # ─── STEP 2: Auto-create right shelf artifact ───
        # This is the tier's conclusion — created by LOGIC not by user
        branch_pins = [
            f"  {b.summary()}" for b in old_tier.branches
        ]
        auto_content = (
            f"=== TIER {old_tier.level} CONCLUSION ===\n"
            f"Master was at depth {old_tier.master_depth}, state {old_tier.master_state.value}\n"
            f"Master pin: \"{old_tier.master_pin}\"\n"
            f"Gates: {' '.join(g.sym() for g in self.gates)}\n"
            f"\n"
            f"Branches explored:\n"
            f"{chr(10).join(branch_pins)}\n"
            f"\n"
            f"Promoted by: {art.name}\n"
            f"Injected content: {art.content[:100]}...\n"
            f"\n"
            f"Frozen stamp: {old_tier.frozen_stamp}"
        )

        auto_art = Artifact(
            id=f"tier-{old_tier.level}-auto",
            name=f"Tier {old_tier.level}: {old_tier.master_pin}",
            content=auto_content,
            origin=ArtifactOrigin.TIER_AUTO,
            source_tier=old_tier.level,
            source_branch=None,  # From master demotion, not a branch
            gate_snapshot=[g.snapshot() for g in self.gates],
            stamp_at_creation=old_tier.frozen_stamp,
        )
        self.artifacts.append(auto_art)
        # Auto-artifacts go to right shelf, NOT bucket
        # They're reference, not staged for injection (unless user stages them)

        # ─── STEP 3: Create new tier ───
        new_tier = self._new_tier()
        new_tier.master_pin = f"promoted from tier {old_tier.level}"

        # ─── STEP 4: Left shelf auto-updates ───
        # The old tier + its branches now appear as a sub-tier
        # in the left shelf under the new master

        return new_tier, auto_art


# ═══════════════════════════════════════
# DEMO — Full tier promotion cycle
# ═══════════════════════════════════════

if __name__ == "__main__":
    SEP = "=" * 64

    print(SEP)
    print("  GENTLY TIERS — Recursive Promotion Demo")
    print(SEP)
    print()

    # ─── Setup ───
    proj = Project(id="olo", name="OLO Guard", color="#00e5a0")
    proj.gates = [
        Gate('A', 'Blue channel?'),
        Gate('B', 'JPEG kill?'),
        Gate('C', 'Temporal?'),
        Gate('D', 'Gematria visible?'),
    ]
    proj.init_project()

    # ─── TIER 0: Initial exploration ───
    print("▸ TIER 0 — Initial exploration")
    print("-" * 40)

    tier0 = proj.current_tier()
    tier0.master_depth = 5
    tier0.master_pin = "blue channel verified"
    proj.gates[0].state = GateState.YES

    print(f"  Master stamp: {tier0.make_stamp(proj.id, proj.gates)}")

    # Branch: explore JPEG
    jpeg = proj.branch_from_master("jpeg-test", ForkType.EXPLORE)
    jpeg.depth = 3
    jpeg.pin = "JPEG destroys 75% blue"
    jpeg.conv_state = ConvState.DONE
    proj.gates[1].state = GateState.YES
    print(f"  Branch: {jpeg.summary()}")

    # Branch: challenge with PNG
    png = proj.branch_from_master("png-alt", ForkType.CHALLENGE)
    png.depth = 2
    png.pin = "PNG preserves, 3x size"
    proj.gates[1].state = GateState.REVISIT
    print(f"  Branch: {png.summary()}")

    # Collect from JPEG branch
    art1 = proj.collect_artifact(
        jpeg.id, "jpeg-findings",
        "JPEG 4:2:0 destroys 75% blue channel. Confirmed n=100."
    )
    print(f"  Collected: {art1.display()}")
    print()

    # ─── INJECT → TIER PROMOTION ───
    print("▸ INJECTING artifact into master...")
    print("  This triggers tier promotion!")
    print()

    new_tier, auto_art = proj.inject(art1.id)

    print(f"  Old tier 0: {proj.tiers[0].summary()}")
    print()
    print(f"  AUTO-ARTIFACT created (right shelf):")
    print(f"    {auto_art.display()}")
    print(f"    Origin: {auto_art.origin.value}")
    print()
    print(f"  New tier 1: {new_tier.summary()}")
    print(f"  New master stamp: {new_tier.make_stamp(proj.id, proj.gates)}")
    print()

    # ─── TIER 1: Higher-level exploration ───
    print("▸ TIER 1 — Informed by tier 0 conclusions")
    print("-" * 40)

    tier1 = proj.current_tier()
    tier1.master_depth = 3
    tier1.master_pin = "JPEG confirmed, exploring encoding"
    proj.gates[1].state = GateState.YES  # Decided: JPEG
    proj.gates[2].state = GateState.HALF  # Exploring temporal

    print(f"  Master stamp: {tier1.make_stamp(proj.id, proj.gates)}")

    # Branch: explore temporal fragmentation
    temporal = proj.branch_from_master("temporal-frag", ForkType.EXPLORE)
    temporal.depth = 4
    temporal.pin = "temporal adds 2x complexity, marginal gain"
    temporal.conv_state = ConvState.DONE
    proj.gates[2].state = GateState.NO
    print(f"  Branch: {temporal.summary()}")

    # Branch: refine encoding params
    encoding = proj.branch_from_master("encode-params", ForkType.REFINE)
    encoding.depth = 2
    encoding.pin = "quality 35 optimal for blue destruction"
    print(f"  Branch: {encoding.summary()}")

    # Collect from encoding branch
    art2 = proj.collect_artifact(
        encoding.id, "encoding-findings",
        "JPEG quality 35 with 4:2:0 is optimal. Below 30 artifacts appear. Above 40 blue survives."
    )
    print(f"  Collected: {art2.display()}")
    print()

    # ─── INJECT AGAIN → TIER 2 ───
    print("▸ INJECTING again → Tier 2 promotion!")
    print()

    tier2, auto_art2 = proj.inject(art2.id)

    print(f"  Tier 0: {proj.tiers[0].summary()}")
    print(f"  Tier 1: {proj.tiers[1].summary()}")
    print(f"  Tier 2: {tier2.summary()}")
    print()

    # ─── FINAL STATE ───
    print(SEP)
    print("  FINAL STATE")
    print(SEP)
    print()

    print("  LEFT SHELF (tier tree):")
    for t in reversed(proj.tiers):
        indent = "  " * (len(proj.tiers) - t.level)
        icon = "\u25C6" if not t.frozen else "\u2744"
        print(f"  {indent}{icon} Tier {t.level}: \"{t.master_pin}\"")
        if t.frozen:
            print(f"  {indent}  frozen @ d{t.master_depth}, stamp: {t.frozen_stamp[:60]}...")
        for b in t.branches:
            print(f"  {indent}  {b.summary()}")
    print()

    print("  RIGHT SHELF (artifacts — auto + manual):")
    for a in proj.artifacts:
        origin_mark = "\u2699" if a.origin == ArtifactOrigin.TIER_AUTO else "\u270B"
        status_mark = "\u2713" if a.status == "injected" else "\u25CB"
        print(f"    {status_mark} {origin_mark} {a.name}")
        print(f"       tier {a.source_tier} | {a.origin.value} | {a.status}")
    print()

    print("  KEYBOARD BUCKET (staged for injection):")
    bucket_available = [a for a in proj.bucket if a.status != "injected"]
    if bucket_available:
        for a in bucket_available:
            print(f"    \u25B8 {a.name} [{a.status}]")
    else:
        print("    (empty — all injected)")
    print()

    print("  GATES:")
    for g in proj.gates:
        print(f"    {g.sym()}  {g.question}")
    print()

    print("  CURRENT MASTER:")
    ct = proj.current_tier()
    print(f"    Tier {ct.level}")
    print(f"    Stamp: {ct.make_stamp(proj.id, proj.gates)}")
    print()

    # ─── Show the recursive structure visually ───
    print(SEP)
    print("  THE TREE (what the left shelf shows)")
    print(SEP)
    print()
    print("  \u25C6 TIER 2 — ACTIVE MASTER (Gently scope tab)")
    print("  \u2502  pin: \"promoted from tier 1\"")
    print("  \u2502  gates: A\u25CF B\u25CF C\u2715 D\u25CB")
    print("  \u2502")
    print("  \u251C\u2500\u2500 \u2744 TIER 1 (frozen, was master)")
    print("  \u2502   \u2502  pin: \"JPEG confirmed, exploring encoding\"")
    print("  \u2502   \u251C\u2500\u2500 \u25CF \u2192 temporal-frag [DONE] d=4")
    print("  \u2502   \u2514\u2500\u2500 \u25D0 \u25B7 encode-params [OPEN] d=2")
    print("  \u2502       \u2514\u2500\u2500 \u2699 auto-artifact: \"Tier 1: JPEG confirmed\"")
    print("  \u2502")
    print("  \u2514\u2500\u2500 \u2744 TIER 0 (frozen, was original master)")
    print("      \u2502  pin: \"blue channel verified\"")
    print("      \u251C\u2500\u2500 \u25CF \u2192 jpeg-test [DONE] d=3")
    print("      \u2514\u2500\u2500 \u25D0 \u2694 png-alt [OPEN] d=2")
    print("          \u2514\u2500\u2500 \u2699 auto-artifact: \"Tier 0: blue channel verified\"")
    print()
    print("  Right shelf shows ALL artifacts (manual + auto)")
    print("  Auto-artifacts \u2699 appear the instant a tier freezes")
    print("  They exist by LOGIC, not by user action")
    print()
    print(SEP)
    print("  TIER MODEL VALIDATED")
    print(SEP)
