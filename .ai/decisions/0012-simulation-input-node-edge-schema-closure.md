# 0012 - Simulation Input Node and Edge Schema Closure

## Status

Accepted.

## Context

`simulation_input.v1` is the worker-executable input contract consumed by the Python worker, the Go Compute API simulation input registry, Desktop sidecar execution, and legacy/backend compatibility paths. Before this decision, the schema rejected unknown top-level fields but kept `nodes[]` and `edges[]` items as open objects. The simulation core input-contract audit therefore remained partial because node/edge typos and camelCase drift were not contractually visible.

The simulation core adapter now has explicit `compat`, `warn`, and `strict` unknown-field modes. That adapter compatibility is useful for direct migration paths, but it should not define the long-term wire contract for executable simulation inputs.

## Decision

- `simulation_input.v1` node and edge items use explicit canonical snake_case fields.
- Unknown top-level node/edge item fields are rejected by the JSON Schema through `additionalProperties=false`.
- The schema does not add node/edge item `required` fields in this slice; requiredness remains a separate compatibility decision.
- Component-indexed concentration maps, concentration transform maps, UDM process rows, UDM parameter maps, and UDM model snapshots remain dynamic model data inside the explicit fields.
- Adapter support for legacy camelCase model fields remains a direct-call migration compatibility path only. CamelCase model fields are not canonical `simulation_input.v1` fields.
- `NodeData` and `EdgeData` runtime `extra="allow"` remains a separate follow-up decision before worker/default strict mode changes.

## Consequences

- Contract validation can fail typo or drift fields inside `nodes[]` and `edges[]` before worker execution.
- The simulation core input-contract audit can close `simulation-input-node-edge-items-open-schema`, leaving runtime model `extra` policy as the remaining input-contract gap.
- Existing valid simulation input fixtures remain valid because they already use canonical snake_case fields.
- Payloads that bypassed the contract with camelCase model fields must continue through adapter compatibility paths or be normalized to snake_case before worker schema validation.
- Future worker-executable node/edge fields must be added explicitly to `simulation_input.v1`, registry notes, fixtures, and tests.

## Alternatives Considered

- Keep node/edge items open and rely only on adapter `warn` / `strict`: rejected because the worker validates `simulation_input.v1` before adapting, and the executable wire contract would still not prevent schema-level drift.
- Add camelCase aliases to the schema: rejected because P0 contracts use snake_case and the alias set would make migration compatibility look canonical.
- Add node/edge item required fields now: rejected because it is a broader compatibility change than needed to close unknown-field drift.
- Close every nested UDM/process/model object: rejected because component/model internals are intentionally dynamic and need separate model-specific contracts before being narrowed.
