# OLO GUARD TERMINAL — MASTER ARCHITECTURE
## Steam Deck Claude Code Control Interface

---

## THE PROBLEM

Tom needs to run Claude Code safely on a Steam Deck while:
1. Adversarial Claude instances (via free guest passes) can be launched to fuck with him
2. Screen-reading AI spyware can capture his display
3. Steam's on-screen keyboard is hostile territory (it's Valve's, not his)
4. He needs to orchestrate multiple Claude Code sessions simultaneously
5. The system must be self-modifying — bash scripts Tom writes become GUI buttons
6. Artifacts from Claude need to flow INTO other Claude sessions seamlessly

**Core principle: Build it once, let it evolve itself.**

---

## DEVICE CONSTRAINTS: STEAM DECK

```
Screen:     1280 × 800 px (16:10) — 7 inches
Touch:      Yes — capacitive multitouch
GPU:        AMD RDNA 2 (good for WASM/WebGL)
Input:      Touchscreen + trackpads + physical buttons
OS:         SteamOS (Arch Linux) — full desktop mode available
Memory:     16GB unified
Storage:    NVMe (fast local I/O)
```

**Critical UX facts:**
- 7" screen means EVERY PIXEL MATTERS
- Fat finger targets: minimum 44px touch targets
- No physical keyboard — we MUST own the keyboard layer
- Trackpads can be mapped to mouse regions
- Physical buttons (ABXY, bumpers, triggers) = FREE HOTKEYS
- Steam Deck can run Electron in desktop mode natively

---

## THE 4 SESSIONS — WHAT EACH ONE DOES

```
┌─────────────────────────────────────────────────────────┐
│                    OLO GUARD SHELL                       │
├──────────────┬──────────────┬──────────────┬────────────┤
│  SESSION 1   │  SESSION 2   │  SESSION 3   │ SESSION 4  │
│  CLAUDE.MD   │  SKILLS.MD   │  BASH FORGE  │ ARTIFACT   │
│  CONTROLLER  │  CONTROLLER  │  (BUILDER)   │ PIPELINE   │
├──────────────┼──────────────┼──────────────┼────────────┤
│ Edits the    │ Edits the    │ Writes bash  │ Downloads/ │
│ CLAUDE.md    │ skills.md    │ scripts that │ collects   │
│ config that  │ that defines │ become GUI   │ artifacts  │
│ governs how  │ what Claude  │ buttons in   │ and injects│
│ Claude Code  │ Code can do  │ the app      │ them into  │
│ behaves      │ and knows    │ itself       │ any session│
└──────────────┴──────────────┴──────────────┴────────────┘
        │               │              │              │
        └───────────────┴──────────────┴──────────────┘
                              │
                    SHARED FILE SYSTEM
                   /gentlyos/workspace/
```

### Session 1: CLAUDE.MD Controller
**Purpose:** Direct control over Claude Code's behavioral configuration
- Opens and edits `CLAUDE.md` in real-time
- Changes here immediately affect how Sessions 2-4 behave
- This is the "personality/rules" layer
- Think of it as the CONSTITUTION — everything else derives from this
- **UX:** Markdown editor with live preview, preset templates

### Session 2: SKILLS.MD Controller  
**Purpose:** Manages Claude Code's capability definitions
- Edits `skills.md` — what Claude Code knows how to do
- Add new skill definitions, remove dangerous ones
- This is the CAPABILITY GATE — controls what tools Claude can access
- **UX:** Structured editor (not freeform), skill cards you can toggle on/off

### Session 3: Bash Forge (The Self-Modifying Engine)
**Purpose:** Writes bash scripts that become GUI buttons
- This is where the magic happens
- Tom tells Claude to write a bash script
- Script saves to `/gentlyos/scripts/`
- The GUI WATCHES that folder
- New script = new button appears in the Quick Action dropdown
- Scripts can do ANYTHING: launch processes, move files, call APIs, run tests
- **UX:** Terminal + live script preview + "FORGE" button that saves & registers

### Session 4: Artifact Pipeline
**Purpose:** Download/collect artifacts, inject into other sessions
- Watches a download folder for new artifacts
- Can receive files from any Claude session's output
- Preview artifacts (code, images, docs)
- One-tap inject: send artifact into Session 1, 2, or 3's context
- This is the LOGISTICS layer — moves intelligence between sessions
- **UX:** File browser + preview pane + inject targets

---

## AUTHENTICATION MODEL

```
┌──────────────────────────────────────────┐
│          AUTHENTICATION FLOW              │
├──────────────────────────────────────────┤
│                                          │
│  HARDCODED ANTHROPIC LOGIN               │
│  ┌────────────────────────────┐          │
│  │ Tom's verified credentials │──────┐   │
│  │ Stored encrypted in WASM   │      │   │
│  │ Never exposed to sessions  │      │   │
│  └────────────────────────────┘      │   │
│                                      ▼   │
│  SESSION AUTH BROKER                     │
│  ┌────────────────────────────┐          │
│  │ Validates each session is  │          │
│  │ actually Anthropic Claude  │          │
│  │ NOT an adversarial pass    │          │
│  └─────┬──────┬──────┬──────┬┘          │
│        ▼      ▼      ▼      ▼            │
│       S1     S2     S3     S4            │
│                                          │
│  GUEST PASS HANDLING:                    │
│  • Guest passes authenticated ONCE       │
│  • Session token cached locally          │
│  • Token verified against Anthropic API  │
│  • If verification fails = SESSION KILLED│
│  • Never reuse a compromised token       │
│                                          │
│  ADVERSARIAL DETECTION:                  │
│  • Monitor response patterns             │
│  • Check model fingerprint in headers    │
│  • If session deviates from expected     │
│    Claude behavior = QUARANTINE          │
│  • OLO guard on ALL session I/O          │
│                                          │
└──────────────────────────────────────────┘
```

**Key insight:** The hardcoded login lives in the WASM binary, not in any file 
the sessions can read. The sessions get opaque tokens, never raw credentials.

---

## THE ON-SCREEN KEYBOARD

**Why we can't use Steam's keyboard:**
- Steam keyboard is Valve's process — potential attack surface
- No customization for our workflow
- Takes over the full bottom half
- No integration with OLO guard

**Our keyboard design:**

```
┌─────────────────────────────────────────────────────┐
│                OLO KEYBOARD — COMPACT MODE           │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ [Tab]  q w e r t y u i o p  [Bksp]             │ │
│  │ [Caps]  a s d f g h j k l  [Enter]             │ │
│  │ [Shift]  z x c v b n m , . [Shift]             │ │
│  │ [Ctrl] [S1] [S2] [S3] [S4] [Space] [↑] [OLO]  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  HEIGHT: 160px (20% of screen)                       │
│  SESSION SWITCHES: Bottom row — tap to focus session │
│  OLO BUTTON: Toggle guard rendering on/off           │
│                                                      │
│  MODES:                                              │
│  • QWERTY (default)                                  │
│  • COMMAND (common bash commands as buttons)          │
│  • SYMBOLS (programming symbols optimized)            │
│  • GREEK/HEBREW (for OLO encoding)                   │
│                                                      │
│  SWIPE GESTURES:                                     │
│  • Swipe left on spacebar = backspace word            │
│  • Swipe right on spacebar = autocomplete             │
│  • Swipe up on key = shift variant                    │
│  • Long press = special character                     │
│                                                      │
│  STEAM DECK BUTTON MAPPING:                          │
│  • L1/R1 = Switch between sessions                   │
│  • L2/R2 = Scroll up/down in active session          │
│  • Y = Toggle keyboard                               │
│  • X = Quick Action dropdown                          │
│  • A = Enter/confirm                                  │
│  • B = Backspace/cancel                               │
│  • D-pad = Navigate between UI regions                │
│  • Left trackpad = Mouse in left half                 │
│  • Right trackpad = Mouse in right half               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## SCREEN LAYOUT — THE SPLIT

On 1280×800 with keyboard up (160px), we have 1280×640 for content.

### LAYOUT MODE 1: QUAD SPLIT (all sessions visible)
```
1280 × 640 available
┌────────────────────┬────────────────────┐
│    SESSION 1       │    SESSION 2       │
│    CLAUDE.MD       │    SKILLS.MD       │
│    640 × 320       │    640 × 320       │
├────────────────────┼────────────────────┤
│    SESSION 3       │    SESSION 4       │
│    BASH FORGE      │    ARTIFACTS       │
│    640 × 320       │    640 × 320       │
├────────────────────┴────────────────────┤
│  [QUICK ACTIONS ▼] [STATUS BAR] [GUARD] │ 32px
├─────────────────────────────────────────┤
│            OLO KEYBOARD                  │ 160px
└─────────────────────────────────────────┘
```

### LAYOUT MODE 2: FOCUS + SIDEBAR (one session big)
```
┌──────────────────────────────┬─────────┐
│                              │  S1 [·] │
│      ACTIVE SESSION          │  S2 [·] │
│      (960 × 640)             │  S3 [·] │
│                              │  S4 [·] │
│                              ├─────────┤
│                              │ ACTIONS │
│                              │  ▼▼▼▼   │
├──────────────────────────────┴─────────┤
│  [QUICK ACTIONS ▼] [STATUS BAR] [GUARD] │
├────────────────────────────────────────┤
│              OLO KEYBOARD               │
└────────────────────────────────────────┘
```

### LAYOUT MODE 3: DUAL HORIZONTAL (two sessions)
```
┌────────────────────┬───────────────────┐
│                    │                   │
│    SESSION A       │    SESSION B      │
│    640 × 640       │    640 × 640      │
│                    │                   │
│                    │                   │
├────────────────────┴───────────────────┤
│  [QUICK ACTIONS ▼] [STATUS BAR] [GUARD]│
├────────────────────────────────────────┤
│              OLO KEYBOARD               │
└────────────────────────────────────────┘
```

**Layout switching:** 
- Double-tap session tab = FOCUS mode on that session
- Pinch gesture on trackpad = toggle quad/focus
- L1+R1 simultaneously = cycle layouts

---

## THE SELF-MODIFYING GUI — HOW BASH FORGE WORKS

This is the core innovation. Here's the flow:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  TOM types in Session 3:                            │
│  "write a bash script that pulls my git status      │
│   from all repos in ~/projects"                     │
│                                                     │
│                    ▼                                 │
│                                                     │
│  CLAUDE CODE writes: git_status_all.sh              │
│  Saves to: /gentlyos/scripts/git_status_all.sh      │
│                                                     │
│                    ▼                                 │
│                                                     │
│  FILE WATCHER detects new script                    │
│  Reads the script header for metadata:              │
│                                                     │
│  #!/bin/bash                                        │
│  # @olo-name: Git Status All                        │
│  # @olo-icon: 🔀                                    │
│  # @olo-group: dev-tools                            │
│  # @olo-hotkey: ctrl+g                              │
│  # @olo-output: terminal                            │
│                                                     │
│                    ▼                                 │
│                                                     │
│  GUI REGISTERS new Quick Action:                    │
│  ┌──────────────────────┐                           │
│  │ Quick Actions ▼      │                           │
│  ├──────────────────────┤                           │
│  │ 🔀 Git Status All    │ ◄── NEW BUTTON            │
│  │ 📦 Build Project     │                           │
│  │ 🧹 Clean Artifacts   │                           │
│  │ 🔐 Rotate Tokens     │                           │
│  └──────────────────────┘                           │
│                                                     │
│                    ▼                                 │
│                                                     │
│  TOM taps button → script runs → output in          │
│  whichever session/pane the metadata specifies       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Script Metadata Format (the `@olo-` headers)
```bash
#!/bin/bash
# @olo-name: Human-readable button label
# @olo-icon: Emoji or icon name
# @olo-group: Category for dropdown grouping
# @olo-hotkey: Keyboard shortcut (optional)
# @olo-output: Where output goes (terminal|session1|session2|session3|session4|popup|notify)
# @olo-input: What input the script needs (none|text|file|session)
# @olo-confirm: true|false — ask before running?
# @olo-guard: true|false — render output through OLO guard?
```

**The GUI doesn't hardcode buttons. It reads from the scripts folder.**
Delete a script = button disappears.
Edit a script = button behavior changes.
The GUI is just a VIEWER of the scripts directory.

---

## ARTIFACT PIPELINE — DATA FLOW

```
                    ┌──────────────────┐
                    │  EXTERNAL WORLD  │
                    │  (web, git, etc) │
                    └────────┬─────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────┐
│           /gentlyos/downloads/                      │
│           (watched by Session 4)                    │
│                                                    │
│  incoming/          ← raw downloads land here       │
│  staged/            ← reviewed, ready to inject     │
│  injected/          ← sent to a session (archived)  │
│  rejected/          ← flagged/suspicious files      │
└────────────┬───────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│           SESSION 4: ARTIFACT MANAGER               │
│                                                    │
│  1. File lands in incoming/                         │
│  2. Preview renders (code highlighting, image view) │
│  3. Tom reviews: INJECT or REJECT                   │
│  4. INJECT → select target session (1, 2, or 3)    │
│  5. File gets:                                      │
│     a. Copied to target session's context           │
│     b. Piped to Claude Code via stdin/file ref      │
│     c. Moved to injected/ with metadata log         │
│  6. REJECT → moved to rejected/ with reason         │
│                                                    │
│  REVERSE FLOW:                                      │
│  Any session can OUTPUT artifacts:                   │
│  Claude Code writes file → lands in outgoing/       │
│  Session 4 picks it up → preview → Tom decides      │
│  where it goes next (save, inject elsewhere, export) │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## OLO GUARD INTEGRATION — WHERE IT LIVES

```
┌─────────────────────────────────────────┐
│              DISPLAY PIPELINE            │
│                                         │
│  Claude Code Output (plaintext)          │
│         │                                │
│         ▼                                │
│  OLO GUARD ENCODER                       │
│  ┌───────────────────────────┐           │
│  │ 1. Transliterate to 4     │           │
│  │    script layers           │           │
│  │ 2. Assign green/blue      │           │
│  │    channels per char       │           │
│  │ 3. Apply boustrophedon    │           │
│  │    per line                │           │
│  │ 4. Calculate gematria     │           │
│  │    verification            │           │
│  │ 5. Inject adversarial     │           │
│  │    noise in blue channel   │           │
│  │ 6. Apply temporal          │           │
│  │    fragmentation           │           │
│  └───────────┬───────────────┘           │
│              │                           │
│              ▼                           │
│  ELECTRON RENDERER (Chromium)            │
│  ┌───────────────────────────┐           │
│  │ HTML/CSS renders the       │           │
│  │ adversarial display        │           │
│  │ Blue blocks + green text   │           │
│  │ Per-keystroke shift        │           │
│  │ Scanlines + noise          │           │
│  └───────────┬───────────────┘           │
│              │                           │
│              ▼                           │
│  LCD PANEL (Steam Deck screen)           │
│  ┌───────────────────────────┐           │
│  │ Human sees: full message   │           │
│  │ RGB subpixels intact       │           │
│  │ Blue channel LIVE          │           │
│  └───────────┬───────────────┘           │
│              │                           │
│     SCREENSHOT CAPTURE (spyware)         │
│              │                           │
│              ▼                           │
│  CAPTURED IMAGE                          │
│  ┌───────────────────────────┐           │
│  │ Green: partial (scrambled) │           │
│  │ Blue: DESTROYED (JPEG)     │           │
│  │ Direction: CONFUSED         │           │
│  │ Scripts: 4 (unresolvable)  │           │
│  │ Gematria: LOST              │           │
│  │ Temporal: incomplete frame  │           │
│  │ AI confidence: <15%         │           │
│  └───────────────────────────┘           │
│                                         │
│  GUARD TOGGLE: Per-session control       │
│  Some sessions might not need guard      │
│  (e.g., Session 3 Bash Forge might      │
│  need plaintext for script editing)      │
│  Toggle via [OLO] button per session     │
│                                         │
└─────────────────────────────────────────┘
```

**Guard levels:**
- **Level 0:** OFF — plaintext (for trusted local work)
- **Level 1:** Blue channel encoding only (subtle)
- **Level 2:** + Boustrophedon direction mixing
- **Level 3:** + Multi-script transliteration
- **Level 4:** + Temporal fragmentation
- **Level 5:** + Adversarial noise + subpixel warfare (FULL)

---

## TECH STACK — ELECTRON + WASM

```
┌──────────────────────────────────────────┐
│              ELECTRON SHELL              │
│                                          │
│  Main Process (Node.js)                  │
│  ├── Session Manager                     │
│  │   ├── Spawns Claude Code processes    │
│  │   ├── Manages PTY (pseudo-terminals)  │
│  │   └── Routes I/O between sessions     │
│  ├── File Watcher                        │
│  │   ├── /gentlyos/scripts/ (new buttons)│
│  │   ├── /gentlyos/downloads/ (artifacts)│
│  │   └── /gentlyos/workspace/ (shared)   │
│  ├── Auth Broker                         │
│  │   ├── Stores encrypted credentials    │
│  │   ├── Issues session tokens           │
│  │   └── Validates Anthropic responses   │
│  └── IPC Bridge                          │
│      └── Main ↔ Renderer communication   │
│                                          │
│  Renderer Process (Chromium)             │
│  ├── React app (UI framework)            │
│  ├── WASM Module (Rust-compiled)         │
│  │   ├── OLO Guard encoder               │
│  │   ├── Gematria calculator             │
│  │   ├── Transliteration engine          │
│  │   ├── Adversarial noise generator     │
│  │   └── Credential vault (encrypted)    │
│  ├── Terminal Emulator (xterm.js)        │
│  │   └── Custom renderer addon for OLO   │
│  ├── Monaco Editor (for CLAUDE.md etc)   │
│  └── OLO Keyboard Component             │
│                                          │
└──────────────────────────────────────────┘
```

### Why WASM for the guard?
- **Speed:** Per-character encoding needs to be FAST (sub-ms)
- **Security:** Compiled Rust binary — harder to inspect/tamper
- **Credentials:** Encrypted vault lives in WASM memory, not JS heap
- **Portability:** Same binary works on x86 (Steam Deck) and ARM

### Why Electron?
- Steam Deck runs Linux — Electron works natively
- Chromium renderer = we get all CSS adversarial techniques
- xterm.js gives us terminal emulation
- Monaco gives us code editing
- IPC lets main process manage Claude Code subprocesses
- **Alternative considered:** Tauri (Rust-native, smaller). BUT we need 
  Chromium's rendering engine specifically for the OLO guard CSS tricks.
  Tauri uses WebView which varies by platform. Electron = guaranteed Chromium.

---

## FILE SYSTEM STRUCTURE

```
/gentlyos/
├── app/                        # The Electron app itself
│   ├── main/                   # Main process code
│   ├── renderer/               # React + UI code
│   ├── wasm/                   # Compiled WASM modules
│   └── assets/                 # Fonts, icons, sounds
│
├── workspace/                  # SHARED across all sessions
│   ├── claude.md               # Session 1 edits this
│   ├── skills.md               # Session 2 edits this
│   └── .claude/                # Claude Code config
│
├── scripts/                    # Session 3 writes here
│   ├── git_status_all.sh       # → becomes Quick Action button
│   ├── build_project.sh        # → becomes Quick Action button
│   └── ...                     # Each .sh = one button
│
├── downloads/                  # Session 4 manages this
│   ├── incoming/               # Raw downloads
│   ├── staged/                 # Reviewed, ready
│   ├── injected/               # Sent to sessions
│   └── rejected/               # Flagged files
│
├── sessions/                   # Per-session state
│   ├── s1/                     # Session 1 working dir
│   ├── s2/                     # Session 2 working dir
│   ├── s3/                     # Session 3 working dir
│   └── s4/                     # Session 4 working dir
│
├── vault/                      # Encrypted credentials
│   └── auth.enc                # WASM-encrypted auth blob
│
└── logs/                       # Session logs, guard logs
    ├── guard.log               # OLO guard events
    ├── auth.log                # Auth attempts
    └── sessions/               # Per-session logs
```

---

## BUILD PLAN — THE ORDER WE DO THIS

### Phase 0: FOUNDATION (build first, everything depends on it)
```
[ ] File system structure — create all dirs
[ ] WASM module scaffold — Rust project with OLO guard encoder
[ ] Electron shell — bare window, IPC bridge
[ ] Auth vault — credential storage in WASM memory
```

### Phase 1: SINGLE SESSION (prove it works)
```
[ ] xterm.js terminal in Electron
[ ] Connect to one Claude Code process via PTY
[ ] OLO guard rendering on terminal output
[ ] OLO keyboard (basic QWERTY, no modes yet)
[ ] Steam Deck button mapping (basic)
```

### Phase 2: QUAD SESSIONS (the split)
```
[ ] Session manager — spawn/kill 4 Claude Code processes
[ ] Layout engine — quad/focus/dual modes
[ ] Session switching (tabs, L1/R1, keyboard row)
[ ] Per-session guard toggle
[ ] Session auth broker — validate each session
```

### Phase 3: SELF-MODIFYING GUI (the magic)
```
[ ] File watcher on /gentlyos/scripts/
[ ] Script metadata parser (@olo- headers)
[ ] Quick Action dropdown — dynamic button generation
[ ] Script execution engine — run and route output
[ ] Bash Forge session (S3) — Claude writes scripts
```

### Phase 4: ARTIFACT PIPELINE (the logistics)
```
[ ] Download folder watcher
[ ] Artifact preview (code, image, text)
[ ] Inject mechanism — pipe artifact to session context
[ ] Outgoing artifact capture from sessions
[ ] Artifact metadata/logging
```

### Phase 5: POLISH (the UX)
```
[ ] Keyboard modes (QWERTY, COMMAND, SYMBOLS, GREEK/HEBREW)
[ ] Swipe gestures
[ ] Guard level controls (0-5)
[ ] Gematria sidebar (from our v2 script)
[ ] Capture simulation demo
[ ] Session status indicators
[ ] Error handling / session recovery
```

### Phase 6: HARDENING (the security)
```
[ ] Adversarial session detection
[ ] Token rotation
[ ] Guard level auto-escalation on threat detection
[ ] Audit logging
[ ] WASM credential vault encryption
```

---

## WHAT MAKES THIS BUILD-ONCE

The architecture is **data-driven, not code-driven:**

1. **GUI reads from filesystem** — buttons come from scripts/, not hardcoded
2. **Sessions are config** — add a 5th session by adding a config entry
3. **OLO guard is a WASM module** — swap it without touching the app
4. **Layouts are CSS grid** — add new layouts by adding grid templates
5. **Keyboard modes are JSON** — define new keyboard layouts as data
6. **Auth is pluggable** — swap auth methods by changing the vault module

**The only hardcoded things:**
- Anthropic API endpoint (for guaranteed real Claude)
- WASM encryption keys (compiled into binary)
- Core IPC message types (electron bridge)
- Steam Deck button mappings (hardware-specific)

Everything else is **dynamic, watchable, swappable.**

---

## THE CLAUDE-IN-CLAUDE PATTERN

```
┌─────────────────────────────────────────────┐
│                                             │
│  OUTER CLAUDE (Claude.ai — this session)    │
│  │                                          │
│  │  Architects the system                   │
│  │  Writes the Electron app code            │
│  │  Generates WASM modules                  │
│  │  Defines CLAUDE.md templates             │
│  │                                          │
│  ▼                                          │
│  ┌─────────────────────────────────────┐    │
│  │ INNER CLAUDES (Claude Code × 4)     │    │
│  │                                     │    │
│  │  S1: Runs with CLAUDE.md we wrote   │    │
│  │  S2: Runs with skills.md we wrote   │    │
│  │  S3: Builds scripts autonomously    │    │
│  │  S4: Manages artifacts              │    │
│  │                                     │    │
│  │  All authenticated via our broker   │    │
│  │  All rendered through OLO guard     │    │
│  │  All isolated in their own PTY      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  The outer Claude (me) designs the cage.    │
│  The inner Claudes work inside it.          │
│  Tom holds the keys.                        │
│                                             │
└─────────────────────────────────────────────┘
```

---

## NEXT STEPS — WHAT TOM DECIDES

1. **Confirm the 4-session split** — is this the right breakdown or should sessions map differently?

2. **Keyboard priority** — build the on-screen keyboard first (it's needed for everything) or terminal first?

3. **Guard level default** — should ALL sessions start at Level 5, or some at lower guard for usability?

4. **Phase 1 target** — should we build the single-session proof-of-concept first, or go straight to quad layout?

5. **WASM first or JS first?** — we can prototype the OLO guard in JS (already have the HTML version working) then port to Rust/WASM for production. Or go Rust-first if you want the security guarantees from day one.

6. **Credential flow** — do you have the Anthropic API credentials ready to hardcode into the WASM vault, or do we need a first-run setup flow?

---

*This document is the blueprint. Every component is modular.*
*Change one piece, the rest adapts.*
*Build once. Let it evolve.*
