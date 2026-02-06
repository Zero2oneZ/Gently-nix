# Gently as the primary session - no traditional DE
{ config, pkgs, lib, ... }:

{
  # Wayland/X11 configuration
  services.xserver = {
    enable = true;
    xkb.layout = "us";

    # Video drivers - auto-detect
    videoDrivers = lib.mkDefault [ "modesetting" "fbdev" ];
  };

  # Wayland support via XWayland for Electron
  programs.xwayland.enable = true;

  # Session management
  services.greetd = {
    enable = true;
    settings = {
      default_session = {
        command = "${pkgs.greetd.tuigreet}/bin/tuigreet --time --cmd gently-session";
        user = "greeter";
      };
      initial_session = {
        command = "gently-session";
        user = "gently";
      };
    };
  };

  # Gently session script
  environment.systemPackages = [
    (pkgs.writeShellScriptBin "gently-session" ''
      #!/usr/bin/env bash
      set -e

      export XDG_SESSION_TYPE=x11
      export XDG_CURRENT_DESKTOP=Gently

      # Ensure directories exist
      mkdir -p ~/.config/gently
      mkdir -p ~/projects

      # SSH key generation (first boot)
      if [[ ! -f ~/.ssh/gently_ed25519 ]]; then
        mkdir -p ~/.ssh
        chmod 700 ~/.ssh
        ssh-keygen -t ed25519 -f ~/.ssh/gently_ed25519 -N "" -C "gently@$(hostname)"
        chmod 600 ~/.ssh/gently_ed25519
        chmod 644 ~/.ssh/gently_ed25519.pub
        echo "[GENTLY] SSH key generated: ~/.ssh/gently_ed25519.pub"
      fi

      # Start SSH agent
      if [[ -z "$SSH_AUTH_SOCK" ]]; then
        eval $(ssh-agent -s)
        ssh-add ~/.ssh/gently_ed25519 2>/dev/null || true
      fi

      # Start X server if not running
      if [[ -z "$DISPLAY" ]]; then
        exec startx /usr/bin/env gently -- :0 vt1
      else
        exec gently
      fi
    '')
  ];

  # X11 init for Gently
  environment.etc."X11/xinit/xinitrc.d/50-gently.sh" = {
    mode = "0755";
    text = ''
      #!/bin/sh
      # Gently X11 session init
      xset s off
      xset -dpms
      exec gently
    '';
  };

  # Security - allow Gently to access GPU
  security.polkit.enable = true;

  # Allow video group to access GPU
  hardware.opengl = {
    enable = true;
    driSupport = true;
    driSupport32Bit = true;
  };
}
