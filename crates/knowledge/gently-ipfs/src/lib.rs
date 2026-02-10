//! IPFS content storage.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum IpfsError {
    #[error("connection failed: {0}")]
    Connection(String),
    #[error("content not found: {0}")]
    NotFound(String),
    #[error("pin failed: {0}")]
    PinFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpfsConfig {
    pub api_url: String,
    pub gateway_url: String,
    pub timeout_secs: u64,
}

impl Default for IpfsConfig {
    fn default() -> Self {
        IpfsConfig { api_url: "http://127.0.0.1:5001".into(), gateway_url: "http://127.0.0.1:8080".into(), timeout_secs: 30 }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentId(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PinStatus { Pinned, Unpinned, Queued, Failed(String) }

#[async_trait::async_trait]
pub trait IpfsClient: Send + Sync {
    async fn add(&self, data: &[u8]) -> std::result::Result<ContentId, IpfsError>;
    async fn get(&self, cid: &ContentId) -> std::result::Result<Vec<u8>, IpfsError>;
    async fn pin(&self, cid: &ContentId) -> std::result::Result<PinStatus, IpfsError>;
    async fn unpin(&self, cid: &ContentId) -> std::result::Result<(), IpfsError>;
}
