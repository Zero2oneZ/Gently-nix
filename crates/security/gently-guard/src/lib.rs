//! gently-guard -- GentlyOS Permission Engine.
//!
//! Layer-based access control: L0 (Admin) through L5 (User).
//! Every UI element, route, and resource is gated by the permission table.

pub mod engine;
pub mod anti_cheat;
pub mod benchmark;

// Re-export core layer types for convenience.
pub use gently_core::layer::{Layer, Permission, Resource, default_permission_table};
