//! SYNTHESTASIA three-chain document engine.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DocError {
    #[error("document not found: {0}")] NotFound(String),
    #[error("save failed: {0}")] SaveFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BlockType { Paragraph, Heading(u8), Code, List, Table, Image, Embed }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentBlock { pub id: String, pub block_type: BlockType, pub content: String, pub children: Vec<ContentBlock> }

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ContentChain { pub blocks: Vec<ContentBlock> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleRule { pub selector: String, pub properties: std::collections::HashMap<String, String> }

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StyleChain { pub rules: Vec<StyleRule> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger { pub event: String, pub condition: Option<String>, pub action: String }

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LogicChain { pub triggers: Vec<Trigger> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content_chain: ContentChain,
    pub style_chain: StyleChain,
    pub logic_chain: LogicChain,
    pub version: u32,
    pub created_at: String,
    pub updated_at: String,
}

pub trait DocumentStore {
    fn create(&mut self, title: &str) -> std::result::Result<Document, DocError>;
    fn open(&self, id: &str) -> std::result::Result<Document, DocError>;
    fn save(&mut self, doc: &Document) -> std::result::Result<(), DocError>;
}
