# Agentic Infrastructure

Local development cache and build system for GentlyOS agents.

## Directory Structure

```
.agentic/
  cache/          # Cached DB, build artifacts, agent state
  plans/          # Agent execution plans (JSONL)
  prompts/        # Prompt templates for agents
  schemas/        # Build schemas and data structures
  trees/          # File/folder tree snapshots
```

## Quick Start

```bash
# Build all agents
./build.sh

# Run agent with plan
./run-agent.sh <plan-name>

# Cache current state
./cache-state.sh
```

## Files

| File | Purpose |
|------|---------|
| `agents.jsonl` | Agent registry and configurations |
| `builds.jsonl` | Build history and artifacts |
| `plans/*.jsonl` | Execution plans per agent |
| `prompts/*.txt` | Reusable prompt templates |
| `schemas/*.json` | Data structure definitions |
| `trees/*.tree` | Directory snapshots |
