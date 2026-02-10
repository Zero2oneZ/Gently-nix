//! IPC Bridge - Limbo Layer communication on port 7335.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BridgeError {
    #[error("connection failed: {0}")] Connection(String),
    #[error("auth failed")] AuthFailed,
    #[error("message error: {0}")] Message(String),
}

pub const DEFAULT_BRIDGE_PORT: u16 = 7335;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeConfig { pub port: u16, pub max_connections: usize, pub auth_token: Option<String> }
impl Default for BridgeConfig {
    fn default() -> Self { BridgeConfig { port: DEFAULT_BRIDGE_PORT, max_connections: 64, auth_token: None } }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum MessageType { Request, Response, Event, Heartbeat, Auth }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeMessage { pub id: String, pub msg_type: MessageType, pub payload: serde_json::Value, pub timestamp: u64 }

#[async_trait::async_trait]
pub trait BridgeHandler: Send + Sync {
    async fn on_message(&self, msg: BridgeMessage) -> std::result::Result<Option<BridgeMessage>, BridgeError>;
    async fn on_connect(&self, peer_id: &str);
    async fn on_disconnect(&self, peer_id: &str);
}
