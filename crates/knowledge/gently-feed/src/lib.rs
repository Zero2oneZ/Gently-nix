//! Content feed chain system.

use gently_core::Hash;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum FeedError {
    #[error("source unavailable: {0}")]
    SourceUnavailable(String),
    #[error("parse error: {0}")]
    ParseError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeedSource { Rss(String), Api(String), Manual, Chain(Hash) }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedItem {
    pub id: String,
    pub source: FeedSource,
    pub content: String,
    pub timestamp: u64,
    pub hash: Hash,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct FeedChain {
    pub items: Vec<FeedItem>,
    pub head: Option<Hash>,
}

impl FeedChain {
    pub fn new() -> Self { Self::default() }
    pub fn push(&mut self, item: FeedItem) { self.head = Some(item.hash); self.items.push(item); }
    pub fn len(&self) -> usize { self.items.len() }
    pub fn is_empty(&self) -> bool { self.items.is_empty() }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedFilter {
    pub source: Option<String>,
    pub keyword: Option<String>,
    pub since: Option<u64>,
    pub until: Option<u64>,
}

#[async_trait::async_trait]
pub trait FeedProvider: Send + Sync {
    async fn fetch(&self) -> std::result::Result<Vec<FeedItem>, FeedError>;
}
