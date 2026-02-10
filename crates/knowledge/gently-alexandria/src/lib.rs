//! Alexandria - Knowledge graph and document library.

use gently_core::Hash;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AlexError {
    #[error("document not found: {0}")]
    NotFound(String),
    #[error("storage error: {0}")]
    Storage(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tags: Vec<String>,
    pub hash: Hash,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    pub name: String,
    pub documents: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Query {
    pub text: String,
    pub tags: Vec<String>,
    pub limit: usize,
}

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub document_id: String,
    pub score: f64,
    pub snippet: String,
}

pub trait KnowledgeStore {
    fn insert(&mut self, doc: Document) -> std::result::Result<(), AlexError>;
    fn get(&self, id: &str) -> std::result::Result<Document, AlexError>;
    fn search(&self, query: &Query) -> std::result::Result<Vec<SearchResult>, AlexError>;
    fn delete(&mut self, id: &str) -> std::result::Result<(), AlexError>;
}
