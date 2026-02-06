# Dev profile - Full GentlyOS with development tools and dev mode enabled
# This tier unlocks all features including Limbo layer and Wine environment
{ config, pkgs, lib, ... }:

{
  imports = [
    ./full.nix
  ];

  # Override environment validation for dev mode
  services.gently-env-validation = {
    enable = true;
    devMode = true;      # Allow boot on mismatch, auto-update baseline
    validateOnBoot = true;
    failOnMismatch = false;
  };

  # Additional dev packages
  environment.systemPackages = with pkgs; [
    # Development tools
    docker
    docker-compose
    podman

    # Wine for Windows apps
    wineWowPackages.stable
    winetricks

    # Additional security tools (dev tier only)
    nmap
    wireshark
    burpsuite
    metasploit

    # Build tools
    cmake
    ninja
    meson
    pkg-config

    # Debuggers
    gdb
    lldb
    valgrind
    strace

    # Solana development
    solana-cli
    anchor

    # Database tools
    sqlite
    postgresql

    # Network tools
    netcat
    socat
    tcpdump
  ];

  # Enable Docker
  virtualisation.docker = {
    enable = true;
    autoPrune.enable = true;
  };

  # Enable Podman as alternative
  virtualisation.podman = {
    enable = true;
    dockerCompat = false;  # Don't conflict with Docker
  };

  # Add deck user to docker group
  users.users.gently.extraGroups = [ "docker" "wireshark" ];

  # Firewall - more permissive for dev
  networking.firewall = {
    enable = true;
    allowedTCPPorts = [
      22     # SSH
      80     # HTTP
      443    # HTTPS
      3000   # Dev server
      5173   # Vite
      7335   # Gently bridge
      7733   # GuardDog dashboard
      8080   # Alt HTTP
      8545   # Ethereum RPC
      8899   # Solana RPC
    ];
  };

  # Environment variables for dev tier
  environment.variables = {
    GENTLY_TIER = "dev";
    GENTLY_DEV_MODE = "true";
  };
}
