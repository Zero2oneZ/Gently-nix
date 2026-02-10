//! Security simulation and attack modeling.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SimError {
    #[error("simulation failed: {0}")] Failed(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Severity { Low, Medium, High, Critical }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ThreatCategory { Injection, Overflow, SideChannel, Social, Supply, Physical, Network, Crypto }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Threat { pub id: String, pub name: String, pub severity: Severity, pub category: ThreatCategory, pub mitigations: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatModel { pub id: String, pub name: String, pub threats: Vec<Threat> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimResult { pub vulnerabilities_found: usize, pub exploitable: usize, pub risk_score: f64, pub recommendations: Vec<String> }
