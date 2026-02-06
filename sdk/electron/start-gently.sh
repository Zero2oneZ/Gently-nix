#!/usr/bin/env bash
# start-gently.sh — Launched by xinit as the X session
# This IS the desktop. When this exits, X exits.

set -e

GENTLY_HOME="$HOME/app"
LOG="$HOME/.config/gently/gently.log"

# Ensure log dir exists
mkdir -p "$(dirname "$LOG")"

echo "$(date): Gently starting" >> "$LOG"

# SSH agent (if not already running)
if [ -z "$SSH_AUTH_SOCK" ]; then
  eval "$(ssh-agent -s)" >> "$LOG" 2>&1
  ssh-add "$HOME/.ssh/gently_ed25519" >> "$LOG" 2>&1 || true
fi

# Set display variables
export DISPLAY="${DISPLAY:-:0}"
export NODE_ENV="${NODE_ENV:-production}"

# Disable screen saver
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true

# Set background to void
xsetroot -solid '#08080c' 2>/dev/null || true

# Launch Gently Electron app
# This is the entire session — when it exits, X exits
cd "$GENTLY_HOME"

# Install deps if needed (first boot after clone)
if [ ! -d "node_modules" ]; then
  echo "$(date): Installing dependencies..." >> "$LOG"
  npm install >> "$LOG" 2>&1
fi

echo "$(date): Launching Electron" >> "$LOG"
exec npx electron . >> "$LOG" 2>&1
