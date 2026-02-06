# Pulling Upstream Updates

This guide explains how to keep your GentlyOS fork in sync with the upstream repository.

## Quick Sync

```bash
# One-liner to sync with upstream
git fetch upstream && git merge upstream/main && git push origin main
```

## Detailed Process

### 1. Check Current Status

```bash
# See how far behind you are
git fetch upstream
git log HEAD..upstream/main --oneline

# Example output:
# a1b2c3d (upstream/main) fix: GuardDog RTL detection
# d4e5f6g feat: Add new threat patterns
# h7i8j9k docs: Update architecture
```

### 2. Merge Upstream Changes

```bash
# Make sure you're on main
git checkout main

# Merge upstream
git merge upstream/main

# If there are conflicts (rare if you followed FORK.md):
# - Conflicts in core/ mean you modified protected files
# - Accept upstream version: git checkout --theirs core/path/to/file
# - Then: git add core/ && git merge --continue
```

### 3. Test the Merge

```bash
# Run tests
cd app && npm test

# Build ISO
nix build .#iso-full

# Test in VM
./scripts/test-vm.sh
```

### 4. Push and Record

```bash
# Push to your fork
git push origin main

# Record sync on-chain (for verification)
gently fork sync --commit $(git rev-parse HEAD)
```

## Handling Breaking Updates

When upstream pushes a breaking update:

1. **You'll be notified** - The update-service detects `breaking: true` on-chain
2. **Review the changelog** - Check what changed and why
3. **Test before deploying** - Don't auto-merge breaking changes
4. **Update your extensions** - Breaking changes may require extension updates

```bash
# Check if update is breaking
gently fork check-upstream

# Output:
# Upstream: v1.2.0 (breaking)
# Your version: v1.1.3
# Changelog:
#   - BREAKING: GuardDog API changed
#   - See migration guide: https://...
```

## Automatic Updates (Pro+ Tier)

If you have Pro tier or above, you can enable automatic updates:

```bash
# Enable auto-sync for non-breaking updates
gently fork auto-sync --enable

# This runs in Docker (Tier 6) and:
# - Watches for CoreUpdateEvent on-chain
# - Auto-merges non-breaking updates
# - Rebuilds containers
# - Notifies you of breaking updates
```

## Update Frequency

- **Security patches**: Sync immediately
- **Non-breaking features**: Sync weekly
- **Breaking changes**: Sync when ready, test first

## Troubleshooting

### "Your fork is behind upstream"

```bash
git fetch upstream
git merge upstream/main
git push origin main
gently fork sync
```

### "Merge conflicts in core/"

You modified protected files. Reset them:

```bash
git checkout upstream/main -- core/
git add core/
git commit -m "Reset core/ to upstream"
```

### "Extension broke after update"

Check the breaking change notes and update your extension code.
