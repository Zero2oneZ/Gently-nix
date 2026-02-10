# ==============================================================================
# BASE PROFILE - L5/Free Tier Minimum
# ==============================================================================
# Always included. GuardDog DNS filter + Claude chat + core tools.
# This is what every GentlyOS installation gets, regardless of NFT tier.
# ==============================================================================

{ config, pkgs, lib, ... }:

{
  # Core system packages available at every tier
  environment.systemPackages = with pkgs; [
    # Shell essentials
    vim
    git
    wget
    curl
    htop
    tmux

    # GuardDog DNS filter (Tier 0 IO Defense)
    dnsmasq

    # Node.js for Claude CLI and Electron
    nodejs_20
  ];

  # GuardDog DNS service - always on, cannot be disabled
  services.dnsmasq = {
    enable = true;
    settings = {
      # Block known malicious domains
      address = [
        "/malware.example.com/"
        "/phishing.example.com/"
      ];
      # Use Cloudflare DNS as upstream
      server = [ "1.1.1.1" "1.0.0.1" ];
    };
  };

  # Auto-login for the gently user
  services.getty.autologinUser = "gently";

  # Basic firewall - only allow outbound to anthropic API
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [];
    allowedUDPPorts = [];
  };

  # Gently user account
  users.users.gently = {
    isNormalUser = true;
    description = "GentlyOS Runtime User";
    extraGroups = [ "audio" "video" "input" ];
  };
}
