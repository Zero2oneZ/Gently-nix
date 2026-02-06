# Stage 1 boot - initrd and early userspace
{ config, pkgs, lib, ... }:

{
  # initrd configuration for maximum hardware support
  boot.initrd = {
    # Use systemd in initrd for better control
    systemd = {
      enable = true;

      # Emergency shell on failure
      emergencyAccess = true;

      # initrd services
      services = {
        gently-early-init = {
          description = "Gently Early Initialization";
          wantedBy = [ "initrd.target" ];
          before = [ "initrd-root-fs.target" ];
          unitConfig.DefaultDependencies = false;
          serviceConfig = {
            Type = "oneshot";
            ExecStart = "${pkgs.bash}/bin/bash -c 'echo [GENTLY-STAGE1] Early init started'";
            RemainAfterExit = true;
          };
        };
      };
    };

    # Compression
    compressor = "zstd";
    compressorArgs = [ "-19" "-T0" ];

    # Include extra files in initrd
    extraFiles = {
      "/etc/gently-stage1.conf".text = ''
        STAGE=1
        VERSION=0.1.0
      '';
    };

    # Secrets (encrypted) - placeholder
    secrets = {
      # "/etc/gently-key" = /path/to/key;
    };
  };

  # Kernel command line for stage 1
  boot.kernelParams = [
    # Console output
    "console=tty1"
    "console=ttyS0,115200n8"

    # Boot behavior
    "boot.shell_on_fail"
    "systemd.show_status=true"

    # Memory
    "mitigations=auto"
  ];

  # Kernel selection
  boot.kernelPackages = pkgs.linuxPackages_latest;

  # Extra kernel modules for hardware support
  boot.extraModulePackages = with config.boot.kernelPackages; [
    # Add custom kernel modules here
  ];
}
