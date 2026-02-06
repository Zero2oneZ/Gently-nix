# Boot order control - defines boot sequence and dependencies
{ config, pkgs, lib, ... }:

{
  # Boot order configuration
  # Stage 1: initrd (kernel + initial ramdisk)
  # Stage 2: systemd (services and targets)

  # ============================================
  # STAGE 1 - Early Boot (initrd)
  # ============================================

  boot.initrd = {
    # Verbose output during early boot
    verbose = true;

    # Shell available on boot failure
    systemd.enable = true;

    # Kernel modules loaded in order
    kernelModules = [
      # Storage controllers (first)
      "ahci"
      "nvme"
      "sd_mod"
      "sr_mod"

      # USB (for USB boot)
      "xhci_pci"
      "ehci_pci"
      "usb_storage"
      "uas"

      # Filesystems
      "ext4"
      "vfat"
      "btrfs"

      # Crypto (for encrypted installs)
      "dm_crypt"
      "cryptd"
      "aes_x86_64"
    ];

    # Pre-mount commands (before root is mounted)
    preLVMCommands = ''
      echo "[GENTLY] Stage 1: Pre-LVM initialization"
    '';

    # Post-mount commands (after root is mounted)
    postMountCommands = ''
      echo "[GENTLY] Stage 1: Post-mount complete"
    '';
  };

  # ============================================
  # STAGE 2 - systemd Boot Targets
  # ============================================

  # Custom boot target for Gently initialization
  systemd.targets.gently-init = {
    description = "Gently-nix Initialization Target";
    after = [ "local-fs.target" "network.target" ];
    wantedBy = [ "multi-user.target" ];
  };

  # Boot order services
  systemd.services = {
    # First: Hardware detection
    gently-hardware-detect = {
      description = "Gently Hardware Detection";
      wantedBy = [ "gently-init.target" ];
      before = [ "gently-init.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${pkgs.bash}/bin/bash -c 'echo [GENTLY] Detecting hardware...; lspci -v > /tmp/hardware-pci.log; lsusb > /tmp/hardware-usb.log'";
        RemainAfterExit = true;
      };
    };

    # Second: Network setup
    gently-network-setup = {
      description = "Gently Network Setup";
      wantedBy = [ "gently-init.target" ];
      after = [ "gently-hardware-detect.service" "network.target" ];
      before = [ "gently-init.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${pkgs.bash}/bin/bash -c 'echo [GENTLY] Network ready'";
        RemainAfterExit = true;
      };
    };

    # Third: Installation prompt
    gently-installer-prompt = {
      description = "Gently Installation Prompt";
      wantedBy = [ "multi-user.target" ];
      after = [ "gently-init.target" "getty.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = "${pkgs.bash}/bin/bash -c 'echo; echo \"=== GENTLY-NIX INSTALLER ===\"; echo \"Run: gently-install\"; echo'";
        RemainAfterExit = true;
      };
    };
  };

  # ============================================
  # Boot Order Environment
  # ============================================

  environment.etc."gently/boot-order.conf".text = ''
    # Gently-nix Boot Order Configuration
    # Modify to control boot sequence

    STAGE1_MODULES="ahci,nvme,usb_storage,ext4,vfat"
    STAGE2_TARGETS="gently-hardware-detect,gently-network-setup,gently-installer-prompt"

    # Boot flags
    VERBOSE_BOOT=true
    SHELL_ON_FAIL=true
    HARDWARE_DETECT=true
  '';
}
