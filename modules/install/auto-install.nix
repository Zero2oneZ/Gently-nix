# Automated installation module
{ config, pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # Main installation script
    (writeShellScriptBin "gently-install" ''
      #!/usr/bin/env bash
      set -euo pipefail

      echo ""
      echo "============================================"
      echo "  GENTLY-NIX INSTALLER"
      echo "============================================"
      echo ""

      # Check root
      if [[ $EUID -ne 0 ]]; then
        echo "ERROR: Must run as root (use sudo)"
        exit 1
      fi

      # Detect available disks
      echo "[1/6] Detecting disks..."
      echo ""
      lsblk -d -o NAME,SIZE,MODEL,TRAN | grep -v loop
      echo ""

      # Select target disk
      read -p "Enter target disk (e.g., sda, nvme0n1): " TARGET_DISK
      TARGET="/dev/$TARGET_DISK"

      if [[ ! -b "$TARGET" ]]; then
        echo "ERROR: $TARGET is not a valid block device"
        exit 1
      fi

      echo ""
      echo "WARNING: All data on $TARGET will be DESTROYED!"
      read -p "Type 'yes' to continue: " CONFIRM
      [[ "$CONFIRM" == "yes" ]] || exit 1

      # Select partition scheme
      echo ""
      echo "[2/6] Select partition scheme:"
      echo "  1) UEFI Standard (ESP + root)"
      echo "  2) UEFI with Swap"
      echo "  3) UEFI Encrypted (LUKS)"
      echo "  4) UEFI Btrfs (with subvolumes)"
      echo "  5) BIOS Legacy"
      read -p "Choice [1-5]: " SCHEME_CHOICE

      case $SCHEME_CHOICE in
        1) SCHEME="uefi-standard" ;;
        2) SCHEME="uefi-swap" ;;
        3) SCHEME="uefi-encrypted" ;;
        4) SCHEME="uefi-btrfs" ;;
        5) SCHEME="bios-standard" ;;
        *) echo "Invalid choice"; exit 1 ;;
      esac

      # Partition
      echo ""
      echo "[3/6] Partitioning $TARGET with scheme: $SCHEME"
      gently-partition "$TARGET_DISK" "$SCHEME"

      # Mount
      echo ""
      echo "[4/6] Mounting filesystems..."
      gently-mount "$TARGET_DISK" "$SCHEME"

      # Generate config
      echo ""
      echo "[5/6] Generating NixOS configuration..."
      nixos-generate-config --root /mnt

      # Copy Gently configuration
      cp -r /etc/gently /mnt/etc/

      # Install
      echo ""
      echo "[6/6] Installing NixOS..."
      nixos-install --no-root-passwd

      echo ""
      echo "============================================"
      echo "  INSTALLATION COMPLETE"
      echo "============================================"
      echo ""
      echo "Remove USB and reboot to start GentlyOS"
      echo ""
    '')

    # Mount helper
    (writeShellScriptBin "gently-mount" ''
      #!/usr/bin/env bash
      set -euo pipefail

      DISK="''${1:-}"
      SCHEME="''${2:-uefi-standard}"

      if [[ -z "$DISK" ]]; then
        echo "Usage: gently-mount <disk> [scheme]"
        exit 1
      fi

      case $SCHEME in
        uefi-standard|uefi-swap)
          mount /dev/''${DISK}2 /mnt
          mkdir -p /mnt/boot
          mount /dev/''${DISK}1 /mnt/boot
          ;;
        uefi-encrypted)
          cryptsetup luksOpen /dev/''${DISK}2 cryptroot
          mount /dev/mapper/cryptroot /mnt
          mkdir -p /mnt/boot
          mount /dev/''${DISK}1 /mnt/boot
          ;;
        uefi-btrfs)
          mount -o subvol=@ /dev/''${DISK}2 /mnt
          mkdir -p /mnt/{boot,home,nix,.snapshots}
          mount /dev/''${DISK}1 /mnt/boot
          mount -o subvol=@home /dev/''${DISK}2 /mnt/home
          mount -o subvol=@nix /dev/''${DISK}2 /mnt/nix
          mount -o subvol=@snapshots /dev/''${DISK}2 /mnt/.snapshots
          ;;
        bios-standard)
          mount /dev/''${DISK}2 /mnt
          mkdir -p /mnt/boot
          mount /dev/''${DISK}1 /mnt/boot
          ;;
      esac

      echo "Filesystems mounted at /mnt"
    '')
  ];
}
