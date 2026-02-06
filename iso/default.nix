# ISO/USB image base configuration
{ config, pkgs, lib, modulesPath, ... }:

{
  imports = [
    "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix"
    ./bootloader.nix
    ./partitions.nix
    ../modules/boot/order.nix
    ../modules/hardware/detect.nix
    ../modules/install/auto-install.nix
    ../modules/install/disk-setup.nix
  ];

  # ISO naming
  isoImage.isoName = "gently-nix-${config.system.nixos.label}-${pkgs.stdenv.hostPlatform.system}.iso";
  isoImage.volumeID = "GENTLY_NIX";

  # Make the ISO bootable on both UEFI and BIOS
  isoImage.makeEfiBootable = true;
  isoImage.makeUsbBootable = true;

  # Compression for smaller image
  isoImage.squashfsCompression = "zstd -Xcompression-level 19";

  # System identity
  networking.hostName = "gently-nix";

  # Enable SSH for remote installation
  services.openssh = {
    enable = true;
    settings.PermitRootLogin = "yes";
  };

  # Set root password for live environment (change in production)
  users.users.root.initialPassword = "gently";

  # Gently user for live session
  users.users.gently = {
    isNormalUser = true;
    extraGroups = [ "wheel" "networkmanager" "video" "audio" ];
    initialPassword = "gently";
  };

  # Essential packages for installation
  environment.systemPackages = with pkgs; [
    # Partitioning
    parted
    gptfdisk
    dosfstools
    e2fsprogs
    btrfs-progs
    cryptsetup

    # Networking
    networkmanager
    wpa_supplicant

    # Utilities
    vim
    git
    wget
    curl
    htop
    tmux

    # Hardware detection
    pciutils
    usbutils
    lshw
    dmidecode

    # Electron dependencies (for live testing)
    electron_28
    nodejs_20

    # Display server for live Gently demo
    xorg.xinit
    xorg.xauth
  ];

  # Allow running Gently in live mode
  services.xserver = {
    enable = true;
    displayManager.startx.enable = true;
  };

  # Include Gently app source for installation
  environment.etc."gently-app".source = ../app;

  # Installation configuration template
  environment.etc."gently/install-config.nix".text = ''
    # GentlyOS Installation Configuration
    # Copy to /mnt/etc/nixos/configuration.nix and customize

    { config, pkgs, lib, ... }:

    {
      imports = [
        ./hardware-configuration.nix
      ];

      system.stateVersion = "24.11";

      boot.loader.systemd-boot.enable = true;
      boot.loader.efi.canTouchEfiVariables = true;

      networking.hostName = "gently";
      networking.networkmanager.enable = true;

      # Gently session
      services.xserver.enable = true;
      # Import gently-app.nix and gently-session.nix modules

      users.users.gently = {
        isNormalUser = true;
        extraGroups = [ "wheel" "networkmanager" "video" "audio" ];
        initialPassword = "gently";  # CHANGE THIS
      };

      nix.settings.experimental-features = [ "nix-command" "flakes" ];
    }
  '';
}
