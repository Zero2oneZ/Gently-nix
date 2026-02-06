# GentlyOS - NixOS Distribution

Privacy-focused NixOS distribution with Claude integration, gaming support, and blockchain-anchored security.

## Building the ISO

### Requirements

- Nix package manager with flakes enabled
- ~20GB disk space for build
- ~4GB RAM minimum

### Install Nix (if needed)

```bash
# Single-user install
curl -L https://nixos.org/nix/install | sh

# Enable flakes
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
```

### Build Commands

```bash
# Standard ISO (graphical with Calamares installer)
nix build .#iso

# Minimal ISO (smaller, text-mode installer)
nix build .#iso-minimal

# Full ISO (all features)
nix build .#iso-full

# Or use the build script
./scripts/build-iso.sh         # standard
./scripts/build-iso.sh minimal # minimal
./scripts/build-iso.sh full    # full
```

The ISO will be in `./result/iso/`

### Flash to USB

```bash
# Find your USB device
lsblk

# Flash (replace /dev/sdX with your device)
sudo dd if=./result/iso/gentlyos-*.iso of=/dev/sdX bs=4M status=progress
sync
```

## Features

### Desktop (Sway)
- Minimal Wayland compositor
- Waybar status bar
- Wofi launcher
- Mako notifications
- PipeWire audio

### Gaming
- Steam with Proton
- Heroic Games Launcher (GOG/Epic)
- Lutris
- MangoHud overlay
- GameMode performance daemon
- Gamescope compositor

### Development
- Rust toolchain with rust-analyzer
- Node.js 20
- Helix editor
- Zellij terminal multiplexer
- Git, ripgrep, fd, jq

### Purgatory Layer
- Sandboxed web browsing
- Podman containers
- mitmproxy for traffic inspection
- Chromium headless automation

### Security
- Berlin Clock (BTC block sync)
- Watchdog daemon (event logging)
- LUKS encryption support
- Isolated network namespaces

## Directory Structure

```
Gently-nix/
  flake.nix           # Main flake configuration
  iso/
    configuration.nix  # ISO system configuration
    calamares.nix      # Installer customization
  profiles/
    default.nix        # Installed system profile
  GentlyOS/
    nixos/modules/     # Feature modules
      desktop.nix      # Sway desktop
      gaming.nix       # Steam, Heroic, etc.
      development.nix  # Dev tools
      purgatory.nix    # Sandboxed web layer
      nvidia.nix       # NVIDIA GPU support
      apps-bundle.nix  # Application bundle
  scripts/
    build-iso.sh       # Build helper
```

## Post-Install

Default credentials:
- User: `gently`
- Password: `gently` (change immediately)

```bash
# Change password
passwd

# Enable NVIDIA support (if applicable)
# Add to /etc/nixos/configuration.nix:
#   imports = [ ./nvidia.nix ];
# Then: sudo nixos-rebuild switch
```

## License

MIT
