//! HTMX-first web interface.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WebError {
    #[error("route not found: {0}")] NotFound(String),
    #[error("server error: {0}")] Server(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig { pub host: String, pub port: u16, pub static_dir: String, pub template_dir: String }

#[derive(Debug, Clone)]
pub struct HtmxResponse { pub html: String, pub headers: std::collections::HashMap<String, String>, pub trigger: Option<String> }

#[derive(Debug, Clone)]
pub struct Route { pub method: String, pub path: String, pub handler_name: String }

#[derive(Debug, Default)]
pub struct Router { pub routes: Vec<Route> }
impl Router { pub fn new() -> Self { Self::default() } }

pub fn htmx_redirect(url: &str) -> HtmxResponse {
    let mut headers = std::collections::HashMap::new();
    headers.insert("HX-Redirect".into(), url.into());
    HtmxResponse { html: String::new(), headers, trigger: None }
}

pub fn htmx_swap(html: &str) -> HtmxResponse {
    HtmxResponse { html: html.into(), headers: std::collections::HashMap::new(), trigger: None }
}

pub trait HtmxComponent { fn render(&self) -> String; }
