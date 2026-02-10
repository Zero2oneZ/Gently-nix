//! TikTok posting infrastructure.
//! Ready-made pieces for content publishing to TikTok.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TikTokError {
    #[error("auth error: {0}")] Auth(String),
    #[error("upload failed: {0}")] UploadFailed(String),
    #[error("api error: {0}")] Api(String),
    #[error("rate limited")] RateLimited,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TikTokConfig { pub client_key: String, pub client_secret: String, pub access_token: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken { pub access_token: String, pub refresh_token: String, pub open_id: String, pub expires_in: u64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TikTokAuth { pub client_key: String, pub client_secret: String }
impl TikTokAuth {
    pub fn get_auth_url(&self, redirect_uri: &str, scope: &str) -> String {
        format!("https://www.tiktok.com/v2/auth/authorize/?client_key={}&scope={}&response_type=code&redirect_uri={}",
            self.client_key, scope, redirect_uri)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TikTokPrivacy { Public, Friends, Private }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoPost {
    pub title: Option<String>,
    pub description: String,
    pub video_file_path: String,
    pub privacy: TikTokPrivacy,
    pub disable_comment: bool,
    pub disable_duet: bool,
    pub disable_stitch: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostResult { pub publish_id: String, pub status: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub id: String, pub title: String, pub description: String, pub duration: f64,
    pub create_time: u64, pub share_url: String, pub view_count: u64, pub like_count: u64,
    pub comment_count: u64, pub share_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub open_id: String, pub display_name: String, pub avatar_url: String,
    pub follower_count: u64, pub following_count: u64, pub likes_count: u64, pub video_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TikTokWebhook { pub event: String, pub data: serde_json::Value }

#[async_trait::async_trait]
pub trait TikTokApi: Send + Sync {
    async fn post_video(&self, post: &VideoPost) -> std::result::Result<PostResult, TikTokError>;
    async fn get_video_info(&self, video_id: &str) -> std::result::Result<VideoInfo, TikTokError>;
    async fn list_videos(&self) -> std::result::Result<Vec<VideoInfo>, TikTokError>;
    async fn get_user_info(&self) -> std::result::Result<UserInfo, TikTokError>;
}
