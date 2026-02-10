//! Interaction layer hierarchy for GentlyOS permission gating.
//!
//! L0 (Admin) is highest privilege, L5 (User) is lowest.
//! The IO Surface is public, below L5 -- no enum variant needed.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Visibility/permission layer. Lower number = higher privilege.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum Layer {
    Admin     = 0, // L0 -- Tom only
    GentlyDev = 1, // L1 -- internal team
    DevLevel  = 2, // L2 -- public SDK
    OsAdmin   = 3, // L3 -- tenant sysadmin
    RootUser  = 4, // L4 -- dashboard owner
    User      = 5, // L5 -- end user
}

impl Layer {
    /// Numeric level (0 = most privileged).
    pub fn level(&self) -> u8 {
        *self as u8
    }

    /// Returns true if this layer can access resources requiring `required`.
    /// Lower number = more access, so self <= required means access granted.
    pub fn has_access(&self, required: Layer) -> bool {
        (*self as u8) <= (required as u8)
    }

    /// All layers from most to least privileged.
    pub fn all() -> &'static [Layer] {
        &[
            Layer::Admin,
            Layer::GentlyDev,
            Layer::DevLevel,
            Layer::OsAdmin,
            Layer::RootUser,
            Layer::User,
        ]
    }

    /// Human-readable label for display.
    pub fn label(&self) -> &'static str {
        match self {
            Layer::Admin => "L0 ADMIN",
            Layer::GentlyDev => "L1 GENTLY-DEV",
            Layer::DevLevel => "L2 DEV-LEVEL",
            Layer::OsAdmin => "L3 OS-ADMIN",
            Layer::RootUser => "L4 ROOT-USER",
            Layer::User => "L5 USER",
        }
    }

    /// Maps to the NFT tier name used by tier-gate.nix.
    pub fn nft_tier(&self) -> &'static str {
        match self {
            Layer::Admin => "founder",
            Layer::GentlyDev => "founder",
            Layer::DevLevel => "dev",
            Layer::OsAdmin => "pro",
            Layer::RootUser => "basic",
            Layer::User => "free",
        }
    }
}

/// Access level for a resource at a given layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    None,
    Read,
    ReadWrite,
}

/// Named resources gated by the permission engine.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Resource {
    CoreTools,
    PublicApi,
    RuntimeConfig,
    Containers,
    ShelfFull,
    Templates,
    DashboardLayout,
    IoSurface,
    RootContract,
    DbSchema,
    ModelBehavior,
    CoreArch,
    LimboIo,
    AuditChain,
    AppBuilder,
    MaskAuthoring,
}

/// Build the default permission cascade table.
/// L0 can ReadWrite everything. Each layer down sees less.
pub fn default_permission_table() -> HashMap<(Layer, Resource), Permission> {
    use Layer::*;
    use Permission::*;
    use Resource::*;

    let mut t = HashMap::new();

    let all_resources = [
        CoreTools, PublicApi, RuntimeConfig, Containers, ShelfFull,
        Templates, DashboardLayout, IoSurface, RootContract, DbSchema,
        ModelBehavior, CoreArch, LimboIo, AuditChain, AppBuilder,
        MaskAuthoring,
    ];

    // L0 Admin -- ReadWrite everything
    for r in &all_resources {
        t.insert((Admin, r.clone()), ReadWrite);
    }

    // L1 GentlyDev -- ReadWrite most, Read on RootContract
    for r in &all_resources {
        t.insert((GentlyDev, r.clone()), ReadWrite);
    }
    t.insert((GentlyDev, RootContract), Read);

    // L2 DevLevel -- Read on most, ReadWrite on IoSurface
    for r in &[CoreTools, PublicApi, RuntimeConfig, Containers, ShelfFull,
               Templates, DashboardLayout, IoSurface, AppBuilder] {
        t.insert((DevLevel, r.clone()), Read);
    }
    t.insert((DevLevel, IoSurface), ReadWrite);
    t.insert((DevLevel, AppBuilder), ReadWrite);

    // L3 OsAdmin -- Read on operational, ReadWrite on RuntimeConfig/Containers/IoSurface
    for r in &[CoreTools, PublicApi, ShelfFull, Templates, DashboardLayout] {
        t.insert((OsAdmin, r.clone()), Read);
    }
    t.insert((OsAdmin, RuntimeConfig), ReadWrite);
    t.insert((OsAdmin, Containers), ReadWrite);
    t.insert((OsAdmin, IoSurface), ReadWrite);

    // L4 RootUser -- Read on basics, ReadWrite on IoSurface
    for r in &[CoreTools, PublicApi, DashboardLayout] {
        t.insert((RootUser, r.clone()), Read);
    }
    t.insert((RootUser, IoSurface), ReadWrite);

    // L5 User -- Read CoreTools + PublicApi only
    t.insert((User, CoreTools), Read);
    t.insert((User, PublicApi), Read);

    t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layer_ordering() {
        assert!(Layer::Admin.has_access(Layer::User));
        assert!(Layer::Admin.has_access(Layer::Admin));
        assert!(!Layer::User.has_access(Layer::Admin));
        assert!(Layer::User.has_access(Layer::User));
    }

    #[test]
    fn default_table_admin_sees_all() {
        let table = default_permission_table();
        assert_eq!(
            table.get(&(Layer::Admin, Resource::RootContract)),
            Some(&Permission::ReadWrite)
        );
        assert_eq!(
            table.get(&(Layer::Admin, Resource::CoreTools)),
            Some(&Permission::ReadWrite)
        );
    }

    #[test]
    fn default_table_user_restricted() {
        let table = default_permission_table();
        assert_eq!(
            table.get(&(Layer::User, Resource::CoreTools)),
            Some(&Permission::Read)
        );
        assert_eq!(
            table.get(&(Layer::User, Resource::LimboIo)),
            None
        );
    }
}
