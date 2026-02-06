# Minimal profile - bare bones installer
{ config, pkgs, lib, ... }:

{
  # Minimal system
  system.stateVersion = "24.11";

  # No GUI
  services.xserver.enable = false;

  # Minimal packages
  environment.systemPackages = with pkgs; [
    vim
    git
    wget
    curl
    htop
    tmux
  ];

  # Disable unnecessary services
  services.printing.enable = false;
  services.avahi.enable = false;

  # Minimal documentation
  documentation = {
    enable = false;
    man.enable = true;
    doc.enable = false;
    info.enable = false;
    nixos.enable = false;
  };

  # Console only
  boot.plymouth.enable = false;

  # Fast boot
  systemd.services.NetworkManager-wait-online.enable = false;
}
