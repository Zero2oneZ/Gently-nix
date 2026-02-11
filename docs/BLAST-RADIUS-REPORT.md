# BLAST RADIUS REPORT -- Full Project Scan

```
 ▐▛███▜▌   Gently-nix
▝▜█████▛▘  Opus 4.5
  ▘▘ ▝▝    Steam Deck
```

**Scan Date:** 2026-02-11
**Scanned By:** Claude Code (Opus 4.6)
**Files Scanned:** 358
**Total Lines of Code:** ~75,000+

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [File Inventory](#2-file-inventory)
3. [Rust Workspace Analysis](#3-rust-workspace-analysis)
4. [Electron App Analysis](#4-electron-app-analysis)
5. [NixOS Configuration Analysis](#5-nixos-configuration-analysis)
6. [Scripts and Tools Analysis](#6-scripts-and-tools-analysis)
7. [Supporting Files Analysis](#7-supporting-files-analysis)
8. [Critical Issues (Blast Radius: HIGH)](#8-critical-issues-blast-radius-high)
9. [Major Issues (Blast Radius: MEDIUM)](#9-major-issues-blast-radius-medium)
10. [Minor Issues (Blast Radius: LOW)](#10-minor-issues-blast-radius-low)
11. [Maturity Matrix](#11-maturity-matrix)
12. [Dependency Analysis](#12-dependency-analysis)
13. [Security Audit](#13-security-audit)
14. [Recommendations](#14-recommendations)

---

## 1. Executive Summary

Gently-nix is an ambitious 358-file monorepo spanning 5 technology stacks (Rust, JavaScript/Electron, Nix, Python, Shell). The project aims to create a sovereign NixOS-based operating system with an Electron desktop session, 50-crate Rust backend, and BTC-anchored security.

### Implementation Reality

| Component | Files | Lines | Status |
|-----------|-------|-------|--------|
| Electron App | 72 | ~57,000 | **Most complete** -- main.js, preload.js, shell.js, 59 lib clients all functional |
| Rust Workspace | 47 .rs + 42 Cargo.toml | ~2,900 | **Mostly stubs** -- 8 crates real, 7 partial, 24 type-only stubs |
| NixOS Config | 27 .nix | ~2,600 | **Functional but conflicting** -- 3 critical config conflicts |
| Scripts/Tools | 60+ | ~5,000+ | **Mixed** -- mining scripts real, installers real, CODIE maps real |
| Docs/SDK | 80+ | ~8,000+ | **Aspirational** -- specifications for unbuilt systems |

### Top-Level Verdict

The Electron app IS the project. The Rust workspace is a type-level API design with ~15% implementation. The NixOS layer has 3 critical conflicts that prevent evaluation. The documentation describes a system 10x larger than what exists.

---

## 2. File Inventory

### By Directory

| Directory | Files | Purpose |
|-----------|-------|---------|
| app/ | 72 | Electron application (main process, renderer, 59 lib clients, 3 components) |
| crates/ | 70 | 32 Rust library crates (Cargo.toml + src/lib.rs each, some with extra .rs files) |
| binaries/ | 4 | 2 Rust CLI entry points |
| modules/ | 16 | NixOS system modules |
| profiles/ | 4 | NixOS build profiles |
| iso/ | 3 | ISO image configuration |
| config/ | 2 | Post-install NixOS config |
| scripts/ | 8 | Build, flash, test, setup scripts |
| tools/ | 30+ | Guardian DB, CODIE maps, installers, validators |
| docs/ | 15 | Architecture docs, prototypes, reports |
| sdk/ | 50+ | Prototypes, models, early versions |
| docker/ | 3 | Container deployment |
| mining/ | 2 | BTC solo miner |
| btc-data/ | 2 | Block data (6.7 MB JSON) |
| web/ | 2 | Download page + install script |
| extensions/ | 4 | VS Code + Neovim plugin stubs |
| community/ | 3 | Fork/upstream guides |
| contracts/ | 2 | Solana program stubs |
| packages/ | 4 | GuardDog npm package |
| .github/ | 2 | CI/CD workflows |
| root | 8 | CLAUDE.md, README.md, Cargo.toml, flake.nix, etc. |

### By Language

| Language | Files | Lines (est.) |
|----------|-------|-------------|
| JavaScript | 67 | ~47,000 |
| CSS | 1 | ~4,000 |
| HTML | 20 | ~6,000 |
| Rust | 47 | ~2,900 |
| Nix | 27 | ~2,600 |
| Shell | 20 | ~3,000 |
| Python | 12 | ~1,500 |
| SQL | 7 | ~800 |
| JSONL/JSON | 12 | ~500 |
| Markdown | 30+ | ~8,000 |
| CODIE | 9 | ~400 |
| TOML/YAML | 8 | ~500 |

---

## 3. Rust Workspace Analysis

### 3.1 Workspace Overview

- **Root manifest:** 217 lines, resolver 2, 39 members across 6 tiers + 2 binaries
- **Centralized dependencies:** 65+ external crates pinned at workspace level
- **Release profile:** thin LTO, codegen-units 1, strip, panic=abort
- **Disabled crates:** gently-spl (Solana conflicts), gently-py (PyO3 musl)

### 3.2 Crate-by-Crate Status

#### Tier 0: Foundation

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-core | 805 (5 files) | **REAL** | 14 | Blob store, SHA-256, 6-layer perms, Mask branding, AppConfig serialization |
| gently-codie | 84 | **REAL** | 0 | 12-keyword DSL parser |
| gently-artisan | 51 | Partial | 0 | Toroidal storage types, no traversal |
| gently-audio | 64 | Partial | 0 | AudioBuffer/Spectrum types, cpal/dasp/rustfft UNUSED |
| gently-visual | 61 | **REAL** | 0 | SVG document rendering (custom, not using `svg` crate) |
| gently-goo | 90 | **REAL** | 0 | SDF evaluation with CSG ops (math correct, Torus unimplemented) |
| gently-synth | 195 (2 files) | **REAL** | 5 | Local ledger, mint/transfer, NFT-to-Layer resolution |

#### Tier 1-2: Knowledge

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-feed | 52 | Stub | 0 | FeedChain types, no FeedProvider impl |
| gently-alexandria | 51 | Stub | 0 | Document/Collection types, rusqlite UNUSED |
| gently-search | 70 | Partial | 0 | SearchAggregator skeleton, reqwest UNUSED |
| gently-btc | 53 | Partial | 0 | BerlinClock epoch calc, bitcoin crate UNUSED |
| gently-ipfs | 42 | Stub | 0 | IpfsClient trait, reqwest/cid UNUSED |

#### Tier 3: Intelligence

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-brain | 44 | Stub | 0 | LlmBackend trait, no provider impls |
| gently-inference | 47 | Partial | 0 | Tensor::zeros(), ort crate NOT declared here |
| gently-agents | 42 | Stub | 0 | 5-element pipeline types, no Agent impl |
| gently-micro | 32 | Partial | 0 | Router skeleton, hyper UNUSED |
| gently-mcp | 37 | Partial | 0 | McpServer skeleton, no JSON-RPC protocol |
| gently-ged | 32 | Stub | 0 | Tutor trait only |
| gently-behavior | 31 | Stub | 0 | BehaviorEngine trait only |

#### Tier 4: Security

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-security | 38 | Partial | 0 | generate_salt() real, argon2 UNUSED |
| gently-cipher | 32 | Partial | 0 | HashChain with SHA-256, chacha20 UNUSED |
| gently-guardian | 42 | Stub | 0 | 16 DaemonType variants, rusqlite UNUSED |
| gently-guard | 331 (4 files) | **REAL** | 11 | PermissionEngine, benchmarks, anti-cheat spoof detection |
| gently-sim | 25 | Stub | 0 | ThreatModel types only, NO functions |
| gently-sploit | 34 | Partial | 0 | HomoglyphDetector with non-ASCII scan |

#### Tier 5: Network

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-network | 32 | Stub | 0 | Transport trait, rustls UNUSED |
| gently-bridge | 33 | Stub | 0 | BridgeHandler trait, tokio-tungstenite UNUSED |
| gently-dance | 39 | **REAL** | 0 | XOR secret split/reconstruct (crypto primitive) |
| gently-gateway | 24 | Stub | 0 | GatewayConfig types only, NO functions |
| gently-livepeer | 65 | Stub | 0 | VideoProvider trait (8 methods), most comprehensive trait |

#### Tier 6: Application

| Crate | Lines | Status | Tests | Key Content |
|-------|-------|--------|-------|-------------|
| gently-web | 36 | Partial | 0 | htmx_redirect/htmx_swap helpers |
| gently-architect | 30 | Stub | 0 | AppGenerator trait only |
| gently-document | 50 | Stub | 0 | Three-chain doc types (Content/Style/Logic) |
| gently-gooey | 38 | Stub | 0 | Widget types, crossterm UNUSED |
| gently-commerce | 39 | Stub | 0 | Commerce types, NO functions or traits |
| gently-google | 93 | Partial | 0 | OAuth URL generation, YouTube/Ads/Analytics traits |
| gently-tiktok | 70 | Partial | 0 | OAuth URL generation, TikTokApi trait |

#### Binaries

| Binary | Lines | Status | Key Content |
|--------|-------|--------|-------------|
| gently-cli | 115 | Shallow | CLI parses args, every command is println stub |
| gentlyos-tui | 82 | **REAL** | Functional ratatui 5-tab TUI shell |

#### Non-Workspace

| Crate | Lines | Status |
|-------|-------|--------|
| tools/monitor (angel-watch) | 12 (Cargo.toml only) | **BROKEN** -- no src/ directory |
| contracts/solana | 9 (Cargo.toml only) | **BROKEN** -- no programs/ directory |

### 3.3 Rust Test Coverage

| Location | Tests | Quality |
|----------|-------|---------|
| gently-core/lib.rs | 2 | Blob round-trip, store CRUD |
| gently-core/shelf.rs | 3 | Validation, dependency chains |
| gently-core/layer.rs | 3 | Layer ordering, permission table |
| gently-core/mask.rs | 3 | Defaults, validation |
| gently-core/app_config.rs | 3 | Round-trip, header, validate |
| gently-synth/tier.rs | 5 | Multiple tier resolutions |
| gently-guard/engine.rs | 5 | All check methods |
| gently-guard/benchmark.rs | 2 | Performance verification |
| gently-guard/anti_cheat.rs | 4 | Spoof detection, challenges |
| **TOTAL** | **30** | Concentrated in core + guard only |

### 3.4 Unused Dependency Analysis

| Dependency | Declared In | Actually Used |
|------------|-------------|---------------|
| gently-core | 32 crates | ~10 crates |
| tokio | 18 crates | 1 (gently-cli) |
| reqwest | 7 crates | 0 |
| bitcoin | 1 crate | 0 |
| cpal, dasp, rustfft | 1 crate | 0 |
| svg | 1 crate | 0 |
| rusqlite | 2 crates | 0 |
| pcap, pcsc, pnet | workspace | 0 |
| solana-sdk, solana-client | workspace | 0 |
| ort (ONNX) | workspace | 0 |

**Estimated compile-time waste from unused deps:** 40+ crates declared but never imported.

---

## 4. Electron App Analysis

### 4.1 Core Files

| File | Lines | Status | Role |
|------|-------|--------|------|
| main.js | 4,036 | **REAL -- monolith** | Main process, imports all 59 clients, registers hundreds of IPC handlers |
| preload.js | 1,600 | **REAL** | contextBridge API, mirrors all IPC channels |
| shell.html | 1,545 | **REAL** | Complete UI markup with 57 SVG icons |
| shell.css | 4,061 | **REAL** | Full design system with dark theme |
| shell.js | 4,455 | **REAL -- monolith** | Renderer logic, 100+ window-global functions |
| setup.html | 343 | **REAL** | First-boot setup with GitHub/Claude auth |
| stamp-inject.js | 67 | **REAL** | Content script for claude.ai webview |
| package.json | 51 | **REAL** | Electron 35+, React/MUI in devDeps |

### 4.2 Lib Clients (59 files, ~36,261 lines total)

All lib clients are REAL JavaScript implementations with full state machines, business logic, and data models. However, they are **in-memory simulations** -- data is stored in Maps/Arrays and lost on restart. They represent what would ultimately be backed by the Rust crates.

#### By Category

| Category | Clients | Lines | Notable |
|----------|---------|-------|---------|
| Infrastructure | 7 | ~3,400 | bridge-client (JSON-RPC to port 7335), tier-gate (627 lines, 100+ features), gateway (rate limiter + circuit breaker) |
| Knowledge/Data | 8 | ~3,800 | artisan (toroidal math in JS), architect (idea crystallization), codie (44-keyword DSL engine -- actually executes CODIE) |
| AI/ML | 11 | ~7,200 | model-hub (1,039 lines -- largest client), ollama/huggingface/kaggle (real HTTP clients), face-tracking (MediaPipe landmarks) |
| Security | 5 | ~3,500 | cipher (real Caesar/Vigenere/ROT13/XOR/Base58), sploit (Metasploit-style module system -- simulated), sim (IMSI/IMEI tracking) |
| Network/Comms | 10 | ~7,200 | miner (REAL Stratum v1 mining), telephony (Telnyx/Plivo APIs), gmail (IMAP/SMTP via subprocess), wireshark (tshark spawn) |
| Commerce | 3 | ~2,300 | miner (functional BTC solo miner), tradingview (PineScript generation, 1,049 lines), commerce (NLP query parsing) |
| Hardware/System | 4 | ~3,000 | controller (real evdev codes for Steam Deck), wayland (swaymsg/hyprctl spawn), vm (QEMU/VirtualBox lifecycle) |
| UI/UX | 7 | ~4,900 | startmenu (1,081 lines -- desktop launcher), tab-view-switcher, button-maker (SVG generation), hotkey-menu (radial menu) |

### 4.3 React Components (Orphaned)

| File | Lines | Status |
|------|-------|--------|
| App.jsx | 96 | **CANNOT RUN** -- no JSX build toolchain (no webpack/babel/vite) |
| Authentication.jsx | 179 | **CANNOT RUN** + **CRITICAL SECURITY BUG** -- uses LLM as auth backend |
| AIComparisonChat.jsx | 282 | **CANNOT RUN** -- calls Claude/Gemini APIs directly from renderer |

### 4.4 Electron Architecture Issues

1. **main.js is 4,036 lines** -- instantiates ALL 59 clients at startup regardless of tier
2. **preload.js is 1,600 lines** of boilerplate that could be auto-generated
3. **shell.js is 4,455 lines** with 100+ `window.` globals
4. **lib/ files NOT in electron-builder files array** -- production builds would fail
5. **No persistence layer** -- all 59 lib clients store data in-memory only

---

## 5. NixOS Configuration Analysis

### 5.1 File Status

| File | Lines | Status | Key Purpose |
|------|-------|--------|-------------|
| flake.nix | 152 | **REAL** | 5 nixosConfigurations, 4 ISO outputs, devShell |
| nixos/flake.nix | 33 | **BROKEN** | References 7 nonexistent modules |
| iso/default.nix | 124 | **REAL** | ISO base, gently user, auto-login, app deployment |
| iso/bootloader.nix | 74 | **REAL** | GRUB BIOS+UEFI dual boot |
| iso/partitions.nix | 86 | **REAL** | 5 partition schemes, gently-partition script |
| modules/gently-app.nix | 156 | **REAL** | Electron app derivation, LightDM session |
| modules/env-validation.nix | 280 | **REAL** | Hardware fingerprinting (most substantial module) |
| modules/tier-gate.nix | 174 | **BROKEN** | Reads /run at Nix eval time (always "free") |
| modules/session/gently-session.nix | 91 | **REAL** | greetd session, SSH keygen, Electron launch |
| modules/boot/order.nix | 123 | **REAL** | Boot sequence, initrd, gently-init target |
| modules/boot/stage-1.nix | 69 | **REAL** | initrd config, zstd compression |
| modules/boot/stage-2.nix | 114 | **REAL** | Stage 2 targets, system check, config load |
| modules/hardware/detect.nix | 110 | **REAL** | Hardware detection, firmware, OpenGL |
| modules/hardware/drivers.nix | 59 | **REAL** | NVIDIA/AMD/Intel, PipeWire, Bluetooth |
| modules/install/auto-install.nix | 137 | **REAL** | Interactive 6-step installer |
| modules/install/disk-setup.nix | 112 | **REAL** | Partitioning + formatting for all 5 schemes |
| modules/profiles/agents.nix | 40 | Stub | echo-only service |
| modules/profiles/base.nix | 58 | **REAL** | Free-tier baseline packages |
| modules/profiles/docker.nix | 25 | **REAL** | Docker daemon (exposes port 2375!) |
| modules/profiles/limbo.nix | 44 | Stub | echo-only service |
| modules/profiles/wine.nix | 17 | **REAL** | Wine WoW64 |
| modules/profiles/workbench.nix | 27 | **REAL** | Python, search tools, SSH |
| profiles/dev.nix | 98 | **REAL** | Dev tools, security tools, Solana (broken pkg refs) |
| profiles/full.nix | 95 | **REAL** | Full desktop (NVIDIA, fonts, PipeWire) |
| profiles/minimal.nix | 39 | **REAL** | Console-only installer |
| profiles/rescue.nix | 109 | **REAL** | Recovery tools (some broken pkg refs) |
| config/configuration.nix | 65 | **REAL** | Post-install config (no Gently modules!) |
| config/hardware-configuration.nix | 37 | Placeholder | Template for nixos-generate-config |

### 5.2 NixOS Critical Conflicts

| Issue | Severity | Impact |
|-------|----------|--------|
| LightDM vs greetd conflict | **CRITICAL** | full.nix imports both gently-app.nix (LightDM) and gently-session.nix (greetd) -- NixOS will refuse to evaluate |
| tier-gate.nix eval-time read | **CRITICAL** | `builtins.readFile "/run/gently-tier"` runs at build time, not boot time -- tier is always "free" |
| nixos/flake.nix broken imports | **CRITICAL** | References 7 module paths that do not exist in the repo |
| NVMe partition naming | **HIGH** | auto-install.nix gently-mount uses wrong partition suffixes for NVMe drives |
| Package name errors | **HIGH** | `photorec`, `fdisk`, `firmwareLinuxNonfree`, `solana-cli`, `anchor` are not valid nixpkgs package names |
| Deprecated options | **MEDIUM** | `hardware.opengl` -> `hardware.graphics`, `sound.enable`, `displayManager.defaultSession` |
| Post-install config gap | **MEDIUM** | config/configuration.nix does not import any Gently modules -- installed system has no Gently session |
| Docker 2375 exposed | **MEDIUM** | Docker daemon API port open without TLS |
| Electron app no npm install | **HIGH** | gently-app.nix copies app source without node_modules -- Electron will fail to start |

---

## 6. Scripts and Tools Analysis

### 6.1 Scripts

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| build-iso.sh | 75 | **REAL** | Builds ISO via `nix build`, with variant selection and size reporting |
| flash-usb.sh | 68 | **REAL** | Writes ISO to USB with dd, safety prompts |
| test-vm.sh | 82 | **REAL** | QEMU test with OVMF UEFI, 4GB RAM, KVM accel |
| crate-builder-bsart.sh | 205 | **REAL** | Tier-aware crate builder with Guardian confession/penance |
| doc-instruct.sh | 124 | **REAL** | Documentation generator scanning all crates |
| foundation-setup.sh | 199 | **REAL** | Foundation crate scaffold + Guardian DB init |
| download_minimax.py | 107 | **REAL** | HuggingFace model downloader for MiniMax-01 |
| hf_to_agent.py | 92 | **REAL** | HuggingFace model to GentlyOS agent converter |

### 6.2 Tools

| Directory | Files | Status | Purpose |
|-----------|-------|--------|---------|
| tools/agentic/ | 4 | **REAL** | Agent Bible (governance spec), build instructions |
| tools/codie-maps/ | 9 | **REAL** | CODIE orchestration maps (master, rebuild, install, etc.) |
| tools/guardian/ | 14 | **REAL** | SQLite schema (7 SQL files), entity/daemon registries (6 JSONL), guardian.db binary |
| tools/installer/ | 5 | **REAL** | Hardware detection, LAN discovery, validation, install |
| tools/validators/ | 4 | **REAL** | Platform validators (Linux, macOS, Steam Deck, Windows) |
| tools/filetrees/ | 1 | **REAL** | File tree registry (JSONL) |
| tools/monitor/ | 1 | **BROKEN** | Cargo.toml only, no source code |

### 6.3 Docker

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| Dockerfile | 65 | **REAL** | Multi-stage Rust build + Electron app |
| Dockerfile.minimal | 46 | **REAL** | Rust-only slim build |
| docker-compose.yml | 72 | **REAL** | 4 services: app, bridge, guardian, monitoring |

### 6.4 Mining

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| mine.sh | 635 | **REAL** | 16-step preflight + launcher for headless miner |
| headless-miner.js | 762 | **REAL** | Zero-dep BTC solo miner (Stratum v1, secp256k1, Base58Check) |

**Mining Assessment:** Technically correct implementation of Stratum v1 protocol with wallet generation. However, CPU mining BTC with Node.js is computationally futile -- the network hashrate makes solo CPU mining effectively impossible. The Z3RO2Z "sacred nonce" system (XOR=73, golden ratio, mod arithmetic) provides zero statistical advantage.

---

## 7. Supporting Files Analysis

### 7.1 SDK (50+ files)

Two parallel Electron app prototypes (`sdk/electron/` and `sdk/electron-app/`), 15 HTML prototypes demonstrating various UI concepts, 10 Python model files (gematria, boot logic, clan management, tier resolution, stamp system), and 5 architecture documents. These are historical/prototype files.

### 7.2 Documentation

| File | Lines | Status |
|------|-------|--------|
| docs/REPORT.md | Project statistics and crate listing |
| docs/CLAUDE_COMPILED.md | Compiled Claude Code instructions |
| docs/INTEGRATION-SCOPE.md | Integration planning doc |
| docs/GENTLYOS-ARCHITECTURE.md | Architecture overview |
| docs/GENTLYOS_ARCHITECTURE.md | Second architecture overview (different content) |
| docs/GENTLY_BUSINESS_AUTOMATION_FEED_VIBE.md | Business automation spec |
| docs/prototypes/*.html | 3 UI prototypes (v6, v14, crystallized) |

### 7.3 Root Files

| File | Lines | Status | Issues |
|------|-------|--------|--------|
| CLAUDE.md | ~400 | **REAL** | Comprehensive project guide |
| README.md | 132 | **REAL** | Says Sway desktop (contradicts CLAUDE.md X11); says MIT license |
| SKILLS.md | 304 | Aspirational | 50+ skills spec for unbuilt system |
| SWARM-SKILLS.md | 665 | Aspirational | 20+ agent roles, 16 daemons, Kabbalistic governance |
| .bazelrc | 31 | Semi-stub | Bazel config with placeholder SHA |
| WORKSPACE.bazel | 36 | Stub | All functional code commented out |
| .gitignore | 38 | **REAL** | Missing bazel-* and btc-data/ ignores |

### 7.4 GuardDog Package

| File | Lines | Status |
|------|-------|--------|
| packages/guarddog/index.js | 137 | **REAL** | Factory + unified exports |
| packages/guarddog/package.json | 58 | **REAL** | Zero runtime deps |
| packages/guarddog/README.md | 268 | **REAL** | Comprehensive API docs |
| packages/guarddog/LICENSE.md | 73 | **REAL** | Custom restrictive "Sovereign License" (NOT MIT) |

### 7.5 Extensions

| Extension | Status | Code Exists? |
|-----------|--------|-------------|
| nvim-gentlyos | README only | **NO** -- no Lua plugin code |
| vscode-gentlyos | Manifest + README | **NO** -- no TypeScript source (tsconfig exists but no src/) |

### 7.6 Community

| File | Status | Issue |
|------|--------|-------|
| community/FORK.md | Aspirational | Describes on-chain fork registration that does not exist |
| community/UPSTREAM.md | Aspirational | Describes CLI commands that do not exist |
| community/registry.json | Stub | Empty arrays, placeholder Solana address |

### 7.7 Contracts

| File | Status | Issue |
|------|--------|-------|
| contracts/solana/Anchor.toml | Stub | Placeholder program IDs (all 1s) |
| contracts/solana/Cargo.toml | Stub | Empty workspace, no programs/ directory |

---

## 8. Critical Issues (Blast Radius: HIGH)

These issues prevent the system from building, booting, or running.

### C1: NixOS Display Manager Conflict
- **Files:** modules/gently-app.nix, modules/session/gently-session.nix, profiles/full.nix
- **Issue:** full.nix imports both modules. gently-app.nix enables LightDM; gently-session.nix enables greetd. NixOS refuses to evaluate with two display managers active.
- **Blast radius:** Full ISO cannot be built. The `iso-full` nix build target will fail.
- **Fix:** Choose one display manager and remove the other.

### C2: Tier Gate Eval-Time File Read
- **Files:** modules/tier-gate.nix
- **Issue:** `builtins.readFile "/run/gently-tier"` executes at Nix evaluation time (build machine), not at runtime (target machine). File never exists during build, so tier is always "free".
- **Blast radius:** The entire NFT-based tier gating system is non-functional. All builds get free tier only.
- **Fix:** Move tier resolution to a systemd service + activation script instead of Nix eval-time conditionals.

### C3: Electron App Missing node_modules
- **Files:** modules/gently-app.nix
- **Issue:** The `gentlyApp` derivation copies raw app source with `dontBuild = true` and no `npm install`. The app has dependencies in package.json (including guarddog) that will not be present.
- **Blast radius:** Gently Electron app will crash on launch in the ISO.
- **Fix:** Add an npm install/ci step to the derivation, or use node2nix/dream2nix.

### C4: nixos/flake.nix References Nonexistent Modules
- **Files:** nixos/flake.nix
- **Issue:** Imports 7 modules (nvidia.nix, desktop.nix, gaming.nix, purgatory.nix, development.nix, apps-bundle.nix, hardware-configuration.nix) that do not exist under nixos/.
- **Blast radius:** This flake cannot evaluate at all.
- **Fix:** Either create the missing modules or remove this flake (it duplicates the root flake).

### C5: React Components Have No Build Toolchain
- **Files:** app/components/App.jsx, Authentication.jsx, AIComparisonChat.jsx
- **Issue:** JSX files require compilation (babel/webpack/vite), but no build toolchain is configured in the project.
- **Blast radius:** All 3 React components are dead code. They cannot execute.
- **Fix:** Either add a JSX build pipeline or remove the components.

### C6: Authentication.jsx Uses LLM as Auth Backend
- **Files:** app/components/Authentication.jsx
- **Issue:** Sends username + hashed password to Claude API asking it to "authenticate" the user. This is not real authentication. The LLM generates unpredictable, unreliable responses that are parsed as auth tokens.
- **Blast radius:** If ever enabled, any user could authenticate with any credentials (or no credentials).
- **Fix:** Implement real authentication (OAuth, JWT, session tokens).

### C7: Broken Rust Crates
- **Files:** tools/monitor/Cargo.toml, contracts/solana/Cargo.toml
- **Issue:** tools/monitor has a Cargo.toml but no source directory. contracts/solana references `programs/*` members that do not exist.
- **Blast radius:** `cargo build` on these directories will fail.
- **Fix:** Either add source files or remove the dead manifests.

---

## 9. Major Issues (Blast Radius: MEDIUM)

### M1: lib/ Files Missing from Electron Builder
- **Files:** app/package.json
- **Issue:** The 59 lib/ client files are not in electron-builder's `files` array. Production builds exclude them.
- **Blast radius:** Packaged Electron app would crash at startup (cannot find modules).

### M2: NVMe Partition Bug
- **Files:** modules/install/auto-install.nix
- **Issue:** gently-mount uses `${DEVICE}2` format but NVMe drives use `${DEVICE}p2` format. Auto-install would fail on NVMe drives.
- **Blast radius:** Installation fails on any NVMe-based system.

### M3: Invalid NixOS Package Names
- **Files:** profiles/rescue.nix, profiles/dev.nix, modules/hardware/detect.nix
- **Issue:** `photorec`, `fdisk`, `firmwareLinuxNonfree`, `solana-cli`, `anchor` are not valid nixpkgs attributes.
- **Blast radius:** rescue and dev profiles fail to evaluate.

### M4: License Inconsistency
- **Files:** README.md, packages/guarddog/LICENSE.md
- **Issue:** README says MIT. GuardDog uses a restrictive "Sovereign License" prohibiting reverse engineering and derivative works.
- **Blast radius:** Legal ambiguity for contributors and users.

### M5: Deprecated NixOS Options
- **Files:** Multiple modules
- **Issue:** `hardware.opengl` (now `hardware.graphics`), `sound.enable` (deprecated), `displayManager.defaultSession` (moved).
- **Blast radius:** Deprecation warnings or evaluation errors on NixOS 24.11.

### M6: Post-Install Config Missing Gently
- **Files:** config/configuration.nix
- **Issue:** Does not import gently-app.nix or gently-session.nix. Installed system would be plain NixOS without Gently.
- **Blast radius:** Users who install to disk lose the Gently experience.

### M7: Docker Port 2375 Exposed
- **Files:** modules/profiles/docker.nix
- **Issue:** Docker daemon API port open to network without TLS authentication.
- **Blast radius:** Any machine on the network can control the Docker daemon (RCE).

### M8: 6.7 MB JSON in Git
- **Files:** btc-data/block_934892.json
- **Issue:** Large binary-like JSON committed directly to git.
- **Blast radius:** Repository bloat, slow clones.

### M9: Architecture Contradiction
- **Files:** README.md, CLAUDE.md
- **Issue:** README says Sway (Wayland) desktop. CLAUDE.md says X11 with no DE. These are different architectures.
- **Blast radius:** Contributor confusion about the actual session target.

### M10: CLI Bridge Command Injection
- **Files:** app/lib/cli-bridge.js
- **Issue:** Passes unsanitized arguments to `spawn('gently', [...])`.
- **Blast radius:** If user-controlled input reaches CLI args, arbitrary command execution.

---

## 10. Minor Issues (Blast Radius: LOW)

| ID | Issue | Files |
|----|-------|-------|
| L1 | stamp-inject.js MutationObserver creates duplicate event listeners | app/inject/stamp-inject.js |
| L2 | preload.js event listeners never cleaned up (memory leak) | app/preload.js |
| L3 | CSP allows unsafe-inline for scripts/styles | app/shell.html |
| L4 | Duplicate i-chart SVG symbol | app/shell.html |
| L5 | Emoji usage violates project rules | packages/guarddog/README.md, web/download/index.html |
| L6 | Bazel WORKSPACE.bazel has placeholder SHA256 | WORKSPACE.bazel |
| L7 | nixpkgs-unstable input declared but unused | flake.nix |
| L8 | Redundant option definitions across NixOS modules | Multiple .nix files |
| L9 | Default credentials in ISO (gently/gently + SSH root) | iso/default.nix |
| L10 | Repository name inconsistency across files | Multiple |
| L11 | Version inconsistency (1.0.0 vs 1.1.1) | web/download/index.html, web/install.sh |
| L12 | GRUB rescue entries have placeholder boot paths | iso/bootloader.nix |
| L13 | setup.html uses deprecated document.execCommand('copy') | app/setup.html |
| L14 | gently-codie imports gently_core::Result but never uses it | crates/foundation/gently-codie/src/lib.rs |
| L15 | gently-goo Torus SDF falls through to 0.0 | crates/foundation/gently-goo/src/lib.rs |
| L16 | Missing .gitignore for bazel-* directories | .gitignore |
| L17 | Mining Z3RO2Z nonce hints have no mathematical basis | mining/mine.sh, mining/headless-miner.js |

---

## 11. Maturity Matrix

### By Component (0-5 scale)

| Component | Design | Implementation | Testing | Docs | Overall |
|-----------|--------|---------------|---------|------|---------|
| gently-core (Rust) | 5 | 5 | 4 | 3 | **4.3** |
| gently-guard (Rust) | 4 | 5 | 5 | 2 | **4.0** |
| gently-synth (Rust) | 4 | 4 | 4 | 2 | **3.5** |
| Electron main.js | 4 | 4 | 0 | 2 | **2.5** |
| Electron lib/ clients | 3 | 4 | 0 | 3 | **2.5** |
| shell.js renderer | 3 | 3 | 0 | 1 | **1.8** |
| NixOS ISO build | 4 | 3 | 0 | 2 | **2.3** |
| NixOS installer | 4 | 3 | 0 | 1 | **2.0** |
| NixOS session | 3 | 2 | 0 | 2 | **1.8** |
| Guardian DB/tools | 4 | 3 | 0 | 3 | **2.5** |
| Mining scripts | 3 | 4 | 0 | 1 | **2.0** |
| CODIE system | 4 | 3 | 0 | 3 | **2.5** |
| Rust workspace (other 24 crates) | 3 | 1 | 0 | 1 | **1.3** |
| React components | 2 | 1 | 0 | 0 | **0.8** |
| Solana contracts | 2 | 0 | 0 | 1 | **0.8** |
| Extensions (nvim/vscode) | 3 | 0 | 0 | 4 | **1.8** |
| Community/Fork system | 3 | 0 | 0 | 4 | **1.8** |
| Bazel integration | 1 | 0 | 0 | 0 | **0.3** |

### Implementation Stages

```
COMPLETE (production-ready):
  - gently-core: Blob store, permissions, Mask, AppConfig
  - gently-guard: Permission engine, benchmarks, anti-cheat

FUNCTIONAL (works but needs polish):
  - Electron app: main.js + 59 lib clients + shell renderer
  - NixOS ISO: Builds (if conflicts fixed) with installer
  - Mining: Technically functional (but economically futile)
  - TUI: gentlyos-tui is a working terminal interface

SCAFFOLDED (types exist, no logic):
  - 24 Rust crates: Struct + enum + trait declarations only
  - gently-cli: Parses args, prints stubs

NOT STARTED:
  - Solana contracts (empty workspace)
  - Extension code (README only)
  - On-chain fork registry
  - Bazel build system
  - Limbo sacrificial proxy
  - 16-daemon Guardian runtime
```

---

## 12. Dependency Analysis

### External Service Dependencies

| Service | Used By | Required? | Available? |
|---------|---------|-----------|------------|
| solo.ckpool.org:3333 | mining/ | Optional | External |
| localhost:7335 | bridge-client.js | Yes (for Rust IPC) | Not running (no bridge server impl) |
| localhost:11434 | ollama-client.js | Optional | Requires Ollama installed |
| localhost:5001 | ipfs-client.js | Optional | Requires IPFS daemon |
| Porkbun API | porkbun-client.js | Optional | Requires API key |
| HuggingFace API | huggingface-client.js | Optional | Requires HF_TOKEN |
| Kaggle API | kaggle-client.js | Optional | Requires API key |
| Telnyx/Plivo/Bandwidth | telephony-client.js | Optional | Requires API keys |
| Gmail IMAP/SMTP | gmail-client.js | Optional | Requires OAuth2 |
| LivePeer API | livepeer-client.js | Optional | Requires API key |

### Circular/Broken Dependencies

1. **bridge-client.js -> port 7335 -> gently-bridge crate**: The JS client calls the Rust bridge, but gently-bridge is a stub (no WebSocket server). The bridge is broken.
2. **tier-gate.js -> bridge-client.js -> gently-synth**: JS tier gate checks bridge for chain-verified tier, but chain verification in gently-synth/tier.rs returns stub `Layer::User` for all non-local chains.
3. **guarddog -> app/main.js**: main.js imports guarddog from `file:../packages/guarddog`, but guarddog's lib/ dependencies (guarddog-dom, workbench-pane, env-validator) may not exist.

---

## 13. Security Audit

### Critical

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| S1 | CRITICAL | LLM used as authentication backend | app/components/Authentication.jsx |
| S2 | CRITICAL | Docker API port 2375 exposed without TLS | modules/profiles/docker.nix |

### High

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| S3 | HIGH | CLI bridge unsanitized command injection | app/lib/cli-bridge.js |
| S4 | HIGH | Bridge RPC port 7335 no auth/TLS | app/lib/bridge-client.js |
| S5 | HIGH | Default password gently/gently with SSH root | iso/default.nix |
| S6 | HIGH | API keys stored in VS Code settings JSON | extensions/vscode-gentlyos/package.json |
| S7 | HIGH | preload.js exposes entire system API without validation | app/preload.js |

### Medium

| ID | Severity | Description | Location |
|----|----------|-------------|----------|
| S8 | MEDIUM | CSP allows unsafe-inline scripts/styles | app/shell.html |
| S9 | MEDIUM | curl pipe to sudo bash install | web/install.sh |
| S10 | MEDIUM | No input sanitization on setup.html form | app/setup.html |
| S11 | MEDIUM | gently-dance XOR split has no tests for crypto primitive | crates/network/gently-dance/src/lib.rs |
| S12 | MEDIUM | Wireshark client can spawn tshark/tcpdump (privilege escalation) | app/lib/wireshark-client.js |
| S13 | MEDIUM | Controller client reads /dev/input (requires root/input group) | app/lib/controller-client.js |

---

## 14. Recommendations

### Immediate (Unblock Building)

1. **Fix display manager conflict** in full.nix -- pick LightDM or greetd, not both
2. **Fix tier-gate.nix** -- move tier resolution from Nix eval-time to systemd activation script
3. **Add npm install** to gently-app.nix derivation
4. **Fix invalid package names** in rescue.nix and dev.nix (photorec, fdisk, solana-cli)
5. **Remove or fix** nixos/flake.nix (broken module imports)

### Short-Term (Stabilize)

6. **Add lib/ to electron-builder files** in app/package.json
7. **Remove Authentication.jsx** or replace with real auth
8. **Close Docker port 2375** or add TLS authentication
9. **Sanitize CLI bridge arguments** to prevent command injection
10. **Add .gitignore entries** for bazel-* directories and btc-data/
11. **Resolve README vs CLAUDE.md** architecture contradiction (X11 vs Sway)
12. **Unify license** across the project (MIT or Sovereign, not both)

### Medium-Term (Build Out)

13. **Implement the Rust bridge server** in gently-bridge (WebSocket on port 7335) to connect Electron to Rust
14. **Add tests** to the 24 untested Rust crates (at minimum, the crypto-related ones: gently-dance, gently-cipher)
15. **Split Electron monoliths**: main.js (4K lines) -> modular IPC handlers; shell.js (4.5K lines) -> scope modules
16. **Add persistence** to lib/ clients (SQLite, filesystem, or delegate to Rust via bridge)
17. **Prune unused workspace dependencies** (~40 crates declared but never imported)

### Long-Term (Complete Vision)

18. **Implement 24 stub crates** with actual logic behind the trait definitions
19. **Build the Solana programs** or remove the contracts/ directory
20. **Build the editor extensions** or remove the READMEs
21. **Build the on-chain fork registry** or simplify community/FORK.md
22. **Implement the 16-daemon Guardian runtime** or simplify SWARM-SKILLS.md
23. **Consider Nix-native Node packaging** (node2nix or dream2nix) instead of raw file copies

---

## Appendix: Files Not Scanned

The following were excluded from deep scan:

- `Cargo.lock` (auto-generated, 5000+ lines)
- `app/package-lock.json` (auto-generated)
- `sdk/electron/package-lock.json` (auto-generated)
- `sdk/electron-app/package-lock.json` (auto-generated)
- `release-assets/gently-linux-amd64` (compiled binary)
- `release-assets/gentlyos-tui-linux-amd64` (compiled binary)
- `tools/guardian/guardian.db` (SQLite binary)
- `docs/*.docx` (binary Word documents)

---

*Report generated by Claude Code (Opus 4.6) -- full agentic scan of 358 files across 5 technology stacks.*
