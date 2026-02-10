//! Livepeer decentralized video transcoding - cheaper Twilio alternative.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LivepeerError {
    #[error("api error: {0}")] Api(String),
    #[error("stream not found: {0}")] StreamNotFound(String),
    #[error("transcode failed: {0}")] TranscodeFailed(String),
    #[error("auth error: {0}")] Auth(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LivepeerConfig {
    pub api_key: String,
    pub api_url: String,
    pub gateway_url: String,
}

impl Default for LivepeerConfig {
    fn default() -> Self {
        LivepeerConfig { api_key: String::new(), api_url: "https://livepeer.studio/api".into(), gateway_url: "https://livepeer.studio".into() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stream { pub id: String, pub name: String, pub stream_key: String, pub playback_id: String, pub is_active: bool, pub created_at: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamProfile { pub name: String, pub width: u32, pub height: u32, pub bitrate: u32, pub fps: u32 }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TaskStatus { Pending, Processing, Complete, Failed }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscodeTask { pub id: String, pub input_url: String, pub output_url: Option<String>, pub profiles: Vec<StreamProfile>, pub status: TaskStatus }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset { pub id: String, pub name: String, pub playback_id: String, pub status: String, pub size: Option<u64>, pub duration_secs: Option<f64> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackInfo { pub playback_url: String, pub stream_url: Option<String>, pub recording_url: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room { pub id: String, pub participants: Vec<RoomParticipant>, pub created_at: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomParticipant { pub id: String, pub name: String, pub joined_at: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent { pub event_type: String, pub stream_id: Option<String>, pub timestamp: String, pub data: serde_json::Value }

#[async_trait::async_trait]
pub trait VideoProvider: Send + Sync {
    async fn create_stream(&self, name: &str) -> std::result::Result<Stream, LivepeerError>;
    async fn get_stream(&self, id: &str) -> std::result::Result<Stream, LivepeerError>;
    async fn list_streams(&self) -> std::result::Result<Vec<Stream>, LivepeerError>;
    async fn delete_stream(&self, id: &str) -> std::result::Result<(), LivepeerError>;
    async fn create_room(&self) -> std::result::Result<Room, LivepeerError>;
    async fn transcode(&self, input_url: &str, profiles: Vec<StreamProfile>) -> std::result::Result<TranscodeTask, LivepeerError>;
    async fn upload_asset(&self, name: &str, data: Vec<u8>) -> std::result::Result<Asset, LivepeerError>;
    async fn get_playback_info(&self, playback_id: &str) -> std::result::Result<PlaybackInfo, LivepeerError>;
}
