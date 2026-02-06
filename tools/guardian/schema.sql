-- guardian.db schema
-- GentlyOS Guardian Watchdog Database
-- Tracks file migrations, BIBLE.md references, CODIE annotations, and Daath connections

-- Main entities table
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('crate', 'file', 'folder', 'function', 'module')),
    name TEXT NOT NULL,
    before_path TEXT NOT NULL,          -- Current location
    after_path TEXT,                     -- Target location after refactor
    purpose TEXT,
    bible_passage TEXT,                  -- BIBLE.md reference
    codie TEXT CHECK (codie IN ('pug','bark','spin','cali','elf','turk','fence','pin','bone','blob','biz','anchor')),
    sephira TEXT,                        -- Tree of Life mapping
    status TEXT DEFAULT 'complete' CHECK (status IN ('pending', 'in_progress', 'complete', 'blocked')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    migrated_at DATETIME
);

-- Daath connections (hidden links between entities)
CREATE TABLE daath_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_entity TEXT NOT NULL REFERENCES entities(id),
    to_entity TEXT NOT NULL REFERENCES entities(id),
    link_type TEXT CHECK (link_type IN ('depends', 'imports', 'calls', 'contains', 'flows_to')),
    strength REAL DEFAULT 1.0  -- Connection strength (0.0 - 1.0)
);

-- Migration log (audit trail)
CREATE TABLE migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT REFERENCES entities(id),
    action TEXT NOT NULL CHECK (action IN ('move', 'rename', 'delete', 'merge', 'split')),
    from_path TEXT,
    to_path TEXT,
    reason TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- BIBLE passages reference
CREATE TABLE bible_passages (
    id TEXT PRIMARY KEY,
    passage TEXT NOT NULL,
    source TEXT,                         -- Which section of BIBLE.md
    applies_to TEXT                      -- Comma-separated entity types
);

-- Indexes for fast queries
CREATE INDEX idx_entities_before_path ON entities(before_path);
CREATE INDEX idx_entities_after_path ON entities(after_path);
CREATE INDEX idx_entities_status ON entities(status);
CREATE INDEX idx_entities_sephira ON entities(sephira);
CREATE INDEX idx_daath_from ON daath_links(from_entity);
CREATE INDEX idx_daath_to ON daath_links(to_entity);

-- Views for common queries

-- Migration status overview
CREATE VIEW migration_status AS
SELECT
    status,
    COUNT(*) as count,
    GROUP_CONCAT(name, ', ') as entities
FROM entities
GROUP BY status;

-- Tree of Life view
CREATE VIEW tree_of_life AS
SELECT
    sephira,
    COUNT(*) as entity_count,
    GROUP_CONCAT(name, ', ') as crates
FROM entities
WHERE sephira IS NOT NULL
GROUP BY sephira
ORDER BY
    CASE sephira
        WHEN 'keter' THEN 1
        WHEN 'chokmah' THEN 2
        WHEN 'binah' THEN 3
        WHEN 'daath' THEN 4
        WHEN 'chesed' THEN 5
        WHEN 'gevurah' THEN 6
        WHEN 'tiferet' THEN 7
        WHEN 'netzach' THEN 8
        WHEN 'hod' THEN 9
        WHEN 'yesod' THEN 10
        WHEN 'malkuth' THEN 11
    END;

-- Pending moves
CREATE VIEW pending_moves AS
SELECT
    id, name, before_path, after_path, codie, sephira
FROM entities
WHERE status = 'pending' AND after_path IS NOT NULL;
