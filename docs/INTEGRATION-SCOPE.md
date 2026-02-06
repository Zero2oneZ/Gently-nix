# GentlyOS Integration Scope

Generated: 2026-02-01

## Summary

| Category | Ready | Partial | Stub | Total |
|----------|-------|---------|------|-------|
| Foundation (Tier 0) | 5 | 1 | 0 | 6 |
| Knowledge (Tier 1-2) | 4 | 2 | 0 | 6 |
| Intelligence (Tier 3) | 3 | 2 | 0 | 5 |
| Security (Tier 4) | 4 | 1 | 1 | 6 |
| Network (Tier 5) | 3 | 2 | 0 | 5 |
| Application (Tier 6) | 3 | 1 | 1 | 5 |
| **TOTAL** | **22** | **9** | **2** | **33** |

## Ready for Integration NOW

These components are production-ready and can be integrated immediately.

### Foundation (Tier 0) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-core | crates/foundation/gently-core | Import as dependency |
| gently-codie | crates/foundation/gently-codie | CODIE DSL ready |
| gently-artisan | crates/foundation/gently-artisan | Toroidal storage |
| gently-blob | crates/foundation/gently-blob | Content-addressable |
| gently-config | crates/foundation/gently-config | Config loader |
| GuardDog (JS) | packages/guarddog | npm install guarddog |

### Knowledge (Tier 1-2) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-alexandria | crates/knowledge/gently-alexandria | Knowledge graph |
| gently-ipfs | crates/knowledge/gently-ipfs | IPFS integration |
| gently-btc | crates/knowledge/gently-btc | BTC anchoring |
| gently-meta | crates/knowledge/gently-meta | Metadata system |

### Intelligence (Tier 3) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-brain | crates/intelligence/gently-brain | LLM orchestration |
| gently-agents | crates/intelligence/gently-agents | 5-element pipeline |
| gently-mcp | crates/intelligence/gently-mcp | MCP server/client |

### Security (Tier 4) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-guardian | crates/security/gently-guardian | 16 daemons |
| gently-cipher | crates/security/gently-cipher | Encryption |
| gently-vault | crates/security/gently-vault | Secret storage |
| EnvironmentValidator | packages/guarddog/lib/env-validator.js | Boot validation |

### Network (Tier 5) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-bridge | crates/network/gently-bridge | IPC bridge |
| gently-dance | crates/network/gently-dance | XOR reconstruction |
| gently-p2p | crates/network/gently-p2p | Peer discovery |

### Application (Tier 6) - READY

| Component | Location | Integration Path |
|-----------|----------|------------------|
| gently-web | crates/application/gently-web | HTMX endpoints |
| gently-document | crates/application/gently-document | Doc processing |
| Electron App | app/ | npm start |

---

## Partial - Needs Work

These components exist but need additional work before full integration.

| Component | Status | Needed Work |
|-----------|--------|-------------|
| gently-hash | 80% | Missing async variants |
| gently-search | 70% | Index optimization |
| gently-embed | 60% | Model loading |
| gently-llm | 70% | Streaming completion |
| gently-chain | 80% | Chain validation |
| gently-net | 60% | Rate limiting |
| gently-tunnel | 50% | TLS setup |
| gently-commerce | 40% | Payment integration |
| gently-sploit | 60% | Pattern database |

---

## Stubs - Not Implemented

These are placeholders that need full implementation.

| Component | Description | Priority |
|-----------|-------------|----------|
| gently-spl | Solana SPL tokens | HIGH |
| gently-py | Python bindings | MEDIUM |

---

## Integration Order (Recommended)

### Phase 1: Core Boot (Now)

1. **Environment Validation** - Already integrated
   - modules/env-validation.nix
   - packages/guarddog/lib/env-validator.js
   - Runs on every boot

2. **GuardDog Tier 0** - Already integrated
   - packages/guarddog/
   - All IO flows through detection

3. **Electron App** - Already integrated
   - app/main.js
   - app/preload.js

### Phase 2: Security Layer (Next)

1. **gently-guardian** integration
   - Hardware detection (hardware.rs)
   - 16 security daemons
   - Boot validation

2. **gently-vault** integration
   - XOR split-knowledge
   - Token storage
   - Berlin Clock rotation

### Phase 3: Intelligence Layer

1. **gently-brain** integration
   - LLM orchestration
   - Model routing

2. **gently-agents** integration
   - 5-element pipeline
   - Agent coordination

### Phase 4: Network Layer

1. **gently-bridge** integration
   - IPC port 7335
   - Cross-process comms

2. **gently-dance** integration
   - XOR reconstruction
   - Secure channels

### Phase 5: Application Layer

1. **gently-web** integration
   - HTMX dashboard
   - API endpoints

2. **gently-commerce** (when ready)
   - Payment processing
   - NFT tier verification

---

## NixOS Modules Status

| Module | Status | Location |
|--------|--------|----------|
| env-validation.nix | READY | modules/env-validation.nix |
| tier-gate.nix | READY | modules/tier-gate.nix |
| gently-app.nix | READY | modules/gently-app.nix |
| gently-session.nix | READY | modules/session/gently-session.nix |
| drivers.nix | READY | modules/hardware/drivers.nix |

---

## Build Commands

```bash
# Build dev tier ISO (all features)
nix build .#iso-dev

# Build full ISO (production)
nix build .#iso-full

# Build minimal ISO (installer only)
nix build .#iso-minimal

# Run Electron app locally
cd app && npm start

# Run environment validation
gently-env-validate detect
gently-env-validate status
```

---

## Hardware Score Reference

Environment validation calculates a hardware score:

| Score Range | Recommended Tier |
|-------------|------------------|
| 1-24 | Free |
| 25-49 | Basic |
| 50-99 | Pro |
| 100+ | Dev |

Score formula:
- CPU: 1 point per core + 0.5 per thread
- RAM: 1 point per 4GB
- GPU: 5 points per GB VRAM
- SSD: +5 bonus points

---

## Environment Fingerprint

The fingerprint is SHA256 of:
- CPU vendor + model + cores
- Memory total
- GPU model
- Machine ID

This ensures the same physical machine boots each time.
