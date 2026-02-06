# Disk setup and partitioning scripts
{ config, pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    (writeShellScriptBin "gently-disk-setup" ''
      #!/usr/bin/env bash
      set -euo pipefail

      DISK="''${1:-}"
      SCHEME="''${2:-uefi-standard}"

      if [[ -z "$DISK" ]]; then
        echo "Usage: gently-disk-setup <disk> <scheme>"
        exit 1
      fi

      DEVICE="/dev/$DISK"

      echo "Setting up $DEVICE with scheme: $SCHEME"

      # Wipe existing partition table
      wipefs -af "$DEVICE"

      case $SCHEME in
        uefi-standard)
          parted -s "$DEVICE" -- \
            mklabel gpt \
            mkpart ESP fat32 1MiB 513MiB \
            set 1 esp on \
            mkpart root ext4 513MiB 100%

          mkfs.fat -F32 -n ESP "''${DEVICE}1" || mkfs.fat -F32 -n ESP "''${DEVICE}p1"
          mkfs.ext4 -L root "''${DEVICE}2" || mkfs.ext4 -L root "''${DEVICE}p2"
          ;;

        uefi-swap)
          parted -s "$DEVICE" -- \
            mklabel gpt \
            mkpart ESP fat32 1MiB 513MiB \
            set 1 esp on \
            mkpart swap linux-swap 513MiB 8705MiB \
            mkpart root ext4 8705MiB 100%

          mkfs.fat -F32 -n ESP "''${DEVICE}1" || mkfs.fat -F32 -n ESP "''${DEVICE}p1"
          mkswap -L swap "''${DEVICE}2" || mkswap -L swap "''${DEVICE}p2"
          mkfs.ext4 -L root "''${DEVICE}3" || mkfs.ext4 -L root "''${DEVICE}p3"
          ;;

        uefi-encrypted)
          parted -s "$DEVICE" -- \
            mklabel gpt \
            mkpart ESP fat32 1MiB 513MiB \
            set 1 esp on \
            mkpart root 513MiB 100%

          mkfs.fat -F32 -n ESP "''${DEVICE}1" || mkfs.fat -F32 -n ESP "''${DEVICE}p1"

          PART2="''${DEVICE}2"
          [[ -b "''${DEVICE}p2" ]] && PART2="''${DEVICE}p2"

          echo "Setting up LUKS encryption..."
          cryptsetup luksFormat --type luks2 "$PART2"
          cryptsetup luksOpen "$PART2" cryptroot
          mkfs.ext4 -L root /dev/mapper/cryptroot
          ;;

        uefi-btrfs)
          parted -s "$DEVICE" -- \
            mklabel gpt \
            mkpart ESP fat32 1MiB 513MiB \
            set 1 esp on \
            mkpart root btrfs 513MiB 100%

          mkfs.fat -F32 -n ESP "''${DEVICE}1" || mkfs.fat -F32 -n ESP "''${DEVICE}p1"

          PART2="''${DEVICE}2"
          [[ -b "''${DEVICE}p2" ]] && PART2="''${DEVICE}p2"

          mkfs.btrfs -L root "$PART2"

          # Create subvolumes
          mount "$PART2" /mnt
          btrfs subvolume create /mnt/@
          btrfs subvolume create /mnt/@home
          btrfs subvolume create /mnt/@nix
          btrfs subvolume create /mnt/@snapshots
          umount /mnt
          ;;

        bios-standard)
          parted -s "$DEVICE" -- \
            mklabel msdos \
            mkpart primary ext4 1MiB 513MiB \
            set 1 boot on \
            mkpart primary ext4 513MiB 100%

          mkfs.ext4 -L boot "''${DEVICE}1"
          mkfs.ext4 -L root "''${DEVICE}2"
          ;;

        *)
          echo "Unknown scheme: $SCHEME"
          exit 1
          ;;
      esac

      echo "Disk setup complete"
      lsblk "$DEVICE"
    '')
  ];
}
