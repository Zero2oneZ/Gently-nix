# OLO GUARD — THE SIMPLE VERSION
## Chromium Folders + Python Organizer

---

## THE INSIGHT

A Chromium profile IS a folder.

```bash
chromium --user-data-dir=/path/to/folder
```

That's it. That's the branch mechanism.

```
CHECKPOINT = copy the folder
BRANCH     = launch chromium pointing at the copy
RESTORE    = launch chromium pointing at any saved folder
ORGANIZE   = python app that manages the folders
```

No extension. No API. No tree data structure.
Just folders and a launcher.

---

## HOW IT WORKS

```
/gentlyos/
└── sessions/
    ├── main/                          ← Active session (Chromium profile)
    │   ├── Default/
    │   │   ├── Cookies
    │   │   ├── Local Storage/
    │   │   ├── Session Storage/
    │   │   └── ...
    │   └── ...
    │
    ├── checkpoints/
    │   ├── 2026-02-01_blue-channel-base/   ← Saved checkpoint
    │   │   └── (copy of profile at that moment)
    │   │
    │   ├── 2026-02-01_jpeg-deep-dive/      ← Another checkpoint
    │   │   └── (copy of profile at that moment)
    │   │
    │   └── 2026-02-01_png-exploration/     ← Branch from blue-channel-base
    │       └── (copy of blue-channel-base + continued)
    │
    └── dom-saves/
        ├── blue-channel-base.html          ← Saved DOM (lightweight)
        ├── blue-channel-base.json          ← Metadata
        ├── jpeg-deep-dive.html
        ├── jpeg-deep-dive.json
        └── ...
```

---

## THE PYTHON APP — THAT'S THE WHOLE THING

```
┌────────────────────────────────────────────────┐
│                                                │
│  TOM CLICKS:                                   │
│                                                │
│  [💾 SAVE]     → copies profile folder         │
│                  saves DOM as .html             │
│                  writes metadata .json          │
│                                                │
│  [🌿 BRANCH]   → copies a checkpoint folder    │
│                  launches NEW chromium on copy  │
│                  labels the branch              │
│                                                │
│  [📂 BROWSE]   → shows all checkpoints         │
│                  click to launch any one        │
│                  see the tree of branches       │
│                                                │
│  [🔍 SEARCH]   → grep/search across saved DOMs │
│                  find that thing you said       │
│                  in any timeline                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## THE CODE — IT'S SMALL

```python
#!/usr/bin/env python3
"""
olo.py — Session organizer for Claude conversations
Manages Chromium profiles as conversation branches
"""

import os
import sys
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

# ─── CONFIG ───

BASE_DIR = Path.home() / "gentlyos" / "sessions"
CHECKPOINTS_DIR = BASE_DIR / "checkpoints"
DOM_DIR = BASE_DIR / "dom-saves"
MAIN_PROFILE = BASE_DIR / "main"

CHROMIUM = "chromium-browser"  # or "google-chrome" or path to binary
CLAUDE_URL = "https://claude.ai"

# Ensure dirs exist
for d in [BASE_DIR, CHECKPOINTS_DIR, DOM_DIR, MAIN_PROFILE]:
    d.mkdir(parents=True, exist_ok=True)


def timestamp():
    return datetime.now().strftime("%Y-%m-%d_%H-%M-%S")


def launch(profile_path, url=None):
    """Launch Chromium with a specific profile directory."""
    cmd = [
        CHROMIUM,
        f"--user-data-dir={profile_path}",
        "--no-first-run",
        "--disable-default-apps",
    ]
    if url:
        cmd.append(url)
    
    print(f"Launching: {profile_path.name}")
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def save_checkpoint(name=None):
    """Copy current profile to a checkpoint folder."""
    if not name:
        name = input("Checkpoint name: ").strip().replace(" ", "-")
    
    label = f"{timestamp()}_{name}"
    dest = CHECKPOINTS_DIR / label
    
    print(f"Saving checkpoint: {label}")
    print(f"  Copying {MAIN_PROFILE} → {dest}")
    shutil.copytree(MAIN_PROFILE, dest, dirs_exist_ok=True)
    
    # Save metadata
    meta = {
        "name": name,
        "label": label,
        "created": datetime.now().isoformat(),
        "source": "main",
        "parent": None,  # Will be set if branching from another checkpoint
    }
    (dest / "olo_meta.json").write_text(json.dumps(meta, indent=2))
    
    print(f"  ✓ Checkpoint saved: {label}")
    return label


def save_dom(name, html_content):
    """Save a DOM snapshot (lightweight, searchable)."""
    dom_path = DOM_DIR / f"{name}.html"
    meta_path = DOM_DIR / f"{name}.json"
    
    dom_path.write_text(html_content)
    meta_path.write_text(json.dumps({
        "name": name,
        "saved": datetime.now().isoformat(),
        "size": len(html_content),
    }, indent=2))
    
    print(f"  ✓ DOM saved: {dom_path.name}")


def branch(checkpoint_name=None):
    """Create a branch from a checkpoint and launch it."""
    if not checkpoint_name:
        # List available checkpoints
        checkpoints = list_checkpoints()
        if not checkpoints:
            print("No checkpoints found. Save one first.")
            return
        
        print("\nAvailable checkpoints:")
        for i, cp in enumerate(checkpoints):
            meta = load_meta(cp)
            parent = f" (from: {meta.get('parent', 'main')})" if meta.get('parent') else ""
            print(f"  {i+1}. {cp.name}{parent}")
        
        choice = int(input("\nBranch from #: ")) - 1
        checkpoint_name = checkpoints[choice].name
    
    source = CHECKPOINTS_DIR / checkpoint_name
    branch_name = input("Branch name: ").strip().replace(" ", "-")
    label = f"{timestamp()}_{branch_name}"
    dest = CHECKPOINTS_DIR / label
    
    print(f"Branching: {checkpoint_name} → {label}")
    shutil.copytree(source, dest, dirs_exist_ok=True)
    
    # Update metadata
    meta = {
        "name": branch_name,
        "label": label,
        "created": datetime.now().isoformat(),
        "source": checkpoint_name,
        "parent": checkpoint_name,
    }
    (dest / "olo_meta.json").write_text(json.dumps(meta, indent=2))
    
    print(f"  ✓ Branch created: {label}")
    
    # Launch it
    launch(dest, CLAUDE_URL)
    return label


def list_checkpoints():
    """List all checkpoint folders, sorted by date."""
    checkpoints = sorted(
        [d for d in CHECKPOINTS_DIR.iterdir() if d.is_dir()],
        key=lambda d: d.name
    )
    return checkpoints


def load_meta(checkpoint_path):
    """Load metadata for a checkpoint."""
    meta_file = checkpoint_path / "olo_meta.json"
    if meta_file.exists():
        return json.loads(meta_file.read_text())
    return {}


def browse():
    """Show all checkpoints and their relationships."""
    checkpoints = list_checkpoints()
    
    if not checkpoints:
        print("No checkpoints yet.")
        return
    
    # Build tree
    roots = []
    children = {}
    
    for cp in checkpoints:
        meta = load_meta(cp)
        parent = meta.get("parent")
        if parent:
            children.setdefault(parent, []).append(cp)
        else:
            roots.append(cp)
    
    def print_tree(node, indent=0):
        meta = load_meta(node)
        name = meta.get("name", node.name)
        created = meta.get("created", "?")[:16]
        prefix = "  " * indent + ("├── " if indent > 0 else "")
        print(f"{prefix}{name}  ({created})")
        
        for child in children.get(node.name, []):
            print_tree(child, indent + 1)
    
    print("\n═══ CONVERSATION TREE ═══\n")
    for root in roots:
        print_tree(root)
    
    print(f"\n  Total: {len(checkpoints)} checkpoints")
    
    # Option to launch
    print("\nEnter number to launch (or Enter to skip):")
    for i, cp in enumerate(checkpoints):
        meta = load_meta(cp)
        print(f"  {i+1}. {meta.get('name', cp.name)}")
    
    choice = input("\n#: ").strip()
    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(checkpoints):
            launch(checkpoints[idx], CLAUDE_URL)


def search(query=None):
    """Search across all saved DOMs."""
    if not query:
        query = input("Search: ").strip()
    
    print(f"\nSearching for: '{query}'\n")
    
    results = []
    for html_file in DOM_DIR.glob("*.html"):
        content = html_file.read_text()
        if query.lower() in content.lower():
            # Find context around match
            lower = content.lower()
            idx = lower.find(query.lower())
            start = max(0, idx - 80)
            end = min(len(content), idx + len(query) + 80)
            context = content[start:end].replace("\n", " ").strip()
            
            results.append({
                "file": html_file.stem,
                "context": f"...{context}...",
            })
    
    if results:
        for r in results:
            print(f"  📄 {r['file']}")
            print(f"     {r['context']}")
            print()
        print(f"  Found in {len(results)} saves")
    else:
        print("  No matches found.")


def launch_main():
    """Launch the main session."""
    launch(MAIN_PROFILE, CLAUDE_URL)


# ─── CLI ───

def main():
    if len(sys.argv) < 2:
        print("""
╔══════════════════════════════════════╗
║          OLO SESSION MANAGER         ║
╠══════════════════════════════════════╣
║                                      ║
║  olo start        Launch main        ║
║  olo save [name]  Save checkpoint    ║
║  olo branch       Branch from save   ║
║  olo browse       View tree + launch ║
║  olo search [q]   Search saved DOMs  ║
║  olo list         List checkpoints   ║
║                                      ║
╚══════════════════════════════════════╝
        """)
        return
    
    cmd = sys.argv[1]
    
    if cmd == "start":
        launch_main()
    
    elif cmd == "save":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        save_checkpoint(name)
    
    elif cmd == "branch":
        branch()
    
    elif cmd == "browse":
        browse()
    
    elif cmd == "search":
        query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else None
        search(query)
    
    elif cmd == "list":
        for cp in list_checkpoints():
            meta = load_meta(cp)
            print(f"  {meta.get('name', cp.name):30s} {meta.get('created', '?')[:16]}")
    
    else:
        print(f"Unknown command: {cmd}")


if __name__ == "__main__":
    main()
```

---

## THE DOM SAVE — LIGHTWEIGHT SNAPSHOTS

The profile copy is the FULL state (cookies, auth, everything).
But it's heavy (~100MB+ per checkpoint).

The DOM save is LIGHTWEIGHT (just the conversation text).
Use it for search and reference without the full profile.

Two ways to grab the DOM:

### Way 1: Python + Selenium (headless grab)
```python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def grab_dom(profile_path):
    """Grab the DOM from an active Claude session."""
    opts = Options()
    opts.add_argument(f"--user-data-dir={profile_path}")
    opts.add_argument("--headless=new")
    
    driver = webdriver.Chrome(options=opts)
    driver.get("https://claude.ai")
    
    # Wait for conversation to load
    import time
    time.sleep(3)
    
    dom = driver.page_source
    driver.quit()
    return dom
```

### Way 2: Simple JS bookmarklet (user clicks it)
```javascript
// Bookmarklet — Tom clicks this to save DOM
javascript:void(
  (function(){
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'claude-dom-' + new Date().toISOString().slice(0,16) + '.html';
    a.click();
  })()
)

// Downloads the entire page as HTML
// Tom drops it in ~/gentlyos/sessions/dom-saves/
// Python picks it up
```

### Way 3: Chrome DevTools Protocol (best, no user action)
```python
import websocket
import json

def save_dom_cdp(ws_url):
    """Use Chrome DevTools Protocol to grab DOM remotely."""
    ws = websocket.create_connection(ws_url)
    
    # Get full DOM
    ws.send(json.dumps({
        "id": 1,
        "method": "DOM.getDocument",
        "params": {"depth": -1}
    }))
    result = json.loads(ws.recv())
    
    # Get outer HTML
    root_id = result["result"]["root"]["nodeId"]
    ws.send(json.dumps({
        "id": 2,
        "method": "DOM.getOuterHTML",
        "params": {"nodeId": root_id}
    }))
    html_result = json.loads(ws.recv())
    
    ws.close()
    return html_result["result"]["outerHTML"]

# Launch Chromium with remote debugging:
# chromium --remote-debugging-port=9222 --user-data-dir=...
# Then connect to ws://localhost:9222
```

---

## THE FULL FLOW — TOM'S DAY

```
MORNING:

  $ olo start
  → Chromium launches with main profile
  → Claude.ai opens, Tom is logged in
  → Starts chatting about OLO guard design

  ... 30 minutes of deep conversation ...

  $ olo save blue-channel-base
  → Profile copied to checkpoints/2026-02-01_10-30-00_blue-channel-base/
  → DOM saved to dom-saves/blue-channel-base.html
  → "✓ Checkpoint saved"

  ... continues chatting, goes deep on JPEG ...

  $ olo save jpeg-conclusion
  → Another checkpoint saved

  Tom realizes: "wait, what if PNG is better?"

  $ olo branch
  → Shows checkpoints:
     1. blue-channel-base (10:30)
     2. jpeg-conclusion (11:15)
  → Tom picks #1 (blue-channel-base)
  → Names branch: "png-exploration"
  → NEW Chromium window opens
  → Logged into Claude.ai
  → The conversation state is from 10:30
  → NO KNOWLEDGE of the JPEG discussion
  → Tom types: "What about PNG instead?"
  → Clean timeline. Fresh path.

AFTERNOON:

  $ olo browse
  
  ═══ CONVERSATION TREE ═══

  blue-channel-base  (2026-02-01 10:30)
  ├── jpeg-conclusion  (2026-02-01 11:15)
  └── png-exploration  (2026-02-01 11:45)

  Total: 3 checkpoints

  $ olo search "subsampling"
  
  📄 jpeg-conclusion
     ...JPEG uses 4:2:0 chroma subsampling which destroys...

  Found in 1 saves

  → Tom now knows the JPEG branch found "4:2:0 subsampling"
  → He can manually paste that finding into the PNG branch
  → Or just know it for his own reference
```

---

## WHY THIS IS BETTER THAN EVERYTHING BEFORE

```
BEFORE (complex):
  - Chrome extension
  - Content scripts
  - Tree data structure  
  - Vector embeddings
  - API calls
  - Bridge abstraction
  - Native messaging host
  
  Estimated build time: weeks

NOW (simple):
  - One Python file (~200 lines)
  - shutil.copytree (folder copy)
  - subprocess.Popen (launch chromium)
  - grep (search DOMs)
  
  Estimated build time: today

WHAT WE LOST:
  - Nothing that matters for MVP
  - Vector retrieval → replaced by grep/search
  - Fancy tree UI → replaced by terminal tree display
  - Auto-capture → replaced by manual save command
  
WHAT WE GAINED:
  - Actually works right now
  - No dependencies except Python stdlib
  - No extension permissions to manage
  - No Chrome Web Store review process
  - Profile copy preserves EVERYTHING (cookies, auth, cache)
  - Each branch is a real Chromium instance (not an iframe hack)
```

---

## LATER: ADD THE GUI

Once the CLI works, the GUI is just:

```python
# tkinter or PyQt wrapper around the same functions

# ┌─────────────────────────────────────────┐
# │  OLO SESSION MANAGER                    │
# │                                         │
# │  [▶ START]  [💾 SAVE]  [🌿 BRANCH]     │
# │                                         │
# │  ═══ TREE ═══                           │
# │  ● blue-channel-base                    │
# │  ├── ● jpeg-conclusion                  │
# │  └── ● png-exploration                  │
# │                                         │
# │  [🔍 Search: _________________ ]       │
# │                                         │
# │  Right-click any node:                  │
# │    → Launch                             │
# │    → Branch from here                   │
# │    → Delete                             │
# │    → View DOM                           │
# └─────────────────────────────────────────┘

# But honestly? The CLI is fine. Ship that first.
```

---

## WHAT ABOUT AUTH / ADVERSARIAL PROTECTION?

Each checkpoint folder is a COMPLETE Chromium profile.
That includes:
  - Cookies (Claude.ai login session)
  - Local Storage  
  - Session Storage
  - IndexedDB
  - Cache

So when you branch and launch:
  - You're already logged in (cookies preserved)
  - Claude.ai thinks it's the same browser session
  - No re-authentication needed

For adversarial protection:
  - Main profile = Tom's real login
  - Guest pass profiles = separate folders entirely
  - Never mix them
  - Label guest profiles clearly
  - Python app can flag which profiles are guest vs authenticated

```
sessions/
├── main/                    ← Tom's authenticated profile
├── guest-001/               ← Guest pass (untrusted)
├── guest-002/               ← Guest pass (untrusted)
├── checkpoints/
│   ├── blue-base/           ← Branched from main (trusted)
│   └── guest-test/          ← Branched from guest (untrusted)
```

---

## THE UPGRADE PATH

```
STAGE 1 (TODAY):     Python CLI + folder copies
STAGE 2 (THIS WEEK): Add DOM save + search
STAGE 3 (NEXT WEEK): Add simple GUI (tkinter/PyQt)
STAGE 4 (LATER):     Add OLO guard overlay (content script)
STAGE 5 (LATER):     Add vector search across DOMs
STAGE 6 (MAYBE):     Chrome extension for auto-capture

Each stage works independently.
Each stage adds value.
No stage requires the next one.
```

---

*A conversation is a folder.*
*A branch is a copy.*
*A checkpoint is a label.*
*Python is the librarian.*
*Ship it today.*
