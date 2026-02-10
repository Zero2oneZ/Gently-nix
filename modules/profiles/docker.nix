# ==============================================================================
# DOCKER PROFILE - L3/Pro Tier
# ==============================================================================
# Adds: Docker runtime, container tools, registry access
# ==============================================================================

{ config, pkgs, lib, ... }:

{
  # Docker daemon
  virtualisation.docker = {
    enable = true;
    autoPrune.enable = true;
  };

  environment.systemPackages = with pkgs; [
    docker-compose
  ];

  # Add gently user to docker group
  users.users.gently.extraGroups = [ "docker" ];

  # Allow Docker registry access through firewall
  networking.firewall.allowedTCPPorts = [ 2375 ];
}
