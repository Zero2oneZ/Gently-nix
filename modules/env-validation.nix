# Environment Validation Module
# Detects machine specs at first boot, validates on every reboot
# Part of GentlyOS sovereignty stack

{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.gently-env-validation;

  # Environment validation script
  envValidatorScript = pkgs.writeShellScriptBin "gently-env-validate" ''
    #!/usr/bin/env bash
    set -euo pipefail

    GENTLY_DIR="/var/lib/gently"
    ENV_FILE="$GENTLY_DIR/environment.json"
    FINGERPRINT_FILE="$GENTLY_DIR/fingerprint"
    LOG_FILE="/var/log/gently-env.log"

    log() {
      echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
    }

    detect_hardware() {
      local json="{"

      # Platform
      json+="\"timestamp\":\"$(date -Iseconds)\","
      json+="\"platform\":{"
      json+="\"os\":\"$(uname -s)\","
      json+="\"kernel\":\"$(uname -r)\","
      json+="\"arch\":\"$(uname -m)\""
      json+="},"

      # CPU
      json+="\"cpu\":{"
      if [[ -f /proc/cpuinfo ]]; then
        local model=$(grep "model name" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)
        local vendor=$(grep "vendor_id" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)
        local cores=$(grep -c "^processor" /proc/cpuinfo)
        local phys_cores=$(grep "cpu cores" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs || echo "$cores")
        json+="\"vendor\":\"$vendor\","
        json+="\"model\":\"$model\","
        json+="\"cores\":$phys_cores,"
        json+="\"threads\":$cores"
      else
        json+="\"vendor\":\"unknown\",\"model\":\"unknown\",\"cores\":1,\"threads\":1"
      fi
      json+="},"

      # Memory
      json+="\"memory\":{"
      if [[ -f /proc/meminfo ]]; then
        local total_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local total_gb=$((total_kb / 1024 / 1024))
        json+="\"total_kb\":$total_kb,"
        json+="\"total_gb\":$total_gb"
      else
        json+="\"total_kb\":0,\"total_gb\":0"
      fi
      json+="},"

      # GPU
      json+="\"gpu\":{"
      if command -v nvidia-smi &>/dev/null; then
        local gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "NVIDIA GPU")
        local gpu_vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 || echo "0")
        json+="\"detected\":true,"
        json+="\"vendor\":\"NVIDIA\","
        json+="\"model\":\"$gpu_name\","
        json+="\"vram_mb\":$gpu_vram,"
        json+="\"cuda\":true"
      elif [[ -d /sys/class/drm/card0 ]]; then
        local vendor_id=$(cat /sys/class/drm/card0/device/vendor 2>/dev/null || echo "0x0000")
        if [[ "$vendor_id" == "0x1002" ]]; then
          json+="\"detected\":true,\"vendor\":\"AMD\",\"model\":\"AMD GPU\",\"cuda\":false"
        elif [[ "$vendor_id" == "0x8086" ]]; then
          json+="\"detected\":true,\"vendor\":\"Intel\",\"model\":\"Intel GPU\",\"cuda\":false"
        else
          json+="\"detected\":false,\"vendor\":\"unknown\""
        fi
      else
        json+="\"detected\":false"
      fi
      json+="},"

      # Storage
      json+="\"storage\":{"
      local root_total=$(df -B1 / | tail -1 | awk '{print $2}')
      local root_avail=$(df -B1 / | tail -1 | awk '{print $4}')
      local is_ssd="false"
      if [[ -f /sys/block/sda/queue/rotational ]] && [[ $(cat /sys/block/sda/queue/rotational) == "0" ]]; then
        is_ssd="true"
      elif [[ -f /sys/block/nvme0n1/queue/rotational ]]; then
        is_ssd="true"
      fi
      json+="\"total_bytes\":$root_total,"
      json+="\"available_bytes\":$root_avail,"
      json+="\"is_ssd\":$is_ssd"
      json+="},"

      # Machine ID
      json+="\"machine_id\":\"$(cat /etc/machine-id 2>/dev/null || echo 'unknown')\""

      json+="}"
      echo "$json"
    }

    compute_fingerprint() {
      local env_json="$1"
      # Extract stable hardware identifiers for fingerprint
      local fp_data=""
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.cpu.vendor // ""')
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.cpu.model // ""')
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.cpu.cores // ""')
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.memory.total_kb // ""')
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.gpu.model // ""')
      fp_data+=$(echo "$env_json" | ${pkgs.jq}/bin/jq -r '.machine_id // ""')

      echo -n "$fp_data" | sha256sum | awk '{print $1}'
    }

    validate() {
      log "Environment validation starting..."

      mkdir -p "$GENTLY_DIR"

      # Detect current hardware
      local current_env=$(detect_hardware)
      local current_fp=$(compute_fingerprint "$current_env")

      log "Current fingerprint: $current_fp"

      # First boot - store baseline
      if [[ ! -f "$FINGERPRINT_FILE" ]]; then
        log "First boot detected - storing environment baseline"
        echo "$current_env" | ${pkgs.jq}/bin/jq '.' > "$ENV_FILE"
        echo "$current_fp" > "$FINGERPRINT_FILE"
        echo "FIRST_BOOT" > "$GENTLY_DIR/validation_status"
        log "Environment baseline stored"
        exit 0
      fi

      # Subsequent boot - validate
      local stored_fp=$(cat "$FINGERPRINT_FILE")

      if [[ "$current_fp" == "$stored_fp" ]]; then
        log "Environment validated - fingerprint matches"
        echo "VALIDATED" > "$GENTLY_DIR/validation_status"
        echo "$current_env" | ${pkgs.jq}/bin/jq '.' > "$ENV_FILE.current"
        exit 0
      else
        log "WARNING: Environment mismatch detected!"
        log "Stored fingerprint:  $stored_fp"
        log "Current fingerprint: $current_fp"
        echo "$current_env" | ${pkgs.jq}/bin/jq '.' > "$ENV_FILE.current"

        # Diff the environments
        if [[ -f "$ENV_FILE" ]]; then
          log "Environment differences:"
          ${pkgs.jq}/bin/jq -n --argfile stored "$ENV_FILE" --argfile current <(echo "$current_env") \
            '{stored: $stored, current: $current}' >> "$LOG_FILE"
        fi

        echo "MISMATCH" > "$GENTLY_DIR/validation_status"

        # In dev mode, allow continuation with warning
        if [[ "''${GENTLY_DEV_MODE:-}" == "true" ]]; then
          log "DEV MODE: Allowing boot with mismatched environment"
          # Update baseline in dev mode
          echo "$current_env" | ${pkgs.jq}/bin/jq '.' > "$ENV_FILE"
          echo "$current_fp" > "$FINGERPRINT_FILE"
          exit 0
        fi

        exit 1
      fi
    }

    case "''${1:-validate}" in
      validate)
        validate
        ;;
      detect)
        detect_hardware | ${pkgs.jq}/bin/jq '.'
        ;;
      fingerprint)
        detect_hardware | compute_fingerprint
        ;;
      status)
        cat "$GENTLY_DIR/validation_status" 2>/dev/null || echo "UNKNOWN"
        ;;
      reset)
        log "Resetting environment baseline"
        rm -f "$FINGERPRINT_FILE" "$ENV_FILE"
        validate
        ;;
      *)
        echo "Usage: gently-env-validate [validate|detect|fingerprint|status|reset]"
        exit 1
        ;;
    esac
  '';

in {
  options.services.gently-env-validation = {
    enable = mkEnableOption "GentlyOS environment validation";

    devMode = mkOption {
      type = types.bool;
      default = false;
      description = "Enable dev mode (allow boot on mismatch, update baseline)";
    };

    validateOnBoot = mkOption {
      type = types.bool;
      default = true;
      description = "Validate environment on every boot";
    };

    failOnMismatch = mkOption {
      type = types.bool;
      default = false;
      description = "Fail boot if environment mismatch detected (security mode)";
    };
  };

  config = mkIf cfg.enable {
    # Make validator script available system-wide
    environment.systemPackages = [ envValidatorScript pkgs.jq ];

    # Create persistent storage directory
    systemd.tmpfiles.rules = [
      "d /var/lib/gently 0750 root root -"
      "d /var/log 0755 root root -"
    ];

    # Boot-time validation service
    systemd.services.gently-env-validation = {
      description = "GentlyOS Environment Validation";
      wantedBy = [ "multi-user.target" ];
      before = [ "gently-session.service" "display-manager.service" ];
      after = [ "local-fs.target" "systemd-machine-id-commit.service" ];

      environment = {
        GENTLY_DEV_MODE = if cfg.devMode then "true" else "false";
      };

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = "${envValidatorScript}/bin/gently-env-validate validate";
        # Only fail boot in security mode
        SuccessExitStatus = if cfg.failOnMismatch then "0" else "0 1";
      };
    };

    # Expose validation status to Electron app via D-Bus or file
    systemd.services.gently-env-status = {
      description = "GentlyOS Environment Status Exporter";
      wantedBy = [ "multi-user.target" ];
      after = [ "gently-env-validation.service" ];

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        ExecStart = pkgs.writeShellScript "export-env-status" ''
          # Export status to a location readable by Electron app
          mkdir -p /run/gently
          cp /var/lib/gently/validation_status /run/gently/env-status 2>/dev/null || echo "UNKNOWN" > /run/gently/env-status
          cp /var/lib/gently/environment.json /run/gently/environment.json 2>/dev/null || true
          cp /var/lib/gently/fingerprint /run/gently/fingerprint 2>/dev/null || true
          chmod 644 /run/gently/*
        '';
      };
    };
  };
}
