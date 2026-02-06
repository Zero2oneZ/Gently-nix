#!/bin/bash
# macOS Validator
# For Apple systems (Intel and ARM)

set -e

echo "========================================"
echo "  macOS Validator"
echo "  The Walled Garden"
echo "========================================"
echo ""

ERRORS=0

pass() { echo -e "\033[0;32m[PASS]\033[0m $1"; }
fail() { echo -e "\033[0;31m[FAIL]\033[0m $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }

# Check macOS version
if [[ "$OSTYPE" == "darwin"* ]]; then
    MACOS_VERSION=$(sw_vers -productVersion)
    pass "macOS version: $MACOS_VERSION"
else
    fail "Not running on macOS"
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" == "arm64" ]]; then
    pass "Apple Silicon (ARM64)"
    GPU_TYPE="apple-metal"
elif [[ "$ARCH" == "x86_64" ]]; then
    pass "Intel x86_64"
    GPU_TYPE="intel-or-discrete"
else
    warn "Unknown architecture: $ARCH"
fi

# Check Xcode command line tools
echo ""
echo "--- Build Tools ---"
if xcode-select -p &> /dev/null; then
    pass "Xcode CLI tools installed"
else
    fail "Xcode CLI tools not installed"
    echo "      xcode-select --install"
fi

# Check Rust
if command -v rustc &> /dev/null; then
    pass "Rust: $(rustc --version)"
else
    fail "Rust not installed"
    echo "      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

# Check Homebrew (recommended)
echo ""
echo "--- Package Manager ---"
if command -v brew &> /dev/null; then
    pass "Homebrew installed"
else
    warn "Homebrew not installed (recommended)"
    echo "      /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
fi

# Check memory
echo ""
echo "--- Hardware ---"
MEM_BYTES=$(sysctl -n hw.memsize)
MEM_GB=$((MEM_BYTES / 1024 / 1024 / 1024))
pass "Memory: ${MEM_GB}GB"

# Check CPU
CPU_BRAND=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
pass "CPU: $CPU_BRAND"

# Check GPU
if [[ "$ARCH" == "arm64" ]]; then
    pass "GPU: Apple Silicon (Metal)"
else
    # Try to detect discrete GPU
    if system_profiler SPDisplaysDataType 2>/dev/null | grep -q "AMD\|NVIDIA"; then
        pass "GPU: Discrete GPU detected"
    else
        pass "GPU: Intel integrated"
    fi
fi

# Summary
echo ""
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "\033[0;32mmacOS environment validated\033[0m"
    exit 0
else
    echo -e "\033[0;31mValidation failed: $ERRORS errors\033[0m"
    exit 1
fi
