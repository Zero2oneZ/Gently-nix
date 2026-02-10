//! Exploit detection and defense analysis (DEFENSIVE ONLY).

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SploitError {
    #[error("scan error: {0}")] ScanError(String),
    #[error("pattern error: {0}")] PatternError(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ThreatLevel { Clean, Low, Medium, High, Critical }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pattern { pub id: String, pub name: String, pub regex_pattern: String, pub severity: ThreatLevel, pub description: String }

#[derive(Debug, Default)]
pub struct PatternDatabase { pub patterns: Vec<Pattern> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMatch { pub pattern_id: String, pub location: usize, pub matched_text: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult { pub matches: Vec<PatternMatch>, pub risk_level: ThreatLevel }

/// Homoglyph detector for unicode/invisible char detection (GuardDog Tier 0).
pub struct HomoglyphDetector;
impl HomoglyphDetector {
    pub fn scan(input: &str) -> Vec<(usize, char)> {
        input.char_indices().filter(|(_, c)| !c.is_ascii() || c.is_control()).collect()
    }
}
