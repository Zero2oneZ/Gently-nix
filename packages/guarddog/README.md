# 🐕 GuardDog

**Tier 0 IO Defense for GentlyOS**

Token protection. Keyboard goo defense. BTC-timestamped vulnerability evidence.

```
npm install guarddog
```

---

## What It Does

GuardDog protects the boundary between human input and machine processing. Every IO path — chat messages, file names, CLI commands, API tokens, feed injections — flows through GuardDog before anything else touches it.

Three layers:

| Layer | Purpose | What It Catches |
|-------|---------|-----------------|
| **Detection** | Scan for threats | Homoglyphs, invisibles, RTL overrides, domain spoofs |
| **Normalization** | Clean without losing intent | Cyrillic→ASCII, strip zero-width, normalize spaces |
| **Protection** | Vault tokens, timestamp evidence | Clean-before-store, BTC anchoring, rainbow tables |

## Quick Start

```javascript
const { createGuardDog } = require('guarddog');
const gd = createGuardDog();

// Scan for threats
gd.scan('pаypal.com');        // Cyrillic 'а' detected! Threat: 7 (DOMAIN_SPOOF)

// Clean input
gd.clean('gооgle.com');       // → 'google.com'
gd.clean('pass\u200Bword');   // → 'password' (zero-width stripped)

// Process (scan + clean)
gd.process('\u202Emalicious'); // BLOCKED (RTL override, threat 6+)
gd.process('micrοsoft.com');   // CLEANED → 'microsoft.com'
gd.process('hello world');     // PASSED (clean)
```

## Threat Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 0 | Clean | Pass through |
| 1-2 | Low (homoglyphs, special spaces) | Normalize |
| 3-4 | Medium (invisibles, mixed scripts) | Strip + warn |
| 5-6 | High (RTL override, separator attacks) | **BLOCK** |
| 7+ | Critical (domain spoof, combined) | **BLOCK + LOG** |

## What It Catches

| Attack | Example | Detection |
|--------|---------|-----------|
| Cyrillic а | `pаypal.com` | Homoglyph → normalize to `paypal.com` |
| Greek ο | `gοοgle.com` | Homoglyph → normalize to `google.com` |
| Zero-width space | `admin​pass` | Invisible → strip to `adminpass` |
| RTL override | `‮virus.exe` | Bidi attack → **BLOCK** |
| Fullwidth | `ｐａｙｐａｌ` | Width → normalize to `paypal` |
| Domain spoof | `аpple.com` | Combined → **BLOCK** (threat 7) |
| Token poison | API key with hidden chars | Vault cleans before storage |
| Predictive blend | `lattern` for `pattern` | Keyboard analysis → **SUSPICIOUS** |

## Token Vault

```javascript
const { GuardDog, TokenVault } = require('guarddog');

const guard = new GuardDog();
const vault = new TokenVault(guard);

// Store (auto-cleaned)
vault.store('OPENAI_KEY', 'sk-live_\u0430bc');  // Cyrillic а removed
// → stored as 'sk-live_abc'

// Retrieve
vault.get('OPENAI_KEY');  // 'sk-live_abc'

// Verify
vault.verify('OPENAI_KEY', 'sk-live_abc');  // { valid: true }

// Revoke
vault.revoke('OPENAI_KEY');
```

## Keyboard Pattern Analysis

```javascript
// Legitimate fat-finger (b and h are adjacent on QWERTY)
guard.validateKeyboardPattern('tbe', 'the');
// → { valid: true, verdict: 'LEGITIMATE_TYPO' }

// Predictive text blending (p and l are NOT adjacent)
guard.validateKeyboardPattern('lattern', 'pattern');
// → { valid: false, verdict: 'SUSPICIOUS_MUTATION' }
```

This catches when predictive text engines BLEND semantic neighbors instead of choosing one. If the keyboard perfectly transcribed intent, there'd be no fingerprinting from typo patterns.

## CLI

```bash
# Initialize (scan node_modules, timestamp to BTC, generate key)
npx guarddog init

# Re-scan
npx guarddog scan

# Dashboard (HTMX UI on :7733)
npx guarddog dashboard
```

### What `guarddog init` does:

```
[1/7] Acquiring BTC block timestamp...
[2/7] Scanning node_modules for vulnerability patterns...
[3/7] Generating vulnerability rainbow table...
[4/7] Compiling security manifest...
[5/7] Generating GuardDog protection key...
[6/7] Anchoring evidence to BTC block...
[7/7] Writing configuration files...

✓ GUARDDOG INSTALLATION COMPLETE
```

### Files generated:

```
.guarddog/
├── manifest.gd   # Full scan with BTC proof
├── rainbow.gdt   # Hash-indexed vulnerability table
└── key.gdx       # Protection key (derived from findings)

.env.guarddog      # Protected environment template
```

## BTC Timestamping

Every scan is anchored to a Bitcoin block. This creates an immutable proof chain:

```javascript
const { BTCAnchor } = require('guarddog');

const btc = new BTCAnchor();
await btc.fetchBlock();  // Get current BTC block

const proof = btc.anchor({ findings: [...], merkle: '...' });
// → { blockHeight, blockHash, proofHash, anchoredAt }

btc.verify(data, proof);  // true/false
```

## Rainbow Table

Scans `node_modules` for vulnerability patterns and hashes them for indexed evidence:

```javascript
const { RainbowTable } = require('guarddog');

const rainbow = new RainbowTable();
await rainbow.scanDirectory('./node_modules');

rainbow.getAll();             // All findings sorted by severity
rainbow.getModuleSummaries(); // Per-module risk scores
rainbow.getCategoryBreakdown(); // Category stats
rainbow.merkleRoot();         // Cryptographic root of all findings
```

### Patterns detected:

| Pattern | Category | Severity |
|---------|----------|----------|
| `eval()` | Code execution | CRITICAL |
| `new Function()` | Code execution | CRITICAL |
| `child_process.exec` | Command injection | CRITICAL |
| `__proto__` | Prototype pollution | HIGH |
| `new Buffer()` | Buffer overflow | MEDIUM |
| ReDoS patterns | Regex DOS | MEDIUM |
| `process.env` | Env leak | LOW |

## Token Distiller

Reduces token surface via vowel-drop compression:

```javascript
const { TokenDistiller } = require('guarddog');

const dist = new TokenDistiller();
dist.distill('hello world');  // → 'hllwrld' (~36% compression)
dist.hashPrompt('my prompt'); // → { promptHash, distilledHash }
dist.generateKey(881234, findings); // → GD_881234_a1b2c3d4...
```

## Dashboard

Three-page HTMX dashboard on `http://localhost:7733`:

1. **Dashboard** — BTC anchor, vulnerability summary, category breakdown
2. **Rainbow Table** — Hash-indexed findings with severity badges
3. **Module Analysis** — Per-module risk scores and categories

## GentlyOS Integration

GuardDog is Tier 0 of the sovereignty stack. Every IO path:

- **Pane A chat input** → GuardDog scans before Claude sees it
- **File drag-to-chat** → GuardDog sanitizes filenames + content
- **CLI chain commands** → GuardDog validates no injected invisibles
- **Token/key storage** → TokenVault cleans before .env
- **Feed chain injection** → GuardDog verifies fork source integrity
- **Chrome Claude ops** → GuardDog validates every string agents read
- **Context key rotation** → GuardDog ensures symbols aren't replaced

### Rust crate

The `rust/` directory contains `gently-guarddog`, a native Rust implementation
for integration with the 17 GentlyOS crates via IPC:

```rust
use gently_guarddog::GuardDog;

let gd = GuardDog::new();
let scan = gd.scan("pаypal.com");  // threat_level: 7, blocked: true
let clean = gd.clean("gооgle.com"); // cleaned: "google.com"
```

## Files

```
guarddog/
├── index.js              # Unified exports + factory
├── package.json
├── LICENSE.md             # GentlyOS Sovereign License v1.0
├── README.md
├── lib/
│   ├── guarddog.js        # Core: detection, normalization, vault
│   ├── btc-anchor.js      # BTC block timestamping
│   ├── rainbow.js         # Vulnerability rainbow table
│   └── distiller.js       # Token distillation + key generation
├── cli/
│   └── guarddog.js        # CLI tool (init, scan, dashboard)
├── dashboard/
│   └── server.js          # HTMX dashboard
├── rust/
│   ├── Cargo.toml
│   └── src/lib.rs         # Native Rust implementation
└── test/
    └── test.js            # Full test suite
```

## License

**GentlyOS Sovereign License v1.0**

Free to USE, PROTECT, and DEPLOY.
Reverse engineering, derivative works, and competitive use require
a written license agreement.

Contact: licensing@gentlyos.io

---

*Guard the input. Clean the aperture. Timestamp the evidence. 🐕*
