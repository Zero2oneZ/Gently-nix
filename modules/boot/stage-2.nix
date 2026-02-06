# Stage 2 boot - systemd targets and service ordering
{ config, pkgs, lib, ... }:

{
  # ============================================
  # SYSTEMD TARGET ORDERING
  # ============================================

  # Boot sequence:
  # 1. sysinit.target     - System initialization
  # 2. basic.target       - Basic system services
  # 3. network.target     - Network is up
  # 4. gently-pre.target  - Pre-installation checks
  # 5. gently-init.target - Gently initialization
  # 6. multi-user.target  - Full system ready

  systemd.targets = {
    gently-pre = {
      description = "Gently Pre-Installation Target";
      after = [ "basic.target" ];
      before = [ "gently-init.target" ];
    };

    gently-init = {
      description = "Gently Initialization Target";
      after = [ "gently-pre.target" "network.target" ];
      before = [ "multi-user.target" ];
      wantedBy = [ "multi-user.target" ];
    };

    gently-install = {
      description = "Gently Installation Target";
      after = [ "gently-init.target" ];
      conflicts = [ "rescue.target" ];
    };
  };

  # ============================================
  # ORDERED SERVICES
  # ============================================

  systemd.services = {
    # Order 10: System check
    gently-system-check = {
      description = "Gently System Check";
      wantedBy = [ "gently-pre.target" ];
      after = [ "basic.target" ];
      before = [ "gently-pre.target" ];
      unitConfig = {
        ConditionPathExists = "!/var/lib/gently/skip-check";
      };
      serviceConfig = {
        Type = "oneshot";
        ExecStart = pkgs.writeShellScript "gently-system-check" ''
          echo "[GENTLY-10] Running system checks..."
          # Check available memory
          MEM=$(free -m | awk '/^Mem:/{print $2}')
          echo "  Memory: ''${MEM}MB"
          # Check storage
          DISKS=$(lsblk -d -n -o NAME,SIZE | grep -v loop)
          echo "  Disks: $DISKS"
          mkdir -p /var/lib/gently
          echo "check-complete" > /var/lib/gently/system-check
        '';
        RemainAfterExit = true;
      };
    };

    # Order 20: Load configuration
    gently-load-config = {
      description = "Gently Load Configuration";
      wantedBy = [ "gently-init.target" ];
      after = [ "gently-system-check.service" "network-online.target" ];
      before = [ "gently-init.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = pkgs.writeShellScript "gently-load-config" ''
          echo "[GENTLY-20] Loading configuration..."
          if [[ -f /etc/gently/boot-order.conf ]]; then
            source /etc/gently/boot-order.conf
            echo "  Verbose: $VERBOSE_BOOT"
            echo "  Hardware detect: $HARDWARE_DETECT"
          fi
        '';
        RemainAfterExit = true;
      };
    };

    # Order 30: Ready for installation
    gently-ready = {
      description = "Gently System Ready";
      wantedBy = [ "multi-user.target" ];
      after = [ "gently-init.target" ];
      serviceConfig = {
        Type = "oneshot";
        ExecStart = pkgs.writeShellScript "gently-ready" ''
          echo "[GENTLY-30] System ready for installation"
          echo ""
          echo "============================================"
          echo "  GENTLY-NIX LIVE ENVIRONMENT"
          echo "============================================"
          echo ""
          echo "  Commands:"
          echo "    gently-install    - Start installation"
          echo "    gently-partition  - Partition disks"
          echo "    gently-detect     - Detect hardware"
          echo ""
          echo "============================================"
        '';
        RemainAfterExit = true;
      };
    };
  };
}
