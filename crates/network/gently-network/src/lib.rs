//! Network core.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum NetError {
    #[error("connection failed: {0}")] ConnectionFailed(String),
    #[error("timeout")] Timeout,
    #[error("tls error: {0}")] Tls(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Protocol { Http, Https, Ws, Wss, Tcp, Udp }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Endpoint { pub host: String, pub port: u16, pub protocol: Protocol, pub tls: bool }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig { pub endpoint: Endpoint, pub timeout_ms: u64, pub max_retries: u32 }

#[derive(Debug, Default)]
pub struct NetworkStats { pub bytes_sent: u64, pub bytes_received: u64, pub connections_active: u32, pub errors: u32 }

#[async_trait::async_trait]
pub trait Transport: Send + Sync {
    async fn connect(&mut self, config: &ConnectionConfig) -> std::result::Result<(), NetError>;
    async fn send(&mut self, data: &[u8]) -> std::result::Result<usize, NetError>;
    async fn receive(&mut self, buf: &mut [u8]) -> std::result::Result<usize, NetError>;
    async fn close(&mut self) -> std::result::Result<(), NetError>;
}
