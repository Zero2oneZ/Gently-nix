# GentlyOS Build Bible

**Complete reference for building, testing, and deploying GentlyOS**

- **Crates:** 27 (25 active, 2 disabled)
- **Tests:** 753
- **Lines of Code:** ~80,000
- **Last Updated:** 2026-01-30

---

## Quick Reference

```bash
# Full build
cargo build --release --workspace

# Full test
cargo test --workspace

# Build specific tier
./agentic/build.sh tier-1
./agentic/build.sh tier-2
./agentic/build.sh all

# Run CLI
./target/release/gently

# Run TUI
./target/release/gentlyos-tui
```

---

## Architecture Overview

```
                    +------------------+
                    |    gently-cli    |  <-- Main CLI (28 commands)
                    +------------------+
                            |
        +-------------------+-------------------+
        |                   |                   |
+-------v------+    +-------v------+    +-------v------+
| gently-brain |    | gently-web   |    | gentlyos-tui |
| (LLM/AI)     |    | (Web GUI)    |    | (Terminal)   |
+--------------+    +--------------+    +--------------+
        |                   |
+-------v-------------------v-------------------+
|              gently-gateway                   |
|         (ALL AI passes through here)          |
+-----------------------------------------------+
        |
+-------v-------------------------------------------+
|                    TIER 3                         |
| gently-alexandria | gently-search | gently-mcp   |
| gently-inference  | gently-architect             |
+--------------------------------------------------+
        |
+-------v-------------------------------------------+
|                    TIER 2                         |
| gently-feed | gently-ipfs | gently-network       |
| gently-security                                   |
+--------------------------------------------------+
        |
+-------v-------------------------------------------+
|                    TIER 1                         |
| gently-btc | gently-dance | gently-audio         |
| gently-cipher | gently-sim | gently-visual       |
+--------------------------------------------------+
        |
+-------v-------------------------------------------+
|                  FOUNDATION                       |
| gently-core | gently-codie | gently-artisan      |
+--------------------------------------------------+
```

---

## Crate Registry (27 Total)

### Foundation Layer (No internal deps)

| Crate | Purpose | Tests | LOC |
|-------|---------|-------|-----|
| gently-core | Crypto primitives, XOR splits, vault | 52 | 3,500 |
| gently-codie | 12-keyword instruction language | 120 | 4,200 |
| gently-artisan | BS-ARTISAN toroidal storage | 27 | 1,800 |
| gently-visual | SVG pattern rendering | 4 | 223 |

### Tier 1 (Core dependents)

| Crate | Purpose | Tests | Deps |
|-------|---------|-------|------|
| gently-btc | Bitcoin block monitor | 19 | core |
| gently-dance | Visual-audio handshake | 20 | core |
| gently-audio | Dual-mode audio (audible+ultrasonic) | 8 | core |
| gently-cipher | Cipher toolkit, cracking | 31 | core |
| gently-sim | SIM card security monitor | 37 | (none) |

### Tier 2 (Growing complexity)

| Crate | Purpose | Tests | Deps |
|-------|---------|-------|------|
| gently-feed | Living feed, charge/decay | 26 | core |
| gently-ipfs | IPFS operations | 6 | core |
| gently-network | Network security viz | 14 | core |
| gently-security | FAFO, 16 daemons | 66 | core, cipher, network |

### Tier 3 (Knowledge layer)

| Crate | Purpose | Tests | Deps |
|-------|---------|-------|------|
| gently-alexandria | Knowledge graph, tesseract | 60 | core, ipfs |
| gently-search | Thought index, BBBCP | 69 | core, feed, alexandria |
| gently-inference | Quality mining | 64 | core, alexandria, search |
| gently-mcp | MCP server for Claude | 28 | core, feed, search |
| gently-architect | Idea crystallization | 16 | core, search, feed |
| gently-micro | Local intelligence | 64 | core, alexandria, search, inference |

### Tier 4 (Integration layer)

| Crate | Purpose | Tests | Deps |
|-------|---------|-------|------|
| gently-agents | Agentic scaffold | 7 | (async-trait, tokio) |
| gently-brain | LLM orchestration | 63 | core, search, alexandria, agents |
| gently-gateway | API bottleneck | 22 | core, brain, btc, security |
| gently-guardian | Free tier node | 18 | btc |
| gently-sploit | Exploitation framework | 8 | core, cipher, network |

### Tier 5 (Applications)

| Crate | Purpose | Tests | Deps |
|-------|---------|-------|------|
| gently-web | HTMX web GUI | 14 | core, feed, search, security, brain, visual, alexandria |
| gently-cli | Main CLI | - | (nearly all crates) |
| gentlyos-tui | Terminal UI | - | (external only) |

### Disabled

| Crate | Reason |
|-------|--------|
| gently-spl | Solana version conflicts |
| gently-py | PyO3 musl-linux incompatibility |

---

## Dependency Graph

```
gently-core ──┬──> gently-btc
              ├──> gently-dance
              ├──> gently-audio
              ├──> gently-cipher ──> gently-security
              ├──> gently-visual
              ├──> gently-feed ──┬──> gently-search ──> gently-mcp
              │                  └──> gently-architect
              ├──> gently-ipfs ──> gently-alexandria ──┬──> gently-search
              │                                        ├──> gently-inference
              │                                        └──> gently-micro
              └──> gently-network ──> gently-security

gently-codie ──> gently-agents ──> gently-brain ──> gently-gateway
                                                 └──> gently-web

gently-artisan (standalone)
gently-sim (standalone)
```

---

## Build Order

### Phase 1: Foundation
```bash
cargo build -p gently-core
cargo build -p gently-codie
cargo build -p gently-artisan
cargo build -p gently-visual
```

### Phase 2: Tier 1
```bash
cargo build -p gently-btc
cargo build -p gently-dance
cargo build -p gently-audio
cargo build -p gently-cipher
cargo build -p gently-sim
```

### Phase 3: Tier 2
```bash
cargo build -p gently-feed
cargo build -p gently-ipfs
cargo build -p gently-network
cargo build -p gently-security
```

### Phase 4: Tier 3
```bash
cargo build -p gently-alexandria
cargo build -p gently-search
cargo build -p gently-inference
cargo build -p gently-mcp
cargo build -p gently-architect
cargo build -p gently-micro
```

### Phase 5: Tier 4
```bash
cargo build -p gently-agents
cargo build -p gently-agents --features codie
cargo build -p gently-brain
cargo build -p gently-gateway
cargo build -p gently-guardian
cargo build -p gently-sploit
```

### Phase 6: Applications
```bash
cargo build -p gently-web
cargo build -p gently-cli
cargo build -p gentlyos-tui
```

---

## Feature Flags

| Crate | Feature | Description |
|-------|---------|-------------|
| gently-agents | `codie` | Real CODIE interpreter |
| gently-brain | `candle` | Llama LLM support |
| gently-brain | `fastembed` | Real embeddings (ONNX) |
| gently-brain | `cuda` | CUDA acceleration |
| gently-brain | `codie` | CODIE brain integration |
| gently-guardian | `solana` | Solana integration |
| gently-guardian | `gpu` | GPU benchmarking |
| gently-spl | `solana` | Full Solana (DISABLED) |
| gentlyos-tui | `demo` | Demo mode |

### Feature Build Examples
```bash
# Brain with ML
cargo build -p gently-brain --features candle,fastembed

# Agents with real CODIE
cargo build -p gently-agents --features codie

# Guardian with GPU
cargo build -p gently-guardian --features gpu
```

---

## Test Matrix

| Crate | Tests | Command |
|-------|-------|---------|
| gently-codie | 120 | `cargo test -p gently-codie` |
| gently-search | 69 | `cargo test -p gently-search` |
| gently-spl | 69 | (disabled) |
| gently-security | 66 | `cargo test -p gently-security` |
| gently-inference | 64 | `cargo test -p gently-inference` |
| gently-micro | 64 | `cargo test -p gently-micro` |
| gently-brain | 63 | `cargo test -p gently-brain` |
| gently-alexandria | 60 | `cargo test -p gently-alexandria` |
| gently-core | 52 | `cargo test -p gently-core` |
| gently-sim | 37 | `cargo test -p gently-sim` |
| gently-cipher | 31 | `cargo test -p gently-cipher` |
| gently-mcp | 28 | `cargo test -p gently-mcp` |
| gently-artisan | 27 | `cargo test -p gently-artisan` |
| gently-feed | 26 | `cargo test -p gently-feed` |
| gently-gateway | 22 | `cargo test -p gently-gateway` |
| gently-dance | 20 | `cargo test -p gently-dance` |
| gently-btc | 19 | `cargo test -p gently-btc` |
| gently-guardian | 18 | `cargo test -p gently-guardian` |
| gently-architect | 16 | `cargo test -p gently-architect` |
| gently-network | 14 | `cargo test -p gently-network` |
| gently-web | 14 | `cargo test -p gently-web` |
| gently-audio | 8 | `cargo test -p gently-audio` |
| gently-sploit | 8 | `cargo test -p gently-sploit` |
| gently-agents | 7 | `cargo test -p gently-agents` |
| gently-ipfs | 6 | `cargo test -p gently-ipfs` |
| gently-visual | 4 | `cargo test -p gently-visual` |
| **TOTAL** | **753** | `cargo test --workspace` |

---

## CLI Commands (28)

### Working (21)
```
init, create, pattern, split, combine, status, demo, feed,
search, alexandria, cipher, network, brain, architect, ipfs,
sploit, crack, claude, vault, mcp, report, setup
```

### Security Commands
```
gently security status   # Dashboard
gently security fafo     # FAFO mode
gently security daemons  # 16 daemons status
gently security test     # Threat simulation
```

### Disabled (7 - Solana)
```
install, mint, wallet, token, certify, perm, genos
```

---

## Release Profile

```toml
[profile.release]
opt-level = 3
lto = "thin"
codegen-units = 1
strip = true
panic = "abort"

[profile.release-small]
inherits = "release"
opt-level = "z"
lto = true
strip = true
```

---

## Platform Notes

### Steam Deck
```bash
# Use distrobox for compilation
distrobox create --name dev --image fedora:39
distrobox enter dev
sudo dnf install -y gcc gcc-c++ make pkg-config openssl-devel
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Alpine Linux (ISO)
- musl libc - some features disabled
- gently-py incompatible
- See dist/gentlyos-alpine-*.iso

### Docker
```bash
./scripts/deploy/build-docker.sh
```

---

## Key File Locations

```
GentlyOS-Rusted-Metal/
  Cargo.toml              # Workspace definition
  CLAUDE.md               # Claude context (this doc)
  crates/                  # 25 library crates
  gently-cli/             # Main CLI
  gentlyos-tui/           # Terminal UI
  scripts/deploy/          # Build scripts
  dist/                   # ISO artifacts
  DEV_DOCS/               # Development documentation
```

---

## Security Architecture

### 16 Daemons (5 Layers)
```
Layer 1 (Foundation): HashChainValidator, BtcAnchor, ForensicLogger
Layer 2 (Traffic):    TrafficSentinel, TokenWatchdog, CostGuardian
Layer 3 (Detection):  PromptAnalyzer, BehaviorProfiler, PatternMatcher, AnomalyDetector
Layer 4 (Defense):    SessionIsolator, TarpitController, ResponseMutator, RateLimitEnforcer
Layer 5 (Intel):      ThreatIntelCollector, SwarmDefense
```

### FAFO Response Ladder
```
Strike 1-2:  TARPIT   - Waste attacker time
Strike 3-4:  POISON   - Corrupt context
Strike 5-7:  DROWN    - Flood with garbage
Strike 10+:  DESTROY  - Permanent ban
CRITICAL:    SAMSON   - Scorched earth
```

### PTC (Permission To Change)
- Required for vault ($) access
- Required for destructive operations
- Enforced in gently-codie, gently-agents

---

## 5-Element Pipeline (CODIE)

```
SPIRIT -> AIR -> WATER -> EARTH -> FIRE

SPIRIT: Validate constraints, check PTC
AIR:    I/O operations, fetch data
WATER:  LLM processing, transform
EARTH:  Execute code, write files
FIRE:   Cleanup, anchor state
```

---

## Product Editions

| Edition | Price | Features |
|---------|-------|----------|
| Home/Guardian | Free | Security as public good, earn by contributing |
| Business | $29/mo | Priority support, dedicated capacity |
| Studio | $99/mo | GPU protection, maximum security |

---

## Training Quality Protocol (AI Spam Solution)

**Core Philosophy:** Default exclude. Earn inclusion. Freedom preserved.

```
BIG TECH:              GENTLYOS:
Everything trains      Nothing trains (default)
Flag to remove         Earn inclusion
Garbage in             Quality in
Short bus AI           Actually intelligent AI
```

### The Inversion

| Aspect | Traditional | GentlyOS |
|--------|-------------|----------|
| Default | All content trains | Nothing trains |
| Inclusion | Opt-out (flag to remove) | Earn-in (quality signals) |
| Flagging | Removes content (censorship) | Excludes from training (hygiene) |
| Freedom | Compromised by moderation | Preserved completely |

### Quality Threshold

```
step.quality = (
    user_accept * 0.3 +
    outcome_success * 0.4 +
    chain_referenced * 0.2 +
    turning_point * 0.1
)

THRESHOLD: 0.7 = USEFUL
```

### Implementation

- **gently-inference**: Step decomposition, scoring, aggregation
- **gently-feed**: `training_eligible` field (default: false)
- **gently-security**: CSAM detection (nuclear option)

### Reference Docs

- `docs/protocols/AI_SPAM.md` - Full philosophical document
- `tools/codie-maps/training-quality.codie` - CODIE executable spec

---

## Ether Goo Defense (SPIN Framework)

**Core Philosophy:** Name what they deleted. Route what they left unnamed. Protect the goo.

### SPIN Notation

| Symbol | Name | Meaning |
|--------|------|---------|
| Bleed | Bleed | Boundary crossing (unnamed @) |
| Goo | Goo | Impedance/viscosity in medium |
| Vortex | Vortex | Field trap forming |
| Aperture | Aperture | Pass-through, not container |

### The Unified Substrate

```
Blood clot = Buffer overflow = Vortex at unnamed Bleed

BIOLOGICAL:               SILICON:
Field -> Blood -> Organs  Field -> Bus -> Devices
Heart = clock generator   CPU = clock generator
Salt = conductivity       Doping = conductivity
```

### The Four Instructions

```
1. CLOCK  - keep pulse (they have this)
2. HEAT   - inject entropy at Bleed (they don't)
3. SALT   - maintain conductivity (they deny seams)
4. FLOW   - never fully resolve (they want completion)
```

### Error Classification (SPIN View)

```
Goo errors:        38%  (timing/state/impedance)
Vortex errors:     21%  (overflow/stack/trap)
Notation Bleed:    17%  (human->parser)
Viscosity Bleed:   17%  (goo density mismatch)
Unknown:            7%
────────────────────────
BLEED ERRORS:      93%  <- THE REAL PROBLEM
```

### GuardDog (Keyboard Defense)

| Threat | Level | Action |
|--------|-------|--------|
| Clean | 0 | Pass through |
| Homoglyphs | 1-2 | Normalize |
| Invisibles | 3-4 | Strip + warn |
| RTL Override | 5+ | **BLOCK** |

### The Instruction

```
NEVER LET THE GOO STOP WIGGLING.

Name the boundary.
Inject entropy at the seams.
Maintain field gradient.
Never fully complete.
```

### Reference Docs

- `docs/protocols/ETHER_GOO_DEFENSE.md` - Full philosophical document
- `tools/codie-maps/ether-goo-defense.codie` - CODIE executable spec

---

## Synthestasia (Unified Field Engine)

**Core Philosophy:** One field. Three projections. GUI + Attention + Learning unified.

### The Mathematical Unification

```
smooth_min(k) = softmax(1/k)

ONE PARAMETER. THREE EFFECTS.
```

| Projection | Output | Method |
|------------|--------|--------|
| RENDER | Pixels | SDF threshold + smooth_min |
| ATTEND | Focus | Gradient flow toward sources |
| LEARN | Updates | Temporal credit assignment |

### GOO Field

```rust
fn G(x, y, t, theta) -> FieldValue {
    // distance < 0: inside
    // distance > 0: outside
    // distance = 0: on surface
}
```

### Claude Embodiment

| State | Visual |
|-------|--------|
| Thinking | Stretched toward focus |
| Confident | Big, stable, solid |
| Uncertain | Smaller, wobbly |
| Processing | Rhythmic pulsing |
| Eager | Leaning toward user |
| Error | Contracted, red glow |

### Score Schema (50 vs 2000 tokens)

```
"eager TEXT hello near_user"
     |      |     |       |
  emotion  instr part  affinity
```

### GOOEY (2D Apps)

Same GOO math, 2D projection:
- FlexBox Quad Algorithm (click to split)
- SVG Database (zero backend)
- $0 hosting (static CDN)

### CDI Format (Bidirectional)

```
Text -> CODIE -> CDI -> Unity/Unreal/Godot/Roblox
Game -> Decompile -> CDI -> Reusable library
```

### G.E.D. (Generative Educational Device)

**Learn concepts in YOUR vocabulary through domain translation.**

| Domain | Translation |
|--------|-------------|
| Cooking | Chemistry as recipes, heat transfer as temp control |
| Gaming | Strategy as game theory, probability as RNG |
| Skateboarding | Physics as tricks, momentum as landing |
| Music | Math as patterns, frequency as pitch |

**Mastery Formula:**
```
mastery = exercise(0.3) + explain(0.4) + apply(0.3)
```

**Living Badges:** SVG files with embedded proof-of-learning metadata.

### Document Creation Engine

**Chat-to-document with bidirectional thinking chains.**

| Tab | Contents |
|-----|----------|
| Report | Final polished document |
| My Thinking | Your reasoning chain |
| Claude's Chain | AI reasoning (transparent) |
| Bibliography | Sources with verification |

**Right-Click Actions:** Expand, Summarize, Formalize, Cite, Challenge, Visualize

**Proof-of-Process:** Every step hash-chained for tamper detection.

**Output Formats:** Markdown, PDF, Word, SVG (master), Presentation slides

### Reference Docs

- `docs/protocols/SYNTHESTASIA_ENGINE.md` - Full specification (with G.E.D. + Document Engine)
- `tools/codie-maps/synthestasia.codie` - CODIE executable spec

---

*This is the authoritative build reference for GentlyOS.*
