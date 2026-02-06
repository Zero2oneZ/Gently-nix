#!/usr/bin/env bash
# Build Gently-nix ISO image
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

PROFILE="${1:-minimal}"

echo ""
echo "============================================"
echo "  GENTLY-NIX ISO BUILDER"
echo "============================================"
echo ""
echo "Profile: $PROFILE"
echo ""

case $PROFILE in
  minimal|full|rescue)
    echo "Building iso-$PROFILE..."
    nix build ".#iso-$PROFILE" --show-trace
    ;;
  *)
    echo "Unknown profile: $PROFILE"
    echo "Available: minimal, full, rescue"
    exit 1
    ;;
esac

# Find the built ISO
ISO_PATH=$(readlink -f result/iso/*.iso 2>/dev/null || echo "")

if [[ -n "$ISO_PATH" && -f "$ISO_PATH" ]]; then
  echo ""
  echo "============================================"
  echo "  BUILD COMPLETE"
  echo "============================================"
  echo ""
  echo "ISO: $ISO_PATH"
  echo "Size: $(du -h "$ISO_PATH" | cut -f1)"
  echo ""
  echo "To flash to USB:"
  echo "  sudo ./scripts/flash-usb.sh /dev/sdX"
  echo ""
else
  echo "ISO build completed. Check ./result/ for output."
fi
