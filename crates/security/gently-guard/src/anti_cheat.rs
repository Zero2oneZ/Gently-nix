//! Anti-cheat and NFT verification for tier gating.
//!
//! Prevents tier spoofing by verifying wallet ownership claims
//! against on-chain state.

use gently_core::layer::Layer;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AntiCheatError {
    #[error("NFT verification failed: {0}")]
    VerificationFailed(String),
    #[error("tier spoof detected: claimed {claimed:?}, actual {actual:?}")]
    SpoofDetected { claimed: Layer, actual: Layer },
    #[error("challenge expired")]
    ChallengeExpired,
    #[error("invalid signature: {0}")]
    InvalidSignature(String),
}

/// Result of an NFT tier verification.
#[derive(Debug, Clone)]
pub struct TierVerification {
    pub wallet: String,
    pub claimed_layer: Layer,
    pub verified_layer: Layer,
    pub is_valid: bool,
    pub timestamp: u64,
}

/// Verify an NFT claim maps to the expected layer.
/// In production this would call on-chain; here it provides the interface.
pub fn verify_nft(wallet: &str, claimed: Layer) -> Result<TierVerification, AntiCheatError> {
    // Stub: in production, this queries the blockchain for NFT ownership
    // and returns the actual layer the wallet is entitled to.
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Ok(TierVerification {
        wallet: wallet.to_string(),
        claimed_layer: claimed,
        verified_layer: claimed, // stub: trust the claim for now
        is_valid: true,
        timestamp: now,
    })
}

/// Detect if a tier claim is being spoofed.
pub fn detect_spoof(claimed: Layer, actual: Layer) -> Result<(), AntiCheatError> {
    if (claimed as u8) < (actual as u8) {
        return Err(AntiCheatError::SpoofDetected { claimed, actual });
    }
    Ok(())
}

/// Generate a challenge for wallet-based tier verification.
/// The wallet must sign this challenge to prove ownership.
pub fn tier_challenge() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("GENTLY-TIER-CHALLENGE:{}", now)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_nft_stub_passes() {
        let result = verify_nft("0xabc123", Layer::OsAdmin).unwrap();
        assert!(result.is_valid);
        assert_eq!(result.verified_layer, Layer::OsAdmin);
    }

    #[test]
    fn detect_spoof_catches_upgrade() {
        let result = detect_spoof(Layer::Admin, Layer::User);
        assert!(result.is_err());
    }

    #[test]
    fn detect_spoof_allows_valid() {
        let result = detect_spoof(Layer::User, Layer::User);
        assert!(result.is_ok());
    }

    #[test]
    fn tier_challenge_format() {
        let challenge = tier_challenge();
        assert!(challenge.starts_with("GENTLY-TIER-CHALLENGE:"));
    }
}
