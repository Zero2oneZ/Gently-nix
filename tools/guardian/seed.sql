-- Guardian Database Seed Data
-- Initial entities after GentlyOS reorganization

-- BIBLE passages reference
INSERT INTO bible_passages (id, passage, source, applies_to) VALUES
('BP001', 'All magic happens at the edge of constraint', 'core_philosophy', 'crate'),
('BP002', 'The architecture IS the user interface', 'design_principles', 'crate'),
('BP003', 'Via negativa reveals what remains', 'knowledge_layer', 'crate'),
('BP004', 'Constraint is generative', 'search_philosophy', 'crate'),
('BP005', 'Intelligence = Capability x Constraint / Search Space', 'ai_principles', 'crate'),
('BP006', 'A rabid pitbull behind a fence', 'security_layer', 'crate'),
('BP007', 'The bottleneck is the blessing', 'gateway_philosophy', 'crate'),
('BP008', 'The network trains itself through USE', 'inference_layer', 'crate'),
('BP009', 'One command, all power', 'cli_philosophy', 'crate'),
('BP010', 'Sound is structured vibration', 'audio_layer', 'crate'),
('BP011', 'Light is structured emission', 'visual_layer', 'crate'),
('BP012', 'The hidden sephira connects all paths', 'alexandria_philosophy', 'crate'),
('BP013', 'Truth anchored in proof of work', 'btc_philosophy', 'crate'),
('BP014', 'Address by what it IS, not where it lives', 'ipfs_philosophy', 'crate'),
('BP015', 'Wisdom flows from synthesis', 'brain_philosophy', 'crate'),
('BP016', 'Agents are structured intent', 'agents_philosophy', 'crate'),
('BP017', 'Protocol is frozen negotiation', 'mcp_philosophy', 'crate'),
('BP018', 'Edge intelligence, minimal footprint', 'micro_philosophy', 'crate'),
('BP019', 'Know the lock to pick the lock', 'cipher_philosophy', 'crate'),
('BP020', 'Trust but verify at the edge', 'guardian_philosophy', 'crate'),
('BP021', 'The phone is the attack surface', 'sim_philosophy', 'crate'),
('BP022', 'Offense informs defense', 'sploit_philosophy', 'crate'),
('BP023', 'See the flow, control the flow', 'network_philosophy', 'crate'),
('BP024', 'Bridges connect worlds', 'bridge_philosophy', 'crate'),
('BP025', 'Trust through ritual', 'dance_philosophy', 'crate'),
('BP026', 'The interface IS the system', 'web_philosophy', 'crate'),
('BP027', 'Ideas become structures', 'architect_philosophy', 'crate'),
('BP028', 'Terminal is the truth', 'tui_philosophy', 'crate'),
('BP029', 'Information has metabolism', 'feed_philosophy', 'crate'),
('BP030', 'smooth_min IS softmax IS attention', 'goo_philosophy', 'crate'),
('BP031', 'Translate to teach, teach to master', 'ged_philosophy', 'crate'),
('BP032', 'Every step hashed, every chain verifiable', 'document_philosophy', 'crate'),
('BP033', 'The interface IS the database', 'gooey_philosophy', 'crate');

-- Foundation crates (Malkuth/Yesod)
INSERT INTO entities (id, entity_type, name, before_path, after_path, purpose, bible_passage, codie, sephira, status)
VALUES
('C001', 'crate', 'gently-core', 'crates/gently-core', 'crates/foundation/gently-core', 'Crypto primitives, XOR splits, Berlin Clock', 'All magic happens at the edge of constraint', 'bone', 'malkuth', 'complete'),
('C002', 'crate', 'gently-codie', 'crates/gently-codie', 'crates/foundation/gently-codie', '12-keyword instruction language', 'The architecture IS the user interface', 'pug', 'yesod', 'complete'),
('C003', 'crate', 'gently-artisan', 'crates/gently-artisan', 'crates/foundation/gently-artisan', 'BS-ARTISAN toroidal storage', 'Via negativa reveals what remains', 'blob', 'netzach', 'complete'),
('C004', 'crate', 'gently-audio', 'crates/gently-audio', 'crates/foundation/gently-audio', 'FFT encoding (audible + ultrasonic)', 'Sound is structured vibration', 'biz', 'malkuth', 'complete'),
('C005', 'crate', 'gently-visual', 'crates/gently-visual', 'crates/foundation/gently-visual', 'SVG pattern rendering', 'Light is structured emission', 'biz', 'malkuth', 'complete'),
('C027', 'crate', 'gently-goo', 'crates/foundation/gently-goo', 'crates/foundation/gently-goo', 'GOO Field unified distance field engine', 'smooth_min IS softmax IS attention', 'bone', 'yesod', 'complete'),

-- Knowledge crates (Tiferet/Daath)
('C006', 'crate', 'gently-alexandria', 'crates/gently-alexandria', 'crates/knowledge/gently-alexandria', 'Knowledge graph + Tesseract 8D', 'The hidden sephira connects all paths', 'blob', 'daath', 'complete'),
('C007', 'crate', 'gently-search', 'crates/gently-search', 'crates/knowledge/gently-search', 'BBBCP constraint engine', 'Constraint is generative', 'fence', 'binah', 'complete'),
('C008', 'crate', 'gently-feed', 'crates/gently-feed', 'crates/knowledge/gently-feed', 'Living feed with charge/decay', 'Information has metabolism', 'spin', 'tiferet', 'complete'),
('C009', 'crate', 'gently-btc', 'crates/gently-btc', 'crates/knowledge/gently-btc', 'Bitcoin block anchoring', 'Truth anchored in proof of work', 'anchor', 'tiferet', 'complete'),
('C010', 'crate', 'gently-ipfs', 'crates/gently-ipfs', 'crates/knowledge/gently-ipfs', 'Content-addressed storage', 'Address by what it IS, not where it lives', 'blob', 'tiferet', 'complete'),

-- Intelligence crates (Chokmah/Binah)
('C011', 'crate', 'gently-brain', 'crates/gently-brain', 'crates/intelligence/gently-brain', 'LLM orchestration, Claude API', 'Wisdom flows from synthesis', 'cali', 'chokmah', 'complete'),
('C012', 'crate', 'gently-inference', 'crates/gently-inference', 'crates/intelligence/gently-inference', 'Quality mining, step scoring', 'The network trains itself through USE', 'spin', 'hod', 'complete'),
('C013', 'crate', 'gently-agents', 'crates/gently-agents', 'crates/intelligence/gently-agents', 'Agentic scaffold, CODIE interpreter', 'Agents are structured intent', 'cali', 'chokmah', 'complete'),
('C014', 'crate', 'gently-mcp', 'crates/gently-mcp', 'crates/intelligence/gently-mcp', 'Model Context Protocol server', 'Protocol is frozen negotiation', 'bark', 'hod', 'complete'),
('C015', 'crate', 'gently-micro', 'crates/gently-micro', 'crates/intelligence/gently-micro', 'Microcontroller layer', 'Edge intelligence, minimal footprint', 'elf', 'hod', 'complete'),
('C028', 'crate', 'gently-ged', 'crates/intelligence/gently-ged', 'crates/intelligence/gently-ged', 'G.E.D. Generative Educational Device', 'Translate to teach, teach to master', 'cali', 'tiferet', 'complete'),

-- Security crates (Gevurah)
('C016', 'crate', 'gently-security', 'crates/gently-security', 'crates/security/gently-security', '16 daemons + FAFO pitbull', 'A rabid pitbull behind a fence', 'bone', 'gevurah', 'complete'),
('C017', 'crate', 'gently-cipher', 'crates/gently-cipher', 'crates/security/gently-cipher', 'Cryptanalysis toolkit', 'Know the lock to pick the lock', 'bark', 'gevurah', 'complete'),
('C018', 'crate', 'gently-guardian', 'crates/gently-guardian', 'crates/security/gently-guardian', 'Hardware validation, free tier', 'Trust but verify at the edge', 'fence', 'gevurah', 'complete'),
('C019', 'crate', 'gently-sim', 'crates/gently-sim', 'crates/security/gently-sim', 'SIM card security', 'The phone is the attack surface', 'fence', 'gevurah', 'complete'),
('C020', 'crate', 'gently-sploit', 'crates/gently-sploit', 'crates/security/gently-sploit', 'Exploitation framework', 'Offense informs defense', 'turk', 'gevurah', 'complete'),

-- Network crates (Chesed)
('C021', 'crate', 'gently-network', 'crates/gently-network', 'crates/network/gently-network', 'Network visualization, MITM', 'See the flow, control the flow', 'bark', 'chesed', 'complete'),
('C022', 'crate', 'gently-gateway', 'crates/gently-gateway', 'crates/network/gently-gateway', 'API bottleneck', 'The bottleneck is the blessing', 'fence', 'chesed', 'complete'),
('C023', 'crate', 'gently-bridge', 'crates/gently-bridge', 'crates/network/gently-bridge', 'IPC bridge (port 7335)', 'Bridges connect worlds', 'bark', 'chesed', 'complete'),
('C024', 'crate', 'gently-dance', 'crates/gently-dance', 'crates/network/gently-dance', 'P2P visual-audio handshake', 'Trust through ritual', 'spin', 'chesed', 'complete'),

-- Application crates (Keter)
('C025', 'crate', 'gently-web', 'crates/gently-web', 'crates/application/gently-web', 'ONE SCENE GUI (HTMX)', 'The interface IS the system', 'biz', 'keter', 'complete'),
('C026', 'crate', 'gently-architect', 'crates/gently-architect', 'crates/application/gently-architect', 'Idea crystallization', 'Ideas become structures', 'turk', 'tiferet', 'complete'),
('C029', 'crate', 'gently-document', 'crates/application/gently-document', 'crates/application/gently-document', 'Three-chain document engine', 'Every step hashed, every chain verifiable', 'anchor', 'netzach', 'complete'),
('C030', 'crate', 'gently-gooey', 'crates/application/gently-gooey', 'crates/application/gently-gooey', 'GOOEY 2D application builder', 'The interface IS the database', 'biz', 'hod', 'complete'),

-- Binaries
('B001', 'crate', 'gently-cli', 'gently-cli', 'binaries/gently-cli', 'Main CLI binary (28 commands)', 'One command, all power', 'pug', 'keter', 'complete'),
('B002', 'crate', 'gentlyos-tui', 'gentlyos-tui', 'binaries/gentlyos-tui', 'Terminal UI (6 panels)', 'Terminal is the truth', 'biz', 'keter', 'complete');

-- Daath links (hidden connections)
INSERT INTO daath_links (from_entity, to_entity, link_type, strength)
VALUES
('C006', 'C007', 'flows_to', 1.0),    -- alexandria -> search
('C006', 'C008', 'flows_to', 0.8),    -- alexandria -> feed
('C006', 'C011', 'flows_to', 1.0),    -- alexandria -> brain
('C006', 'C012', 'flows_to', 0.9),    -- alexandria -> inference
('C001', 'C016', 'depends', 1.0),     -- core -> security
('C001', 'C003', 'depends', 0.8),     -- core -> artisan
('C011', 'C013', 'flows_to', 1.0),    -- brain -> agents
('C016', 'C018', 'flows_to', 0.9),    -- security -> guardian
('C007', 'C006', 'depends', 1.0),     -- search depends on alexandria
('C011', 'C006', 'depends', 0.9),     -- brain depends on alexandria
('C013', 'C011', 'depends', 1.0),     -- agents depends on brain
('C022', 'C016', 'depends', 0.8),     -- gateway depends on security
('C025', 'C006', 'depends', 0.9),     -- web depends on alexandria
('C025', 'C011', 'depends', 0.8),     -- web depends on brain
-- SYNTHESTASIA crate connections
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

-- Migration log entries for completed reorganization
INSERT INTO migration_log (entity_id, action, from_path, to_path, reason, success)
SELECT id, 'move', before_path, after_path, 'GentlyOS reorganization - tier structure', 1
FROM entities WHERE entity_type = 'crate';
