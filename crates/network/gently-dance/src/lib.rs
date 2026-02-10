//! XOR split-knowledge reconstruction protocol.
//! LOCK (device) XOR KEY (public) = SECRET

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DanceError {
    #[error("reconstruction failed: {0}")] ReconstructionFailed(String),
    #[error("invalid share")] InvalidShare,
    #[error("threshold not met: need {need}, have {have}")] ThresholdNotMet { need: usize, have: usize },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockShare(pub Vec<u8>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyShare(pub Vec<u8>);

#[derive(Debug, Clone)]
pub struct Secret(pub Vec<u8>);

pub fn split_secret(secret: &[u8]) -> (LockShare, KeyShare) {
    let mut lock = vec![0u8; secret.len()];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut lock);
    let key: Vec<u8> = secret.iter().zip(lock.iter()).map(|(s, l)| s ^ l).collect();
    (LockShare(lock), KeyShare(key))
}

pub fn reconstruct(lock: &LockShare, key: &KeyShare) -> std::result::Result<Secret, DanceError> {
    if lock.0.len() != key.0.len() { return Err(DanceError::InvalidShare); }
    let secret: Vec<u8> = lock.0.iter().zip(key.0.iter()).map(|(l, k)| l ^ k).collect();
    Ok(Secret(secret))
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DanceStatus { Gathering, Reconstructing, Complete, Failed }
