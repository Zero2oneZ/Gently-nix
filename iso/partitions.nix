# Partition schemes for installation targets
{ config, pkgs, lib, ... }:

{
  # Partition layout definitions (used by installer scripts)
  environment.etc."gently/partition-schemes.json".text = builtins.toJSON {
    # Standard UEFI GPT layout
    uefi-standard = {
      type = "gpt";
      partitions = [
        { name = "ESP"; size = "512M"; type = "EF00"; format = "vfat"; mount = "/boot"; }
        { name = "root"; size = "100%"; type = "8300"; format = "ext4"; mount = "/"; }
      ];
    };

    # UEFI with swap
    uefi-swap = {
      type = "gpt";
      partitions = [
        { name = "ESP"; size = "512M"; type = "EF00"; format = "vfat"; mount = "/boot"; }
        { name = "swap"; size = "8G"; type = "8200"; format = "swap"; mount = "none"; }
        { name = "root"; size = "100%"; type = "8300"; format = "ext4"; mount = "/"; }
      ];
    };

    # UEFI with encrypted root (LUKS)
    uefi-encrypted = {
      type = "gpt";
      partitions = [
        { name = "ESP"; size = "512M"; type = "EF00"; format = "vfat"; mount = "/boot"; }
        { name = "root"; size = "100%"; type = "8309"; format = "luks-ext4"; mount = "/"; encrypted = true; }
      ];
    };

    # UEFI with Btrfs subvolumes
    uefi-btrfs = {
      type = "gpt";
      partitions = [
        { name = "ESP"; size = "512M"; type = "EF00"; format = "vfat"; mount = "/boot"; }
        { name = "root"; size = "100%"; type = "8300"; format = "btrfs"; mount = "/"; }
      ];
      subvolumes = [
        { name = "@"; mount = "/"; }
        { name = "@home"; mount = "/home"; }
        { name = "@nix"; mount = "/nix"; }
        { name = "@snapshots"; mount = "/.snapshots"; }
      ];
    };

    # Legacy BIOS MBR layout
    bios-standard = {
      type = "mbr";
      partitions = [
        { name = "boot"; size = "512M"; type = "83"; format = "ext4"; mount = "/boot"; bootable = true; }
        { name = "root"; size = "100%"; type = "83"; format = "ext4"; mount = "/"; }
      ];
    };
  };

  # Partitioning scripts
  environment.systemPackages = with pkgs; [
    (writeShellScriptBin "gently-partition" ''
      #!/usr/bin/env bash
      set -euo pipefail

      DEVICE="''${1:-}"
      SCHEME="''${2:-uefi-standard}"

      if [[ -z "$DEVICE" ]]; then
        echo "Usage: gently-partition <device> [scheme]"
        echo "Schemes: uefi-standard, uefi-swap, uefi-encrypted, uefi-btrfs, bios-standard"
        exit 1
      fi

      echo "Partitioning $DEVICE with scheme: $SCHEME"
      echo "WARNING: This will destroy all data on $DEVICE"
      read -p "Continue? (yes/no): " confirm
      [[ "$confirm" == "yes" ]] || exit 1

      # Load scheme and partition
      SCHEMES=/etc/gently/partition-schemes.json
      # Partitioning logic implemented in modules/install/disk-setup.nix
      gently-disk-setup "$DEVICE" "$SCHEME"
    '')
  ];
}
