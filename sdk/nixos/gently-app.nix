{ config, pkgs, lib, ... }:

let
  # Claude Code CLI — fetched as binary
  claude-cli = pkgs.stdenv.mkDerivation {
    pname = "claude-cli";
    version = "latest";
    src = pkgs.fetchurl {
      url = "https://github.com/anthropics/claude-code/releases/latest/download/claude-linux-x64";
      sha256 = lib.fakeSha256; # Replace with real hash after first build
    };
    phases = [ "installPhase" ];
    installPhase = ''
      mkdir -p $out/bin
      cp $src $out/bin/claude
      chmod +x $out/bin/claude
    '';
  };

  # Gently CLI tool
  gently-cli = pkgs.writeShellScriptBin "gently" ''
    #!/usr/bin/env bash
    # Gently CLI — routes to the Node.js CLI
    exec ${pkgs.nodejs_22}/bin/node /home/gently/app/cli/gently-cli.js "$@"
  '';

in {
  environment.systemPackages = [
    claude-cli
    gently-cli
  ];

  # ═══ Create folder structure on activation ═══
  system.activationScripts.gently-dirs = ''
    mkdir -p /home/gently/{projects,app,.config/gently}
    chown -R gently:users /home/gently/projects
    chown -R gently:users /home/gently/app
    chown -R gently:users /home/gently/.config/gently
  '';

  # ═══ Install Gently app files ═══
  # In production these come from the flake's source
  # For now, the app directory is managed manually
  # and synced via git

  # ═══ .bash_profile — auto-startx on login ═══
  environment.etc."skel/.bash_profile" = {
    text = ''
      # Auto-start Gently on tty1
      if [ -z "$DISPLAY" ] && [ "$XDG_VTNR" = "1" ]; then
        exec startx /etc/gently-xinitrc
      fi
    '';
  };
}
