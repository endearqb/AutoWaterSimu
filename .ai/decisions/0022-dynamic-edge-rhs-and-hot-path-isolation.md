# 0022 - Dynamic Edge RHS And Hot Path Isolation

## Status

Draft.

## Context

UDM-v2 introduces edge contributions whose values may depend on source state, target state, resolved flow, signal values, or transport models. Static hydraulic graphs should not pay the runtime cost of dynamic edge evaluation.

## Decision

Compile edge contributions into separate bundles:

- static hydraulic bundle for fixed `hydraulic` / uncontrolled `pump` edges.
- dynamic edge bundle for settling, controlled pump/hydraulic edges, signal-driven flow, and state-dependent transport.

Pure static hydraulic graphs must avoid dynamic edge dispatch in the solver hot path.

## Consequences

- P0/P1 UI and contracts can express dynamic fields without forcing immediate runtime execution.
- Later compiler work must classify edge bundles explicitly and test the no-extra-overhead static path.
- Runtime diagnostics can report whether a run used static-only or dynamic edge bundles.

## Alternatives Considered

- One generic per-edge callback for every RHS evaluation: rejected because it would tax simple hydraulic graphs.
- Precompute everything: rejected because settling, signal, and controlled flow can depend on time/state.

## Follow-up

- Add compiler tests for static versus dynamic bundle classification.
- Add benchmark evidence before optimizing beyond the bundle split.

