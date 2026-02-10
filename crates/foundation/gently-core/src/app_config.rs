//! AppConfig -- the complete exportable app definition.
//!
//! Mask + ShelfState = App. Stored, shared, exported as .gently files.

use serde::{Deserialize, Serialize};

use crate::mask::Mask;
use crate::shelf::ShelfState;

const GENTLY_FILE_HEADER: &str = "GENTLY:1";

/// The complete app definition. Stored, shared, exported.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: u32,
    pub mask: Mask,
    pub shelf_state: ShelfState,
    pub created_at: u64,
    pub updated_at: u64,
}

impl AppConfig {
    /// Serialize to .gently file format.
    pub fn to_gently_file(&self) -> std::result::Result<String, serde_json::Error> {
        let json = serde_json::to_string_pretty(self)?;
        Ok(format!("{}\n{}", GENTLY_FILE_HEADER, json))
    }

    /// Deserialize from .gently file format.
    pub fn from_gently_file(content: &str) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        let content = content.trim();
        if !content.starts_with(GENTLY_FILE_HEADER) {
            return Err("Invalid .gently file: missing header".into());
        }
        let json = &content[GENTLY_FILE_HEADER.len()..].trim();
        Ok(serde_json::from_str(json)?)
    }

    /// Validate both mask and shelf state.
    pub fn validate(&self) -> std::result::Result<(), Vec<String>> {
        let mut all_errors = Vec::new();
        if let Err(mask_errs) = self.mask.validate() {
            all_errors.extend(mask_errs);
        }
        if let Err(shelf_errs) = self.shelf_state.validate() {
            all_errors.extend(shelf_errs);
        }
        if all_errors.is_empty() { Ok(()) } else { Err(all_errors) }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mask::*;
    use crate::shelf::*;

    fn sample_config() -> AppConfig {
        AppConfig {
            version: 1,
            mask: Mask {
                tenant_id: "test".into(),
                brand_name: "Test Brand".into(),
                palette: Palette::default(),
                logo: Logo { src: "logo.svg".into(), max_width: 160, max_height: 40 },
                typography: None,
                landing_artifact: None,
                gently_badge: BadgePosition::default(),
                favicon: None,
            },
            shelf_state: ShelfState {
                id: "test-default".into(),
                name: "Test App".into(),
                tenant_id: "test".into(),
                items: vec![],
                stacks: vec![],
                locked_on: vec!["guarddog-dns".into()],
                locked_off: vec![],
            },
            created_at: 1700000000,
            updated_at: 1700000000,
        }
    }

    #[test]
    fn gently_file_round_trip() {
        let config = sample_config();
        let file_content = config.to_gently_file().unwrap();
        assert!(file_content.starts_with("GENTLY:1"));

        let parsed = AppConfig::from_gently_file(&file_content).unwrap();
        assert_eq!(parsed.version, 1);
        assert_eq!(parsed.mask.tenant_id, "test");
        assert_eq!(parsed.shelf_state.name, "Test App");
    }

    #[test]
    fn invalid_gently_file_header() {
        let result = AppConfig::from_gently_file("INVALID:1\n{}");
        assert!(result.is_err());
    }

    #[test]
    fn validate_passes_for_valid_config() {
        assert!(sample_config().validate().is_ok());
    }
}
