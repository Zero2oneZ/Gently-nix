//! Permission engine benchmarking utilities.
//!
//! Gate checks must be sub-microsecond. This module provides
//! measurement tools to verify performance requirements.

use std::time::Instant;

use crate::engine::PermissionEngine;
use gently_core::layer::{Layer, Resource};

/// Result of a gate check benchmark run.
#[derive(Debug, Clone)]
pub struct BenchResult {
    pub iterations: u64,
    pub total_ns: u128,
    pub avg_ns: u128,
    pub min_ns: u128,
    pub max_ns: u128,
}

/// Benchmark the gate check operation across all layer/resource combinations.
pub fn bench_gate_check(iterations: u64) -> BenchResult {
    let engine = PermissionEngine::new();
    let resources = [
        Resource::CoreTools, Resource::PublicApi, Resource::RuntimeConfig,
        Resource::LimboIo, Resource::RootContract, Resource::IoSurface,
    ];
    let layers = Layer::all();

    let mut min_ns = u128::MAX;
    let mut max_ns = 0u128;
    let mut total_ns = 0u128;
    let mut count = 0u64;

    for _ in 0..iterations {
        for layer in layers {
            for resource in &resources {
                let start = Instant::now();
                let _ = engine.check(*layer, resource);
                let elapsed = start.elapsed().as_nanos();
                total_ns += elapsed;
                min_ns = min_ns.min(elapsed);
                max_ns = max_ns.max(elapsed);
                count += 1;
            }
        }
    }

    BenchResult {
        iterations: count,
        total_ns,
        avg_ns: if count > 0 { total_ns / count as u128 } else { 0 },
        min_ns,
        max_ns,
    }
}

/// Quick smoke test: verify all gate checks complete in under 1ms total
/// for a single pass of all combinations.
pub fn smoke_test() -> bool {
    let result = bench_gate_check(1);
    // 6 resources x 6 layers = 36 checks, must complete in < 1ms
    result.total_ns < 1_000_000
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bench_runs_without_panic() {
        let result = bench_gate_check(10);
        assert!(result.iterations > 0);
        assert!(result.avg_ns < 100_000); // should be well under 100us per check
    }

    #[test]
    fn smoke_test_passes() {
        assert!(smoke_test());
    }
}
