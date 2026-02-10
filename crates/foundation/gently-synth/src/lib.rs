//! $SYNTH Token - GentlyOS native token and smart contract interface.
//! Chain-agnostic types: mint, burn, transfer, stake.

pub mod tier;

use gently_core::Hash;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SynthError {
    #[error("insufficient balance: have {have}, need {need}")]
    InsufficientBalance { have: u64, need: u64 },
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error("invalid amount: {0}")]
    InvalidAmount(String),
    #[error("account not found: {0}")]
    AccountNotFound(String),
    #[error("contract error: {0}")]
    ContractError(String),
}

pub const SYNTH_DECIMALS: u8 = 6;
pub const SYNTH_MAX_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(SYNTH_DECIMALS as u32);

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Address(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenAccount {
    pub address: Address,
    pub balance: u64,
    pub staked: u64,
    pub last_activity: u64,
}

impl TokenAccount {
    pub fn new(address: Address) -> Self { TokenAccount { address, balance: 0, staked: 0, last_activity: 0 } }
    pub fn available(&self) -> u64 { self.balance.saturating_sub(self.staked) }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TokenOp {
    Mint { to: Address, amount: u64 },
    Burn { from: Address, amount: u64 },
    Transfer { from: Address, to: Address, amount: u64 },
    Stake { account: Address, amount: u64 },
    Unstake { account: Address, amount: u64 },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChainTarget { Solana, Ethereum, Base, Local }

/// Local ledger for testing and offline use.
#[derive(Debug, Default)]
pub struct LocalLedger {
    pub accounts: std::collections::HashMap<Address, TokenAccount>,
    pub total_supply: u64,
}

impl LocalLedger {
    pub fn new() -> Self { Self::default() }
    pub fn mint(&mut self, to: &Address, amount: u64) -> std::result::Result<(), SynthError> {
        if self.total_supply + amount > SYNTH_MAX_SUPPLY {
            return Err(SynthError::InvalidAmount("would exceed max supply".into()));
        }
        let account = self.accounts.entry(to.clone()).or_insert_with(|| TokenAccount::new(to.clone()));
        account.balance += amount;
        self.total_supply += amount;
        Ok(())
    }
    pub fn transfer(&mut self, from: &Address, to: &Address, amount: u64) -> std::result::Result<(), SynthError> {
        let avail = self.accounts.get(from).map(|a| a.available()).unwrap_or(0);
        if avail < amount { return Err(SynthError::InsufficientBalance { have: avail, need: amount }); }
        self.accounts.get_mut(from).unwrap().balance -= amount;
        let receiver = self.accounts.entry(to.clone()).or_insert_with(|| TokenAccount::new(to.clone()));
        receiver.balance += amount;
        Ok(())
    }
    pub fn balance_of(&self, addr: &Address) -> u64 { self.accounts.get(addr).map(|a| a.balance).unwrap_or(0) }
}

/// Trait for chain-specific $SYNTH contract interactions.
pub trait SynthContract {
    fn deploy(&mut self) -> std::result::Result<Address, SynthError>;
    fn mint(&mut self, to: &Address, amount: u64) -> std::result::Result<Hash, SynthError>;
    fn transfer(&mut self, from: &Address, to: &Address, amount: u64) -> std::result::Result<Hash, SynthError>;
    fn balance_of(&self, addr: &Address) -> std::result::Result<u64, SynthError>;
    fn total_supply(&self) -> std::result::Result<u64, SynthError>;
}
