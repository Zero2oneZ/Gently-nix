# GentlyOS-Nix Project Report

Generated: 2026-02-04

## Overview

GentlyOS-Nix is a privacy-focused NixOS distribution combining:
- **GentlyOS Rust Core** - Security toolkit with 90,845 lines of Rust
- **NixOS Integration** - Reproducible, declarative system configuration
- **Electron App** - Desktop interface

## Project Statistics

| Metric | Value |
|--------|-------|
| Total Size | 17.6 GB |
| Rust Files | 390 |
| Rust Lines | 90,845 |
| Nix Files | 11 |
| Git Repos | 9 |

## Directory Structure

```
Gently-nix/
  flake.nix           # Main Nix flake (NixOS 24.11)

  GentlyOS/           # Rust core (17 GB)
    Cargo.toml        # Workspace with 32 crates
    binaries/         # CLI entry points
    crates/           # Source code (6 tiers)
    target/           # Compiled binaries

  app/                # Electron app (639 MB)
  modules/            # NixOS modules
  iso/                # ISO builder config
  profiles/           # System profiles
  btc-data/           # Bitcoin block data (6.7 MB)
```

## Rust Crates (32 total)

### TIER 0: Foundation (6 crates)
| Crate | Purpose |
|-------|---------|
| gently-core | XOR split-knowledge, crypto primitives |
| gently-codie | CODIE 12-keyword instruction language |
| gently-artisan | BS-ARTISAN toroidal knowledge storage |
| gently-audio | FFT decoder, audible/ultrasonic auth |
| gently-visual | SVG renderer, pattern encoder |
| gently-goo | GOO Field unified distance field engine |

### TIER 1-2: Knowledge (5 crates)
| Crate | Purpose |
|-------|---------|
| gently-feed | Living Feed context tracker |
| gently-alexandria | Distributed knowledge mesh |
| gently-search | Semantic thought index |
| gently-btc | Bitcoin block monitor, entropy |
| gently-ipfs | Decentralized storage |

### TIER 3: Intelligence (7 crates)
| Crate | Purpose |
|-------|---------|
| gently-brain | Local LLM, embeddings, TensorChain |
| gently-inference | Model inference |
| gently-agents | Agentic scaffold, tool-using AI |
| gently-micro | Microservices |
| gently-mcp | Model Context Protocol server |
| gently-ged | G.E.D. domain translation |
| gently-behavior | Behavioral learning, adaptive UI |

### TIER 4: Security (5 crates)
| Crate | Purpose |
|-------|---------|
| gently-security | FAFO pitbull defense system |
| gently-cipher | Cipher identification, cryptanalysis |
| gently-guardian | Sentinel monitoring |
| gently-sim | Security simulation |
| gently-sploit | Exploitation framework |

### TIER 5: Network (4 crates)
| Crate | Purpose |
|-------|---------|
| gently-network | Packet capture, MITM proxy |
| gently-gateway | API gateway |
| gently-bridge | IPC bridge (port 7335) |
| gently-dance | Visual-audio authentication protocol |

### TIER 6: Application (5 crates)
| Crate | Purpose |
|-------|---------|
| gently-web | Web interface |
| gently-architect | Idea crystallization, flowcharts |
| gently-document | Three-chain document engine |
| gently-gooey | 2D FlexBox Quad app builder |
| gently-commerce | Vibe commerce, TradingView |

## NixOS Configuration

### Flake Inputs
- nixpkgs (NixOS 24.11)
- nixpkgs-unstable
- rust-overlay
- home-manager

### Build Targets
```bash
nix build .#iso          # Standard graphical ISO
nix build .#iso-minimal  # Minimal text-mode ISO
nix build .#iso-full     # Full ISO with Calamares
```

### NixOS Modules
- boot/       - Boot configuration
- hardware/   - Hardware support
- install/    - Installation scripts
- session/    - Desktop session (Sway)

## CLI Commands (gently v1.0.0)

### Core Security
- `gently init` - Generate genesis key
- `gently create` - Create Lock/Key pair
- `gently split` / `combine` - Secret splitting
- `gently pattern` - Visual pattern from hash
- `gently demo` - Dance protocol simulation

### Blockchain
- `gently wallet` - Genesis-locked wallets
- `gently token` - GNTLY operations
- `gently mint` - NFT minting

### AI/Intelligence
- `gently chat` - Local AI (TinyLlama)
- `gently claude` - Anthropic integration
- `gently brain` - Local LLM, TensorChain
- `gently mcp` - MCP server for Claude

### Knowledge
- `gently feed` - Living Feed
- `gently search` - Thought index
- `gently alexandria` - Knowledge mesh
- `gently ipfs` - Decentralized storage

### Security Tools
- `gently cipher` - Crypto analysis
- `gently sploit` - Exploitation framework
- `gently crack` - Password cracking
- `gently network` - Packet capture
- `gently security` - FAFO dashboard
- `gently sentinel` - Integrity monitoring

### Graphics/UI
- `gently goo` - Distance field engine
- `gently gooey` - 2D app builder
- `gently ged` - Domain translation
- `gently doc` - Document engine

## Token Economy

| Token | Purpose |
|-------|---------|
| GNTLY | Certification swaps + permission stakes |
| GOS | Governance tokens (folder-level access) |
| GENOS | Proof-of-thought (AI/GPU economy) |

## Security Model

### FAFO Pitbull Defense
```
Strike 1-2:  TARPIT   - Waste attacker time
Strike 3-4:  POISON   - Corrupt context
Strike 5-7:  DROWN    - Honeypot flood
Strike 8-9:  DROWN+   - Heavy flooding
Strike 10+:  DESTROY  - Permanent ban
CRITICAL:    SAMSON   - Scorched earth
```

### Dance Protocol
1. Secret split into LOCK (device) + KEY (NFT)
2. Visual/audio call-and-response (8 rounds)
3. Temporary reconstruction during dance
4. Immediate zeroization after auth

### Dual Audit System
- Internal: 1 GNTLY swap per edit (OS self-audit)
- External: 1 GNTLY swap per Dance (device-to-device)

## Build Requirements

### For Rust (GentlyOS core)
- Rust toolchain (stable)
- OpenSSL development headers
- pkg-config

### For NixOS ISO
- Nix with flakes enabled
- ~20GB disk space
- ~4GB RAM

## Running GentlyOS

```bash
# From Gently-nix directory
./GentlyOS/target/debug/gently status
./GentlyOS/target/debug/gently demo
./GentlyOS/target/debug/gently --help
```

## Connection Graph

```
                              gently-cli (ENTRY POINT)
                                       |
       +-------+-------+-------+-------+-------+-------+-------+-------+
       |       |       |       |       |       |       |       |       |
       v       v       v       v       v       v       v       v       v
   architect brain   mcp   search  feed  alexandria  goo   ged   security
       |       |       |       |      |       |        |     |       |
       |       +---+---+       +------+-------+        |     |       |
       |           |                  |                |     |       |
       v           v                  v                v     v       v
     search     agents             ipfs             visual btc   cipher
       |           |                  |                |           |
       +-----+-----+                  |                |           |
             |                        |                |           |
             v                        v                v           v
           codie                    core <------------+----------network
                                     /|\
                                      |
    +----------+----------+----------+----------+----------+
    |          |          |          |          |          |
    v          v          v          v          v          v
  audio     visual      dance      btc       feed      commerce
    |          |          |          |          |
    +-----+----+          |          |          |
          |               |          |          |
          v               v          v          v
        core            core       core       core


TIER 0 (Foundation):  core, codie, artisan, audio, visual, goo
TIER 1-2 (Knowledge): feed, alexandria, search, btc, ipfs
TIER 3 (Intelligence): brain, inference, agents, micro, mcp, ged, behavior
TIER 4 (Security):    security, cipher, guardian, sim, sploit
TIER 5 (Network):     network, gateway, bridge, dance
TIER 6 (Application): web, architect, document, gooey, commerce
```

### Dependency Flow (Simplified)

```
APPLICATION LAYER
  gently-cli -----> [all major crates]
  gently-web -----> brain, security, alexandria, feed, search
  gently-architect -> search, feed
  gently-gooey ---> goo, visual
  gently-document -> visual

INTELLIGENCE LAYER
  gently-brain ---> search, alexandria, agents, codie
  gently-ged -----> agents, btc
  gently-mcp -----> feed, search
  gently-agents --> codie

SECURITY LAYER
  gently-security -> cipher, network
  gently-sploit --> cipher, network
  gently-guardian -> btc
  gently-gateway -> brain, btc, security

KNOWLEDGE LAYER
  gently-search --> feed, alexandria
  gently-alexandria -> ipfs

NETWORK LAYER
  gently-bridge --> security
  gently-gateway -> brain, security

FOUNDATION LAYER
  gently-goo -----> visual, audio
  gently-audio ---> core
  gently-visual --> core
  gently-dance ---> core
  gently-core ----> (no deps - ROOT)
```

### Key Insight: gently-core is the ROOT

Everything flows down to `gently-core`. It provides:
- XOR split-knowledge crypto
- Hash primitives
- Pattern encoding base
- Common types/errors

## Build Status

**Status: COMPILES SUCCESSFULLY**

Warnings only (no errors):
- `gently-agents`: 1 unused variable
- `gently-ged`: 2 unused fields
- `gently-document`: 3 unused imports
- `gently-codie`: 4 minor warnings
- `gently-behavior`: 1 unused field

All warnings are cosmetic - code runs fine.

## License

MIT
