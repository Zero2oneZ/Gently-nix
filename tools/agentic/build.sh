#!/bin/bash
# GentlyOS Complete Build System
# The Bible Build Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RUST_DIR="$ROOT_DIR/GentlyOS-Rusted-Metal"
CACHE_DIR="$SCRIPT_DIR/cache"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
header() { echo -e "\n${CYAN}=== $1 ===${NC}\n"; }

# Crate arrays by tier
TIER_0=("gently-core" "gently-codie" "gently-artisan" "gently-visual")
TIER_1=("gently-btc" "gently-dance" "gently-audio" "gently-cipher" "gently-sim")
TIER_2=("gently-feed" "gently-ipfs" "gently-network" "gently-security")
TIER_3=("gently-alexandria" "gently-search" "gently-inference" "gently-mcp" "gently-architect" "gently-micro")
TIER_4=("gently-agents" "gently-brain" "gently-gateway" "gently-guardian" "gently-sploit")
TIER_5=("gently-web" "gently-cli")
TUI=("gentlyos-tui")

cd "$RUST_DIR"

build_crate() {
    local crate=$1
    local features=${2:-""}
    local start_time=$(date +%s%3N)

    if [ -n "$features" ]; then
        log "Building $crate --features $features"
        cargo build -p "$crate" --features "$features" 2>&1 | tail -5
    else
        log "Building $crate"
        cargo build -p "$crate" 2>&1 | tail -5
    fi

    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    info "$crate built in ${duration}ms"
}

test_crate() {
    local crate=$1
    local features=${2:-""}

    if [ -n "$features" ]; then
        log "Testing $crate --features $features"
        cargo test -p "$crate" --features "$features" 2>&1 | tail -10
    else
        log "Testing $crate"
        cargo test -p "$crate" 2>&1 | tail -10
    fi
}

build_tier() {
    local tier=$1
    local -n crates=$2

    header "Building Tier $tier"
    for crate in "${crates[@]}"; do
        build_crate "$crate"
    done
}

test_tier() {
    local tier=$1
    local -n crates=$2

    header "Testing Tier $tier"
    for crate in "${crates[@]}"; do
        test_crate "$crate"
    done
}

case "${1:-help}" in
    tier-0|foundation)
        build_tier 0 TIER_0
        ;;
    tier-1)
        build_tier 1 TIER_1
        ;;
    tier-2)
        build_tier 2 TIER_2
        ;;
    tier-3)
        build_tier 3 TIER_3
        ;;
    tier-4)
        build_tier 4 TIER_4
        ;;
    tier-5|apps)
        build_tier 5 TIER_5
        ;;
    tui)
        header "Building TUI"
        build_crate "gentlyos-tui"
        ;;
    agents)
        header "Building Agents"
        build_crate "gently-agents"
        build_crate "gently-agents" "codie"
        ;;
    brain)
        header "Building Brain"
        build_crate "gently-brain"
        ;;
    codie)
        header "Building CODIE"
        build_crate "gently-codie"
        test_crate "gently-codie"
        ;;
    test)
        header "Running All Tests"
        cargo test --workspace 2>&1 | tail -50
        ;;
    test-fast)
        header "Testing Foundation + Agents"
        test_tier 0 TIER_0
        test_crate "gently-agents"
        ;;
    release)
        header "Release Build"
        cargo build --release --workspace
        ;;
    all)
        header "Full Build (All Tiers)"
        build_tier 0 TIER_0
        build_tier 1 TIER_1
        build_tier 2 TIER_2
        build_tier 3 TIER_3
        build_tier 4 TIER_4
        build_tier 5 TIER_5
        build_crate "gentlyos-tui"
        log "All crates built successfully!"
        ;;
    clean)
        header "Cleaning"
        cargo clean
        ;;
    status)
        header "Workspace Status"
        cargo metadata --format-version 1 | jq '.packages | length' | xargs -I{} echo "Total packages: {}"
        cargo test --workspace --no-run 2>&1 | grep -E "Compiling|Finished" | tail -20
        ;;
    *)
        echo "GentlyOS Build System"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Build Commands:"
        echo "  all          Build all tiers sequentially"
        echo "  tier-0       Foundation (core, codie, artisan, visual)"
        echo "  tier-1       Core dependents (btc, dance, audio, cipher, sim)"
        echo "  tier-2       Growing (feed, ipfs, network, security)"
        echo "  tier-3       Knowledge (alexandria, search, inference, mcp, architect, micro)"
        echo "  tier-4       Integration (agents, brain, gateway, guardian, sploit)"
        echo "  tier-5       Applications (web, cli)"
        echo "  tui          Terminal UI only"
        echo "  agents       Agents with CODIE feature"
        echo "  brain        Brain crate only"
        echo "  codie        CODIE language + tests"
        echo "  release      Full release build"
        echo ""
        echo "Test Commands:"
        echo "  test         Run all workspace tests"
        echo "  test-fast    Quick test (foundation + agents)"
        echo ""
        echo "Utility:"
        echo "  status       Show workspace status"
        echo "  clean        Clean build artifacts"
        echo ""
        echo "Crate Count: 27 (25 active, 2 disabled)"
        echo "Total Tests: 753"
        ;;
esac
