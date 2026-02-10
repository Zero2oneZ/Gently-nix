//! CODIE - 12-keyword instruction language for GentlyOS.
//!
//! Keywords: pug (start), bark (fetch), spin (loop), cali (call),
//! elf (error), turk (transform), fence (guard), pin (lock),
//! bone (immutable), blob (data), biz (business), anchor (finalize)

use gently_core::Result;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CodieError {
    #[error("parse error at line {line}: {message}")]
    Parse { line: usize, message: String },
    #[error("unknown keyword: {0}")]
    UnknownKeyword(String),
    #[error("execution error: {0}")]
    Execution(String),
}

/// The 12 CODIE keywords.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Keyword {
    Pug, Bark, Spin, Cali, Elf, Turk, Fence, Pin, Bone, Blob, Biz, Anchor,
}

impl Keyword {
    pub fn from_str(s: &str) -> std::result::Result<Self, CodieError> {
        match s.to_lowercase().as_str() {
            "pug" => Ok(Self::Pug), "bark" => Ok(Self::Bark), "spin" => Ok(Self::Spin),
            "cali" => Ok(Self::Cali), "elf" => Ok(Self::Elf), "turk" => Ok(Self::Turk),
            "fence" => Ok(Self::Fence), "pin" => Ok(Self::Pin), "bone" => Ok(Self::Bone),
            "blob" => Ok(Self::Blob), "biz" => Ok(Self::Biz), "anchor" => Ok(Self::Anchor),
            _ => Err(CodieError::UnknownKeyword(s.to_string())),
        }
    }
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pug => "pug", Self::Bark => "bark", Self::Spin => "spin",
            Self::Cali => "cali", Self::Elf => "elf", Self::Turk => "turk",
            Self::Fence => "fence", Self::Pin => "pin", Self::Bone => "bone",
            Self::Blob => "blob", Self::Biz => "biz", Self::Anchor => "anchor",
        }
    }
}

/// A single CODIE instruction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instruction {
    pub keyword: Keyword,
    pub args: Vec<String>,
    pub line: usize,
}

/// A parsed CODIE program.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Program {
    pub name: String,
    pub instructions: Vec<Instruction>,
}

impl Program {
    pub fn parse(name: &str, source: &str) -> std::result::Result<Self, CodieError> {
        let mut instructions = Vec::new();
        for (i, line) in source.lines().enumerate() {
            let t = line.trim();
            if t.is_empty() || t.starts_with('#') { continue; }
            let parts: Vec<&str> = t.splitn(2, ' ').collect();
            let keyword = Keyword::from_str(parts[0])?;
            let args = if parts.len() > 1 {
                parts[1].split(',').map(|s| s.trim().to_string()).collect()
            } else { Vec::new() };
            instructions.push(Instruction { keyword, args, line: i + 1 });
        }
        Ok(Program { name: name.to_string(), instructions })
    }
    pub fn instruction_count(&self) -> usize { self.instructions.len() }
}

/// Trait for CODIE execution backends.
pub trait CodieRuntime {
    fn execute(&mut self, program: &Program) -> std::result::Result<Vec<String>, CodieError>;
}
