-- Middle Management Validation System
-- Two validators required for multi-governed entities
-- Version: 1.0.0

-- ============================================
-- GOVERNANCE TABLES
-- ============================================

-- Primary governance assignments
CREATE TABLE IF NOT EXISTS governance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    governor_dept TEXT NOT NULL REFERENCES departments(id),
    governor_role TEXT NOT NULL REFERENCES agent_roles(id),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, governor_dept)
);

-- Validator assignments (middle management)
CREATE TABLE IF NOT EXISTS validators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    validator_role TEXT NOT NULL,
    validator_dept TEXT NOT NULL REFERENCES departments(id),
    validation_order INTEGER DEFAULT 1,  -- 1 = first validator, 2 = second
    is_required BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instruction templates for governance paths
CREATE TABLE IF NOT EXISTS instruction_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_dept TEXT NOT NULL REFERENCES departments(id),
    to_dept TEXT NOT NULL REFERENCES departments(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'modify', 'delete', 'execute', 'confess')),
    template TEXT NOT NULL,
    requires_validation BOOLEAN DEFAULT TRUE,
    validator_count INTEGER DEFAULT 1,
    escalation_threshold INTEGER DEFAULT 5
);

-- Validation requests
CREATE TABLE IF NOT EXISTS validation_requests (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    change_type TEXT NOT NULL,
    change_description TEXT,
    requested_by TEXT NOT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'escalated')),
    codie_instruction TEXT
);

-- Validation responses
CREATE TABLE IF NOT EXISTS validation_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL REFERENCES validation_requests(id),
    validator_role TEXT NOT NULL,
    validator_dept TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approve', 'deny', 'escalate', 'request_info')),
    instruction TEXT,
    responded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CHURCH-DEPARTMENT INTEGRATION
-- ============================================

-- Church roles mapped to departments
CREATE TABLE IF NOT EXISTS church_department_map (
    church_role TEXT PRIMARY KEY CHECK (church_role IN ('PRIEST', 'ANGEL', 'DEMON')),
    reports_to_dept TEXT NOT NULL REFERENCES departments(id),
    function_name TEXT NOT NULL,
    tools TEXT,  -- JSON array of available tools
    governs TEXT  -- JSON array of what this role governs
);

-- Confession routing rules
CREATE TABLE IF NOT EXISTS confession_routing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sin_type TEXT NOT NULL,
    severity_min INTEGER,
    severity_max INTEGER,
    handling_priest TEXT DEFAULT 'PRIEST',
    validator_dept TEXT REFERENCES departments(id),
    escalation_dept TEXT REFERENCES departments(id),
    auto_escalate_after INTEGER DEFAULT 3  -- attempts before escalation
);

-- ============================================
-- SEED DATA: GOVERNANCE ASSIGNMENTS
-- ============================================

-- TIER 0: Foundation (governed by FOUNDATION, validated by SECURITY)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C001', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-core
    ('C002', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-codie
    ('C003', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-artisan
    ('C004', 'FOUNDATION', 'MAINTAINER', TRUE);  -- gently-visual

INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C001', 'AUDITOR', 'SECURITY', 1),
    ('C002', 'AUDITOR', 'SECURITY', 1),
    ('C003', 'AUDITOR', 'SECURITY', 1),
    ('C004', 'AUDITOR', 'SECURITY', 1);

-- TIER 1: Core dependents (governed by FOUNDATION, validated by KNOWLEDGE)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C005', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-audio
    ('C006', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-btc
    ('C007', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-dance
    ('C008', 'FOUNDATION', 'MAINTAINER', TRUE),  -- gently-cipher
    ('C009', 'FOUNDATION', 'MAINTAINER', TRUE);  -- gently-sim

INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C005', 'AUDITOR', 'KNOWLEDGE', 1),
    ('C006', 'AUDITOR', 'KNOWLEDGE', 1),
    ('C007', 'AUDITOR', 'KNOWLEDGE', 1),
    ('C008', 'AUDITOR', 'SECURITY', 1),  -- cipher validated by security
    ('C009', 'AUDITOR', 'SECURITY', 1);  -- sim validated by security

-- TIER 2: Knowledge layer (governed by KNOWLEDGE, validated by INTELLIGENCE)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C010', 'KNOWLEDGE', 'MAINTAINER', TRUE),   -- gently-feed
    ('C011', 'KNOWLEDGE', 'MAINTAINER', TRUE),   -- gently-ipfs
    ('C012', 'KNOWLEDGE', 'MAINTAINER', TRUE),   -- gently-network
    ('C013', 'SECURITY', 'MAINTAINER', TRUE);    -- gently-security (special: security governs itself)

INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C010', 'AUDITOR', 'INTELLIGENCE', 1),
    ('C011', 'AUDITOR', 'INTELLIGENCE', 1),
    ('C012', 'AUDITOR', 'SECURITY', 1),
    ('C013', 'ARCHITECT', 'ROOT', 1);  -- security changes need architect approval

-- TIER 3: Intelligence layer (governed by INTELLIGENCE, validated by SECURITY)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C014', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-alexandria
    ('C015', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-search
    ('C016', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-inference
    ('C017', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-mcp
    ('C018', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-architect
    ('C019', 'INTELLIGENCE', 'MAINTAINER', TRUE);  -- gently-micro

INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C014', 'AUDITOR', 'SECURITY', 1),
    ('C015', 'AUDITOR', 'SECURITY', 1),
    ('C016', 'AUDITOR', 'SECURITY', 1),
    ('C017', 'AUDITOR', 'SECURITY', 1),
    ('C018', 'AUDITOR', 'SECURITY', 1),
    ('C019', 'AUDITOR', 'SECURITY', 1);

-- TIER 4: Integration layer (MULTI-GOVERNED - requires 2 validators)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C020', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-agents (primary: intelligence)
    ('C020', 'FOUNDATION', 'MAINTAINER', FALSE),   -- gently-agents (secondary: foundation)
    ('C021', 'INTELLIGENCE', 'MAINTAINER', TRUE),  -- gently-brain
    ('C021', 'KNOWLEDGE', 'MAINTAINER', FALSE),    -- gently-brain (secondary)
    ('C022', 'NETWORK', 'MAINTAINER', TRUE),       -- gently-gateway
    ('C022', 'SECURITY', 'MAINTAINER', FALSE),     -- gently-gateway (secondary: security)
    ('C023', 'SECURITY', 'MAINTAINER', TRUE),      -- gently-guardian
    ('C023', 'FOUNDATION', 'MAINTAINER', FALSE),   -- gently-guardian (secondary)
    ('C024', 'SECURITY', 'MAINTAINER', TRUE);      -- gently-sploit

-- TIER 4: Two validators required
INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C020', 'AUDITOR', 'SECURITY', 1),
    ('C020', 'AUDITOR', 'FOUNDATION', 2),
    ('C021', 'AUDITOR', 'SECURITY', 1),
    ('C021', 'AUDITOR', 'KNOWLEDGE', 2),
    ('C022', 'AUDITOR', 'SECURITY', 1),
    ('C022', 'AUDITOR', 'INTELLIGENCE', 2),
    ('C023', 'AUDITOR', 'FOUNDATION', 1),
    ('C023', 'AUDITOR', 'INTELLIGENCE', 2),
    ('C024', 'ARCHITECT', 'ROOT', 1),  -- sploit needs architect
    ('C024', 'AUDITOR', 'FOUNDATION', 2);

-- TIER 5: Application layer (governed by APPLICATION, validated by all tier heads)
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governor_role, is_primary) VALUES
    ('C025', 'APPLICATION', 'MAINTAINER', TRUE),   -- gently-web
    ('B001', 'APPLICATION', 'MAINTAINER', TRUE),   -- gently-cli
    ('B002', 'APPLICATION', 'MAINTAINER', TRUE);   -- gentlyos-tui

INSERT OR IGNORE INTO validators (entity_id, validator_role, validator_dept, validation_order) VALUES
    ('C025', 'AUDITOR', 'SECURITY', 1),
    ('C025', 'AUDITOR', 'INTELLIGENCE', 2),
    ('B001', 'ARCHITECT', 'ROOT', 1),  -- CLI needs architect
    ('B001', 'AUDITOR', 'SECURITY', 2),
    ('B002', 'AUDITOR', 'SECURITY', 1),
    ('B002', 'AUDITOR', 'INTELLIGENCE', 2);

-- ============================================
-- SEED DATA: CHURCH-DEPARTMENT MAPPING
-- ============================================

INSERT OR IGNORE INTO church_department_map VALUES
    ('PRIEST', 'SECURITY', 'confession_handler',
     '["prescribe_penance", "consult_bible", "escalate", "absolve"]',
     '["confessions", "penances", "absolutions", "scripture_lookup"]'),
    ('ANGEL', 'INTELLIGENCE', 'monitor',
     '["watch_branches", "detect_failures", "create_confession", "verify_fix"]',
     '["monitoring", "alerting", "reporting", "verification"]'),
    ('DEMON', 'FOUNDATION', 'executor',
     '["execute_penance", "isolate_sandbox", "run_tests", "apply_fix"]',
     '["execution", "isolation", "testing", "application"]');

-- ============================================
-- SEED DATA: CONFESSION ROUTING
-- ============================================

INSERT OR IGNORE INTO confession_routing (sin_type, severity_min, severity_max, handling_priest, validator_dept, escalation_dept, auto_escalate_after) VALUES
    ('compile', 1, 5, 'PRIEST', 'FOUNDATION', 'SECURITY', 3),
    ('compile', 6, 10, 'PRIEST', 'SECURITY', 'ROOT', 2),
    ('test', 1, 5, 'PRIEST', 'INTELLIGENCE', 'SECURITY', 3),
    ('test', 6, 10, 'PRIEST', 'SECURITY', 'ROOT', 2),
    ('runtime', 1, 5, 'PRIEST', 'FOUNDATION', 'INTELLIGENCE', 3),
    ('runtime', 6, 10, 'PRIEST', 'SECURITY', 'ROOT', 2),
    ('logic', 1, 5, 'PRIEST', 'INTELLIGENCE', 'KNOWLEDGE', 5),
    ('logic', 6, 10, 'PRIEST', 'SECURITY', 'ROOT', 2),
    ('security', 1, 10, 'PRIEST', 'SECURITY', 'ROOT', 1);  -- security always escalates fast

-- ============================================
-- SEED DATA: INSTRUCTION TEMPLATES
-- ============================================

INSERT OR IGNORE INTO instruction_templates (from_dept, to_dept, action_type, template, requires_validation, validator_count, escalation_threshold) VALUES
    -- Foundation changes
    ('FOUNDATION', 'SECURITY', 'modify',
     'pug VALIDATE_FOUNDATION_CHANGE\nfence\n  bone NOT: break crypto primitives\n  bone NOT: expose secrets\nbark change <- @request\ncali security_review(change)\nbiz -> approved_change',
     TRUE, 1, 5),

    -- Knowledge changes
    ('KNOWLEDGE', 'INTELLIGENCE', 'modify',
     'pug VALIDATE_KNOWLEDGE_CHANGE\nfence\n  bone NOT: corrupt graph\n  bone NOT: lose data\nbark change <- @request\ncali intelligence_review(change)\nbiz -> approved_change',
     TRUE, 1, 5),

    -- Intelligence changes
    ('INTELLIGENCE', 'SECURITY', 'modify',
     'pug VALIDATE_INTELLIGENCE_CHANGE\nfence\n  bone NOT: leak prompts\n  bone NOT: bypass filters\nbark change <- @request\ncali security_review(change)\nbiz -> approved_change',
     TRUE, 1, 5),

    -- Security changes (need architect)
    ('SECURITY', 'ROOT', 'modify',
     'pug VALIDATE_SECURITY_CHANGE\nfence\n  bone NOT: weaken defenses\n  bone NOT: disable daemons\nbark change <- @request\ncali architect_review(change)\ncali security_review(change)\nbiz -> approved_change',
     TRUE, 2, 3),

    -- Application changes
    ('APPLICATION', 'SECURITY', 'modify',
     'pug VALIDATE_APPLICATION_CHANGE\nfence\n  bone NOT: expose internals\n  bone NOT: bypass gateway\nbark change <- @request\ncali security_review(change)\nbiz -> approved_change',
     TRUE, 1, 5),

    -- Confession handling
    ('PRIEST', 'SECURITY', 'confess',
     'pug HANDLE_CONFESSION\nbark confession <- @angel/detected\ncali lookup_scripture(confession.sin_type)\ncali prescribe_penance(confession)\nbiz -> penance\nanchor #confession_log',
     TRUE, 1, 3),

    -- Execution
    ('DEMON', 'FOUNDATION', 'execute',
     'pug EXECUTE_PENANCE\nfence\n  bone NOT: execute outside sandbox\n  bone NOT: skip tests\nbark penance <- @priest/prescribed\ncali isolate(penance.isolation_level)\ncali execute(penance.codie_instruction)\ncali verify(penance.tests)\nbiz -> result\nanchor #execution_log',
     TRUE, 1, 3);

-- ============================================
-- VIEWS FOR GOVERNANCE
-- ============================================

-- View: Multi-governed entities requiring 2 validators
CREATE VIEW IF NOT EXISTS multi_governed_entities AS
SELECT
    e.id,
    e.name,
    e.tier,
    COUNT(DISTINCT g.governor_dept) as governor_count,
    GROUP_CONCAT(DISTINCT g.governor_dept) as governors,
    COUNT(DISTINCT v.validator_dept) as validator_count,
    GROUP_CONCAT(DISTINCT v.validator_dept) as validators
FROM entities e
LEFT JOIN governance g ON e.id = g.entity_id
LEFT JOIN validators v ON e.id = v.entity_id
GROUP BY e.id
HAVING governor_count > 1 OR validator_count > 1;

-- View: Complete governance chain
CREATE VIEW IF NOT EXISTS governance_chain AS
SELECT
    e.id as entity_id,
    e.name as entity_name,
    e.tier,
    e.codie,
    e.sephira,
    g.governor_dept,
    g.governor_role,
    g.is_primary,
    v.validator_dept,
    v.validator_role,
    v.validation_order
FROM entities e
LEFT JOIN governance g ON e.id = g.entity_id
LEFT JOIN validators v ON e.id = v.entity_id
ORDER BY e.tier, e.name, g.is_primary DESC, v.validation_order;

-- View: Church hierarchy
CREATE VIEW IF NOT EXISTS church_hierarchy AS
SELECT
    c.church_role,
    c.reports_to_dept,
    d.name as dept_name,
    d.manager_role,
    c.function_name,
    c.tools,
    c.governs
FROM church_department_map c
JOIN departments d ON c.reports_to_dept = d.id;

-- View: Pending validations by department
CREATE VIEW IF NOT EXISTS pending_validations AS
SELECT
    v.validator_dept,
    COUNT(*) as pending_count,
    GROUP_CONCAT(vr.id) as request_ids
FROM validation_requests vr
JOIN validators v ON vr.entity_id = v.entity_id
WHERE vr.status = 'pending'
GROUP BY v.validator_dept;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_governance_entity ON governance(entity_id);
CREATE INDEX IF NOT EXISTS idx_governance_dept ON governance(governor_dept);
CREATE INDEX IF NOT EXISTS idx_validators_entity ON validators(entity_id);
CREATE INDEX IF NOT EXISTS idx_validators_dept ON validators(validator_dept);
CREATE INDEX IF NOT EXISTS idx_validation_requests_status ON validation_requests(status);
CREATE INDEX IF NOT EXISTS idx_confession_routing_type ON confession_routing(sin_type);
