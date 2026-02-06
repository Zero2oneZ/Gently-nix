#!/usr/bin/env python3
"""
gently_model.py — The logical data model for Gently

HIERARCHY:
  Gently (app)
    └── Project (1:many)
         └── Master Chat (1:1, always in LEFT pane)
              └── Branch (1:many, forked from master)
                   └── collected in RIGHT pane
                        └── injectable as artifact → keyboard bucket

RULES:
  - LEFT pane ALWAYS shows the master chat for the active project
  - RIGHT pane COLLECTS branches, ordered by progress
  - Branches fork FROM the master, each gets its own stamp
  - A branch's output can be injected as an artifact into the bucket
  - The keyboard bucket HOLDS STATE between mode switches
  - Projects can be many:1 (multiple projects can share a master context)

FLOW:
  1. Open Gently → see projects in left shelf
  2. Select project → LEFT pane loads master chat (Claude tab)
  3. Master chat progresses → at any point, BRANCH
  4. Branch opens in RIGHT pane as new Claude tab
  5. Branch inherits master stamp + fork type modifier
  6. Branch progresses independently
  7. Branch produces output → COLLECT as artifact
  8. Artifact appears in keyboard bucket (staged)
  9. From bucket, INJECT artifact back into master (LEFT)
  10. Master now has the branch's conclusion without the journey
  11. Master stamp updates: gate closes, pin changes, depth advances
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum
import json

# ═══════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════

class ForkType(Enum):
    EXPLORE   = "explore"     # Going deeper on a thread
    PIVOT     = "pivot"       # Changing direction entirely
    REFINE    = "refine"      # Tightening/optimizing
    CHALLENGE = "challenge"   # Testing the opposite
    MERGE     = "merge"       # Combining branches back
    DEAD      = "dead"        # Abandoned

class GateState(Enum):
    OPEN    = "○"    # Not decided
    HALF    = "◐"    # Partially explored
    YES     = "●"    # Confirmed
    NO      = "✕"    # Rejected
    REVISIT = "↺"    # Reopened

class ConvState(Enum):
    OPEN = "OPEN"    # Exploring
    GATE = "GATE"    # Waiting on decision
    DONE = "DONE"    # Concluded
    FORK = "FORK"    # About to branch
    HOLD = "HOLD"    # Paused

class ArtifactStatus(Enum):
    COLLECTED = "collected"   # Captured from branch
    STAGED    = "staged"      # In keyboard bucket, ready
    INJECTED  = "injected"    # Already sent to master
    EDITED    = "edited"      # Modified in bucket before inject

# ═══════════════════════════════════════
# CORE ENTITIES
# ═══════════════════════════════════════

@dataclass
class Gate:
    """A decision point tracked across master and branches."""
    letter: str              # A, B, C...
    question: str            # What's being decided
    state: GateState = GateState.OPEN

    def cycle(self):
        order = [GateState.OPEN, GateState.HALF, GateState.YES, GateState.NO]
        if self.state in order:
            idx = order.index(self.state)
            self.state = order[(idx + 1) % len(order)]

    def symbol(self):
        return f"{self.letter}{self.state.value}"


@dataclass
class Stamp:
    """The GPS coordinate prepended to every prompt."""
    project_id: str
    branch_id: Optional[str]   # None = master
    depth: int
    max_depth: int
    conv_state: ConvState
    gates: list                # list[Gate]
    pin: str                   # Last key finding
    parent_id: Optional[str]   # What this forked from
    fork_type: Optional[ForkType]
    timestamp: str = ""

    def compact(self):
        ts = datetime.now().strftime("%m%dT%H%M")
        gs = "".join(g.symbol() for g in self.gates)
        branch = self.branch_id or "master"
        pin = self.pin[:25].replace(" ", "-") if self.pin else ""
        parts = [
            "OLO",
            f"🌿{self.project_id}/{branch}",
            f"📍{self.depth}/{self.max_depth}",
            f"⚡{self.conv_state.value}",
            f"🔒{gs}" if gs else "",
            f"📌{pin}" if pin else "",
        ]
        if self.parent_id:
            parts.append(f"⬆{self.parent_id}@d{self.depth}")
        if self.fork_type:
            parts.append(f"🔀{self.fork_type.value}")
        parts.append(f"⏱{ts}")
        return "[" + "|".join(p for p in parts if p) + "]"


@dataclass
class Artifact:
    """A collected output from a branch, living in the keyboard bucket."""
    id: str
    name: str
    content: str              # The actual text/code/finding
    source_branch: str        # Which branch produced this
    source_depth: int         # At what depth in the branch
    status: ArtifactStatus = ArtifactStatus.COLLECTED
    fork_type: Optional[ForkType] = None  # Inherits from source branch
    stamp_at_capture: str = ""  # The stamp when this was collected
    edited_content: Optional[str] = None  # If modified in bucket

    def display_content(self):
        return self.edited_content if self.edited_content else self.content


@dataclass
class Branch:
    """A forked conversation from the master."""
    id: str
    name: str
    fork_type: ForkType
    forked_at_depth: int      # Master depth when fork happened
    stamp_at_fork: str        # Master stamp at fork point
    depth: int = 0            # Current depth of this branch
    conv_state: ConvState = ConvState.OPEN
    pin: str = ""             # Branch's own pin
    artifacts: list = field(default_factory=list)   # Collected outputs
    order: int = 0            # Position in right pane progress list

    def make_stamp(self, project_id, gates):
        return Stamp(
            project_id=project_id,
            branch_id=self.id,
            depth=self.depth,
            max_depth=self.depth,  # Branch doesn't know its max yet
            conv_state=self.conv_state,
            gates=gates,           # Gates are shared across project
            pin=self.pin,
            parent_id="master",
            fork_type=self.fork_type,
        )


@dataclass
class MasterChat:
    """The master conversation for a project. Always in LEFT pane."""
    depth: int = 0
    max_depth: int = 0
    conv_state: ConvState = ConvState.OPEN
    pin: str = ""

    def make_stamp(self, project_id, gates):
        return Stamp(
            project_id=project_id,
            branch_id=None,  # None = master
            depth=self.depth,
            max_depth=self.max_depth,
            conv_state=self.conv_state,
            gates=gates,
            pin=self.pin,
            parent_id=None,
            fork_type=None,
        )


@dataclass
class Project:
    """A project with one master chat and many branches."""
    id: str
    name: str
    color: str
    master: MasterChat = field(default_factory=MasterChat)
    branches: list = field(default_factory=list)    # list[Branch]
    gates: list = field(default_factory=list)        # list[Gate] - shared across all
    bucket: list = field(default_factory=list)       # list[Artifact] - keyboard bucket

    def branch_from_master(self, name, fork_type):
        """Fork a new branch from the current master state."""
        stamp = self.master.make_stamp(self.id, self.gates)
        branch = Branch(
            id=f"{self.id}-{name}",
            name=name,
            fork_type=fork_type,
            forked_at_depth=self.master.depth,
            stamp_at_fork=stamp.compact(),
            order=len(self.branches),
        )
        self.branches.append(branch)
        return branch

    def collect_from_branch(self, branch_id, name, content):
        """Collect an artifact from a branch into the bucket."""
        branch = next((b for b in self.branches if b.id == branch_id), None)
        if not branch:
            return None

        art = Artifact(
            id=f"art-{len(self.bucket)}",
            name=name,
            content=content,
            source_branch=branch_id,
            source_depth=branch.depth,
            fork_type=branch.fork_type,
            stamp_at_capture=branch.make_stamp(self.id, self.gates).compact(),
        )
        branch.artifacts.append(art)
        self.bucket.append(art)
        return art

    def inject_to_master(self, artifact_id):
        """Inject a bucket artifact into the master chat."""
        art = next((a for a in self.bucket if a.id == artifact_id), None)
        if not art:
            return None

        art.status = ArtifactStatus.INJECTED
        # The master's next prompt would include:
        # [stamp] + [injected artifact content]
        self.master.depth += 1
        return art

    def stage_artifact(self, artifact_id):
        """Move artifact to staged (ready to inject)."""
        art = next((a for a in self.bucket if a.id == artifact_id), None)
        if art:
            art.status = ArtifactStatus.STAGED
        return art

    def edit_artifact(self, artifact_id, new_content):
        """Edit artifact content in the bucket before injecting."""
        art = next((a for a in self.bucket if a.id == artifact_id), None)
        if art:
            art.edited_content = new_content
            art.status = ArtifactStatus.EDITED
        return art


@dataclass
class Gently:
    """The outer app. Contains all projects."""
    projects: list = field(default_factory=list)     # list[Project]
    active_project_id: Optional[str] = None
    # Many:1 — multiple projects can reference each other's branches

    def add_project(self, id, name, color="#00e5a0"):
        proj = Project(id=id, name=name, color=color)
        self.projects.append(proj)
        if not self.active_project_id:
            self.active_project_id = id
        return proj

    def active_project(self):
        return next((p for p in self.projects if p.id == self.active_project_id), None)

    def switch_project(self, id):
        """Switch active project. LEFT pane changes to new master."""
        self.active_project_id = id


# ═══════════════════════════════════════
# DEMO — Full workflow
# ═══════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  GENTLY — Data Model Demo")
    print("=" * 60)
    print()

    # 1. Create app
    app = Gently()

    # 2. Create project
    proj = app.add_project("olo-guard", "OLO Guard System", "#00e5a0")

    # 3. Define gates (shared across master and all branches)
    proj.gates = [
        Gate('A', 'Blue channel for verification?'),
        Gate('B', 'JPEG as kill mechanism?'),
        Gate('C', 'Temporal fragmentation needed?'),
        Gate('D', 'Gematria visible or hidden?'),
    ]

    # 4. Master progresses
    proj.master.depth = 5
    proj.master.pin = "blue channel verified in tests"
    proj.master.conv_state = ConvState.OPEN
    proj.gates[0].state = GateState.YES  # A confirmed

    print("MASTER STAMP (LEFT pane):")
    master_stamp = proj.master.make_stamp(proj.id, proj.gates)
    print(f"  {master_stamp.compact()}")
    print()

    # 5. Branch from master — EXPLORE jpeg
    print("BRANCHING: explore JPEG compression...")
    jpeg_branch = proj.branch_from_master("jpeg-test", ForkType.EXPLORE)
    jpeg_branch.depth = 3
    jpeg_branch.pin = "JPEG 4:2:0 destroys 75% blue"
    jpeg_branch.conv_state = ConvState.DONE
    proj.gates[1].state = GateState.YES  # B confirmed in branch

    print("BRANCH STAMP (RIGHT pane):")
    branch_stamp = jpeg_branch.make_stamp(proj.id, proj.gates)
    print(f"  {branch_stamp.compact()}")
    print()

    # 6. Branch from master — CHALLENGE with PNG
    print("BRANCHING: challenge with PNG alternative...")
    png_branch = proj.branch_from_master("png-alt", ForkType.CHALLENGE)
    png_branch.depth = 2
    png_branch.pin = "PNG preserves but 3x size"
    png_branch.conv_state = ConvState.OPEN
    proj.gates[1].state = GateState.REVISIT  # B reopened!

    print("CHALLENGE BRANCH STAMP:")
    challenge_stamp = png_branch.make_stamp(proj.id, proj.gates)
    print(f"  {challenge_stamp.compact()}")
    print()

    # 7. Collect artifact from JPEG branch
    print("COLLECTING artifact from jpeg branch...")
    art = proj.collect_from_branch(
        jpeg_branch.id,
        "jpeg-findings",
        "JPEG 4:2:0 subsampling destroys 75% of blue channel data. "
        "Confirmed across 100 test images. Average blue loss: 73.2%."
    )
    print(f"  Artifact: {art.name}")
    print(f"  Status: {art.status.value}")
    print(f"  Captured stamp: {art.stamp_at_capture}")
    print()

    # 8. Stage it in the bucket
    proj.stage_artifact(art.id)
    print(f"  Staged: {art.status.value}")
    print()

    # 9. Edit it before injecting
    proj.edit_artifact(art.id,
        "CONFIRMED: JPEG 4:2:0 kills blue channel (73.2% avg loss, n=100). "
        "BUT: PNG branch challenges this — preserves 100% at 3x file size. "
        "DECISION NEEDED: file size vs channel integrity."
    )
    print("  Edited in bucket. New content:")
    print(f"  {art.display_content()[:80]}...")
    print()

    # 10. Inject into master
    print("INJECTING into master (LEFT pane)...")
    proj.inject_to_master(art.id)
    proj.master.pin = "JPEG vs PNG decision pending"
    proj.master.conv_state = ConvState.GATE  # Waiting on decision

    print("MASTER STAMP AFTER INJECTION:")
    new_master_stamp = proj.master.make_stamp(proj.id, proj.gates)
    print(f"  {new_master_stamp.compact()}")
    print()

    # Show state
    print("=" * 60)
    print("  CURRENT STATE")
    print("=" * 60)
    print()
    print(f"  Project: {proj.name}")
    print(f"  Master depth: {proj.master.depth}")
    print(f"  Master state: {proj.master.conv_state.value}")
    print(f"  Master pin: {proj.master.pin}")
    print()
    print(f"  Branches: {len(proj.branches)}")
    for b in proj.branches:
        ft_symbol = {'explore': '→', 'pivot': '↻', 'challenge': '⚔', 'merge': '✧'}
        print(f"    {ft_symbol.get(b.fork_type.value, '?')} {b.name}")
        print(f"      depth: {b.depth}, state: {b.conv_state.value}")
        print(f"      pin: {b.pin}")
        print(f"      artifacts: {len(b.artifacts)}")
    print()
    print(f"  Gates:")
    for g in proj.gates:
        print(f"    {g.symbol()}  {g.question}")
    print()
    print(f"  Bucket: {len(proj.bucket)} artifacts")
    for a in proj.bucket:
        print(f"    [{a.status.value}] {a.name} (from {a.source_branch})")
    print()

    # RIGHT PANE order
    print("  RIGHT PANE (branch progress order):")
    for i, b in enumerate(sorted(proj.branches, key=lambda x: x.order)):
        status = "●" if b.conv_state == ConvState.DONE else "◐" if b.depth > 0 else "○"
        print(f"    {i+1}. {status} {b.name} [{b.fork_type.value}] d={b.depth}")
    print()
    print("=" * 60)
    print("  MODEL VALIDATED")
    print("=" * 60)
