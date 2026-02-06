#!/bin/bash
# Environment Validator - The First Gate
# Checks if this machine can run GentlyOS

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "========================================"
echo "  GentlyOS Environment Validator"
echo "  The Demon Speaks to Your Machine"
echo "========================================"
echo ""

ERRORS=0

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            if [[ "$ID" == "steamos" ]] || [[ -d /home/deck ]]; then
                echo "steamdeck"
            else
                echo "linux"
            fi
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo "Detected OS: $OS"
echo ""

# Check 1: Rust
echo "--- Checking Rust ---"
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version | cut -d' ' -f2)
    pass "Rust installed: $RUST_VERSION"

    # Check minimum version (1.75)
    MAJOR=$(echo $RUST_VERSION | cut -d'.' -f1)
    MINOR=$(echo $RUST_VERSION | cut -d'.' -f2)
    if [[ $MAJOR -ge 1 ]] && [[ $MINOR -ge 75 ]]; then
        pass "Rust version meets minimum (1.75+)"
    else
        warn "Rust version below 1.75, some features may not work"
    fi
else
    fail "Rust not installed"
    echo "  Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Git
echo ""
echo "--- Checking Git ---"
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    pass "Git installed: $GIT_VERSION"
else
    fail "Git not installed"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Build tools
echo ""
echo "--- Checking Build Tools ---"
if command -v gcc &> /dev/null || command -v clang &> /dev/null; then
    if command -v gcc &> /dev/null; then
        pass "GCC installed: $(gcc --version | head -1)"
    else
        pass "Clang installed: $(clang --version | head -1)"
    fi
else
    fail "No C compiler found (gcc or clang)"
    if [[ "$OS" == "steamdeck" ]]; then
        echo "  On Steam Deck, use distrobox:"
        echo "  distrobox create --name dev --image fedora:39"
        echo "  distrobox enter dev"
        echo "  sudo dnf install -y gcc gcc-c++"
    fi
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Memory
echo ""
echo "--- Checking Memory ---"
if [[ "$OS" == "linux" ]] || [[ "$OS" == "steamdeck" ]]; then
    MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_GB=$((MEM_KB / 1024 / 1024))
    if [[ $MEM_GB -ge 4 ]]; then
        pass "Memory: ${MEM_GB}GB (minimum 4GB)"
    else
        warn "Memory: ${MEM_GB}GB (4GB recommended)"
    fi
elif [[ "$OS" == "macos" ]]; then
    MEM_BYTES=$(sysctl -n hw.memsize)
    MEM_GB=$((MEM_BYTES / 1024 / 1024 / 1024))
    pass "Memory: ${MEM_GB}GB"
fi

# Check 5: Disk space
echo ""
echo "--- Checking Disk Space ---"
if [[ "$OS" == "linux" ]] || [[ "$OS" == "steamdeck" ]] || [[ "$OS" == "macos" ]]; then
    DISK_AVAIL=$(df -BG . | tail -1 | awk '{print $4}' | tr -d 'G')
    if [[ $DISK_AVAIL -ge 5 ]]; then
        pass "Disk space: ${DISK_AVAIL}GB available (minimum 5GB)"
    else
        warn "Disk space: ${DISK_AVAIL}GB (5GB recommended)"
    fi
fi

# Check 6: GPU (optional)
echo ""
echo "--- Checking GPU ---"
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    pass "NVIDIA GPU: $GPU_NAME"
elif command -v lspci &> /dev/null; then
    GPU_INFO=$(lspci | grep -i vga | head -1)
    if [[ -n "$GPU_INFO" ]]; then
        pass "GPU detected: $GPU_INFO"
    else
        warn "No dedicated GPU detected"
    fi
else
    warn "Cannot detect GPU (lspci not available)"
fi

# Summary
echo ""
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}Environment validated successfully${NC}"
    echo "Your machine is ready for GentlyOS"
    exit 0
else
    echo -e "${RED}Validation failed with $ERRORS error(s)${NC}"
    echo "Please fix the issues above before proceeding"
    exit 1
fi
