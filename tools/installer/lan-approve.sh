#!/bin/bash
# LAN Sibling Approval
# Approve a discovered node to join the council

set -e

SIBLING_IP="$1"
SIBLINGS_FILE="${HOME}/.gently/approved-siblings.json"

if [[ -z "$SIBLING_IP" ]]; then
    echo "Usage: $0 <ip-address>"
    echo ""
    echo "Approved siblings:"
    if [[ -f "$SIBLINGS_FILE" ]]; then
        cat "$SIBLINGS_FILE"
    else
        echo "  (none)"
    fi
    exit 1
fi

echo "========================================"
echo "  GentlyOS Sibling Approval"
echo "  Welcoming a New Member"
echo "========================================"
echo ""

# Validate IP format
if ! [[ "$SIBLING_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid IP address format"
    exit 1
fi

# Test connectivity
echo "Testing connection to $SIBLING_IP..."
if ping -c 1 -W 2 "$SIBLING_IP" &>/dev/null; then
    echo "  Connection successful"
else
    echo "  Warning: Host not responding to ping"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create siblings directory
mkdir -p "$(dirname "$SIBLINGS_FILE")"

# Add to approved list
if [[ -f "$SIBLINGS_FILE" ]]; then
    SIBLINGS=$(cat "$SIBLINGS_FILE")
else
    SIBLINGS='{"siblings":[]}'
fi

# Check if already approved
if echo "$SIBLINGS" | grep -q "\"$SIBLING_IP\""; then
    echo "Sibling $SIBLING_IP is already approved"
    exit 0
fi

# Add sibling
TIMESTAMP=$(date -Iseconds)
NEW_SIBLING="{\"ip\":\"$SIBLING_IP\",\"approved\":\"$TIMESTAMP\",\"status\":\"active\"}"

if command -v jq &> /dev/null; then
    echo "$SIBLINGS" | jq ".siblings += [$NEW_SIBLING]" > "$SIBLINGS_FILE"
else
    # Fallback without jq
    echo "{\"siblings\":[${NEW_SIBLING}]}" > "$SIBLINGS_FILE"
fi

echo ""
echo "========================================"
echo "Sibling $SIBLING_IP has been approved"
echo "They may now sync with this node"
