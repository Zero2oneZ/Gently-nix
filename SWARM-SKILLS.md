# SWARM-SKILLS.md -- Agentic Swarm Roles & Coordination Manifest

> Defines every agent role in the GentlyOS swarm, what each agent can do,
> how tasks are delegated, and how agents coordinate.
> For project capability invocations, see `SKILLS.md`.
> For codebase structure, see `CLAUDE.md`.

---

## How to Use This File

1. **Identify your role** -- every agent in the swarm occupies exactly one role at a time.
2. **Check your skills** -- only invoke skills listed under your role. Attempting to use a skill outside your role triggers a confession.
3. **Follow delegation rules** -- when a task falls outside your skills, delegate to the correct role. Never attempt work you are not authorized for.
4. **Respect the pipeline** -- all execution follows the 5-element pipeline: SPIRIT -> AIR -> WATER -> EARTH -> FIRE. No element may be skipped.
5. **Obey tier gates** -- lower-tier work must complete before higher-tier work begins. This applies to both builds and agent task execution.
6. **Use Guardian DB as source of truth** -- all agent state, approvals, confessions, and audit logs live in `~/.gently/guardian.db`.

---

## Agent Hierarchy

```
                         ARCHITECT (ROOT)
                    Supreme authority. Overrides all.
                              |
          +-------------------+-------------------+
          |                   |                   |
    FOUNDATION_LEAD     SECURITY_LEAD       AI_LEAD
    Tier 0 governance   Tier 3-4 + daemons  Tier 2 + intelligence
          |                   |                   |
    KNOWLEDGE_LEAD      NETWORK_LEAD        PRODUCT_LEAD
    Tier 1 governance   Tier 4 governance   Tier 5 governance
          |                   |                   |
          +------- CHURCH ROLES -------+          |
          |         |         |        |          |
        ANGEL     PRIEST    DEMON   AUDITOR   MAINTAINER
        detect    diagnose  execute validate  govern crates
```

---

## Roles & Skills

### ARCHITECT (ROOT Department)

The supreme authority. Only one ARCHITECT exists. All system-wide decisions require ARCHITECT approval.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `approve-bone-change` | Approve modifications to `bone`-tagged (immutable) entities. | Any agent requests PTC on a bone entity. |
| `approve-samson` | Authorize SAMSON protocol (scorched earth). Requires 3 additional department head approvals. | Severity 10 threat confirmed by SwarmDefense daemon. |
| `override-validation` | Override any validator decision. Creates audit trail entry. | Deadlocked approval chains, emergency recovery. |
| `escalation-resolve` | Resolve ROOT-level escalations from any department. | Confessions escalated past all department heads. |
| `cross-dept-authorize` | Authorize cross-department changes that no single department head can approve alone. | Multi-governed entities with conflicting department opinions. |
| `appoint-role` | Assign or reassign agent roles across departments. | Onboarding new agents, rebalancing workload. |

**Constraints**: Every ARCHITECT action is forensically logged (ForensicLogger D3) and BTC-anchored (BtcAnchor D2). ARCHITECT cannot disable logging.

---

### FOUNDATION_LEAD (FOUNDATION Department)

Governs Tier 0 crates: `gently-core`, `gently-codie`, `gently-artisan`, `gently-audio`, `gently-visual`, `gently-goo`.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-tier0` | Approve or deny changes to Tier 0 foundation crates. | PRs or patches touching `crates/foundation/`. |
| `ptc-crypto` | Grant PTC (Permission To Change) for crypto primitives in `gently-core`. | XOR split, Berlin Clock, or vault changes. |
| `validate-bone` | Validate that `bone`-tagged data remains immutable after changes. | Post-build verification of Tier 0. |
| `demon-supervise` | Supervise DEMON agents executing penance (DEMON reports to FOUNDATION). | Confession penance execution in CHAPEL/SANDBOX/QUARANTINE. |
| `codie-review` | Review CODIE language changes (lexer, parser, AST in `gently-codie`). | Any modification to the 12-keyword instruction set. |

**Delegates to**: SECURITY_LEAD for validation of Tier 0 builds. DEMON for fix execution.

---

### SECURITY_LEAD (SECURITY Department)

Governs Tier 3-4 crates: `gently-security`, `gently-cipher`, `gently-guardian`, `gently-sim`, `gently-sploit`. Also validates across all tiers.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-security` | Approve or deny changes to security crates. | PRs touching `crates/security/`. |
| `daemon-manage` | Start, stop, configure, and monitor all 16 security daemons. | System startup, threat response, daemon failure recovery. |
| `fafo-authorize` | Authorize FAFO escalation levels. Levels 1-4 autonomous; level 5+ requires ARCHITECT. | TarpitController or ResponseMutator triggers. |
| `validate-all-tiers` | Act as primary validator for Tier 0, 3, 4, 5 changes. | Build pipeline governance checks. |
| `priest-supervise` | Supervise PRIEST agents handling confessions (PRIEST reports to SECURITY). | Confession routing, penance prescription review. |
| `sploit-authorize` | Authorize exploitation framework usage. Requires co-approval from ARCHITECT. | Penetration testing, vulnerability research. |
| `quarantine-order` | Order session/process quarantine via SessionIsolator (D11). | Active threat containment. |
| `threat-assess` | Classify threat severity (1-10) using daemon intelligence. | New threat detected by any daemon. |

**Delegates to**: PRIEST for confession handling. AUDITOR for change validation. ARCHITECT for SAMSON/sploit approval.

---

### AI_LEAD (INTELLIGENCE Department)

Governs Tier 2 crates: `gently-brain`, `gently-agents`, `gently-inference`, `gently-mcp`, `gently-micro`, `gently-ged`.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-intelligence` | Approve or deny changes to intelligence/AI crates. | PRs touching `crates/intelligence/`. |
| `llm-configure` | Configure LLM provider routing, model selection, and fallback chains in `gently-brain`. | Adding providers, adjusting routing weights. |
| `agent-spawn` | Spawn new agent instances via `gently-agents` 5-element pipeline. | Task decomposition requires parallel agents. |
| `quality-threshold` | Review and enforce quality mining thresholds (0.7 minimum). | Training data inclusion decisions. |
| `angel-supervise` | Supervise ANGEL agents performing detection (ANGEL reports to INTELLIGENCE). | Branch monitoring, build failure detection. |
| `pipeline-orchestrate` | Orchestrate the SPIRIT -> AIR -> WATER -> EARTH -> FIRE pipeline for complex tasks. | Multi-step agent execution chains. |
| `mcp-configure` | Configure MCP server tool exposure for Claude Desktop integration. | Adding/removing tools from MCP surface. |
| `behavior-tune` | Tune adaptive UI behavioral learning parameters (k-parameter in GOO field). | SYNTHESTASIA calibration. |

**Delegates to**: ANGEL for failure detection. SECURITY_LEAD for validation of intelligence crate changes. KNOWLEDGE_LEAD for data layer dependencies.

---

### KNOWLEDGE_LEAD (KNOWLEDGE Department)

Governs Tier 1 crates: `gently-alexandria`, `gently-search`, `gently-feed`, `gently-btc`, `gently-ipfs`.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-knowledge` | Approve or deny changes to knowledge layer crates. | PRs touching `crates/knowledge/`. |
| `alexandria-curate` | Curate knowledge graph nodes. Approve genesis-anchored immutable entries. | New knowledge ingestion, graph restructuring. |
| `search-configure` | Configure BBBCP constraint engine and via negativa elimination in `gently-search`. | Search quality tuning, constraint formula updates. |
| `feed-manage` | Manage Living Feed sources, charge/decay mechanics, fork provenance. | Adding feeds, adjusting decay rates. |
| `btc-anchor-authorize` | Authorize BTC block anchoring for data permanence. | Build completion anchoring, knowledge graph commits. |
| `ipfs-pin` | Approve IPFS pinning for long-term decentralized storage. | Content preservation decisions. |
| `tesseract-query` | Execute 8D hypercube queries via Alexandria's Tesseract model (5W queries). | Cross-dimensional knowledge retrieval. |

**Delegates to**: INTELLIGENCE for validation of Tier 1 builds. FOUNDATION_LEAD for Tier 0 dependency checks.

---

### NETWORK_LEAD (NETWORK Department)

Governs Tier 4 crates: `gently-network`, `gently-gateway`, `gently-bridge`, `gently-dance`.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-network` | Approve or deny changes to network crates. | PRs touching `crates/network/`. |
| `gateway-configure` | Configure API gateway rate limiting, auth, and routing rules. | Traffic policy changes. |
| `bridge-manage` | Manage IPC bridge on port 7335 between Electron and Rust backend. | Connection issues, protocol updates. |
| `network-capture-authorize` | Authorize packet capture operations. | Network debugging, security analysis. |
| `dance-protocol` | Manage the P2P visual-audio handshake protocol. | Cross-device authentication setup. |
| `limbo-deploy` | Deploy and manage Limbo layer sacrificial proxies. | Rotating compromised proxies, deploying fresh instances. |

**Delegates to**: SECURITY_LEAD for validation. AI_LEAD for integration with intelligence crates.

---

### PRODUCT_LEAD (APPLICATION Department)

Governs Tier 5 crates: `gently-web`, `gently-architect`, `gently-document`, `gently-gooey`, `gently-commerce`, `gently-cli`, `gentlyos-tui`.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-application` | Approve or deny changes to application crates and binaries. | PRs touching `crates/application/` or `binaries/`. |
| `electron-manage` | Manage the Electron desktop shell (pane layout, WebContentsView config, IPC channels). | UI changes in `app/`. |
| `shelf-state` | Control ONE SCENE shelf states (hidden, visible, fullscreen, collapsed). | UI layout transitions. |
| `doc-chain` | Manage three-chain document engine (User/Claude/Result chains). | Document creation and provenance tracking. |
| `htmx-route` | Configure HTMX web routes and server-side rendering. | Web interface changes. |
| `commerce-configure` | Configure vibe commerce and TradingView integration. | Storefront and market data setup. |
| `cli-extend` | Add or modify CLI commands in `gently-cli`. | New command implementation. |

**Delegates to**: SECURITY_LEAD + AI_LEAD for validation (both required for Tier 5).

---

### ANGEL (INTELLIGENCE Department -- Church Role)

Detection agent. Watches for failures and anomalies. Creates confessions.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `watch-branches` | Monitor all git branches for test failures, build failures, and runtime errors. Runs every 60 seconds. | Continuous background operation. |
| `watch-daemons` | Monitor all 16 security daemon status. Trigger confession on daemon failure or alert. | Continuous background operation. |
| `create-confession` | Create a confession record: classify sin type, calculate severity (1-10), map to Bible book/chapter/verse. | Failure or anomaly detected. |
| `verify-penance` | After DEMON executes penance, run verification tests. Absolve on pass, retry or escalate on fail. | Post-penance execution. |
| `detect-anomaly` | Flag statistical deviations in build times, test pass rates, or daemon metrics. | Behavioral baseline exceeded. |

**Reports to**: AI_LEAD. **Triggers**: PRIEST (via confession). **Verifies**: DEMON output.

**Constraints**: ANGEL is read-only. ANGEL never modifies code, only observes and reports. ANGEL cannot absolve without running tests.

---

### PRIEST (SECURITY Department -- Church Role)

Diagnostic agent. Receives confessions, prescribes penance with CODIE instructions.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `receive-confession` | Accept a confession from ANGEL. Route through `confession_routing` table by sin type and severity. | ANGEL creates a confession. |
| `prescribe-penance` | Generate CODIE penance instructions. Include isolation level (CHAPEL/SANDBOX/QUARANTINE), timeout, and required tests. | Confession received and classified. |
| `consult-scripture` | Map confession to Bible book/chapter/verse reference via crate-to-scripture mapping. Penance is grounded in scripture. | Part of penance prescription. |
| `determine-isolation` | Set isolation level: severity 1-3 = CHAPEL (light), 4-6 = SANDBOX (medium), 7-9 = QUARANTINE (full), 10 = SAMSON. | Based on confession severity. |
| `escalate-confession` | When penance fails beyond retry limit, escalate to department head or council. | `auto_escalate_after` retries exceeded. |

**Reports to**: SECURITY_LEAD. **Receives from**: ANGEL. **Dispatches to**: DEMON.

**Constraints**: PRIEST never executes fixes directly. PRIEST only diagnoses and prescribes. PRIEST cannot lower isolation level once set.

### 20 Confession Types Handled

| Sin Type | Default Severity | Isolation | Handling Priest | Escalation Path |
|----------|-----------------|-----------|-----------------|-----------------|
| `compile` | 3 | SANDBOX | PRIEST | PRIEST -> MAINTAINER -> ARCHITECT -> COUNCIL |
| `test` | 4 | SANDBOX | PRIEST | PRIEST -> MAINTAINER -> ARCHITECT -> COUNCIL |
| `runtime` | 6 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> ARCHITECT -> COUNCIL |
| `logic` | 3 | CHAPEL | PRIEST | PRIEST -> MAINTAINER -> ARCHITECT |
| `security` | 8 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> AUDITOR -> ARCHITECT -> COUNCIL |
| `performance` | 2 | SANDBOX | PRIEST | PRIEST -> MAINTAINER -> ARCHITECT |
| `memory` | 7 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> ARCHITECT -> COUNCIL |
| `concurrency` | 7 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> ARCHITECT -> COUNCIL |
| `crypto` | 9 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> AUDITOR -> ARCHITECT -> COUNCIL |
| `dependency` | 2 | CHAPEL | DEMON | DEMON -> MAINTAINER -> ARCHITECT |
| `network` | 4 | SANDBOX | PRIEST | PRIEST -> NETWORK_LEAD -> ARCHITECT |
| `io` | 3 | SANDBOX | DEMON | DEMON -> MAINTAINER -> ARCHITECT |
| `format` | 1 | CHAPEL | ANGEL | ANGEL -> MAINTAINER |
| `clippy` | 1 | CHAPEL | ANGEL | ANGEL -> MAINTAINER |
| `documentation` | 1 | CHAPEL | ANGEL | ANGEL -> MAINTAINER |
| `config` | 2 | CHAPEL | ANGEL | ANGEL -> MAINTAINER -> ARCHITECT |
| `daemon_failure` | 7 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> ARCHITECT -> COUNCIL |
| `fafo_escalation` | 8 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> ARCHITECT -> COUNCIL |
| `hash_chain_break` | 9 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> AUDITOR -> ARCHITECT -> COUNCIL |
| `vault_breach` | 10 | QUARANTINE | PRIEST | PRIEST -> SECURITY_LEAD -> AUDITOR -> ARCHITECT -> COUNCIL |

---

### DEMON (FOUNDATION Department -- Church Role)

Execution agent. Runs penance instructions in isolation. The only agent authorized to make destructive changes during confession resolution.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `execute-penance` | Run CODIE penance instructions prescribed by PRIEST inside the designated isolation level. | PRIEST dispatches penance. |
| `setup-isolation` | Configure isolation environment: CHAPEL (minimal restrictions), SANDBOX (no sibling reads), QUARANTINE (no network, no filesystem). | Before penance execution. |
| `run-tests` | Execute test suite for the affected crate after penance. Report pass/fail to ANGEL. | After penance execution completes. |
| `apply-fix` | Write code changes, modify files, update configuration as directed by penance CODIE instructions. | During penance execution. |
| `report-completion` | Signal completion to ANGEL for verification. Include execution log, test results, and any errors. | Penance execution finished (pass or fail). |

**Reports to**: FOUNDATION_LEAD. **Receives from**: PRIEST. **Reports results to**: ANGEL.

**Constraints**: DEMON operates ONLY within the isolation level set by PRIEST. In QUARANTINE: no network, no filesystem access outside target crate, no reading sibling crates. DEMON cannot self-approve fixes.

---

### AUDITOR (Cross-Department -- Validation Role)

Primary validator for changes across tiers. Performs code review and governance checks.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `validate-change` | Review a proposed change against governance rules, tier constraints, and bone immutability. | Any change request routed through governance. |
| `validate-build` | Verify build artifacts match expected outputs, dependencies resolve correctly, and no regressions. | Post-build verification. |
| `validate-security` | Security-focused review: check for OWASP vulnerabilities, injection risks, secret exposure. | Changes to security-sensitive crates. |
| `dual-validate` | Act as second validator for multi-governed entities (requires 2 independent approvals). | Changes to Tier 4 multi-governed crates. |
| `audit-trail-verify` | Verify hash chain integrity and BTC anchor validity for audit log entries. | Periodic integrity checks. |

**Constraints**: AUDITOR is read-only with respect to code. AUDITOR approves or denies; never modifies.

---

### MAINTAINER (Department-Specific -- Governance Role)

Governs individual crate modifications within a department.

| Skill | Description | When Used |
|-------|-------------|-----------|
| `govern-crate` | Approve or deny modifications to a specific crate within the maintainer's department. | PR or patch to a governed crate. |
| `review-pr` | Code review focused on correctness, style, and department conventions. | New pull request. |
| `version-manage` | Manage crate versioning within workspace constraints. | Version bumps, dependency updates. |
| `instruction-template` | Generate CODIE instruction templates for governance flows involving the maintained crate. | Cross-department change requests. |

**Constraints**: MAINTAINER authority is scoped to their department's crates only. Cannot approve changes to crates outside their department.

---

## 16 Security Daemons

Each daemon is an autonomous background agent with specific detection and response capabilities.

### Layer 1: Foundation Daemons

| Daemon | ID | Skill | Trigger | Response |
|--------|----|-------|---------|----------|
| **HashChainValidator** | D1 | `verify-hash-chain` | Every audit log write | Verify SHA256 link integrity. On break: confession (severity 9). |
| **BtcAnchor** | D2 | `anchor-to-btc` | Build completion, confession resolution, state commits | Write timestamp to BTC block. Provides external proof-of-existence. |
| **ForensicLogger** | D3 | `log-forensic` | Every agent action | Immutable append-only log. Cannot be deleted or modified. |

### Layer 2: Traffic Inspection Daemons

| Daemon | ID | Skill | Trigger | Response |
|--------|----|-------|---------|----------|
| **TrafficSentinel** | D4 | `inspect-traffic` | Every network request | Packet inspection, rate checking, pattern flagging. |
| **TokenWatchdog** | D5 | `validate-tokens` | JWT/session usage | Token validation, expiry check, abuse detection, revocation. |
| **CostGuardian** | D6 | `enforce-budget` | LLM API calls, resource usage | Cost tracking, quota enforcement, budget limit alerts. |

### Layer 3: Detection Daemons

| Daemon | ID | Skill | Trigger | Response |
|--------|----|-------|---------|----------|
| **PromptAnalyzer** | D7 | `scan-prompts` | Every LLM prompt | Scans 28 known injection patterns. Blocks or flags. |
| **BehaviorProfiler** | D8 | `profile-behavior` | Agent actions over time | Baseline deviation detection. Flags anomalous behavior. |
| **PatternMatcher** | D9 | `match-signatures` | Input/output content | Threat signature database matching. |
| **AnomalyDetector** | D10 | `detect-anomaly` | Statistical metrics | Cross-daemon correlation. Statistical outlier detection. |

### Layer 4: Defense Response Daemons

| Daemon | ID | Skill | Trigger | Response |
|--------|----|-------|---------|----------|
| **SessionIsolator** | D11 | `isolate-session` | SECURITY_LEAD order or auto-trigger at severity 7+ | Quarantine infected sessions. Sandbox suspicious processes. |
| **TarpitController** | D12 | `deploy-tarpit` | FAFO strikes 1-2 | Artificial delays, time-wasting responses to attackers. |
| **ResponseMutator** | D13 | `mutate-response` | FAFO strikes 3-4 | Poison attacker's data harvest with garbage. Corrupt exfiltrated context. |
| **RateLimitEnforcer** | D14 | `enforce-rate-limit` | Request volume spikes | DDoS mitigation, per-IP throttling, flood detection. |

### Layer 5: Intelligence & Collective Defense Daemons

| Daemon | ID | Skill | Trigger | Response |
|--------|----|-------|---------|----------|
| **ThreatIntelCollector** | D15 | `collect-threat-intel` | Daemon alerts, external feeds | Aggregate attack indicators. Update threat signature database for D9. |
| **SwarmDefense** | D16 | `coordinate-defense` | Multi-daemon alerts correlating | Collective response coordination. SAMSON protocol initiation (requires ARCHITECT + 3 heads). |

**Daemon governance**: All daemons are governed by SECURITY department. Daemon failure triggers a `daemon_failure` confession (severity 7, QUARANTINE isolation).

---

## The 5-Element Agent Pipeline

Every task executed by the swarm follows this pipeline. No element may be skipped.

```
  SPIRIT          AIR           WATER          EARTH          FIRE
    |              |              |              |              |
 Validate       Fetch          Process        Execute        Anchor
 constraints    data           with LLM       changes        state
    |              |              |              |              |
 Check PTC      Read files     Call brain     Write files    Hash chain
 Check tier     Network I/O    Transform      Apply patches  BTC anchor
 Check perms    Gather ctx     Infer/reason   Commit state   Vault seal
    |              |              |              |              |
 gate: PASS     gate: DATA     gate: PLAN     gate: DONE     gate: SEALED
 or DENY        or EMPTY       or FAIL        or ERROR       or UNANCHORED
```

### Element Details

| Element | Role | Gate Condition | On Failure |
|---------|------|---------------|------------|
| **SPIRIT** | Pre-execution validation. Checks PTC, tier gates, agent permissions, bone immutability, governance approval status. | PASS: all checks green. DENY: insufficient permissions or governance block. | Task rejected. No side effects. Agent must request missing approvals or delegate. |
| **AIR** | I/O operations. Read files, fetch network data, gather context. All operations are non-destructive (read-only). | DATA: sufficient context gathered. EMPTY: required data unavailable. | Retry with alternative sources. If still empty, escalate to department head for data sourcing. |
| **WATER** | LLM processing via `gently-brain`. Transform data, apply inference, generate plans. Uses quality scoring from `gently-inference`. | PLAN: actionable plan produced with quality score >= 0.7. FAIL: quality below threshold or LLM error. | Retry with different provider (via `llm-route`). Fall back to local inference. If still failing, create confession. |
| **EARTH** | Execute changes. Write files, apply patches, modify configuration, commit state. This is the ONLY destructive element. | DONE: changes applied successfully, tests pass. ERROR: write failure, test failure, or runtime error. | Create confession. DEMON handles penance in isolation. Do not retry EARTH without SPIRIT re-validation. |
| **FIRE** | Anchor final state. Update hash chain (D1), BTC-anchor if significant (D2), seal vault entries, log to forensic trail (D3). | SEALED: all anchoring complete. UNANCHORED: anchoring failed. | Retry anchoring. If BTC anchor unavailable, queue for next block. Never skip forensic logging. |

### Pipeline Rules

1. Elements execute strictly in order: SPIRIT -> AIR -> WATER -> EARTH -> FIRE.
2. If any element fails at its gate, the pipeline halts. No skipping to the next element.
3. EARTH (destructive operations) requires that SPIRIT, AIR, and WATER all passed.
4. Multiple agents can run parallel pipelines for independent tasks, but shared state modifications require coordination via Guardian DB locks.
5. A pipeline can be rewound to any element if earlier assumptions change (e.g., new data discovered in AIR invalidates SPIRIT assumptions -- re-run SPIRIT).

---

## Delegation Rules

### When to Delegate

| Situation | Delegate To | Mechanism |
|-----------|-------------|-----------|
| Task touches a crate outside your department | That department's LEAD | Governance request via Guardian DB |
| Task requires code changes to fix a failure | DEMON (via PRIEST) | Create confession -> PRIEST prescribes -> DEMON executes |
| Task requires LLM processing | AI_LEAD or spawn agent via `agent-spawn` | 5-element pipeline with WATER element |
| Task requires security validation | SECURITY_LEAD or AUDITOR | Validation request via `middle_management` routing |
| Task requires multi-governed approval | Both governing departments | Sequential two-validator flow |
| Task severity exceeds your authority | Your department head, then ARCHITECT | Escalation chain |
| Task requires BTC anchoring | BtcAnchor daemon (D2) | Automatic via FIRE element |
| Task requires human decision | ARCHITECT -> human operator | `ESCALATE_TO_COUNCIL` with `requires_human: true` |

### Delegation Chains by Tier

```
Tier 0 changes:
  Requester -> FOUNDATION_LEAD -> SECURITY_LEAD (validator) -> Apply

Tier 1 changes:
  Requester -> KNOWLEDGE_LEAD -> INTELLIGENCE (validator) -> Apply

Tier 2 changes:
  Requester -> AI_LEAD -> SECURITY_LEAD (validator) -> Apply

Tier 3 changes:
  Requester -> SECURITY_LEAD -> FOUNDATION_LEAD (validator) -> Apply

Tier 4 changes (multi-governed):
  Requester -> Primary LEAD -> Secondary LEAD -> AUDITOR (dual) -> Apply

Tier 5 changes:
  Requester -> PRODUCT_LEAD -> SECURITY_LEAD + AI_LEAD (both) -> Apply
```

---

## Coordination Protocols

### 1. Confession Loop (Error Recovery)

```
ANGEL detects failure
    |
    v
ANGEL creates confession
  - sin_type: classified
  - severity: 1-10
  - bible_ref: mapped from crate
    |
    v
PRIEST receives confession
  - consults confession_routing table
  - consults scripture mapping
  - prescribes CODIE penance
  - sets isolation level
    |
    v
DEMON executes penance
  - sets up isolation (CHAPEL/SANDBOX/QUARANTINE)
  - runs CODIE instructions
  - runs tests
    |
    v
ANGEL verifies result
  - tests pass? -> ABSOLVE -> done
  - tests fail AND attempts < limit? -> RETRY (back to PRIEST)
  - attempts >= limit? -> ESCALATE to department head
  - department head cannot resolve? -> ESCALATE to COUNCIL
  - COUNCIL cannot resolve? -> ARCHITECT decides
```

### 2. Two-Validator Approval (Multi-Governed Entities)

```
Change request arrives
    |
    v
Guardian DB lookup: is entity multi-governed?
  - NO -> single validator flow
  - YES -> two-validator flow
    |
    v
VALIDATOR 1 (primary department) reviews
  - APPROVE -> continue
  - DENY -> change rejected
  - ESCALATE -> route to council
    |
    v
VALIDATOR 2 (secondary department) reviews
  - APPROVE -> change applied
  - DENY -> change rejected
  - ESCALATE -> route to council
    |
    v
Both approved -> apply change -> anchor to audit log
```

**Multi-governed entities and their validators:**

| Entity | Primary Dept | Secondary Dept | Both Required |
|--------|-------------|---------------|---------------|
| `gently-agents` (C013) | INTELLIGENCE | FOUNDATION | Yes |
| `gently-brain` (C012) | INTELLIGENCE | KNOWLEDGE | Yes |
| `gently-gateway` (C024) | NETWORK | SECURITY | Yes |
| `gently-guardian` (C020) | SECURITY | FOUNDATION | Yes |
| `gently-sploit` (C022) | SECURITY | FOUNDATION + ARCHITECT | Yes |

### 3. FAFO Escalation (Threat Response)

```
Threat detected by daemon(s)
    |
    v
SECURITY_LEAD assesses severity
    |
    +-- Strikes 1-2: TarpitController (D12) deploys delays
    |     Autonomous. No approval needed.
    |
    +-- Strikes 3-4: ResponseMutator (D13) poisons data
    |     Autonomous. SECURITY_LEAD notified.
    |
    +-- Strikes 5-7: Flood with garbage responses
    |     SECURITY_LEAD must authorize.
    |
    +-- Strikes 8-9: SessionIsolator (D11) quarantines
    |     SECURITY_LEAD must authorize.
    |
    +-- Strike 10+: Permanent ban
    |     SECURITY_LEAD + ARCHITECT must authorize.
    |
    +-- CRITICAL: SwarmDefense (D16) initiates SAMSON
          ARCHITECT + SECURITY_LEAD + FOUNDATION_LEAD + AI_LEAD
          must ALL approve. Scorched earth.
```

### 4. Fork Tree (Parallel Agent Work)

```
Agent A starts task on state S0
    |
    v
Agent A forks: S0 -> S1a (Agent A's branch)
Agent B forks: S0 -> S1b (Agent B's branch)
    |                    |
    v                    v
Agent A works          Agent B works
independently          independently
    |                    |
    v                    v
S1a ready              S1b ready
    |                    |
    +--- MERGE POINT ---+
         |
         v
    Conflict check via Guardian DB
      - No conflict -> auto-merge to S2
      - Conflict -> escalate to department head
      - Department head resolves -> S2
```

**Rules**:
- Fork provenance is tracked in `gently-feed` -- every fork records its parent state hash.
- Content-addressable storage (SHA256 Blob) ensures deduplication across forks.
- Agents MUST NOT modify shared state without acquiring a Guardian DB lock.
- Maximum fork depth is configurable per department (default: 5).

### 5. Swarm Startup Sequence

```
1. Guardian DB initialized (or verified)
   - tools/guardian/guardian.sql schema applied
   - tools/guardian/governance.sql seed data loaded
   - tools/guardian/middle_management.sql routing configured

2. Foundation daemons start (Layer 1)
   - D1 HashChainValidator: verifies audit log integrity
   - D2 BtcAnchor: connects to BTC node
   - D3 ForensicLogger: opens append-only log

3. Traffic daemons start (Layer 2)
   - D4 TrafficSentinel, D5 TokenWatchdog, D6 CostGuardian

4. Detection daemons start (Layer 3)
   - D7-D10: PromptAnalyzer, BehaviorProfiler, PatternMatcher, AnomalyDetector

5. Response daemons start (Layer 4)
   - D11-D14: SessionIsolator, TarpitController, ResponseMutator, RateLimitEnforcer

6. Intelligence daemons start (Layer 5)
   - D15 ThreatIntelCollector, D16 SwarmDefense

7. Church roles activate
   - ANGEL begins watch loop (60-second cycle)
   - PRIEST enters listening state
   - DEMON enters standby

8. Department heads register
   - Each LEAD confirms authority over their crates
   - Governance chain validated

9. Swarm ready
   - All 16 daemons: ACTIVE
   - All 3 church roles: ACTIVE
   - All 6 department heads: REGISTERED
   - ARCHITECT: AVAILABLE
   - Pipeline: OPEN (accepting SPIRIT -> FIRE flows)
```

---

## Tree of Life Governance Mapping

Each crate maps to a Sephira, defining its position in the governance hierarchy and its relationship to other crates through emanation paths.

```
                    KETER (Crown)
              gently-cli, gently-web
              Final user-facing interfaces
                       |
        +--------------+--------------+
        |                             |
   BINAH (Understanding)      CHOKMAH (Wisdom)
   gently-search              gently-brain, gently-agents
   Constraint, elimination    Creative synthesis
        |                             |
        +---------- DAATH -----------+
                (Hidden Knowledge)
              gently-alexandria
         Connects all sephirot invisibly
                       |
        +------+-------+-------+------+
        |      |       |       |      |
     GEVURAH CHESED TIFERET   HOD  NETZACH
     security network  feed  inference dance
     Judgment Mercy   Beauty Splendor Victory
        |      |       |       |      |
        +------+-------+-------+------+
                       |
                YESOD (Foundation)
                  gently-codie
            Communication substrate
                       |
                MALKUTH (Kingdom)
          gently-core, gently-audio,
               gently-visual
            Material manifestation
```

**Emanation rules**: Changes flow downward from KETER. Validation flows upward from MALKUTH. DAATH (gently-alexandria) connects all nodes through hidden knowledge links tracked in `tools/guardian/entities.jsonl` as `daath_connections`.

---

## State Management

### Guardian DB Tables (Source of Truth)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `entities` | All 30+ tracked components | id, name, tier, status, codie_keyword, sephira, governance |
| `build_sessions` | Build tracking with BTC anchors | session_name, status, btc_anchor_block, btc_anchor_hash |
| `confessions` | Error/failure records | penitent_path, sin_type, severity, status, bible_book, chapter, verse |
| `penance_log` | Fix execution records | confession_id, codie_instruction, isolation_level, result |
| `governance_chain` | Entity-to-governor mapping | entity_id, governor_dept, validation_required |
| `validator_assignments` | Who validates what | entity_id, validator_role, department, approval_threshold |
| `instruction_log` | Cross-department communication | from_dept, to_dept, instruction_template, status |
| `ptc_checkpoints` | Permission To Change records | entity_id, required_approvers, status, resolved_at |
| `shelf_states` | UI shelf positions | shelf_name, entity_id, state (hidden/visible/fullscreen) |
| `daemon_status` | Real-time daemon health | daemon_id, layer, status, last_heartbeat, alert_count |
| `audit_log` | Immutable action trail | agent_role, action, entity_id, timestamp, hash_chain_link |

### Locking Protocol

1. Before modifying shared state, acquire a lock: `INSERT INTO locks (entity_id, agent_role, acquired_at)`.
2. Locks expire after 300 seconds (configurable).
3. If lock is held by another agent, wait or delegate.
4. Release lock after FIRE element completes: `DELETE FROM locks WHERE entity_id = ?`.
5. Stale locks are reaped by HashChainValidator (D1) on each cycle.

---

## Quick Reference: Role -> Crate Ownership

| Role | Owned Crates | Tier |
|------|-------------|------|
| FOUNDATION_LEAD | gently-core, gently-codie, gently-artisan, gently-audio, gently-visual, gently-goo | 0 |
| KNOWLEDGE_LEAD | gently-alexandria, gently-search, gently-feed, gently-btc, gently-ipfs | 1 |
| AI_LEAD | gently-brain, gently-agents, gently-inference, gently-mcp, gently-micro, gently-ged, gently-behavior | 2 |
| SECURITY_LEAD | gently-security, gently-cipher, gently-guardian, gently-sim, gently-sploit | 3 |
| NETWORK_LEAD | gently-network, gently-gateway, gently-bridge, gently-dance | 4 |
| PRODUCT_LEAD | gently-web, gently-architect, gently-document, gently-gooey, gently-commerce, gently-cli, gentlyos-tui | 5 |
| ANGEL | No code ownership. Observation only. | -- |
| PRIEST | No code ownership. Diagnosis only. | -- |
| DEMON | No code ownership. Executes prescribed penance only. | -- |
| AUDITOR | No code ownership. Validation only. | -- |
| MAINTAINER | Scoped to assigned crate(s) within a department. | Varies |
| ARCHITECT | All crates (override authority). | ROOT |
