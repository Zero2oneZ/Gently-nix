//! API gateway / reverse proxy.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GatewayError {
    #[error("upstream error: {0}")] Upstream(String),
    #[error("rate limited")] RateLimited,
    #[error("auth required")] AuthRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayConfig { pub listen_addr: String, pub routes: Vec<RouteRule>, pub rate_limit: Option<RateLimitConfig> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteRule { pub path_prefix: String, pub upstream_host: String, pub upstream_port: u16, pub strip_prefix: bool, pub auth_required: bool }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct RateLimitConfig { pub requests_per_second: f64, pub burst: u32 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorsConfig { pub allowed_origins: Vec<String>, pub allowed_methods: Vec<String>, pub max_age_secs: u64 }
