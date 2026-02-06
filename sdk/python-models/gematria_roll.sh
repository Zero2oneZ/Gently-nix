#!/bin/bash
# ============================================
# GEMATRIA ROLL - Bash Launcher
# ============================================
# Usage:
#   ./gematria_roll.sh "e pluribus unum"
#   echo "gubernare mentis" | ./gematria_roll.sh
#   ./gematria_roll.sh  (interactive prompt)
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -gt 0 ]; then
    python3 "$SCRIPT_DIR/gematria_roll.py" "$@"
elif [ ! -t 0 ]; then
    python3 "$SCRIPT_DIR/gematria_roll.py"
else
    python3 "$SCRIPT_DIR/gematria_roll.py"
fi
