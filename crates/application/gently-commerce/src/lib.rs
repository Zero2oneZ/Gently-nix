//! SYNTHESTASIA Vibe Commerce + TradingView integration.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CommerceError {
    #[error("order failed: {0}")] OrderFailed(String),
    #[error("product not found: {0}")] NotFound(String),
    #[error("market data error: {0}")] MarketData(String),
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Currency { Usd, Eur, Gbp, Btc, Eth, Synth }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Price { pub amount: u64, pub currency: Currency, pub decimals: u8 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product { pub id: String, pub name: String, pub description: String, pub price: Price, pub images: Vec<String> }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum OrderStatus { Pending, Paid, Shipped, Delivered, Cancelled, Refunded }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem { pub product_id: String, pub quantity: u32, pub unit_price: Price }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order { pub id: String, pub items: Vec<OrderItem>, pub total: Price, pub status: OrderStatus, pub created_at: String }

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TradeAction { Buy, Sell, Hold }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradingSignal { pub symbol: String, pub action: TradeAction, pub price: f64, pub confidence: f64, pub timestamp: u64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartConfig { pub symbol: String, pub interval: String, pub indicators: Vec<String> }
