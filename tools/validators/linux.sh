#!/bin/bash
# Linux Validator
# For standard Linux distributions

set -e

echo "========================================"
echo "  Linux Validator"
echo "  The Open Kingdom"
echo "========================================"
echo ""

ERRORS=0

pass() { echo -e "\033[0;32m[PASS]\033[0m $1"; }
fail() { echo -e "\033[0;31m[FAIL]\033[0m $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }

# Detect distro
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    pass "Distribution: $NAME $VERSION_ID"
else
    warn "Cannot detect distribution"
fi

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
    pass "Architecture: x86_64"
elif [[ "$ARCH" == "aarch64" ]]; then
    pass "Architecture: ARM64"
else
    warn "Unusual architecture: $ARCH"
fi

# Check kernel
KERNEL=$(uname -r)
pass "Kernel: $KERNEL"

# Check Rust
echo ""
echo "--- Build Tools ---"
if command -v rustc &> /dev/null; then
    pass "Rust: $(rustc --version)"
else
    fail "Rust not installed"
    echo "      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

if command -v cargo &> /dev/null; then
    pass "Cargo: $(cargo --version)"
fi

if command -v gcc &> /dev/null; then
    pass "GCC: $(gcc --version | head -1)"
elif command -v clang &> /dev/null; then
    pass "Clang: $(clang --version | head -1)"
else
    fail "No C compiler found"
    echo "      Ubuntu/Debian: sudo apt install build-essential"
    echo "      Fedora: sudo dnf install gcc gcc-c++"
    echo "      Arch: sudo pacman -S base-devel"
fi

# Check Git
if command -v git &> /dev/null; then
    pass "Git: $(git --version)"
else
    fail "Git not installed"
fi

# Check optional tools
echo ""
echo "--- Optional Tools ---"
command -v jq &> /dev/null && pass "jq installed" || warn "jq not installed (recommended)"
command -v nmap &> /dev/null && pass "nmap installed" || warn "nmap not installed (for LAN discovery)"

# Check GPU
echo ""
echo "--- GPU ---"
if command -v nvidia-smi &> /dev/null; then
    pass "NVIDIA GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)"
elif lspci 2>/dev/null | grep -qi "VGA.*AMD"; then
    pass "AMD GPU detected"
elif lspci 2>/dev/null | grep -qi "VGA.*Intel"; then
    pass "Intel GPU detected"
else
    warn "No dedicated GPU detected"
fi

# Summary
echo ""
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "\033[0;32mLinux environment validated\033[0m"
    exit 0
else
    echo -e "\033[0;31mValidation failed: $ERRORS errors\033[0m"
    exit 1
fi
