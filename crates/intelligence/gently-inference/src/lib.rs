//! Local model inference (ONNX runtime).

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum InferenceError {
    #[error("model not found: {0}")] ModelNotFound(String),
    #[error("inference failed: {0}")] Failed(String),
    #[error("shape mismatch")] ShapeMismatch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelFormat { Onnx, SafeTensors, Gguf }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Device { Cpu, Cuda(usize), Metal }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub format: ModelFormat,
    pub path: String,
    pub input_shapes: Vec<Vec<usize>>,
    pub output_shapes: Vec<Vec<usize>>,
}

#[derive(Debug, Clone)]
pub struct InferenceConfig { pub threads: usize, pub device: Device }
impl Default for InferenceConfig {
    fn default() -> Self { InferenceConfig { threads: 4, device: Device::Cpu } }
}

#[derive(Debug, Clone)]
pub struct Tensor { pub shape: Vec<usize>, pub data: Vec<f32> }
impl Tensor {
    pub fn zeros(shape: Vec<usize>) -> Self {
        let len: usize = shape.iter().product();
        Tensor { shape, data: vec![0.0; len] }
    }
}

pub trait InferenceEngine {
    fn load_model(&mut self, info: &ModelInfo) -> std::result::Result<(), InferenceError>;
    fn predict(&self, input: &Tensor) -> std::result::Result<Tensor, InferenceError>;
}
