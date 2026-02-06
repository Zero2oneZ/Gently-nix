# GentlyOS Guardian Watchdog

The Guardian is the living manifest of the GentlyOS reorganization. It tracks:

- **Entities**: Crates, files, and their locations
- **BIBLE.md references**: Which principle each crate embodies
- **CODIE annotations**: Execution intent (pug, bark, spin, etc.)
- **Daath connections**: Hidden links between crates
- **Tree of Life mapping**: Sephirotic organization

## Files

| File | Purpose |
|------|---------|
| `guardian.db` | SQLite database with full schema |
| `schema.sql` | Database schema definition |
| `seed.sql` | Initial data (28 crates) |
| `registry.jsonl` | JSONL format registry for tooling |

## Quick Queries

```bash
# Migration status
sqlite3 guardian.db "SELECT * FROM migration_status;"

# Tree of Life view
sqlite3 guardian.db "SELECT * FROM tree_of_life;"

# Find crates by CODIE annotation
sqlite3 guardian.db "SELECT name, purpose FROM entities WHERE codie='bone';"

# Find crates by Sephira
sqlite3 guardian.db "SELECT name, purpose FROM entities WHERE sephira='gevurah';"

# Show Daath connections for alexandria
sqlite3 guardian.db "SELECT e.name, dl.link_type, e2.name FROM daath_links dl JOIN entities e ON dl.from_entity=e.id JOIN entities e2 ON dl.to_entity=e2.id WHERE e.name='gently-alexandria';"
```

## Tree of Life Mapping

```
                    KETER (Crown)
                    gently-cli, gently-web, gentlyos-tui
                    Final unified interfaces
                         |
         +---------------+---------------+
         |                               |
     BINAH (Understanding)        CHOKMAH (Wisdom)
     gently-search                gently-brain, gently-agents
     Constraint/elimination       Creative synthesis
         |                               |
         +----------- DAATH -------------+
                  gently-alexandria
                  Hidden knowledge mesh
                         |
         +-------+-------+-------+
         |       |       |       |
       GEVURAH CHESED TIFERET  HOD
       security network  feed   inference
       Judgment Mercy   Beauty  Splendor
         |       |       |       |
         +-------+-------+-------+
                    |
               YESOD (Foundation)
               gently-codie
               Communication layer
                    |
               MALKUTH (Kingdom)
               gently-core, gently-audio, gently-visual
               Material manifestation
```

## CODIE Keywords

| Keyword | Crates |
|---------|--------|
| **bone** | gently-core, gently-security |
| **pug** | gently-codie, gently-cli |
| **blob** | gently-artisan, gently-alexandria, gently-ipfs |
| **biz** | gently-audio, gently-visual, gently-web, gentlyos-tui |
| **cali** | gently-brain, gently-agents |
| **spin** | gently-feed, gently-inference, gently-dance |
| **fence** | gently-search, gently-guardian, gently-sim, gently-gateway |
| **bark** | gently-cipher, gently-mcp, gently-network, gently-bridge |
| **anchor** | gently-btc |
| **elf** | gently-micro |
| **turk** | gently-sploit, gently-architect, gently-spl, gently-py |
