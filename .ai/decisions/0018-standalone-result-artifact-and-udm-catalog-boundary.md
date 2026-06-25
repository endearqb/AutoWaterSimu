# 0018 - Standalone Result Artifact And UDM Catalog Boundary

## Status

Accepted.

## Context

Standalone RC static review found two P0 blockers:

- The frontend passed `compute_result.v1` envelope objects into legacy analyzer components that expect inline time-series fields. The actual time-series payload is in artifact bytes, and metadata lives in `artifact.v1`.
- Go UDM seed templates were generated independently through `simpleUDMTemplate()`, drifting from the legacy ASM1/ASM1Slim/ASM3/Petersen templates and causing some create-from-template paths to fail validation.

The existing Next architecture already requires summary metadata in the result envelope and large payloads in artifacts. It also treats contracts and canonical fixtures as cross-runtime source of truth.

## Decision

Keep `compute_result.v1` as the result envelope and keep full time-series bytes out of the envelope/main table.

Add a dedicated time-series artifact payload contract, with `material_balance_time_series.v1` as the canonical schema name. `artifact.v1` remains metadata only and must not embed artifact bytes.

Frontend analysis must use a dedicated analysis-result adapter that reads the result envelope, resolves the time-series artifact, validates the payload, preserves scalar metadata such as `label/source/target`, and returns the legacy analyzer shape. UI code must not treat `currentJob.result_data` as the analysis payload in standalone mode.

Use a single canonical UDM seed catalog for ASM1, ASM1Slim, ASM3, and Petersen tutorial templates. Go and Python may load or generate runtime representations from it, but production seed content must not be maintained as separate literals in both languages.

Template creation must record schema/hash identity in model version metadata. Historical versions and model runs are immutable; fixing bad seed data uses appended versions or audit markings, not in-place rewrites.

## Consequences

- Standalone result parity is measured by actual analyzer curves, not by job success or artifact existence.
- Time-series schema changes must update contracts registry, fixtures, tests, worker producer, frontend decoder, and release gates.
- UDM template changes must pass Go/Python catalog hash parity and create-from-template validation for all 7 templates.
- `simpleUDMTemplate()` cannot remain a production seed source.
- P1 final-values optimization can add small `compute_result.v1.data.final_values`, but it does not change the large artifact boundary.

## Alternatives Considered

- Inline time-series back into `compute_result.v1`: rejected because it violates the existing artifact boundary and reintroduces large JSON database/result payloads.
- Patch analyzer components to understand arbitrary compute envelopes: rejected because it spreads compatibility logic across UI components.
- Add missing parameters to the Go simple templates only: rejected because it keeps two template facts and leaves tutorial/metadata parity broken.
- Rewrite historical template versions in place: rejected because it breaks reproducibility and model run audit identity.

## Follow-up

- PR-1: add `material_balance_time_series.v1` schema, fixtures, registry, and producer validation.
- PR-2: add frontend analysis-result adapter, loading/error state, cache, and live analyzer gate.
- PR-3: add canonical UDM seed catalog, Go/Python parity tests, and remove production `simpleUDMTemplate()`.
- PR-4/P1: add `final_values` to result data to avoid downloading full artifacts after job success.
