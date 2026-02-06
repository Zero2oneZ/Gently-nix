{ config, pkgs, ... }:

{
  home.username = "gently";
  home.homeDirectory = "/home/gently";
  home.stateVersion = "24.11";

  programs.bash = {
    enable = true;
    shellAliases = {
      g = "gently";
      gs = "gently status";
      gc = "gently clan";
      gw = "gently windows";
      gl = "gently log";
      gst = "gently stamp";
    };
    initExtra = ''
      # Gently prompt
      export PS1='\[\033[36m\]gently\[\033[0m\]:\[\033[33m\]\w\[\033[0m\]\$ '

      # Auto-start Gently on tty1
      if [ -z "$DISPLAY" ] && [ "$XDG_VTNR" = "1" ]; then
        exec startx /etc/gently-xinitrc
      fi
    '';
  };

  programs.git = {
    enable = true;
    extraConfig = {
      init.defaultBranch = "main";
      push.autoSetupRemote = true;
      pull.rebase = true;
    };
    # User sets name/email via gently setup
  };

  programs.ssh = {
    enable = true;
    extraConfig = ''
      Host github.com
        IdentityFile ~/.ssh/gently_ed25519
        AddKeysToAgent yes
    '';
  };

  home.file = {
    ".config/gently/default-gates.json".text = builtins.toJSON [
      { letter = "A"; question = ""; state = "open"; }
      { letter = "B"; question = ""; state = "open"; }
      { letter = "C"; question = ""; state = "open"; }
      { letter = "D"; question = ""; state = "open"; }
      { letter = "E"; question = ""; state = "open"; }
    ];
  };
}
