# Driver modules for various hardware
{ config, pkgs, lib, ... }:

{
  # Graphics drivers
  services.xserver.videoDrivers = lib.mkDefault [ "modesetting" "fbdev" ];

  # NVIDIA support (optional, loaded if detected)
  hardware.nvidia = {
    modesetting.enable = lib.mkDefault true;
    powerManagement.enable = lib.mkDefault false;
    open = lib.mkDefault false;
  };

  # AMD GPU
  hardware.amdgpu = {
    initrd.enable = lib.mkDefault true;
  };

  # Intel GPU
  hardware.opengl.extraPackages = with pkgs; [
    intel-media-driver
    vaapiIntel
    vaapiVdpau
    libvdpau-va-gl
  ];

  # Sound
  sound.enable = true;
  hardware.pulseaudio.enable = lib.mkDefault false;
  services.pipewire = {
    enable = lib.mkDefault true;
    alsa.enable = true;
    pulse.enable = true;
  };

  # Bluetooth
  hardware.bluetooth = {
    enable = lib.mkDefault true;
    powerOnBoot = lib.mkDefault false;
  };

  # Networking drivers
  networking = {
    useDHCP = lib.mkDefault true;
    networkmanager.enable = lib.mkDefault true;
    wireless.enable = lib.mkDefault false;  # Conflicts with networkmanager
  };

  # USB and input
  services.udev.extraRules = ''
    # USB drive permissions
    SUBSYSTEM=="block", ATTRS{removable}=="1", MODE="0660", GROUP="users"
  '';

  # Power management
  services.upower.enable = lib.mkDefault true;
  services.thermald.enable = lib.mkDefault true;
}
