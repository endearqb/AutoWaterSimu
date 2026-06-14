# 0015 - Simulation Core Mixed Model Dispatch

## Status

Accepted.

## Context

ADR 0014 froze `_run_hours` mutually exclusive branch behavior as a pre-performance baseline, not as final business semantics. The performance plan v1.4 and requirement REQ-P0-014 require an explicit decision for mixed reaction models: either support multiple reaction model masks in one graph or reject such inputs at build time.

The repository now treats `mixed_asm_udm` as a valid contract fixture and includes it in Phase 0 baseline, profiling, and golden evidence. Rejecting mixed graphs would break that valid input path and would turn the existing baseline into an unsupported scenario.

## Decision

- Support mixed reaction model graphs in `simulation_core`.
- When more than one reaction model is active in one `_run_hours` call, dispatch to a combined reaction RHS.
- The combined RHS computes transport once, then adds ASM1Slim, ASM1, ASM3, and UDM reaction terms to their active `compute_mask` subsets.
- UDM fixed component handling remains active in mixed graphs.
- ASM oxygen derivative clearing is limited to the active compute subset for the relevant ASM model, instead of relying on all-column writes.
- Single-model graphs keep the existing branch fallback order and output clamp policy.
- The default pure transport branch keeps its current no-output-clamp behavior.

## Consequences

- PR-38 is resolved with supported mixed-model semantics.
- The correctness-freeze audit now checks for mixed dispatcher support plus single-model fallback preservation, rather than requiring mutually exclusive mixed behavior.
- Mixed ASM/UDM doc tests become active golden/regression checks.
- Future unified RHS work must preserve the same mixed reaction accumulation and the default branch clamp baseline unless a later ADR changes those semantics.

## Alternatives Considered

- Reject mixed reaction model graphs at build time: rejected because `mixed_asm_udm` is already a valid fixture and part of the Phase 0 evidence matrix.
- Keep mutually exclusive mixed behavior and only document it: rejected because REQ-P0-014 identifies silent reaction loss as a correctness bug.
- Move directly to full unified RHS for all branches: deferred because PR-11 also touches solver/output-grid and broader refactoring risks; this ADR chooses the smallest semantics change needed for mixed correctness.
