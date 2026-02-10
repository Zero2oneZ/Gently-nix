# ==============================================================================
# AGENTS PROFILE - L3/Pro Tier
# ==============================================================================
# Adds: Agent swarm configuration (8 agents at Pro, 34 at Dev+)
# ==============================================================================

{ config, pkgs, lib, ... }:

let
  tier = config.environment.variables.GENTLY_TIER or "free";
  tierLevel = {
    "free" = 0; "basic" = 1; "pro" = 2; "dev" = 3; "founder" = 4;
  };
  currentLevel = tierLevel.${tier} or 0;
  agentCount = if currentLevel >= 3 then 34 else 8;
in {
  environment.systemPackages = with pkgs; [
    # Agent runtime dependencies
    tmux
    socat
  ];

  # Agent swarm systemd service
  systemd.services.gently-agents = {
    description = "GentlyOS Agent Swarm";
    wantedBy = [ "multi-user.target" ];
    after = [ "gently-app.service" ];

    serviceConfig = {
      Type = "simple";
      User = "gently";
      ExecStart = "${pkgs.bash}/bin/bash -c 'echo Agent swarm ready: ${toString agentCount} agents'";
      Restart = "on-failure";
    };

    environment = {
      GENTLY_AGENT_COUNT = toString agentCount;
    };
  };
}
