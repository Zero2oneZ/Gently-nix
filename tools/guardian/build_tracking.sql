-- ============================================
-- GentlyOS Build Tracking SQL
-- Execute after guardian.sql to add build-specific views and procedures
-- Usage: sqlite3 ~/.gently/guardian.db < build_tracking.sql
-- ============================================

-- ============================================
-- BUILD SESSION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS build_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_name TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'aborted')),
    current_tier INTEGER DEFAULT 0,
    current_phase TEXT,
    total_crates INTEGER,
    built_crates INTEGER DEFAULT 0,
    failed_crates INTEGER DEFAULT 0,
    btc_anchor_block INTEGER,
    btc_anchor_hash TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS build_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES build_sessions(id),
    entity_id TEXT REFERENCES entities(id),
    step_type TEXT CHECK (step_type IN ('build', 'test', 'validate', 'deploy', 'rollback')),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    success BOOLEAN,
    command TEXT,
    output TEXT,
    error_message TEXT
);

-- ============================================
-- SHELF STATE TRACKING (ONE SCENE)
-- ============================================

CREATE TABLE IF NOT EXISTS shelf_states (
    id TEXT PRIMARY KEY,
    shelf_name TEXT NOT NULL UNIQUE,
    state TEXT CHECK (state IN ('hidden', 'minimized', 'visible', 'focused', 'fullscreen')) DEFAULT 'hidden',
    position TEXT CHECK (position IN ('left', 'right', 'bottom', 'top', 'center', 'floating')) DEFAULT 'center',
    entity_id TEXT REFERENCES entities(id),
    width_percent REAL DEFAULT 100.0,
    height_percent REAL DEFAULT 100.0,
    z_index INTEGER DEFAULT 0,
    transition_duration_ms INTEGER DEFAULT 300,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shelf_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shelf_id TEXT REFERENCES shelf_states(id),
    from_state TEXT,
    to_state TEXT,
    triggered_by TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed ONE SCENE shelf states
INSERT OR IGNORE INTO shelf_states (id, shelf_name, state, position, entity_id, z_index) VALUES
    ('SHELF_CANVAS', 'Main Canvas', 'fullscreen', 'center', 'C025', 0),
    ('SHELF_DOC', 'Document', 'hidden', 'right', 'C029', 10),
    ('SHELF_GOOEY', 'Gooey', 'hidden', 'bottom', 'C030', 10),
    ('SHELF_TERM', 'Terminal', 'hidden', 'bottom', 'B002', 10),
    ('SHELF_CLAUDE', 'Claude GOO', 'visible', 'left', 'C027', 5),
    ('SHELF_ALEX', 'Alexandria', 'hidden', 'right', 'C014', 10),
    ('SHELF_FEED', 'Living Feed', 'hidden', 'left', 'C010', 10);

-- ============================================
-- BUILD PROGRESS VIEWS
-- ============================================

DROP VIEW IF EXISTS build_progress;
CREATE VIEW build_progress AS
SELECT
    tier,
    COUNT(*) as total_crates,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as built,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as building,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'pending' OR status = 'planned' THEN 1 ELSE 0 END) as pending,
    ROUND(100.0 * SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) / COUNT(*), 1) as percent_complete
FROM entities
WHERE entity_type IN ('crate', 'binary')
GROUP BY tier
ORDER BY tier;

DROP VIEW IF EXISTS active_build_issues;
CREATE VIEW active_build_issues AS
SELECT
    c.id as confession_id,
    c.penitent_path,
    c.sin_type,
    c.severity,
    c.message,
    c.confession_time,
    p.codie_instruction as penance,
    p.isolation_level,
    COALESCE(
        (SELECT COUNT(*) FROM penance_attempts pa WHERE pa.penance_id = p.id),
        0
    ) as attempt_count
FROM confessions c
LEFT JOIN penances p ON c.id = p.confession_id
WHERE c.status IN ('pending', 'processing')
ORDER BY c.severity DESC, c.confession_time ASC;

DROP VIEW IF EXISTS tier_dependency_chain;
CREATE VIEW tier_dependency_chain AS
SELECT
    e1.tier as from_tier,
    e1.name as from_crate,
    e2.tier as to_tier,
    e2.name as to_crate,
    d.link_type,
    d.strength,
    e1.status as from_status,
    e2.status as to_status
FROM daath_links d
JOIN entities e1 ON d.from_entity = e1.id
JOIN entities e2 ON d.to_entity = e2.id
WHERE e1.entity_type = 'crate' AND e2.entity_type = 'crate'
ORDER BY e1.tier, e1.name, e2.tier, e2.name;

DROP VIEW IF EXISTS governance_validation_matrix;
CREATE VIEW governance_validation_matrix AS
SELECT
    e.id,
    e.name,
    e.tier,
    e.status,
    g.governor_dept as primary_governor,
    (SELECT governor_dept FROM governance WHERE entity_id = e.id AND governance_type = 'secondary') as secondary_governor,
    GROUP_CONCAT(DISTINCT v.name || ' (' || v.source_dept || ')') as validators,
    COUNT(DISTINCT va.validator_id) as validator_count,
    CASE e.tier
        WHEN 4 THEN 'REQUIRES_DUAL'
        WHEN 5 THEN 'REQUIRES_ALL_HEADS'
        ELSE 'SINGLE_VALIDATOR'
    END as validation_requirement
FROM entities e
LEFT JOIN governance g ON e.id = g.entity_id AND g.governance_type = 'primary'
LEFT JOIN validator_assignments va ON e.id = va.entity_id
LEFT JOIN validators v ON va.validator_id = v.id
WHERE e.entity_type IN ('crate', 'binary')
GROUP BY e.id
ORDER BY e.tier, e.name;

DROP VIEW IF EXISTS one_scene_status;
CREATE VIEW one_scene_status AS
SELECT
    ss.shelf_name,
    ss.state,
    ss.position,
    ss.z_index,
    e.name as crate_name,
    e.tier,
    e.status as crate_status,
    e.sephira,
    ss.updated_at as last_transition
FROM shelf_states ss
JOIN entities e ON ss.entity_id = e.id
ORDER BY ss.z_index, ss.shelf_name;

-- ============================================
-- BUILD HELPER PROCEDURES (via triggers)
-- ============================================

-- Auto-update build session on entity status change
CREATE TRIGGER IF NOT EXISTS update_build_session_on_entity_change
AFTER UPDATE OF status ON entities
WHEN NEW.status = 'active' AND OLD.status != 'active'
BEGIN
    UPDATE build_sessions
    SET built_crates = built_crates + 1,
        current_tier = (SELECT MAX(tier) FROM entities WHERE status = 'active'),
        notes = notes || char(10) || datetime('now') || ': ' || NEW.name || ' built'
    WHERE status = 'in_progress';
END;

CREATE TRIGGER IF NOT EXISTS update_build_session_on_failure
AFTER UPDATE OF status ON entities
WHEN NEW.status = 'blocked' AND OLD.status != 'blocked'
BEGIN
    UPDATE build_sessions
    SET failed_crates = failed_crates + 1,
        notes = notes || char(10) || datetime('now') || ': ' || NEW.name || ' FAILED'
    WHERE status = 'in_progress';
END;

-- Log shelf transitions
CREATE TRIGGER IF NOT EXISTS log_shelf_transition
AFTER UPDATE OF state ON shelf_states
BEGIN
    INSERT INTO shelf_transitions (shelf_id, from_state, to_state, triggered_by)
    VALUES (NEW.id, OLD.state, NEW.state, 'system');

    UPDATE shelf_states SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- ============================================
-- BUILD INITIALIZATION PROCEDURE
-- ============================================

-- Call this to start a new build session
-- Usage: INSERT INTO build_sessions (session_name, total_crates) SELECT 'Full Build', COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary');

-- ============================================
-- CRATE BUILD ORDER
-- ============================================

-- Returns optimal build order respecting dependencies
DROP VIEW IF EXISTS crate_build_order;
CREATE VIEW crate_build_order AS
WITH RECURSIVE build_order(id, name, tier, build_level, path) AS (
    -- Start with crates that have no dependencies on other crates
    SELECT
        e.id,
        e.name,
        e.tier,
        0,
        e.id
    FROM entities e
    WHERE e.entity_type = 'crate'
      AND NOT EXISTS (
          SELECT 1 FROM daath_links d
          JOIN entities e2 ON d.to_entity = e2.id
          WHERE d.from_entity = e.id
            AND e2.entity_type = 'crate'
            AND d.link_type = 'depends'
      )

    UNION ALL

    -- Add crates whose dependencies are already in the build order
    SELECT
        e.id,
        e.name,
        e.tier,
        bo.build_level + 1,
        bo.path || '->' || e.id
    FROM entities e
    JOIN daath_links d ON d.from_entity = e.id
    JOIN build_order bo ON d.to_entity = bo.id
    WHERE e.entity_type = 'crate'
      AND d.link_type = 'depends'
      AND e.id NOT IN (SELECT id FROM build_order)
)
SELECT
    id,
    name,
    tier,
    MIN(build_level) as build_level,
    (SELECT status FROM entities WHERE entities.id = build_order.id) as status
FROM build_order
GROUP BY id, name, tier
ORDER BY tier, build_level, name;

-- ============================================
-- PTC CHECKPOINT TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS ptc_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT REFERENCES entities(id),
    checkpoint_type TEXT CHECK (checkpoint_type IN ('crypto', 'vault', 'hash', 'network', 'security')),
    description TEXT,
    required_approvers TEXT,  -- JSON array
    approved_by TEXT,  -- JSON array
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'deferred')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
);

-- Seed PTC checkpoints for security-critical crates
INSERT OR IGNORE INTO ptc_checkpoints (entity_id, checkpoint_type, description, required_approvers) VALUES
    ('C001', 'crypto', 'XOR split-knowledge, Berlin Clock, genesis keys', '["SECURITY"]'),
    ('C002', 'vault', 'SourceKind::Vault access patterns', '["SECURITY"]'),
    ('C003', 'hash', 'blake3 Torus ID, genesis anchor', '["SECURITY"]'),
    ('C006', 'crypto', 'BTC block anchoring', '["SECURITY", "FOUNDATION"]'),
    ('C013', 'security', 'FAFO system, 16 daemons', '["ARCHITECT", "SECURITY"]'),
    ('C022', 'network', 'API gateway security', '["SECURITY", "NETWORK"]'),
    ('C023', 'security', 'Hardware validation', '["SECURITY", "FOUNDATION"]'),
    ('C024', 'security', 'Exploitation framework', '["ARCHITECT", "SECURITY"]'),
    ('C027', 'hash', 'GOO field integrity', '["SECURITY"]');

-- ============================================
-- SUMMARY QUERIES
-- ============================================

-- Quick build status
-- SELECT * FROM build_progress;

-- Current issues
-- SELECT * FROM active_build_issues;

-- ONE SCENE shelf status
-- SELECT * FROM one_scene_status;

-- Governance validation matrix
-- SELECT * FROM governance_validation_matrix;

-- Optimal build order
-- SELECT * FROM crate_build_order;

-- PTC checkpoints needing approval
-- SELECT * FROM ptc_checkpoints WHERE status = 'pending';

-- ============================================
-- REPORT GENERATION
-- ============================================

DROP VIEW IF EXISTS build_report;
CREATE VIEW build_report AS
SELECT
    'BUILD_STATUS' as report_type,
    json_object(
        'total_crates', (SELECT COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary')),
        'built', (SELECT COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary') AND status = 'active'),
        'in_progress', (SELECT COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary') AND status = 'in_progress'),
        'failed', (SELECT COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary') AND status = 'blocked'),
        'pending', (SELECT COUNT(*) FROM entities WHERE entity_type IN ('crate', 'binary') AND status IN ('pending', 'planned')),
        'pending_confessions', (SELECT COUNT(*) FROM confessions WHERE status IN ('pending', 'processing')),
        'pending_ptc', (SELECT COUNT(*) FROM ptc_checkpoints WHERE status = 'pending'),
        'one_scene_shelves', (SELECT COUNT(*) FROM shelf_states),
        'generated_at', datetime('now')
    ) as report_data;
