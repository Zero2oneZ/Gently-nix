// ══════════════════════════════════════════════════════════════════════════════
// GUARDDOG v1.0.0
// Tier 0 IO Defense for GentlyOS
// ══════════════════════════════════════════════════════════════════════════════
//
// Guard the input. Clean the aperture. Timestamp the evidence.
//
// Copyright (c) 2026 Thomas Lee / GentlyOS Foundation
// License: GentlyOS Sovereign License v1.0
// ══════════════════════════════════════════════════════════════════════════════

'use strict';

const {
    GuardDog,
    TokenVault,
    InputSanitizer,
    HOMOGLYPHS,
    INVISIBLE_CHARS,
    INVISIBLE_NAMES,
    RTL_OVERRIDES,
    SPECIAL_SPACES,
    KEY_POSITIONS,
} = require('./lib/guarddog');

const { BTCAnchor } = require('./lib/btc-anchor');
const { RainbowTable, VULN_PATTERNS, SEVERITY_WEIGHT } = require('./lib/rainbow');
const { TokenDistiller } = require('./lib/distiller');
const { GuardDogDOM } = require('./lib/guarddog-dom');
const { WorkbenchPane, ForkTree, ScriptCage, PatternLinker, PythonBridge } = require('./lib/workbench-pane');
const { EnvironmentValidator, ValidationStatus, detectHardware, computeFingerprint } = require('./lib/env-validator');

// ═══════════════════════════════════════════════════════════════════════════
// Quick-start factory
// ═══════════════════════════════════════════════════════════════════════════

function createGuardDog(opts = {}) {
    const guard = new GuardDog(opts);
    const vault = new TokenVault(guard);
    const sanitizer = new InputSanitizer({ guard, ...opts });
    const anchor = new BTCAnchor();
    const rainbow = new RainbowTable();
    const distiller = new TokenDistiller(opts);

    return {
        guard,
        vault,
        sanitizer,
        anchor,
        rainbow,
        distiller,

        // Convenience: full pipeline
        async init(nodeModulesDir) {
            // 1. Fetch BTC block
            try { await anchor.fetchBlock(); }
            catch { anchor.localFallback(); }

            // 2. Scan node_modules if provided
            let scanResult = null;
            if (nodeModulesDir) {
                scanResult = await rainbow.scanDirectory(nodeModulesDir);
            }

            // 3. Generate key
            const findings = rainbow.getAll();
            const key = distiller.generateKey(
                anchor.currentBlock?.height,
                findings
            );

            // 4. Anchor everything
            const manifestAnchor = anchor.anchor({
                key: key.key,
                findings: findings.length,
                merkle: rainbow.merkleRoot(),
            });

            return {
                block: anchor.currentBlock,
                scan: scanResult,
                key,
                anchor: manifestAnchor,
                rainbow: rainbow.toGDT(),
            };
        },

        // Convenience: process any IO
        process(input) { return sanitizer.process(input); },
        scan(input) { return guard.scan(input); },
        clean(input) { return guard.clean(input); },
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    // Core Classes
    GuardDog,
    TokenVault,
    InputSanitizer,
    BTCAnchor,
    RainbowTable,
    TokenDistiller,

    // DOM Integration
    GuardDogDOM,

    // Workbench Components
    WorkbenchPane,
    ForkTree,
    ScriptCage,
    PatternLinker,
    PythonBridge,

    // Environment Validation
    EnvironmentValidator,
    ValidationStatus,
    detectHardware,
    computeFingerprint,

    // Factory
    createGuardDog,

    // Constants
    HOMOGLYPHS,
    INVISIBLE_CHARS,
    INVISIBLE_NAMES,
    RTL_OVERRIDES,
    SPECIAL_SPACES,
    KEY_POSITIONS,
    VULN_PATTERNS,
    SEVERITY_WEIGHT,
};
