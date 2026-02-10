//! GentlyOS CLI entry point.

use clap::{Parser, Subcommand};

const BANNER: &str = r#"
   ___            _   _        ___  ___
  / _ \___  _ __ | |_| |_   _ / _ \/ __|
 / /_\/ _ \| '_ \| __| | | | | | | \__ \
/ /_\\ (_) | | | | |_| | |_| | |_| |__) |
\____/\___/|_| |_|\__|_|\__, |\___/|___/
                         |___/  v1.0.0
"#;

#[derive(Parser)]
#[command(name = "gently", version, about = "GentlyOS command-line interface")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new GentlyOS project
    Init,
    /// Build the current project
    Build,
    /// Run a CODIE program
    Run { file: String },
    /// Search across providers
    Search { query: String },
    /// Show system status
    Status,
    /// Vault operations
    Vault {
        #[command(subcommand)]
        subcmd: VaultCommand,
    },
    /// $SYNTH token operations
    Synth {
        #[command(subcommand)]
        subcmd: SynthCommand,
    },
    /// Show IO Surface (text-mode)
    Surface {
        /// Tenant ID
        #[arg(default_value = "gently")]
        tenant: String,
    },
}

#[derive(Subcommand)]
enum VaultCommand {
    Lock,
    Unlock,
    List,
}

#[derive(Subcommand)]
enum SynthCommand {
    Balance,
    Transfer { to: String, amount: u64 },
    Mint { amount: u64 },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Init => { println!("{}", BANNER); println!("Initializing GentlyOS project..."); }
        Commands::Build => { println!("Building..."); }
        Commands::Run { file } => { println!("Running CODIE program: {}", file); }
        Commands::Search { query } => { println!("Searching: {}", query); }
        Commands::Status => { println!("{}", BANNER); println!("Status: OK"); }
        Commands::Vault { subcmd } => match subcmd {
            VaultCommand::Lock => println!("Vault locked."),
            VaultCommand::Unlock => println!("Vault unlocked."),
            VaultCommand::List => println!("Vault contents: (empty)"),
        },
        Commands::Synth { subcmd } => match subcmd {
            SynthCommand::Balance => println!("$SYNTH balance: 0.000000"),
            SynthCommand::Transfer { to, amount } => println!("Transfer {} $SYNTH to {}", amount, to),
            SynthCommand::Mint { amount } => println!("Mint {} $SYNTH", amount),
        },
        Commands::Surface { tenant } => {
            let tier = std::env::var("GENTLY_TIER").unwrap_or_else(|_| "free".to_string());
            let core = ["alexandria", "claude-chat", "guarddog-dns", "env-vault", "shelf"];
            println!("{}", BANNER);
            println!("IO Surface: {} (tier: {})", tenant, tier);
            println!("-------------------------------------------");
            println!("CORE ITEMS (always active):");
            for item in &core {
                println!("  [ON] {}", item);
            }
            println!();
            let extras: Vec<&str> = match tier.as_str() {
                "basic" => vec!["workbench", "python-bridge"],
                "pro" => vec!["workbench", "python-bridge", "docker", "agent-swarm"],
                "dev" | "founder" | "admin" => vec!["workbench", "python-bridge", "docker", "agent-swarm", "limbo", "offensive-tools"],
                _ => vec![],
            };
            if extras.is_empty() {
                println!("TIER ITEMS: (none -- upgrade to unlock)");
            } else {
                println!("TIER ITEMS:");
                for item in &extras {
                    println!("  [ON] {}", item);
                }
            }
            println!();
            println!("Powered by GentlyOS");
        },
    }
    Ok(())
}
