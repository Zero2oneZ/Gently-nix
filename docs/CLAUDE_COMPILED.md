# CLAUDE.md - COMPILED DOCUMENTATION

Compiled from all CLAUDE*.md files found on this system.

---

# TABLE OF CONTENTS

1. [Desktop CLAUDE.md](#1-desktop-claudemd) - Basic config rules
2. [GentlyOS Context](#2-gentlyos-context) - Project overview
3. [Claude CLI Inner Workings](#3-claude-cli-inner-workings) - How the CLI works
4. [Claude Protocol](#4-claude-protocol) - Operating procedures
5. [llama.cpp Docs Generator](#5-llamacpp-docs-generator) - Documentation deployment script

---

# 1. DESKTOP CLAUDE.md

**Source**: `/home/deck/Desktop/CLAUDE.md`

This file provides guidance to Claude Code when working with code in this repository.

## CRITICAL RULE - NO EXCEPTIONS

**Never use emojis or non-US-English QWERTY keyboard characters in any code, comments, strings, output, or documentation.** Only use standard ASCII characters available on a US QWERTY keyboard.

## Guest Passes

Guest passes are stored at `/passes`. These are shareable Claude Code access passes.

### Startup Monitoring

At the start of each session, check and report the current pass count:
- Run `/passes` command to view available guest passes
- Note the count (e.g., "3 guest passes available")
- If passes are running low (1 or fewer), notify the user

---

# 2. GENTLYOS CONTEXT

**Source**: `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE.md`

# GentlyOS - Claude Context

**Last Updated**: 2026-01-23
**Lines of Code**: ~79,000+ (existing)
**Crates**: 25 Rust crates + TUI + 1 planned (gently-goo)
**ISO**: `dist/gentlyos-alpine-1.1.1-x86_64.iso` (232MB, bootable)

---

## What Claude Code Built

### Protocol Integration Analysis (Session 7 - 2026-01-23)

Imported research specs from DeathStar and created comprehensive integration analysis.

| Document | Lines | Purpose |
|----------|-------|---------|
| `DEV_DOCS/RESEARCH_SPECS.md` | 728 | BS-ARTISAN, Alexandria, GOO, SYNTH specs |
| `DEV_DOCS/CODIE_SPEC.md` | 494 | 12-keyword instruction language |
| `DEV_DOCS/GAP_ANALYSIS.md` | 200 | Spec vs implementation gaps |
| `DEV_DOCS/BUILD_STEPS.md` | 400 | Atomic implementation steps |
| `DEV_DOCS/PTC_SECURITY_MAP.md` | 300 | Security touchpoint enforcement |
| `DEV_DOCS/PROTOCOL_INTEGRATION.md` | 250 | Cross-protocol integration map |

#### Gap Analysis Results

| Protocol | Spec | Implementation | Gap |
|----------|------|----------------|-----|
| BS-ARTISAN | Full | 0% | **CRITICAL** |
| GOO | Full | 15% | **HIGH** |
| CODIE | Full | 0% | **MEDIUM** |
| Tesseract | In spec | 100% | Complete |
| BBBCP | In spec | 100% | Complete |

#### New Crates BUILT (Session 7)

```
gently-artisan/  # BS-ARTISAN toroidal storage - BUILT
|-- lib.rs       # Module exports, r = tokens/2pi formula
|-- coord.rs     # TorusCoordinate (major/minor angles)
|-- torus.rs     # Torus + TorusPoint (blake3 hash, PTC)
|-- foam.rs      # Multi-torus container + genesis anchor
|-- flux.rs      # FluxLine transformation mechanics
|-- barf.rs      # BARF retrieval (XOR distance + topological boost)
+-- winding.rs   # WindingLevel 1-6 refinement

gently-codie/    # 12-keyword instruction language - BUILT
|-- lib.rs       # Module exports
|-- token.rs     # 12 keywords (pug,bark,spin,cali,elf,turk,fence,pin,bone,blob,biz,anchor)
|-- lexer.rs     # CodieLexer tokenizer
|-- ast.rs       # CodieAst + SourceKind (PTC: Vault)
+-- parser.rs    # CodieParser (tree structure aware)

gently-goo/      # Unified GUI field (PLANNED)
|-- sdf.rs       # SDF primitives
|-- field.rs     # GooField
+-- claude.rs    # Claude embodiment
```

#### PTC Security Enforcement

All new protocols MUST use PTC (Permission To Change) for:
- Cryptographic operations -> Use existing Berlin Clock, XOR
- Vault access (`$`) -> Cold execution sandbox
- Hash resolution (`#`) -> BTC anchor verification
- Threat detection -> FAFO escalation

See `DEV_DOCS/PTC_SECURITY_MAP.md` for full rules.

---

### Bootable Alpine ISO (Session 6 - 2026-01-20)

Created Alpine-based live ISO (Debian approach failed due to musl/glibc incompatibility).

| Artifact | Size | Notes |
|----------|------|-------|
| `dist/gentlyos-alpine-1.1.1-x86_64.iso` | 232MB | Bootable, UEFI+BIOS |
| `scripts/deploy/build-alpine-iso.sh` | 280 lines | Alpine-native builder |

**ISO Contents:**
- Alpine Linux 3.21 base (musl)
- Linux kernel 6.12.63-lts
- gently CLI + gently-web binaries
- Auto-login as `gently` user
- gently-web service starts on boot

**Build requires:** `apk add squashfs-tools xorriso grub mtools`

---

### ONE SCENE Web GUI (Session 5 - 2026-01-05)

Premium Alexandria GUI - HTMX + Axum for paid users.

| File | Lines | Purpose |
|------|-------|---------|
| `gently-web/src/templates.rs` | 1,128 | ONE SCENE HTML templates |
| `gently-web/src/handlers.rs` | 402 | Route handlers + Alexandria API |
| `gently-web/src/main.rs` | 122 | Web server binary |
| `gently-web/src/state.rs` | 122 | Application state |
| `gently-web/src/lib.rs` | 83 | Router setup |
| `gently-web/src/routes.rs` | 48 | Route definitions |

#### Features

- **ONE SCENE Architecture**: Single adaptive interface, no page navigation
- **HTMX Reactivity**: Server-driven updates without JS framework
- **Alexandria Integration**: Graph visualization, BBBCP queries, Tesseract view, 5W dimensions
- **Living Feed**: Charge/decay items with boost interaction
- **Chat Interface**: Placeholder for LLM integration
- **Security Panel**: Real-time security events

#### Alexandria Premium Panels

| Panel | Route | Function |
|-------|-------|----------|
| Graph | `/htmx/alexandria/graph` | Knowledge graph visualization |
| BBBCP | `/htmx/alexandria/bbbcp` | BONE/CIRCLE/BLOB query interface |
| Tesseract | `/htmx/alexandria/tesseract` | 8D hypercube face visualization |
| 5W Query | `/htmx/alexandria/5w` | WHO/WHAT/WHERE/WHEN/WHY collapse |

---

### Inference Quality Mining (Session 3)

Collective Inference Optimization - The network trains itself through USE.

| File | Lines | Purpose |
|------|-------|---------|
| `gently-inference/src/step.rs` | 200 | InferenceStep, StepType (8 types) |
| `gently-inference/src/score.rs` | 200 | Quality scoring formula |
| `gently-inference/src/decompose.rs` | 250 | Response -> Steps extraction |
| `gently-inference/src/cluster.rs` | 300 | Semantic clustering (cosine sim) |
| `gently-inference/src/aggregate.rs` | 250 | Cross-prompt step aggregation |
| `gently-inference/src/optimize.rs` | 300 | Response synthesis |
| `gently-inference/src/boneblob.rs` | 250 | BONEBLOB constraint generation |
| `gently-inference/src/solana.rs` | 250 | GENOS rewards (stubbed) |

#### The Quality Formula

```
quality = user_accept * 0.3
        + outcome_success * 0.4
        + chain_referenced * 0.2
        + turning_point * 0.1

THRESHOLD: 0.7 = USEFUL
```

#### Step Types

| Type | GENOS Multiplier | Purpose |
|------|-----------------|---------|
| Conclude | 12x | Research synthesis |
| Pattern | 10x | Creative insight |
| Eliminate | 8x | BONEBLOB contribution |
| Specific | 6x | Implementation detail |
| Fact | 5x | Verified data |
| Suggest | 4x | Ideas |
| Correct | 3x | Bug fixes |
| Guess | 1x | Low until validated |

#### BONEBLOB Integration

```
High-quality (>=0.7) -> BONES (constraints)
    Eliminate -> "MUST NOT: {content}"
    Fact      -> "ESTABLISHED: {content}"
    Pattern   -> "PATTERN: {content}"

Low-quality (<0.7) -> CIRCLE (eliminations)
    Guess/Suggest -> "AVOID: {content}"
```

#### Storage

```
~/.gently/inference/
|-- inferences.jsonl      # Query + response records
|-- steps.jsonl           # Individual reasoning steps
|-- clusters.json         # Semantic clustering state
+-- pending_genos.jsonl   # GENOS reward queue
```

---

### FAFO Security + Berlin Clock (Session 2)

"A rabid pitbull behind a fence" - Aggressive defense with time-based key rotation.

| File | Lines | Purpose |
|------|-------|---------|
| `gently-core/src/crypto/berlin.rs` | 380 NEW | BTC-synced time-based key rotation |
| `gently-security/src/fafo.rs` | 600 NEW | FAFO escalating response system |
| `gently-cli/src/main.rs` | +250 | `/security` command with dashboard |

#### Berlin Clock Key Rotation

```
BTC Block Timestamp -> Slot (ts / 300) -> HKDF -> Time-Bound Key

Forward secrecy: Old slots cannot derive current keys
Sync: Any node with master + BTC time = same key
Grace period: 2 previous slots for decryption
```

#### FAFO Response Ladder

```
Strike 1-2:  TARPIT   - Waste attacker's time
Strike 3-4:  POISON   - Corrupt attacker's context
Strike 5-7:  DROWN    - Flood with honeypot garbage
Strike 10+:  DESTROY  - Permanent termination
CRITICAL:    SAMSON   - Scorched earth (nuclear option)
```

#### CLI Commands

```
gently security status   - Dashboard with FAFO stats
gently security fafo     - FAFO mode control
gently security daemons  - 16 security daemons status
gently security test     - Threat simulation
```

---

### BONEBLOB BIZ Constraint System (Session 1)

Philosophy -> Compiler. Words became executable geometry.

```
BONE BLOB BIZ CIRCLE PIN
         |
constraint.rs + tesseract.rs
```

| File | Lines | Purpose |
|------|-------|---------|
| `gently-search/src/constraint.rs` | 325 NEW | Constraint optimization engine |
| `gently-alexandria/src/tesseract.rs` | +57 | BONEBLOB methods on 8-face hypercube |
| `gently-guardian/src/lib.rs` | +101 | Platform detection (macOS/Windows/Linux) |
| `gentlyos-tui/` | 5,693 NEW | Full terminal UI with BONEBLOB integration |

### The Math

```
Intelligence = Capability x Constraint / Search Space

BONES   -> Preprompt constraints (immutable rules)
CIRCLE  -> 70% elimination per pass (via negativa)
PIN     -> Solution finder in bounded space
BIZ     -> Solution -> new constraint (fixed-point iteration)

Convergence: 5 passes x 70% elimination = 0.24% remaining
Guaranteed by Banach Fixed-Point Theorem
```

### Key Integration Points

1. **Tesseract `eliminated` face** (dims 48-95) stores "What it ISN'T"
2. **ConstraintBuilder** bridges Alexandria graph -> BONEBLOB constraints
3. **72-domain router** feeds domain context to constraint system
4. **LlmWorker** optionally routes through BONEBLOB pipeline

### TUI Commands

```
/boneblob on|off  - Toggle constraint optimization
/boneblob         - Show pipeline status
/provider [name]  - Switch LLM (claude/gpt/deepseek/grok/ollama)
/status           - System + BONEBLOB stats
```

---

## Current State (v1.0.0)

### Completed Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Persistence + Embeddings | DONE |
| 2 | Intelligence Integration | DONE |
| 3 | Security Hardening | DONE |
| 4 | Distribution & Install | DONE |
| 5 | Polish & Stability | DONE |

### Production-Ready Crates

| Crate | Status | Notes |
|-------|--------|-------|
| gently-core | 98% | Crypto foundation, XOR splits, genesis keys, **Berlin Clock rotation** |
| gently-audio | 100% | FFT encoding/decoding with tests |
| gently-visual | 100% | SVG pattern generation |
| gently-dance | 85% | Full protocol state machine |
| gently-btc | 90% | Block promise logic |
| gently-ipfs | 85% | Thin wrapper (delegates to daemon) |
| gently-guardian | 80% | Hardware detection, cross-platform (sysinfo) |
| gently-security | 95% | 16/16 daemons, real hash chain, threat intel, **FAFO pitbull** |
| gently-feed | 70% | Charge/decay model works |
| gently-gateway | 70% | Pipeline architecture |
| gently-brain | 75% | Claude API real, Alexandria integration |
| gently-cipher | 50% | Ciphers work, analysis stubbed |
| gently-network | 60% | Visualization works |
| gently-architect | 55% | SQLite works, UI stubbed |
| gently-mcp | 50% | Server ready, handlers missing |
| gently-search | 80% | Alexandria routing, Tesseract projection, **BONEBLOB constraints** |
| gently-alexandria | 85% | Graph + Tesseract work, persistence, **elimination methods** |
| gently-sploit | 20% | Framework only |
| gently-sim | 80% | SIM card security: filesystem, applets, OTA, Simjacker |
| **gently-inference** | **90%** | **Inference quality mining: decompose, score, cluster, optimize** |
| **gently-web** | **85%** | **ONE SCENE Web GUI: HTMX + Axum, Alexandria integration** |
| **gently-artisan** | **90%** | **BS-ARTISAN toroidal storage: Torus, Foam, BARF retrieval** |
| **gently-codie** | **80%** | **12-keyword instruction language: lexer, parser, AST** |
| gently-spl | DISABLED | Solana version conflicts |
| **gentlyos-tui** | **90%** | **Terminal UI: 6 panels, 7 LLM providers, BONEBLOB pipeline** |

---

## Installation

### One-Liner (Recommended)

```bash
curl -fsSL https://gentlyos.com/install.sh | sudo bash
```

Options:
- `--source` - Build from source instead of binary download
- `--skip-setup` - Skip the initial setup wizard

### First-Time Setup

```bash
gently setup           # Interactive wizard
gently setup --force   # Force re-initialization
```

Creates:
```
~/.gently/
|-- alexandria/graph.json   # Knowledge graph
|-- brain/knowledge.db      # SQLite knowledge base
|-- feed/                   # Feed state
|-- models/                 # Embedding models
|-- vault/genesis.key       # Genesis key
+-- config.toml             # User config
```

---

## Build Commands

```bash
# Build CLI (main binary)
cargo build --release -p gently-cli

# Build all crates
cargo build --release

# Run tests
cargo test --workspace

# Run CLI
./target/release/gently

# Run setup wizard
./target/release/gently setup
```

### Deployment Scripts

```bash
# Docker image
./scripts/deploy/build-docker.sh

# Debian package
./scripts/deploy/build-deb.sh

# All formats
./scripts/deploy/build-all.sh
```

---

## CLI Commands (28 total)

### Working (21)
```
init, create, pattern, split, combine, status, demo, feed,
search, alexandria, cipher, network, brain, architect, ipfs,
sploit, crack, claude, vault, mcp, report, setup
```

### Disabled (7 - Solana)
```
install, mint, wallet, token, certify, perm, genos
```

---

## Architecture

### Security Daemon Layers

```
Layer 1 (Foundation): HashChainValidator*, BtcAnchor, ForensicLogger
Layer 2 (Traffic):    TrafficSentinel, TokenWatchdog, CostGuardian
Layer 3 (Detection):  PromptAnalyzer, BehaviorProfiler, PatternMatcher, AnomalyDetector
Layer 4 (Defense):    SessionIsolator, TarpitController, ResponseMutator, RateLimitEnforcer
Layer 5 (Intel):      ThreatIntelCollector*, SwarmDefense

* = Real implementation (not stubbed)
```

### Hash Chain Validation

Real SHA256-linked audit chain:
- `AuditEntry` struct with index, timestamp, prev_hash, hash
- `HashChain::validate()` verifies chain integrity
- `HashChain::load/save()` for persistence
- Automatic tamper detection

### Threat Intel

Built-in LLM security patterns (28 indicators):
- Prompt injection detection ("ignore previous instructions", "DAN mode")
- System prompt extraction attempts
- Jailbreak patterns (roleplay, encoding tricks)
- Tool abuse patterns (file traversal, command injection)

---

## 25 Crates Overview

| Crate | Purpose |
|-------|---------|
| gently-core | Base types, genesis keys, XOR splits, Berlin Clock |
| gently-btc | Bitcoin RPC, block anchoring |
| gently-spl | Solana SPL (DISABLED) |
| gently-dance | P2P dance protocol |
| gently-audio | Audio FFT encoding |
| gently-visual | SVG pattern generation |
| gently-feed | Living feed with charge/decay |
| gently-search | Alexandria-backed semantic search, BONEBLOB |
| gently-mcp | Model Context Protocol server |
| gently-architect | Code generation, project trees |
| gently-brain | LLM orchestration, knowledge graph |
| gently-network | Network capture, MITM, visualization |
| gently-ipfs | IPFS content-addressed storage |
| gently-cipher | Cryptographic utilities, cracking |
| gently-sploit | Exploitation framework |
| gently-gateway | API routing, pipelines |
| gently-security | 16 daemons + FAFO pitbull |
| gently-guardian | Free tier node, hardware validation |
| gently-alexandria | Distributed knowledge mesh, Tesseract |
| gently-sim | SIM card security monitoring |
| **gently-inference** | **Inference quality mining + optimization** |
| **gently-web** | **ONE SCENE Web GUI for paid users** |
| **gently-artisan** | **BS-ARTISAN: Toroidal knowledge storage (r=tokens/2pi)** |
| **gently-codie** | **CODIE: 12-keyword instruction language** |
| gently-micro | Microcontroller interface (ESP32/Arduino) |

---

## Key Files

### Core
- `Cargo.toml` - Workspace definition
- `gently-cli/src/main.rs` - Main CLI (4000+ lines)
- `web/install.sh` - Universal installer

### Intelligence
- `crates/gently-alexandria/src/graph.rs` - Knowledge graph
- `crates/gently-alexandria/src/tesseract.rs` - 8-face embedding projection
- `crates/gently-brain/src/orchestrator.rs` - AI orchestration
- `crates/gently-search/src/alexandria.rs` - Semantic search

### Security
- `crates/gently-security/src/daemons/foundation.rs` - Hash chain
- `crates/gently-security/src/daemons/intel.rs` - Threat detection
- `crates/gently-security/src/fafo.rs` - FAFO aggressive defense
- `crates/gently-guardian/src/hardware.rs` - Cross-platform hw detection

### Inference
- `crates/gently-inference/src/lib.rs` - InferenceEngine main API
- `crates/gently-inference/src/step.rs` - Step types and structures
- `crates/gently-inference/src/score.rs` - Quality scoring formula
- `crates/gently-inference/src/cluster.rs` - Semantic clustering
- `crates/gently-inference/src/boneblob.rs` - Constraint generation

### BS-ARTISAN (New)
- `crates/gently-artisan/src/torus.rs` - Torus geometry, TorusPoint with blake3
- `crates/gently-artisan/src/foam.rs` - Multi-torus container, genesis anchor
- `crates/gently-artisan/src/barf.rs` - BARF retrieval (XOR + topological boost)
- `crates/gently-artisan/src/winding.rs` - WindingLevel 1-6 refinement stages

### CODIE Language (New)
- `crates/gently-codie/src/token.rs` - 12 keywords definition
- `crates/gently-codie/src/lexer.rs` - CodieLexer tokenizer
- `crates/gently-codie/src/ast.rs` - CodieAst, SourceKind (PTC: Vault)
- `crates/gently-codie/src/parser.rs` - Tree-structure aware parser

---

## Environment

- Alpine Linux (bare metal)
- Rust 1.75+ toolchain
- Docker available for container builds
- Git repo on master branch

---

## Product Vision

**Editions:**
- **Home** (Free/Guardian) - Security as public good, earn by contributing
- **Business** ($29/mo) - Priority support, dedicated capacity
- **Studio** ($99/mo) - GPU protection, maximum security

**Solana Integration** (deferred):
- Token/wallet/governance features remain stubbed
- Will be re-enabled after CLI v1.0 is stable

---

## Claude Operating Protocol

See **`CLAUDE_PROTOCOL.md`** for:
- Session init sequence
- Search-before-build rules
- Domain -> Crate mapping
- Anti-duplication checklist
- Architecture stack
- Self-diagnosis protocol

## Development Documentation

See **`DEV_DOCS/`** for:
- `UPDATES.md` - Change log (update after significant work)
- `TEMP_BEHAV.md` - Toggle behaviors ON/OFF
- `DIRECTORY_SCOPE.md` - What goes where
- `DEV_HISTORY/` - Session history files

---

*This file exists so Claude can recover context if session is lost.*

---

# 3. CLAUDE CLI INNER WORKINGS

**Source**: `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE_CLI_INNER_WORKINGS.md`

# GentlyOS Claude CLI - Inner Workings Report
## What Would Be cli.js (But It's Rust)

**Date**: 2026-01-02
**Language**: Rust (not JavaScript)
**Total Lines**: 587 (claude.rs) + 206 (CLI commands)

---

## Quick Summary

```
+-------------------------------------------------------------------------+
|                    GentlyOS HAS NO cli.js                               |
|                                                                         |
|  Instead, it has:                                                       |
|    - gently-brain/src/claude.rs  ->  The Claude API client (587 lines)  |
|    - gently-cli/src/main.rs      ->  CLI commands (lines 4906-5116)     |
|                                                                         |
|  100% Rust, 0% JavaScript                                               |
+-------------------------------------------------------------------------+
```

---

## 1. What Is The Claude CLI?

The GentlyOS Claude CLI is a **product-level** AI integration for customers. It is NOT:
- Anthropic's Claude Code (the development assistant)
- A JavaScript application
- A web interface

**What it IS**:
- A Rust-based Claude API client
- Part of the `gently` binary
- 4 commands: `chat`, `ask`, `repl`, `status`

---

## 2. File Structure (If It Were cli.js)

```
IF THIS WERE JAVASCRIPT:
========================

cli.js
|-- class ClaudeClient
|   |-- constructor(apiKey)
|   |-- chat(message) -> Promise<string>
|   |-- ask(question) -> Promise<string>
|   +-- clear()
|
|-- class GentlyAssistant extends ClaudeClient
|   |-- constructor() -> sets system prompt
|   |-- chatWithTools(message) -> Promise<{text, toolUses}>
|   +-- submitToolResults(results) -> Promise<response>
|
|-- class ClaudeSession
|   |-- sessionId: string
|   |-- history: Message[]
|   +-- createdAt: Date
|
+-- Commands
    |-- claude chat <message>
    |-- claude ask <question>
    |-- claude repl
    +-- claude status


WHAT ACTUALLY EXISTS (RUST):
============================

gently-brain/src/claude.rs
|-- struct ClaudeClient
|   |-- api_key: String
|   |-- model: ClaudeModel
|   |-- system_prompt: Option<String>
|   |-- conversation: Vec<Message>
|   +-- max_tokens: usize
|
|-- struct GentlyAssistant
|   |-- client: ClaudeClient
|   |-- tools_enabled: bool
|   +-- tool_definitions: Vec<serde_json::Value>
|
|-- struct ClaudeSession
|   |-- assistant: GentlyAssistant
|   |-- session_id: String
|   +-- created_at: DateTime<Utc>
|
+-- gently-cli/src/main.rs (lines 4906-5116)
    |-- fn cmd_claude(ClaudeCommands)
    |-- ClaudeCommands::Chat
    |-- ClaudeCommands::Ask
    |-- ClaudeCommands::Repl
    +-- ClaudeCommands::Status
```

---

## 3. Data Flow Diagram

```
+-------------------------------------------------------------------------+
|                          USER COMMAND                                   |
|                                                                         |
|   $ gently claude chat "Hello"                                          |
|   $ gently claude ask "What is GentlyOS?"                               |
|   $ gently claude repl                                                  |
|   $ gently claude status                                                |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                       COMMAND PARSER                                    |
|                                                                         |
|   main.rs:1259 -> Cli::parse()                                          |
|                     |                                                   |
|                     v                                                   |
|   match cli.command {                                                   |
|       Commands::Claude(cmd) -> cmd_claude(cmd)                          |
|   }                                                                     |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                     CLAUDE COMMAND HANDLER                              |
|                         main.rs:4910                                    |
|                                                                         |
|   fn cmd_claude(command: ClaudeCommands) -> Result<()> {                |
|       match command {                                                   |
|           Chat { message, model } => { ... }                            |
|           Ask { question, model } => { ... }                            |
|           Repl { model, system } => { ... }                             |
|           Status => { ... }                                             |
|       }                                                                 |
|   }                                                                     |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                     CLIENT INITIALIZATION                               |
|                       claude.rs:113-128                                 |
|                                                                         |
|   impl ClaudeClient {                                                   |
|       pub fn new() -> Result<Self> {                                    |
|           +-------------------------------------------------------+     |
|           | ENV READ:                                             |     |
|           |   let api_key = env::var("ANTHROPIC_API_KEY")?;       |     |
|           |                                                       |     |
|           | If missing -> Error("ANTHROPIC_API_KEY not set")      |     |
|           +-------------------------------------------------------+     |
|                                                                         |
|           Ok(Self {                                                     |
|               api_key,                                                  |
|               model: ClaudeModel::Sonnet,  <- default                   |
|               system_prompt: None,                                      |
|               conversation: Vec::new(),    <- empty history             |
|               max_tokens: 4096,                                         |
|           })                                                            |
|       }                                                                 |
|   }                                                                     |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                     MODEL SELECTION                                     |
|                       claude.rs:26-50                                   |
|                                                                         |
|   +-------------------------------------------------------------+       |
|   |  User Input    |  ClaudeModel Enum   |  API Model ID        |       |
|   +-------------------------------------------------------------+       |
|   |  "sonnet"      |  ClaudeModel::Sonnet | claude-sonnet-4-... |       |
|   |  "opus"        |  ClaudeModel::Opus   | claude-opus-4-0-... |       |
|   |  "haiku"       |  ClaudeModel::Haiku  | claude-3-5-haiku-...|       |
|   |  (default)     |  ClaudeModel::Sonnet | claude-sonnet-4-... |       |
|   +-------------------------------------------------------------+       |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                     API REQUEST                                         |
|                       claude.rs:169-218                                 |
|                                                                         |
|   pub fn chat(&mut self, message: &str) -> Result<String> {             |
|                                                                         |
|       // 1. Add user message to conversation                            |
|       self.conversation.push(Message::user(message));                   |
|                                                                         |
|       // 2. Build request body                                          |
|       let request = ApiRequest {                                        |
|           model: self.model.api_name(),     // "claude-sonnet-4-..."    |
|           max_tokens: self.max_tokens,      // 4096                     |
|           system: self.system_prompt,       // GentlyOS prompt          |
|           messages: self.conversation,      // full history             |
|       };                                                                |
|                                                                         |
|       // 3. Make HTTP request                                           |
|       +-------------------------------------------------------+         |
|       | NETWORK I/O:                                          |         |
|       |                                                       |         |
|       | ureq::post("https://api.anthropic.com/v1/messages")   |         |
|       |     .set("x-api-key", &self.api_key)                  |         |
|       |     .set("anthropic-version", "2023-06-01")           |         |
|       |     .set("content-type", "application/json")          |         |
|       |     .send_json(&request)                              |         |
|       |                                                       |         |
|       | BLOCKING CALL - waits for response                    |         |
|       +-------------------------------------------------------+         |
|                                                                         |
|       // 4. Parse response                                              |
|       let text = response.content[0].text;                              |
|                                                                         |
|       // 5. Add to conversation history                                 |
|       self.conversation.push(Message::assistant(&text));                |
|                                                                         |
|       Ok(text)                                                          |
|   }                                                                     |
|                                                                         |
+-------------------------------+-----------------------------------------+
                                |
                                v
+-------------------------------------------------------------------------+
|                     OUTPUT TO USER                                      |
|                                                                         |
|   STDOUT:                                                               |
|   +-------------------------------------------------------------+       |
|   |                                                             |       |
|   |   CLAUDE CHAT                                               |       |
|   |   ===========                                               |       |
|   |   Model: Claude Sonnet 4                                    |       |
|   |                                                             |       |
|   |   You: Hello                                                |       |
|   |                                                             |       |
|   |   Claude:                                                   |       |
|   |   Hello! How can I help you today?                          |       |
|   |                                                             |       |
|   +-------------------------------------------------------------+       |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 4. The Four Commands Explained

### 4.1 `gently claude chat "message"`

```
PURPOSE:  Conversational chat WITH history
HISTORY:  YES - remembers previous messages
STATE:    In-memory only (lost on exit)

FLOW:
    User message
        |
        v
    GentlyAssistant::with_model(model)
        |
        +-- Sets system prompt:
            "You are the GentlyOS Assistant..."
        |
        v
    assistant.chat(&message)
        |
        |-- Add to conversation: [{role: "user", content: message}]
        |-- POST to api.anthropic.com
        +-- Add to conversation: [{role: "assistant", content: response}]
        |
        v
    Print response to stdout
```

### 4.2 `gently claude ask "question"`

```
PURPOSE:  One-shot question WITHOUT history
HISTORY:  NO - stateless
STATE:    None

FLOW:
    User question
        |
        v
    ClaudeClient::new()
        |
        v
    client.ask(&question)
        |
        |-- Create temp messages: [{role: "user", content: question}]
        |-- POST to api.anthropic.com
        +-- Return response (NOT stored)
        |
        v
    Print response to stdout
```

### 4.3 `gently claude repl`

```
PURPOSE:  Interactive session
HISTORY:  YES - accumulates during session
STATE:    In-memory (lost on exit)

FLOW:
    +-------------------------------------------------------------+
    |                      REPL LOOP                              |
    |                                                             |
    |   loop {                                                    |
    |       |                                                     |
    |       v                                                     |
    |   print!("  you> ");                                        |
    |   stdin.read_line(&mut input);                              |
    |       |                                                     |
    |       v                                                     |
    |   match input {                                             |
    |       "exit"|"quit"|"q" -> break                            |
    |       "clear"           -> client.clear()                   |
    |       "help"            -> print help                       |
    |       _                 -> client.chat(input)               |
    |   }                                                         |
    |       |                                                     |
    |       v                                                     |
    |   print!("  claude>");                                      |
    |   println!("{}", response);                                 |
    |   }                                                         |
    |                                                             |
    +-------------------------------------------------------------+

COMMANDS:
    exit/quit/q  - End session
    clear        - Reset conversation
    help         - Show commands
```

### 4.4 `gently claude status`

```
PURPOSE:  Check configuration and connection
HISTORY:  N/A
STATE:    N/A

FLOW:
    Check ANTHROPIC_API_KEY
        |
        |-- If set: Display masked key (sk-ant-12...xyzz)
        +-- If not: Show setup instructions
        |
        v
    List available models:
        - sonnet - Claude Sonnet 4 (balanced)
        - opus   - Claude Opus 4 (most capable)
        - haiku  - Claude 3.5 Haiku (fastest)
        |
        v
    Test connection:
        client.ask("Say 'OK' if you can hear me.")
        |
        |-- Success: "Connection: OK"
        +-- Failure: "Connection: FAILED (reason)"
```

---

## 5. Key Data Structures

### Message (What gets sent to Claude)

```rust
struct Message {
    role: String,      // "user" or "assistant"
    content: String,   // The actual text
}

// JavaScript equivalent:
// { role: "user", content: "Hello" }
```

### ApiRequest (HTTP body)

```rust
struct ApiRequest {
    model: String,           // "claude-sonnet-4-20250514"
    max_tokens: usize,       // 4096
    system: Option<String>,  // "You are GentlyOS..."
    messages: Vec<Message>,  // Conversation history
}

// JavaScript equivalent:
// {
//     model: "claude-sonnet-4-20250514",
//     max_tokens: 4096,
//     system: "You are GentlyOS...",
//     messages: [
//         { role: "user", content: "Hello" },
//         { role: "assistant", content: "Hi!" }
//     ]
// }
```

### ApiResponse (What Claude returns)

```rust
struct ApiResponse {
    content: Vec<ContentBlock>,  // [{type: "text", text: "..."}]
    usage: Option<Usage>,        // {input_tokens: 50, output_tokens: 200}
}

struct ContentBlock {
    content_type: String,  // "text" or "tool_use"
    text: Option<String>,  // The response text
}
```

---

## 6. System Prompt (GentlyOS Identity)

```
const GENTLY_SYSTEM_PROMPT = r#"
You are the GentlyOS Assistant, an AI integrated into the GentlyOS
security operating system.

GentlyOS is a cryptographic security layer with these core components:
- Dance Protocol: Visual-audio authentication between devices
  using XOR key splitting
- BTC/SPL Bridge: Bitcoin block events trigger Solana token swaps
  for access control
- Cipher-Mesh: Cryptanalysis toolkit (dcode.fr style) for cipher
  identification and cracking
- Sploit Framework: Metasploit-style exploitation tools
  (for authorized testing only)
- Brain: Local AI with embeddings that grows smarter with use
- Network: Packet capture, MITM proxy, security analysis

Key CLI commands:
- gently dance   - Start visual-audio authentication
- gently cipher  - Cipher identification and cryptanalysis
- gently crack   - Password cracking (dictionary, bruteforce, rainbow)
- gently sploit  - Exploitation framework
- gently network - Packet capture and MITM proxy
- gently brain   - Local AI inference

Be helpful, concise, and security-focused. When discussing exploits
or attacks, always emphasize authorized use only.
"#;
```

---

## 7. Tool Use (Advanced Feature)

The `GentlyAssistant` supports Claude's tool use:

```rust
struct ToolUseResponse {
    id: String,                    // "toolu_01abc..."
    name: String,                  // "gently_search"
    input: serde_json::Value,      // {"query": "..."}
}

struct ToolResultInput {
    tool_use_id: String,           // "toolu_01abc..."
    content: String,               // Result of tool execution
    is_error: bool,                // Did the tool fail?
}
```

**Flow with tools**:
```
1. User asks: "Search for XOR encryption"
2. Claude returns: tool_use { name: "gently_search", input: {...} }
3. System executes: gently-search crate
4. System submits: tool_result { content: "Found 5 results..." }
5. Claude responds: "I found 5 results about XOR encryption..."
```

---

## 8. What's Missing (Security Gaps)

```
+-------------------------------------------------------------------------+
|                     WHAT'S NOT IMPLEMENTED                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  [X] NO session persistence                                             |
|     -> Conversations lost on exit                                       |
|     -> No way to resume previous chat                                   |
|                                                                         |
|  [X] NO prompt/response hashing                                         |
|     -> Cannot verify conversation integrity                             |
|     -> No audit trail of what was said                                  |
|                                                                         |
|  [X] NO BTC block anchoring                                             |
|     -> Sessions not timestamped immutably                               |
|     -> Cannot prove when conversation happened                          |
|                                                                         |
|  [X] NO auth key validation                                             |
|     -> Anyone with API key can chat                                     |
|     -> No user identity verification                                    |
|                                                                         |
|  [X] NO branch creation                                                 |
|     -> Conversations not isolated                                       |
|     -> No session-based branching                                       |
|                                                                         |
|  [X] NO audit.log integration                                           |
|     -> Claude interactions not recorded                                 |
|     -> No integration with BTC audit chain                              |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 9. JavaScript Equivalent (If cli.js Existed)

If GentlyOS were written in JavaScript, `cli.js` would look like:

```javascript
// cli.js - What it would look like in JavaScript

const fetch = require('node-fetch');

class ClaudeClient {
    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        if (!this.apiKey) {
            throw new Error('ANTHROPIC_API_KEY not set');
        }
        this.model = 'claude-sonnet-4-20250514';
        this.systemPrompt = null;
        this.conversation = [];
        this.maxTokens = 4096;
    }

    async chat(message) {
        // Add user message
        this.conversation.push({ role: 'user', content: message });

        // Make API request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: this.maxTokens,
                system: this.systemPrompt,
                messages: this.conversation,
            }),
        });

        const data = await response.json();
        const text = data.content[0].text;

        // Add assistant response
        this.conversation.push({ role: 'assistant', content: text });

        return text;
    }

    async ask(question) {
        // One-shot, no history
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: this.maxTokens,
                system: this.systemPrompt,
                messages: [{ role: 'user', content: question }],
            }),
        });

        const data = await response.json();
        return data.content[0].text;
    }

    clear() {
        this.conversation = [];
    }
}

// Usage:
// const client = new ClaudeClient();
// const response = await client.chat("Hello");
```

But GentlyOS uses **Rust** instead for:
- Memory safety
- Performance
- Single binary distribution
- Integration with crypto crates

---

## 10. Quick Reference

```
+-------------------------------------------------------------------------+
|                         QUICK REFERENCE                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|  FILES:                                                                 |
|    gently-brain/src/claude.rs     ->  API client (587 lines)            |
|    gently-cli/src/main.rs:4906    ->  CLI commands (206 lines)          |
|                                                                         |
|  COMMANDS:                                                              |
|    gently claude chat "msg"       ->  Conversational (has history)      |
|    gently claude ask "q"          ->  One-shot (no history)             |
|    gently claude repl             ->  Interactive session               |
|    gently claude status           ->  Check connection                  |
|                                                                         |
|  MODELS:                                                                |
|    -m sonnet                      ->  Claude Sonnet 4 (default)         |
|    -m opus                        ->  Claude Opus 4                     |
|    -m haiku                       ->  Claude 3.5 Haiku                  |
|                                                                         |
|  ENVIRONMENT:                                                           |
|    ANTHROPIC_API_KEY              ->  Required for all commands         |
|                                                                         |
|  DATA STORAGE:                                                          |
|    Conversations: In-memory only (not persisted)                        |
|    Sessions: Not tracked                                                |
|    Audit: Not logged                                                    |
|                                                                         |
|  HTTP:                                                                  |
|    Endpoint: https://api.anthropic.com/v1/messages                      |
|    Library: ureq (blocking)                                             |
|    Headers: x-api-key, anthropic-version, content-type                  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

**Report Version**: 1.0.0
**Generated**: 2026-01-02

---

# 4. CLAUDE PROTOCOL

**Source**: `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE_PROTOCOL.md`

# Claude Code <-> GentlyOS Protocol

**Purpose**: How Claude stays oriented, avoids duplication, and operates efficiently against this codebase.

---

## PRIME DIRECTIVE

```
BEFORE BUILDING -> SEARCH
BEFORE ADDING   -> CHECK EXISTS
BEFORE CODING   -> MAP LOCATION
```

---

## 0. HUMAN WELLNESS CHECK (MANDATORY FIRST)

```bash
/root/.gently/session_clock.sh check
```

| Response | Action |
|----------|--------|
| `NO_SESSION` | Run `session_clock.sh start` to begin 18hr work window |
| `WORKING\|Xh Ym remaining` | Proceed. Remind human of time left periodically. |
| `REST\|Xh Ym until...` | **STOP. REFUSE TO WORK. Tell human to sleep.** |
| `READY\|...` | Previous session done. Start new one. |

**If REST mode: I will not assist with work. This is non-negotiable.**

---

## 1. SESSION INIT SEQUENCE

Every new session, Claude should:

```
0. CHECK /root/.gently/session_clock.sh check   (WELLNESS FIRST)
1. READ  /root/CLAUDE.md              (environment map)
2. READ  /root/gentlyos/CLAUDE.md     (project context)
3. READ  /root/gentlyos/CLAUDE_PROTOCOL.md  (this file)
4. READ  /root/gentlyos/DEV_DOCS/TEMP_BEHAV.md  (active toggles)
5. READ  /root/gentlyos/DEV_DOCS/GAP_ANALYSIS.md  (spec vs impl)
6. RUN   /root/gentlyos/DEV_DOCS/DEV_MCP.sh check  (bucket updates?)
7. SCAN  git status / git log -5      (what changed?)
8. CHECK /root/gentlyos/DEV_DOCS/UPDATES.md  (recent changes)
```

### Key DEV_DOCS for Protocol Implementation
```
DEV_DOCS/
|-- GAP_ANALYSIS.md        # What's missing vs spec
|-- BUILD_STEPS.md         # Atomic implementation steps
|-- PTC_SECURITY_MAP.md    # Security touchpoints
|-- PROTOCOL_INTEGRATION.md # How protocols connect
|-- RESEARCH_SPECS.md      # Full BS-ARTISAN/GOO/SYNTH specs
|-- CODIE_SPEC.md          # 12-keyword instruction language
+-- BEHAVIOR_RULES.md      # Development rules
```

### DEV_MCP - Remote Instruction Bucket
```bash
DEV_MCP.sh list        # See what's in bucket
DEV_MCP.sh fetch FILE  # Grab file to cache
DEV_MCP.sh diff FILE   # Review changes
DEV_MCP.sh apply FILE  # Apply to DEV_DOCS
```
Source: `github.com/Zero2oneZ/Dev-Bucket` (no clone, just raw fetch)

**Time-Space Orientation:**
- What was I last working on?
- What's the current build state?
- Any failures/errors to address?
- **How much work time remains?**

---

## 2. BEFORE YOU BUILD ANYTHING

### Search Protocol (MANDATORY)

```bash
# Does this function/concept already exist?
grep -r "function_name" crates/
grep -r "ConceptName" crates/

# What crate owns this domain?
# Check the domain map below

# Is there a similar implementation?
# Search for patterns, not just names
```

### Domain -> Crate Map

| Domain | Owner Crate | Key Files |
|--------|-------------|-----------|
| Cryptography | gently-core | crypto/*.rs |
| XOR splits | gently-core | crypto/xor.rs |
| Key rotation | gently-core | crypto/berlin.rs |
| Genesis keys | gently-core | crypto/genesis.rs |
| Knowledge graph | gently-alexandria | graph.rs, node.rs, edge.rs |
| 8D projection | gently-alexandria | tesseract.rs |
| Semantic search | gently-search | alexandria.rs, index.rs |
| Constraints/BONEBLOB | gently-search | constraint.rs |
| Wormholes | gently-search | wormhole.rs |
| Security daemons | gently-security | daemons/*.rs |
| FAFO defense | gently-security | fafo.rs |
| Rate limiting | gently-security | limiter.rs |
| Trust scoring | gently-security | trust.rs |
| LLM orchestration | gently-brain | orchestrator.rs |
| Claude API | gently-brain | claude.rs |
| Local inference | gently-brain | llama.rs |
| Embeddings | gently-brain | embedder.rs |
| Quality mining | gently-inference | *.rs (all) |
| Feed/context | gently-feed | feed.rs, item.rs |
| Network capture | gently-network | capture.rs |
| MITM/TLS | gently-network | mitm.rs |
| P2P dance | gently-dance | *.rs |
| Audio encoding | gently-audio | lib.rs |
| Visual patterns | gently-visual | lib.rs |
| BTC integration | gently-btc | lib.rs, fetcher.rs |
| IPFS storage | gently-ipfs | client.rs, operations.rs |
| MCP server | gently-mcp | server.rs, handler.rs |
| Web GUI | gently-web | handlers.rs, templates.rs |
| CLI commands | gently-cli | main.rs |
| Hardware detect | gently-guardian | hardware.rs |
| API gateway | gently-gateway | router.rs, filter.rs |
| Cipher tools | gently-cipher | *.rs |
| Exploit framework | gently-sploit | *.rs |
| SIM security | gently-sim | *.rs |
| **BS-ARTISAN (NEW)** | gently-artisan | torus.rs, foam.rs, barf.rs |
| **CODIE (NEW)** | gently-codie | parser.rs, hydrate/*.rs |
| **GOO (NEW)** | gently-goo | sdf.rs, field.rs, claude.rs |

### Anti-Duplication Checklist

Before creating ANY new:
- [ ] Function -> `grep -r "fn similar_name" crates/`
- [ ] Struct -> `grep -r "struct SimilarName" crates/`
- [ ] Module -> check if crate already handles domain
- [ ] Crate -> STOP. Ask user. We have 24 already.

---

## 3. ARCHITECTURE AWARENESS

### The Stack (Top -> Bottom)

```
+---------------------------------------------+
|  CLI (gently-cli)                           |  User interface
|  TUI (gentlyos-tui)                         |
|  Web (gently-web)                           |
+---------------------------------------------+
|  Brain (orchestration)                      |  Intelligence
|  Alexandria (knowledge)                     |
|  Search (semantic + BONEBLOB)               |
|  Inference (quality mining)                 |
+---------------------------------------------+
|  Security (16 daemons + FAFO)               |  Protection
|  Guardian (hardware + validation)           |
|  Gateway (API bottleneck)                   |
+---------------------------------------------+
|  Network (capture + MITM)                   |  I/O
|  IPFS (storage)                             |
|  BTC (anchoring)                            |
|  Dance (P2P)                                |
+---------------------------------------------+
|  Core (crypto + primitives)                 |  Foundation
|  Audio/Visual (encoding)                    |
+---------------------------------------------+
```

### Key Patterns Already Implemented

| Pattern | Location | Don't Rebuild |
|---------|----------|---------------|
| Hash chain validation | gently-security/daemons/foundation.rs | Use HashChain struct |
| BTC block fetching | gently-btc/fetcher.rs | Use BlockFetcher |
| Time-slot key rotation | gently-core/crypto/berlin.rs | Use BerlinClock |
| XOR split/combine | gently-core/crypto/xor.rs | Use xor_split/xor_combine |
| Graph traversal | gently-alexandria/graph.rs | Use AlexandriaGraph |
| Tesseract projection | gently-alexandria/tesseract.rs | Use Tesseract methods |
| Constraint optimization | gently-search/constraint.rs | Use ConstraintBuilder |
| Quality scoring | gently-inference/score.rs | Use QualityScorer |
| Step decomposition | gently-inference/decompose.rs | Use Decomposer |
| FAFO escalation | gently-security/fafo.rs | Use FafoController |
| Rate limiting | gently-security/limiter.rs | Use RateLimiter |
| Feed charge/decay | gently-feed/feed.rs | Use LivingFeed |

---

## 4. SELF-DIAGNOSIS PROTOCOL

### Capability Check

When asked to implement something, Claude should:

```
1. IDENTIFY which layer it belongs to (see stack above)
2. FIND the owning crate
3. CHECK what already exists in that crate
4. ASSESS if it's:
   - Extension of existing (PREFERRED)
   - New function in existing crate (OK)
   - New crate (RARE - ask user)
```

### Codebase Position Query

To understand "where am I" relative to codebase:

```bash
# What's the current state?
cargo build --release 2>&1 | tail -20

# What tests pass?
cargo test --workspace 2>&1 | grep -E "(PASS|FAIL|error)"

# What's the binary status?
ls -la target/release/gently* 2>/dev/null

# Recent changes?
git log --oneline -10
```

### Knowledge Gap Detection

If Claude doesn't know how something works:

```
1. Read the crate's lib.rs (entry point)
2. Read the specific module
3. Check for tests (often best documentation)
4. Check CLAUDE.md for session history
```

---

## 5. WORKING MEMORY STRUCTURE

### Active Context (keep in mind during session)

```
CURRENT_TASK:     [what we're building]
OWNER_CRATE:      [which crate owns this]
RELATED_CRATES:   [what else touches this]
EXISTING_CODE:    [what we're extending]
BLOCKERS:         [what's broken/missing]
```

### Session Handoff (end of session)

Update CLAUDE.md with:
- What was built
- What's incomplete
- Known issues
- Next steps

---

## 6. COMMUNICATION PROTOCOL

### When Uncertain

```
"This looks like it might overlap with [crate/module].
Should I extend that or create new?"
```

### When Finding Duplication

```
"Found existing implementation in [location].
Recommend using/extending that instead."
```

### When Architecture Decision Needed

```
"This could live in [crate A] or [crate B].
[A] because...
[B] because...
Recommendation: [X]"
```

---

## 7. FILE ORGANIZATION

### Where New Code Goes

| Type | Location |
|------|----------|
| New CLI command | gently-cli/src/main.rs (add to Commands enum) |
| New security daemon | gently-security/src/daemons/ |
| New Alexandria feature | gently-alexandria/src/ |
| New search feature | gently-search/src/ |
| New brain capability | gently-brain/src/ |
| New inference step | gently-inference/src/ |
| New web route | gently-web/src/handlers.rs + routes.rs |
| New crypto primitive | gently-core/src/crypto/ |

### Naming Conventions

```
Files:      snake_case.rs
Structs:    PascalCase
Functions:  snake_case
Constants:  SCREAMING_SNAKE
Crates:     gently-{domain}
```

---

## 8. BUILD VERIFICATION

After ANY code change:

```bash
# Quick check (single crate)
cargo check -p gently-{crate}

# Full build
cargo build --release

# If touching tests
cargo test -p gently-{crate}
```

---

## 9. EMERGENCY RECOVERY

If lost/confused:

```bash
# 1. Read the maps
cat /root/CLAUDE.md
cat /root/gentlyos/CLAUDE.md

# 2. Check build state
cd /root/gentlyos && cargo build --release 2>&1 | tail -30

# 3. See what exists
find crates -name "*.rs" | head -50

# 4. Check recent history
git log --oneline -20
```

---

## 10. PTC SECURITY ENFORCEMENT

### When Touching Security-Critical Operations

**PTC = Protocol To Change. Security review required.**

**ALWAYS USE PTC** when code touches:
- Cryptographic operations (XOR, Berlin Clock, HKDF)
- Vault/secret access (`$` prefix in CODIE)
- Hash operations (`#` prefix in CODIE)
- Cold execution boundaries (SYNTH)
- Time-based security (BTC timestamps)

**Check DEV_DOCS/PTC_SECURITY_MAP.md** for full rules.

### Quick PTC Checklist

```
[ ] Key derivation? -> Use Berlin Clock
[ ] Secret splitting? -> Use XOR (Lock/Key)
[ ] Vault access? -> Cold execution sandbox
[ ] Hash validation? -> BTC anchor check
[ ] Invalid operation? -> Trigger FAFO
```

### New Protocol Domains

| Protocol | Crate | PTC Required |
|----------|-------|--------------|
| BS-ARTISAN | gently-artisan | Torus ID hashing, genesis anchor |
| CODIE | gently-codie | $ vault, # hash resolution |
| GOO | gently-goo | Template integrity, sovereignty |
| SYNTH | gently-spl | All (cold execution) |

---

## 11. THE META-RULE

```
The codebase embodies: "Constraint is generative"

Apply this to yourself:
- Constrain search space before building
- Eliminate what exists before creating
- Let the architecture guide placement
- The structure IS the documentation
```

---

*This protocol exists so Claude can operate efficiently without rebuilding wheels or losing orientation.*

**Last Updated**: 2026-01-23

---

# 5. LLAMA.CPP DOCS GENERATOR

**Source**: `/home/deck/.local/share/containers/storage/overlay/.../CLAUDE.md`

This is actually a bash script that generates documentation for a web deployment.
It creates markdown files for:
- BS-ARTISAN specification (toroidal topology)
- Alexandria protocol (5W + BBBCP)
- Gently-GOO (unified field)
- SYNTH token specification
- Architecture overview

The script deploys to `public/docs/` and includes a queue system for phone-to-Dell bridging.

---

# END OF COMPILED DOCUMENTATION

**Files compiled**:
1. `/home/deck/Desktop/CLAUDE.md`
2. `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE.md`
3. `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE_CLI_INNER_WORKINGS.md`
4. `/home/deck/Desktop/gently-gently--air/GentlyOS-Rusted-Metal/CLAUDE_PROTOCOL.md`
5. `/home/deck/.local/share/containers/storage/overlay/.../CLAUDE.md` (llama.cpp docs generator)

**Note**: The duplicate files in `.import-bucket/` were skipped as they contain identical content.

**Compiled**: 2026-01-30
