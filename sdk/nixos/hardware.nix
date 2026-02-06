{ config, pkgs, lib, ... }:

{
  # ═══ NVIDIA RTX 3090 Ti ═══
  services.xserver.videoDrivers = [ "nvidia" ];

  hardware.nvidia = {
    modesetting.enable = true;
    powerManagement.enable = false; # Desktop, always on
    open = false; # Proprietary driver for full CUDA
    nvidiaSettings = true;
    package = config.boot.kernelPackages.nvidiaPackages.stable;
  };

  hardware.graphics = {
    enable = true;
    enable32Bit = true; # For compatibility
  };

  # ═══ CUDA (for future ML work) ═══
  environment.systemPackages = with pkgs; [
    cudaPackages.cudatoolkit
    cudaPackages.cudnn
  ];

  # Hardware-specific kernel params
  boot.kernelParams = [
    "nvidia-drm.modeset=1"
  ];

  # ═══ FILESYSTEM ═══
  # Adjust these to match Tom's actual drive layout
  # fileSystems."/" = {
  #   device = "/dev/nvme0n1p2";
  #   fsType = "ext4";
  # };
  # fileSystems."/boot" = {
  #   device = "/dev/nvme0n1p1";
  #   fsType = "vfat";
  # };
}
