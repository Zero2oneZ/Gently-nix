# OLO GUARD v2 — CHROMIUM TAB ORGANIZER ARCHITECTURE
## 2-Session Split + Conversation Chain Management

---

## THE PIVOT — WHY THIS IS RIGHT

**Old plan:** Build a full Electron app with 4 embedded terminals.
**New plan:** Wrap Chromium's existing tab infrastructure. Don't rebuild what Chrome already does.

**Chrome already gives us:**
- Tab management (create, close, group, reorder)
- Tab groups with colors and labels
- Split-screen via side-by-side tabs
- Bookmarks API with folders and metadata
- Session persistence (tabs survive restart)
- URL = conversation identity (claude.ai/chat/{uuid})
- Extension APIs for full tab control
- Web workers for background processing

**What Chrome DOESN'T give us (what we build):**
- Vertical accordion tab groups with nesting
- Conversation chaining (linking tabs in thought-order)
- Context labeling (tagging conversations by project/action)
- 2-session split view management
- OLO guard overlay
- Cross-tab artifact passing
- Chat collection/organization view

---

## THE MENTAL MODEL

Think of it like this:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  TRADITIONAL CHROME:                                    │
│  [Tab1] [Tab2] [Tab3] [Tab4] ... → horizontal, flat    │
│                                                         │
│  OLO ORGANIZER:                                         │
│                                                         │
│  ┌─ PROJECT: GentlyOS Build ──────────────────────┐     │
│  │  ▼ Track 1: Core Architecture                  │     │
│  │  │  ├── Chat: Rust crate structure    [chain 1] │     │
│  │  │  ├── Chat: WASM compilation        [chain 2] │     │
│  │  │  └── Chat: IPC bridge design       [chain 3] │     │
│  │  │                                              │     │
│  │  ▶ Track 2: OLO Guard (collapsed)              │     │
│  │  │  ├── Chat: Blue channel math                │     │
│  │  │  ├── Chat: Gematria engine                  │     │
│  │  │  └── Chat: Adversarial testing              │     │
│  │  │                                              │     │
│  │  ▶ Track 3: Steam Deck UI (collapsed)          │     │
│  │     ├── Chat: Keyboard design                  │     │
│  │     └── Chat: Layout system                    │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─ PROJECT: Security Research ───────────────────┐     │
│  │  ▶ Track 1: UEFI Analysis (collapsed)          │     │
│  │  ▶ Track 2: Cipher Detection (collapsed)       │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  Each "Chat" = a real Claude.ai tab                     │
│  Each "Track" = an accordion group of related chats     │
│  Each "Project" = a top-level organizer                 │
│  Chains = ordered links between chats in a track        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## HIERARCHY: 3 LEVELS

```
PROJECT (top level)
  └── TRACK (accordion group — the "2nd track" concept)
        └── CHAIN (ordered sequence of chats)
              └── CHAT (single Claude.ai conversation = one tab)
```

### PROJECT
- Named container for a body of work
- Examples: "GentlyOS Build", "Security Research", "Latin Class"
- Has a color and icon
- Can be collapsed to hide all tracks
- Maps to a Chrome bookmark folder

### TRACK
- A parallel workstream within a project
- "Off-focus but on-project" — this is your 2nd track idea
- Accordion behavior: expand one, others collapse
- But MULTIPLE tracks can be expanded simultaneously
- Think of it like having 3 conversations going at once about different aspects of the same project
- Maps to a Chrome tab group

### CHAIN
- Ordered sequence of chats within a track
- Represents a THREAD OF THOUGHT across multiple conversations
- Chain order = the order you want to read them to reconstruct context
- When you open a new Claude chat to continue a thought, it chains to the previous one
- Chain is stored as metadata (bookmark tags or extension storage)

### CHAT
- Single Claude.ai conversation
- URL: https://claude.ai/chat/{uuid}
- This IS a Chrome tab
- The atomic unit — everything else is organization around this

---

## 2-SESSION SPLIT — THE VIEW

```
┌────────────────────────────────────────────────────────────────┐
│ OLO GUARD                    [🔒 Level 3]  [≡ Organizer]      │
├────────────┬───────────────────────────────────────────────────┤
│            │                                                   │
│ ORGANIZER  │              MAIN VIEW                            │
│ (vertical  │                                                   │
│  sidebar)  │  ┌─────────────────────┬────────────────────────┐ │
│            │  │                     │                        │ │
│ ┌────────┐ │  │    SESSION A        │     SESSION B          │ │
│ │PROJECT │ │  │    (FOCUS)          │     (REFERENCE)        │ │
│ │GentlyOS│ │  │                     │                        │ │
│ ├────────┤ │  │  Active Claude      │  Reference Claude      │ │
│ │▼Track1 │ │  │  conversation       │  conversation          │ │
│ │ Chat 1 │ │  │                     │                        │ │
│ │ Chat 2◄├─┤──│  You're working     │  Previous chat in      │ │
│ │ Chat 3 │ │  │  HERE               │  the chain, or a       │ │
│ │        │ │  │                     │  parallel track         │ │
│ │▶Track2 │ │  │                     │                        │ │
│ │(closed)│ │  │                     │                        │ │
│ │        │ │  │                     │                        │ │
│ │▶Track3 │ │  │                     │                        │ │
│ │(closed)│ │  │                     │                        │ │
│ ├────────┤ │  │                     │                        │ │
│ │PROJECT │ │  │                     │                        │ │
│ │Security│ │  │                     │                        │ │
│ │▶Track1 │ │  │                     │                        │ │
│ └────────┘ │  └─────────────────────┴────────────────────────┘ │
│            │                                                   │
├────────────┴───────────────────────────────────────────────────┤
│ [+ New Chat] [⟁ Chain to Current] [📎 Collect] [▣ Guard]      │
└────────────────────────────────────────────────────────────────┘
```

### SESSION A: FOCUS
- The chat you're actively typing in
- Full keyboard input goes here
- OLO guard renders here at your set level
- This is where the work happens

### SESSION B: REFERENCE
- Read-only or secondary conversation
- Might be the PREVIOUS chat in the chain (so you can see context)
- Might be a PARALLEL TRACK chat (so you can cross-reference)
- Click any chat in the organizer → opens in Session B
- Double-click → promotes to Session A (swaps)

### Split behavior:
- **Default:** 60/40 split (A gets more space)
- **Focus mode:** A goes full width, B collapses to a thin strip
- **Equal mode:** 50/50
- **Flip:** Swap A and B positions
- Drag the divider to resize

---

## THE ORGANIZER SIDEBAR — DETAILED

```
┌──────────────────────────┐
│ OLO ORGANIZER            │  ← Fixed header
├──────────────────────────┤
│ 🔍 Search chats...       │  ← Search across all chats
├──────────────────────────┤
│                          │
│ ┌── 🟢 GentlyOS Build ──┐│  ← PROJECT (colored dot)
│ │                        ││
│ │ ▼ Core Architecture    ││  ← TRACK (expanded)
│ │   ┌──────────────────┐ ││
│ │   │ 1. Crate struct  │ ││  ← CHAT (numbered = chain order)
│ │   │    2h ago        │ ││     Timestamp
│ │   ├──────────────────┤ ││
│ │   │ 2. WASM compile ◄│─││  ← ◄ = currently in Session B
│ │   │    1h ago        │ ││
│ │   ├──────────────────┤ ││
│ │   │ 3. IPC bridge   ●│ ││  ← ● = currently in Session A
│ │   │    active        │ ││     (active = you're in this chat)
│ │   └──────────────────┘ ││
│ │   [+ Continue chain]   ││  ← Creates new chat, chains to #3
│ │                        ││
│ │ ▶ OLO Guard ─────(3)──││  ← TRACK (collapsed), (3) = chat count
│ │ ▶ Steam Deck UI ─(2)──││
│ │ ▶ Linux Migration (1)──││
│ │                        ││
│ │ [+ New Track]          ││
│ └────────────────────────┘│
│                          │
│ ┌── 🔴 Security ────────┐│  ← Another PROJECT
│ │ ▶ UEFI Analysis ─(4)──││
│ │ ▶ Cipher Work ───(2)──││
│ └────────────────────────┘│
│                          │
│ ┌── 🟡 Latin Class ─────┐│
│ │ ▶ Homework ──────(3)──││
│ └────────────────────────┘│
│                          │
│ [+ New Project]          │
│                          │
├──────────────────────────┤
│ 📊 Stats                 │  ← Footer
│ 14 chats │ 3 projects    │
│ Chain depth: 3           │
│ Guard: Level 3 🟢        │
└──────────────────────────┘
```

### Interactions:

**Click chat** → Opens in Session B (reference)
**Double-click chat** → Opens in Session A (focus), previous A moves to B
**Drag chat** → Reorder within chain, or move between tracks
**Right-click chat** → Context menu: rename, label, move, delete, copy URL
**Click track header** → Expand/collapse (accordion)
**Ctrl+click track** → Expand WITHOUT collapsing others (multi-expand)
**Click project header** → Collapse entire project
**[+ Continue chain]** → Opens new Claude.ai chat, auto-chains to last in track
**[+ New Track]** → Creates new track, opens first chat in it

### Chat card info:
```
┌──────────────────────────┐
│ 3. IPC bridge design   ● │  Chain #, title, active dot
│    🕐 active  💬 24 msgs  │  Time, message count
│    #rust #wasm #ipc       │  Labels/tags
│    ← Chat 2  → (none)    │  Chain links (prev/next)
└──────────────────────────┘
```

---

## CONVERSATION CHAINING — HOW IT WORKS

```
CHAIN: A linked list of Claude.ai chat URLs

Chat 1 ──→ Chat 2 ──→ Chat 3 ──→ Chat 4 (current)
  │           │          │          │
  URL_A      URL_B     URL_C      URL_D

Stored as:
{
  chain_id: "gentlyos-core-arch",
  track: "Core Architecture",
  project: "GentlyOS Build",
  links: [
    { order: 1, url: "https://claude.ai/chat/abc123", title: "Crate structure", created: "...", labels: ["rust"] },
    { order: 2, url: "https://claude.ai/chat/def456", title: "WASM compilation", created: "...", labels: ["wasm"] },
    { order: 3, url: "https://claude.ai/chat/ghi789", title: "IPC bridge", created: "...", labels: ["ipc"] },
  ]
}
```

### Chain operations:

**Continue chain:**
1. User clicks [+ Continue chain] at end of a track
2. Extension opens new tab: `https://claude.ai/new` (or `/chat/new`)
3. Tab URL updates when Claude creates the conversation
4. Extension captures the new URL
5. Appends to chain with `order: N+1`
6. Title auto-populated from first message (editable)

**Insert into chain:**
- Drag a chat between two existing chain links
- Chain reorders automatically

**Fork chain:**
- Right-click a chat → "Fork from here"
- Creates a new track starting from that chat's context
- The original chain continues independently
- The fork starts a new chain with chat #1 being a new conversation
  that references the fork point

**Merge chains:**
- Drag one track onto another
- Chains concatenate (or interleave by timestamp)

---

## COLLECTING ARTIFACTS — THE PIPELINE

When Claude outputs code, files, or content you want to keep:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  In Session A, Claude generates an artifact         │
│  (code block, file, analysis, etc.)                 │
│                                                     │
│  Tom clicks [📎 Collect] button in bottom bar        │
│  OR right-clicks content → "Collect to OLO"         │
│                                                     │
│              ▼                                       │
│                                                     │
│  COLLECT DIALOG:                                    │
│  ┌──────────────────────────────────┐               │
│  │ Collecting from: IPC bridge (#3)  │               │
│  │                                  │               │
│  │ Type: [code ▼]                   │               │
│  │ Label: [ipc-bridge-v1]           │               │
│  │ Save to: [GentlyOS > Core Arch ▼]│               │
│  │                                  │               │
│  │ [ ] Also inject into Session B   │               │
│  │ [ ] Pin to track notes           │               │
│  │                                  │               │
│  │ [Cancel]  [Collect]              │               │
│  └──────────────────────────────────┘               │
│                                                     │
│              ▼                                       │
│                                                     │
│  Artifact stored in extension storage:              │
│  {                                                  │
│    source_chat: "ghi789",                           │
│    source_chain: "gentlyos-core-arch",              │
│    type: "code",                                    │
│    label: "ipc-bridge-v1",                          │
│    content: "...",                                   │
│    timestamp: "..."                                  │
│  }                                                  │
│                                                     │
│  Artifact becomes available in:                     │
│  1. Track notes (pinned reference)                  │
│  2. Inject menu (paste into any session)            │
│  3. Search results                                  │
│  4. Export (download as file)                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Injecting artifacts into a chat:

```
In Session A or B, Tom wants to reference a collected artifact:

1. Click [📎] or type /inject
2. Artifact picker appears:
   ┌──────────────────────────────────┐
   │ 🔍 Search artifacts...            │
   ├──────────────────────────────────┤
   │ 📄 ipc-bridge-v1        (code)   │
   │ 📄 crate-layout-v2      (code)   │
   │ 📝 wasm-notes           (text)   │
   │ 🖼️ ui-mockup-3          (image)  │
   └──────────────────────────────────┘
3. Click artifact → pastes into chat input
4. Tom adds context → sends to Claude
5. Claude now has the artifact in context
```

---

## CHROME EXTENSION vs ELECTRON — THE DECISION

### Option A: Chrome Extension (RECOMMENDED)

```
PROS:
+ Lightest weight — no separate app to install
+ Uses Chrome's actual tab infrastructure (not emulating it)
+ chrome.tabs API gives us full tab control
+ chrome.bookmarks API for persistence
+ chrome.sidePanel API for the organizer sidebar
+ chrome.storage API for chains, labels, artifacts
+ Content scripts can inject OLO guard into Claude.ai pages
+ Works with Chrome, Edge, Brave, any Chromium browser
+ Auto-updates via Chrome Web Store (or self-hosted)
+ Steam Deck has Chrome available in desktop mode

CONS:
- Limited local file access (no direct /gentlyos/ folder watching)
- Extension storage limits (but chrome.storage.local = 10MB+)
- OLO guard runs in content script context (less isolated)
- No PTY access (can't spawn Claude Code CLI directly)
```

### Option B: Electron with Chrome Extension Bridge

```
PROS:
+ Full filesystem access
+ Can spawn Claude Code CLI processes
+ WASM vault for credentials
+ Complete OLO guard isolation

CONS:
- Rebuilding tab management that Chrome already does
- Heavier (Chromium embedded = 200MB+)
- More code to maintain
```

### RECOMMENDATION: Chrome Extension FIRST

Build the Chrome Extension for the organizer + tab management + artifact collection.
The OLO guard overlay goes in as a content script on claude.ai pages.
If we need Claude Code CLI integration later, we add a tiny local bridge 
(a Node.js server that the extension talks to via localhost).

This is faster to build, lighter to run, and USES Chrome instead of fighting it.

---

## EXTENSION ARCHITECTURE

```
olo-guard-extension/
│
├── manifest.json              # Extension config (Manifest V3)
│
├── background/
│   └── service-worker.js      # Background service worker
│       ├── Tab manager         # Track tabs, detect claude.ai URLs
│       ├── Chain manager       # Maintain conversation chains
│       ├── Storage manager     # Persist projects/tracks/chains
│       └── Message broker      # Route messages between components
│
├── sidepanel/
│   ├── sidepanel.html         # The organizer sidebar
│   ├── sidepanel.css
│   └── sidepanel.js
│       ├── Project list        # Accordion project/track/chain view
│       ├── Chat cards          # Individual conversation cards
│       ├── Search              # Search across all chats
│       ├── Artifact browser    # View/inject collected artifacts
│       └── Stats footer        # Chat count, guard status
│
├── content/
│   ├── olo-guard.js           # OLO guard overlay (injected into claude.ai)
│   ├── olo-guard.css          # Guard styling
│   ├── collector.js           # Artifact collection from page content
│   └── chat-detector.js       # Detect chat URL, title, message count
│
├── popup/
│   ├── popup.html             # Quick access popup (extension icon click)
│   └── popup.js               # Quick actions, guard toggle, new chat
│
├── split-view/
│   ├── split.html             # Split view manager (opens as a tab)
│   └── split.js               # Embeds two claude.ai iframes side-by-side
│                               # OR manages two browser windows
│
├── keyboard/
│   ├── keyboard.html          # OLO keyboard overlay
│   ├── keyboard.css
│   └── keyboard.js            # Touch keyboard with session switching
│
├── lib/
│   ├── transliterate.js       # Greek/Latin/Hebrew transliteration
│   ├── gematria.js            # Gematria calculation engine
│   ├── olo-encoder.js         # OLO guard encoding pipeline
│   └── storage-schema.js      # Data model definitions
│
└── assets/
    ├── icons/
    └── fonts/
```

---

## DATA MODEL — WHAT WE STORE

```javascript
// PROJECT
{
  id: "proj_abc123",
  name: "GentlyOS Build",
  color: "#00ff41",        // Green
  icon: "🟢",
  created: "2026-02-01T...",
  tracks: ["track_001", "track_002", "track_003"],
  collapsed: false
}

// TRACK
{
  id: "track_001",
  project_id: "proj_abc123",
  name: "Core Architecture",
  chain: ["chat_aaa", "chat_bbb", "chat_ccc"],  // Ordered
  collapsed: false,
  notes: "Working on the Rust crate layout and IPC bridge",
  pinned_artifacts: ["artifact_001"]
}

// CHAT (conversation reference)
{
  id: "chat_aaa",
  track_id: "track_001",
  url: "https://claude.ai/chat/abc-def-123",
  title: "Crate structure design",          // Auto or manual
  chain_order: 1,
  created: "2026-02-01T10:00:00Z",
  last_active: "2026-02-01T10:45:00Z",
  message_count: 24,                        // Detected from page
  labels: ["rust", "architecture"],
  status: "completed"                        // active|completed|parked|archived
}

// ARTIFACT
{
  id: "artifact_001",
  source_chat_id: "chat_ccc",
  source_chain: "track_001",
  type: "code",                              // code|text|image|file
  language: "rust",                          // For code artifacts
  label: "ipc-bridge-v1",
  content: "pub struct IpcBridge { ... }",
  collected_at: "2026-02-01T11:30:00Z",
  injected_into: ["chat_ddd"],               // Track where it was used
  pinned: true
}

// GUARD STATE
{
  level: 3,                                  // 0-5
  per_tab_overrides: {
    "chat_aaa": 0,                           // This chat has guard off
    "chat_ccc": 5                            // This chat is max guard
  },
  shift_count: 4521,
  active_scripts: ["green_blue_split", "boustrophedon"]
}
```

---

## THE SPLIT VIEW — HOW 2 SESSIONS WORK

Chrome doesn't natively support side-by-side tabs in one window.
Three approaches:

### Approach 1: Two Windows (SIMPLEST)
```
Window 1 (left half of screen):  Session A (focus)
Window 2 (right half of screen): Session B (reference)

The extension manages both windows.
Clicking a chat in the organizer sidebar opens it in Window 2.
Double-clicking swaps which window a chat is in.

On Steam Deck: use SteamOS window tiling (built-in).
```

### Approach 2: Split Tab Page (MOST INTEGRATED)
```
Open a special extension page: chrome-extension://xxx/split.html

This page contains two iframes:
┌─────────────────────┬────────────────────┐
│ <iframe src=         │ <iframe src=        │
│  "claude.ai/chat/A"> │  "claude.ai/chat/B">│
│                     │                    │
│  SESSION A          │  SESSION B         │
│                     │                    │
└─────────────────────┴────────────────────┘

Problem: claude.ai might block iframing (X-Frame-Options).
Solution: Content script removes the header, or we use 
          chrome.declarativeNetRequest to strip it.
```

### Approach 3: Side Panel + Main Tab (CLEANEST)
```
Main browser tab:     Session A (full Claude.ai chat)
Chrome Side Panel:    Session B (embedded or linked reference)

The Side Panel is our organizer + a small chat preview.
This is the most Chrome-native approach.

Limitation: Side Panel is narrower than a full tab.
Good for: Reference/reading. Less good for active typing.
```

### RECOMMENDATION: Approach 1 (Two Windows) + Side Panel Organizer

```
┌─ WINDOW 1 ──────────────────────────────────────────┐
│ ┌─ Side Panel ─┐ ┌─ Main Tab ─────────────────────┐ │
│ │  ORGANIZER   │ │                                 │ │
│ │              │ │  claude.ai/chat/xyz              │ │
│ │  Projects    │ │                                 │ │
│ │  Tracks      │ │  SESSION A (FOCUS)              │ │
│ │  Chains      │ │                                 │ │
│ │              │ │  Full Claude.ai interface        │ │
│ │  [Actions]   │ │  OLO guard overlay active        │ │
│ │              │ │                                 │ │
│ └──────────────┘ └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

┌─ WINDOW 2 ──────────────────────────────────────────┐
│ ┌─ Main Tab ──────────────────────────────────────┐ │
│ │                                                 │ │
│ │  claude.ai/chat/abc                              │ │
│ │                                                 │ │
│ │  SESSION B (REFERENCE)                          │ │
│ │                                                 │ │
│ │  Previous chat in chain, or parallel track       │ │
│ │  OLO guard overlay active                        │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

Steam Deck: Tile these left/right using desktop mode.
Desktop: Snap left/right with OS window management.
```

---

## ACCORDION BEHAVIOR — THE TRACK SWITCHING

```
STATE 1: Track 1 expanded, others collapsed
┌────────────────────────┐
│ ▼ Core Architecture    │  ← EXPANDED (tall)
│   Chat 1: Crate struct │
│   Chat 2: WASM compile │
│   Chat 3: IPC bridge   │
│   [+ Continue chain]   │
│                        │
│ ▶ OLO Guard ──── (3)  │  ← COLLAPSED (one line)
│ ▶ Steam Deck UI  (2)  │  ← COLLAPSED (one line)
│ ▶ Linux Migration (1) │  ← COLLAPSED (one line)
└────────────────────────┘

STATE 2: User clicks "OLO Guard" — it expands, others stay
(Ctrl+click = multi-expand, regular click = exclusive expand)

┌────────────────────────┐
│ ▶ Core Architecture (3)│  ← COLLAPSED
│                        │
│ ▼ OLO Guard            │  ← EXPANDED
│   Chat 1: Blue channel │
│   Chat 2: Gematria     │
│   Chat 3: Adversarial  │
│   [+ Continue chain]   │
│                        │
│ ▶ Steam Deck UI  (2)  │  ← COLLAPSED
│ ▶ Linux Migration (1) │  ← COLLAPSED
└────────────────────────┘

STATE 3: Multi-expand (Ctrl+click "Core Architecture")

┌────────────────────────┐
│ ▼ Core Architecture    │  ← EXPANDED
│   Chat 1: Crate struct │
│   Chat 2: WASM compile │
│   Chat 3: IPC bridge   │
│                        │
│ ▼ OLO Guard            │  ← ALSO EXPANDED
│   Chat 1: Blue channel │
│   Chat 2: Gematria     │
│   Chat 3: Adversarial  │
│                        │
│ ▶ Steam Deck UI  (2)  │  ← Still collapsed
│ ▶ Linux Migration (1) │  ← Still collapsed
└────────────────────────┘

This lets Tom have "2nd track discussions progressing"
while staying focused on the primary track.
```

---

## BUILD ORDER — WHAT WE CODE FIRST

### Sprint 1: SKELETON (get tabs organized)
```
[ ] manifest.json — Extension scaffold
[ ] service-worker.js — Detect claude.ai tabs, capture URLs
[ ] sidepanel.html/js — Basic sidebar with project/track/chain list
[ ] storage-schema.js — Data model for projects/tracks/chats
[ ] Basic CRUD: create project, create track, add chat to track
[ ] Click chat in sidebar → activates that tab
```

### Sprint 2: CHAIN MANAGEMENT (link thoughts)
```
[ ] Auto-detect new claude.ai/chat/ URLs
[ ] "Chain to current" button — link new chat to active track
[ ] Chain ordering — drag to reorder
[ ] Chain navigation — prev/next buttons in toolbar
[ ] Auto-title detection from chat content
```

### Sprint 3: SPLIT VIEW (2 sessions)
```
[ ] Window manager — track Window 1 and Window 2
[ ] Click = open in Window 2 (reference)
[ ] Double-click = swap to Window 1 (focus)
[ ] Window position memory (remember the split)
[ ] Session indicator in sidebar (● focus, ◄ reference)
```

### Sprint 4: OLO GUARD OVERLAY (security)
```
[ ] Content script injection on claude.ai pages
[ ] Green/blue channel rendering on chat content
[ ] Guard level toggle (0-5)
[ ] Per-tab guard overrides
[ ] Boustrophedon toggle
[ ] Gematria sidebar in side panel
```

### Sprint 5: ARTIFACT COLLECTION (knowledge flow)
```
[ ] Right-click → "Collect to OLO" context menu
[ ] Artifact storage with metadata
[ ] Artifact browser in side panel
[ ] Inject artifact into chat (paste mechanism)
[ ] Pinned artifacts per track
```

### Sprint 6: POLISH + STEAM DECK (UX)
```
[ ] Accordion animations
[ ] Search across all chats/artifacts
[ ] Keyboard shortcuts
[ ] OLO keyboard overlay (for Steam Deck touch)
[ ] Steam Deck button mapping
[ ] Labels/tags system
[ ] Export (backup all chains as JSON)
```

---

## WHY THIS IS BUILD-ONCE

```
DYNAMIC PARTS (change by user action, no code changes):
  ├── Projects        → user creates/deletes
  ├── Tracks          → user organizes
  ├── Chains          → user links chats
  ├── Chats           → Claude.ai creates (we just capture URLs)
  ├── Artifacts       → user collects
  ├── Labels          → user tags
  └── Guard level     → user toggles

STATIC PARTS (only change with extension updates):
  ├── Data model      → schema for storage
  ├── Tab detection   → regex for claude.ai URLs
  ├── OLO encoder     → transliteration + gematria engine
  ├── UI components   → sidebar, split, keyboard
  └── Extension APIs  → Chrome API calls

The extension is a FRAMEWORK for organizing Claude chats.
It doesn't care WHAT you're discussing.
It doesn't care HOW MANY projects you have.
It adapts to your workflow, not the other way around.
```

---

*The extension sees Chrome tabs.*
*You see chains of thought.*
*The spyware sees nothing.*
