// GentlyOS Tier Gate - Code-Locked Rotation System
// Features dynamically appear/hide based on tier level, hardware score, and Bridge API status

const TIERS = { free: 0, basic: 1, pro: 2, dev: 3 };

const FEATURE_REQUIREMENTS = {
  // CHAT scope features
  'chat.basic': { scope: 'chat', tier: 'free' },
  'chat.guarddog': { scope: 'chat', tier: 'free' },
  'chat.clans': { scope: 'chat', tier: 'basic' },
  'chat.collapse': { scope: 'chat', tier: 'basic' },
  'chat.mcp': { scope: 'chat', tier: 'pro', requiresBridge: true },
  'chat.local-llm': { scope: 'chat', tier: 'pro', minScore: 50 },
  'chat.agents': { scope: 'chat', tier: 'dev', minScore: 100 },

  // FEED scope features
  'feed.browse': { scope: 'feed', tier: 'free' },
  'feed.fork': { scope: 'feed', tier: 'basic' },
  'feed.post': { scope: 'feed', tier: 'pro' },
  'feed.ipfs': { scope: 'feed', tier: 'pro', requiresBridge: true },
  'feed.alexandria': { scope: 'feed', tier: 'dev', requiresBridge: true },

  // BUILD scope features
  'build.view': { scope: 'build', tier: 'free' },
  'build.edit': { scope: 'build', tier: 'basic' },
  'build.doc-chain': { scope: 'build', tier: 'pro' },
  'build.visual-svg': { scope: 'build', tier: 'pro', minScore: 25 },
  'build.goo-field': { scope: 'build', tier: 'dev', minScore: 50 },

  // DOC scope features
  'doc.read': { scope: 'doc', tier: 'free' },
  'doc.ged': { scope: 'doc', tier: 'basic', requiresBridge: true },
  'doc.edit': { scope: 'doc', tier: 'pro' },
  'doc.search': { scope: 'doc', tier: 'dev', requiresBridge: true },

  // INTEGRATIONS (Pro tier - Porkbun)
  'integrations.porkbun': { scope: 'integrations', tier: 'pro' },
  'integrations.porkbun-dns': { scope: 'integrations', tier: 'pro' },
  'integrations.porkbun-ssl': { scope: 'integrations', tier: 'pro' },
  'integrations.porkbun-ddns': { scope: 'integrations', tier: 'pro' },

  // INTEGRATIONS (Dev tier - AI Providers)
  'integrations.huggingface': { scope: 'integrations', tier: 'dev' },
  'integrations.ollama': { scope: 'integrations', tier: 'dev', minScore: 50 },
  'integrations.kaggle': { scope: 'integrations', tier: 'dev' },

  // MCP (Model Context Protocol) - Multi-Scope
  'mcp.visitor': { scope: 'mcp', tier: 'free' },           // RAG chat, help
  'mcp.micro': { scope: 'mcp', tier: 'basic' },            // Micro-app building
  'mcp.app': { scope: 'mcp', tier: 'pro' },                // App UI/UX tools
  'mcp.builder': { scope: 'mcp', tier: 'dev', minScore: 100 }, // Full system tools

  // IPFS Publishing
  'ipfs.publish': { scope: 'ipfs', tier: 'pro' },
  'ipfs.pin': { scope: 'ipfs', tier: 'pro' },
  'ipfs.gateway': { scope: 'ipfs', tier: 'free' },         // Read-only gateway access

  // Agent System (Multi-Agent Orchestration)
  'agent.writer': { scope: 'agent', tier: 'basic' },
  'agent.analyst': { scope: 'agent', tier: 'pro', minScore: 25 },
  'agent.designer': { scope: 'agent', tier: 'pro', minScore: 50 },
  'agent.researcher': { scope: 'agent', tier: 'dev', minScore: 50 },
  'agent.coder': { scope: 'agent', tier: 'dev', minScore: 75 },
  'agent.coordinator': { scope: 'agent', tier: 'dev', minScore: 100 },
  'agent.workflow': { scope: 'agent', tier: 'dev', minScore: 100 },

  // Artisan (Toroidal Knowledge Storage)
  'artisan.view': { scope: 'artisan', tier: 'free' },           // View torus/foam structure
  'artisan.create': { scope: 'artisan', tier: 'basic' },        // Create tori, add points
  'artisan.refine': { scope: 'artisan', tier: 'basic' },        // Refine winding levels
  'artisan.blend': { scope: 'artisan', tier: 'pro' },           // Create blends between tori
  'artisan.query': { scope: 'artisan', tier: 'pro' },           // BARF search queries
  'artisan.traverse': { scope: 'artisan', tier: 'pro' },        // Pathfinding between tori
  'artisan.foam': { scope: 'artisan', tier: 'dev' },            // Multi-foam management
  'artisan.export': { scope: 'artisan', tier: 'dev' },          // Export/import foam
  'artisan.render': { scope: 'artisan', tier: 'dev', minScore: 25 }, // Visualization rendering

  // Architect (Idea Crystallization)
  'architect.ideas': { scope: 'architect', tier: 'basic' },     // Create and manage ideas
  'architect.embed': { scope: 'architect', tier: 'basic' },     // Embed ideas with context
  'architect.confirm': { scope: 'architect', tier: 'basic' },   // Confirm ideas
  'architect.crystallize': { scope: 'architect', tier: 'pro' }, // Crystallize to code
  'architect.tree': { scope: 'architect', tier: 'pro' },        // Project tree management
  'architect.recall': { scope: 'architect', tier: 'pro', minScore: 25 }, // Memory recall
  'architect.flowchart': { scope: 'architect', tier: 'dev', minScore: 50 }, // Flowchart visualization
  'architect.export': { scope: 'architect', tier: 'dev' },      // Export/import data

  // Behavior (Adaptive UI Learning)
  'behavior.profile': { scope: 'behavior', tier: 'basic' },     // Basic behavior tracking
  'behavior.predict': { scope: 'behavior', tier: 'pro' },       // Action predictions
  'behavior.chains': { scope: 'behavior', tier: 'pro', minScore: 25 }, // Chain detection
  'behavior.adaptations': { scope: 'behavior', tier: 'dev', minScore: 50 }, // UI adaptations
  'behavior.export': { scope: 'behavior', tier: 'dev' },        // Export/import data

  // Network (Security Visualization)
  'network.firewall': { scope: 'network', tier: 'pro' },        // Firewall rules
  'network.monitor': { scope: 'network', tier: 'pro', minScore: 25 }, // Event monitoring
  'network.topology': { scope: 'network', tier: 'pro' },        // Network topology view
  'network.capture': { scope: 'network', tier: 'dev', minScore: 50 }, // Packet capture
  'network.proxy': { scope: 'network', tier: 'dev', minScore: 75 },   // MITM proxy
  'network.export': { scope: 'network', tier: 'dev' },          // Export/import data

  // Sploit (Security Testing) - DEV ONLY
  'sploit.scan': { scope: 'sploit', tier: 'dev', minScore: 50 },      // Target scanning
  'sploit.check': { scope: 'sploit', tier: 'dev', minScore: 75 },     // Vulnerability checking
  'sploit.exploit': { scope: 'sploit', tier: 'dev', minScore: 100 },  // Run exploits
  'sploit.sessions': { scope: 'sploit', tier: 'dev', minScore: 100 }, // Session management
  'sploit.workspace': { scope: 'sploit', tier: 'dev' },               // Workspace management

  // Commerce (Vibe Commerce)
  'commerce.search': { scope: 'commerce', tier: 'pro' },              // Product search
  'commerce.cart': { scope: 'commerce', tier: 'pro' },                // Shopping cart
  'commerce.alerts': { scope: 'commerce', tier: 'pro' },              // Price alerts
  'commerce.checkout': { scope: 'commerce', tier: 'pro', requiresBridge: true }, // Checkout
  'commerce.trading': { scope: 'commerce', tier: 'dev', minScore: 50 }, // Market data/trading
  'commerce.stores': { scope: 'commerce', tier: 'dev' },              // Store management

  // Dance (Device Pairing Protocol)
  'dance.initiate': { scope: 'dance', tier: 'pro', requiresBridge: true }, // Start pairing
  'dance.exchange': { scope: 'dance', tier: 'pro', requiresBridge: true }, // Fragment exchange
  'dance.contract': { scope: 'dance', tier: 'dev', requiresBridge: true }, // Contract management
  'dance.audit': { scope: 'dance', tier: 'dev', minScore: 50, requiresBridge: true }, // Contract audit
  'dance.pattern': { scope: 'dance', tier: 'dev' },                   // Visual pattern generation

  // =============================================
  // PHASE 9: Core (XOR Cryptographic Foundation)
  // =============================================
  'core.vault': { scope: 'core', tier: 'basic' },          // Key vault management
  'core.xor': { scope: 'core', tier: 'basic' },            // Basic XOR operations
  'core.lock': { scope: 'core', tier: 'pro' },             // Create locks
  'core.key': { scope: 'core', tier: 'pro' },              // Key derivation
  'core.pattern': { scope: 'core', tier: 'pro' },          // Pattern encoding
  'core.genesis': { scope: 'core', tier: 'dev' },          // Genesis key operations
  'core.blob': { scope: 'core', tier: 'dev' },             // Blob storage

  // =============================================
  // PHASE 9: Cipher (Cryptanalysis Toolkit)
  // =============================================
  'cipher.identify': { scope: 'cipher', tier: 'free' },    // Cipher identification
  'cipher.frequency': { scope: 'cipher', tier: 'free' },   // Frequency analysis
  'cipher.hash': { scope: 'cipher', tier: 'basic' },       // Hash operations
  'cipher.encode': { scope: 'cipher', tier: 'basic' },     // Encoding/decoding
  'cipher.classical': { scope: 'cipher', tier: 'pro' },    // Classical ciphers
  'cipher.xor': { scope: 'cipher', tier: 'pro' },          // XOR analysis
  'cipher.morse': { scope: 'cipher', tier: 'basic' },      // Morse code

  // =============================================
  // PHASE 9: Audio (Dual-Mode Audio Engine)
  // =============================================
  'audio.audible': { scope: 'audio', tier: 'pro' },        // Audible frequency mode
  'audio.ultrasonic': { scope: 'audio', tier: 'dev', minScore: 50 }, // Ultrasonic mode
  'audio.encode': { scope: 'audio', tier: 'pro' },         // Encode data to audio
  'audio.decode': { scope: 'audio', tier: 'pro' },         // Decode audio to data
  'audio.session': { scope: 'audio', tier: 'pro' },        // Session management
  'audio.tone': { scope: 'audio', tier: 'basic' },         // Generate tones
  'audio.chord': { scope: 'audio', tier: 'basic' },        // Generate chords

  // =============================================
  // PHASE 9: BTC (Bitcoin Block-Based Key Rotation)
  // =============================================
  'btc.clock': { scope: 'btc', tier: 'pro' },              // Berlin Clock
  'btc.schedule': { scope: 'btc', tier: 'pro' },           // Rotation schedules
  'btc.key': { scope: 'btc', tier: 'pro' },                // Block-derived keys
  'btc.anchor': { scope: 'btc', tier: 'dev' },             // Timestamp anchoring
  'btc.simulate': { scope: 'btc', tier: 'dev' },           // Block simulation
  'btc.api': { scope: 'btc', tier: 'dev', requiresBridge: true }, // External API

  // =============================================
  // PHASE 9: Security (Multi-Layer Defense)
  // =============================================
  'security.scan': { scope: 'security', tier: 'free' },    // Input scanning
  'security.normalize': { scope: 'security', tier: 'free' }, // Homoglyph normalization
  'security.injection': { scope: 'security', tier: 'basic' }, // Injection detection
  'security.policy': { scope: 'security', tier: 'pro' },   // Security policies
  'security.vault': { scope: 'security', tier: 'pro' },    // Secret vault
  'security.audit': { scope: 'security', tier: 'dev' },    // Audit logging

  // =============================================
  // PHASE 9: Brain (Self-Evolving AI Memory)
  // =============================================
  'brain.memory': { scope: 'brain', tier: 'basic' },       // Memory storage
  'brain.recall': { scope: 'brain', tier: 'basic' },       // Memory recall
  'brain.search': { scope: 'brain', tier: 'pro' },         // Memory search
  'brain.cluster': { scope: 'brain', tier: 'pro' },        // Memory clustering
  'brain.learning': { scope: 'brain', tier: 'pro', minScore: 25 }, // Learning episodes
  'brain.attention': { scope: 'brain', tier: 'pro' },      // Attention focus
  'brain.consolidation': { scope: 'brain', tier: 'dev', minScore: 50 }, // Memory consolidation
  'brain.evolution': { scope: 'brain', tier: 'dev', minScore: 75 }, // Evolution tracking

  // =============================================
  // PHASE 9: Inference (Quality Mining Pipeline)
  // =============================================
  'inference.request': { scope: 'inference', tier: 'basic' }, // Create requests
  'inference.model': { scope: 'inference', tier: 'pro' },  // Model selection
  'inference.quality': { scope: 'inference', tier: 'pro' }, // Quality scoring
  'inference.refine': { scope: 'inference', tier: 'pro', minScore: 25 }, // Output refinement
  'inference.chain': { scope: 'inference', tier: 'dev', minScore: 50 }, // Chain of thought
  'inference.pipeline': { scope: 'inference', tier: 'dev', minScore: 75 }, // Inference pipelines

  // =============================================
  // PHASE 9: Micro (Local Intelligence Engine)
  // =============================================
  'micro.model': { scope: 'micro', tier: 'pro', minScore: 25 }, // Model management
  'micro.infer': { scope: 'micro', tier: 'pro', minScore: 25 }, // Local inference
  'micro.embed': { scope: 'micro', tier: 'pro', minScore: 25 }, // Text embeddings
  'micro.similar': { scope: 'micro', tier: 'pro', minScore: 25 }, // Similarity search
  'micro.pipeline': { scope: 'micro', tier: 'dev', minScore: 50 }, // Micro pipelines
  'micro.cache': { scope: 'micro', tier: 'pro' },          // Inference cache

  // =============================================
  // PHASE 9: Gateway (Central API Bottleneck)
  // =============================================
  'gateway.endpoint': { scope: 'gateway', tier: 'pro' },   // Endpoint registration
  'gateway.request': { scope: 'gateway', tier: 'pro' },    // Make requests
  'gateway.queue': { scope: 'gateway', tier: 'pro' },      // Request queuing
  'gateway.ratelimit': { scope: 'gateway', tier: 'pro' },  // Rate limiting
  'gateway.circuit': { scope: 'gateway', tier: 'dev' },    // Circuit breaker
  'gateway.interceptor': { scope: 'gateway', tier: 'dev' }, // Request interceptors
  'gateway.cache': { scope: 'gateway', tier: 'pro' },      // Response caching

  // =============================================
  // PHASE 9: SIM (SIM Card Security)
  // =============================================
  'sim.register': { scope: 'sim', tier: 'dev' },           // SIM registration
  'sim.imei': { scope: 'sim', tier: 'dev' },               // IMEI validation
  'sim.cell': { scope: 'sim', tier: 'dev', minScore: 50 }, // Cell tower tracking
  'sim.pin': { scope: 'sim', tier: 'dev' },                // PIN management
  'sim.security': { scope: 'sim', tier: 'dev', minScore: 75 }, // IMSI catcher detection
  'sim.alerts': { scope: 'sim', tier: 'dev', minScore: 75 }, // Security alerts

  // =============================================
  // PHASE 9: Codie (Compressed DSL Engine)
  // =============================================
  'codie.tokenize': { scope: 'codie', tier: 'basic' },     // Tokenization
  'codie.parse': { scope: 'codie', tier: 'basic' },        // AST parsing
  'codie.compile': { scope: 'codie', tier: 'pro' },        // JS compilation
  'codie.interpret': { scope: 'codie', tier: 'pro' },      // Direct interpretation
  'codie.program': { scope: 'codie', tier: 'pro' },        // Program storage
  'codie.validate': { scope: 'codie', tier: 'basic' },     // Syntax validation

  // =============================================
  // Bluetooth (Outward BLE Connections)
  // =============================================
  'bluetooth.scan': { scope: 'bluetooth', tier: 'basic' }, // Device scanning
  'bluetooth.connect': { scope: 'bluetooth', tier: 'basic' }, // Connect to device
  'bluetooth.pair': { scope: 'bluetooth', tier: 'pro' },   // Device pairing
  'bluetooth.message': { scope: 'bluetooth', tier: 'pro' }, // Send messages
  'bluetooth.template': { scope: 'bluetooth', tier: 'pro' }, // Custom templates
  'bluetooth.command': { scope: 'bluetooth', tier: 'dev' }, // Send commands
  'bluetooth.custom': { scope: 'bluetooth', tier: 'dev' }, // Custom message types

  // =============================================
  // StartMenu (Settings and Launcher)
  // =============================================
  'startmenu.browse': { scope: 'startmenu', tier: 'free' }, // Browse menu
  'startmenu.search': { scope: 'startmenu', tier: 'free' }, // Search items
  'startmenu.recent': { scope: 'startmenu', tier: 'free' }, // Recent items
  'startmenu.settings-view': { scope: 'startmenu', tier: 'free' }, // View settings
  'startmenu.settings-edit': { scope: 'startmenu', tier: 'basic' }, // Edit settings
  'startmenu.items': { scope: 'startmenu', tier: 'basic' }, // Manage items
  'startmenu.pin': { scope: 'startmenu', tier: 'basic' },  // Pin items
  'startmenu.categories': { scope: 'startmenu', tier: 'pro' }, // Custom categories
  'startmenu.export': { scope: 'startmenu', tier: 'pro' }, // Export/import settings

  // =============================================
  // Bucket (Import/Export Hub)
  // =============================================
  'bucket.list': { scope: 'bucket', tier: 'free' },        // List files/repos
  'bucket.import-file': { scope: 'bucket', tier: 'basic' }, // Import local files
  'bucket.import-dir': { scope: 'bucket', tier: 'basic' }, // Import directories
  'bucket.clone-repo': { scope: 'bucket', tier: 'pro' },   // Clone GitHub repos
  'bucket.trash': { scope: 'bucket', tier: 'basic' },      // Trash management
  'bucket.cleanup': { scope: 'bucket', tier: 'pro' },      // Auto cleanup
  'bucket.disk': { scope: 'bucket', tier: 'pro' },         // Disk usage analysis
  'bucket.bulk': { scope: 'bucket', tier: 'dev' },         // Bulk operations

  // =============================================
  // Miner (BTC Solo Mining) - Dev Tier, High Hardware
  // =============================================
  'miner.wallet': { scope: 'miner', tier: 'dev', minScore: 50 },  // Wallet generation
  'miner.configure': { scope: 'miner', tier: 'dev', minScore: 50 }, // Pool configuration
  'miner.start': { scope: 'miner', tier: 'dev', minScore: 75 },   // Start mining
  'miner.control': { scope: 'miner', tier: 'dev', minScore: 75 }, // Pause/resume/stop
  'miner.stats': { scope: 'miner', tier: 'dev', minScore: 50 },   // View stats
  'miner.z3ro2z': { scope: 'miner', tier: 'dev', minScore: 100 }, // Z3RO2Z hint system

  // =============================================
  // Controller (Steam Deck Full Controls)
  // =============================================
  'controller.connect': { scope: 'controller', tier: 'free' },    // Connect to controller
  'controller.state': { scope: 'controller', tier: 'free' },      // Read controller state
  'controller.buttons': { scope: 'controller', tier: 'free' },    // Button inputs
  'controller.sticks': { scope: 'controller', tier: 'free' },     // Analog sticks
  'controller.dpad': { scope: 'controller', tier: 'free' },       // D-pad
  'controller.triggers': { scope: 'controller', tier: 'basic' },  // Analog triggers
  'controller.trackpads': { scope: 'controller', tier: 'basic' }, // Trackpad input
  'controller.gyro': { scope: 'controller', tier: 'pro' },        // Gyroscope
  'controller.accel': { scope: 'controller', tier: 'pro' },       // Accelerometer
  'controller.bindings': { scope: 'controller', tier: 'basic' },  // Custom bindings
  'controller.profiles': { scope: 'controller', tier: 'pro' },    // Profile management
  'controller.haptics': { scope: 'controller', tier: 'dev' },     // Haptic feedback

  // =============================================
  // HotkeyMenu (Maya-Style Radial Hotkey Menu)
  // =============================================
  'hotkeyMenu.show': { scope: 'hotkeyMenu', tier: 'free' },       // Show menu
  'hotkeyMenu.select': { scope: 'hotkeyMenu', tier: 'free' },     // Select items
  'hotkeyMenu.custom': { scope: 'hotkeyMenu', tier: 'basic' },    // Custom menus
  'hotkeyMenu.nested': { scope: 'hotkeyMenu', tier: 'basic' },    // Nested submenus
  'hotkeyMenu.radial': { scope: 'hotkeyMenu', tier: 'pro' },      // Radial layout
  'hotkeyMenu.gestures': { scope: 'hotkeyMenu', tier: 'pro' },    // Gesture triggers

  // =============================================
  // Action (Quick Action Server)
  // =============================================
  'action.dispatch': { scope: 'action', tier: 'free' },           // Dispatch actions
  'action.handlers': { scope: 'action', tier: 'basic' },          // Register handlers
  'action.patterns': { scope: 'action', tier: 'basic' },          // Pattern matching
  'action.queue': { scope: 'action', tier: 'pro' },               // Priority queue
  'action.batch': { scope: 'action', tier: 'pro' },               // Batch dispatch
  'action.async': { scope: 'action', tier: 'dev' },               // Async actions
  'action.workflows': { scope: 'action', tier: 'dev', minScore: 50 }, // Action workflows

  // =============================================
  // Wireshark (Packet Capture with MCP Control)
  // =============================================
  'wireshark.interfaces': { scope: 'wireshark', tier: 'pro' },    // List interfaces
  'wireshark.capture': { scope: 'wireshark', tier: 'pro', minScore: 25 }, // Start capture
  'wireshark.filter': { scope: 'wireshark', tier: 'pro' },        // BPF filters
  'wireshark.mcp': { scope: 'wireshark', tier: 'dev', requiresBridge: true }, // MCP traffic decode
  'wireshark.analysis': { scope: 'wireshark', tier: 'dev', minScore: 50 }, // Deep analysis
  'wireshark.export': { scope: 'wireshark', tier: 'dev' },        // Export captures

  // =============================================
  // ButtonMaker (Custom Button Creator)
  // =============================================
  'buttonMaker.create': { scope: 'buttonMaker', tier: 'basic' },  // Create buttons
  'buttonMaker.icons': { scope: 'buttonMaker', tier: 'basic' },   // Icon library
  'buttonMaker.styles': { scope: 'buttonMaker', tier: 'basic' },  // Button styles
  'buttonMaker.palettes': { scope: 'buttonMaker', tier: 'pro' },  // Button palettes
  'buttonMaker.export': { scope: 'buttonMaker', tier: 'pro' },    // Export CSS/HTML
  'buttonMaker.custom': { scope: 'buttonMaker', tier: 'pro' },    // Custom SVG icons

  // =============================================
  // Wayland (Compositor Control)
  // =============================================
  'wayland.windows': { scope: 'wayland', tier: 'basic' },         // Window list
  'wayland.workspaces': { scope: 'wayland', tier: 'basic' },      // Workspace management
  'wayland.move': { scope: 'wayland', tier: 'basic' },            // Move/resize windows
  'wayland.screenshot': { scope: 'wayland', tier: 'pro' },        // Screenshots
  'wayland.templates': { scope: 'wayland', tier: 'pro' },         // Desktop templates
  'wayland.monitors': { scope: 'wayland', tier: 'pro' },          // Multi-monitor
  'wayland.layouts': { scope: 'wayland', tier: 'dev' },           // Custom layouts
  'wayland.compositor': { scope: 'wayland', tier: 'dev', minScore: 50 }, // Compositor control

  // =============================================
  // SMS (SMS Collection and Management)
  // =============================================
  'sms.connect': { scope: 'sms', tier: 'basic' },                 // Device connection
  'sms.messages': { scope: 'sms', tier: 'basic' },                // View messages
  'sms.threads': { scope: 'sms', tier: 'basic' },                 // Thread management
  'sms.contacts': { scope: 'sms', tier: 'pro' },                  // Contact management
  'sms.export': { scope: 'sms', tier: 'pro' },                    // Export messages
  'sms.filter': { scope: 'sms', tier: 'pro' },                    // Message filtering
  'sms.bulk': { scope: 'sms', tier: 'dev' },                      // Bulk operations
  'sms.automation': { scope: 'sms', tier: 'dev', minScore: 25 },  // SMS automation

  // =============================================
  // Phone (Cell Phone Emulator)
  // =============================================
  'phone.list': { scope: 'phone', tier: 'pro' },                  // List emulators
  'phone.create': { scope: 'phone', tier: 'pro', minScore: 50 },  // Create emulator
  'phone.start': { scope: 'phone', tier: 'pro', minScore: 50 },   // Start emulator
  'phone.adb': { scope: 'phone', tier: 'pro' },                   // ADB commands
  'phone.apps': { scope: 'phone', tier: 'pro' },                  // App management
  'phone.screenshot': { scope: 'phone', tier: 'pro' },            // Screenshots
  'phone.simulate': { scope: 'phone', tier: 'dev', minScore: 75 }, // GPS/network/battery sim
  'phone.waydroid': { scope: 'phone', tier: 'dev', minScore: 100 }, // Waydroid support

  // =============================================
  // VM (Virtual Machine Management)
  // =============================================
  'vm.list': { scope: 'vm', tier: 'dev' },                        // List VMs
  'vm.create': { scope: 'vm', tier: 'dev', minScore: 75 },        // Create VM
  'vm.start': { scope: 'vm', tier: 'dev', minScore: 50 },         // Start VM
  'vm.stop': { scope: 'vm', tier: 'dev' },                        // Stop VM
  'vm.snapshot': { scope: 'vm', tier: 'dev' },                    // Snapshots
  'vm.connect': { scope: 'vm', tier: 'dev' },                     // Connect via SSH/VNC
  'vm.network': { scope: 'vm', tier: 'dev', minScore: 75 },       // Test networks
  'vm.presets': { scope: 'vm', tier: 'dev', minScore: 100 },      // Quick presets (ubuntu, kali, etc.)

  // =============================================
  // LivePeer (Decentralized Video Streaming)
  // =============================================
  'livepeer.stream': { scope: 'livepeer', tier: 'pro' },          // Create streams
  'livepeer.view': { scope: 'livepeer', tier: 'free' },           // View streams
  'livepeer.transcode': { scope: 'livepeer', tier: 'pro', minScore: 50 }, // Local transcoding
  'livepeer.upload': { scope: 'livepeer', tier: 'pro' },          // Upload assets
  'livepeer.local-server': { scope: 'livepeer', tier: 'dev' },    // Local RTMP server
  'livepeer.ai-image': { scope: 'livepeer', tier: 'pro', requiresBridge: true }, // Text/image to image
  'livepeer.ai-video': { scope: 'livepeer', tier: 'dev', requiresBridge: true, minScore: 75 }, // Image to video
  'livepeer.ai-whisper': { scope: 'livepeer', tier: 'pro', requiresBridge: true }, // Audio to text
  'livepeer.ai-segment': { scope: 'livepeer', tier: 'dev', requiresBridge: true, minScore: 50 }, // SAM2
  'livepeer.ai-llm': { scope: 'livepeer', tier: 'dev', requiresBridge: true }, // LLM inference

  // =============================================
  // ModelHub (Central ML Model Management)
  // =============================================
  'modelhub.browse': { scope: 'modelhub', tier: 'free' },         // Browse models
  'modelhub.register': { scope: 'modelhub', tier: 'basic' },      // Register models
  'modelhub.collections': { scope: 'modelhub', tier: 'basic' },   // Model collections
  'modelhub.tags': { scope: 'modelhub', tier: 'basic' },          // Tag models
  'modelhub.download-hf': { scope: 'modelhub', tier: 'pro' },     // Download from HuggingFace
  'modelhub.download-ollama': { scope: 'modelhub', tier: 'pro' }, // Download from Ollama
  'modelhub.invoke-llm': { scope: 'modelhub', tier: 'pro', minScore: 50 }, // Invoke LLM models
  'modelhub.invoke-embed': { scope: 'modelhub', tier: 'pro', minScore: 25 }, // Invoke embedding models
  'modelhub.invoke-vision': { scope: 'modelhub', tier: 'dev', minScore: 75 }, // Invoke vision models
  'modelhub.mcp-server': { scope: 'modelhub', tier: 'dev' },      // MCP server for models
  'modelhub.mcp-tools': { scope: 'modelhub', tier: 'dev' },       // Register MCP tools
  'modelhub.ollama': { scope: 'modelhub', tier: 'pro', minScore: 50 }, // Run Ollama models

  // =============================================
  // DNS (Domain/DNS Management)
  // =============================================
  'dns.browse': { scope: 'dns', tier: 'free' },                   // View domains
  'dns.records-view': { scope: 'dns', tier: 'basic' },            // View DNS records
  'dns.records-edit': { scope: 'dns', tier: 'pro' },              // Create/update/delete records
  'dns.presets': { scope: 'dns', tier: 'pro' },                   // Apply hosting presets
  'dns.nameservers': { scope: 'dns', tier: 'dev' },               // Modify nameservers
  'dns.cloudflare-proxy': { scope: 'dns', tier: 'pro' },          // Cloudflare proxy toggle
  'dns.multi-provider': { scope: 'dns', tier: 'dev' },            // Multiple DNS providers

  // =============================================
  // Telephony (SMS/Voice - Telnyx/Plivo)
  // =============================================
  'telephony.browse': { scope: 'telephony', tier: 'free' },       // View pricing/info
  'telephony.numbers': { scope: 'telephony', tier: 'pro' },       // List phone numbers
  'telephony.sms': { scope: 'telephony', tier: 'pro' },           // Send SMS
  'telephony.mms': { scope: 'telephony', tier: 'pro' },           // Send MMS
  'telephony.voice': { scope: 'telephony', tier: 'dev' },         // Make calls
  'telephony.search': { scope: 'telephony', tier: 'pro' },        // Search available numbers
  'telephony.buy': { scope: 'telephony', tier: 'dev' },           // Purchase numbers

  // =============================================
  // Gmail (Local Email Management)
  // =============================================
  'gmail.browse': { scope: 'gmail', tier: 'free' },               // View accounts
  'gmail.oauth': { scope: 'gmail', tier: 'basic' },               // OAuth authentication
  'gmail.read': { scope: 'gmail', tier: 'basic' },                // Read emails
  'gmail.send': { scope: 'gmail', tier: 'pro' },                  // Send emails
  'gmail.labels': { scope: 'gmail', tier: 'basic' },              // Manage labels
  'gmail.search': { scope: 'gmail', tier: 'basic' },              // Search emails
  'gmail.sync': { scope: 'gmail', tier: 'pro' },                  // Sync inbox
  'gmail.auto-sync': { scope: 'gmail', tier: 'dev' },             // Auto-sync background
  'gmail.multi-account': { scope: 'gmail', tier: 'dev' },         // Multiple accounts

  // =============================================
  // Face Tracking (MediaPipe Face Mesh)
  // =============================================
  'facetracking.browse': { scope: 'facetracking', tier: 'free' }, // View cameras
  'facetracking.track': { scope: 'facetracking', tier: 'pro', minScore: 25 }, // Start tracking
  'facetracking.calibrate': { scope: 'facetracking', tier: 'pro', minScore: 25 }, // Calibration
  'facetracking.blendshapes': { scope: 'facetracking', tier: 'pro', minScore: 25 }, // Blend shapes
  'facetracking.expressions': { scope: 'facetracking', tier: 'pro', minScore: 50 }, // Expression detection
  'facetracking.history': { scope: 'facetracking', tier: 'dev', minScore: 50 }, // Tracking history

  // =============================================
  // Avatar Studio (Avatar Creation & Animation)
  // =============================================
  'avatar.browse': { scope: 'avatar', tier: 'free' },             // View avatars
  'avatar.create': { scope: 'avatar', tier: 'basic' },            // Create avatars
  'avatar.customize': { scope: 'avatar', tier: 'basic' },         // Customize parts
  'avatar.animate': { scope: 'avatar', tier: 'pro' },             // Play animations
  'avatar.blendshapes': { scope: 'avatar', tier: 'pro', minScore: 25 }, // Apply blend shapes
  'avatar.custom-animation': { scope: 'avatar', tier: 'pro', minScore: 50 }, // Create animations
  'avatar.export': { scope: 'avatar', tier: 'dev' },              // Export avatars
  'avatar.import': { scope: 'avatar', tier: 'dev' },              // Import avatars
  'avatar.render': { scope: 'avatar', tier: 'pro' },              // Render SVG

  // =============================================
  // Realtime Graphics (On-Screen Rendering)
  // =============================================
  'graphics.browse': { scope: 'graphics', tier: 'free' },         // View graphics
  'graphics.layers': { scope: 'graphics', tier: 'basic' },        // Layer management
  'graphics.chat-bubbles': { scope: 'graphics', tier: 'basic' },  // Chat bubble overlays
  'graphics.particles': { scope: 'graphics', tier: 'pro', minScore: 25 }, // Particle systems
  'graphics.effects': { scope: 'graphics', tier: 'pro', minScore: 25 }, // Visual effects
  'graphics.animate': { scope: 'graphics', tier: 'pro' },         // Layer animations
  'graphics.render': { scope: 'graphics', tier: 'pro', minScore: 50 }, // Real-time rendering

  // =============================================
  // Tab View Switcher (Multi-Tab Management)
  // =============================================
  'tabs.browse': { scope: 'tabs', tier: 'free' },                 // View tabs
  'tabs.create': { scope: 'tabs', tier: 'free' },                 // Create tabs
  'tabs.switch': { scope: 'tabs', tier: 'free' },                 // Switch tabs
  'tabs.close': { scope: 'tabs', tier: 'free' },                  // Close tabs
  'tabs.groups': { scope: 'tabs', tier: 'basic' },                // Tab groups
  'tabs.pin': { scope: 'tabs', tier: 'basic' },                   // Pin tabs
  'tabs.split-view': { scope: 'tabs', tier: 'pro' },              // Split/grid views
  'tabs.auto-rotation': { scope: 'tabs', tier: 'pro' },           // Auto rotation
  'tabs.transitions': { scope: 'tabs', tier: 'basic' },           // Tab transitions
  'tabs.history': { scope: 'tabs', tier: 'basic' },               // Navigation history
  'tabs.persist': { scope: 'tabs', tier: 'pro' },                 // Save/restore state

  // =============================================
  // Intro Creator (Animated Intros)
  // =============================================
  'intro.browse': { scope: 'intro', tier: 'free' },               // View intros
  'intro.templates': { scope: 'intro', tier: 'free' },            // Use templates
  'intro.create': { scope: 'intro', tier: 'basic' },              // Create custom intros
  'intro.elements': { scope: 'intro', tier: 'basic' },            // Add text/shapes
  'intro.animate': { scope: 'intro', tier: 'basic' },             // Add animations
  'intro.preview': { scope: 'intro', tier: 'basic' },             // Preview at time
  'intro.play': { scope: 'intro', tier: 'basic' },                // Play intros
  'intro.export': { scope: 'intro', tier: 'pro' },                // Export render commands
  'intro.import': { scope: 'intro', tier: 'pro' },                // Import from JSON
  'intro.custom-templates': { scope: 'intro', tier: 'dev' },      // Create templates

  // =============================================
  // TradingView (Chart Analysis & Strategy Building)
  // =============================================
  'tradingview.browse': { scope: 'tradingview', tier: 'free' },          // View charts
  'tradingview.connect': { scope: 'tradingview', tier: 'basic' },        // Connect to TV
  'tradingview.symbols': { scope: 'tradingview', tier: 'basic' },        // Change symbols
  'tradingview.timeframes': { scope: 'tradingview', tier: 'basic' },     // Change timeframes
  'tradingview.indicators': { scope: 'tradingview', tier: 'basic' },     // Add indicators
  'tradingview.csv-export': { scope: 'tradingview', tier: 'pro' },       // Export to CSV
  'tradingview.pine-inject': { scope: 'tradingview', tier: 'pro' },      // Inject PineScript
  'tradingview.strategy-create': { scope: 'tradingview', tier: 'pro' },  // Create strategies
  'tradingview.strategy-deploy': { scope: 'tradingview', tier: 'pro' },  // Deploy to TV
  'tradingview.backtest': { scope: 'tradingview', tier: 'pro' },         // Get backtest results
  'tradingview.realtime': { scope: 'tradingview', tier: 'dev', minScore: 25 }, // Real-time DOM
  'tradingview.custom-pine': { scope: 'tradingview', tier: 'dev' },      // Custom PineScript
  'tradingview.automation': { scope: 'tradingview', tier: 'dev', minScore: 50 }, // Auto-trading
};

class TierGate {
  constructor(userTier, hardwareScore, bridgeOnline) {
    this.userTier = userTier || 'free';
    this.hardwareScore = hardwareScore || 0;
    this.bridgeOnline = bridgeOnline || false;
  }

  // Hardware score can cap the effective tier
  getEffectiveTier() {
    const hwTier = this.hardwareScore >= 100 ? 'dev' :
                   this.hardwareScore >= 50 ? 'pro' :
                   this.hardwareScore >= 25 ? 'basic' : 'free';
    // Effective tier is the minimum of user tier and hardware tier
    return Object.keys(TIERS)[Math.min(TIERS[this.userTier], TIERS[hwTier])];
  }

  // Check if a specific feature is available
  isFeatureAvailable(feature) {
    const req = FEATURE_REQUIREMENTS[feature];
    if (!req) return false;

    // Check tier requirement
    if (TIERS[this.getEffectiveTier()] < TIERS[req.tier]) return false;

    // Check hardware score requirement
    if (req.minScore && this.hardwareScore < req.minScore) return false;

    // Check bridge requirement
    if (req.requiresBridge && !this.bridgeOnline) return false;

    return true;
  }

  // Get reason why a feature is unavailable
  getFeatureBlockReason(feature) {
    const req = FEATURE_REQUIREMENTS[feature];
    if (!req) return 'Unknown feature';

    if (TIERS[this.getEffectiveTier()] < TIERS[req.tier]) {
      return `Requires ${req.tier} tier`;
    }
    if (req.minScore && this.hardwareScore < req.minScore) {
      return `Requires HW score ${req.minScore}+`;
    }
    if (req.requiresBridge && !this.bridgeOnline) {
      return 'Bridge offline';
    }
    return null;
  }

  // Get all available features for a scope
  getAvailableFeatures(scope) {
    return Object.entries(FEATURE_REQUIREMENTS)
      .filter(([_, r]) => r.scope === scope)
      .filter(([f, _]) => this.isFeatureAvailable(f))
      .map(([feature, req]) => ({
        feature,
        tier: req.tier,
        scope: req.scope,
        requiresBridge: req.requiresBridge || false,
        minScore: req.minScore || null,
      }));
  }

  // Get all features for a scope (available or not)
  getAllScopeFeatures(scope) {
    return Object.entries(FEATURE_REQUIREMENTS)
      .filter(([_, r]) => r.scope === scope)
      .map(([feature, req]) => ({
        feature,
        tier: req.tier,
        scope: req.scope,
        available: this.isFeatureAvailable(feature),
        reason: this.getFeatureBlockReason(feature),
      }));
  }

  // Get tier comparison info
  getTierInfo() {
    return {
      userTier: this.userTier,
      hardwareScore: this.hardwareScore,
      bridgeOnline: this.bridgeOnline,
      effectiveTier: this.getEffectiveTier(),
      tierLevel: TIERS[this.getEffectiveTier()],
    };
  }
}

module.exports = { TierGate, TIERS, FEATURE_REQUIREMENTS };
