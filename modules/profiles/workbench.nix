# ==============================================================================
# WORKBENCH PROFILE - L4/Basic Tier
# ==============================================================================
# Adds: Workbench pane, Python bridge, Fork tree (depth 5), Env vault (10 keys)
# ==============================================================================

{ config, pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # Python bridge for scripting
    python3
    python3Packages.pip

    # Development tools
    ripgrep
    fd
    jq
    yq

    # SSH for Git operations
    openssh
  ];

  # Enable SSH agent for Git
  programs.ssh.startAgent = true;
}
