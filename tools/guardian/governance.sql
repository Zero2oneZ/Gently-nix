-- ============================================
-- GOVERNANCE HIERARCHY EXTENSION
-- Guardian Database Extension for GentlyOS
-- ============================================
-- Extends guardian.db with complete governance structure
-- including governors, validators, instructions, and church integration
--
-- Execute with: sqlite3 ~/.gently/guardian.db < governance.sql
-- ============================================

-- ============================================
-- TABLE 1: GOVERNANCE (Entity -> Governor Mapping)
-- ============================================

CREATE TABLE IF NOT EXISTS governance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    governor_dept TEXT NOT NULL REFERENCES departments(id),
    governance_type TEXT NOT NULL CHECK (governance_type IN ('primary', 'secondary', 'advisory')),
    priority INTEGER DEFAULT 1,  -- Lower = higher priority for multi-governed
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, governor_dept, governance_type)
);

-- ============================================
-- TABLE 2: VALIDATORS (Middle Management Agents)
-- ============================================

CREATE TABLE IF NOT EXISTS validators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    source_dept TEXT NOT NULL REFERENCES departments(id),
    validates_tier INTEGER NOT NULL CHECK (validates_tier BETWEEN 0 AND 5),
    specialty TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    validation_count INTEGER DEFAULT 0,
    last_validation DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Validator assignments to entities
CREATE TABLE IF NOT EXISTS validator_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL REFERENCES entities(id),
    validator_id INTEGER NOT NULL REFERENCES validators(id),
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('primary', 'secondary')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, validator_id)
);

-- ============================================
-- TABLE 3: INSTRUCTIONS (Governance Path Templates)
-- ============================================

CREATE TABLE IF NOT EXISTS instructions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tier INTEGER NOT NULL CHECK (tier BETWEEN 0 AND 5),
    governor_dept TEXT NOT NULL REFERENCES departments(id),
    validator_dept TEXT REFERENCES departments(id),
    instruction_type TEXT NOT NULL CHECK (instruction_type IN ('approval', 'review', 'audit', 'escalation', 'penance')),
    template TEXT NOT NULL,  -- CODIE instruction template
    natural_language TEXT,   -- Human-readable description
    timeout_seconds INTEGER DEFAULT 3600,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_threshold INTEGER DEFAULT 1,  -- Number of approvals needed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Instruction execution log
CREATE TABLE IF NOT EXISTS instruction_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instruction_id INTEGER NOT NULL REFERENCES instructions(id),
    entity_id TEXT REFERENCES entities(id),
    executed_by TEXT REFERENCES agent_roles(id),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    success BOOLEAN,
    result TEXT,
    approved_by TEXT  -- Comma-separated approvers
);

-- ============================================
-- TABLE 4: CHURCH HIERARCHY
-- ============================================

CREATE TABLE IF NOT EXISTS church_hierarchy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    church_role TEXT NOT NULL CHECK (church_role IN ('TEMPLE', 'PRIEST', 'CONFESSOR', 'ANGEL', 'DEMON', 'SERAPH', 'ARCHON')),
    reports_to_dept TEXT NOT NULL REFERENCES departments(id),
    function_type TEXT NOT NULL CHECK (function_type IN ('confession', 'monitoring', 'execution', 'judgment', 'absolution')),
    mapping_description TEXT NOT NULL,
    sephira TEXT CHECK (sephira IN ('keter','chokmah','binah','daath','chesed','gevurah','tiferet','netzach','hod','yesod','malkuth')),
    codie_permissions TEXT,  -- JSON array of allowed CODIE operations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(church_role, reports_to_dept)
);

-- Church confession routing
CREATE TABLE IF NOT EXISTS confession_routing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sin_type TEXT NOT NULL CHECK (sin_type IN ('compile', 'test', 'runtime', 'logic', 'security')),
    severity_min INTEGER NOT NULL CHECK (severity_min BETWEEN 1 AND 10),
    severity_max INTEGER NOT NULL CHECK (severity_max BETWEEN 1 AND 10),
    routed_to_role TEXT NOT NULL,
    escalation_path TEXT,  -- Next role if unresolved
    timeout_seconds INTEGER DEFAULT 300,
    UNIQUE(sin_type, severity_min, severity_max)
);

-- ============================================
-- INDEXES FOR GOVERNANCE TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_governance_entity ON governance(entity_id);
CREATE INDEX IF NOT EXISTS idx_governance_dept ON governance(governor_dept);
CREATE INDEX IF NOT EXISTS idx_validators_tier ON validators(validates_tier);
CREATE INDEX IF NOT EXISTS idx_validator_assignments_entity ON validator_assignments(entity_id);
CREATE INDEX IF NOT EXISTS idx_instructions_tier ON instructions(tier);
CREATE INDEX IF NOT EXISTS idx_church_role ON church_hierarchy(church_role);
CREATE INDEX IF NOT EXISTS idx_confession_routing_type ON confession_routing(sin_type);

-- ============================================
-- SEED DATA: VALIDATORS
-- ============================================

-- Validators from adjacent departments (per governance rules)
INSERT OR IGNORE INTO validators (name, source_dept, validates_tier, specialty, description) VALUES
    -- TIER 0 validators (from SECURITY)
    ('SecurityValidator_T0', 'SECURITY', 0, 'Foundation Security', 'Validates foundation layer crypto operations'),
    ('HashChainAuditor', 'SECURITY', 0, 'Hash Chain Integrity', 'Audits hash chain continuity in foundation'),

    -- TIER 1 validators (from KNOWLEDGE)
    ('KnowledgeValidator_T1', 'KNOWLEDGE', 1, 'Core Knowledge', 'Validates core layer data integrity'),
    ('AlexandriaAuditor', 'KNOWLEDGE', 1, 'Graph Consistency', 'Audits knowledge graph mutations'),

    -- TIER 2 validators (from INTELLIGENCE)
    ('IntelligenceValidator_T2', 'INTELLIGENCE', 2, 'Knowledge Intelligence', 'Validates knowledge layer reasoning'),
    ('InferenceAuditor', 'INTELLIGENCE', 2, 'Inference Quality', 'Audits inference quality thresholds'),

    -- TIER 3 validators (from SECURITY)
    ('SecurityValidator_T3', 'SECURITY', 3, 'Intelligence Security', 'Validates intelligence layer operations'),
    ('ThreatAuditor', 'SECURITY', 3, 'Threat Detection', 'Audits threat intelligence patterns'),

    -- TIER 4 validators (multi-governed, 2 required)
    ('IntegrationValidator_A', 'FOUNDATION', 4, 'Integration Foundation', 'Primary validator for integration tier'),
    ('IntegrationValidator_B', 'SECURITY', 4, 'Integration Security', 'Secondary validator for integration tier'),
    ('NetworkValidator', 'NETWORK', 4, 'Integration Network', 'Network aspects of integration tier'),
    ('IntelValidator', 'INTELLIGENCE', 4, 'Integration Intelligence', 'Intelligence aspects of integration tier'),

    -- TIER 5 validators (all tier heads)
    ('FoundationHead', 'FOUNDATION', 5, 'Foundation Head', 'Department head for application validation'),
    ('KnowledgeHead', 'KNOWLEDGE', 5, 'Knowledge Head', 'Department head for application validation'),
    ('IntelligenceHead', 'INTELLIGENCE', 5, 'Intelligence Head', 'Department head for application validation'),
    ('SecurityHead', 'SECURITY', 5, 'Security Head', 'Department head for application validation'),
    ('NetworkHead', 'NETWORK', 5, 'Network Head', 'Department head for application validation');

-- ============================================
-- SEED DATA: GOVERNANCE MAPPINGS
-- ============================================

-- TIER 0 (Foundation): Governed by FOUNDATION, validated by SECURITY
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C001', 'FOUNDATION', 'primary', 1, 'gently-core: Foundation tier primary'),
    ('C002', 'FOUNDATION', 'primary', 1, 'gently-codie: Foundation tier primary'),
    ('C003', 'FOUNDATION', 'primary', 1, 'gently-artisan: Foundation tier primary'),
    ('C004', 'FOUNDATION', 'primary', 1, 'gently-visual: Foundation tier primary');

-- TIER 1 (Core): Governed by FOUNDATION, validated by KNOWLEDGE
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C005', 'FOUNDATION', 'primary', 1, 'gently-audio: Core tier primary'),
    ('C006', 'FOUNDATION', 'primary', 1, 'gently-btc: Core tier primary'),
    ('C007', 'FOUNDATION', 'primary', 1, 'gently-dance: Core tier primary'),
    ('C008', 'FOUNDATION', 'primary', 1, 'gently-cipher: Core tier primary'),
    ('C009', 'FOUNDATION', 'primary', 1, 'gently-sim: Core tier primary');

-- TIER 2 (Knowledge): Governed by KNOWLEDGE, validated by INTELLIGENCE
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C010', 'KNOWLEDGE', 'primary', 1, 'gently-feed: Knowledge tier primary'),
    ('C011', 'KNOWLEDGE', 'primary', 1, 'gently-ipfs: Knowledge tier primary'),
    ('C012', 'KNOWLEDGE', 'primary', 1, 'gently-network: Knowledge tier primary'),
    ('C013', 'KNOWLEDGE', 'primary', 1, 'gently-security: Knowledge tier primary');

-- TIER 3 (Intelligence): Governed by INTELLIGENCE, validated by SECURITY
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C014', 'INTELLIGENCE', 'primary', 1, 'gently-alexandria: Intelligence tier primary'),
    ('C015', 'INTELLIGENCE', 'primary', 1, 'gently-search: Intelligence tier primary'),
    ('C016', 'INTELLIGENCE', 'primary', 1, 'gently-inference: Intelligence tier primary'),
    ('C017', 'INTELLIGENCE', 'primary', 1, 'gently-mcp: Intelligence tier primary'),
    ('C018', 'INTELLIGENCE', 'primary', 1, 'gently-architect: Intelligence tier primary'),
    ('C019', 'INTELLIGENCE', 'primary', 1, 'gently-micro: Intelligence tier primary');

-- TIER 4 (Integration): Multi-governed by relevant depts, 2 validators required
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    -- gently-agents: INTELLIGENCE + FOUNDATION
    ('C020', 'INTELLIGENCE', 'primary', 1, 'gently-agents: Primary governor'),
    ('C020', 'FOUNDATION', 'secondary', 2, 'gently-agents: Secondary governor'),

    -- gently-brain: INTELLIGENCE + KNOWLEDGE
    ('C021', 'INTELLIGENCE', 'primary', 1, 'gently-brain: Primary governor'),
    ('C021', 'KNOWLEDGE', 'secondary', 2, 'gently-brain: Secondary governor'),

    -- gently-gateway: NETWORK + SECURITY
    ('C022', 'NETWORK', 'primary', 1, 'gently-gateway: Primary governor'),
    ('C022', 'SECURITY', 'secondary', 2, 'gently-gateway: Secondary governor'),

    -- gently-guardian: SECURITY + FOUNDATION
    ('C023', 'SECURITY', 'primary', 1, 'gently-guardian: Primary governor'),
    ('C023', 'FOUNDATION', 'secondary', 2, 'gently-guardian: Secondary governor'),

    -- gently-sploit: SECURITY + INTELLIGENCE
    ('C024', 'SECURITY', 'primary', 1, 'gently-sploit: Primary governor'),
    ('C024', 'INTELLIGENCE', 'secondary', 2, 'gently-sploit: Secondary governor');

-- TIER 5 (Application): Governed by APPLICATION, validated by all tier heads
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C025', 'APPLICATION', 'primary', 1, 'gently-web: Application tier primary'),
    ('B001', 'APPLICATION', 'primary', 1, 'gently-cli: Application tier primary'),
    ('B002', 'APPLICATION', 'primary', 1, 'gentlyos-tui: Application tier primary');

-- Advisory governance for cross-cutting concerns
INSERT OR IGNORE INTO governance (entity_id, governor_dept, governance_type, priority, notes) VALUES
    ('C013', 'SECURITY', 'advisory', 3, 'Security crate has SECURITY advisory'),
    ('C016', 'KNOWLEDGE', 'advisory', 3, 'Inference has KNOWLEDGE advisory'),
    ('C014', 'KNOWLEDGE', 'advisory', 3, 'Alexandria has KNOWLEDGE advisory'),
    ('C025', 'SECURITY', 'advisory', 3, 'Web has SECURITY advisory');

-- ============================================
-- SEED DATA: VALIDATOR ASSIGNMENTS
-- ============================================

-- TIER 0 validator assignments
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C001', id, 'primary' FROM validators WHERE name = 'SecurityValidator_T0';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C002', id, 'primary' FROM validators WHERE name = 'SecurityValidator_T0';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C003', id, 'primary' FROM validators WHERE name = 'HashChainAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C004', id, 'primary' FROM validators WHERE name = 'HashChainAuditor';

-- TIER 1 validator assignments
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C005', id, 'primary' FROM validators WHERE name = 'KnowledgeValidator_T1';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C006', id, 'primary' FROM validators WHERE name = 'AlexandriaAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C007', id, 'primary' FROM validators WHERE name = 'KnowledgeValidator_T1';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C008', id, 'primary' FROM validators WHERE name = 'AlexandriaAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C009', id, 'primary' FROM validators WHERE name = 'KnowledgeValidator_T1';

-- TIER 2 validator assignments
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C010', id, 'primary' FROM validators WHERE name = 'IntelligenceValidator_T2';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C011', id, 'primary' FROM validators WHERE name = 'InferenceAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C012', id, 'primary' FROM validators WHERE name = 'IntelligenceValidator_T2';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C013', id, 'primary' FROM validators WHERE name = 'InferenceAuditor';

-- TIER 3 validator assignments
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C014', id, 'primary' FROM validators WHERE name = 'SecurityValidator_T3';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C015', id, 'primary' FROM validators WHERE name = 'ThreatAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C016', id, 'primary' FROM validators WHERE name = 'SecurityValidator_T3';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C017', id, 'primary' FROM validators WHERE name = 'ThreatAuditor';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C018', id, 'primary' FROM validators WHERE name = 'SecurityValidator_T3';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C019', id, 'primary' FROM validators WHERE name = 'ThreatAuditor';

-- TIER 4 validator assignments (2 validators required for multi-governed)
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C020', id, 'primary' FROM validators WHERE name = 'IntegrationValidator_A';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C020', id, 'secondary' FROM validators WHERE name = 'IntegrationValidator_B';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C021', id, 'primary' FROM validators WHERE name = 'IntelValidator';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C021', id, 'secondary' FROM validators WHERE name = 'IntegrationValidator_A';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C022', id, 'primary' FROM validators WHERE name = 'NetworkValidator';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C022', id, 'secondary' FROM validators WHERE name = 'IntegrationValidator_B';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C023', id, 'primary' FROM validators WHERE name = 'IntegrationValidator_B';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C023', id, 'secondary' FROM validators WHERE name = 'IntegrationValidator_A';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C024', id, 'primary' FROM validators WHERE name = 'IntegrationValidator_B';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C024', id, 'secondary' FROM validators WHERE name = 'IntelValidator';

-- TIER 5 validator assignments (all tier heads)
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C025', id, 'primary' FROM validators WHERE name = 'FoundationHead';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'C025', id, 'secondary' FROM validators WHERE name = 'KnowledgeHead';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'B001', id, 'primary' FROM validators WHERE name = 'SecurityHead';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'B001', id, 'secondary' FROM validators WHERE name = 'NetworkHead';

INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'B002', id, 'primary' FROM validators WHERE name = 'IntelligenceHead';
INSERT OR IGNORE INTO validator_assignments (entity_id, validator_id, assignment_type)
SELECT 'B002', id, 'secondary' FROM validators WHERE name = 'FoundationHead';

-- ============================================
-- SEED DATA: CHURCH HIERARCHY
-- ============================================

-- PRIEST reports to SECURITY (confession = vulnerability disclosure)
INSERT OR IGNORE INTO church_hierarchy (church_role, reports_to_dept, function_type, mapping_description, sephira, codie_permissions) VALUES
    ('PRIEST', 'SECURITY', 'confession', 'Receives vulnerability disclosures and prescribes remediation', 'gevurah', '["pug","fence","biz","pin"]'),
    ('CONFESSOR', 'SECURITY', 'judgment', 'Evaluates severity of confessed vulnerabilities', 'gevurah', '["fence","pin","bark"]');

-- ANGEL reports to INTELLIGENCE (monitoring = inference)
INSERT OR IGNORE INTO church_hierarchy (church_role, reports_to_dept, function_type, mapping_description, sephira, codie_permissions) VALUES
    ('ANGEL', 'INTELLIGENCE', 'monitoring', 'Watches for failures and anomalies in inference', 'chokmah', '["bark","spin","anchor"]'),
    ('SERAPH', 'INTELLIGENCE', 'judgment', 'Highest tier angel, oversees all monitoring', 'keter', '["bark","spin","anchor","cali"]');

-- DEMON reports to FOUNDATION (execution = core operations)
INSERT OR IGNORE INTO church_hierarchy (church_role, reports_to_dept, function_type, mapping_description, sephira, codie_permissions) VALUES
    ('DEMON', 'FOUNDATION', 'execution', 'Executes penance operations in isolated sandbox', 'malkuth', '["pug","cali","elf","bone"]'),
    ('ARCHON', 'FOUNDATION', 'absolution', 'Grants final absolution after successful penance', 'yesod', '["pug","cali","elf","bone","biz"]');

-- TEMPLE is the sacred space where confessions occur
INSERT OR IGNORE INTO church_hierarchy (church_role, reports_to_dept, function_type, mapping_description, sephira, codie_permissions) VALUES
    ('TEMPLE', 'ROOT', 'confession', 'The sacred space for confession and penance', 'tiferet', '["fence"]');

-- ============================================
-- SEED DATA: CONFESSION ROUTING
-- ============================================

INSERT OR IGNORE INTO confession_routing (sin_type, severity_min, severity_max, routed_to_role, escalation_path, timeout_seconds) VALUES
    -- Compile errors: Low severity to DEMON, high to PRIEST
    ('compile', 1, 3, 'DEMON', 'PRIEST', 300),
    ('compile', 4, 7, 'PRIEST', 'CONFESSOR', 600),
    ('compile', 8, 10, 'CONFESSOR', 'ARCHON', 1800),

    -- Test failures: ANGEL monitors, DEMON executes fixes
    ('test', 1, 3, 'DEMON', 'ANGEL', 300),
    ('test', 4, 7, 'ANGEL', 'SERAPH', 600),
    ('test', 8, 10, 'SERAPH', 'ARCHON', 1800),

    -- Runtime errors: DEMON for minor, PRIEST for major
    ('runtime', 1, 3, 'DEMON', 'PRIEST', 300),
    ('runtime', 4, 7, 'PRIEST', 'ANGEL', 600),
    ('runtime', 8, 10, 'ANGEL', 'ARCHON', 1800),

    -- Logic errors: ANGEL watches, CONFESSOR judges
    ('logic', 1, 3, 'ANGEL', 'CONFESSOR', 300),
    ('logic', 4, 7, 'CONFESSOR', 'SERAPH', 600),
    ('logic', 8, 10, 'SERAPH', 'ARCHON', 1800),

    -- Security issues: Always to PRIEST first, escalate to CONFESSOR
    ('security', 1, 3, 'PRIEST', 'CONFESSOR', 600),
    ('security', 4, 7, 'CONFESSOR', 'ARCHON', 1200),
    ('security', 8, 10, 'ARCHON', NULL, 3600);  -- ARCHON is final authority

-- ============================================
-- SEED DATA: INSTRUCTION TEMPLATES
-- ============================================

-- TIER 0: Foundation governance instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('FOUNDATION_APPROVAL', 0, 'FOUNDATION', 'SECURITY', 'approval',
     'fence FOUNDATION >> bark SECURITY >> pug APPROVE >> anchor HASH',
     'Foundation change requires SECURITY fence check, bark notification, approval, and hash anchor',
     3600, TRUE, 1),

    ('FOUNDATION_REVIEW', 0, 'FOUNDATION', 'SECURITY', 'review',
     'bark SECURITY >> spin REVIEW >> fence VALIDATE >> biz REPORT',
     'Security reviews foundation change, validates constraints, generates report',
     1800, FALSE, 0),

    ('CRYPTO_AUDIT', 0, 'FOUNDATION', 'SECURITY', 'audit',
     'fence ISOLATE >> bone HASH >> bark AUDIT >> anchor BTC',
     'Isolate crypto operation, hash state, audit trail, anchor to Bitcoin',
     7200, TRUE, 2);

-- TIER 1: Core governance instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('CORE_APPROVAL', 1, 'FOUNDATION', 'KNOWLEDGE', 'approval',
     'fence FOUNDATION >> bark KNOWLEDGE >> pug APPROVE >> biz DEPLOY',
     'Core change approved by Foundation, validated by Knowledge, deployed',
     3600, TRUE, 1),

    ('CORE_REVIEW', 1, 'FOUNDATION', 'KNOWLEDGE', 'review',
     'bark KNOWLEDGE >> spin ANALYZE >> blob STORE >> biz REPORT',
     'Knowledge analyzes core change, stores analysis, generates report',
     1800, FALSE, 0);

-- TIER 2: Knowledge governance instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('KNOWLEDGE_APPROVAL', 2, 'KNOWLEDGE', 'INTELLIGENCE', 'approval',
     'fence KNOWLEDGE >> cali INTELLIGENCE >> pug APPROVE >> blob PERSIST',
     'Knowledge change approved by Knowledge dept, validated by Intelligence',
     3600, TRUE, 1),

    ('KNOWLEDGE_REVIEW', 2, 'KNOWLEDGE', 'INTELLIGENCE', 'review',
     'cali INTELLIGENCE >> spin INFER >> fence VALIDATE >> biz REPORT',
     'Intelligence infers impact, validates constraints, reports',
     1800, FALSE, 0),

    ('GRAPH_MUTATION', 2, 'KNOWLEDGE', 'INTELLIGENCE', 'audit',
     'blob CAPTURE >> spin DIFF >> cali ANALYZE >> anchor COMMIT',
     'Capture graph state, diff changes, analyze impact, commit with anchor',
     3600, TRUE, 1);

-- TIER 3: Intelligence governance instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('INTELLIGENCE_APPROVAL', 3, 'INTELLIGENCE', 'SECURITY', 'approval',
     'fence SECURITY >> cali INTELLIGENCE >> pug APPROVE >> bone SECURE',
     'Intelligence change secured by Security, approved by Intelligence',
     3600, TRUE, 1),

    ('INTELLIGENCE_REVIEW', 3, 'INTELLIGENCE', 'SECURITY', 'review',
     'fence SECURITY >> bark THREAT >> spin ANALYZE >> biz REPORT',
     'Security checks threats, analyzes impact, generates report',
     1800, FALSE, 0),

    ('INFERENCE_AUDIT', 3, 'INTELLIGENCE', 'SECURITY', 'audit',
     'spin CAPTURE >> bone HASH >> fence ISOLATE >> anchor ANCHOR',
     'Capture inference state, hash, isolate for audit, anchor result',
     7200, TRUE, 2);

-- TIER 4: Integration governance instructions (multi-governed)
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('INTEGRATION_APPROVAL', 4, 'INTELLIGENCE', 'FOUNDATION', 'approval',
     'fence MULTI >> cali PRIMARY >> bark SECONDARY >> pug APPROVE >> bone COMMIT',
     'Multi-governed approval: primary and secondary governors must agree',
     7200, TRUE, 2),

    ('INTEGRATION_REVIEW', 4, 'INTELLIGENCE', 'SECURITY', 'review',
     'fence SECURITY >> cali INTELLIGENCE >> bark FOUNDATION >> spin CONSENSUS >> biz REPORT',
     'All relevant departments review, reach consensus, report',
     3600, FALSE, 0),

    ('CROSS_TIER_AUDIT', 4, 'NETWORK', 'SECURITY', 'audit',
     'bark ALL >> spin ANALYZE >> fence VALIDATE >> anchor MULTI_ANCHOR',
     'All departments notified, analysis performed, validated, multi-anchored',
     14400, TRUE, 3);

-- TIER 5: Application governance instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('APPLICATION_APPROVAL', 5, 'APPLICATION', 'SECURITY', 'approval',
     'fence APPLICATION >> bark ALL_HEADS >> pug QUORUM >> biz DEPLOY',
     'Application change requires quorum approval from all tier heads',
     14400, TRUE, 3),

    ('APPLICATION_REVIEW', 5, 'APPLICATION', 'FOUNDATION', 'review',
     'bark ALL_HEADS >> spin REVIEW >> fence VALIDATE >> blob ARCHIVE >> biz REPORT',
     'All heads review, validate, archive, and report on application changes',
     7200, FALSE, 0),

    ('RELEASE_AUDIT', 5, 'APPLICATION', 'SECURITY', 'audit',
     'fence FULL >> bone HASH_ALL >> bark NOTIFY >> anchor BTC_ANCHOR >> biz PUBLISH',
     'Full audit, hash all artifacts, notify stakeholders, anchor to Bitcoin, publish',
     86400, TRUE, 5);

-- Church-specific instructions
INSERT OR IGNORE INTO instructions (name, tier, governor_dept, validator_dept, instruction_type, template, natural_language, timeout_seconds, requires_approval, approval_threshold) VALUES
    ('CONFESSION_INTAKE', 0, 'PRIEST', 'SECURITY', 'penance',
     'bark PRIEST >> fence ISOLATE >> spin DIAGNOSE >> pug PRESCRIBE',
     'Priest receives confession, isolates issue, diagnoses, prescribes penance',
     600, FALSE, 0),

    ('PENANCE_EXECUTION', 0, 'DEMON', 'FOUNDATION', 'penance',
     'elf SANDBOX >> pug EXECUTE >> bone VERIFY >> bark REPORT',
     'Demon executes penance in sandbox, verifies fix, reports result',
     300, FALSE, 0),

    ('ABSOLUTION_GRANT', 0, 'ARCHON', 'FOUNDATION', 'penance',
     'spin REVIEW >> fence VALIDATE >> pug ABSOLVE >> anchor RECORD',
     'Archon reviews penance, validates fix, grants absolution, records',
     1200, TRUE, 1),

    ('ESCALATION_PATH', 0, 'SECURITY', 'INTELLIGENCE', 'escalation',
     'bark CURRENT >> turk ESCALATE >> fence NEXT >> spin HANDOFF',
     'Current role barks status, escalates, hands off to next tier',
     300, FALSE, 0);

-- ============================================
-- VIEWS FOR GOVERNANCE QUERIES
-- ============================================

-- View: Entity governance overview
CREATE VIEW IF NOT EXISTS entity_governance AS
SELECT
    e.id,
    e.name,
    e.tier,
    g.governor_dept,
    g.governance_type,
    d.name as dept_name,
    d.manager_role
FROM entities e
LEFT JOIN governance g ON e.id = g.entity_id
LEFT JOIN departments d ON g.governor_dept = d.id
ORDER BY e.tier, e.name, g.priority;

-- View: Validator workload
CREATE VIEW IF NOT EXISTS validator_workload AS
SELECT
    v.id,
    v.name,
    v.source_dept,
    v.validates_tier,
    COUNT(va.entity_id) as assigned_entities,
    v.validation_count,
    v.last_validation
FROM validators v
LEFT JOIN validator_assignments va ON v.id = va.validator_id
GROUP BY v.id
ORDER BY v.validates_tier, v.name;

-- View: Church hierarchy overview
CREATE VIEW IF NOT EXISTS church_overview AS
SELECT
    ch.church_role,
    ch.reports_to_dept,
    d.name as dept_name,
    ch.function_type,
    ch.mapping_description,
    ch.sephira
FROM church_hierarchy ch
JOIN departments d ON ch.reports_to_dept = d.id
ORDER BY ch.reports_to_dept, ch.church_role;

-- View: Tier governance rules
CREATE VIEW IF NOT EXISTS tier_governance_rules AS
SELECT
    i.tier,
    i.name as instruction_name,
    i.governor_dept,
    i.validator_dept,
    i.instruction_type,
    i.requires_approval,
    i.approval_threshold,
    i.timeout_seconds
FROM instructions i
ORDER BY i.tier, i.instruction_type, i.name;

-- View: Multi-governed entities
CREATE VIEW IF NOT EXISTS multi_governed_entities AS
SELECT
    e.id,
    e.name,
    e.tier,
    COUNT(g.id) as governor_count,
    GROUP_CONCAT(g.governor_dept || ' (' || g.governance_type || ')', ', ') as governors
FROM entities e
JOIN governance g ON e.id = g.entity_id
GROUP BY e.id
HAVING COUNT(g.id) > 1
ORDER BY e.tier, e.name;

-- View: Confession routing overview
CREATE VIEW IF NOT EXISTS confession_routing_overview AS
SELECT
    cr.sin_type,
    cr.severity_min || '-' || cr.severity_max as severity_range,
    cr.routed_to_role,
    ch.reports_to_dept,
    cr.escalation_path,
    cr.timeout_seconds
FROM confession_routing cr
LEFT JOIN church_hierarchy ch ON cr.routed_to_role = ch.church_role
ORDER BY cr.sin_type, cr.severity_min;

-- ============================================
-- TRIGGER: Update validator stats on assignment
-- ============================================

CREATE TRIGGER IF NOT EXISTS update_validator_stats
AFTER INSERT ON instruction_log
FOR EACH ROW
WHEN NEW.success = 1
BEGIN
    UPDATE validators
    SET validation_count = validation_count + 1,
        last_validation = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT va.validator_id
        FROM validator_assignments va
        WHERE va.entity_id = NEW.entity_id
    );
END;

-- ============================================
-- SUMMARY REPORT
-- ============================================

-- To verify the governance structure, run:
-- SELECT * FROM entity_governance;
-- SELECT * FROM validator_workload;
-- SELECT * FROM church_overview;
-- SELECT * FROM tier_governance_rules;
-- SELECT * FROM multi_governed_entities;
-- SELECT * FROM confession_routing_overview;
