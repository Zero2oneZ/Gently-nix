# Hardware detection module
{ config, pkgs, lib, ... }:

{
  # Hardware detection scripts and services
  environment.systemPackages = with pkgs; [
    # Detection tools
    pciutils
    usbutils
    lshw
    dmidecode
    inxi
    hwinfo

    # Gently hardware detection script
    (writeShellScriptBin "gently-detect" ''
      #!/usr/bin/env bash
      set -euo pipefail

      echo "============================================"
      echo "  GENTLY-NIX HARDWARE DETECTION"
      echo "============================================"
      echo ""

      # CPU
      echo "[CPU]"
      lscpu | grep -E "^(Model name|CPU\(s\)|Thread|Core)"
      echo ""

      # Memory
      echo "[MEMORY]"
      free -h | head -2
      echo ""

      # Storage
      echo "[STORAGE]"
      lsblk -d -o NAME,SIZE,MODEL,TRAN | grep -v loop
      echo ""

      # Graphics
      echo "[GRAPHICS]"
      lspci | grep -i vga
      echo ""

      # Network
      echo "[NETWORK]"
      ip link show | grep -E "^[0-9]" | awk '{print $2}' | tr -d ':'
      echo ""

      # Boot mode
      echo "[BOOT MODE]"
      if [[ -d /sys/firmware/efi ]]; then
        echo "UEFI"
      else
        echo "BIOS/Legacy"
      fi
      echo ""

      # Save to file
      REPORT="/tmp/gently-hardware-report.txt"
      {
        echo "Gently-nix Hardware Report"
        echo "Generated: $(date)"
        echo ""
        lshw -short 2>/dev/null || echo "lshw not available"
      } > "$REPORT"
      echo "Full report saved to: $REPORT"
    '')
  ];

  # Auto-detect and load appropriate drivers
  hardware = {
    enableAllFirmware = true;
    enableRedistributableFirmware = true;

    # CPU microcode
    cpu.intel.updateMicrocode = lib.mkDefault true;
    cpu.amd.updateMicrocode = lib.mkDefault true;

    # Graphics
    opengl = {
      enable = true;
      driSupport = true;
      driSupport32Bit = true;
    };
  };

  # Kernel modules for broad hardware support
  boot.initrd.availableKernelModules = [
    # Storage
    "ahci" "nvme" "sd_mod" "sr_mod"
    "usb_storage" "uas"
    "sata_nv" "sata_sil" "sata_sis"

    # USB
    "xhci_pci" "ehci_pci" "ohci_pci" "uhci_hcd"

    # Virtio (for VM testing)
    "virtio_pci" "virtio_blk" "virtio_scsi" "virtio_net"

    # Crypto
    "dm_crypt" "cryptd"
  ];

  # Firmware blobs
  hardware.firmware = with pkgs; [
    linux-firmware
    firmwareLinuxNonfree
  ];
}
