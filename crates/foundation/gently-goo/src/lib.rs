//! SYNTHESTASIA GOO Field - Unified signed distance field (SDF) engine.

use nalgebra::Vector3;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GooError {
    #[error("invalid field: {0}")]
    InvalidField(String),
    #[error("evaluation overflow at depth {0}")]
    Overflow(usize),
}

pub type Vec3 = Vector3<f64>;

/// A signed distance field primitive.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SdfPrimitive {
    Sphere { center: [f64; 3], radius: f64 },
    Box { center: [f64; 3], half_extents: [f64; 3] },
    Plane { normal: [f64; 3], offset: f64 },
    Torus { center: [f64; 3], major_radius: f64, minor_radius: f64 },
}

/// CSG operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CsgOp {
    Union(Box<GooField>, Box<GooField>),
    Intersection(Box<GooField>, Box<GooField>),
    Difference(Box<GooField>, Box<GooField>),
    SmoothUnion { a: Box<GooField>, b: Box<GooField>, k: f64 },
}

/// A composable SDF field node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GooField {
    Primitive(SdfPrimitive),
    Operation(CsgOp),
    Transform { child: Box<GooField>, translate: [f64; 3], scale: f64 },
}

impl GooField {
    pub fn evaluate(&self, point: &Vec3) -> f64 {
        match self {
            GooField::Primitive(prim) => eval_prim(prim, point),
            GooField::Operation(op) => eval_csg(op, point),
            GooField::Transform { child, translate, scale } => {
                let p = Vec3::new((point.x - translate[0]) / scale, (point.y - translate[1]) / scale, (point.z - translate[2]) / scale);
                child.evaluate(&p) * scale
            }
        }
    }
    pub fn sphere(c: [f64; 3], r: f64) -> Self { GooField::Primitive(SdfPrimitive::Sphere { center: c, radius: r }) }
    pub fn union(a: GooField, b: GooField) -> Self { GooField::Operation(CsgOp::Union(Box::new(a), Box::new(b))) }
}

fn eval_prim(prim: &SdfPrimitive, p: &Vec3) -> f64 {
    match prim {
        SdfPrimitive::Sphere { center, radius } => {
            let c = Vec3::new(center[0], center[1], center[2]);
            (p - c).magnitude() - radius
        }
        SdfPrimitive::Box { center, half_extents } => {
            let c = Vec3::new(center[0], center[1], center[2]);
            let h = Vec3::new(half_extents[0], half_extents[1], half_extents[2]);
            let q = Vec3::new((p.x - c.x).abs() - h.x, (p.y - c.y).abs() - h.y, (p.z - c.z).abs() - h.z);
            Vec3::new(q.x.max(0.0), q.y.max(0.0), q.z.max(0.0)).magnitude() + q.x.max(q.y).max(q.z).min(0.0)
        }
        SdfPrimitive::Plane { normal, offset } => {
            let n = Vec3::new(normal[0], normal[1], normal[2]);
            p.dot(&n) - offset
        }
        _ => 0.0,
    }
}

fn eval_csg(op: &CsgOp, p: &Vec3) -> f64 {
    match op {
        CsgOp::Union(a, b) => a.evaluate(p).min(b.evaluate(p)),
        CsgOp::Intersection(a, b) => a.evaluate(p).max(b.evaluate(p)),
        CsgOp::Difference(a, b) => a.evaluate(p).max(-b.evaluate(p)),
        CsgOp::SmoothUnion { a, b, k } => {
            let (da, db) = (a.evaluate(p), b.evaluate(p));
            let h = (0.5 + 0.5 * (db - da) / k).clamp(0.0, 1.0);
            db * (1.0 - h) + da * h - k * h * (1.0 - h)
        }
    }
}
