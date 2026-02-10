//! Multi-algorithm cipher suite.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CipherError {
    #[error("encryption failed: {0}")] Encrypt(String),
    #[error("decryption failed: {0}")] Decrypt(String),
    #[error("key derivation failed: {0}")] KeyDerivation(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CipherSuite { ChaCha20Poly1305, Aes256Gcm }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedPayload { pub ciphertext: Vec<u8>, pub nonce: Vec<u8>, pub algorithm: CipherSuite, pub key_id: String }

#[derive(Debug)]
pub struct KeyPair { pub public_key: Vec<u8>, pub secret_key: zeroize::Zeroizing<Vec<u8>> }

/// Hash chain for multi-algorithm verification.
pub struct HashChain { pub algorithms: Vec<String> }
impl HashChain {
    pub fn new() -> Self { HashChain { algorithms: vec!["sha256".into(), "sha1".into()] } }
    pub fn hash(&self, data: &[u8]) -> Vec<u8> {
        use sha2::{Sha256, Digest};
        let mut h = Sha256::new(); h.update(data); h.finalize().to_vec()
    }
}
impl Default for HashChain { fn default() -> Self { Self::new() } }
