# Gently Electron App - NixOS module
{ config, pkgs, lib, ... }:

let
  # Package the Gently app
  gentlyApp = pkgs.stdenv.mkDerivation rec {
    pname = "gently";
    version = "0.1.0";

    src = ../app;

    nativeBuildInputs = with pkgs; [
      nodejs_20
      makeWrapper
    ];

    buildInputs = with pkgs; [
      electron_28
    ];

    # Skip npm build, just copy files
    dontBuild = true;

    installPhase = ''
      mkdir -p $out/lib/gently
      mkdir -p $out/bin

      # Copy app files
      cp -r $src/* $out/lib/gently/

      # Create wrapper script that launches electron with our app
      makeWrapper ${pkgs.electron_28}/bin/electron $out/bin/gently \
        --add-flags "$out/lib/gently/main.js"
    '';
  };

  # Claude CLI wrapper (fetched binary)
  claudeCLI = pkgs.stdenv.mkDerivation rec {
    pname = "claude-cli";
    version = "latest";

    # Placeholder - in production, fetch the actual binary
    # src = pkgs.fetchurl {
    #   url = "https://...";
    #   sha256 = "...";
    # };

    dontUnpack = true;
    dontBuild = true;

    installPhase = ''
      mkdir -p $out/bin
      # Placeholder script until real binary is available
      cat > $out/bin/claude << 'EOF'
      #!/usr/bin/env bash
      echo "Claude CLI placeholder - configure with real binary"
      echo "Run: claude login"
      EOF
      chmod +x $out/bin/claude
    '';
  };

in
{
  # System packages
  environment.systemPackages = with pkgs; [
    gentlyApp
    claudeCLI

    # Dependencies
    git
    openssh
    nodejs_20

    # Optional: system browser as escape hatch
    chromium
  ];

  # Gently user
  users.users.gently = {
    isNormalUser = true;
    home = "/home/gently";
    extraGroups = [ "wheel" "video" "audio" "networkmanager" ];
    initialPassword = "gently";
  };

  # Auto-login to gently user
  services.getty.autologinUser = "gently";

  # X11/Wayland session for Gently
  services.xserver = {
    enable = true;

    # Minimal display manager - auto-start Gently
    displayManager = {
      lightdm = {
        enable = true;
        greeter.enable = false;  # No greeter, auto-login
      };
      autoLogin = {
        enable = true;
        user = "gently";
      };
      defaultSession = "gently";
    };

    # No desktop environment - Gently IS the session
    desktopManager.session = [
      {
        name = "gently";
        start = ''
          # Generate SSH key if missing
          if [[ ! -f ~/.ssh/gently_ed25519 ]]; then
            mkdir -p ~/.ssh
            ssh-keygen -t ed25519 -f ~/.ssh/gently_ed25519 -N ""
            chmod 600 ~/.ssh/gently_ed25519
            chmod 644 ~/.ssh/gently_ed25519.pub
          fi

          # Start SSH agent
          eval $(ssh-agent -s)
          ssh-add ~/.ssh/gently_ed25519 2>/dev/null || true

          # Launch Gently
          exec gently
        '';
      }
    ];
  };

  # SSH agent service
  programs.ssh = {
    startAgent = true;
    agentTimeout = null;  # Don't timeout
  };

  # Git configuration defaults
  programs.git = {
    enable = true;
    config = {
      init.defaultBranch = "main";
      core.editor = "vim";
    };
  };

  # Network for Claude access
  networking.networkmanager.enable = true;

  # Fonts for the app
  fonts.packages = with pkgs; [
    noto-fonts
    liberation_ttf
    jetbrains-mono
    fira-code
  ];
}
