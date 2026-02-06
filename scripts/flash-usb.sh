#!/usr/bin/env bash
# Flash Gently-nix ISO to USB drive
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

TARGET="${1:-}"
ISO_PATH="${2:-}"

echo ""
echo "============================================"
echo "  GENTLY-NIX USB FLASHER"
echo "============================================"
echo ""

# Check root
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: Must run as root (use sudo)"
  exit 1
fi

# Find ISO if not specified
if [[ -z "$ISO_PATH" ]]; then
  ISO_PATH=$(find "$PROJECT_DIR/result/iso" -name "*.iso" 2>/dev/null | head -1 || echo "")
  if [[ -z "$ISO_PATH" ]]; then
    echo "ERROR: No ISO found. Run ./scripts/build-iso.sh first"
    exit 1
  fi
fi

# Check target
if [[ -z "$TARGET" ]]; then
  echo "Available drives:"
  echo ""
  lsblk -d -o NAME,SIZE,MODEL,TRAN | grep -v loop
  echo ""
  echo "Usage: sudo $0 /dev/sdX [iso-path]"
  exit 1
fi

# Validate target is a block device
if [[ ! -b "$TARGET" ]]; then
  echo "ERROR: $TARGET is not a valid block device"
  exit 1
fi

# Safety check - don't flash to system disk
SYSTEM_DISK=$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//' | sed 's/p[0-9]*$//')
if [[ "$TARGET" == "$SYSTEM_DISK" ]]; then
  echo "ERROR: Cannot flash to system disk!"
  exit 1
fi

echo "ISO:    $ISO_PATH"
echo "Target: $TARGET"
echo ""

# Get target info
lsblk "$TARGET"
echo ""

echo "WARNING: All data on $TARGET will be DESTROYED!"
read -p "Type 'yes' to continue: " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted"
  exit 1
fi

# Unmount any partitions
echo ""
echo "Unmounting partitions..."
umount "${TARGET}"* 2>/dev/null || true

# Flash
echo ""
echo "Flashing ISO to $TARGET..."
echo "This may take several minutes..."
echo ""

dd if="$ISO_PATH" of="$TARGET" bs=4M status=progress oflag=sync

# Sync
echo ""
echo "Syncing..."
sync

echo ""
echo "============================================"
echo "  FLASH COMPLETE"
echo "============================================"
echo ""
echo "You can now boot from $TARGET"
echo ""
