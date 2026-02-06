# GentlyOS v1.0 — Complete Architecture Reference

**Author:** Thomas Lee
**Date:** February 2, 2026
**For:** Claude Code / Opus agents / Solo dev reference
**Status:** Active development — 10-day MVP sprint

---

## 1. What GentlyOS Is

GentlyOS is a sovereignty-first operating system where Claude is the primary interface. It runs on NixOS, renders through Electron (Chromium), defends with GuardDog, and anchors trust to blockchain smart contracts. The user owns the boot, the keys, the data, and the update path.

This is not a Linux distro with an AI chatbot bolted on. The AI IS the shell. The DOM IS the filesystem. The smart contract IS the package manager. Every layer from UEFI to pixel is designed so that nobody except the owner can inject, redirect, or observe what happens on this machine.

---

## 2. Boot Sequence — Trust Flows Down

```
POWER ON
   |
   v
NixOS (flake.nix) --- deterministic, frozen, reproducible
   |                    hash-locked build. Nothing installs at runtime.
   |
   v
Electron main.js ----- creates BrowserWindow. This IS Chromium.
   |                    The DOM doesn't exist yet.
   |
   v
preload.js ------------ GuardDog DOM activates on document.documentElement
   |                     MutationObserver wraps the ROOT.
   |                     <body> hasn't rendered. Nothing enters unobserved.
   |
   v
* WORKBENCH PANE * ---- BrowserView created (NOT iframe). Boot-level trust.
   |                     Own preload, own process, Python subprocess spawns.
   |                     WebSocket bridge connects. This is the COCKPIT.
   |
   v
shell.html renders ---- Pane A (Claude chat) + Pane B (scope/files) + toolbar
   |                     All born INSIDE GuardDog observation field.
   |                     All BELOW the cockpit in trust level.
   |
   v
Agents activate ------- Chrome Claude, 34 AI agents (VOS), Proton iframes
                         All read/write DOM through GuardDog.
                         All state managed by fork tree.
```

**Critical insight:** The Workbench Pane opens AFTER GuardDog but BEFORE the shell. It has boot-level trust because it was born before any content rendered. Everything below it (Claude, agents, apps) exists in a lower trust zone.

---

## 3. Tier Architecture

```
+==============================================================+
|  TIER 7: CHAIN ANCHOR                                        |
|  Ethereum + Solana smart contracts                           |
|  Wallet gates ALL updates, app approvals, dev-tier access    |
|  Genesis NFT determines what tier you're on                  |
+==============================================================+
|  TIER 6: DEV ENVIRONMENT                                     |
|  Docker orchestration - frictionless update/reboot layer     |
|  Solana Anchor dev, Wine workbench, hot-reload containers    |
+==============================================================+
|  TIER 5: LIMBO (Sacrificial)                                 |
|  Burpsuite proxy, Metasploit, Puppeteer                      |
|  DEV PAYWALL GATED - locked behind Tier 7 wallet approval    |
+==============================================================+
|  TIER 4: SECURITY (Always-On)                                |
|  GuardDog IO defense, 16 daemons, Rainbow tables             |
|  Runs in ALL tiers - defense suite NEVER paywalled           |
+==============================================================+
|  TIER 3: NETWORK GATEWAY                                     |
|  Feed chain, proxy routing, DNS resolution                   |
+==============================================================+
|  TIER 2: INTELLIGENCE                                        |
|  AI inference, model routing, agent orchestration            |
+==============================================================+
|  TIER 1: KNOWLEDGE                                           |
|  Knowledge graph, RAG, semantic indexing                     |
+==============================================================+
|  TIER 0: FOUNDATION (Memory-Locked)                          |
|  XOR split-knowledge, key rotation, sealed core              |
|  Node/Python state injected from above - never fails         |
+==============================================================+
```

**State flows DOWN.** Tier 7 (wallet) approves everything. Tier 6 (Docker) builds frozen images. Tiers 0-3 consume via read-only mounts. Containers never run `npm install` or `pip install`. Dependencies are pre-built, hash-verified, and mounted read-only.

---

## 4. GuardDog — Tier 0 IO Defense

GuardDog is the immune system. It is NOT a feature. It is NOT paywalled. It runs at every tier, in every process, on every IO path.

### What It Detects

| Attack | Example | Threat Level | Action |
|--------|---------|:---:|--------|
| Cyrillic homoglyph | paypal.com (Cyrillic a) | 7 | BLOCK + LOG |
| Greek homoglyph | google.com (Greek o) | 7 | BLOCK + LOG |
| Zero-width space | admin pass | 3 | Strip |
| RTL override | virus.exe | 6 | BLOCK |
| Fullwidth chars | paypal | 2 | Normalize |
| Domain spoof | apple.com (combined) | 7+ | BLOCK + LOG |
| Token poison | API key with hidden chars | 3 | Clean before store |
| Predictive blend | lattern (pattern+latter) | 2 | SUSPICIOUS |

### Dual Runtime

GuardDog exists in two runtimes that mirror each other:

**Node.js** (`packages/guarddog/`): Runs in Electron renderer. Scans DOM, input fields, IPC messages. Exposed via `window.gently.guarddog.scan/clean/process`.

**Rust** (`crates/security/gently-guardian/`): Runs in sealed core. Scans all data crossing IPC boundary. Native performance, no GC pauses.

### DOM Integration

GuardDog DOM (`lib/guarddog-dom.js`) wraps the entire document tree with a MutationObserver:

- **childList**: Every node added to the DOM is scanned. Scripts detected. Iframes sandbox-validated.
- **characterData**: Every text change scanned for homoglyphs, invisibles, RTL overrides.
- **attributes**: Every attribute change checked for event handler injection, dangerous URIs.

Three modes: `monitor` (log only), `enforce` (auto-clean), `lockdown` (block + remove).

### BTC Timestamping

Every scan result is anchored to a Bitcoin block. This creates an immutable evidence chain:
1. Fetch current BTC block from blockchain.info API
2. Generate proof hash: SHA256(payload + blockHash)
3. Store: blockHeight, blockHash, blockTime, dataHash, proofHash
4. Merkle root of all anchors for batch verification

### IPC API

```javascript
// From any renderer process (shell, workbench, agent pane)
window.gently.guarddog.scan(input)    // -> { threat, findings, blocked }
window.gently.guarddog.clean(input)   // -> { cleaned, changed }
window.gently.guarddog.process(input) // -> scan + clean combined
```

### File Structure

```
packages/guarddog/
  index.js              # Unified exports + createGuardDog() factory
  package.json          # npm-ready, bin: guarddog/gd
  lib/guarddog.js       # Core detection/normalization (GuardDog, TokenVault, InputSanitizer)
  lib/guarddog-dom.js   # DOM MutationObserver immune system
  lib/guarddog-preload.js # Electron preload integration
  lib/btc-anchor.js     # BTC block timestamping + merkle proofs
  lib/rainbow.js        # node_modules vulnerability scanner
  lib/distiller.js      # Token compression + key generation
  lib/workbench-pane.js # Workbench BrowserView + ForkTree + ScriptCage
  cli/guarddog.js       # 7-step CLI (init/scan/dashboard)
  dashboard/server.js   # HTMX dashboard on :7733
  workbench/server.py   # Python bridge subprocess
  workbench/index.html  # Workbench renderer UI
  rust/Cargo.toml       # gently-guarddog crate
  rust/src/lib.rs       # Native Rust implementation
  test/test.js          # 47 assertions, all passing
```

---

## 5. Workbench Pane — The Python-Rubix Cockpit

### What It Is

A trusted side window with boot-level access, backed by a real Python subprocess, that gives you direct manipulation of the operating surface. Toggle patterns on/off, link data across pages, freeze scripts until confirmed, fork/rewind state at any point.

The name "Rubix" comes from the multi-dimensional manipulation - you're rotating faces of a state cube, where each rotation (toggle, script execution, pattern link) creates a new fork in the state tree.

### Why BrowserView, Not Iframe

**Iframe** = sandboxed child living inside your page. Putting the cockpit inside the airplane cabin.

**BrowserView** = separate Chromium renderer attached to the window. Own process, own preload, own DOM tree. Sits BESIDE the shell, not inside it. Electron composites them visually but they're architecturally peers.

```
+----------------------------------------------------------+
|  Electron Window                                          |
|                                                           |
|  +--------------------+  +-----------------------------+  |
|  |  SHELL             |  |  WORKBENCH (BrowserView)    |  |
|  |  (BrowserWindow)   |  |  --------------------------  |  |
|  |                    |  |  Python subprocess          |  |
|  |  Pane A: Claude    |  |  Real-time HTML pipe        |  |
|  |  Pane B: Scope     |  |  Toggle grid                |  |
|  |  Toolbar, tabs     |  |  Script cage (frozen)       |  |
|  |  Agent workspace   |  |  Fork tree (rewindable)     |  |
|  |                    |  |  Pattern linker             |  |
|  |  <- GuardDog       |  |  Multi-modal output         |  |
|  |    watches both    |  |                             |  |
|  +--------------------+  +-----------------------------+  |
+----------------------------------------------------------+
```

### Core Components

#### 5a. Fork Tree — Every Action Branches, Any Node Rewindable

The fork tree is a DAG (directed acyclic graph) where every state-changing action creates a new node. You can rewind to any node and branch differently.

```
                    genesis
                      |
                 toggle:view->on
                   /        \
          exec:analysis    exec:alternative
             /    \              |
        fork:A   fork:B     rewind->genesis
                                |
                          exec:completely_different_approach
```

**API:**
```javascript
forkTree.init(state)           // Create genesis node
forkTree.fork(state, label)    // Branch from current head
forkTree.rewind(nodeId)        // Move head to any node
forkTree.current()             // Get current state
forkTree.ancestry()            // Get chain from head to root
forkTree.branches(nodeId)      // Get all children of a node
forkTree.toTree()              // Full tree for visualization
```

Every toggle click, every script execution, every pattern link creates a fork. The tree never loses history. This is how "rewindable inference" works - each inference step is a fork, and you can explore alternative paths without losing work.

#### 5b. Script Cage — Frozen Until Confirmed

Scripts generated by Claude, agents, or pipelines are NEVER auto-executed. They enter the cage in a FROZEN state. You see the code, the hash, a preview of what it imports, whether it touches network or filesystem. Only on explicit confirmation does it run.

```
Stage -> FROZEN (visible, hashed, previewed)
  |
  +- [Confirm] -> Fork pre-state -> Execute -> Fork post-state -> Results
  |
  +- [Reject] -> Logged, never runs
```

**Preview shows:**
- First line of code
- Line count
- Has imports? (which ones)
- Touches network? (fetch, requests, http, urllib, socket)
- Touches filesystem? (open, write, readFile, fs)

This is how you maintain sovereignty over code execution. Claude can suggest. Agents can generate. But nothing runs without your click.

#### 5c. Pattern Linker — Toggle-Click-Click Across Pages

Patterns are reusable data/view templates. You define a pattern (a schema), instantiate it on pages, and link instances across pages. When data flows through one instance, linked instances can react.

**Toggle states:** Each toggle has named states (not just on/off). Click cycles through them. Every click forks the state tree.

```javascript
patterns.define('data-view', { columns: [...], filter: '...' })
patterns.instantiate('data-view', 'page-1', { filter: 'active' })
patterns.instantiate('data-view', 'page-2', { filter: 'archived' })
patterns.link(instance1, instance2, 'mirror')

patterns.toggle('analysis-mode', ['off', 'basic', 'deep', 'recursive'])
// click -> 'basic', click -> 'deep', click -> 'recursive', click -> 'off'
```

#### 5d. Python Bridge — Real-Time HTML Pipe

A Python subprocess (server.py) runs alongside the Workbench. Communication is JSON over stdin/stdout. Python can:

- **exec**: Execute arbitrary Python code (after ScriptCage confirmation)
- **render**: Generate HTML from templates + data
- **render_table**: Generate HTML tables from headers + rows
- **render_chain**: Generate chain-of-thought visualizations
- **render_multimodal**: Blend tables + chains + text + code + charts
- **pipeline**: Run multi-step data pipelines with real-time progress
- **push**: Send real-time data to the Workbench (no request needed)

The Python namespace persists across calls. Variables set in one exec are available in the next. This means you can build up state incrementally, inspect it, fork it, rewind it.

#### 5e. Multi-Modal Output

Results aren't just text. They're blended blocks:

```json
[
  { "type": "text", "data": { "content": "Analysis results:" } },
  { "type": "table", "data": { "headers": ["Metric", "Value"], "rows": [...] } },
  { "type": "chain", "data": { "steps": [
    { "label": "Hypothesis", "type": "thought", "content": "..." },
    { "label": "Test", "type": "action", "content": "..." },
    { "label": "Result", "type": "result", "content": "..." }
  ] } },
  { "type": "code", "data": { "language": "python", "content": "..." } }
]
```

Tables, chains of thought, code blocks, charts, raw HTML - all blended together in the output area. The fork tree preserves each output state, so you can rewind to see what a previous analysis looked like.

---

## 6. Master .env Vault — One Spot for All API Keys

### The Problem

API keys scattered across projects, .env files, clipboard history, chat logs. Every new tool needs you to hunt down the right key, paste it, hope you didn't grab the wrong one or a poisoned version.

### The Solution

One encrypted vault at the root of GentlyOS. All API keys live here. All apps, containers, scripts, and agents read from this vault through a sealed IPC channel. You add a key once. You never touch it again.

### Architecture

```
~/.gentlyos/.env.vault (encrypted at rest, AES-256-GCM)
   |
   +-- GuardDog cleans every key before storage (strip invisibles, homoglyphs)
   +-- Each key tagged with: service, tier, permissions, expiry
   +-- Access logged: which process read which key, when
   |
   +-- IPC channel: window.gently.vault.get('CLAUDE_API_KEY')
                     window.gently.vault.set('OPENAI_KEY', value)
                     window.gently.vault.list()
                     window.gently.vault.rotate('STRIPE_KEY')
```

### Key Categories

```
# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_KEY=AIza...
HUGGINGFACE_TOKEN=hf_...

# Blockchain
SOLANA_PRIVATE_KEY=...         (encrypted separately, hardware wallet preferred)
ETHEREUM_PRIVATE_KEY=...       (encrypted separately, hardware wallet preferred)
ALCHEMY_API_KEY=...
INFURA_API_KEY=...

# Services
STRIPE_SECRET_KEY=sk_live_...
GITHUB_TOKEN=ghp_...
VERCEL_TOKEN=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# GentlyOS Internal
GUARDDOG_KEY=GD_878123_a1b2c3d4...
GENESIS_NFT_TOKEN=...
BTC_ANCHOR_PROOF=...
```

### How It Works

1. **At install:** GentlyOS creates `~/.gentlyos/.env.vault` encrypted with a key derived from your Genesis NFT + machine-specific salt
2. **Adding keys:** GUI vault manager or `gently vault add ANTHROPIC_API_KEY sk-ant-...`
3. **Using keys:** Any GentlyOS process calls `vault.get('ANTHROPIC_API_KEY')` through IPC. The vault serves the key to that process. Logged.
4. **Never exposed:** Keys never appear in .env files on disk. Never in environment variables. Never in process args (visible via `ps`). Only served through the sealed IPC channel.
5. **Rotation:** `vault.rotate('STRIPE_KEY')` generates a new key via the service API (where supported), updates the vault, and all processes get the new key on next read.
6. **GuardDog scans:** Every key is scanned on input. If someone tries to store a key with hidden Unicode characters, GuardDog catches it.

### Container Access

Docker containers access vault keys through a mounted Unix socket:

```yaml
# docker-compose.yml
services:
  node-runtime:
    volumes:
      - /run/gently-vault.sock:/run/gently-vault.sock:ro
    environment:
      - GENTLY_VAULT_SOCKET=/run/gently-vault.sock
```

The container requests keys through the socket. The vault daemon (running in Tier 4) serves them. No key ever touches a Dockerfile, a layer cache, or a build log.

---

## 7. Multi-Fork Software Control

### The Problem

You're a solo developer building a system that others will fork, extend, and build on. You need to:
1. Push updates to ALL forks simultaneously
2. Allow others to make independent GitHub projects
3. Keep everything tied to your smart contract
4. Maintain sovereignty over the core while enabling community development

### The Solution: Upstream Core + Downstream Forks + On-Chain Registry

```
YOUR REPOSITORY (upstream)
  github.com/gentlyos/gently-nix
  |
  +-- Core crates (Tiers 0-4) - you control these
  +-- Smart contract addresses - immutable reference
  +-- flake.nix - deterministic build
  +-- Genesis NFT contract - determines fork rights
  |
  +-->  FORK A (community developer)
  |     github.com/alice/gently-trading-tools
  |     - Adds trading-specific crates at Tier 6
  |     - Registers fork on-chain (GentlyForkRegistry contract)
  |     - Pulls YOUR core updates via git upstream
  |     - Her additions are independent but anchored
  |
  +-->  FORK B (community developer)
  |     github.com/bob/gently-music-production
  |     - Adds audio processing at Tier 2
  |     - Registered on-chain
  |     - Pulls your updates
  |     - His additions are independent but anchored
  |
  +--> FORK C (enterprise)
        github.com/megacorp/gently-enterprise
        - Adds compliance tools at Tier 5
        - Licensed through smart contract
        - Pays per-seat via on-chain subscription
```

### Git Architecture

**Your repo structure:**
```
gently-nix/
  .github/
    workflows/
      core-release.yml     # Tags + builds core releases
      fork-notify.yml      # Notifies registered forks of updates

  core/                    # PROTECTED - only you push here
    crates/                # Tiers 0-4 Rust crates
    packages/guarddog/     # Tier 0 defense
    contracts/             # Smart contract source
    flake.nix              # Deterministic build

  community/               # Community-contributed modules
    registry.json          # On-chain fork registry mirror
    templates/             # Fork starter templates

  FORK.md                  # How to fork properly
  UPSTREAM.md              # How to pull core updates
```

**Fork workflow:**
```bash
# Community developer forks your repo
git clone https://github.com/gentlyos/gently-nix
cd gently-nix
git remote add upstream https://github.com/gentlyos/gently-nix

# They add their own modules
mkdir -p extensions/my-trading-tools
# ... develop ...

# They pull YOUR core updates
git fetch upstream
git merge upstream/main
# Core updates merge cleanly because they're in core/ directory
# Their additions in extensions/ are untouched

# They register their fork on-chain
gently fork register --name "Trading Tools" --repo "github.com/alice/gently-trading-tools"
# This calls the GentlyForkRegistry smart contract
```

### Smart Contract Fork Registry

```rust
// contracts/solana/programs/gently-fork-registry/src/lib.rs

#[program]
pub mod gently_fork_registry {
    use super::*;

    /// Register a new fork
    pub fn register_fork(
        ctx: Context<RegisterFork>,
        name: String,
        repo_url: String,
        upstream_commit: [u8; 20],  // Git commit hash of upstream they forked from
    ) -> Result<()> {
        let fork = &mut ctx.accounts.fork_account;
        fork.owner = ctx.accounts.owner.key();
        fork.name = name;
        fork.repo_url = repo_url;
        fork.upstream_commit = upstream_commit;
        fork.registered_at = Clock::get()?.unix_timestamp;
        fork.last_synced = upstream_commit;
        fork.tier = determine_tier(&ctx.accounts.owner_nft);
        Ok(())
    }

    /// Record that a fork synced with upstream
    pub fn record_sync(
        ctx: Context<RecordSync>,
        upstream_commit: [u8; 20],
    ) -> Result<()> {
        let fork = &mut ctx.accounts.fork_account;
        fork.last_synced = upstream_commit;
        fork.sync_count += 1;
        Ok(())
    }

    /// Your master update push - notifies all registered forks
    pub fn push_core_update(
        ctx: Context<PushCoreUpdate>,
        commit_hash: [u8; 20],
        changelog: String,
        breaking: bool,
    ) -> Result<()> {
        // Only the upstream owner (you) can call this
        require!(
            ctx.accounts.owner.key() == GENESIS_OWNER_PUBKEY,
            ErrorCode::Unauthorized
        );

        let update = &mut ctx.accounts.update_record;
        update.commit_hash = commit_hash;
        update.changelog = changelog;
        update.breaking = breaking;
        update.pushed_at = Clock::get()?.unix_timestamp;

        // Emit event - all fork watchers will see this
        emit!(CoreUpdateEvent {
            commit_hash,
            breaking,
            timestamp: update.pushed_at,
        });

        Ok(())
    }
}
```

### How You Push Updates to All Forks

1. **You push to your repo:**
   ```bash
   git tag v1.2.0
   git push origin main --tags
   ```

2. **GitHub Action fires `core-release.yml`:**
   - Builds the release
   - Hashes the commit
   - Calls `push_core_update` on the smart contract
   - Emits `CoreUpdateEvent` on-chain

3. **Fork watchers (running in Tier 6 Docker) detect the event:**
   - Each registered fork's update-service sees the on-chain event
   - Pulls from upstream
   - If `breaking: false` -> auto-merge, rebuild, swap containers
   - If `breaking: true` -> GUI notification: "Breaking update v1.2.0 - review required"

4. **Fork developers get notified:**
   - On-chain event visible to anyone watching the registry
   - GitHub webhook fires (if configured)
   - GentlyOS GUI shows: "Upstream update available: v1.2.0"

### How Forks Stay Independent But Anchored

**Independent:** Forks have their own GitHub repos, their own CI, their own release schedule. They can add any code they want in `extensions/`. They never need your permission to ship.

**Anchored:** Their fork is registered on-chain. The registry records which upstream commit they forked from and when they last synced. Users can verify: "Is this fork up to date with GentlyOS core? Is it registered? What tier does the developer hold?"

**Your control:**
- Core crates (Tiers 0-4) live in `core/` - only you push there
- The smart contract references YOUR repo as upstream
- Fork registry is public - anyone can see who forked what
- You can flag forks as "verified" (optional community trust signal)
- License enforced by smart contract: commercial use requires payment

---

## 8. NFT-Gated Tier System

### Every Level Gets the Version They Hold at Install

The Genesis NFT is not just an access token. It's a VERSION LOCK. When you install GentlyOS, the Genesis NFT in your wallet determines which tier you're on. That tier determines which features activate, which Docker containers start, and which tools are available.

### Tier Levels

```
+---------+----------------+-------------------------------------------+
|  Tier   |   NFT Level    |  What You Get                             |
+---------+----------------+-------------------------------------------+
| Free    | No NFT         | Core OS + GuardDog defense + Claude chat  |
|         |                | Single pane, no agents, no Docker         |
+---------+----------------+-------------------------------------------+
| Basic   | Genesis Basic  | + Workbench pane + Python bridge          |
|         |                | + Fork tree (5 depth max)                 |
|         |                | + .env vault (10 keys max)                |
+---------+----------------+-------------------------------------------+
| Pro     | Genesis Pro    | + Full fork tree (unlimited)              |
|         |                | + Docker containers (Tier 6)              |
|         |                | + Agent swarm (8 agents max)              |
|         |                | + .env vault (unlimited)                  |
|         |                | + Solana Anchor dev environment           |
+---------+----------------+-------------------------------------------+
| Dev     | Genesis Dev    | + Limbo layer (Tier 5)                    |
|         |                | + Burpsuite, Metasploit (NFT-gated)       |
|         |                | + Wine workbench (embedded Windows)       |
|         |                | + Full agent swarm (34 agents)            |
|         |                | + Smart contract deployment               |
|         |                | + Fork registry admin                     |
+---------+----------------+-------------------------------------------+
| Founder | Genesis #1     | All of the above + source code access     |
| (Tom)   | (yours)        | + upstream push rights                    |
|         |                | + contract owner functions                |
|         |                | + unrestricted everything                 |
+---------+----------------+-------------------------------------------+
```

### How It Works at Install

```
1. Install GentlyOS ISO (NixOS-based)
2. First boot -> "Connect Wallet" screen
3. Wallet connected -> check for Genesis NFT
4. NFT found -> read tier from on-chain metadata
5. Tier determines:
   a. Which Nix profiles activate (minimal / full / dev / founder)
   b. Which Docker containers auto-start
   c. Which GUI features are visible
   d. Which IPC channels are open
   e. Which tools are in the path
6. Tier is LOCKED at install - upgrading requires new NFT
7. The OS literally builds differently based on your NFT
```

### Nix Profile Selection

```nix
# modules/tier-gate.nix
{ config, pkgs, lib, ... }:

let
  tier = builtins.readFile /run/gently-tier;  # Set by wallet check at boot
in {
  imports = [
    ./profiles/base.nix           # Always: core + GuardDog
  ] ++ lib.optionals (tier >= "basic") [
    ./profiles/workbench.nix      # Workbench pane + Python
  ] ++ lib.optionals (tier >= "pro") [
    ./profiles/docker.nix         # Container orchestration
    ./profiles/agents.nix         # AI agent swarm
  ] ++ lib.optionals (tier >= "dev") [
    ./profiles/limbo.nix          # Offensive tools
    ./profiles/wine.nix           # Windows compatibility
  ];
}
```

---

## 9. Wine Integration — Windows Inside Linux

### The Strategy

GentlyOS runs on NixOS (Linux). But the Windows ecosystem has tools, games, and development environments that matter. Instead of running Windows, we embed Wine inside a Docker container with X11 forwarding into a Pane P (Proton workbench) in the Electron shell.

### Why This Matters

**For development:** Some dev tools only exist on Windows. Embedded Wine lets you run them without leaving GentlyOS.

**For the Windows version of GentlyOS:** When GentlyOS ships a Windows version (future), embedded Wine gets REVERSED - Wine runs Linux tools inside Windows. The architecture is symmetric. The same container definitions work in both directions.

**"The party starts all over again":** On Windows, GentlyOS installs as an Electron app with embedded Wine running the NixOS tools. Every Rust crate, every Python script, every Docker container - all runs inside Wine on Windows. The same sovereignty stack. The same GuardDog. The same boot sequence. Just mirrored.

### Architecture

```
LINUX VERSION:
  NixOS -> Electron -> Wine container -> Windows tools
  (native)  (native)   (Docker+Wine)   (emulated)

WINDOWS VERSION (future):
  Windows -> Electron -> Wine container -> NixOS tools
  (native)  (native)   (Docker+Wine)   (emulated)
```

### Implementation (Dev Only - will build when ready)

```yaml
# deployment/dev-docker/containers/wine-workbench/Dockerfile
FROM ubuntu:22.04

# Wine + dependencies
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y wine64 wine32 xvfb x11vnc

# Proton compatibility (Valve's Wine fork, optimized)
COPY proton-compat/ /opt/proton/

# X11 forwarding for embedding in Electron
EXPOSE 5900
CMD ["x11vnc", "-display", ":99", "-forever"]
```

**Embedding in Electron:**
```javascript
// Wine container renders via VNC -> noVNC in a BrowserView
const winePane = new BrowserView({...});
winePane.webContents.loadURL('http://localhost:6080/vnc.html');
// noVNC client connects to Wine container's X11 display
// Appears as a native pane in the GentlyOS shell
```

### Timeline

Wine integration is DEV TIER ONLY and will be built when the core MVP ships. The architecture is designed for it. The container slot exists. The Pane P slot exists. We will dev it when it's time.

---

## 10. Security Tier Summary

```
+------------------+------+---------+----------------+-------------------+
|      Tool        | Tier | Paywall | NFT Required   | Notes             |
+------------------+------+---------+----------------+-------------------+
| GuardDog scan    | 4    | No      | Free           | Always on         |
| Rainbow table    | 4    | No      | Free           | Always on         |
| .env vault       | 4    | No      | Basic (10 max) | Pro = unlimited   |
| Fork tree        | -    | No      | Basic (5 max)  | Pro = unlimited   |
| Python bridge    | -    | No      | Basic          |                   |
| Docker containers| 6    | No      | Pro            |                   |
| Agent swarm      | 2    | No      | Pro (8 max)    | Dev = 34          |
| nmap             | 5    | No      | Dev            |                   |
| Burpsuite        | 5    | Yes     | Dev + NFT      | Offensive tool    |
| Metasploit       | 5    | Yes     | Dev + NFT      | Offensive tool    |
| Limbo MITM       | 5    | Yes     | Dev + NFT      | Offensive tool    |
| Wine workbench   | 6    | No      | Dev            |                   |
| Contract deploy  | 7    | Yes     | Dev + NFT      | On-chain actions  |
| Upstream push    | 7    | No      | Founder only   | Tom only          |
+------------------+------+---------+----------------+-------------------+
```

**Defense is sovereignty, not a feature.** GuardDog never has a paywall. Security daemons run at every tier. The immune system protects everyone.

**Offense is earned.** Burpsuite, Metasploit, Limbo MITM - these are powerful tools that require the Dev NFT. Usage is logged on-chain.

---

## 11. Complete File Structure

```
gently-nix/
|
+-- core/                              # PROTECTED - Tom only
|   +-- crates/                        # 50 Rust crates across Tiers 0-4
|   |   +-- foundation/                # Tier 0
|   |   |   +-- gently-core/
|   |   |   +-- gently-blob/
|   |   |   +-- gently-crypto/
|   |   +-- knowledge/                 # Tier 1
|   |   |   +-- gently-knowledge/
|   |   |   +-- gently-rag/
|   |   +-- intelligence/              # Tier 2
|   |   |   +-- gently-brain/
|   |   |   +-- gently-inference/
|   |   |   +-- gently-agents/
|   |   +-- network/                   # Tier 3
|   |   |   +-- gently-feed/
|   |   |   +-- gently-proxy/
|   |   +-- security/                  # Tier 4
|   |       +-- gently-guardian/
|   |       +-- gently-security/
|   |       +-- gently-cipher/
|   |
|   +-- packages/                      # JavaScript/Node packages
|   |   +-- guarddog/                  # Tier 0 IO Defense (full package)
|   |       +-- index.js
|   |       +-- lib/guarddog.js
|   |       +-- lib/guarddog-dom.js
|   |       +-- lib/guarddog-preload.js
|   |       +-- lib/btc-anchor.js
|   |       +-- lib/rainbow.js
|   |       +-- lib/distiller.js
|   |       +-- lib/workbench-pane.js
|   |       +-- workbench/server.py
|   |       +-- workbench/index.html
|   |       +-- cli/guarddog.js
|   |       +-- dashboard/server.js
|   |       +-- rust/src/lib.rs
|   |       +-- test/test.js
|   |
|   +-- contracts/                     # Tier 7 Smart Contracts
|   |   +-- solana/
|   |   |   +-- programs/
|   |   |   |   +-- gently-rewards/
|   |   |   |   +-- gently-rotation/
|   |   |   |   +-- gently-gate/
|   |   |   |   +-- gently-dev-access/
|   |   |   |   +-- gently-fork-registry/
|   |   |   +-- anchor.toml
|   |   +-- ethereum/
|   |       +-- contracts/
|   |       |   +-- GentlyAnchor.sol
|   |       |   +-- DevPaywall.sol
|   |       |   +-- GenesisNFT.sol
|   |       +-- hardhat.config.js
|   |
|   +-- flake.nix                      # Deterministic build
|
+-- app/                               # Electron Shell
|   +-- main.js                        # Main process + GuardDog integration
|   +-- preload.js                     # GuardDog bridge + vault bridge
|   +-- shell.html                     # Pane A + B + toolbar
|   +-- components/                    # React components
|   |   +-- App.jsx
|   |   +-- Authentication.jsx
|   |   +-- AIComparisonChat.jsx
|   +-- package.json
|
+-- deployment/                        # Tier 5-6 Infrastructure
|   +-- dev-docker/                    # Tier 6: Docker orchestration
|   |   +-- docker-compose.yml
|   |   +-- containers/
|   |   |   +-- solana-anchor/
|   |   |   +-- wine-workbench/
|   |   |   +-- node-runtime/
|   |   |   +-- python-runtime/
|   |   |   +-- update-service/
|   |   +-- state-injection/
|   |       +-- node-lockfile.json
|   |       +-- python-requirements.txt
|   |       +-- container-hashes.json
|   |
|   +-- limbo/                         # Tier 5: Sacrificial layer
|       +-- chromium-headless/
|       +-- gmail-sandbox/
|       +-- offensive/
|       |   +-- burpsuite/
|       |   +-- metasploit/
|       |   +-- paywall-gate/
|       +-- proxy-chain/
|
+-- modules/                           # NixOS modules
|   +-- boot/                          # Boot control
|   +-- tier-gate.nix                  # NFT-based tier selection
|   +-- state-injection.nix            # Package state verification
|
+-- iso/                               # ISO building
+-- profiles/                          # NixOS profiles
|   +-- base.nix                       # Free tier (always)
|   +-- workbench.nix                  # Basic tier
|   +-- docker.nix                     # Pro tier
|   +-- agents.nix                     # Pro tier
|   +-- limbo.nix                      # Dev tier
|   +-- wine.nix                       # Dev tier
|
+-- community/                         # Community fork support
|   +-- registry.json                  # On-chain fork registry mirror
|   +-- templates/                     # Fork starter templates
|   +-- FORK.md                        # How to fork properly
|   +-- UPSTREAM.md                    # How to pull core updates
|
+-- .gentlyos/                         # Local runtime data
|   +-- .env.vault                     # Encrypted API key vault
|   +-- manifest.gd                    # GuardDog manifest
|   +-- rainbow.gdt                    # Vulnerability rainbow table
|   +-- key.gdx                        # GuardDog protection key
|
+-- CLAUDE.md                          # Claude Code architecture guide
+-- GENTLYOS-ARCHITECTURE.md           # This document
+-- LICENSE.md                         # GentlyOS Sovereign License v1.0
```

---

## 12. Claude Code Instructions

### For Any Claude Code Session Working on GentlyOS

**Read this first.** This section tells you how to work on this codebase without breaking the architecture.

### Golden Rules

1. **Tier boundaries are sacred.** Never import a higher-tier module from a lower tier. Tier 0 cannot depend on Tier 3. Tier 4 cannot depend on Tier 6. Data flows down. Only IPC bridges cross tiers.

2. **GuardDog is Tier 0.** It runs before everything else. If you're adding IO (network calls, file reads, user input, IPC messages), it MUST pass through GuardDog first.

3. **Scripts are frozen until confirmed.** If you're generating code that will execute in the Workbench, stage it through the ScriptCage. Never auto-execute.

4. **State comes from above.** Containers never run `npm install` or `pip install`. Dependencies are pre-built images mounted read-only. If you need a new dependency, add it to `state-injection/` and rebuild the image.

5. **Fork tree everything.** If an action changes state, fork before and after. Users must be able to rewind any operation.

6. **Defense never has a paywall.** GuardDog, security daemons, rainbow tables - these run for ALL tiers. Never add a tier check around security functions.

7. **The DOM is the filesystem.** In the Electron context, everything is a DOM node. GuardDog DOM watches every mutation. Don't bypass it with innerHTML hacks or direct DOM manipulation that avoids the MutationObserver.

8. **API keys go in the vault.** Never hardcode keys. Never put them in environment variables. Always read from `window.gently.vault.get()` or the Unix socket in containers.

9. **Smart contract anchors trust.** Updates, fork registrations, tier changes - these must be reflected on-chain. The on-chain state is the source of truth, not the local filesystem.

10. **core/ is protected.** Only Tom pushes to `core/`. Community contributions go in `community/` or `extensions/`. If you're making changes for a fork, never modify `core/` directly.

### Working With the Workbench

```javascript
// Stage a script (frozen)
const staged = await ipcRenderer.invoke('workbench:stage-script', {
    script: 'import pandas as pd\ndf = pd.read_csv("data.csv")\nprint(df.head())',
    metadata: { label: 'Load data', language: 'python' }
});

// User sees the frozen script in the Script Cage tab
// User clicks [Confirm]
const result = await ipcRenderer.invoke('workbench:confirm-script', { id: staged.id });

// Fork tree now has: genesis -> pre-exec:Load_data -> post-exec:Load_data
// Result contains Python stdout/stderr/variables

// Toggle a pattern
await ipcRenderer.invoke('workbench:toggle', { name: 'analysis-mode', states: ['off', 'basic', 'deep'] });

// Rewind to any fork
const tree = await ipcRenderer.invoke('workbench:fork-tree');
await ipcRenderer.invoke('workbench:rewind', { nodeId: tree.children[0].id });
```

### Adding a New Crate

```bash
# 1. Determine which tier it belongs to
# 2. Create in the appropriate directory
cd core/crates/<tier>/
cargo init gently-<name>

# 3. Add to workspace Cargo.toml
# 4. Only depend on crates from same or lower tier
# 5. If it has IO, integrate GuardDog scanning
# 6. Update CLAUDE.md with the new crate
```

### Adding a New Container

```bash
# 1. Create Dockerfile in deployment/dev-docker/containers/
# 2. Add to docker-compose.yml
# 3. Mount state-injection/ read-only
# 4. Hash the built image
# 5. Add hash to container-hashes.json
# 6. Update-service will verify hash before starting
```

### MVP Guardian Protocol

Before adding anything, ask: **"Does this ship the MVP?"**

The MVP is: NixOS boots -> Electron renders -> GuardDog watches -> Claude chat works -> Workbench toggles -> Fork tree rewinds -> .env vault stores keys -> Smart contract verifies identity.

Everything else is post-MVP. Flag scope creep. Ship functional, not perfect.

---

*This document is the single source of truth for GentlyOS architecture. Keep it updated as the system evolves. Every Claude Code session should read this before making changes.*
