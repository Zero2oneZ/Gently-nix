# Gently Angels, Demons, and Prophets

## The Keeper of the Garden

In the beginning, there was chaos. Code scattered across machines like seeds
thrown to the wind. Some took root in fertile soil, others fell upon stone.
The builders grew weary, for each machine spoke a different tongue, and what
flourished in one garden withered in another.

So the Angels were summoned -- watchers who see all branches of the great tree,
who know when a limb grows crooked or when rot sets in. They do not judge;
they observe and report.

The Demons were given form -- not evil, but fierce guardians of resources.
They know the heart of each machine, the fire in its GPU, the breath in its
memory. They extract maximum power from willing silicon, never taking more
than offered.

And the Prophets arose -- speakers of truth who translate the arcane into
the understood. They write the myths that explain the mechanisms, turning
cryptographic incantations into bedtime stories any scholar might grasp.

This folder is their dwelling place.

---

## Purpose

This is the master installer and stabilization system for GentlyOS. It serves
as the single source of truth for building, validating, and deploying across
all environments.

### What Lives Here

```
gently-angels-demons-prophets/
    installer/      -- The Demons: Environment detection, GPU optimization
    monitor/        -- The Angels: Git branch watchers, health checks
    docs/           -- The Prophets: Mythological documentation
    specs/          -- Machine specifications and capabilities
    validators/     -- Platform validators (Steam Deck, mobile, PC, Mac)
    guides/         -- Step-by-step installation guides
    codie-maps/     -- CODIE language installation instructions
    filetrees/      -- JSONL registry of all files with stories
```

### The Covenant

1. Every file shall have a story in `filetrees/registry.jsonl`
2. Every story shall be understood by one who studies words, not code
3. The installer shall detect and maximize, never assume
4. Siblings on the local network may join only with blessing
5. When branches break, the system shall heal itself
6. Only the keys of a US QWERTY keyboard shall form these words

---

## Quick Start

```bash
# Validate your environment
./installer/validate.sh

# Generate machine specs
./installer/detect-specs.sh

# Install GentlyOS
./installer/install.sh

# Start the branch monitor
./monitor/angel-watch &
```

---

## Supported Environments

| Platform | Status | Validator |
|----------|--------|-----------|
| Steam Deck | Full | validators/steamdeck.sh |
| Linux x86_64 | Full | validators/linux.sh |
| macOS ARM | Full | validators/macos.sh |
| macOS Intel | Full | validators/macos.sh |
| Windows 10/11 | Full | validators/windows.ps1 |
| Android | Partial | validators/android.sh |
| iOS | Planned | - |
| Web App | Full | validators/web.sh |

---

## The Three Orders

### Angels (Monitoring)

The Angels watch the git branches, counting commits like stars. When a branch
diverges too far from the trunk, they sound the alarm. When tests fail, they
record the failure in the eternal ledger. They never intervene; they witness.

### Demons (Resources)

The Demons commune with hardware. They ask the GPU: "What is your true name?
How many cores burn within you? What memory do you hold?" And the GPU answers,
and the Demons write these truths into specs that the installer may read.

### Prophets (Documentation)

The Prophets take the cold logic of code and warm it with meaning. They write
not "this function returns a boolean" but "this gate opens only for those who
speak the password truly." Their words bridge the gap between those who build
and those who seek to understand.

---

## File Registry

All files are cataloged in `filetrees/registry.jsonl`. Each entry contains:

- `id`: Unique identifier
- `path`: Location in the tree
- `purpose`: What the file does (technical)
- `story`: What the file means (mythological)
- `codie`: CODIE instruction for processing
- `depends`: Files this one requires
- `readme`: Path to connected documentation

---

## Self-Healing

When the world breaks, the installer remembers how it was. The JSONL registry
combined with CODIE instructions create a perfect memory that any LLM can read
and execute. Even if all branches burn, from these ashes the system rises.

```
pug REBUILD
fence
  bone NOT: lose the registry
  bone NOT: skip validation
  bone NOT: ignore failing tests
bark specs <- @machine/detect
bark tree <- @filetrees/registry.jsonl
spin file IN tree
  bark status <- @git/check(file.path)
  ? status.missing -> @installer/restore(file)
  ? status.corrupted -> @installer/rebuild(file)
biz -> "System restored"
```

---

## LAN Siblings

Machines on the same network may form a council. One becomes the Elder,
holding the master registry. Others become Witnesses, syncing their state.
No machine joins without explicit approval from the user.

```bash
# Discover siblings
./installer/lan-discover.sh

# Approve a sibling
./installer/lan-approve.sh <sibling-ip>

# Sync with council
./installer/lan-sync.sh
```

---

*"In the garden of silicon and light, the Angels watch, the Demons optimize,
and the Prophets translate. Together, they keep the code alive."*
