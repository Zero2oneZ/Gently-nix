-- GentlyOS Guardian Database Schema
-- The living manifest of sovereign computation
-- Version: 1.0.0

-- ============================================
-- CORE ENTITY TABLES
-- ============================================

-- Main entities table (crates, files, modules, functions)
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('crate', 'file', 'folder', 'function', 'module', 'binary')),
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    tier INTEGER CHECK (tier BETWEEN 0 AND 6),
    purpose TEXT,
    bible_book TEXT,
    bible_chapter INTEGER,
    codie TEXT CHECK (codie IN ('pug','bark','spin','cali','elf','turk','fence','pin','bone','blob','biz','anchor')),
    sephira TEXT CHECK (sephira IN ('keter','chokmah','binah','daath','chesed','gevurah','tiferet','netzach','hod','yesod','malkuth')),
    deity TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deprecated', 'planned')),
    lines_of_code INTEGER DEFAULT 0,
    test_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DAATH CONNECTIONS (Hidden Links)
-- ============================================

-- Connections between entities (dependency graph)
CREATE TABLE IF NOT EXISTS daath_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity TEXT NOT NULL REFERENCES entities(id),
    to_entity TEXT NOT NULL REFERENCES entities(id),
    link_type TEXT NOT NULL CHECK (link_type IN ('depends', 'imports', 'calls', 'contains', 'flows_to', 'guards', 'transforms')),
    strength REAL DEFAULT 1.0 CHECK (strength BETWEEN 0.0 AND 1.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_entity, to_entity, link_type)
);

-- ============================================
-- BIBLICAL REFERENCE SYSTEM
-- ============================================

-- The 21 Books of the GentlyOS Bible
CREATE TABLE IF NOT EXISTS bible_books (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    crate_name TEXT NOT NULL,
    theme TEXT NOT NULL,
    testament TEXT CHECK (testament IN ('old', 'new', 'apocrypha', 'revelation'))
);

-- Chapters within books
CREATE TABLE IF NOT EXISTS bible_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES bible_books(id),
    chapter_number INTEGER NOT NULL,
    module_name TEXT NOT NULL,
    UNIQUE(book_id, chapter_number)
);

-- Verses within chapters
CREATE TABLE IF NOT EXISTS bible_verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL REFERENCES bible_chapters(id),
    verse_number INTEGER NOT NULL,
    symbol_name TEXT NOT NULL,
    verse_text TEXT,
    UNIQUE(chapter_id, verse_number)
);

-- ============================================
-- CONFESSION & PENANCE SYSTEM
-- ============================================

-- Confessions from failing files
CREATE TABLE IF NOT EXISTS confessions (
    id TEXT PRIMARY KEY,
    penitent_path TEXT NOT NULL,
    sin_type TEXT NOT NULL CHECK (sin_type IN ('compile', 'test', 'runtime', 'logic', 'security')),
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    message TEXT NOT NULL,
    location_function TEXT,
    location_line INTEGER,
    triggered_by TEXT,
    confession_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'absolved', 'escalated'))
);

-- Penances prescribed by the Priest
CREATE TABLE IF NOT EXISTS penances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    confession_id TEXT NOT NULL REFERENCES confessions(id),
    scripture_book TEXT NOT NULL,
    scripture_chapter INTEGER NOT NULL,
    scripture_verse INTEGER NOT NULL,
    verse_text TEXT,
    codie_instruction TEXT NOT NULL,
    natural_language TEXT,
    isolation_level TEXT CHECK (isolation_level IN ('CHAPEL', 'SANDBOX', 'QUARANTINE')),
    timeout_seconds INTEGER DEFAULT 300,
    prescribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Penance execution attempts
CREATE TABLE IF NOT EXISTS penance_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    penance_id INTEGER NOT NULL REFERENCES penances(id),
    attempt_number INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    success BOOLEAN,
    error_message TEXT,
    tests_passed TEXT,
    tests_failed TEXT
);

-- ============================================
-- SECURITY DAEMON REGISTRY
-- ============================================

-- The 16 Furies
CREATE TABLE IF NOT EXISTS daemons (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    layer INTEGER CHECK (layer BETWEEN 1 AND 5),
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sleeping', 'triggered', 'disabled')),
    last_triggered DATETIME,
    trigger_count INTEGER DEFAULT 0
);

-- FAFO incident log
CREATE TABLE IF NOT EXISTS fafo_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threat_id TEXT NOT NULL,
    response_level TEXT CHECK (response_level IN ('TARPIT', 'POISON', 'DROWN', 'ISOLATE', 'DESTROY', 'SAMSON')),
    strike_count INTEGER,
    daemon_id INTEGER REFERENCES daemons(id),
    description TEXT,
    occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AGENTIC TEAM STRUCTURE
-- ============================================

-- Team departments
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manager_role TEXT NOT NULL,
    purpose TEXT,
    tier INTEGER,
    parent_dept TEXT REFERENCES departments(id)
);

-- Agent roles
CREATE TABLE IF NOT EXISTS agent_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    permissions TEXT,  -- JSON array of allowed CODIE operations
    description TEXT
);

-- Audit trail
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_role TEXT REFERENCES agent_roles(id),
    action TEXT NOT NULL,
    entity_id TEXT REFERENCES entities(id),
    before_state TEXT,
    after_state TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by TEXT
);

-- ============================================
-- TREE OF LIFE CORRESPONDENCES
-- ============================================

-- Sephirotic mappings
CREATE TABLE IF NOT EXISTS sephirot (
    id TEXT PRIMARY KEY CHECK (id IN ('keter','chokmah','binah','daath','chesed','gevurah','tiferet','netzach','hod','yesod','malkuth')),
    name TEXT NOT NULL,
    meaning TEXT NOT NULL,
    position_x INTEGER,
    position_y INTEGER,
    color TEXT,
    element TEXT,
    principle TEXT
);

-- Paths between sephirot
CREATE TABLE IF NOT EXISTS sephirot_paths (
    id INTEGER PRIMARY KEY,
    from_sephira TEXT REFERENCES sephirot(id),
    to_sephira TEXT REFERENCES sephirot(id),
    hebrew_letter TEXT,
    tarot_card TEXT,
    meaning TEXT
);

-- ============================================
-- CODIE CHAIN REGISTRY
-- ============================================

-- Registered CODIE chains (executable workflows)
CREATE TABLE IF NOT EXISTS codie_chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT,
    hash TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CODIE chain execution history
CREATE TABLE IF NOT EXISTS codie_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id TEXT REFERENCES codie_chains(id),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    success BOOLEAN,
    input_hash TEXT,
    output_hash TEXT,
    error_message TEXT
);

-- ============================================
-- VIEWS
-- ============================================

-- Current system status overview
CREATE VIEW IF NOT EXISTS system_status AS
SELECT
    entity_type,
    COUNT(*) as count,
    SUM(lines_of_code) as total_loc,
    SUM(test_count) as total_tests,
    GROUP_CONCAT(name, ', ') as names
FROM entities
WHERE status = 'active'
GROUP BY entity_type;

-- Tree of Life visualization
CREATE VIEW IF NOT EXISTS tree_of_life AS
SELECT
    s.id as sephira,
    s.name,
    s.meaning,
    COUNT(e.id) as entity_count,
    GROUP_CONCAT(e.name, ', ') as crates
FROM sephirot s
LEFT JOIN entities e ON e.sephira = s.id
GROUP BY s.id
ORDER BY s.position_y, s.position_x;

-- Confession status
CREATE VIEW IF NOT EXISTS confession_status AS
SELECT
    c.status,
    COUNT(*) as count,
    GROUP_CONCAT(c.penitent_path, ', ') as files
FROM confessions c
GROUP BY c.status;

-- Department hierarchy
CREATE VIEW IF NOT EXISTS dept_hierarchy AS
WITH RECURSIVE hierarchy AS (
    SELECT id, name, manager_role, purpose, tier, parent_dept, 0 as depth
    FROM departments
    WHERE parent_dept IS NULL
    UNION ALL
    SELECT d.id, d.name, d.manager_role, d.purpose, d.tier, d.parent_dept, h.depth + 1
    FROM departments d
    JOIN hierarchy h ON d.parent_dept = h.id
)
SELECT * FROM hierarchy ORDER BY depth, name;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_entities_path ON entities(path);
CREATE INDEX IF NOT EXISTS idx_entities_tier ON entities(tier);
CREATE INDEX IF NOT EXISTS idx_entities_sephira ON entities(sephira);
CREATE INDEX IF NOT EXISTS idx_entities_bible ON entities(bible_book);
CREATE INDEX IF NOT EXISTS idx_daath_from ON daath_links(from_entity);
CREATE INDEX IF NOT EXISTS idx_daath_to ON daath_links(to_entity);
CREATE INDEX IF NOT EXISTS idx_confessions_status ON confessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- ============================================
-- SEED DATA: SEPHIROT
-- ============================================

INSERT OR IGNORE INTO sephirot VALUES
    ('keter', 'Crown', 'Divine Will, Source', 2, 0, '#FFFFFF', 'spirit', 'Unity'),
    ('chokmah', 'Wisdom', 'Creative Force', 3, 1, '#808080', 'fire', 'Initiation'),
    ('binah', 'Understanding', 'Receptive Intelligence', 1, 1, '#000000', 'water', 'Form'),
    ('daath', 'Knowledge', 'Hidden Sephira', 2, 2, '#LAVENDER', 'aether', 'Union'),
    ('chesed', 'Mercy', 'Loving-kindness', 3, 3, '#0000FF', 'water', 'Vision'),
    ('gevurah', 'Severity', 'Judgment, Strength', 1, 3, '#FF0000', 'fire', 'Power'),
    ('tiferet', 'Beauty', 'Harmony, Balance', 2, 4, '#FFFF00', 'air', 'Healing'),
    ('netzach', 'Victory', 'Eternity, Endurance', 3, 5, '#00FF00', 'fire', 'Arts'),
    ('hod', 'Splendor', 'Glory, Majesty', 1, 5, '#FFA500', 'water', 'Magic'),
    ('yesod', 'Foundation', 'Connecting Point', 2, 6, '#800080', 'air', 'Dreams'),
    ('malkuth', 'Kingdom', 'Physical Reality', 2, 7, '#964B00', 'earth', 'Matter');

-- ============================================
-- SEED DATA: BIBLE BOOKS
-- ============================================

INSERT OR IGNORE INTO bible_books VALUES
    (1, 'Genesis', 'gently-core', 'The foundation of all things', 'old'),
    (2, 'Exodus', 'gently-agents', 'Servants freed to serve', 'old'),
    (3, 'Leviticus', 'gently-security', 'Laws that guard the temple', 'old'),
    (4, 'Numbers', 'gently-search', 'The counting of thoughts', 'old'),
    (5, 'Deuteronomy', 'gently-codie', 'The second law in twelve words', 'old'),
    (6, 'Joshua', 'gently-artisan', 'Conquest of the toroidal land', 'old'),
    (7, 'Judges', 'gently-guardian', 'Watchers of the free tier', 'old'),
    (8, 'Ruth', 'gently-feed', 'The faithful gatherer of context', 'old'),
    (9, 'Samuel', 'gently-brain', 'The prophet who hears the oracle', 'old'),
    (10, 'Kings', 'gently-gateway', 'The bottleneck throne', 'old'),
    (11, 'Chronicles', 'gently-alexandria', 'The library that remembers', 'old'),
    (12, 'Ezra', 'gently-mcp', 'The scribe who bridges worlds', 'old'),
    (13, 'Nehemiah', 'gently-architect', 'The rebuilder of walls', 'old'),
    (14, 'Job', 'gently-network', 'The watcher who suffers all traffic', 'old'),
    (15, 'Psalms', 'gently-visual', 'Songs rendered in pattern', 'old'),
    (16, 'Proverbs', 'gently-cipher', 'Riddles wrapped in encoding', 'old'),
    (17, 'Ecclesiastes', 'gently-dance', 'The handshake that seeks meaning', 'old'),
    (18, 'Isaiah', 'gently-btc', 'Prophet of the coming blocks', 'old'),
    (19, 'Jeremiah', 'gently-ipfs', 'Gatherer from distant lands', 'old'),
    (20, 'Daniel', 'gently-web', 'Interpreter of the ONE SCENE', 'old'),
    (21, 'Revelation', 'gently-sploit', 'The unveiling of vulnerabilities', 'old');

-- ============================================
-- SEED DATA: DAEMONS (The 16 Furies)
-- ============================================

INSERT OR IGNORE INTO daemons VALUES
    (1, 'HashChainValidator', 1, 'Verifies the unbroken chain of truth', 'active', NULL, 0),
    (2, 'BtcAnchor', 1, 'Anchors timestamps to Bitcoin blockchain', 'active', NULL, 0),
    (3, 'ForensicLogger', 1, 'Records all for the final judgment', 'active', NULL, 0),
    (4, 'TrafficSentinel', 2, 'Watches all packets that cross', 'active', NULL, 0),
    (5, 'TokenWatchdog', 2, 'Guards the tokens of passage', 'active', NULL, 0),
    (6, 'CostGuardian', 2, 'Prevents the draining of resources', 'active', NULL, 0),
    (7, 'PromptAnalyzer', 3, 'Identifies injection attacks', 'active', NULL, 0),
    (8, 'BehaviorProfiler', 3, 'Knows the patterns of each soul', 'active', NULL, 0),
    (9, 'PatternMatcher', 3, 'Recognizes the signs of evil', 'active', NULL, 0),
    (10, 'AnomalyDetector', 3, 'Sees what should not be', 'active', NULL, 0),
    (11, 'SessionIsolator', 4, 'Quarantines the infected', 'active', NULL, 0),
    (12, 'TarpitController', 4, 'Slows the aggressor to a crawl', 'active', NULL, 0),
    (13, 'ResponseMutator', 4, 'Corrupts the attackers harvest', 'active', NULL, 0),
    (14, 'RateLimitEnforcer', 4, 'Controls the flood', 'active', NULL, 0),
    (15, 'ThreatIntelCollector', 5, 'Gathers knowledge of enemies', 'active', NULL, 0),
    (16, 'SwarmDefense', 5, 'Coordinates collective response', 'active', NULL, 0);

-- ============================================
-- SEED DATA: DEPARTMENTS (Google-Style)
-- ============================================

INSERT OR IGNORE INTO departments VALUES
    ('ROOT', 'GentlyOS', 'Architect', 'Root organization', 0, NULL),
    ('FOUNDATION', 'Foundation', 'Core Maintainer', 'Crypto and base types', 0, 'ROOT'),
    ('KNOWLEDGE', 'Knowledge', 'Knowledge Lead', 'Data and storage layer', 1, 'ROOT'),
    ('INTELLIGENCE', 'Intelligence', 'AI Lead', 'Reasoning and learning', 2, 'ROOT'),
    ('SECURITY', 'Security', 'Security Lead', 'Protection and defense', 3, 'ROOT'),
    ('NETWORK', 'Network', 'Network Lead', 'Communication layer', 4, 'ROOT'),
    ('APPLICATION', 'Application', 'Product Lead', 'User-facing interfaces', 5, 'ROOT'),
    ('PRIEST', 'Church', 'High Priest', 'Confession and penance', NULL, 'ROOT'),
    ('ANGEL', 'Angels', 'Seraph', 'Monitoring and watching', NULL, 'ROOT'),
    ('DEMON', 'Demons', 'Archon', 'Installation and execution', NULL, 'ROOT');

-- ============================================
-- SEED DATA: AGENT ROLES
-- ============================================

INSERT OR IGNORE INTO agent_roles VALUES
    ('ARCHITECT', 'Architect', 'ROOT', '["pug","cali","biz"]', 'Designs overall system structure'),
    ('MAINTAINER', 'Maintainer', 'FOUNDATION', '["pug","cali","elf","bone"]', 'Maintains foundation crates'),
    ('AUDITOR', 'Auditor', 'SECURITY', '["bark","fence","pin"]', 'Audits IO and security'),
    ('PRIEST', 'Priest', 'PRIEST', '["pug","fence","biz"]', 'Prescribes penance for failures'),
    ('ANGEL', 'Angel', 'ANGEL', '["bark","spin","anchor"]', 'Watches for failures'),
    ('DEMON', 'Demon', 'DEMON', '["pug","cali","elf"]', 'Executes penance in isolation');

-- ============================================
-- SEED DATA: CODIE CHAINS
-- ============================================

INSERT OR IGNORE INTO codie_chains VALUES
    ('INSTALL', 'Installation Chain', 'Phase 1-7 installation', 'tools/codie-maps/install.codie', NULL, 'active', CURRENT_TIMESTAMP),
    ('VALIDATE', 'Validation Chain', 'Platform detection', 'tools/codie-maps/validate-all.codie', NULL, 'active', CURRENT_TIMESTAMP),
    ('REBUILD', 'Rebuild Chain', 'Incremental rebuild', 'tools/codie-maps/rebuild.codie', NULL, 'active', CURRENT_TIMESTAMP),
    ('TRAIN', 'Training Quality', 'Inference mining', 'tools/codie-maps/training-quality.codie', NULL, 'active', CURRENT_TIMESTAMP),
    ('DEFENSE', 'Ether Goo Defense', 'GOO attack defense', 'tools/codie-maps/ether-goo-defense.codie', NULL, 'active', CURRENT_TIMESTAMP),
    ('SYNTH', 'Synthestasia', 'Document synthesis', 'tools/codie-maps/synthestasia.codie', NULL, 'active', CURRENT_TIMESTAMP);

-- ============================================
-- SEED DATA: FOUNDATION CRATES
-- ============================================

INSERT OR IGNORE INTO entities VALUES
    ('C001', 'crate', 'gently-core', 'crates/gently-core', 0, 'Crypto primitives, XOR splits, Berlin Clock, vault', 'Genesis', 1, 'bone', 'malkuth', 'Charon', 'active', 3500, 52, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C002', 'crate', 'gently-codie', 'crates/gently-codie', 0, '12-keyword instruction language', 'Deuteronomy', 1, 'pug', 'yesod', 'Thoth', 'active', 4200, 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C003', 'crate', 'gently-artisan', 'crates/gently-artisan', 0, 'BS-ARTISAN toroidal storage', 'Joshua', 1, 'blob', 'netzach', 'Hephaestus', 'active', 1800, 27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C004', 'crate', 'gently-visual', 'crates/gently-visual', 0, 'SVG pattern rendering', 'Psalms', 1, 'biz', 'malkuth', 'Khepri', 'active', 223, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C005', 'crate', 'gently-audio', 'crates/gently-audio', 1, 'FFT encoding/decoding', 'Enoch', 1, 'biz', 'malkuth', 'Orpheus', 'active', 500, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C006', 'crate', 'gently-btc', 'crates/gently-btc', 1, 'Bitcoin block anchoring', 'Isaiah', 1, 'anchor', 'tiferet', 'Hades', 'active', 800, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C007', 'crate', 'gently-dance', 'crates/gently-dance', 1, 'P2P visual-audio handshake', 'Ecclesiastes', 1, 'spin', 'chesed', 'Persephone', 'active', 900, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C008', 'crate', 'gently-cipher', 'crates/gently-cipher', 1, 'Cryptanalysis toolkit', 'Proverbs', 1, 'bark', 'gevurah', 'Thoth', 'active', 1200, 31, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C009', 'crate', 'gently-sim', 'crates/gently-sim', 1, 'SIM card security', 'Jubilees', 1, 'fence', 'gevurah', 'Nephthys', 'active', 1500, 37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C010', 'crate', 'gently-feed', 'crates/gently-feed', 2, 'Living feed with charge/decay', 'Ruth', 1, 'spin', 'tiferet', 'Lethe', 'active', 1000, 26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C011', 'crate', 'gently-ipfs', 'crates/gently-ipfs', 2, 'Content-addressed storage', 'Jeremiah', 1, 'blob', 'tiferet', 'Tartarus', 'active', 400, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C012', 'crate', 'gently-network', 'crates/gently-network', 2, 'Network visualization, MITM', 'Job', 1, 'bark', 'chesed', 'Iris', 'active', 800, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C013', 'crate', 'gently-security', 'crates/gently-security', 2, '16 daemons + FAFO', 'Leviticus', 1, 'bone', 'gevurah', 'Furies', 'active', 2500, 66, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C014', 'crate', 'gently-alexandria', 'crates/gently-alexandria', 3, 'Knowledge graph + Tesseract', 'Chronicles', 1, 'blob', 'daath', 'Memoria', 'active', 2200, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C015', 'crate', 'gently-search', 'crates/gently-search', 3, 'BBBCP constraint engine', 'Numbers', 1, 'fence', 'binah', 'Psychopomp', 'active', 2000, 69, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C016', 'crate', 'gently-inference', 'crates/gently-inference', 3, 'Quality mining, step scoring', 'Daniel', 1, 'spin', 'hod', 'Moirai', 'active', 1800, 64, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C017', 'crate', 'gently-mcp', 'crates/gently-mcp', 3, 'Model Context Protocol server', 'Ezra', 1, 'bark', 'hod', 'Iris', 'active', 1000, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C018', 'crate', 'gently-architect', 'crates/gently-architect', 3, 'Idea crystallization', 'Nehemiah', 1, 'turk', 'tiferet', 'Hestia', 'active', 800, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C019', 'crate', 'gently-micro', 'crates/gently-micro', 3, 'Microcontroller layer', 'Tobit', 1, 'elf', 'hod', 'Hermes', 'active', 1200, 64, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C020', 'crate', 'gently-agents', 'crates/gently-agents', 4, 'Agentic scaffold', 'Exodus', 1, 'cali', 'chokmah', 'Hermes', 'active', 500, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C021', 'crate', 'gently-brain', 'crates/gently-brain', 4, 'LLM orchestration', 'Samuel', 1, 'cali', 'chokmah', 'Prometheus', 'active', 2000, 63, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C022', 'crate', 'gently-gateway', 'crates/gently-gateway', 4, 'API bottleneck', 'Kings', 1, 'fence', 'chesed', 'Cerberus', 'active', 1200, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C023', 'crate', 'gently-guardian', 'crates/gently-guardian', 4, 'Hardware validation', 'Judges', 1, 'fence', 'gevurah', 'Nike', 'active', 900, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C024', 'crate', 'gently-sploit', 'crates/gently-sploit', 4, 'Exploitation framework', 'Revelation', 1, 'turk', 'gevurah', 'Ares', 'active', 500, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('C025', 'crate', 'gently-web', 'crates/gently-web', 5, 'ONE SCENE Web GUI', 'Daniel', 1, 'biz', 'keter', 'Morpheus', 'active', 1900, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('B001', 'binary', 'gently-cli', 'gently-cli', 5, 'Main CLI binary', NULL, NULL, 'pug', 'keter', 'Janus', 'active', 4000, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('B002', 'binary', 'gentlyos-tui', 'gentlyos-tui', 5, 'Terminal UI', NULL, NULL, 'biz', 'keter', 'Morpheus', 'active', 5693, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- SEED DATA: DAATH LINKS (Dependency Graph)
-- ============================================

INSERT OR IGNORE INTO daath_links (from_entity, to_entity, link_type, strength) VALUES
    ('C001', 'C006', 'depends', 1.0),
    ('C001', 'C007', 'depends', 1.0),
    ('C001', 'C005', 'depends', 1.0),
    ('C001', 'C008', 'depends', 1.0),
    ('C001', 'C004', 'depends', 1.0),
    ('C001', 'C010', 'depends', 1.0),
    ('C001', 'C011', 'depends', 1.0),
    ('C001', 'C012', 'depends', 1.0),
    ('C008', 'C013', 'flows_to', 0.9),
    ('C012', 'C013', 'flows_to', 0.9),
    ('C011', 'C014', 'flows_to', 1.0),
    ('C014', 'C015', 'flows_to', 1.0),
    ('C014', 'C016', 'flows_to', 0.9),
    ('C014', 'C019', 'flows_to', 0.8),
    ('C010', 'C015', 'flows_to', 0.8),
    ('C010', 'C018', 'flows_to', 0.7),
    ('C002', 'C020', 'flows_to', 1.0),
    ('C020', 'C021', 'flows_to', 1.0),
    ('C021', 'C022', 'flows_to', 1.0),
    ('C022', 'C025', 'flows_to', 1.0),
    ('C013', 'C022', 'guards', 1.0),
    ('C013', 'C023', 'guards', 0.9);
