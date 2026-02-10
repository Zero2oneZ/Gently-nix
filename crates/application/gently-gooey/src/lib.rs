//! SYNTHESTASIA GOOEY 2D application builder / TUI framework.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum GooeyError {
    #[error("render error: {0}")] Render(String),
    #[error("event error: {0}")] Event(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum WidgetType { Panel, Button, TextInput, Label, List, Table, Canvas, StatusBar, Tabs }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Rect { pub x: u16, pub y: u16, pub width: u16, pub height: u16 }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BorderStyle { None, Single, Double, Rounded }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Color { Rgb(u8, u8, u8), Named(String) }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Style { pub fg: Option<Color>, pub bg: Option<Color>, pub bold: bool, pub border: BorderStyle }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Widget { pub id: String, pub widget_type: WidgetType, pub rect: Rect, pub style: Style, pub children: Vec<Widget> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventType { Click, KeyPress(char), Focus, Blur, Resize }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event { pub event_type: EventType, pub target_id: String }

pub trait Renderable { fn render(&self, buf: &mut Vec<String>); }
pub trait EventHandler { fn handle_event(&mut self, event: &Event); }
