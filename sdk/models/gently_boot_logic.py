#!/usr/bin/env python3
"""
gently_boot_logic.py — Full Boot Chain Logic Review

WHAT TOM IS ASKING FOR:
  NixOS that boots into Gently as the entire desktop.
  No GNOME, no KDE. Gently IS the session.
  Inside Gently: embedded Chromium running claude.ai.
  Behind Gently: Claude Code CLI + Git.

LOGIC REVIEW — EVERY STEP, EVERY DEPENDENCY, EVERY ISSUE:

═══════════════════════════════════════════════════════════
LAYER 0: NixOS BASE
═══════════════════════════════════════════════════════════

  NixOS boots.
  It's declarative — everything is in configuration.nix.
  This means: every package, every service, every user,
  every folder is defined ONCE and reproducible.

  INSTALLS:
    - git (state layer)
    - chromium (embedded browser)
    - nodejs + electron (Gently app shell)
    - openssh (for SSH key + GitHub)
    - claude-cli (Claude Code — needs special handling)

  ISSUE 1: Claude Code CLI
    Claude CLI isn't in nixpkgs. Options:
    a) Fetch binary directly (fetchurl)
    b) npm global install at build time
    c) Bundle in Gently's node_modules
    → SOLUTION: Fetch the binary, wrap it in a nix derivation.
    On first boot, `claude` is already on PATH.

  ISSUE 2: GPU drivers
    Tom has RTX 3090 Ti. Need NVIDIA drivers for Chromium
    hardware acceleration and any future CUDA work.
    → SOLUTION: nixos-hardware + nvidia.package in config.

═══════════════════════════════════════════════════════════
LAYER 1: FIRST BOOT SEQUENCE
═══════════════════════════════════════════════════════════

  Order matters. Can't do git over SSH without keys.
  Can't embed claude.ai without auth cookies.

  STEP 1: Generate SSH key
    - systemd oneshot service runs on first boot
    - `ssh-keygen -t ed25519 -f ~/.ssh/gently_ed25519 -N ""`
    - Adds to ssh-agent
    - Writes public key to a visible location
    - DOES NOT require network

  STEP 2: Launch Chromium STANDALONE (not embedded)
    - Full window Chromium opens
    - Two tabs:
      Tab 1: github.com/settings/keys (add SSH key)
      Tab 2: claude.ai (sign in)
    - User completes BOTH sign-ins manually
    - Chromium profile is at ~/.config/chromium/gently-profile
    - Auth cookies persist in this profile
    - IMPORTANT: This same profile is used by embedded views later

  STEP 3: User closes Chromium (or clicks "Done" in setup)
    - First-boot flag is set (~/.config/gently/.initialized)
    - Gently app launches as the session

  ON SUBSEQUENT BOOTS:
    - Skip steps 1-3
    - Launch Gently directly
    - Chromium profile already has auth cookies
    - SSH key already exists

  ISSUE 3: Cookie/session expiry
    Claude.ai sessions expire. GitHub sessions expire.
    → SOLUTION: Gently detects auth failure in embedded views
    and offers to re-launch standalone Chromium for re-auth.
    This is a "settings" action, not a boot sequence.

  ISSUE 4: SSH key needs to reach GitHub before git works
    → The first-boot Chromium tab shows the public key AND
    has GitHub open. User copies key → adds to GitHub.
    Simple. No automation needed for this step.

═══════════════════════════════════════════════════════════
LAYER 2: GENTLY APP (Electron)
═══════════════════════════════════════════════════════════

  Gently is an Electron app. Electron IS Chromium.
  So we don't install Chromium separately for embedding —
  Electron's built-in Chromium handles the webviews.

  WAIT — ISSUE 5: Profile sharing
    If Gently is Electron, its internal Chromium is SEPARATE
    from system Chromium. Different profile directories.
    User signs into claude.ai in system Chromium,
    but Gently's Electron uses its own Chromium.
    Auth cookies DON'T transfer.

  THREE SOLUTIONS:
    a) Use Electron's session/partition to point to system
       Chromium's profile directory → FRAGILE, version mismatch
    b) Do the initial auth INSIDE Gently itself, not standalone
       Chromium → simpler but Gently must handle the full-screen
       auth flow before settling into its normal layout
    c) Use system Chromium via --app mode for the embedded views
       instead of Electron webviews → Gently becomes a plain
       window manager orchestrating Chromium windows

  → SOLUTION: Option (b) is cleanest.

  REVISED FIRST BOOT:
    1. NixOS boots
    2. SSH key generated (systemd)
    3. Gently app launches FULL SCREEN
    4. Gently shows "Setup" mode:
       - Left pane: GitHub sign-in (webview → github.com)
       - Right pane: Claude sign-in (webview → claude.ai)
       - Bottom: SSH public key displayed for copying
    5. User signs into both
    6. Auth cookies stored in Electron's session
    7. Gently transitions to normal mode
    8. Subsequent boots skip setup, go straight to normal mode

  This means Gently's Electron process owns ALL auth.
  No system Chromium needed at all.
  Electron IS the Chromium.

  ISSUE 6: Chromium for GitHub browsing outside Gently?
    Tom might want a regular browser too.
    → Install Chromium as system package anyway, but it's
    separate from Gently's embedded views.
    Gently is the primary interface; system Chromium is escape hatch.

═══════════════════════════════════════════════════════════
LAYER 3: GENTLY WINDOW ARCHITECTURE (inside Electron)
═══════════════════════════════════════════════════════════

  Each Gently Window (from our model) = one Electron BrowserWindow.
  Inside each BrowserWindow:

  ┌──────────────────────────────────────────────────┐
  │ CONSTANTS BAR (HTML, read-only)                  │
  ├──────┬──────────────┬──────────────┬──────┤
  │ LEFT │  WebContents │ WebContents  │RIGHT │
  │ SHELF│  View A      │ View B       │SHELF │
  │(HTML)│  claude.ai   │ claude.ai    │(HTML)│
  │      │  (focus)     │ (process)    │      │
  ├──────┴──────────────┴──────────────┤      │
  │ KEYBOARD / BUCKET (HTML)           │      │
  └────────────────────────────────────┴──────┘

  The shelves, keyboard, stamp bar, constants bar = HTML/JS
  rendered by Electron's renderer process.

  The two Claude chat panes = WebContentsView instances
  loading claude.ai with the auth session from setup.

  CRITICAL: WebContentsView (Electron 28+) not webview tag.
  webview is deprecated. WebContentsView is the replacement.
  It's a native view managed by main process, positioned
  absolutely within the BrowserWindow.

  ISSUE 7: Stamp injection
    The stamp needs to be prepended to user messages in claude.ai.
    But claude.ai is a website we don't control.
    → SOLUTION: Inject a content script (via webContents.executeJavaScript)
    that intercepts the message input, prepends the stamp,
    and optionally shows the stamp bar overlay.
    This is essentially a built-in Chrome extension.

  ISSUE 8: Multiple Gently Windows
    Collapse spawns a NEW Gently Window = new Electron BrowserWindow.
    Each has its own constants, its own WebContentsViews.
    The window tree (from our model) maps to BrowserWindow instances.
    Main process tracks all windows and their relationships.

═══════════════════════════════════════════════════════════
LAYER 4: CLAUDE CODE CLI INTEGRATION
═══════════════════════════════════════════════════════════

  Claude CLI runs as a background process managed by Gently.
  Communication: stdin/stdout pipe from Electron main process.

  WHEN DESKTOP CHAT SAYS "write this code":
    1. User types instruction in Gently's keyboard
    2. Gently sends to claude.ai via the WebContentsView
    3. Claude responds in the chat
    4. User clicks "→ CODE" button (or keyboard shortcut)
    5. Gently extracts the instruction/code from chat
    6. Pipes it to Claude CLI process
    7. Claude CLI executes on the current git branch
    8. Output captured by Gently
    9. Files committed to git automatically
    10. Output appears as artifact in right shelf

  ALTERNATIVELY (more automated):
    - Claude CLI runs in "agent mode" watching a task queue
    - Gently writes tasks to a queue file/socket
    - Claude CLI picks up tasks, executes, reports back
    - This is the Virtual Organization System pattern

  ISSUE 9: Claude CLI auth
    Claude CLI needs its own API key or auth.
    → On first boot setup, add Claude CLI auth step.
    `claude login` or API key entry in Gently setup screen.

  ISSUE 10: Branch synchronization
    When Gently collapses clans and creates a new git branch,
    Claude CLI needs to switch to that branch too.
    → Gently's main process runs `git checkout` before
    piping the next task to Claude CLI.
    Or: each Claude CLI instance is spawned with CWD set
    to the right branch's worktree.

  GIT WORKTREES:
    Instead of `git checkout` (which changes the whole repo),
    use `git worktree add` for each clan/window.
    Each clan gets its own directory that's a separate
    worktree of the same repo. Parallel branches, parallel
    directories, no switching needed.

    /home/gently/projects/olo-guard/
    ├── .git/                          # Main repo
    ├── main/                          # Worktree: main branch
    ├── worktrees/
    │   ├── blue-channel/              # Worktree: clan branch
    │   ├── jpeg-internals/            # Worktree: clan branch
    │   └── window-synthesis/          # Worktree: collapsed branch
    └── constants/                     # Shared constants (symlinked)

    Claude CLI CWD = the worktree for its clan.
    No branch switching. Ever. Parallel by default.

═══════════════════════════════════════════════════════════
LAYER 5: FOLDER STRUCTURE
═══════════════════════════════════════════════════════════

  /home/gently/
  ├── .ssh/
  │   ├── gently_ed25519          # Private key
  │   └── gently_ed25519.pub     # Public key
  │
  ├── .config/
  │   └── gently/
  │       ├── .initialized       # First-boot flag
  │       ├── settings.json      # App settings
  │       ├── windows.json       # Window tree state
  │       └── electron/          # Electron session data
  │           └── Cookies        # Auth cookies (claude.ai, github)
  │
  ├── projects/                  # All Gently projects
  │   └── {project-id}/
  │       ├── .git/              # Git repo
  │       ├── gently.json        # Project config (gates, tree)
  │       ├── constants/         # Immutable constant files
  │       │   ├── blue-channel.json
  │       │   └── jpeg-internals.json
  │       ├── stamps/            # Stamp history
  │       ├── worktrees/         # Git worktrees per clan
  │       │   ├── {clan-id}/    # Each clan's working dir
  │       │   │   ├── src/      # Code from Claude CLI
  │       │   │   ├── state.json
  │       │   │   └── ...
  │       │   └── ...
  │       └── artifacts/         # Collected artifacts
  │
  └── app/                       # Gently Electron app
      ├── package.json
      ├── main.js               # Main process
      ├── preload.js            # Bridge
      ├── setup.html            # First-boot setup screen
      ├── shell.html            # Main Gently shell UI
      ├── renderer/
      │   ├── shell.js          # UI logic
      │   ├── keyboard.js       # Keyboard + stamp
      │   ├── shelves.js        # Left + right shelf
      │   ├── git.js            # Git operations
      │   └── cli-bridge.js     # Claude CLI communication
      ├── inject/
      │   └── stamp-inject.js   # Content script for claude.ai
      └── styles/
          └── shell.css

═══════════════════════════════════════════════════════════
LAYER 6: CLI COMMANDS (gently command)
═══════════════════════════════════════════════════════════

  Installed on PATH. For terminal use alongside the GUI.

  gently init <name>          # Create new project + git repo
  gently clan <name>          # Add independent clan (new worktree + branch)
  gently collapse <a> <b>     # Collapse clans → new window + branch
  gently stamp [clan]         # Show current stamp (with git hash)
  gently gate <letter> [state]# View/set gate state
  gently status               # Show project tree (windows, clans, gates)
  gently inject <artifact>    # Stage artifact for injection
  gently windows              # List all Gently windows
  gently log                  # Git log with gently context

  These commands operate on the git repo and gently.json.
  They can be used from terminal OR triggered by the GUI.
  Claude CLI can also call them.

═══════════════════════════════════════════════════════════
BOOT SEQUENCE (FINAL, CORRECTED)
═══════════════════════════════════════════════════════════

  FIRST BOOT:
    1. NixOS boots (UEFI → systemd → multi-user)
    2. Auto-login as 'gently' user (no display manager)
    3. systemd user service: generate SSH key if missing
    4. Xorg or Wayland starts (minimal, no DE)
    5. Gently Electron app launches as the session
    6. Gently detects no .initialized flag → SETUP MODE
    7. Setup screen shows:
       ┌─────────────────────────────────────────────┐
       │  GENTLY SETUP                               │
       │                                              │
       │  ┌──────────────┐  ┌──────────────┐        │
       │  │ Sign into    │  │ Sign into    │        │
       │  │ GitHub       │  │ Claude       │        │
       │  │              │  │              │        │
       │  │ (webview)    │  │ (webview)    │        │
       │  └──────────────┘  └──────────────┘        │
       │                                              │
       │  SSH Public Key: ssh-ed25519 AAAA...        │
       │  [Copy to Clipboard]                        │
       │                                              │
       │  Claude CLI: [Enter API Key] or [Login]     │
       │                                              │
       │  [Complete Setup →]                         │
       └─────────────────────────────────────────────┘
    8. User signs in, adds SSH key, authenticates CLI
    9. Click "Complete Setup"
    10. .initialized written
    11. Gently transitions to normal shell mode

  SUBSEQUENT BOOT:
    1-4 same
    5. Gently launches → detects .initialized → SHELL MODE
    6. Last project loaded (or new project wizard)
    7. Claude Desktop chats already authenticated
    8. Git already has SSH access
    9. Claude CLI already authenticated
    10. Work begins

═══════════════════════════════════════════════════════════
ISSUES FOUND AND RESOLVED
═══════════════════════════════════════════════════════════

  ISSUE 1: Claude CLI not in nixpkgs → fetch binary
  ISSUE 2: GPU drivers needed → nvidia config
  ISSUE 3: Cookie expiry → re-auth flow in settings
  ISSUE 4: SSH key before git → first-boot ordering
  ISSUE 5: Profile sharing → do auth inside Electron ✓
  ISSUE 6: System browser → install anyway as escape hatch
  ISSUE 7: Stamp injection → content script in webcontents
  ISSUE 8: Multiple windows → BrowserWindow per Gently window
  ISSUE 9: Claude CLI auth → first-boot setup step
  ISSUE 10: Branch sync → git worktrees, no switching

  BONUS ISSUE 11: Electron version
    Need Electron 28+ for WebContentsView API.
    nixpkgs may have older version.
    → Pin electron in package.json, use electron-builder.

  BONUS ISSUE 12: Offline capability
    What if network is down? Gently should still work locally.
    Git works offline. Claude CLI needs network.
    → Gently should gracefully handle offline claude.ai
    (show last stamp, allow local work, queue for sync).

═══════════════════════════════════════════════════════════
VALIDATED. READY TO BUILD.
═══════════════════════════════════════════════════════════
"""

# Quick visualization of the boot chain
if __name__ == "__main__":
    steps = [
        ("BIOS/UEFI", "Hardware init, NixOS bootloader"),
        ("systemd", "Multi-user target, auto-login 'gently'"),
        ("SSH keygen", "oneshot: ed25519 key if not exists"),
        ("Display server", "Xorg/Wayland minimal (no DE)"),
        ("Gently.app", "Electron launches as session"),
        ("", ""),
        ("FIRST BOOT ONLY:", ""),
        ("Setup mode", "Two webviews: GitHub + Claude sign-in"),
        ("SSH key shown", "User copies to GitHub"),
        ("Claude CLI auth", "API key or login"),
        ("Complete →", ".initialized flag set"),
        ("", ""),
        ("ALL BOOTS:", ""),
        ("Shell mode", "Left shelf + Focus + Process + Right shelf + Keyboard"),
        ("WebContentsView A", "claude.ai (authenticated, focus pane)"),
        ("WebContentsView B", "claude.ai (authenticated, process pane)"),
        ("Claude CLI", "Background process, piped from main"),
        ("Git", "Repo ready, SSH access, worktrees per clan"),
        ("Stamp engine", "Generates stamps with git hash, injects into chat"),
    ]

    print("=" * 60)
    print("  GENTLY BOOT CHAIN")
    print("=" * 60)
    print()
    for i, (step, desc) in enumerate(steps):
        if not step:
            print()
            continue
        if step.endswith(":"):
            print(f"  {'─' * 50}")
            print(f"  {step}")
            continue
        arrow = "→" if i > 0 and steps[i-1][0] else "▸"
        print(f"  {arrow} {step}")
        if desc:
            print(f"    {desc}")
    print()
    print("=" * 60)
    print("  12 issues identified and resolved")
    print("  Boot chain validated")
    print("  Ready to build NixOS configuration")
    print("=" * 60)
