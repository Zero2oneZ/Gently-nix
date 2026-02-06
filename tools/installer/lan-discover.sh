#!/bin/bash
# LAN Sibling Discovery
# Find other GentlyOS nodes on the local network

set -e

echo "========================================"
echo "  GentlyOS LAN Discovery"
echo "  Seeking Siblings in the Garden"
echo "========================================"
echo ""

# Get local IP range
get_network_range() {
    if command -v ip &> /dev/null; then
        ip route | grep "src" | head -1 | awk '{print $1}'
    elif command -v ifconfig &> /dev/null; then
        ifconfig | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}' | sed 's/\.[0-9]*$/.0\/24/'
    else
        echo "192.168.1.0/24"
    fi
}

RANGE=$(get_network_range)
echo "Scanning network: $RANGE"
echo ""

# Check if nmap is available
if command -v nmap &> /dev/null; then
    echo "Using nmap for discovery..."
    # Scan for hosts with port 7654 (GentlyOS default)
    nmap -sn "$RANGE" 2>/dev/null | grep "Nmap scan report" | awk '{print $5}'
elif command -v ping &> /dev/null; then
    echo "Using ping sweep (slower)..."
    # Extract base IP
    BASE=$(echo "$RANGE" | sed 's/\.[0-9]*\/.*/./')
    for i in $(seq 1 254); do
        ping -c 1 -W 1 "${BASE}${i}" &>/dev/null && echo "${BASE}${i}" &
    done
    wait
else
    echo "No discovery tools available (install nmap for best results)"
    exit 1
fi

echo ""
echo "========================================"
echo "Discovery complete."
echo ""
echo "To approve a sibling:"
echo "  ./lan-approve.sh <ip-address>"
