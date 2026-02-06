# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Badge

Display this badge at the start of every response:

```
 ▐▛███▜▌   Gently-nix
▝▜█████▛▘  Opus 4.5
  ▘▘ ▝▝    Steam Deck
```

## Project

**Gently-nix** - Custom NixOS bootable USB that boots directly into Gently (Electron app) as the entire desktop session, backed by a 50-crate Rust workspace (GentlyOS core). No GNOME, no KDE - Gently IS the session.

### Core Concept

```
USB Boot -> NixOS -> Auto-login -> Gently Electron App
                                      |
                                      +-- Embedded claude.ai (WebContentsView)
                                      +-- Claude Code CLI (background process)
                                      +-- Git with worktrees per clan
                                      +-- GentlyOS Rust core (security, crypto, AI)
```

## Architecture

```
Gently-nix/
  CLAUDE.md                      # This file
  README.md                      # Project overview
  flake.nix                      # Main Nix flake entry point
  Cargo.toml                     # Rust workspace manifest (50 crates)
  Cargo.lock                     # Pinned Rust dependencies

  app/                           # Gently Electron Application
    main.js                      # Electron main process
    preload.js                   # IPC bridge
    setup.html                   # First-boot setup screen
    shell.html                   # Main Gently shell UI
    package.json                 # Electron dependencies
    renderer/
      shell.js                   # UI logic, clan management
    inject/
      stamp-inject.js            # Content script for claude.ai
    styles/
      shell.css                  # Shell styling
    components/                  # React components
      App.jsx                    # Main app with auth state
      Authentication.jsx         # AI-powered login
      AIComparisonChat.jsx       # Claude vs Gemini comparison

  crates/                        # 32 Rust library crates (6 tiers)
    foundation/                  # Tier 0: core, codie, artisan, audio, visual, goo
    knowledge/                   # Tier 1-2: feed, alexandria, search, btc, ipfs
    intelligence/                # Tier 3: brain, inference, agents, micro, mcp, ged, behavior
    security/                    # Tier 4: security, cipher, guardian, sim, sploit
    network/                     # Tier 5: network, gateway, bridge, dance
    application/                 # Tier 6: web, architect, document, gooey, commerce

  binaries/                      # CLI entry points
    gently-cli/                  # Main CLI binary
    gentlyos-tui/                # Terminal UI binary

  packages/                      # Core GentlyOS packages
    guarddog/                    # Tier 0 IO Defense

  iso/                           # ISO/USB image building
    default.nix                  # ISO configuration
    bootloader.nix               # GRUB/systemd-boot config
    partitions.nix               # Disk partition schemes

  modules/                       # NixOS modules
    gently-app.nix               # Gently app packaging
    session/                     # Gently as X11/Wayland session
    boot/                        # Boot sequence control
    hardware/                    # Hardware detection, drivers
    install/                     # Auto-install, disk-setup

  profiles/                      # NixOS profiles (minimal, full, rescue)
  config/                        # Post-install NixOS config
  community/                     # Community templates
  nixos/                         # Purgatory layer (sandboxed browsing, containers)

  tools/                         # Guardian, agentic framework, monitor
  deployment/                    # Limbo layer, triad
  contracts/solana/              # Blockchain smart contracts
  web/                           # Web interface
  extensions/                    # Editor extensions (nvim, vscode)
  archive/                       # Disabled crates

  scripts/                       # All scripts (Nix + Rust)
    build-iso.sh                 # Build USB image
    flash-usb.sh                 # Write to USB device
    test-vm.sh                   # Test in QEMU
    crate-builder-bsart.sh       # Tier-aware crate builder
    doc-instruct.sh              # Documentation generator
    foundation-setup.sh          # Foundation setup
    download_minimax.py          # Model download
    hf_to_agent.py               # HuggingFace to agent

  mining/                        # BTC mining scripts
    mine.sh                      # Mining script
    headless-miner.js            # Headless miner

  btc-data/                      # Bitcoin block data
  sdk/                           # SDK prototypes and models
    prototypes/                  # 15 HTML prototype files
    electron/                    # Early Electron prototype
    models/                      # Python model scripts
    architecture/                # Architecture docs

  docker/                        # Container deployment
    Dockerfile                   # Standard build
    Dockerfile.minimal           # Minimal build
    docker-compose.yml           # Compose services

  release-assets/                # Compiled binaries

  .github/workflows/             # CI/CD
    ci.yml                       # Check, test, fmt, clippy
    release.yml                  # Multi-platform builds

  docs/                          # All documentation
    prototypes/                  # HTML prototypes (v6, v14, crystallized)
    codex/                       # GentlyOS codex
    dev/                         # Developer docs
    protocols/                   # Protocol specs
    testament/                   # Testament docs
    legacy/                      # Legacy docs
    gently-studio-specification/ # Studio spec
    architecture/                # Architecture docs
    guides/                      # Guides
    GENTLYOS-ARCHITECTURE.md
    GENTLYOS_ARCHITECTURE.md
    GENTLY_BUSINESS_AUTOMATION_FEED_VIBE.md
    gently_boot_logic.py
    CLAUDE_COMPILED.md
    REPORT.md
    INTEGRATION-SCOPE.md
    *.docx files
```

## Boot Sequence

### First Boot
1. BIOS/UEFI -> NixOS bootloader
2. systemd -> multi-user target, auto-login `gently` user
3. SSH keygen (oneshot service)
4. X11 starts (minimal, no DE)
5. Gently Electron app launches as session
6. **SETUP MODE**: Two webviews (GitHub + Claude sign-in)
7. User authenticates, adds SSH key
8. `.initialized` flag written
9. Transition to shell mode

### Subsequent Boots
1-5 same
6. Gently detects `.initialized` -> **SHELL MODE**
7. Left shelf (clans) + Focus pane + Process pane + Right shelf (artifacts) + Keyboard
8. Claude Desktop chats authenticated via Electron session
9. Git + SSH ready
10. Claude CLI ready

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | Inside Electron | System Chromium has separate profile; Electron owns all cookies |
| Claude panes | WebContentsView | Not deprecated webview tag; Electron 28+ |
| Git branches | Worktrees | Parallel branches, no checkout switching |
| Session | No DE | Gently IS the desktop; X11 just provides display |
| Stamp injection | Content script | executeJavaScript into claude.ai webview |
| IO Defense | GuardDog Tier 0 | All input flows through homoglyph/invisible char detection |
| Token Storage | TokenVault | Clean-before-store with BTC timestamping |

## Rust Workspace (50 crates)

### Build Commands

```bash
# Full workspace build
cargo build --release

# Build specific binaries
cargo build --release -p gently-cli      # Main CLI
cargo build --release -p gentlyos-tui    # Terminal UI

# Testing and linting
cargo test --all --all-features
cargo fmt --all
cargo clippy --all --all-features -- -D warnings

# Run a single crate's tests
cargo test -p gently-core
```

### Tier Structure

| Tier | Category | Key Crates |
|------|----------|------------|
| 0 | Foundation | gently-core (XOR crypto, vault), gently-codie (12-keyword DSL), gently-artisan (toroidal storage) |
| 1-2 | Knowledge | gently-alexandria (knowledge graph), gently-ipfs, gently-btc (genesis anchoring) |
| 3 | Intelligence | gently-brain (LLM orchestration), gently-agents (5-element pipeline), gently-mcp |
| 4 | Security | gently-guardian (16 daemons), gently-cipher, gently-sploit |
| 5 | Network | gently-bridge (IPC, port 7335), gently-dance (XOR reconstruction) |
| 6 | Application | gently-web (HTMX), gently-document, gently-commerce |

### Architecture Patterns

**Content-Addressable Storage**: Everything is a Blob with SHA256 hash. No filesystem hierarchy.
```rust
struct Blob { hash: [u8; 32], kind: Kind, data: Vec<u8> }
```

**XOR Split-Knowledge**: `LOCK (device) XOR KEY (public) = SECRET`. Neither half alone reveals anything. Implemented in gently-dance protocol.

**Berlin Clock Rotation**: Time-based key derivation synced to Bitcoin blocks for forward secrecy.

**SVG as Runtime Container**: SVG files contain visual + WASM brain + metadata. Models chain: `embed.svg -> classify.svg -> output.svg`

**CODIE Language**: 12 keywords - pug (start), bark (fetch), spin (loop), cali (call), elf (error), turk (transform), fence (guard), pin (lock), bone (immutable), blob (data), biz (business), anchor (finalize)

**Five-Element Agent Pipeline**: SPIRIT (validate) -> AIR (fetch) -> WATER (process) -> EARTH (execute) -> FIRE (anchor)

**Limbo Layer**: Sacrificial proxy between hostile web and sealed core. Can be burned and rebuilt without affecting core.

### Guardian System

SQLite database at `~/.gently/guardian.db` tracks:
- Build sessions and entity (crate) status
- Confessions (errors) and penance (fixes)
- 16 security daemons

### Disabled Crates

- `gently-spl` - Solana dependency version conflicts
- `gently-py` - PyO3 incompatible with musl-linux

## GuardDog Integration

GuardDog is Tier 0 of the sovereignty stack. Every IO path:

| Path | Protection |
|------|------------|
| Pane A chat input | GuardDog scans before Claude sees it |
| File drag-to-chat | GuardDog sanitizes filenames + content |
| CLI chain commands | GuardDog validates no injected invisibles |
| Token/key storage | TokenVault cleans before .env |
| Feed chain injection | GuardDog verifies fork source integrity |

Threat levels: 0 (clean) -> 7+ (critical block)

## NixOS Build Commands

```bash
# Build ISO images
nix build .#iso-minimal       # Console installer
nix build .#iso-full          # Full GentlyOS with Gently session
nix build .#iso-rescue        # Recovery mode

# Flash to USB (requires root)
sudo ./scripts/flash-usb.sh /dev/sdX

# Test in QEMU VM
./scripts/test-vm.sh

# Development shell
nix develop

# Run Gently app locally (for development)
cd app && npx electron .
```

## Gently App Structure

**Window Layout:**
```
+--------------------------------------------------+
| CONSTANTS BAR (immutable from collapsed clans)   |
+--------+------------------+------------------+---+
| LEFT   | WebContentsView  | WebContentsView  |RIGHT
| SHELF  | Focus pane       | Process pane     |SHELF
| Clans  | claude.ai        | claude.ai        |Artifacts
|        |                  |                  |
+--------+------------------+------------------+---+
| STAMP BAR [OLO|branch|depth|gates|pin|hash|ts]   |
+--------------------------------------------------+
| KEYBOARD / INPUT | Gates: A B C D E | [Send][CODE]|
+--------------------------------------------------+
```

**IPC Channels:**
- `create-project` / `add-clan` / `collapse`
- `get-stamp` / `cli-send` / `git-hash`
- `spawn-window` (for collapse -> new BrowserWindow)

## CI/CD

GitHub Actions in `.github/workflows/`:
- `ci.yml` - check, test, fmt, clippy on PRs
- `release.yml` - Multi-platform builds, GitHub releases

## Environment

- **Build Platform**: Steam Deck (SteamOS/Arch-based)
- **Target Hardware**: x86_64 UEFI/BIOS, NVIDIA RTX 3090 Ti
- **User**: deck (build) / gently (runtime)

## Critical Rules

**Never use emojis or non-US-English QWERTY keyboard characters** in any code, comments, strings, output, or documentation. Only use standard ASCII characters.

## Dependencies

- Nix with flakes enabled
- Electron 28+ (for WebContentsView API)
- Rust toolchain (stable)
- QEMU (for testing)
- USB drive (8GB+ recommended)

## Key Files

- `Cargo.toml` - Workspace manifest with centralized dependencies
- `flake.nix` - Main Nix flake entry point
- `docs/REPORT.md` - Project statistics and crate listing
