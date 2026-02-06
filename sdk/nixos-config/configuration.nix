{ config, pkgs, lib, ... }:

{
  # ═══ BOOT ═══
  boot.loader.systemd-boot.enable = true;
  boot.loader.efi.canTouchEfiVariables = true;

  # ═══ NETWORKING ═══
  networking = {
    hostName = "gently";
    networkmanager.enable = true;
    firewall.enable = true;
  };

  # ═══ TIMEZONE + LOCALE ═══
  time.timeZone = "America/New_York"; # Tom is Boston → Florida
  i18n.defaultLocale = "en_US.UTF-8";

  # ═══ USER ═══
  users.users.gently = {
    isNormalUser = true;
    description = "Gently OS";
    extraGroups = [ "wheel" "networkmanager" "video" "audio" "docker" ];
    shell = pkgs.bash;
  };

  # ═══ AUTO-LOGIN (no display manager, straight to session) ═══
  services.getty.autologinUser = "gently";

  # ═══ DISPLAY — Minimal Xorg (for Electron) ═══
  services.xserver = {
    enable = true;
    displayManager.startx.enable = true; # No DM, use startx
    # No desktop environment — Gently IS the DE
  };

  # ═══ SYSTEM PACKAGES ═══
  environment.systemPackages = with pkgs; [
    # Core
    git
    openssh
    curl
    wget

    # Node/Electron ecosystem
    nodejs_22
    nodePackages.npm
    # electron is pulled by the app's package.json

    # Browser (escape hatch, not primary)
    chromium

    # Dev tools available to Claude CLI
    rustup
    gcc
    gnumake
    pkg-config
    openssl

    # System utilities
    htop
    tmux
    vim
    jq
    ripgrep
    fd
    tree

    # Gently CLI (installed separately, see gently-app.nix)
  ];

  # ═══ SSH AGENT ═══
  programs.ssh.startAgent = true;

  # ═══ GIT GLOBAL CONFIG ═══
  programs.git = {
    enable = true;
    config = {
      init.defaultBranch = "main";
      core.editor = "vim";
      # User sets name/email in first-boot setup
    };
  };

  # ═══ DOCKER (for isolated builds) ═══
  virtualisation.docker.enable = true;

  # ═══ SOUND (for future audio features) ═══
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    pulse.enable = true;
  };

  # ═══ FONTS ═══
  fonts.packages = with pkgs; [
    (nerdfonts.override { fonts = [ "JetBrainsMono" "FiraCode" ]; })
    inter
    liberation_ttf
    noto-fonts
    noto-fonts-emoji
  ];

  # ═══ FIRST-BOOT SSH KEY GENERATION ═══
  systemd.user.services.gently-ssh-keygen = {
    description = "Generate SSH key for Gently on first boot";
    wantedBy = [ "default.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = pkgs.writeShellScript "gently-ssh-keygen" ''
        KEY="$HOME/.ssh/gently_ed25519"
        if [ ! -f "$KEY" ]; then
          mkdir -p "$HOME/.ssh"
          chmod 700 "$HOME/.ssh"
          ${pkgs.openssh}/bin/ssh-keygen -t ed25519 -f "$KEY" -N "" -C "gently@$(hostname)"
          # Add to SSH config
          cat >> "$HOME/.ssh/config" <<EOF
        Host github.com
          IdentityFile ~/.ssh/gently_ed25519
          AddKeysToAgent yes
        EOF
          chmod 600 "$HOME/.ssh/config"
          echo "SSH key generated: $KEY.pub"
        fi
      '';
    };
  };

  # ═══ AUTO-START GENTLY ON LOGIN ═══
  # .bash_profile launches startx which launches Gently
  environment.etc."gently-xinitrc" = {
    text = ''
      #!/bin/sh
      # Disable screen blanking
      xset s off
      xset -dpms
      # Launch Gently as the entire session
      exec /home/gently/app/start-gently.sh
    '';
    mode = "0755";
  };

  # ═══ NONFREE (NVIDIA) ═══
  nixpkgs.config.allowUnfree = true;

  system.stateVersion = "24.11";
}
