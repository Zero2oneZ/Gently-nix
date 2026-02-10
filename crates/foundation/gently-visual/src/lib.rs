//! GentlyOS Visual - SVG generation and visual processing.
//! SVG as runtime container: SVG files contain visual + WASM brain + metadata.

use serde::{Deserialize, Serialize};

/// SVG element types.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SvgElement {
    Rect { x: f64, y: f64, width: f64, height: f64, fill: String },
    Circle { cx: f64, cy: f64, r: f64, fill: String },
    Text { x: f64, y: f64, content: String, font_size: f64 },
    Path { d: String, stroke: String, fill: String },
    Group { id: String, children: Vec<SvgElement> },
}

/// An SVG document with embedded metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvgDocument {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub elements: Vec<SvgElement>,
    pub metadata: std::collections::HashMap<String, String>,
}

impl SvgDocument {
    pub fn new(width: f64, height: f64) -> Self {
        SvgDocument { id: String::new(), width, height, elements: Vec::new(), metadata: std::collections::HashMap::new() }
    }
    pub fn add_element(&mut self, element: SvgElement) { self.elements.push(element); }
    pub fn element_count(&self) -> usize { self.elements.len() }
    pub fn render(&self) -> String {
        let mut svg = format!("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{}\" height=\"{}\">", self.width, self.height);
        for elem in &self.elements { svg.push_str(&render_element(elem)); }
        svg.push_str("</svg>");
        svg
    }
}

fn render_element(elem: &SvgElement) -> String {
    match elem {
        SvgElement::Rect { x, y, width, height, fill } => format!("<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\"/>", x, y, width, height, fill),
        SvgElement::Circle { cx, cy, r, fill } => format!("<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\"/>", cx, cy, r, fill),
        SvgElement::Text { x, y, content, font_size } => format!("<text x=\"{}\" y=\"{}\" font-size=\"{}\">{}</text>", x, y, font_size, content),
        SvgElement::Path { d, stroke, fill } => format!("<path d=\"{}\" stroke=\"{}\" fill=\"{}\"/>", d, stroke, fill),
        SvgElement::Group { id, children } => {
            let mut s = format!("<g id=\"{}\">", id);
            for c in children { s.push_str(&render_element(c)); }
            s.push_str("</g>"); s
        }
    }
}

/// Model chain: embed.svg -> classify.svg -> output.svg
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModelChain { pub stages: Vec<String> }
impl ModelChain {
    pub fn new() -> Self { Self::default() }
    pub fn add_stage(&mut self, svg_path: String) { self.stages.push(svg_path); }
}
