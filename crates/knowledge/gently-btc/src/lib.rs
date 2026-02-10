//! Bitcoin block anchoring for genesis timestamps.

use gently_core::Hash;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BtcError {
    #[error("block not found: {0}")]
    BlockNotFound(u64),
    #[error("anchor verification failed")]
    VerificationFailed,
    #[error("rpc error: {0}")]
    Rpc(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockRef {
    pub height: u64,
    pub hash: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorProof {
    pub block_ref: BlockRef,
    pub tx_hash: String,
    pub data_hash: Hash,
    pub merkle_path: Vec<String>,
}

/// Berlin Clock - time-based key derivation synced to BTC blocks.
#[derive(Debug, Clone)]
pub struct BerlinClock {
    pub current_block: u64,
    pub epoch_start: u64,
    pub rotation_interval: u64,
}

impl BerlinClock {
    pub fn new(block: u64) -> Self {
        BerlinClock { current_block: block, epoch_start: block, rotation_interval: 144 }
    }
    pub fn current_epoch(&self) -> u64 {
        (self.current_block - self.epoch_start) / self.rotation_interval
    }
}

pub trait BlockchainAnchor {
    fn anchor(&self, data: &[u8]) -> std::result::Result<AnchorProof, BtcError>;
    fn verify(&self, proof: &AnchorProof) -> std::result::Result<bool, BtcError>;
}
