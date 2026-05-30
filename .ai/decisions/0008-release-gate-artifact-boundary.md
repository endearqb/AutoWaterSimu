# 0008 - Release Gate Artifact Boundary

## Status

Accepted.

## Context

AutoWaterSimu Next PRD, Technical Spec, and Development Plan require Desktop packaged sidecar smoke, NSIS installer smoke, DB migration rollback smoke, schema/codegen gates, and worker/API/frontend/Desktop verification before release. The repository currently has source-mode Desktop worker execution and local verification coverage, but it does not yet contain a committed packaged worker binary or NSIS installer artifact.

## Decision

- Add executable release gate automation, but keep artifact-based release checks explicit.
- `Mode=merge` runs only verifications that the repository can reproduce from source.
- `Mode=release` requires packaged sidecar and installer artifact paths, supplied by parameters or environment variables.
- Missing sidecar/installer artifacts fail release mode unless the caller explicitly requests an allow-missing dry run.
- Dry-run skipped evidence must not be treated as a successful release gate.
- Desktop packaged sidecar runtime wiring, Tauri `externalBin`, installer creation, signing, and auto-update remain separate implementation work.

## Consequences

- CI and local runs can produce machine-readable evidence without pretending that missing release artifacts passed.
- Future packaging work can plug real artifact paths into the same smoke scripts.
- The release checklist is now enforceable as automation, while actual artifact generation remains clearly blocked until packaged worker and installer build steps exist.
