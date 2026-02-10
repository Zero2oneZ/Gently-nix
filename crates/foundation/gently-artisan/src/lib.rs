//! BS-ARTISAN - Toroidal knowledge storage engine.
//!
//! Stores knowledge in a toroidal (ring-of-rings) structure for
//! efficient traversal and pattern matching across dimensions.

use gently_core::Hash;
use serde::{Deserialize, Serialize};

/// A node in the toroidal knowledge structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeNode {
    pub id: Hash,
    pub label: String,
    pub content: Vec<u8>,
    pub ring: u32,
    pub position: u32,
    pub links: Vec<Hash>,
    pub metadata: std::collections::HashMap<String, String>,
}

/// A ring in the torus -- a circular linked list of knowledge nodes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ring {
    pub id: u32,
    pub name: String,
    pub nodes: Vec<Hash>,
}

/// The torus -- a collection of interconnected rings.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Torus {
    pub rings: Vec<Ring>,
    pub cross_links: Vec<(Hash, Hash)>,
}

impl Torus {
    pub fn new() -> Self { Self::default() }
    pub fn add_ring(&mut self, name: &str) -> u32 {
        let id = self.rings.len() as u32;
        self.rings.push(Ring { id, name: name.to_string(), nodes: Vec::new() });
        id
    }
    pub fn ring_count(&self) -> usize { self.rings.len() }
    pub fn total_nodes(&self) -> usize { self.rings.iter().map(|r| r.nodes.len()).sum() }
}

/// Trait for toroidal traversal strategies.
pub trait Traversal {
    fn walk(&self, torus: &Torus, start: &Hash, depth: usize) -> Vec<Hash>;
}
