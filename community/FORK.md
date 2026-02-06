# How to Fork GentlyOS

This guide explains how to properly fork GentlyOS, add your own extensions, and stay synced with upstream updates.

## Prerequisites

- Genesis NFT (Basic tier minimum for fork registration)
- Git installed
- Solana wallet with SOL for on-chain registration

## Step 1: Fork the Repository

```bash
# Clone the upstream repo
git clone https://github.com/gentlyos/gently-nix
cd gently-nix

# Add upstream remote for future syncs
git remote add upstream https://github.com/gentlyos/gently-nix

# Create your own GitHub repo and push
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_FORK_NAME
git push -u origin main
```

## Step 2: Create Your Extensions

All custom code goes in `extensions/` directory. Never modify `core/`.

```bash
mkdir -p extensions/my-feature
cd extensions/my-feature

# Initialize your extension
cat > package.json << 'EOF'
{
  "name": "@gentlyos/my-feature",
  "version": "1.0.0",
  "description": "My custom GentlyOS extension",
  "main": "index.js",
  "gentlyos": {
    "tier": 6,
    "requires": ["basic"]
  }
}
EOF
```

## Step 3: Register Your Fork On-Chain

```bash
# Using the gently CLI
gently fork register \
  --name "My Feature" \
  --repo "github.com/YOUR_USERNAME/YOUR_FORK_NAME" \
  --wallet /path/to/wallet.json

# This creates an on-chain record of your fork
# Users can verify your fork is registered and synced
```

## Step 4: Stay Synced with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your main
git checkout main
git merge upstream/main

# Core updates merge cleanly (they're in core/)
# Your extensions in extensions/ are untouched

# Push to your fork
git push origin main

# Record sync on-chain
gently fork sync --commit $(git rev-parse HEAD)
```

## Directory Structure

```
your-fork/
  core/                 # DO NOT MODIFY - pull from upstream
  extensions/
    my-feature/         # Your custom code goes here
      index.js
      package.json
      lib/
      test/
  FORK.md
  UPSTREAM.md
```

## Rules

1. **Never modify `core/`** - These are protected upstream files
2. **All custom code in `extensions/`** - This ensures clean merges
3. **Register on-chain** - So users can verify your fork
4. **Sync regularly** - Pull upstream updates to get security fixes
5. **Respect the license** - Commercial use requires license agreement

## Verification

Users can verify your fork:

```bash
gently fork verify github.com/YOUR_USERNAME/YOUR_FORK_NAME

# Shows:
# - Registration status
# - Last sync commit
# - Tier of fork owner
# - Whether it's behind upstream
```

## Publishing Extensions

If your extension is useful to others:

1. Create a PR to `community/registry.json` in upstream
2. Include: name, description, repo URL, tier requirement
3. Once merged, your extension appears in the GentlyOS marketplace
