-- SYNTHESTASIA Integration Update
-- Adds 4 new crates to Guardian database

-- New BIBLE passages
INSERT OR IGNORE INTO bible_passages (id, passage, source, applies_to) VALUES
('BP030', 'smooth_min IS softmax IS attention', 'goo_philosophy', 'crate'),
('BP031', 'Translate to teach, teach to master', 'ged_philosophy', 'crate'),
('BP032', 'Every step hashed, every chain verifiable', 'document_philosophy', 'crate'),
('BP033', 'The interface IS the database', 'gooey_philosophy', 'crate');

-- New SYNTHESTASIA crates
INSERT OR IGNORE INTO entities (id, entity_type, name, before_path, after_path, purpose, bible_passage, codie, sephira, status)
VALUES
('C027', 'crate', 'gently-goo', 'crates/foundation/gently-goo', 'crates/foundation/gently-goo', 'GOO Field unified distance field engine', 'smooth_min IS softmax IS attention', 'bone', 'yesod', 'complete'),
('C028', 'crate', 'gently-ged', 'crates/intelligence/gently-ged', 'crates/intelligence/gently-ged', 'G.E.D. Generative Educational Device', 'Translate to teach, teach to master', 'cali', 'tiferet', 'complete'),
('C029', 'crate', 'gently-document', 'crates/application/gently-document', 'crates/application/gently-document', 'Three-chain document engine', 'Every step hashed, every chain verifiable', 'anchor', 'netzach', 'complete'),
('C030', 'crate', 'gently-gooey', 'crates/application/gently-gooey', 'crates/application/gently-gooey', 'GOOEY 2D application builder', 'The interface IS the database', 'biz', 'hod', 'complete');

-- New Daath links for SYNTHESTASIA crates
INSERT OR IGNORE INTO daath_links (from_entity, to_entity, link_type, strength)
VALUES
('C027', 'C001', 'depends', 1.0),     -- goo depends on core
('C027', 'C005', 'depends', 0.8),     -- goo depends on visual
('C027', 'C004', 'depends', 0.7),     -- goo depends on audio
('C028', 'C001', 'depends', 1.0),     -- ged depends on core
('C028', 'C013', 'depends', 0.9),     -- ged depends on agents
('C028', 'C009', 'depends', 0.6),     -- ged depends on btc (for anchoring)
('C029', 'C001', 'depends', 1.0),     -- document depends on core
('C029', 'C005', 'depends', 0.7),     -- document depends on visual
('C030', 'C027', 'depends', 1.0),     -- gooey depends on goo
('C030', 'C005', 'depends', 0.9);     -- gooey depends on visual

-- Note: Migration log tracks moves, not creates. New crates are tracked via entities table.
