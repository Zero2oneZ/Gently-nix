# Full profile - complete GentlyOS with Gently as the session
{ config, pkgs, lib, ... }:

{
  imports = [
    ../modules/hardware/drivers.nix
    ../modules/gently-app.nix
    ../modules/session/gently-session.nix
    ../modules/tier-gate.nix
    ../modules/env-validation.nix
  ];

  # Environment validation on every boot
  services.gently-env-validation = {
    enable = true;
    devMode = false;     # Set true for development
    validateOnBoot = true;
    failOnMismatch = false;  # Set true for high-security mode
  };

  system.stateVersion = "24.11";

  # NO GNOME/KDE - Gently IS the session
  # services.xserver.desktopManager.gnome.enable = false;

  # Full package set
  environment.systemPackages = with pkgs; [
    # Editors
    vim
    neovim

    # Development
    git
    gh
    rustup
    nodejs_20
    python3

    # Utilities
    wget
    curl
    htop
    btop
    tmux
    ripgrep
    fd
    bat
    eza

    # Security
    gnupg
    pass
    age

    # Escape hatch browser
    chromium
  ];

  # Fonts
  fonts.packages = with pkgs; [
    noto-fonts
    noto-fonts-cjk
    noto-fonts-emoji
    liberation_ttf
    fira-code
    fira-code-symbols
    jetbrains-mono
  ];

  # Enable sound
  sound.enable = true;
  hardware.pulseaudio.enable = false;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };

  # Nix settings
  nix.settings = {
    experimental-features = [ "nix-command" "flakes" ];
    auto-optimise-store = true;
  };

  # NVIDIA support (RTX 3090 Ti per boot logic spec)
  hardware.nvidia = {
    modesetting.enable = true;
    powerManagement.enable = false;
    open = false;
    nvidiaSettings = true;
    package = config.boot.kernelPackages.nvidiaPackages.stable;
  };
  services.xserver.videoDrivers = [ "nvidia" ];
}
