#!/usr/bin/env python3
"""
stamp.py - OLO Stamp Protocol engine
Every prompt carries its own GPS coordinates in the thought-tree.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field

GATE_STATES = {
    'open': '\u25CB', 'half': '\u25D0', 'yes': '\u25CF',
    'no': '\u2715', 'blocked': '\u25C8', 'revisit': '\u21BA',
}
GATE_CYCLE = ['\u25CB', '\u25D0', '\u25CF', '\u2715']
CONV_STATES = ['OPEN', 'GATE', 'DONE', 'FORK', 'HOLD', 'DEAD']

@dataclass
class Gate:
    letter: str
    question: str
    state: str = '\u25CB'

    def cycle(self):
        idx = GATE_CYCLE.index(self.state) if self.state in GATE_CYCLE else 0
        self.state = GATE_CYCLE[(idx + 1) % len(GATE_CYCLE)]

    def compact(self):
        return f"{self.letter}{self.state}"

    def display(self):
        return f"[{self.letter}{self.state}]"

@dataclass
class Stamp:
    branch: str = ""
    depth: int = 0
    max_depth: int = 0
    parent: str = ""
    parent_depth: int = 0
    state: str = "OPEN"
    gates: list = field(default_factory=list)
    pin: str = ""
    look: str = ""
    chain: str = ""
    timestamp: str = ""

    def compact(self):
        ts = datetime.now().strftime("%m%dT%H%M")
        gate_str = "".join(g.compact() for g in self.gates)
        parent_str = f"{self.parent}@d{self.parent_depth}" if self.parent else ""
        pin_short = self.pin[:30].replace(" ", "-") if self.pin else ""
        parts = [
            "OLO",
            f"\U0001F33F{self.branch}" if self.branch else "",
            f"\U0001F4CD{self.depth}/{self.max_depth}",
            f"\u2B06{parent_str}" if parent_str else "",
            f"\u26A1{self.state}",
            f"\U0001F512{gate_str}" if gate_str else "",
            f"\U0001F4CC{pin_short}" if pin_short else "",
            f"\U0001F441{self.look}" if self.look else "",
            f"\U0001F517{self.chain}" if self.chain else "",
            f"\u23F1{ts}",
        ]
        return "[" + "|".join(p for p in parts if p) + "]"

    def full(self):
        lines = []
        lines.append("+" + "=" * 52 + "+")
        lines.append("| OLO STAMP v1" + " " * 39 + "|")
        lines.append("+" + "-" * 52 + "+")
        if self.branch:
            lines.append(f"|  \U0001F33F branch: {self.branch}")
        lines.append(f"|  \U0001F4CD depth:  {self.depth}/{self.max_depth}")
        if self.parent:
            lines.append(f"|  \u2B06  parent: {self.parent}@d{self.parent_depth}")
        lines.append(f"|  \u26A1 state:  {self.state}")
        if self.gates:
            gate_str = " ".join(g.display() for g in self.gates)
            lines.append(f"|  \U0001F512 gates:  {gate_str}")
        if self.pin:
            lines.append(f"|  \U0001F4CC last:   \"{self.pin}\"")
        if self.look:
            lines.append(f"|  \U0001F441  look:   {self.look}")
        if self.chain:
            lines.append(f"|  \U0001F517 chain:  {self.chain}")
        lines.append(f"|  \u23F1  time:   {datetime.now().isoformat()[:19]}")
        lines.append("+" + "=" * 52 + "+")
        return "\n".join(lines)

    def rehydrate(self, tree_state=None, findings=None):
        block = ["[OLO REHYDRATE]"]
        project = self.branch.split('/')[0] if '/' in self.branch else self.branch
        block.append(f"PROJECT: {project}")
        block.append(f"ACTIVE BRANCH: {self.branch} (depth {self.depth}/{self.max_depth})")
        block.append(f"STATE: {self.state}")
        block.append("")
        if self.gates:
            block.append("DECISION GATES:")
            state_labels = {
                '\u25CF': 'YES (confirmed)', '\u25CB': 'OPEN (undecided)',
                '\u25D0': 'PARTIAL (exploring)', '\u2715': 'NO (rejected)',
                '\u25C8': 'BLOCKED (waiting)', '\u21BA': 'REVISIT (reopened)',
            }
            for g in self.gates:
                label = state_labels.get(g.state, g.state)
                block.append(f"  {g.letter}: {g.question}")
                block.append(f"     -> {g.state} {label}")
            block.append("")
        if self.pin:
            block.append(f"LAST FINDING: {self.pin}")
            block.append("")
        if findings:
            block.append("KEY FINDINGS FROM ALL BRANCHES:")
            for bname, finding in findings.items():
                block.append(f"  \U0001F4CC {bname}: \"{finding}\"")
            block.append("")
        if tree_state:
            block.append("TREE:")
            block.append(tree_state)
            block.append("")
        if self.look:
            block.append(f"CONTEXT: {self.look}")
        block.append("")
        block.append("Continue from this state. Gates show decisions. Findings are cherry-picked.")
        block.append("[/OLO REHYDRATE]")
        return "\n".join(block)

    def to_dict(self):
        return {
            'branch': self.branch, 'depth': self.depth, 'max_depth': self.max_depth,
            'parent': self.parent, 'parent_depth': self.parent_depth, 'state': self.state,
            'gates': [{'letter': g.letter, 'question': g.question, 'state': g.state} for g in self.gates],
            'pin': self.pin, 'look': self.look, 'chain': self.chain,
            'timestamp': datetime.now().isoformat(),
        }

    def save(self, path):
        Path(path).write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False))

    @classmethod
    def from_dict(cls, d):
        stamp = cls(
            branch=d.get('branch', ''), depth=d.get('depth', 0),
            max_depth=d.get('max_depth', 0), parent=d.get('parent', ''),
            parent_depth=d.get('parent_depth', 0), state=d.get('state', 'OPEN'),
            pin=d.get('pin', ''), look=d.get('look', ''), chain=d.get('chain', ''),
        )
        stamp.gates = [Gate(g['letter'], g['question'], g['state']) for g in d.get('gates', [])]
        return stamp

    @classmethod
    def load(cls, path):
        return cls.from_dict(json.loads(Path(path).read_text()))

    @classmethod
    def parse_compact(cls, line):
        if not line.startswith('[OLO|') or not line.endswith(']'):
            return None
        inner = line[1:-1]
        parts = inner.split('|')
        stamp = cls()
        for part in parts:
            if part == 'OLO':
                continue
            elif part.startswith('\U0001F33F'):
                stamp.branch = part[1:]
            elif part.startswith('\U0001F4CD'):
                nums = part[1:].split('/')
                stamp.depth = int(nums[0])
                stamp.max_depth = int(nums[1]) if len(nums) > 1 else 0
            elif part.startswith('\u2B06'):
                ref = part[1:]
                if '@d' in ref:
                    name, dp = ref.rsplit('@d', 1)
                    stamp.parent = name
                    stamp.parent_depth = int(dp)
                else:
                    stamp.parent = ref
            elif part.startswith('\u26A1'):
                stamp.state = part[1:]
            elif part.startswith('\U0001F512'):
                gs = part[1:]
                i = 0
                while i + 1 < len(gs):
                    stamp.gates.append(Gate(gs[i], "", gs[i + 1]))
                    i += 2
            elif part.startswith('\U0001F4CC'):
                stamp.pin = part[1:].replace('-', ' ')
            elif part.startswith('\U0001F441'):
                stamp.look = part[1:]
            elif part.startswith('\U0001F517'):
                stamp.chain = part[1:]
            elif part.startswith('\u23F1'):
                stamp.timestamp = part[1:]
        return stamp


def search_stamps(query, base_dir=None):
    if base_dir is None:
        base_dir = Path.home() / "gentlyos" / "sessions"
    results = []
    for sf in base_dir.rglob("*.stamp.json"):
        data = sf.read_text()
        if query.lower() in data.lower():
            results.append({'file': str(sf), 'stamp': Stamp.from_dict(json.loads(data)), 'type': 'stamp'})
    dom_dir = base_dir / "dom-saves"
    if dom_dir.exists():
        for hf in dom_dir.glob("*.html"):
            content = hf.read_text()
            if query.lower() in content.lower():
                idx = content.lower().find(query.lower())
                ctx = content[max(0, idx - 60):min(len(content), idx + len(query) + 60)]
                results.append({'file': str(hf), 'context': f"...{ctx.replace(chr(10), ' ')}...", 'type': 'dom'})
    return results


# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  OLO STAMP PROTOCOL -- DEMO")
    print("=" * 60)
    print()

    gates = [
        Gate('A', 'Blue channel for verification?', '\u25CF'),
        Gate('B', 'JPEG as kill mechanism?', '\u21BA'),
        Gate('C', 'Temporal fragmentation?', '\u2715'),
        Gate('D', 'Gematria visible or hidden?', '\u25CB'),
        Gate('E', 'Boustrophedon UX cost?', '\u25D0'),
    ]

    stamp = Stamp(
        branch="olo-guard/blue-channel", depth=7, max_depth=12,
        parent="jpeg-base", parent_depth=4, state="OPEN",
        gates=gates, pin="blue dies in JPEG 4:2:0",
        look="blue-base,jpeg-v2", chain="core3->",
    )

    print("COMPACT (prepended to every prompt):")
    compact = stamp.compact()
    print(f"  {compact}")
    print(f"  ({len(compact)} chars)")
    print()

    print("FULL DISPLAY:")
    print(stamp.full())
    print()

    print("GATE BUTTONS:")
    for g in gates:
        print(f"  {g.display()}  {g.question}")
    print()

    print("GATE CYCLING (clicking B):")
    gb = gates[1]
    for i in range(5):
        before = gb.display()
        gb.cycle()
        print(f"  click {i+1}: {before} -> {gb.display()}")
    gates[1].state = '\u21BA'
    print()

    print("REHYDRATION BLOCK:")
    tree = (
        "  main -> blue-base (checkpoint)\n"
        "    +-- jpeg-done  [DONE] pin:\"JPEG kills blue\"\n"
        "    +-- png-open   [OPEN] pin:\"PNG preserves but size\"\n"
        "    +-- webp-open  [OPEN] pin:(none)"
    )
    findings = {
        "jpeg": "JPEG 4:2:0 subsampling destroys 75% of blue channel",
        "png": "PNG preserves all channels, 3-5x file size",
    }
    print(stamp.rehydrate(tree_state=tree, findings=findings))
    print()

    print("ROUND-TRIP PARSE:")
    c = stamp.compact()
    p = Stamp.parse_compact(c)
    print(f"  branch: {stamp.branch} -> {p.branch} {'OK' if stamp.branch == p.branch else 'FAIL'}")
    print(f"  depth:  {stamp.depth}/{stamp.max_depth} -> {p.depth}/{p.max_depth} {'OK' if stamp.depth == p.depth else 'FAIL'}")
    print(f"  state:  {stamp.state} -> {p.state} {'OK' if stamp.state == p.state else 'FAIL'}")
    print(f"  gates:  {len(stamp.gates)} -> {len(p.gates)} {'OK' if len(stamp.gates) == len(p.gates) else 'FAIL'}")
    print()

    print("STAMPED PROMPT (what Claude sees):")
    print()
    print(f"  {stamp.compact()}")
    print()
    print("  What about using WebP instead of JPEG?")
    print()

    stamp.save("/tmp/test.stamp.json")
    loaded = Stamp.load("/tmp/test.stamp.json")
    print(f"Save/load: branch={loaded.branch} gates={len(loaded.gates)} OK")
    print()
    print("=" * 60)
    print("  STAMP ENGINE READY")
    print("=" * 60)
