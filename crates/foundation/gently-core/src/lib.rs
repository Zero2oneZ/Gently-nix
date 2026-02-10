//! GentlyOS Core - Foundation types and cryptographic primitives.
//!
//! Everything in GentlyOS is a content-addressed Blob with SHA-256 hash.

pub mod layer;
pub mod mask;
pub mod shelf;
pub mod app_config;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;

/// Core error type for GentlyOS operations.
#[derive(Debug, Error)]
pub enum GentlyError {
    #[error("hash mismatch: expected {expected}, got {actual}")]
    HashMismatch { expected: String, actual: String },
    #[error("blob not found: {0}")]
    NotFound(String),
    #[error("invalid data: {0}")]
    InvalidData(String),
    #[error("crypto error: {0}")]
    Crypto(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, GentlyError>;

/// Content kind tag for blobs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Kind {
    Raw,
    Text,
    Code,
    Config,
    Key,
    Certificate,
    Model,
    Audio,
    Visual,
    Document,
    Transaction,
    Token,
}

/// SHA-256 content hash.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Hash(pub [u8; 32]);

impl Hash {
    pub fn compute(data: &[u8]) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&result);
        Hash(bytes)
    }

    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    pub fn from_hex(s: &str) -> Result<Self> {
        let bytes = hex::decode(s).map_err(|e| GentlyError::InvalidData(e.to_string()))?;
        if bytes.len() != 32 {
            return Err(GentlyError::InvalidData("hash must be 32 bytes".into()));
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(Hash(arr))
    }
}

impl std::fmt::Display for Hash {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_hex())
    }
}

/// Universal content-addressed blob. The atomic unit of GentlyOS.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Blob {
    pub hash: Hash,
    pub kind: Kind,
    pub data: Vec<u8>,
    pub created_at: u64,
}

impl Blob {
    pub fn new(kind: Kind, data: Vec<u8>) -> Self {
        let hash = Hash::compute(&data);
        let created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Blob { hash, kind, data, created_at }
    }

    pub fn verify(&self) -> bool {
        Hash::compute(&self.data) == self.hash
    }

    pub fn size(&self) -> usize {
        self.data.len()
    }
}

/// Trait for anything that can be stored as a blob.
pub trait Storable {
    fn to_blob(&self) -> Result<Blob>;
    fn from_blob(blob: &Blob) -> Result<Self> where Self: Sized;
}

/// Trait for content-addressable stores.
pub trait BlobStore {
    fn put(&mut self, blob: Blob) -> Result<Hash>;
    fn get(&self, hash: &Hash) -> Result<Blob>;
    fn has(&self, hash: &Hash) -> bool;
    fn delete(&mut self, hash: &Hash) -> Result<()>;
    fn list(&self) -> Result<Vec<Hash>>;
}

/// In-memory blob store for testing and ephemeral use.
#[derive(Debug, Default)]
pub struct MemoryStore {
    blobs: std::collections::HashMap<Hash, Blob>,
}

impl BlobStore for MemoryStore {
    fn put(&mut self, blob: Blob) -> Result<Hash> {
        let hash = blob.hash;
        self.blobs.insert(hash, blob);
        Ok(hash)
    }
    fn get(&self, hash: &Hash) -> Result<Blob> {
        self.blobs.get(hash).cloned().ok_or_else(|| GentlyError::NotFound(hash.to_hex()))
    }
    fn has(&self, hash: &Hash) -> bool { self.blobs.contains_key(hash) }
    fn delete(&mut self, hash: &Hash) -> Result<()> { self.blobs.remove(hash); Ok(()) }
    fn list(&self) -> Result<Vec<Hash>> { Ok(self.blobs.keys().cloned().collect()) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn blob_round_trip() {
        let blob = Blob::new(Kind::Raw, b"hello gently".to_vec());
        assert!(blob.verify());
        assert_eq!(blob.size(), 12);
    }
    #[test]
    fn memory_store() {
        let mut store = MemoryStore::default();
        let blob = Blob::new(Kind::Text, b"test data".to_vec());
        let hash = store.put(blob.clone()).unwrap();
        assert!(store.has(&hash));
        let retrieved = store.get(&hash).unwrap();
        assert_eq!(retrieved.data, blob.data);
    }
}
