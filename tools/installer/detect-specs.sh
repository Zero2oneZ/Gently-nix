#!/bin/bash
# Hardware Spec Detector - The Demon's Eye
# Generates machine specifications for GPU optimization

set -e

SPEC_FILE="${1:-specs/machine.json}"
mkdir -p "$(dirname "$SPEC_FILE")"

echo "========================================"
echo "  GentlyOS Hardware Detector"
echo "  The Demon Reads Your Machine"
echo "========================================"
echo ""

# Initialize JSON
cat > "$SPEC_FILE" << 'HEADER'
{
  "generated": "TIMESTAMP",
  "platform": {
HEADER

# Replace timestamp
sed -i "s/TIMESTAMP/$(date -Iseconds)/" "$SPEC_FILE" 2>/dev/null || \
sed -i '' "s/TIMESTAMP/$(date -Iseconds)/" "$SPEC_FILE"

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [[ -f /etc/os-release ]]; then
            . /etc/os-release
            if [[ "$ID" == "steamos" ]] || [[ -d /home/deck ]]; then
                echo "steamdeck"
            else
                echo "linux"
            fi
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if [[ $(uname -m) == "arm64" ]]; then
            echo "macos-arm"
        else
            echo "macos-intel"
        fi
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
ARCH=$(uname -m)

echo "    \"os\": \"$OS\"," >> "$SPEC_FILE"
echo "    \"arch\": \"$ARCH\"" >> "$SPEC_FILE"
echo "  }," >> "$SPEC_FILE"

# CPU
echo "Detecting CPU..."
echo "  \"cpu\": {" >> "$SPEC_FILE"

if [[ "$OS" == "linux" ]] || [[ "$OS" == "steamdeck" ]]; then
    CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)
    CPU_CORES=$(nproc)
    echo "    \"model\": \"$CPU_MODEL\"," >> "$SPEC_FILE"
    echo "    \"cores\": $CPU_CORES," >> "$SPEC_FILE"
    echo "    \"threads\": $(grep -c processor /proc/cpuinfo)" >> "$SPEC_FILE"
elif [[ "$OS" == "macos-arm" ]] || [[ "$OS" == "macos-intel" ]]; then
    CPU_MODEL=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    CPU_CORES=$(sysctl -n hw.ncpu)
    echo "    \"model\": \"$CPU_MODEL\"," >> "$SPEC_FILE"
    echo "    \"cores\": $CPU_CORES" >> "$SPEC_FILE"
fi
echo "  }," >> "$SPEC_FILE"

# Memory
echo "Detecting Memory..."
echo "  \"memory\": {" >> "$SPEC_FILE"

if [[ "$OS" == "linux" ]] || [[ "$OS" == "steamdeck" ]]; then
    MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_MB=$((MEM_KB / 1024))
    echo "    \"total_mb\": $MEM_MB," >> "$SPEC_FILE"
    echo "    \"total_gb\": $((MEM_MB / 1024))" >> "$SPEC_FILE"
elif [[ "$OS" == "macos-arm" ]] || [[ "$OS" == "macos-intel" ]]; then
    MEM_BYTES=$(sysctl -n hw.memsize)
    MEM_MB=$((MEM_BYTES / 1024 / 1024))
    echo "    \"total_mb\": $MEM_MB," >> "$SPEC_FILE"
    echo "    \"total_gb\": $((MEM_MB / 1024))" >> "$SPEC_FILE"
fi
echo "  }," >> "$SPEC_FILE"

# GPU
echo "Detecting GPU..."
echo "  \"gpu\": {" >> "$SPEC_FILE"

GPU_DETECTED="false"
GPU_CUDA="false"
GPU_VRAM=0

if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
    GPU_DETECTED="true"
    GPU_CUDA="true"
    echo "    \"detected\": true," >> "$SPEC_FILE"
    echo "    \"name\": \"$GPU_NAME\"," >> "$SPEC_FILE"
    echo "    \"vram_mb\": $GPU_VRAM," >> "$SPEC_FILE"
    echo "    \"cuda\": true," >> "$SPEC_FILE"
    echo "    \"type\": \"nvidia\"" >> "$SPEC_FILE"
elif [[ "$OS" == "steamdeck" ]]; then
    echo "    \"detected\": true," >> "$SPEC_FILE"
    echo "    \"name\": \"AMD Custom GPU (Steam Deck)\"," >> "$SPEC_FILE"
    echo "    \"vram_mb\": 1024," >> "$SPEC_FILE"
    echo "    \"cuda\": false," >> "$SPEC_FILE"
    echo "    \"type\": \"amd-apu\"" >> "$SPEC_FILE"
elif [[ "$OS" == "macos-arm" ]]; then
    echo "    \"detected\": true," >> "$SPEC_FILE"
    echo "    \"name\": \"Apple Silicon GPU\"," >> "$SPEC_FILE"
    echo "    \"vram_mb\": \"shared\"," >> "$SPEC_FILE"
    echo "    \"cuda\": false," >> "$SPEC_FILE"
    echo "    \"type\": \"apple-metal\"" >> "$SPEC_FILE"
else
    echo "    \"detected\": false," >> "$SPEC_FILE"
    echo "    \"type\": \"unknown\"" >> "$SPEC_FILE"
fi
echo "  }," >> "$SPEC_FILE"

# Recommended settings
echo "Generating recommendations..."
echo "  \"recommendations\": {" >> "$SPEC_FILE"

# Batch size based on VRAM
if [[ $GPU_VRAM -ge 8000 ]]; then
    BATCH_SIZE=32
elif [[ $GPU_VRAM -ge 4000 ]]; then
    BATCH_SIZE=16
elif [[ $GPU_VRAM -ge 2000 ]]; then
    BATCH_SIZE=8
else
    BATCH_SIZE=4
fi

# Thread count based on CPU cores
if [[ -n "$CPU_CORES" ]]; then
    THREADS=$((CPU_CORES - 1))
    [[ $THREADS -lt 1 ]] && THREADS=1
else
    THREADS=2
fi

echo "    \"batch_size\": $BATCH_SIZE," >> "$SPEC_FILE"
echo "    \"thread_count\": $THREADS," >> "$SPEC_FILE"
echo "    \"use_cuda\": $GPU_CUDA," >> "$SPEC_FILE"

# Features based on hardware
if [[ "$GPU_CUDA" == "true" ]]; then
    echo "    \"features\": [\"cuda\", \"candle\", \"fastembed\"]" >> "$SPEC_FILE"
elif [[ "$OS" == "macos-arm" ]]; then
    echo "    \"features\": [\"metal\", \"candle\", \"fastembed\"]" >> "$SPEC_FILE"
else
    echo "    \"features\": [\"fastembed\"]" >> "$SPEC_FILE"
fi

echo "  }" >> "$SPEC_FILE"
echo "}" >> "$SPEC_FILE"

echo ""
echo "========================================"
echo "Specs written to: $SPEC_FILE"
echo ""
cat "$SPEC_FILE"
