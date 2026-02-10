# ==============================================================================
# TIER GATE - NFT-Based Tier Selection
# ==============================================================================
# Reads the tier from /run/gently-tier (set by wallet check at boot)
# and imports the appropriate profile modules based on the user's NFT level.
#
# Tiers:
#   free   - Core OS + GuardDog + Claude chat (no NFT)
#   basic  - + Workbench pane + Python bridge + Fork tree (5 depth)
#   pro    - + Docker + Agent swarm (8) + Unlimited fork tree
#   dev    - + Limbo + Offensive tools + Wine + Full agent swarm (34)
#   founder - Everything + upstream push + contract owner
# ==============================================================================

{ config, pkgs, lib, ... }:

let
  # Read tier from runtime file (set by wallet verification at boot)
  tierFile = "/run/gently-tier";

  # Default to "free" if file doesn't exist
  tier = if builtins.pathExists tierFile
         then lib.strings.trim (builtins.readFile tierFile)
         else "free";

  # Tier hierarchy for comparison
  tierLevel = {
    "free" = 0;
    "basic" = 1;
    "pro" = 2;
    "dev" = 3;
    "founder" = 4;
    "admin" = 5;
  };

  currentLevel = tierLevel.${tier} or 0;

  # Helper to check if current tier meets requirement
  hasTier = required: currentLevel >= (tierLevel.${required} or 999);

in {
  # ===========================================================================
  # IMPORTS BASED ON TIER
  # ===========================================================================

  imports = [
    # Always included - base system with GuardDog defense
    ./profiles/base.nix
  ]
  # Basic tier and above
  ++ lib.optionals (hasTier "basic") [
    ./profiles/workbench.nix
  ]
  # Pro tier and above
  ++ lib.optionals (hasTier "pro") [
    ./profiles/docker.nix
    ./profiles/agents.nix
  ]
  # Dev tier and above
  ++ lib.optionals (hasTier "dev") [
    ./profiles/limbo.nix
    ./profiles/wine.nix
  ]
  # Founder tier and above
  ++ lib.optionals (hasTier "founder") [
    # Founder gets upstream push, contract owner, full system
  ]
  # Admin tier (Tom only - L0)
  ++ lib.optionals (hasTier "admin") [
    # Admin-only: direct NixOS config, kernel modules, raw hardware
  ];

  # ===========================================================================
  # TIER ENVIRONMENT VARIABLES
  # ===========================================================================

  environment.variables = {
    GENTLY_TIER = tier;
    GENTLY_TIER_LEVEL = toString currentLevel;
  };

  # ===========================================================================
  # TIER-SPECIFIC SYSTEMD SERVICES
  # ===========================================================================

  systemd.services.gently-tier-verify = {
    description = "Verify GentlyOS tier from wallet";
    wantedBy = [ "multi-user.target" ];
    before = [ "gently-app.service" ];

    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };

    script = ''
      # This would normally call out to verify NFT ownership
      # For now, check if tier file exists and is valid

      if [ -f "${tierFile}" ]; then
        TIER=$(cat "${tierFile}")
        echo "GentlyOS Tier: $TIER"
      else
        echo "free" > "${tierFile}"
        echo "GentlyOS Tier: free (no NFT detected)"
      fi
    '';
  };

  # ===========================================================================
  # TIER LIMITS
  # ===========================================================================

  # These are enforced at the application level, but we document them here
  #
  # Fork Tree Depth:
  #   free: 0 (no fork tree)
  #   basic: 5
  #   pro+: unlimited
  #
  # .env Vault Keys:
  #   free: 0
  #   basic: 10
  #   pro+: unlimited
  #
  # Agent Swarm Size:
  #   free: 0
  #   basic: 0
  #   pro: 8
  #   dev+: 34
  #
  # Docker Containers:
  #   free/basic: 0
  #   pro+: unlimited
  #
  # Offensive Tools:
  #   dev+ only, requires additional NFT verification

  # ===========================================================================
  # FEATURE FLAGS
  # ===========================================================================

  environment.etc."gently/features.json".text = builtins.toJSON {
    tier = tier;
    level = currentLevel;
    features = {
      guarddog = true;  # Always on
      claude_chat = true;  # Always on
      workbench = hasTier "basic";
      python_bridge = hasTier "basic";
      fork_tree = hasTier "basic";
      fork_tree_unlimited = hasTier "pro";
      env_vault = hasTier "basic";
      env_vault_unlimited = hasTier "pro";
      docker = hasTier "pro";
      agent_swarm = hasTier "pro";
      agent_swarm_full = hasTier "dev";
      limbo = hasTier "dev";
      offensive_tools = hasTier "dev";
      wine = hasTier "dev";
      contract_deploy = hasTier "dev";
      upstream_push = hasTier "founder";
      contract_owner = hasTier "founder";
      admin_nixos_config = hasTier "admin";
      admin_kernel_modules = hasTier "admin";
      admin_raw_hardware = hasTier "admin";
    };
    limits = {
      fork_tree_depth = if hasTier "pro" then -1 else if hasTier "basic" then 5 else 0;
      env_vault_keys = if hasTier "pro" then -1 else if hasTier "basic" then 10 else 0;
      agent_count = if hasTier "dev" then 34 else if hasTier "pro" then 8 else 0;
    };
  };
}
