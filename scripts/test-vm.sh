#!/usr/bin/env bash
# Test Gently-nix ISO in QEMU VM
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

ISO_PATH="${1:-}"
MEMORY="${2:-4096}"
CORES="${3:-2}"

echo ""
echo "============================================"
echo "  GENTLY-NIX VM TESTER"
echo "============================================"
echo ""

# Find ISO if not specified
if [[ -z "$ISO_PATH" ]]; then
  ISO_PATH=$(find "$PROJECT_DIR/result/iso" -name "*.iso" 2>/dev/null | head -1 || echo "")
  if [[ -z "$ISO_PATH" ]]; then
    echo "ERROR: No ISO found. Run ./scripts/build-iso.sh first"
    exit 1
  fi
fi

echo "ISO:    $ISO_PATH"
echo "Memory: ${MEMORY}MB"
echo "Cores:  $CORES"
echo ""

# Create temp disk for testing installation
TEMP_DISK="/tmp/gently-test-disk.qcow2"
if [[ ! -f "$TEMP_DISK" ]]; then
  echo "Creating test disk (20GB)..."
  qemu-img create -f qcow2 "$TEMP_DISK" 20G
fi

# Find OVMF for UEFI boot
OVMF_CODE=""
OVMF_VARS=""

for path in \
  "/usr/share/OVMF/OVMF_CODE.fd" \
  "/usr/share/edk2-ovmf/OVMF_CODE.fd" \
  "/run/current-system/sw/share/OVMF/OVMF_CODE.fd" \
  "/nix/store/*/OVMF_CODE.fd"
do
  if [[ -f "$path" ]]; then
    OVMF_CODE="$path"
    OVMF_VARS="${path/CODE/VARS}"
    break
  fi
done

echo "Starting QEMU..."
echo "(Press Ctrl+A then X to exit)"
echo ""

if [[ -n "$OVMF_CODE" && -f "$OVMF_CODE" ]]; then
  # UEFI boot
  echo "Boot mode: UEFI"
  qemu-system-x86_64 \
    -enable-kvm \
    -m "$MEMORY" \
    -smp "$CORES" \
    -drive if=pflash,format=raw,readonly=on,file="$OVMF_CODE" \
    -cdrom "$ISO_PATH" \
    -drive file="$TEMP_DISK",format=qcow2 \
    -boot d \
    -net nic \
    -net user \
    -serial stdio
else
  # BIOS boot
  echo "Boot mode: BIOS (OVMF not found)"
  qemu-system-x86_64 \
    -enable-kvm \
    -m "$MEMORY" \
    -smp "$CORES" \
    -cdrom "$ISO_PATH" \
    -drive file="$TEMP_DISK",format=qcow2 \
    -boot d \
    -net nic \
    -net user \
    -serial stdio
fi
