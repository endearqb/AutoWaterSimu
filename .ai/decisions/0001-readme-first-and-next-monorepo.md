# 0001 - README First and AutoWaterSimu Next Monorepo

## Status

Accepted.

## Context

AutoWaterSimu is currently a customized FastAPI + React full-stack project with important legacy assets:

- React Flow / XYFlow process editor.
- Material Balance, ASM, ASM1Slim, ASM3, and UDM compute paths.
- FastAPI OpenAPI client generation.
- Existing backend regression tests and frontend TypeScript validation.

The Next rebuild requires shared contracts, a pure Python simulation core, a Python worker, a Go Compute API, and a Windows Desktop app. Moving this work into a separate repository would make old-vs-new comparison, fixture reuse, and incremental migration harder.

The project also needs stable AI collaboration context so agents do not act on incomplete assumptions.

## Decision

Use README First as the repository collaboration protocol and evolve AutoWaterSimu Next inside the current repository as a monorepo-style structure:

- Keep `frontend/` and `backend/` as legacy baseline surfaces.
- Add `contracts/` for JSON Schema contracts.
- Add `simulation_core/` for pure Python compute extraction.
- Add `services/simulation-worker/` for Python worker CLI / sidecar.
- Add `apps/api/` for the Go Compute API.
- Add `apps/desktop/` for Tauri/Rust + React Desktop.
- Add `.ai/` for AI change records, decisions, plans, and reviews.

## Consequences

- Legacy and Next code can share fixtures and regression tests during migration.
- README First provides a consistent reading path before modifications.
- New code must respect the shared contracts and avoid directly coupling UI canvas JSON to worker execution.
- This repository will temporarily contain both legacy and Next structures until exit criteria in `docs/rebuild/` are met.

## Alternatives Considered

- New repository for AutoWaterSimu Next: rejected for now because it would complicate baseline comparison and reuse of existing code/tests.
- Direct in-place rewrite of `frontend/` and `backend/`: rejected because it risks breaking legacy behavior before worker and contract layers are proven.

## Follow-up

- Add actual contract schemas and fixtures under `contracts/`.
- Extract pure compute into `simulation_core/` only after Phase 0 bug fixes and baseline tests.
- Keep `.ai/changes/` updated for significant modifications.
