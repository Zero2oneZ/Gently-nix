//! SYNTHESTASIA G.E.D. - Generative Educational Device.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GedError {
    #[error("lesson generation failed: {0}")] GenerationFailed(String),
    #[error("assessment error: {0}")] AssessmentError(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Difficulty { Beginner, Intermediate, Advanced, Expert }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lesson { pub id: String, pub title: String, pub content: String, pub difficulty: Difficulty, pub prerequisites: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Curriculum { pub lessons: Vec<Lesson>, pub progress: std::collections::HashMap<String, bool> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentProfile { pub id: String, pub skill_levels: std::collections::HashMap<String, f32>, pub completed: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assessment { pub lesson_id: String, pub score: f32, pub feedback: String }

#[async_trait::async_trait]
pub trait Tutor: Send + Sync {
    async fn generate_lesson(&self, topic: &str, difficulty: Difficulty) -> std::result::Result<Lesson, GedError>;
    async fn assess(&self, student: &StudentProfile, lesson: &Lesson, response: &str) -> std::result::Result<Assessment, GedError>;
}
