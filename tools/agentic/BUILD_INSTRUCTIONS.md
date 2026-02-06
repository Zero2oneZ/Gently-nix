# Build Instructions

## Prerequisites

- Rust 1.75+ (via rustup)
- GCC/G++ (for native compilation)
- On Steam Deck: Use distrobox with Fedora

## Setup Distrobox (Steam Deck)

```bash
# Create dev container
distrobox create --name dev --image fedora:39
distrobox enter dev

# Install build tools
sudo dnf install -y gcc gcc-c++ make pkg-config openssl-devel

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

## Build Commands

### GentlyOS-Rusted-Metal

```bash
cd GentlyOS-Rusted-Metal

# Build all crates
cargo build --release

# Build specific crates
cargo build -p gently-agents
cargo build -p gently-codie
cargo build -p gently-brain

# Build with CODIE feature
cargo build -p gently-agents --features codie

# Run tests
cargo test --workspace
cargo test -p gently-agents -p gently-codie

# Run examples
cargo run --example basic -p gently-agents
cargo run --example codie_agent -p gently-agents --features codie
```

## Build Order (Dependencies)

1. `gently-core` - Base types, crypto
2. `gently-codie` - CODIE language
3. `gently-agents` - Agentic scaffold
4. `gently-brain` - LLM orchestration
5. All other crates

## Feature Flags

| Crate | Feature | Description |
|-------|---------|-------------|
| gently-agents | `codie` | Real CODIE interpreter |
| gently-brain | `codie` | CODIE brain integration |

## Artifacts

Build artifacts are placed in:
- `target/debug/` - Debug builds
- `target/release/` - Release builds
- `.agentic/cache/` - Cached build state
