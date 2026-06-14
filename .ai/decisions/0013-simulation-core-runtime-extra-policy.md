# 0013 - Simulation Core Runtime Extra Policy

## Status

Accepted.

## Context

`simulation_input.v1` now rejects unknown top-level fields and unknown node/edge item fields through explicit canonical snake_case schemas. The simulation core adapter also has a default-compatible `compat` mode plus opt-in `warn` and `strict` modes for unknown payload fields.

After schema closure, the remaining input-contract gap was inside direct runtime model construction: `NodeData` and `EdgeData` still allowed Pydantic extra fields. That meant code bypassing the adapter could preserve typo or drift fields in `model_extra`, even though worker-executable payload validation and adapter normalization already had a stricter strategy.

## Decision

- `NodeData` and `EdgeData` use `extra=forbid`.
- Direct runtime model construction rejects unknown node/edge fields.
- The simulation core adapter remains the only compatibility layer for payload unknown-field handling.
- Adapter default `compat` behavior still silently ignores unknown input payload fields before constructing runtime models.
- Adapter `warn` and `strict` modes remain available for explicit evidence and future tightening.
- Worker default invocation remains unchanged in this slice.
- Legacy backend models are not changed in this slice.
- Runtime-only `NodeData.position` remains a runtime field and is not a canonical `simulation_input.v1` node field.

## Consequences

- `scripts/audit-simulation-core-input-contract.ps1` can report `passed` with 0 hard violations and 0 open gaps when schema closure, adapter warn/strict behavior, and runtime unknown-field rejection are all green.
- Runtime model typos are no longer silently carried in Pydantic `model_extra`.
- Future runtime node/edge fields require explicit model changes plus adapter, contract, fixture, and test updates when they are worker-executable.
- Worker/backward-compatible payload behavior is preserved because unknown payload fields are still handled before runtime model construction.

## Alternatives Considered

- Keep `extra=allow` and document it as a compatibility exception: rejected because compatibility belongs at the adapter boundary, not inside the calculator runtime DTOs.
- Change worker default adapter validation mode to `strict` now: rejected because this slice is only runtime model policy; worker default strictness needs separate evidence and compatibility planning.
- Use `extra=ignore`: rejected because direct runtime callers would still not receive an explicit failure for typo or drift fields.
- Change legacy backend models at the same time: rejected because backend thin-shell migration and legacy compatibility are separate P3 follow-up work.
