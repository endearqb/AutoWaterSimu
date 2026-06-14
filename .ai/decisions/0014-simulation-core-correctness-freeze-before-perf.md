# 0014 - Simulation Core Correctness Freeze Before Performance

## Status

Accepted.

## Context

P3 simulation_core packaging, worker import boundaries, backend/core parity drift guard, and input-contract audits are now green. Before hot-path performance work, the current simulation_core material-balance runtime still needs an explicit correctness baseline for behavior that could otherwise change accidentally during optimization.

The most sensitive current behavior is inside `_run_hours`: ASM/UDM model handling is selected through mutually exclusive branches rather than a combined mixed-model dispatcher, and branch post-processing does not use the same clamp policy for every branch.

## Decision

- Treat the current `_run_hours` branch order as the pre-performance baseline: `asm1slim`, then `asm1`, then `asm3`, then `udm`, then default material balance.
- Treat that order as mutually exclusive. When an earlier branch is active, later branch masks are not executed in the same `_run_hours` invocation.
- Treat ASM/UDM branches as clamping solver output to non-negative values.
- Treat the default material-balance branch commented clamp state as the current baseline.
- Treat `_ode_balance` `compute_mask` behavior as part of the freeze: masked nodes must not receive state or volume derivatives.
- Protect this baseline with core-only tests and `scripts/audit-simulation-core-correctness-freeze.ps1`.
- Include the correctness-freeze audit in the default `pr-fast` lane.

## Consequences

- Performance optimization can start from a known and machine-audited behavior baseline.
- Changing mixed ASM/UDM semantics, branch precedence, default clamp behavior, or `compute_mask` derivative masking requires an intentional test, audit, and ADR update.
- This decision does not claim the current mutually exclusive branch behavior is the desired final mixed-model design.
- Backend thin-shell migration remains future work and still depends on the backend/core parity drift guard until the legacy implementation becomes a wrapper.

## Alternatives Considered

- Immediately implement a combined mixed ASM/UDM dispatcher: rejected because that is a correctness change, not a freeze, and it should not be bundled into the pre-performance baseline.
- Start hot-path optimization without freezing branch behavior: rejected because performance rewrites could accidentally change model selection or clamp behavior.
- Only document the behavior in README files: rejected because README text alone is too weak as regression evidence.
