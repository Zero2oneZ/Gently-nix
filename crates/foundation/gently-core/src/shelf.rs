//! ShelfState schema -- what the dashboard CAN DO.
//!
//! Dashboard + ShelfState = specific app.
//! Every "app" is just a different ShelfState.

use serde::{Deserialize, Serialize};

/// Defines which shelf items are active and how they are organized.
/// This IS the app definition. Dashboard + ShelfState = specific app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShelfState {
    pub id: String,
    pub name: String,
    pub tenant_id: String,
    pub items: Vec<ShelfItem>,
    pub stacks: Vec<Stack>,
    /// Item IDs that are ALWAYS ON (cannot toggle off)
    pub locked_on: Vec<String>,
    /// Item IDs that are HIDDEN (cannot toggle on)
    pub locked_off: Vec<String>,
}

/// A single activatable capability in the shelf.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShelfItem {
    pub id: String,
    pub name: String,
    pub tab: ShelfTab,
    pub description: String,
    /// SVG path data (inline, no emoji ever)
    pub icon_svg: String,
    pub active: bool,
    /// Routes mounted when this item is active
    pub routes: Vec<RouteBinding>,
    pub filter_rules: u32,
    pub container: Option<ContainerConfig>,
    /// Other item IDs that must be active first
    pub requires: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ShelfTab {
    Apps,
    Tools,
    Stacks,
    Core,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteBinding {
    pub method: HttpMethod,
    pub path: String,
    pub handler: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
}

/// Pre-built shelf combinations that activate as a group.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stack {
    pub id: String,
    pub name: String,
    pub description: String,
    pub items: Vec<String>,
    pub total_filter_rules: u32,
    pub exportable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerConfig {
    pub image: String,
    pub network_isolated: bool,
    pub memory_limit_mb: u32,
    pub cpu_shares: u32,
}

/// These exist in every ShelfState. They are Gently.
pub const GENTLY_CORE_ITEMS: &[&str] = &[
    "alexandria",
    "claude-chat",
    "guarddog-dns",
    "env-vault",
    "shelf",
];

impl ShelfState {
    /// Validate shelf state -- ensure core items are not locked off
    /// and dependency chains are satisfied.
    pub fn validate(&self) -> std::result::Result<(), Vec<String>> {
        let mut errors = Vec::new();

        for core_item in GENTLY_CORE_ITEMS {
            if self.locked_off.contains(&core_item.to_string()) {
                errors.push(format!(
                    "Cannot lock off Gently core item: {}", core_item
                ));
            }
        }

        let active_ids: Vec<&str> = self.items.iter()
            .filter(|i| i.active)
            .map(|i| i.id.as_str())
            .collect();

        for item in &self.items {
            if item.active {
                for req in &item.requires {
                    if !active_ids.contains(&req.as_str()) {
                        errors.push(format!(
                            "'{}' requires '{}' but it is not active", item.id, req
                        ));
                    }
                }
            }
        }

        if errors.is_empty() { Ok(()) } else { Err(errors) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_shelf() -> ShelfState {
        ShelfState {
            id: "test".into(),
            name: "Test".into(),
            tenant_id: "test".into(),
            items: vec![],
            stacks: vec![],
            locked_on: vec!["guarddog-dns".into()],
            locked_off: vec![],
        }
    }

    #[test]
    fn validate_empty_shelf_passes() {
        assert!(empty_shelf().validate().is_ok());
    }

    #[test]
    fn validate_locked_off_core_fails() {
        let mut shelf = empty_shelf();
        shelf.locked_off.push("alexandria".into());
        let errs = shelf.validate().unwrap_err();
        assert!(errs[0].contains("alexandria"));
    }

    #[test]
    fn validate_broken_dependency() {
        let mut shelf = empty_shelf();
        shelf.items.push(ShelfItem {
            id: "cart".into(),
            name: "Cart".into(),
            tab: ShelfTab::Apps,
            description: "Shopping cart".into(),
            icon_svg: String::new(),
            active: true,
            routes: vec![],
            filter_rules: 0,
            container: None,
            requires: vec!["catalog".into()],
        });
        let errs = shelf.validate().unwrap_err();
        assert!(errs[0].contains("catalog"));
    }
}
