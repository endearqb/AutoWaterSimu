# AutoWaterSimu Next Contracts Architecture

> Snapshot date: 2026-06-14.

This document summarizes the current contract ownership model. It complements `contracts/README.md`, `contracts/registry.json`, and `contracts/codegen/manifest.json`; it does not replace schema files, OpenAPI, generated clients, or tests.

## Source Of Truth

`contracts/*.v1.json` are the long-term cross-boundary wire contracts. Each schema must be listed in `contracts/registry.json` with consumers, examples, compatibility notes, and breaking-change policy.

`contracts/codegen/manifest.json` records how each language target is handled today:

- TypeScript is generated through the Compute OpenAPI client under `frontend/src/client/compute`.
- OpenAPI is the API-facing projection under `apps/api/openapi/compute.openapi.json`.
- Go currently uses API-owned DTOs plus runtime schema validation and Go tests.
- Python currently uses runtime schema validation and focused transform helpers.
- Rust currently uses Desktop-owned Tauri/package DTOs and focused Rust tests.

No generated Go, Python, or Rust contract types are committed yet.

Desktop project package and support bundle wire shapes are now represented by `desktop_project_package.v1` and `desktop_support_bundle.v1`. The Desktop runtime emits the new project package schema for new exports while keeping legacy `desktop_project_export.v1` import compatibility.

`simulation_input.v1` is the worker-executable input contract. Its top-level fields and node/edge item fields are closed to explicit canonical snake_case fields, while component-indexed concentration maps, concentration transform maps, UDM process rows, and UDM model snapshots remain dynamic model data. Compatibility adapters may still accept legacy camelCase model fields when called directly, but those names are not part of the canonical contract.

## Drift Gates

The default contract gate is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
```

The gate verifies:

- registry coverage for all `contracts/*.v1.json` schemas
- registry coverage for every valid and invalid fixture
- codegen manifest coverage for every registered schema
- contract schema and transform tests
- frontend Compute OpenAPI client generation
- generated client drift through Git diff

`scripts/ci/pr-fast.ps1` calls this gate as part of default PR evidence.

## Change Rules

Schema changes must update:

- the schema file
- valid/invalid examples
- `contracts/registry.json`
- `contracts/codegen/manifest.json` when target strategy changes
- Go API, Python worker, Desktop, OpenAPI, and frontend generated client consumers where applicable
- README and `.ai/changes/` records

Breaking changes inside an existing `*.v1.json` schema are not allowed by default. Removing fields, adding required fields, narrowing enums, changing `schema_version`, or changing persisted/ref semantics requires a new schema version and a coordinated migration plan.

## Current Gaps

- There is no multi-language generator for Go, Python, or Rust.
- Rust Desktop still uses hand-written package/support-bundle DTOs and focused runtime validation; generated Rust contract types remain deferred.
- Contract validation does not prove full scenario-level integration; it proves wire-shape consistency and generated client drift only.

## Next Decisions

Before adding generated Go, Python, or Rust types, decide:

- output directory and ownership for each language
- whether generated types replace or supplement current runtime validation
- formatting and drift gate commands
- migration path for existing hand-written DTOs
- compatibility policy for generated code review noise
