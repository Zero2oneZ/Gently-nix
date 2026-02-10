//! LLM orchestration layer.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BrainError {
    #[error("provider error: {0}")] Provider(String),
    #[error("rate limited")] RateLimited,
    #[error("context overflow: {0} tokens")] ContextOverflow(usize),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LlmProvider { Claude, OpenAI, Ollama, Custom(String) }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: LlmProvider,
    pub model_name: String,
    pub temperature: f32,
    pub max_tokens: usize,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Role { System, User, Assistant, Tool }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message { pub role: Role, pub content: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation { pub messages: Vec<Message>, pub config: ModelConfig }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResponse { pub content: String, pub tokens_used: usize, pub model: String }

#[async_trait::async_trait]
pub trait LlmBackend: Send + Sync {
    async fn complete(&self, conversation: &Conversation) -> std::result::Result<CompletionResponse, BrainError>;
}

#[derive(Default)]
pub struct ProviderRegistry { pub backends: std::collections::HashMap<String, Box<dyn LlmBackend>> }
