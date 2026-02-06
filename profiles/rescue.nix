# Rescue profile - recovery and repair tools
{ config, pkgs, lib, ... }:

{
  system.stateVersion = "24.11";

  # No GUI - console only
  services.xserver.enable = false;

  # Rescue tools
  environment.systemPackages = with pkgs; [
    # Editors
    vim
    nano

    # Disk recovery
    testdisk
    photorec
    ddrescue
    safecopy

    # Filesystem tools
    e2fsprogs
    btrfs-progs
    xfsprogs
    dosfstools
    ntfs3g
    exfat

    # Partition tools
    parted
    gptfdisk
    fdisk

    # Encryption
    cryptsetup
    gnupg

    # Network
    wget
    curl
    openssh
    rsync

    # System info
    pciutils
    usbutils
    lshw
    smartmontools
    hdparm

    # Boot repair
    grub2
    efibootmgr
    efivar

    # Compression
    gzip
    bzip2
    xz
    zstd
    p7zip
    unzip

    # Utilities
    htop
    tmux
    screen
    mc
    tree
  ];

  # Auto-login to root for rescue
  services.getty.autologinUser = "root";

  # Verbose boot
  boot.plymouth.enable = false;
  boot.kernelParams = [ "systemd.show_status=true" "loglevel=5" ];

  # Enable SSH
  services.openssh = {
    enable = true;
    settings.PermitRootLogin = "yes";
  };

  # Rescue message
  environment.etc."motd".text = ''

    ============================================
      GENTLY-NIX RESCUE MODE
    ============================================

    Available commands:
      gently-detect     - Detect hardware
      gently-partition  - Partition disks
      testdisk          - Recover partitions
      photorec          - Recover files
      ddrescue          - Clone damaged disks

    Filesystems:
      mount, umount, fsck, mkfs.*

    Boot repair:
      grub-install, efibootmgr

    ============================================

  '';
}
