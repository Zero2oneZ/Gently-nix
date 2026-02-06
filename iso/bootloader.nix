# Bootloader configuration - GRUB and systemd-boot
{ config, pkgs, lib, ... }:

{
  # Boot loader selection (GRUB for maximum compatibility)
  boot.loader = {
    # GRUB for BIOS and UEFI support
    grub = {
      enable = true;
      efiSupport = true;
      efiInstallAsRemovable = true;
      device = "nodev";  # For ISO, set during installation

      # Custom GRUB configuration
      extraConfig = ''
        set timeout=10
        set default=0
      '';

      # Boot menu entries
      extraEntries = ''
        menuentry "Gently-nix Installer" --class installer {
          configfile /boot/grub/grub.cfg
        }
        menuentry "Gently-nix Rescue Mode" --class rescue {
          linux /boot/bzImage init=/nix/store/.../init rescue
          initrd /boot/initrd
        }
        menuentry "Hardware Detection" --class hardware {
          linux /boot/bzImage init=/nix/store/.../init detect
          initrd /boot/initrd
        }
      '';
    };

    # Timeout and default
    timeout = 10;
  };

  # Kernel boot parameters
  boot.kernelParams = [
    "console=tty1"
    "loglevel=4"
    # Allow boot parameter overrides
    "boot.shell_on_fail"
  ];

  # Plymouth boot splash (optional)
  boot.plymouth = {
    enable = false;  # Disable for verbose boot
  };

  # Kernel modules to load early
  boot.initrd.kernelModules = [
    "ahci"
    "sd_mod"
    "sr_mod"
    "usb_storage"
    "uas"
  ];

  # Available kernel modules
  boot.initrd.availableKernelModules = [
    "xhci_pci"
    "ehci_pci"
    "ahci"
    "usbhid"
    "sd_mod"
    "sr_mod"
    "nvme"
    "virtio_pci"
    "virtio_blk"
  ];
}
