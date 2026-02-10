//! Core security module.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SecurityError {
    #[error("authentication failed: {0}")] AuthFailed(String),
    #[error("authorization denied: {0}")] Unauthorized(String),
    #[error("hash error: {0}")] HashError(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum HashAlgorithm { Argon2id, Sha256, Sha512 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credential { pub id: String, pub hash: Vec<u8>, pub salt: Vec<u8>, pub algorithm: HashAlgorithm, pub created_at: u64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityPolicy { pub min_password_len: usize, pub require_mfa: bool, pub max_attempts: u32, pub lockout_duration_secs: u64 }

impl Default for SecurityPolicy {
    fn default() -> Self { SecurityPolicy { min_password_len: 12, require_mfa: false, max_attempts: 5, lockout_duration_secs: 300 } }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum AuditResult { Success, Failure, Blocked }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry { pub timestamp: u64, pub action: String, pub actor: String, pub target: String, pub result: AuditResult }

pub fn generate_salt() -> [u8; 32] { let mut salt = [0u8; 32]; use rand::RngCore; rand::thread_rng().fill_bytes(&mut salt); salt }

pub trait SecurityProvider {
    fn authenticate(&self, credential: &Credential, input: &[u8]) -> std::result::Result<bool, SecurityError>;
    fn audit(&mut self, entry: AuditEntry);
}
