//! Google API integration - YouTube, Google Ads, Analytics.
//! Ready-made pieces for users to connect Google accounts and manage content.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GoogleError {
    #[error("auth error: {0}")] Auth(String),
    #[error("api error: {0}")] Api(String),
    #[error("quota exceeded")] QuotaExceeded,
    #[error("not found: {0}")] NotFound(String),
}

// --- OAuth ---
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleAuth { pub client_id: String, pub client_secret: String, pub redirect_uri: String, pub scopes: Vec<String> }
impl GoogleAuth {
    pub fn get_auth_url(&self) -> String {
        format!("https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&scope={}&response_type=code&access_type=offline",
            self.client_id, self.redirect_uri, self.scopes.join("+"))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthToken { pub access_token: String, pub refresh_token: Option<String>, pub expires_at: u64 }

// --- YouTube ---
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YouTubeConfig { pub api_key: Option<String>, pub oauth_token: Option<OAuthToken>, pub channel_id: Option<String> }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Privacy { Public, Unlisted, Private }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoUpload { pub title: String, pub description: String, pub tags: Vec<String>, pub privacy: Privacy, pub file_path: String, pub thumbnail_path: Option<String>, pub category_id: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Video { pub id: String, pub title: String, pub description: String, pub published_at: String, pub view_count: u64, pub like_count: u64, pub comment_count: u64, pub thumbnail_url: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel { pub id: String, pub name: String, pub subscriber_count: u64, pub video_count: u64 }

#[async_trait::async_trait]
pub trait YouTubeApi: Send + Sync {
    async fn upload_video(&self, upload: &VideoUpload) -> std::result::Result<Video, GoogleError>;
    async fn list_videos(&self) -> std::result::Result<Vec<Video>, GoogleError>;
    async fn get_video(&self, id: &str) -> std::result::Result<Video, GoogleError>;
    async fn delete_video(&self, id: &str) -> std::result::Result<(), GoogleError>;
    async fn get_channel_stats(&self) -> std::result::Result<Channel, GoogleError>;
    async fn search(&self, query: &str, max_results: usize) -> std::result::Result<Vec<Video>, GoogleError>;
}

// --- Google Ads ---
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdsConfig { pub developer_token: String, pub oauth_token: OAuthToken, pub customer_id: String }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum CampaignStatus { Enabled, Paused, Removed }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Campaign { pub id: String, pub name: String, pub status: CampaignStatus, pub budget_micros: u64, pub start_date: String, pub end_date: Option<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdMetrics { pub impressions: u64, pub clicks: u64, pub cost_micros: u64, pub conversions: f64, pub ctr: f64 }

#[async_trait::async_trait]
pub trait GoogleAdsApi: Send + Sync {
    async fn list_campaigns(&self) -> std::result::Result<Vec<Campaign>, GoogleError>;
    async fn create_campaign(&self, name: &str, budget_micros: u64) -> std::result::Result<Campaign, GoogleError>;
    async fn get_metrics(&self, campaign_id: &str) -> std::result::Result<AdMetrics, GoogleError>;
    async fn pause_campaign(&self, campaign_id: &str) -> std::result::Result<(), GoogleError>;
}

// --- Analytics ---
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsConfig { pub property_id: String, pub oauth_token: OAuthToken }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsReport { pub dimensions: Vec<String>, pub metrics: Vec<String>, pub rows: Vec<ReportRow> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportRow { pub dimension_values: Vec<String>, pub metric_values: Vec<f64> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealTimeData { pub active_users: u64, pub page_views: u64, pub events: u64 }

#[async_trait::async_trait]
pub trait AnalyticsApi: Send + Sync {
    async fn get_report(&self, dimensions: Vec<String>, metrics: Vec<String>) -> std::result::Result<AnalyticsReport, GoogleError>;
    async fn get_realtime(&self) -> std::result::Result<RealTimeData, GoogleError>;
}
