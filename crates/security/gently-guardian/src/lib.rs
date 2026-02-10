//! Guardian system with 16 security daemons.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GuardianError {
    #[error("daemon error: {0}")] DaemonError(String),
    #[error("db error: {0}")] DbError(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DaemonType {
    InputScanner, OutputFilter, NetworkMonitor, FileWatcher,
    ProcessGuard, MemoryProtector, CryptoValidator, AuditLogger,
    IntrusionDetector, PolicyEnforcer, KeyRotator, CertManager,
    ThreatAnalyzer, PatchMonitor, BackupVerifier, ComplianceChecker,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DaemonStatus { Active, Idle, Alert, Disabled }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Daemon { pub id: u32, pub name: String, pub daemon_type: DaemonType, pub status: DaemonStatus, pub last_check: u64 }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum EntityStatus { Pending, Building, Built, Failed }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildSession { pub id: String, pub started_at: u64, pub entities: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Confession { pub entity: String, pub error: String, pub timestamp: u64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Penance { pub confession_id: String, pub fix: String, pub applied: bool }

pub trait DaemonRunner {
    fn check(&self) -> std::result::Result<DaemonStatus, GuardianError>;
    fn alert(&self, message: &str);
}
