//! Five-element agent pipeline: SPIRIT -> AIR -> WATER -> EARTH -> FIRE

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AgentError {
    #[error("phase failed: {phase:?} - {message}")] PhaseFailed { phase: AgentPhase, message: String },
    #[error("tool error: {0}")] ToolError(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentPhase { Spirit, Air, Water, Earth, Fire }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig { pub name: String, pub tools: Vec<ToolDef> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDef { pub name: String, pub description: String, pub parameters: serde_json::Value }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall { pub tool_name: String, pub arguments: serde_json::Value }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult { pub output: String, pub success: bool }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutput { pub result: String, pub phase: AgentPhase, pub tool_calls: Vec<ToolCall> }

#[derive(Debug, Clone)]
pub struct AgentContext { pub phase: AgentPhase, pub history: Vec<String>, pub artifacts: Vec<String> }

#[async_trait::async_trait]
pub trait Agent: Send + Sync {
    async fn run(&mut self, input: &str) -> std::result::Result<AgentOutput, AgentError>;
}

#[async_trait::async_trait]
pub trait Tool: Send + Sync {
    async fn execute(&self, args: &serde_json::Value) -> std::result::Result<ToolResult, AgentError>;
}
