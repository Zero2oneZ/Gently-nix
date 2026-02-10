//! API search engine aggregator - cross-provider web search.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SearchError {
    #[error("provider error: {0}")]
    Provider(String),
    #[error("rate limited: retry after {retry_after_secs}s")]
    RateLimited { retry_after_secs: u64 },
    #[error("no api key for provider: {0}")]
    NoApiKey(String),
    #[error("network error: {0}")]
    Network(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SearchProvider { Google, Bing, DuckDuckGo, Brave, Custom(String) }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub provider: Option<SearchProvider>,
    pub max_results: usize,
    pub page: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub source: SearchProvider,
    pub rank: usize,
}

#[derive(Debug, Clone, Default)]
pub struct SearchConfig {
    pub api_keys: std::collections::HashMap<String, String>,
    pub default_provider: Option<SearchProvider>,
    pub max_concurrent: usize,
}

pub struct RateLimiter {
    pub requests_per_second: f64,
    pub last_request: std::time::Instant,
}

impl RateLimiter {
    pub fn new(rps: f64) -> Self { RateLimiter { requests_per_second: rps, last_request: std::time::Instant::now() } }
}

/// Aggregates results from multiple search providers.
pub struct SearchAggregator {
    pub config: SearchConfig,
    pub providers: Vec<SearchProvider>,
}

impl SearchAggregator {
    pub fn new(config: SearchConfig) -> Self {
        SearchAggregator { config, providers: Vec::new() }
    }
}

#[async_trait::async_trait]
pub trait SearchEngine: Send + Sync {
    async fn search(&self, query: &SearchQuery) -> std::result::Result<Vec<SearchResult>, SearchError>;
}
