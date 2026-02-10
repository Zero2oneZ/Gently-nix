//! Permission Engine -- the central gate for all access decisions.

use std::collections::HashMap;

use gently_core::layer::{default_permission_table, Layer, Permission, Resource};
use serde::{Deserialize, Serialize};

/// The permission engine. Holds a table of (Layer, Resource) -> Permission
/// and provides fast lookup for rendering and access decisions.
#[derive(Debug, Clone)]
pub struct PermissionEngine {
    table: HashMap<(Layer, Resource), Permission>,
}

impl PermissionEngine {
    /// Build engine with the default permission cascade.
    pub fn new() -> Self {
        Self {
            table: default_permission_table(),
        }
    }

    /// Build engine with a custom table (for testing or overrides).
    pub fn with_table(table: HashMap<(Layer, Resource), Permission>) -> Self {
        Self { table }
    }

    /// Check what permission a layer has for a resource.
    pub fn check(&self, layer: Layer, resource: &Resource) -> Permission {
        self.table
            .get(&(layer, resource.clone()))
            .copied()
            .unwrap_or(Permission::None)
    }

    /// Returns true if the layer has any access (Read or ReadWrite) to the resource.
    pub fn should_render(&self, layer: Layer, resource: &Resource) -> bool {
        self.check(layer, resource) != Permission::None
    }

    /// Returns true if the layer has write access to the resource.
    pub fn can_write(&self, layer: Layer, resource: &Resource) -> bool {
        self.check(layer, resource) == Permission::ReadWrite
    }

    /// List all resources visible to a given layer.
    pub fn visible_resources(&self, layer: Layer) -> Vec<&Resource> {
        self.table
            .iter()
            .filter(|((l, _), p)| *l == layer && **p != Permission::None)
            .map(|((_, r), _)| r)
            .collect()
    }

    /// List all resources hidden from a given layer.
    pub fn hidden_resources(&self, layer: Layer) -> Vec<Resource> {
        let all = [
            Resource::CoreTools, Resource::PublicApi, Resource::RuntimeConfig,
            Resource::Containers, Resource::ShelfFull, Resource::Templates,
            Resource::DashboardLayout, Resource::IoSurface, Resource::RootContract,
            Resource::DbSchema, Resource::ModelBehavior, Resource::CoreArch,
            Resource::LimboIo, Resource::AuditChain, Resource::AppBuilder,
            Resource::MaskAuthoring,
        ];
        all.into_iter()
            .filter(|r| !self.should_render(layer, r))
            .collect()
    }
}

impl Default for PermissionEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Snapshot of permissions for a specific layer -- useful for serialization.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionSnapshot {
    pub layer: Layer,
    pub grants: Vec<(Resource, Permission)>,
}

impl PermissionEngine {
    /// Create a snapshot of all permissions for a layer.
    pub fn snapshot(&self, layer: Layer) -> PermissionSnapshot {
        let grants: Vec<(Resource, Permission)> = self.table
            .iter()
            .filter(|((l, _), _)| *l == layer)
            .map(|((_, r), p)| (r.clone(), *p))
            .collect();
        PermissionSnapshot { layer, grants }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_default_table() {
        let engine = PermissionEngine::new();
        assert_eq!(engine.check(Layer::Admin, &Resource::RootContract), Permission::ReadWrite);
        assert_eq!(engine.check(Layer::User, &Resource::CoreTools), Permission::Read);
        assert_eq!(engine.check(Layer::User, &Resource::LimboIo), Permission::None);
    }

    #[test]
    fn should_render_basic() {
        let engine = PermissionEngine::new();
        assert!(engine.should_render(Layer::Admin, &Resource::LimboIo));
        assert!(!engine.should_render(Layer::User, &Resource::LimboIo));
        assert!(engine.should_render(Layer::User, &Resource::CoreTools));
    }

    #[test]
    fn can_write_check() {
        let engine = PermissionEngine::new();
        assert!(engine.can_write(Layer::Admin, &Resource::CoreTools));
        assert!(!engine.can_write(Layer::User, &Resource::CoreTools));
    }

    #[test]
    fn hidden_resources_for_user() {
        let engine = PermissionEngine::new();
        let hidden = engine.hidden_resources(Layer::User);
        assert!(hidden.contains(&Resource::LimboIo));
        assert!(hidden.contains(&Resource::RootContract));
        assert!(!hidden.contains(&Resource::CoreTools));
    }

    #[test]
    fn snapshot_captures_all_grants() {
        let engine = PermissionEngine::new();
        let snap = engine.snapshot(Layer::Admin);
        assert_eq!(snap.layer, Layer::Admin);
        assert!(!snap.grants.is_empty());
    }
}
