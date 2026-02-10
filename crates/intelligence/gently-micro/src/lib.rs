//! Microservice framework.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MicroError {
    #[error("service error: {0}")] Service(String),
    #[error("route not found: {0}")] NotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig { pub name: String, pub host: String, pub port: u16 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HealthStatus { Healthy, Degraded, Unhealthy }

#[derive(Debug, Clone)]
pub struct Route { pub method: String, pub path: String, pub handler_name: String }

#[derive(Debug, Default)]
pub struct Router { pub routes: Vec<Route> }
impl Router {
    pub fn new() -> Self { Self::default() }
    pub fn add_route(&mut self, method: &str, path: &str, handler: &str) {
        self.routes.push(Route { method: method.into(), path: path.into(), handler_name: handler.into() });
    }
}

#[derive(Debug, Default)]
pub struct ServiceRegistry { pub services: std::collections::HashMap<String, ServiceConfig> }
