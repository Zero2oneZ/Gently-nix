//! Model Context Protocol server/client.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum McpError {
    #[error("method not found: {0}")] MethodNotFound(String),
    #[error("invalid params: {0}")] InvalidParams(String),
    #[error("internal error: {0}")] Internal(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpRequest { pub method: String, pub params: serde_json::Value }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResponse { pub result: Option<serde_json::Value>, pub error: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool { pub name: String, pub description: String, pub input_schema: serde_json::Value }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpResource { pub uri: String, pub name: String, pub mime_type: String }

#[derive(Debug, Default)]
pub struct McpServer { pub tools: Vec<McpTool>, pub resources: Vec<McpResource> }
impl McpServer {
    pub fn new() -> Self { Self::default() }
    pub fn add_tool(&mut self, tool: McpTool) { self.tools.push(tool); }
    pub fn add_resource(&mut self, res: McpResource) { self.resources.push(res); }
}

#[async_trait::async_trait]
pub trait McpHandler: Send + Sync {
    async fn handle_request(&self, req: McpRequest) -> std::result::Result<McpResponse, McpError>;
}
