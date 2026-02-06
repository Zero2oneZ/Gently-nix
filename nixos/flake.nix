{
  description = "GentlyOS - Sovereign Computing Platform";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    home-manager.url = "github:nix-community/home-manager";
  };

  outputs = { self, nixpkgs, rust-overlay, home-manager, ... }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
      config.allowUnfree = true;  # For NVIDIA, Steam, Spotify
      overlays = [ rust-overlay.overlays.default ];
    };
  in {
    nixosConfigurations.gentlyos = nixpkgs.lib.nixosSystem {
      inherit system;
      modules = [
        ./hardware-configuration.nix
        ./modules/nvidia.nix
        ./modules/desktop.nix
        ./modules/gaming.nix
        ./modules/purgatory.nix
        ./modules/development.nix
        ./modules/apps-bundle.nix
        home-manager.nixosModules.home-manager
      ];
    };
  };
}
