//! Mask schema -- pure cosmetic brand skin.
//!
//! The mask never touches logic. It skins the dashboard for a brand
//! without altering what the engine can do (that is ShelfState).

use serde::{Deserialize, Serialize};

/// Brand skin applied over the Gently dashboard.
/// Pure cosmetic -- never gates functionality (that is ShelfState).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mask {
    /// Unique tenant identifier (slug, used in subdomain routing)
    pub tenant_id: String,
    /// Human-readable brand name displayed in chrome
    pub brand_name: String,
    /// Brand palette -- all fields accept CSS values
    pub palette: Palette,
    /// Logo config -- SVG preferred, PNG accepted
    pub logo: Logo,
    /// Typography overrides (falls back to Gently defaults)
    pub typography: Option<Typography>,
    /// What hydrates in the Living Surface BEFORE login
    pub landing_artifact: Option<String>,
    /// Position of "Powered by GentlyOS" badge -- ALWAYS visible
    pub gently_badge: BadgePosition,
    /// Optional favicon override
    pub favicon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Palette {
    pub bg: String,
    pub surface: String,
    pub accent: String,
    pub accent_secondary: String,
    pub text: String,
    pub text_dim: String,
    pub border: String,
    pub border_active: String,
    pub danger: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Logo {
    pub src: String,
    pub max_width: u32,
    pub max_height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Typography {
    pub font_family: String,
    pub font_mono: String,
    pub font_size_base: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BadgePosition {
    BottomRight,
    BottomLeft,
    BottomCenter,
    TopRight,
}

impl Default for Palette {
    fn default() -> Self {
        Self {
            bg: "#0a0a0a".into(),
            surface: "#111111".into(),
            accent: "#2dd4a8".into(),
            accent_secondary: "#1a6050".into(),
            text: "#e0e0e0".into(),
            text_dim: "#666666".into(),
            border: "#222222".into(),
            border_active: "#333333".into(),
            danger: "#ee5555".into(),
        }
    }
}

impl Default for BadgePosition {
    fn default() -> Self {
        Self::BottomRight
    }
}

impl Default for Typography {
    fn default() -> Self {
        Self {
            font_family: "system-ui, -apple-system, sans-serif".into(),
            font_mono: "JetBrains Mono, Fira Code, monospace".into(),
            font_size_base: 13,
        }
    }
}

impl Mask {
    /// Validate mask constraints.
    pub fn validate(&self) -> std::result::Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if self.logo.max_width > 200 {
            errors.push("Logo max_width exceeds 200px cap".into());
        }
        if self.logo.max_height > 48 {
            errors.push("Logo max_height exceeds 48px cap".into());
        }
        if self.tenant_id.is_empty() {
            errors.push("tenant_id cannot be empty".into());
        }
        if self.brand_name.is_empty() {
            errors.push("brand_name cannot be empty".into());
        }

        if errors.is_empty() { Ok(()) } else { Err(errors) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_palette_values() {
        let p = Palette::default();
        assert_eq!(p.bg, "#0a0a0a");
        assert_eq!(p.accent, "#2dd4a8");
    }

    #[test]
    fn mask_validate_logo_caps() {
        let mask = Mask {
            tenant_id: "test".into(),
            brand_name: "Test".into(),
            palette: Palette::default(),
            logo: Logo { src: "logo.svg".into(), max_width: 250, max_height: 60 },
            typography: None,
            landing_artifact: None,
            gently_badge: BadgePosition::default(),
            favicon: None,
        };
        let errs = mask.validate().unwrap_err();
        assert_eq!(errs.len(), 2);
    }

    #[test]
    fn mask_validate_empty_fields() {
        let mask = Mask {
            tenant_id: "".into(),
            brand_name: "".into(),
            palette: Palette::default(),
            logo: Logo { src: "logo.svg".into(), max_width: 100, max_height: 40 },
            typography: None,
            landing_artifact: None,
            gently_badge: BadgePosition::default(),
            favicon: None,
        };
        let errs = mask.validate().unwrap_err();
        assert_eq!(errs.len(), 2);
    }
}
