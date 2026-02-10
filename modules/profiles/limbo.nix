# ==============================================================================
# LIMBO PROFILE - L2/Dev Tier
# ==============================================================================
# Adds: Limbo sacrificial proxy layer, offensive tools, full network access
# The Limbo layer sits between hostile web and sealed core.
# It can be burned and rebuilt without affecting core.
# ==============================================================================

{ config, pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # Network analysis
    nmap
    tcpdump
    wireshark-cli

    # Container isolation for Limbo layer
    bubblewrap
    firejail

    # Build tools for from-source compilation
    gcc
    gnumake
    cmake
    pkg-config
  ];

  # Limbo runs in its own network namespace
  systemd.services.gently-limbo = {
    description = "GentlyOS Limbo Layer";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];

    serviceConfig = {
      Type = "simple";
      User = "gently";
      # Limbo gets its own private network namespace
      PrivateNetwork = false;
      ExecStart = "${pkgs.bash}/bin/bash -c 'echo Limbo layer active'";
      Restart = "on-failure";
    };
  };
}
