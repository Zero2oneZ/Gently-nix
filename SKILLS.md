# SKILLS.md -- Agentic Swarm Skills Manifest

> Machine-readable skills manifest for the Gently-nix repository.
> Every agent in the swarm MUST consult this file before invoking any capability.

---

## How to Use This File

1. **Locate the skill** by domain or name in the tables below.
2. **Check the tier** -- lower-tier skills are prerequisites for higher tiers. Never invoke a tier-3 skill if tier-0 foundations are not built.
3. **Read constraints** -- every skill lists hard constraints (`fence`/`bone` rules). Violating a constraint triggers the Guardian confession/penance loop.
4. **Use the invocation** exactly as documented. CLI commands go through `gently-cli`; API calls go through the IPC bridge on port 7335.
5. **Respect governance** -- skills marked `multi-governed` require two-validator approval before execution. Skills marked `bone` are immutable and require ARCHITECT approval to change.
6. **GuardDog scans all IO** -- every input and output path passes through GuardDog (Tier 0 IO defense) before reaching any skill. Do not bypass this.
7. **CODIE maps** orchestrate multi-skill workflows. Prefer invoking a CODIE map over chaining individual skills when one exists.

---

## Skill Domains

### 1. Cryptography & Identity

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `xor-split` | XOR split-knowledge secret splitting. Produces LOCK + KEY halves; neither reveals the secret alone. | `gently-core` (`crates/foundation/gently-core`) | `gently-cli xor split --input <file>` | 0 | `bone`: output halves MUST be stored on separate devices. PTC required for crypto crates. |
| `xor-combine` | Reconstruct secret from LOCK + KEY halves via XOR. | `gently-core` | `gently-cli xor combine --lock <file> --key <file>` | 0 | `bone`: both halves required; partial reconstruction impossible by design. |
| `berlin-clock` | Time-based key derivation synced to Bitcoin block hashes. Provides forward secrecy through rotation. | `gently-core` | `gently-cli berlin-clock --block <height>` | 0 | `bone`: rotation interval locked to BTC block cadence. Requires `gently-btc` for block data. |
| `dance-auth` | Visual/audio 8-round call-and-response authentication protocol using XOR reconstruction. | `gently-dance` (`crates/network/gently-dance`) | `gently-cli dance auth --rounds 8` | 5 | `fence`: requires both audio and visual channels active. Falls back to text if audio unavailable. |
| `pattern-encode` | Generate deterministic visual pattern from a SHA256 hash. | `gently-visual` (`crates/foundation/gently-visual`) | `gently-cli pattern encode --hash <hex>` | 0 | Output is SVG. Pattern is reproducible given the same hash. |
| `vault-store` | TokenVault clean-before-store. Sanitizes tokens/keys via GuardDog, then stores with BTC timestamp anchor. | `gently-core` | `gently-cli vault store --key <name> --value <token>` | 0 | `bone`: GuardDog scan mandatory before storage. Never stores raw unsanitized input. |
| `cipher-identify` | Identify cipher type from ciphertext sample (supports MD4, MD5, SHA1, BS58, and more). | `gently-cipher` (`crates/security/gently-cipher`) | `gently-cli cipher identify --input <file>` | 4 | Read-only analysis. Does not attempt decryption without explicit instruction. |
| `cipher-crack` | Password cracking and cryptanalysis against identified cipher types. | `gently-cipher` | `gently-cli cipher crack --hash <hash> --type <type>` | 4 | `fence`: requires SECURITY tier validation. Restricted to authorized targets only. |

### 2. AI & LLM Orchestration

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `agent-pipeline` | 5-element agentic pipeline: SPIRIT (validate) -> AIR (fetch) -> WATER (process) -> EARTH (execute) -> FIRE (anchor). | `gently-agents` (`crates/intelligence/gently-agents`) | `gently-cli agent run --pipeline <name>` | 3 | Each element must complete before the next starts. FIRE anchors result to BTC block. |
| `llm-route` | Multi-provider LLM routing across Claude, GPT, Deepseek, Grok, and Ollama. Selects provider by task type, cost, and latency. | `gently-brain` (`crates/intelligence/gently-brain`) | `gently-cli brain route --prompt <text> --provider <name\|auto>` | 3 | `fence`: API keys stored in TokenVault. Falls back to local Ollama if all cloud providers fail. |
| `claude-chat` | Direct Claude API integration for chat completions. | `gently-brain` | `gently-cli brain claude --prompt <text>` | 3 | Requires valid Anthropic API key in TokenVault. |
| `local-inference` | Local LLM inference via Ollama (Llama models). No network required. | `gently-brain` | `gently-cli brain local --model <name> --prompt <text>` | 3 | Runs on-device. Model must be pre-downloaded. See `scripts/download_minimax.py`. |
| `embed-generate` | ONNX embedding generation for semantic search and similarity. | `gently-brain` | `gently-cli brain embed --input <text>` | 3 | Requires ONNX runtime (`ort` crate). Model loaded dynamically. |
| `quality-mine` | Decompose, score, and cluster inference quality. Scores use weighted formula: user_accept (0.3) + outcome_success (0.4) + chain_referenced (0.2) + turning_point (0.1). | `gently-inference` (`crates/intelligence/gently-inference`) | `gently-cli inference quality --session <id>` | 3 | `bone`: minimum quality threshold is 0.7 for training inclusion. Default is EXCLUDED. |
| `boneblob-constrain` | Generate BONEBLOB constraint formulas from quality data. Defines immutable (bone) and mutable (blob) boundaries for inference. | `gently-inference` | `gently-cli inference boneblob --quality-data <file>` | 3 | `bone`: constraint formula is immutable once anchored. |
| `mcp-serve` | Model Context Protocol server for Claude Desktop integration. Exposes GentlyOS capabilities as MCP tools. | `gently-mcp` (`crates/intelligence/gently-mcp`) | `gently-cli mcp serve --port <port>` | 3 | Runs as long-lived server process. Requires Claude Desktop to connect. |
| `codie-execute` | Execute CODIE 12-keyword instruction chains. Keywords: pug, bark, spin, cali, elf, turk, fence, pin, bone, blob, biz, anchor. | `gently-codie` (`crates/foundation/gently-codie`) | `gently-cli codie exec --map <file.codie>` | 0 | `fence`: all CODIE execution passes through Guardian governance. `bone` rules cannot be overridden. |
| `ged-translate` | G.E.D. (Generative Educational Device) domain translation. Translates concepts between knowledge domains. | `gently-ged` (`crates/intelligence/gently-ged`) | `gently-cli ged translate --from <domain> --to <domain> --concept <text>` | 3 | Part of SYNTHESTASIA unified field. |
| `behavior-learn` | Adaptive UI behavioral learning. Tracks user interaction patterns and adjusts UI parameters via the GOO field k-parameter. | `gently-behavior` (`crates/intelligence/gently-behavior`) | `gently-cli behavior learn --session <id>` | 3 | Part of SYNTHESTASIA. Learning rate governed by smooth_min/softmax unification. |

### 3. Security & Defense

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `guarddog-scan` | Tier 0 IO defense: detects homoglyphs, invisible characters, RTL override attacks, and injection attempts in all input paths. | `packages/guarddog` | `npx guarddog scan --input <text\|file>` or via IPC bridge | 0 | `bone`: runs on EVERY IO path. Threat levels 0 (clean) through 7+ (critical block). Cannot be disabled. |
| `guardian-monitor` | 16-daemon concurrent security monitoring. Tracks build sessions, entity status, confessions, and governance chain. | `gently-guardian` (`crates/security/gently-guardian`) | `gently-cli guardian status` | 4 | `fence`: daemons registered in `tools/guardian/daemon_registry.jsonl`. SQLite DB at `~/.gently/guardian.db`. |
| `fafo-escalate` | FAFO Pitbull defense escalation chain: TARPIT -> POISON -> DROWN -> DESTROY -> SAMSON. Progressive response to persistent threats. | `gently-security` (`crates/security/gently-security`) | `gently-cli security fafo --threat <id> --level <1-5>` | 4 | `fence`: level 5 (SAMSON) requires 3 department heads + ARCHITECT approval. See Samson Protocol below. |
| `network-capture` | Packet capture and MITM proxy capabilities for network analysis. | `gently-network` (`crates/network/gently-network`) | `gently-cli network capture --interface <iface>` | 5 | `fence`: requires elevated permissions. Capture data stored in isolated namespace. Uses `pcap` + `pnet` crates. |
| `sploit-framework` | Exploitation framework for vulnerability detection and analysis. | `gently-sploit` (`crates/security/gently-sploit`) | `gently-cli sploit scan --target <host>` | 4 | `fence`: multi-governed. Requires SECURITY + INTELLIGENCE tier approval. Restricted to authorized engagements. |
| `sim-security` | Security simulation and threat modeling. Models attack scenarios without live execution. | `gently-sim` (`crates/security/gently-sim`) | `gently-cli sim run --scenario <file>` | 4 | Read-only simulation. No live network interaction. |
| `session-isolate` | Container and namespace isolation for untrusted workloads. Uses Podman containers in the Purgatory sandbox layer. | `gently-guardian` + `nixos/purgatory` | `gently-cli guardian isolate --workload <name>` | 4 | Isolation levels: CHAPEL (light), SANDBOX (medium), QUARANTINE (full). See `nixos/purgatory/`. |
| `tarpit-control` | Deploy honeypots and time-wasting traps against attackers. First stage of FAFO escalation. | `gently-guardian` | `gently-cli guardian tarpit --deploy <config>` | 4 | `fence`: tarpit consumes attacker resources, not ours. Must not affect legitimate traffic. |

### 4. Blockchain & Anchoring

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `btc-anchor` | Timestamp data to a Bitcoin block hash. Creates an immutable proof-of-existence anchor. | `gently-btc` (`crates/knowledge/gently-btc`) | `gently-cli btc anchor --data <hash>` | 1-2 | `bone`: anchor is permanent and irreversible once written. Uses `bitcoin` crate v0.31. |
| `btc-monitor` | Monitor Bitcoin blockchain for new blocks. Provides entropy source and block-synced timing for Berlin Clock rotation. | `gently-btc` | `gently-cli btc monitor --follow` | 1-2 | Long-running process. Block data cached in `btc-data/`. |
| `solana-contract` | Interact with Solana smart contracts (gently-rewards, gently-rotation programs). | `contracts/solana` (Anchor framework) | `anchor deploy` / `anchor test` | 1-2 | Requires Solana CLI + Anchor. Programs: `programs/gently-rewards/`, `programs/gently-rotation/`. |
| `wallet-genesis` | Genesis-locked wallet creation. Wallet key derivation anchored to a specific Bitcoin genesis block. | `gently-btc` via CLI | `gently-cli btc wallet create --genesis` | 1-2 | `bone`: genesis anchor is immutable. Wallet creation is a one-time operation per identity. |
| `token-mint` | GNTLY/GOS/GENOS token operations: mint, transfer, burn. | `gently-btc` via CLI | `gently-cli token mint --type <GNTLY\|GOS\|GENOS> --amount <n>` | 1-2 | `fence`: minting requires governance approval. Token economics defined in `gently-commerce`. |
| `mine-btc` | Bitcoin mining scripts for entropy generation and block discovery. | `mining/mine.sh`, `mining/headless-miner.js` | `bash mining/mine.sh` or `node mining/headless-miner.js` | -- | Standalone scripts. Not part of the Rust workspace. Requires mining hardware. |

### 5. Knowledge & Search

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `feed-track` | Living Feed context tracking. Aggregates and tracks data feeds across sessions with fork-tree provenance. | `gently-feed` (`crates/knowledge/gently-feed`) | `gently-cli feed track --source <url\|file>` | 1-2 | Feed entries are content-addressable (SHA256 Blob). GuardDog verifies fork source integrity. |
| `alexandria-mesh` | Distributed knowledge mesh with genesis anchoring. Knowledge graph nodes anchored to BTC blocks for tamper evidence. | `gently-alexandria` (`crates/knowledge/gently-alexandria`) | `gently-cli alexandria query --concept <text>` | 1-2 | `bone`: genesis-anchored nodes are immutable. New knowledge appends; it does not overwrite. |
| `search-semantic` | Semantic thought index powered by ONNX embeddings. Full-text + vector similarity search across the knowledge mesh. | `gently-search` (`crates/knowledge/gently-search`) | `gently-cli search --query <text> --mode semantic` | 1-2 | Requires embeddings from `embed-generate`. Index stored locally. |
| `ipfs-store` | Decentralized content storage via IPFS. Content-addressed by CID. | `gently-ipfs` (`crates/knowledge/gently-ipfs`) | `gently-cli ipfs put --file <path>` / `gently-cli ipfs get --cid <cid>` | 1-2 | Uses `ipfs-api-backend-hyper` crate. Requires IPFS daemon running. |
| `artisan-toroid` | BS-ARTISAN toroidal knowledge storage. Maps knowledge onto a toroidal surface for topological neighborhood queries. | `gently-artisan` (`crates/foundation/gently-artisan`) | `gently-cli artisan store --data <blob>` / `gently-cli artisan query --coords <theta,phi>` | 0 | `bone`: toroid topology is fixed at initialization. Coordinates wrap around both axes. |

### 6. IO & Communication

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `bridge-ipc` | IPC bridge between Electron app and Rust backend on port 7335. Bidirectional JSON-RPC over WebSocket. | `gently-bridge` (`crates/network/gently-bridge`) | Automatic (started by Electron `main.js`). API: `ws://localhost:7335` | 5 | `fence`: all messages pass through GuardDog scan. Bridge is the ONLY allowed path between Limbo and Core. |
| `gateway-api` | API gateway with authentication, rate limiting, and request routing. | `gently-gateway` (`crates/network/gently-gateway`) | `gently-cli gateway serve --port <port>` | 5 | Uses `hyper` v1.1 + `rustls` for TLS. Auth tokens validated via TokenVault. |
| `micro-service` | Microservice scaffolding for deploying isolated service units. | `gently-micro` (`crates/intelligence/gently-micro`) | `gently-cli micro create --name <service>` | 3 | Each microservice runs in its own Purgatory sandbox. |
| `audio-fft` | FFT audio decoder for audible and ultrasonic authentication signals. Part of the dance-auth protocol. | `gently-audio` (`crates/foundation/gently-audio`) | `gently-cli audio fft --input <wav\|stream>` | 0 | Uses `cpal` for capture, `rustfft` for analysis, `dasp` for DSP. |
| `svg-container` | SVG as runtime container: SVG file holds visual layer + WASM brain + metadata. Model chaining: `embed.svg -> classify.svg -> output.svg`. | `gently-visual` (`crates/foundation/gently-visual`) | `gently-cli svg run --file <container.svg>` | 0 | `bone`: SVG container format is immutable. WASM brain executes in sandboxed runtime. |

### 7. Build & Deploy

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `cargo-build` | Full Rust workspace build (34 crates). Release profile: opt-level 3, thin LTO, codegen-units 1, stripped, panic=abort. | `Cargo.toml` (workspace root) | `cargo build --release` | -- | Tier order enforced by `comprehensive-build.codie`. Lower tiers must complete first. |
| `tier-build` | Tier-aware crate builder. Builds crates in dependency-respecting tier order (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6). | `scripts/crate-builder-bsart.sh` | `bash scripts/crate-builder-bsart.sh` | -- | `fence`: will not proceed to next tier if current tier has failures. Failures trigger confession. |
| `nix-iso` | Build NixOS ISO images. Four profiles: minimal (console), full (Gently session), rescue (recovery), dev (development). | `flake.nix` | `nix build .#iso-minimal` / `nix build .#iso-full` / `nix build .#iso-rescue` / `nix build .#iso-dev` | -- | Requires Nix with flakes enabled. Target: x86_64 UEFI/BIOS. |
| `flash-usb` | Write built ISO to USB device. | `scripts/flash-usb.sh` | `sudo ./scripts/flash-usb.sh /dev/sdX` | -- | **DESTRUCTIVE**: overwrites target device. Requires root. Minimum 8GB USB. |
| `docker-build` | Container builds for GentlyOS. Standard and minimal Dockerfiles. | `docker/Dockerfile`, `docker/Dockerfile.minimal` | `docker build -f docker/Dockerfile .` | -- | `docker-compose.yml` defines service orchestration. |
| `ci-pipeline` | GitHub Actions CI/CD. CI: check, test, fmt, clippy. Release: multi-platform builds (Linux x64 + macOS x64) with SHA256SUMS. | `.github/workflows/ci.yml`, `.github/workflows/release.yml` | Triggered on push to main/develop or version tags (v*). | -- | CI runs on all PRs. Release triggered by `v*` tags only. |
| `limbo-deploy` | Sacrificial proxy deployment. Limbo layer sits between hostile web and sealed core. Can be burned and rebuilt without affecting core. | `deployment/limbo/` (14 modules) | Module-specific. See `deployment/limbo/orchestrator/`. | -- | `fence`: Limbo is disposable by design. Core must never depend on Limbo state. |

### 8. System & OS

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `nixos-module` | NixOS module system for GentlyOS configuration. Includes tier-gate access control and environment validation. | `modules/` (`gently-app.nix`, `tier-gate.nix`, `env-validation.nix`) | Declarative Nix configuration. Applied during `nixos-rebuild`. | -- | `modules/tier-gate.nix` enforces tier-based access control at the OS level. |
| `purgatory-sandbox` | Sandboxed browsing and service isolation using Podman containers. Three sandboxes: CODIE bridge, cookie laundry, gateway. | `nixos/purgatory/` (`gently-codie-bridge/`, `gently-cookie-laundry/`, `gently-gate/`) | NixOS service definitions. Auto-started on boot. | -- | `fence`: Purgatory services have no access to core filesystem. Network filtered. |
| `boot-sequence` | Boot chain control: BIOS/UEFI -> NixOS bootloader -> systemd -> auto-login -> X11 -> Gently Electron session. | `modules/boot/`, `iso/bootloader.nix` | Automatic on system boot. Configurable via `iso/bootloader.nix`. | -- | `bone`: boot chain is verified. No DE installed -- Gently IS the desktop session. |
| `hardware-detect` | Hardware detection and driver loading. Targets x86_64 with NVIDIA RTX 3090 Ti support. | `modules/hardware/` | Automatic during NixOS activation. | -- | Hardware config in `config/hardware-configuration.nix`. |
| `auto-install` | Automated disk setup and GentlyOS installation. Partition schemes defined in `iso/partitions.nix`. | `modules/install/`, `iso/partitions.nix` | `gently-cli install --disk <device>` | -- | **DESTRUCTIVE**: reformats target disk. Requires explicit user consent (`bone NOT: install without user consent`). |

### 9. Visualization & UI

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `goo-field` | GOO unified signed distance field engine. The mathematical core of SYNTHESTASIA: `smooth_min(k) = softmax(1/k)`. One parameter, three effects: SDF blending, neural attention, GOO viscosity. | `gently-goo` (`crates/foundation/gently-goo`) | `gently-cli goo render --field <definition>` | 0 | `bone`: `smooth_min` identity is immutable. Uses `nalgebra` for linear algebra. |
| `gooey-flexbox` | 2D FlexBox Quad application builder. Builds UI layouts as SVG database runtimes. | `gently-gooey` (`crates/application/gently-gooey`) | `gently-cli gooey build --layout <file>` | 6 | Part of SYNTHESTASIA. SVG output doubles as data container. |
| `architect-crystal` | Idea crystallization engine. Generates flowcharts, architecture diagrams, and decision trees from natural language. | `gently-architect` (`crates/application/gently-architect`) | `gently-cli architect crystallize --idea <text>` | 6 | Output is SVG. Can feed into `goo-field` for interactive rendering. |
| `doc-engine` | Three-chain document engine: User chain (input), Claude chain (reasoning), Result chain (output). Maintains full provenance. | `gently-document` (`crates/application/gently-document`) | `gently-cli doc create --input <file>` | 6 | Part of SYNTHESTASIA. All three chains are content-addressable and anchored. |
| `electron-shell` | Gently desktop shell built on Electron 28+ with WebContentsView panes. Layout: left shelf (clans) + focus pane + process pane + right shelf (artifacts) + keyboard. | `app/` (Electron) | `cd app && npx electron .` | 6 | IPC via `preload.js`. Stamp injection into claude.ai webview via `inject/stamp-inject.js`. |
| `web-htmx` | HTMX-based web interface for GentlyOS. Server-side rendering with hypermedia controls. | `gently-web` (`crates/application/gently-web`) | `gently-cli web serve --port <port>` | 6 | Minimal client-side JavaScript. HTMX handles DOM updates. |

### 10. Commerce & Business

| Skill | Description | Backing Crate/Tool | Invocation | Tier | Constraints |
|-------|-------------|---------------------|------------|------|-------------|
| `commerce-vibe` | Vibe commerce engine with TradingView integration. Combines aesthetic product presentation with live market data. | `gently-commerce` (`crates/application/gently-commerce`) | `gently-cli commerce serve` | 6 | Part of SYNTHESTASIA. TradingView widgets embedded in GOO field rendering. |
| `token-economy` | GNTLY/GOS/GENOS token economics. Defines mint rates, burn schedules, staking rewards, and inter-token exchange rates. | `gently-commerce` + `gently-btc` | `gently-cli token economics --report` | 6 | `fence`: economic parameters are multi-governed. Changes require FOUNDATION + APPLICATION tier approval. |

---

## Orchestration (CODIE Maps)

CODIE maps are declarative instruction chains using the 12-keyword DSL. They live in `tools/codie-maps/` and orchestrate multi-skill workflows. Execute any map with `gently-cli codie exec --map <file>`.

### CODIE Keyword Reference

| Keyword | Role | Example |
|---------|------|---------|
| `pug` | Entry point / start | `pug MASTER_ORCHESTRATOR` |
| `bark` | Fetch data from external source | `bark entity <- @guardian/entities/{id}` |
| `spin` | Loop / iterate | `spin crate_id IN tier_0_crates` |
| `cali` | Call a function | `cali BUILD_WITH_VALIDATION(entity)` |
| `elf` | Assign local variable | `elf is_multi_governed <- true` |
| `turk` | Transform data | `turk normalize(input)` |
| `fence` | Guard clause / constraint block | `fence TIER_0_RULES` |
| `pin` | Lock an immutable value | `pin threshold = 0.7` |
| `bone` | Immutable rule (cannot be overridden) | `bone NOT: bypass guardian database` |
| `blob` | Mutable data container | `blob session_data` |
| `biz` | Return / business output | `biz -> "Build complete"` |
| `anchor` | Finalize / commit to permanent log | `anchor #build_anchored` |

### Maps

| Map | File | Purpose | Key Skills Invoked |
|-----|------|---------|--------------------|
| **Master Orchestration** | `master-orchestration.codie` | Supreme controller. Routes all requests through governance: change, confession, query, execute. Contains Angel Watch, Priest/Demon flows, Samson Protocol. | `guardian-monitor`, `fafo-escalate`, `codie-execute` |
| **Training Quality** | `training-quality.codie` | AI quality mining pipeline. Content starts EXCLUDED by default. Scores with weighted formula (0.7 threshold). Clusters high-quality inference for potential training inclusion. | `quality-mine`, `boneblob-constrain`, `embed-generate` |
| **Comprehensive Build** | `comprehensive-build.codie` | 8-phase tier-ordered build (Init -> Tier 0 -> Tier 1 -> Tier 2 -> Tier 3 -> Tier 4 -> Application -> Final Validation). BTC-anchors completed builds. | `cargo-build`, `tier-build`, `btc-anchor`, `guardian-monitor` |
| **Install** | `install.codie` | Complete system installation. Detects platform and hardware, validates environment, builds crates, configures NixOS, flashes USB. | `hardware-detect`, `auto-install`, `nix-iso`, `flash-usb` |
| **Exodus Bootloader** | `exodus-bootloader.codie` | Boot chain liberation from broken state. Biblical metaphor: Egypt (broken) -> Red Sea (bootloader handoff) -> Desert (build process). Fallback instructions (Manna) when primary path fails. | `boot-sequence`, `tier-build`, `guardian-monitor` |
| **Validate All** | `validate-all.codie` | Full validation across all platforms (Steam Deck, Linux, NixOS). Runs platform-specific validators. | `guarddog-scan`, `guardian-monitor`, `ci-pipeline` |
| **Synthestasia** | `synthestasia.codie` | Unified field engine orchestration. Unifies GUI rendering, neural attention, and behavioral learning through `smooth_min(k) = softmax(1/k)`. Three projections from one field function `G(x,y,t,theta)`. | `goo-field`, `behavior-learn`, `ged-translate`, `doc-engine` |
| **Rebuild** | `rebuild.codie` | Phoenix Protocol: recover from broken state. Assesses damage, preserves registry and user data, rebuilds from last known good state. | `tier-build`, `guardian-monitor`, `btc-anchor` |
| **Ether Goo Defense** | `ether-goo-defense.codie` | Defense protocol using spin notation (Bleed, Goo, Vortex, Aperture). Maps biological/silicon substrate equivalences for routing through unnamed boundary conditions. | `goo-field`, `fafo-escalate`, `guardian-monitor` |

---

## Constraints & Governance

### PTC (Permission To Change)

- **What**: Any modification to a `bone`-tagged entity or crypto crate requires explicit PTC approval.
- **Who approves**: ARCHITECT role (for bone entities), or the designated approver list in `tools/guardian/guardian.db`.
- **Enforcement**: `comprehensive-build.codie` Phase 1 checks PTC before building Tier 0 crypto crates. Master Orchestration routes all changes through `HANDLE_CHANGE` which queries governance chain.

### BONEBLOB Constraint Formula

- **bone**: Immutable data/rules. Once set and anchored, cannot be modified by any agent. Examples: crypto primitives, quality thresholds, tier topology.
- **blob**: Mutable data containers. Can be updated within governance rules. Examples: session data, feed entries, UI state.
- **Formula**: `quality-mine` produces scores; `boneblob-constrain` converts scores into bone (immutable, high-confidence) vs blob (mutable, evolving) classification.
- **Threshold**: 0.7 minimum quality score for training inclusion. Content defaults to EXCLUDED.

### Tier Gate Enforcement

- **Rule**: A higher tier cannot build or execute until all lower tiers are complete and validated.
- **Implementation**: `modules/tier-gate.nix` at the NixOS level; `comprehensive-build.codie` Phase checks (`VERIFY_TIER_COMPLETE`, `VERIFY_LOWER_TIERS`) at the build level.
- **Tier order**: 0 (Foundation) -> 1-2 (Knowledge) -> 3 (Intelligence) -> 4 (Security) -> 5 (Network) -> 6 (Application).

### Guardian Confession/Penance Loop

1. **Angel detects** -- `ANGEL_WATCH` monitors git branches, build status, daemon events every 60 seconds.
2. **Confession created** -- Error classified by sin type and severity (1-10). Mapped to a Bible book/chapter/verse via crate-to-scripture mapping.
3. **Priest prescribes** -- Routes through `confession_routing` table. Priest generates CODIE penance instructions with isolation level.
4. **Demon executes** -- Runs penance in isolation (CHAPEL/SANDBOX/QUARANTINE). No network in QUARANTINE, no filesystem in QUARANTINE, no sibling reads in SANDBOX.
5. **Angel verifies** -- Runs tests. If passed: absolved. If failed and under retry limit: retry. If exceeded: escalate to council.

### Samson Protocol (Nuclear Option)

- **Trigger**: Severity 10 threat or explicit invocation via `SAMSON_PROTOCOL()`.
- **Requirements**: 4 approvals -- ARCHITECT + Security Lead + Foundation Lead + Intelligence Lead.
- **Effect**: `BURN_EVERYTHING()` -- scorched earth destruction of compromised state.
- **Anchor**: Execution is permanently logged (`#samson_executed`).
- **Usage**: Last resort only. Three department heads plus ARCHITECT must unanimously approve.

### GuardDog IO Scanning

- **Scope**: ALL input/output paths without exception.
- **Threats detected**: Homoglyphs, invisible Unicode characters, RTL override attacks, injection patterns.
- **Threat levels**: 0 (clean) through 7+ (critical block -- input rejected).
- **Integration points**:
  - Chat input in Electron panes (before Claude sees it)
  - File drag-to-chat (filename + content sanitized)
  - CLI chain commands (validates no injected invisibles)
  - Token/key storage (TokenVault cleans before `.env`)
  - Feed chain injection (verifies fork source integrity)

---

## Swarm Coordination Patterns

### Fork Tree (DAG State Branching)

- Every feed entry, knowledge node, and document chain is a node in a directed acyclic graph.
- Agents can fork state (create a branch), work independently, then merge back.
- Fork provenance is tracked -- `feed-track` records which agent forked from which state.
- Content-addressable storage (SHA256 Blob) ensures deduplication across forks.

### Multi-Validator Approval Flows

- Skills marked `multi-governed` require two independent validators.
- `REQUIRE_TWO_VALIDATORS` in `master-orchestration.codie` sends sequential validation requests.
- Both validators must approve. Any deny terminates. Any escalate routes to council.
- Instruction templates are loaded based on source and target department for cross-department communication.

### Angel -> Priest -> Demon -> Angel Error Recovery

- **Angel** (detection): Watches branches, builds, daemons. Creates confessions.
- **Priest** (diagnosis): Receives confession, consults scripture mapping, prescribes CODIE penance with isolation level.
- **Demon** (execution): Runs penance in sandbox. Strict isolation rules based on severity.
- **Angel** (verification): Tests the fix. Absolves on success, retries or escalates on failure.
- Loop runs continuously. Retry limit is configurable per sin type in `confession_routing`.

### Escalation to Humans

- When confidence drops below threshold or retry limits are exceeded, the system escalates to human operators.
- `ESCALATE_TO_COUNCIL` creates a council request with `requires_human: true`.
- ROOT-level escalations notify the ARCHITECT directly via `NOTIFY_ARCHITECT`.
- Agents MUST NOT self-approve when the governance chain requires human validation.

### 16-Daemon Concurrent Monitoring

- Daemons are registered in `tools/guardian/daemon_registry.jsonl`.
- Each daemon monitors a specific domain (build integrity, runtime errors, security events, network anomalies, etc.).
- Daemon events feed into the Angel Watch loop, triggering confessions when anomalies are detected.
- Daemon status is queryable via `guardian-monitor` skill.
- All 16 daemons run concurrently. Guardian SQLite DB is the single source of truth for daemon state.

---

## Quick Reference: Crate Paths

| Crate | Path |
|-------|------|
| gently-core | `crates/foundation/gently-core` |
| gently-codie | `crates/foundation/gently-codie` |
| gently-artisan | `crates/foundation/gently-artisan` |
| gently-audio | `crates/foundation/gently-audio` |
| gently-visual | `crates/foundation/gently-visual` |
| gently-goo | `crates/foundation/gently-goo` |
| gently-feed | `crates/knowledge/gently-feed` |
| gently-alexandria | `crates/knowledge/gently-alexandria` |
| gently-search | `crates/knowledge/gently-search` |
| gently-btc | `crates/knowledge/gently-btc` |
| gently-ipfs | `crates/knowledge/gently-ipfs` |
| gently-brain | `crates/intelligence/gently-brain` |
| gently-inference | `crates/intelligence/gently-inference` |
| gently-agents | `crates/intelligence/gently-agents` |
| gently-micro | `crates/intelligence/gently-micro` |
| gently-mcp | `crates/intelligence/gently-mcp` |
| gently-ged | `crates/intelligence/gently-ged` |
| gently-behavior | `crates/intelligence/gently-behavior` |
| gently-security | `crates/security/gently-security` |
| gently-cipher | `crates/security/gently-cipher` |
| gently-guardian | `crates/security/gently-guardian` |
| gently-sim | `crates/security/gently-sim` |
| gently-sploit | `crates/security/gently-sploit` |
| gently-network | `crates/network/gently-network` |
| gently-gateway | `crates/network/gently-gateway` |
| gently-bridge | `crates/network/gently-bridge` |
| gently-dance | `crates/network/gently-dance` |
| gently-web | `crates/application/gently-web` |
| gently-architect | `crates/application/gently-architect` |
| gently-document | `crates/application/gently-document` |
| gently-gooey | `crates/application/gently-gooey` |
| gently-commerce | `crates/application/gently-commerce` |
| gently-cli | `binaries/gently-cli` |
| gentlyos-tui | `binaries/gentlyos-tui` |
