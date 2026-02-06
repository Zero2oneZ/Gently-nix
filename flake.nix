{
  description = "Gently-nix - Custom NixOS bootable USB with sovereignty-first AI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager/release-24.11";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, nixpkgs-unstable, home-manager, ... }@inputs:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };
    in
    {
      # ============================================
      # ISO/USB IMAGE CONFIGURATIONS
      # ============================================
      nixosConfigurations = {
        # Minimal bootable USB installer
        gently-minimal = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./iso/default.nix
            ./profiles/minimal.nix
          ];
        };

        # Full GentlyOS USB with all features
        gently-full = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./iso/default.nix
            ./profiles/full.nix
            home-manager.nixosModules.home-manager
            {
              home-manager.useGlobalPkgs = true;
              home-manager.useUserPackages = true;
            }
          ];
        };

        # Rescue/Recovery USB
        gently-rescue = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./iso/default.nix
            ./profiles/rescue.nix
          ];
        };

        # Dev tier USB - all features, dev mode enabled
        gently-dev = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./iso/default.nix
            ./profiles/dev.nix
            home-manager.nixosModules.home-manager
            {
              home-manager.useGlobalPkgs = true;
              home-manager.useUserPackages = true;
            }
          ];
        };

        # Installed system configuration (post-install target)
        gently = nixpkgs.lib.nixosSystem {
          inherit system;
          modules = [
            ./config/configuration.nix
            home-manager.nixosModules.home-manager
            {
              home-manager.useGlobalPkgs = true;
              home-manager.useUserPackages = true;
            }
          ];
        };
      };

      # ============================================
      # ISO IMAGE PACKAGES
      # ============================================
      packages.${system} = {
        iso-minimal = self.nixosConfigurations.gently-minimal.config.system.build.isoImage;
        iso-full = self.nixosConfigurations.gently-full.config.system.build.isoImage;
        iso-rescue = self.nixosConfigurations.gently-rescue.config.system.build.isoImage;
        iso-dev = self.nixosConfigurations.gently-dev.config.system.build.isoImage;
        default = self.packages.${system}.iso-minimal;
      };

      # ============================================
      # DEVELOPMENT SHELL
      # ============================================
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          # Nix tools
          nixos-generators
          nix-prefetch-git

          # Virtualization
          qemu
          OVMF

          # Disk tools
          parted
          gptfdisk
          dosfstools
          e2fsprogs
          btrfs-progs
          cryptsetup

          # USB tools
          usbutils
          util-linux

          # Electron app development
          electron_28
          nodejs_20
        ];

        shellHook = ''
          echo ""
          echo "=========================================="
          echo "  GENTLY-NIX Development Shell"
          echo "=========================================="
          echo ""
          echo "  Build commands:"
          echo "    nix build .#iso-minimal   - Minimal installer"
          echo "    nix build .#iso-full      - Full GentlyOS"
          echo "    nix build .#iso-dev       - Dev tier (all features)"
          echo "    nix build .#iso-rescue    - Rescue mode"
          echo ""
          echo "  Scripts:"
          echo "    ./scripts/build-iso.sh    - Build ISO"
          echo "    ./scripts/flash-usb.sh    - Flash to USB"
          echo "    ./scripts/test-vm.sh      - Test in QEMU"
          echo ""
          echo "  Environment Validation:"
          echo "    gently-env-validate       - Run validation"
          echo "    gently-env-validate detect - Show hardware"
          echo "    gently-env-validate status - Show status"
          echo ""
        '';
      };
    };
}
