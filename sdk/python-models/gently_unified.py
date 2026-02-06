#!/usr/bin/env python3
"""
gently_unified.py — Desktop + Code CLI + Git = The Full Stack

THE THREE LAYERS:
  Claude Desktop  = THINKING  (chat in the panes, exploring, deciding)
  Claude Code CLI = DOING     (background, writes files, runs commands)
  Git             = MEMORY    (commits state, branches on new master)

HOW THEY CONNECT:

  ┌─────────────────────────────────────────────────────────────┐
  │ GENTLY WINDOW                                               │
  │ ┌──────────────────────────────────────────────────────┐    │
  │ │ CONSTANTS BAR (read-only, from parent collapse)      │    │
  │ ├──────┬──────────────┬───────────────┬────────┤    │
  │ │ LEFT │  FOCUS PANE  │ PROCESS PANE  │ RIGHT  │    │
  │ │ shelf│              │               │ shelf  │    │
  │ │      │ Claude       │ Claude        │        │    │
  │ │      │ Desktop      │ Desktop       │ artif- │    │
  │ │      │ CHAT         │ CHAT          │ acts   │    │
  │ │      │              │               │        │    │
  │ │      │ (thinking)   │ (reference)   │        │    │
  │ ├──────┴──────────────┴───────────────┤        │    │
  │ │ KEYBOARD / ARTIFACT BUCKET          │        │    │
  │ └─────────────────────────────────────┴────────┘    │
  │                                                         │
  │ ┌─────────────────────────────────────────────────┐    │
  │ │ CLAUDE CODE CLI (background process)             │    │
  │ │ • Receives instructions from Desktop chats       │    │
  │ │ • Writes files, runs tests, builds crates        │    │
  │ │ • Output feeds back as artifacts                 │    │
  │ │ • Connected to same project context              │    │
  │ └─────────────────────────────────────────────────┘    │
  │                                                         │
  │ ┌─────────────────────────────────────────────────┐    │
  │ │ GIT (state layer)                                │    │
  │ │ • Every collapse = git commit on parent branch   │    │
  │ │ • Every new window = new git branch              │    │
  │ │ • Constants = git tags (immutable references)    │    │
  │ │ • Artifacts = tracked files in the branch        │    │
  │ │ • The repo IS the project history                │    │
  │ └─────────────────────────────────────────────────┘    │
  └─────────────────────────────────────────────────────────────┘

THE MICROCOSM:
  A new master (from collapse) is:
  1. A new Claude Desktop chat (fresh context window)
  2. A new git branch (forked from parent's commit)
  3. Constants baked into the chat's system prompt
  4. Constants referenced as git tags on their source commits
  5. Claude Code CLI inherits the branch (working directory)
  6. The stamp now includes the git commit hash

  It's a complete microcosm. Self-contained. Reproducible.
  Anyone can clone the branch, read the constants, and understand.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum
import hashlib
import json


# ═══════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════

class GateState(Enum):
    OPEN = "○"; HALF = "◐"; YES = "●"; NO = "✕"; REVISIT = "↺"

class ClanState(Enum):
    ACTIVE = "active"; FROZEN = "frozen"; DONE = "done"

class Layer(Enum):
    DESKTOP = "desktop"   # Claude Desktop chat
    CODE    = "code"      # Claude Code CLI
    GIT     = "git"       # Git state


# ═══════════════════════════════════════
# GIT SIMULATION
# ═══════════════════════════════════════

@dataclass
class GitCommit:
    hash: str
    branch: str
    message: str
    timestamp: str
    parent_hash: Optional[str] = None
    tags: list = field(default_factory=list)
    files_snapshot: list = field(default_factory=list)

    def short_hash(self):
        return self.hash[:8]

    def display(self):
        tags_str = f" ({', '.join(self.tags)})" if self.tags else ""
        return f"[{self.short_hash()}] {self.branch}: {self.message}{tags_str}"


@dataclass
class GitRepo:
    """Simulated git repo tracking the project state."""
    name: str
    commits: list = field(default_factory=list)
    branches: list = field(default_factory=list)  # branch names
    current_branch: str = "main"
    tags: dict = field(default_factory=dict)  # tag_name -> commit_hash

    def _hash(self, content):
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def init(self):
        self.branches.append("main")
        c = GitCommit(
            hash=self._hash("init"),
            branch="main",
            message="init: project created",
            timestamp=datetime.now().isoformat(),
        )
        self.commits.append(c)
        return c

    def commit(self, message, files=None):
        parent = self.commits[-1] if self.commits else None
        c = GitCommit(
            hash=self._hash(f"{message}{datetime.now().isoformat()}"),
            branch=self.current_branch,
            message=message,
            timestamp=datetime.now().isoformat(),
            parent_hash=parent.hash if parent else None,
            files_snapshot=files or [],
        )
        self.commits.append(c)
        return c

    def branch(self, name):
        self.branches.append(name)
        self.current_branch = name
        return name

    def tag(self, name, commit_hash=None):
        target = commit_hash or (self.commits[-1].hash if self.commits else None)
        self.tags[name] = target
        if self.commits:
            for c in reversed(self.commits):
                if c.hash == target:
                    c.tags.append(name)
                    break
        return name

    def log(self, branch=None, limit=10):
        filtered = self.commits
        if branch:
            filtered = [c for c in self.commits if c.branch == branch]
        return filtered[-limit:]


# ═══════════════════════════════════════
# CLAUDE CODE CLI SIMULATION
# ═══════════════════════════════════════

@dataclass
class CodeTask:
    """A task executed by Claude Code CLI."""
    id: str
    instruction: str       # What Desktop chat told Code to do
    source_clan: str       # Which clan/chat triggered this
    output_files: list = field(default_factory=list)
    output_summary: str = ""
    status: str = "pending"  # pending | running | done | failed

    def display(self):
        s = {'pending': '○', 'running': '◐', 'done': '●', 'failed': '✕'}
        return f"{s.get(self.status, '?')} [{self.id}] {self.instruction[:50]}"


@dataclass
class CodeCLI:
    """Simulated Claude Code CLI process."""
    working_branch: str = "main"
    tasks: list = field(default_factory=list)
    output_files: list = field(default_factory=list)

    def execute(self, instruction, source_clan, files_produced=None, summary=""):
        task = CodeTask(
            id=f"task-{len(self.tasks)}",
            instruction=instruction,
            source_clan=source_clan,
            output_files=files_produced or [],
            output_summary=summary,
            status="done",
        )
        self.tasks.append(task)
        self.output_files.extend(files_produced or [])
        return task

    def switch_branch(self, branch):
        self.working_branch = branch


# ═══════════════════════════════════════
# CORE GENTLY ENTITIES
# ═══════════════════════════════════════

@dataclass
class Gate:
    letter: str
    question: str
    state: GateState = GateState.OPEN
    def sym(self): return f"{self.letter}{self.state.value}"


@dataclass
class Constant:
    id: str
    source_name: str
    summary: str
    gate_snapshot: list = field(default_factory=list)
    git_tag: str = ""          # Points to the commit where this was proven
    git_commit_hash: str = ""  # The exact commit
    depth: int = 0

    def display(self):
        gs = " ".join(f"{g['letter']}{g['state']}" for g in self.gate_snapshot)
        tag = f" @{self.git_tag}" if self.git_tag else ""
        return f"[CONST{tag}] {self.source_name} | \"{self.summary}\" | {gs}"


@dataclass
class Clan:
    id: str
    name: str
    starting_context: str
    state: ClanState = ClanState.ACTIVE
    depth: int = 0
    pin: str = ""
    gates: list = field(default_factory=list)
    # Linked layers:
    desktop_chat_id: str = ""    # Claude Desktop chat UUID
    code_tasks: list = field(default_factory=list)  # Tasks sent to Code CLI
    git_branch: str = ""         # Git branch this clan works on

    def summary(self):
        s = {'active': '\u25C6', 'frozen': '\u2744', 'done': '\u25CF'}
        return f"{s.get(self.state.value, '?')} {self.name} [d={self.depth}] \"{self.pin}\""


@dataclass
class GentlyWindow:
    id: str
    name: str
    parent_window_id: Optional[str] = None

    # FIXED CONSTANTS
    constants: list = field(default_factory=list)

    # LIVE STATE
    clans: list = field(default_factory=list)
    artifacts: list = field(default_factory=list)

    # LINKED LAYERS
    git_branch: str = ""          # This window's git branch
    git_commit_at_birth: str = "" # Commit hash when window spawned

    child_window_ids: list = field(default_factory=list)

    def add_clan(self, name, context, gates=None):
        clan = Clan(
            id=f"{self.id}/clan-{len(self.clans)}",
            name=name,
            starting_context=context,
            gates=gates or [],
            git_branch=f"{self.git_branch}/{name.lower().replace(' ', '-')}",
            desktop_chat_id=f"chat-{self.id}-{len(self.clans)}",
        )
        self.clans.append(clan)
        return clan


@dataclass
class GentlyApp:
    """The full stack. Desktop + Code + Git unified."""
    windows: list = field(default_factory=list)
    git: GitRepo = field(default_factory=lambda: GitRepo(name="gently-project"))
    code: CodeCLI = field(default_factory=CodeCLI)
    event_log: list = field(default_factory=list)

    def _log(self, layer, action, detail=""):
        ts = datetime.now().strftime("%H:%M:%S")
        entry = f"[{ts}] [{layer}] {action}"
        if detail:
            entry += f" — {detail}"
        self.event_log.append(entry)

    def init_project(self, name):
        """Create root window + init git + start Code CLI."""
        # Git init
        init_commit = self.git.init()
        self._log("git", "init", f"repo created, commit {init_commit.short_hash()}")

        # Root window
        win = GentlyWindow(
            id="win-root",
            name=name,
            git_branch="main",
            git_commit_at_birth=init_commit.hash,
        )
        self.windows.append(win)
        self._log("desktop", "window-open", f"root window: {name}")

        # Code CLI points to main
        self.code.switch_branch("main")
        self._log("code", "branch-switch", "main")

        return win

    def add_clan(self, window_id, name, context, gates=None):
        """Add independent clan: new Desktop chat + git branch + Code CLI context."""
        win = self._get_window(window_id)
        if not win:
            return None

        clan = win.add_clan(name, context, gates)

        # Git: create branch for this clan
        self.git.branch(clan.git_branch)
        commit = self.git.commit(f"clan-start: {name}", files=[f"{name.lower()}/context.md"])
        self._log("git", "branch", f"created {clan.git_branch}")
        self._log("git", "commit", f"{commit.short_hash()}: clan-start: {name}")

        # Desktop: new chat (simulated)
        self._log("desktop", "new-chat", f"chat {clan.desktop_chat_id} for clan '{name}'")

        # Code CLI: aware of new branch
        self._log("code", "context-update", f"clan '{name}' on branch {clan.git_branch}")

        return clan

    def code_execute(self, clan_id, instruction, files_produced=None, summary=""):
        """Desktop chat triggers Code CLI to do work."""
        clan = self._find_clan(clan_id)
        if not clan:
            return None

        # Switch Code CLI to clan's branch
        self.code.switch_branch(clan.git_branch)
        self._log("code", "branch-switch", clan.git_branch)

        # Execute task
        task = self.code.execute(instruction, clan.id, files_produced, summary)
        clan.code_tasks.append(task.id)
        self._log("code", "execute", f"{task.display()}")

        # Git: commit the output
        self.git.current_branch = clan.git_branch
        commit = self.git.commit(
            f"code: {instruction[:40]}",
            files=files_produced or []
        )
        self._log("git", "commit", f"{commit.short_hash()}: code output for {clan.name}")

        # Output becomes artifact candidate
        return task

    def clan_progress(self, clan_id, new_depth, new_pin, gate_updates=None):
        """Desktop chat makes progress — update clan state + git commit."""
        clan = self._find_clan(clan_id)
        if not clan:
            return

        clan.depth = new_depth
        clan.pin = new_pin
        if gate_updates:
            for letter, state in gate_updates.items():
                for g in clan.gates:
                    if g.letter == letter:
                        g.state = state

        # Git commit the state change
        self.git.current_branch = clan.git_branch
        commit = self.git.commit(
            f"progress: d={new_depth} pin=\"{new_pin[:30]}\"",
            files=[f"state.json"]
        )
        self._log("desktop", "progress", f"{clan.name} → d={new_depth} \"{new_pin}\"")
        self._log("git", "commit", f"{commit.short_hash()}: {clan.name} progress")

    def collapse(self, window_id, clan_ids, new_window_name):
        """
        THE FULL COLLAPSE ACROSS ALL THREE LAYERS:

        Desktop: Clans freeze, new window opens with new chat
        Code CLI: Switches to new branch, inherits file context
        Git: Commits freeze state, tags constants, creates new branch
        """
        win = self._get_window(window_id)
        if not win:
            return None

        sources = [c for c in win.clans if c.id in clan_ids and c.state == ClanState.ACTIVE]
        if len(sources) < 2:
            return None

        self._log("desktop", "COLLAPSE", f"collapsing {len(sources)} clans → {new_window_name}")

        # ─── STEP 1: Freeze each clan (all three layers) ───
        new_constants = list(win.constants)

        for clan in sources:
            clan.state = ClanState.FROZEN

            # Git: commit freeze state on clan's branch
            self.git.current_branch = clan.git_branch
            freeze_commit = self.git.commit(
                f"FROZEN: {clan.name} collapsed into {new_window_name}",
                files=["state.json", "final_stamp.txt"]
            )

            # Git: tag the freeze point (this is the constant reference)
            tag_name = f"const/{clan.name.lower().replace(' ', '-')}"
            self.git.tag(tag_name, freeze_commit.hash)

            self._log("git", "freeze", f"{clan.git_branch} → {freeze_commit.short_hash()}")
            self._log("git", "tag", f"{tag_name} → {freeze_commit.short_hash()}")
            self._log("desktop", "freeze", f"chat {clan.desktop_chat_id} closed (read-only)")

            # Build constant
            const = Constant(
                id=f"const-{clan.id}",
                source_name=clan.name,
                summary=clan.pin,
                gate_snapshot=[{'letter': g.letter, 'state': g.state.value} for g in clan.gates],
                git_tag=tag_name,
                git_commit_hash=freeze_commit.hash,
                depth=clan.depth,
            )
            new_constants.append(const)

        # ─── STEP 2: Git — merge clans into new branch ───
        new_branch = f"window/{new_window_name.lower().replace(' ', '-')}"
        self.git.branch(new_branch)
        merge_commit = self.git.commit(
            f"COLLAPSE: {' + '.join(c.name for c in sources)} → {new_window_name}",
            files=["constants.json", "synthesis_prompt.md"]
        )

        # Tag the merge point
        self.git.tag(f"window/{new_window_name.lower().replace(' ','-')}/birth", merge_commit.hash)

        self._log("git", "branch", f"created {new_branch}")
        self._log("git", "merge-commit", f"{merge_commit.short_hash()}: collapse merge")

        # ─── STEP 3: Spawn new window ───
        import random
        child = GentlyWindow(
            id=f"win-{random.randint(1000,9999)}",
            name=new_window_name,
            parent_window_id=win.id,
            constants=new_constants,
            git_branch=new_branch,
            git_commit_at_birth=merge_commit.hash,
        )
        win.child_window_ids.append(child.id)
        self.windows.append(child)

        self._log("desktop", "window-open", f"new window: {new_window_name}")
        self._log("desktop", "constants-loaded", f"{len(new_constants)} constants baked in")

        # ─── STEP 4: Code CLI switches to new branch ───
        self.code.switch_branch(new_branch)
        self._log("code", "branch-switch", f"{new_branch}")
        self._log("code", "context-update", f"inherits files from {len(sources)} collapsed clans")

        # ─── STEP 5: Build synthesis prompt ───
        prompt = self._build_synthesis(new_window_name, new_constants, merge_commit)
        self._log("desktop", "synthesis-prompt", f"auto-generated for new master chat")

        return child, merge_commit, prompt

    def _build_synthesis(self, name, constants, commit):
        lines = [
            f"=== GENTLY WINDOW: {name} ===",
            f"Git: {commit.branch} @ {commit.short_hash()}",
            f"Constants (immutable, {len(constants)} total):",
            "",
        ]
        for c in constants:
            gs = " ".join(f"{g['letter']}{g['state']}" for g in c.gate_snapshot)
            lines.append(f"  [{c.git_tag}] {c.source_name}")
            lines.append(f"    \"{c.summary}\"")
            lines.append(f"    gates: {gs} | depth: {c.depth}")
            lines.append("")

        lines.append("=== BUILD ON THESE CONSTANTS ===")
        return "\n".join(lines)

    def stamp(self, clan_id):
        """Generate stamp including git hash."""
        clan = self._find_clan(clan_id)
        if not clan:
            return "[OLO|?]"
        gs = "".join(g.sym() for g in clan.gates)
        recent = [c for c in self.git.commits if c.branch == clan.git_branch]
        git_hash = recent[-1].short_hash() if recent else "0000"
        ts = datetime.now().strftime("%m%dT%H%M")
        pin = clan.pin[:20].replace(" ", "-") if clan.pin else ""
        return f"[OLO|\U0001F33F{clan.git_branch}|\U0001F4CD{clan.depth}|\U0001F512{gs}|\U0001F4CC{pin}|\u0023{git_hash}|\u23F1{ts}]"

    def _get_window(self, wid):
        return next((w for w in self.windows if w.id == wid), None)

    def _find_clan(self, cid):
        for w in self.windows:
            for c in w.clans:
                if c.id == cid:
                    return c
        return None


# ═══════════════════════════════════════
# DEMO
# ═══════════════════════════════════════

if __name__ == "__main__":
    SEP = "=" * 64

    print(SEP)
    print("  GENTLY UNIFIED — Desktop + Code CLI + Git")
    print(SEP)
    print()

    app = GentlyApp()

    # ─── Init project ───
    w0 = app.init_project("OLO Guard")
    print("\u25B8 PROJECT INITIALIZED")
    print()

    # ─── Add independent clans ───
    print("\u25B8 ADDING CLANS (each gets: new chat + git branch + Code context)")
    print("-" * 48)

    clan_a = app.add_clan(w0.id, "Blue Channel", "Color theory, RGB...",
                           gates=[Gate('A', 'Blue survives?'), Gate('B', 'Blue detectable?')])

    clan_b = app.add_clan(w0.id, "JPEG Internals", "JPEG spec, DCT...",
                           gates=[Gate('C', 'Quantization OK?'), Gate('D', 'Subsampling works?')])

    clan_c = app.add_clan(w0.id, "Gematria", "Hebrew letters, 72 Names...",
                           gates=[Gate('E', 'Fits in blue?')])
    print()

    # ─── Desktop chat progresses clan A ───
    print("\u25B8 CLAN A: Desktop chat explores, Code CLI builds, Git commits")
    print("-" * 48)

    app.clan_progress(clan_a.id, 3, "blue channel isolated in test images",
                      {'A': GateState.HALF})

    # Code CLI does work triggered by desktop chat
    app.code_execute(clan_a.id,
        "Write blue channel extraction in Rust",
        files_produced=["src/blue_extract.rs", "tests/blue_test.rs"],
        summary="Extracts blue channel, measures preservation across formats"
    )

    app.clan_progress(clan_a.id, 6, "blue verified as carrier",
                      {'A': GateState.YES, 'B': GateState.HALF})

    app.code_execute(clan_a.id,
        "Benchmark blue preservation across JPEG quality levels",
        files_produced=["benches/quality_sweep.rs", "results/quality_data.json"],
        summary="Blue loss measured: 73.2% avg at q=85 with 4:2:0"
    )

    app.clan_progress(clan_a.id, 8, "blue carrier confirmed, loss quantified",
                      {'B': GateState.YES})
    print()

    # ─── Clan B progresses ───
    print("\u25B8 CLAN B: JPEG deep dive")
    print("-" * 48)

    app.clan_progress(clan_b.id, 4, "DCT coefficient analysis complete",
                      {'C': GateState.YES})

    app.code_execute(clan_b.id,
        "Build JPEG decoder that exposes quantization tables",
        files_produced=["src/jpeg_decode.rs", "src/quant_tables.rs"],
        summary="Custom decoder extracts and logs all quantization decisions"
    )

    app.clan_progress(clan_b.id, 6, "4:2:0 subsampling destroys 75% chroma",
                      {'D': GateState.YES})
    print()

    # ─── Show stamps with git hashes ───
    print("\u25B8 STAMPS (now include git commit hash)")
    print("-" * 48)
    print(f"  Clan A: {app.stamp(clan_a.id)}")
    print(f"  Clan B: {app.stamp(clan_b.id)}")
    print(f"  Clan C: {app.stamp(clan_c.id)}")
    print()

    # ─── COLLAPSE ───
    print(SEP)
    print("  COLLAPSE: Blue + JPEG → Full Stack Transition")
    print(SEP)
    print()

    w1, merge_commit, prompt = app.collapse(w0.id, [clan_a.id, clan_b.id], "Blue+JPEG Synthesis")

    print()
    print(f"  New window: {w1.name}")
    print(f"  Git branch: {w1.git_branch}")
    print(f"  Born at commit: {merge_commit.short_hash()}")
    print(f"  Constants: {len(w1.constants)}")
    print()
    print("  SYNTHESIS PROMPT (auto-generated, includes git refs):")
    print()
    for line in prompt.split('\n'):
        print(f"    {line}")
    print()

    # ─── New clan in Window 1, Code CLI on new branch ───
    print("\u25B8 WINDOW 1: New work builds on constants")
    print("-" * 48)

    s1 = app.add_clan(w1.id, "Encoding Strategy",
                       "Given constants: blue=carrier, JPEG=kill. How to encode?",
                       gates=[Gate('F', 'Frequency domain?'), Gate('G', 'Error correction?')])

    app.clan_progress(s1.id, 3, "freq domain encoding survives recompression",
                      {'F': GateState.YES})

    app.code_execute(s1.id,
        "Implement frequency domain encoder using DCT coefficients",
        files_produced=["src/freq_encoder.rs", "src/dct_embed.rs"],
        summary="Encoder embeds data in mid-frequency DCT coefficients"
    )
    print()

    # ─── Full event log ───
    print(SEP)
    print("  FULL EVENT LOG (all three layers interleaved)")
    print(SEP)
    print()
    for entry in app.event_log:
        # Color-code by layer
        if "[desktop]" in entry:
            print(f"  \u25C6 {entry}")
        elif "[code]" in entry:
            print(f"  \u2699 {entry}")
        elif "[git]" in entry:
            print(f"  \u2B50 {entry}")
        else:
            print(f"  ? {entry}")
    print()

    # ─── Git log ───
    print(SEP)
    print("  GIT LOG (full history)")
    print(SEP)
    print()
    for commit in app.git.commits:
        print(f"  {commit.display()}")
        if commit.files_snapshot:
            for f in commit.files_snapshot:
                print(f"    + {f}")
    print()
    print(f"  Branches: {', '.join(app.git.branches)}")
    print(f"  Tags: {json.dumps(dict((k, v[:8]) for k, v in app.git.tags.items()), indent=4)}")
    print()

    # ─── The full picture ───
    print(SEP)
    print("  THE MICROCOSM")
    print(SEP)
    print()
    print("  Every new master (collapse → new window) creates:")
    print()
    print("    DESKTOP:  New Claude chat with constants as system prompt")
    print("              The chat knows what was proven below")
    print("              It doesn't know HOW it was proven")
    print()
    print("    CODE CLI:  Switches to new git branch")
    print("               Has access to all files from collapsed clans")
    print("               Can reference code from any constant's source")
    print("               Working directory = the synthesized project")
    print()
    print("    GIT:       New branch from merge commit")
    print("               Constants are tagged commits (immutable)")
    print("               `git log --oneline` shows the journey")
    print("               `git tag -l 'const/*'` lists all proven truths")
    print("               `git diff const/blue-channel..HEAD` shows what's new")
    print()
    print("  THE STAMP NOW INCLUDES GIT:")
    print(f"    {app.stamp(s1.id)}")
    print()
    print("    The #hash links the stamp to a specific commit.")
    print("    Any Claude, any window, any time — read the stamp,")
    print("    checkout the commit, read the constants, know everything.")
    print()
    print(SEP)
    print("  UNIFIED MODEL VALIDATED")
    print(SEP)
