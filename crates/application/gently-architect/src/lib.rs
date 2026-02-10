//! Reflective App Builder.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ArchitectError {
    #[error("generation failed: {0}")] GenerationFailed(String),
    #[error("invalid blueprint: {0}")] InvalidBlueprint(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ComponentType { Page, Layout, Widget, DataSource, Action, Hook }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Component { pub id: String, pub component_type: ComponentType, pub props: std::collections::HashMap<String, String>, pub children: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection { pub source_id: String, pub target_id: String, pub event: String, pub transform: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppBlueprint { pub name: String, pub components: Vec<Component>, pub connections: Vec<Connection> }

#[derive(Debug, Clone)]
pub struct GeneratedApp { pub files: std::collections::HashMap<String, String> }

pub trait AppGenerator {
    fn generate(&self, blueprint: &AppBlueprint) -> std::result::Result<GeneratedApp, ArchitectError>;
}
