//! SYNTHESTASIA behavioral learning and adaptive UI.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BehaviorError {
    #[error("analysis failed: {0}")] AnalysisFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserEvent { pub event_type: String, pub target: String, pub timestamp: u64, pub metadata: std::collections::HashMap<String, String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorPattern { pub pattern_type: String, pub frequency: f64, pub confidence: f64, pub first_seen: u64, pub last_seen: u64 }

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UserProfile { pub events_count: u64, pub patterns: Vec<BehaviorPattern>, pub preferences: std::collections::HashMap<String, String> }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum AdaptationType { Show, Hide, Reorder, Resize, Restyle }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiAdaptation { pub target_element: String, pub change_type: AdaptationType, pub priority: u32 }

pub trait BehaviorEngine {
    fn record_event(&mut self, event: UserEvent);
    fn analyze_patterns(&self) -> Vec<BehaviorPattern>;
    fn suggest_adaptations(&self) -> Vec<UiAdaptation>;
}
