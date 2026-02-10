# ==============================================================================
# WINE PROFILE - L2/Dev Tier
# ==============================================================================
# Adds: Wine compatibility layer for running Windows applications
# ==============================================================================

{ config, pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    wineWowPackages.stable
    winetricks
  ];

  # 32-bit support for Wine
  hardware.graphics.enable32Bit = true;
}
