#!/bin/bash
# Steam Deck Validator
# Ensures the Deck is ready for GentlyOS

set -e

echo "========================================"
echo "  Steam Deck Validator"
echo "  The Portable Kingdom"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

pass() { echo -e "\033[0;32m[PASS]\033[0m $1"; }
fail() { echo -e "\033[0;31m[FAIL]\033[0m $1"; ERRORS=$((ERRORS + 1)); }
warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; WARNINGS=$((WARNINGS + 1)); }

# Check if actually Steam Deck
if [[ -d /home/deck ]] && [[ -f /etc/os-release ]]; then
    . /etc/os-release
    if [[ "$ID" == "steamos" ]] || [[ "$NAME" == *"SteamOS"* ]]; then
        pass "Running on Steam Deck (SteamOS)"
    else
        warn "Not SteamOS but /home/deck exists - assuming Steam Deck"
    fi
else
    fail "This does not appear to be a Steam Deck"
fi

# Check desktop mode
if [[ "$XDG_CURRENT_DESKTOP" != "" ]]; then
    pass "Desktop mode active: $XDG_CURRENT_DESKTOP"
else
    warn "Not in desktop mode - some features limited"
fi

# Check distrobox (recommended for compilation)
echo ""
echo "--- Distrobox (Recommended) ---"
if command -v distrobox &> /dev/null; then
    pass "Distrobox installed"

    # Check for dev container
    if distrobox list 2>/dev/null | grep -q "dev"; then
        pass "Dev container exists"
    else
        warn "No 'dev' container - create with:"
        echo "      distrobox create --name dev --image fedora:39"
    fi
else
    warn "Distrobox not installed"
    echo "      Install via Discover app or:"
    echo "      curl -s https://raw.githubusercontent.com/89luca89/distrobox/main/install | sh"
fi

# Check storage
echo ""
echo "--- Storage ---"
HOME_AVAIL=$(df -BG /home/deck 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
if [[ $HOME_AVAIL -ge 10 ]]; then
    pass "Home storage: ${HOME_AVAIL}GB available"
else
    warn "Home storage low: ${HOME_AVAIL}GB (10GB+ recommended)"
fi

# Check SD card
if [[ -d /run/media/deck ]]; then
    SD_CARDS=$(ls /run/media/deck 2>/dev/null | wc -l)
    if [[ $SD_CARDS -gt 0 ]]; then
        pass "SD card detected"
        for card in /run/media/deck/*; do
            CARD_AVAIL=$(df -BG "$card" 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
            echo "      $card: ${CARD_AVAIL}GB available"
        done
    fi
fi

# Check GPU
echo ""
echo "--- GPU (AMD APU) ---"
if lspci 2>/dev/null | grep -qi "VGA.*AMD"; then
    pass "AMD GPU detected"
else
    warn "AMD GPU not detected via lspci"
fi

# Check Vulkan
if command -v vulkaninfo &> /dev/null; then
    pass "Vulkan available"
else
    warn "vulkaninfo not found - 3D features may be limited"
fi

# Summary
echo ""
echo "========================================"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "\033[0;32mSteam Deck validated\033[0m"
    [[ $WARNINGS -gt 0 ]] && echo "($WARNINGS warnings)"
    echo ""
    echo "Recommended next steps:"
    echo "  1. Create distrobox container for building"
    echo "  2. Run installer from within distrobox"
    echo ""
    echo "  distrobox enter dev"
    echo "  ./installer/install.sh"
else
    echo -e "\033[0;31mValidation failed: $ERRORS errors\033[0m"
    exit 1
fi
