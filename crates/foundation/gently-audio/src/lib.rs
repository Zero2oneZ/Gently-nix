//! GentlyOS Audio - Audio capture, processing, and synthesis.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum AudioError {
    #[error("device not found: {0}")]
    DeviceNotFound(String),
    #[error("stream error: {0}")]
    StreamError(String),
    #[error("format error: {0}")]
    FormatError(String),
}

/// Audio sample format configuration.
#[derive(Debug, Clone, Copy)]
pub struct AudioConfig {
    pub sample_rate: u32,
    pub channels: u16,
    pub buffer_size: usize,
}

impl Default for AudioConfig {
    fn default() -> Self {
        AudioConfig { sample_rate: 44100, channels: 2, buffer_size: 1024 }
    }
}

/// An audio buffer holding raw PCM samples.
#[derive(Debug, Clone)]
pub struct AudioBuffer {
    pub samples: Vec<f32>,
    pub config: AudioConfig,
}

impl AudioBuffer {
    pub fn new(config: AudioConfig) -> Self { AudioBuffer { samples: Vec::new(), config } }
    pub fn duration_secs(&self) -> f64 {
        self.samples.len() as f64 / (self.config.sample_rate as f64 * self.config.channels as f64)
    }
    pub fn is_empty(&self) -> bool { self.samples.is_empty() }
}

/// FFT analysis result.
#[derive(Debug, Clone)]
pub struct Spectrum {
    pub magnitudes: Vec<f32>,
    pub sample_rate: u32,
}

impl Spectrum {
    pub fn peak_frequency(&self) -> Option<f32> {
        if self.magnitudes.is_empty() { return None; }
        let (idx, _) = self.magnitudes.iter().enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))?;
        Some(idx as f32 * self.sample_rate as f32 / (2.0 * self.magnitudes.len() as f32))
    }
}

/// Trait for audio processing pipelines.
pub trait AudioProcessor {
    fn process(&mut self, input: &AudioBuffer) -> std::result::Result<AudioBuffer, AudioError>;
}
