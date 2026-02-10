//! Tier Resolver -- maps wallet address + chain target to a Layer.
//!
//! NFT ownership determines your Layer (visibility/permissions).
//! This avoids resurrecting gently-spl (Solana version conflicts).

use gently_core::layer::Layer;

use crate::{Address, ChainTarget, SynthError};

/// Maps NFT tier names to Layer values.
/// These are the tiers used by tier-gate.nix.
fn nft_tier_to_layer(tier: &str) -> Option<Layer> {
    match tier {
        "founder" => Some(Layer::Admin),
        "dev" => Some(Layer::DevLevel),
        "pro" => Some(Layer::OsAdmin),
        "basic" => Some(Layer::RootUser),
        "free" => Some(Layer::User),
        _ => None,
    }
}

/// Resolve a wallet address to its Layer based on NFT ownership.
///
/// In production, this queries the appropriate chain for NFT ownership.
/// Returns `Layer::User` (L5) if no NFT is found or chain is unavailable.
pub fn resolve_tier(wallet: &Address, chain: ChainTarget) -> Result<Layer, SynthError> {
    // Stub implementation: in production, query on-chain NFT ownership.
    // For Local chain, check against a local ledger.
    // For Solana/Ethereum/Base, call the respective RPC.
    match chain {
        ChainTarget::Local => {
            // Local testing: parse tier from address prefix convention
            // e.g., "founder:0xabc" -> Layer::Admin
            let addr = &wallet.0;
            if let Some(tier_prefix) = addr.split(':').next() {
                if let Some(layer) = nft_tier_to_layer(tier_prefix) {
                    return Ok(layer);
                }
            }
            Ok(Layer::User)
        }
        ChainTarget::Solana | ChainTarget::Ethereum | ChainTarget::Base => {
            // Production stub: would call chain RPC here
            // For now, return User (safest default)
            Ok(Layer::User)
        }
    }
}

/// Batch-resolve multiple wallets (useful for multi-tenant startup).
pub fn resolve_tiers(
    wallets: &[(Address, ChainTarget)],
) -> Vec<Result<Layer, SynthError>> {
    wallets.iter().map(|(w, c)| resolve_tier(w, c.clone())).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_founder_resolves() {
        let addr = Address("founder:0xabc".into());
        let layer = resolve_tier(&addr, ChainTarget::Local).unwrap();
        assert_eq!(layer, Layer::Admin);
    }

    #[test]
    fn local_pro_resolves() {
        let addr = Address("pro:0xdef".into());
        let layer = resolve_tier(&addr, ChainTarget::Local).unwrap();
        assert_eq!(layer, Layer::OsAdmin);
    }

    #[test]
    fn local_unknown_defaults_to_user() {
        let addr = Address("0xunknown".into());
        let layer = resolve_tier(&addr, ChainTarget::Local).unwrap();
        assert_eq!(layer, Layer::User);
    }

    #[test]
    fn remote_chain_defaults_to_user() {
        let addr = Address("0xremote".into());
        let layer = resolve_tier(&addr, ChainTarget::Ethereum).unwrap();
        assert_eq!(layer, Layer::User);
    }

    #[test]
    fn batch_resolve() {
        let wallets = vec![
            (Address("founder:0x1".into()), ChainTarget::Local),
            (Address("basic:0x2".into()), ChainTarget::Local),
            (Address("0x3".into()), ChainTarget::Local),
        ];
        let results = resolve_tiers(&wallets);
        assert_eq!(results[0].as_ref().unwrap(), &Layer::Admin);
        assert_eq!(results[1].as_ref().unwrap(), &Layer::RootUser);
        assert_eq!(results[2].as_ref().unwrap(), &Layer::User);
    }
}
