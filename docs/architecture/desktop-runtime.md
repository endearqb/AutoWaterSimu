# AutoWaterSimu Next Desktop Runtime

> Snapshot date: 2026-05-31.

This document summarizes the stable Desktop runtime boundary. It complements `apps/desktop/README.md`, `apps/desktop/src-tauri/README.md`, Desktop Rust tests, and the Desktop package contracts.

## Runtime Ownership

`apps/desktop/src-tauri` owns local runtime state and side effects:

- SQLite project, job, event, artifact, model_run, support bundle, canvas graph, backup, and recent-file records.
- Source-mode Python worker JSON-RPC sidecar execution for development.
- Explicit packaged-worker exe mode for release smoke when a real sidecar artifact is provided.
- Runtime-local artifact export, support bundle creation, project backup/restore, and project package import/export.
- Path sandbox validation for runtime-local exports and user-selected `.autowatersimu-project.json` files.

React Desktop code calls Tauri commands and dialog helpers only. It must not write SQLite, spawn shell commands, or bypass Rust path validation.

## Package And Support Bundle Contracts

New project package exports use `desktop_project_package.v1`.

The package contains:

- project metadata
- project-scoped compute job snapshots and job events
- CanvasGraph snapshots
- artifact refs and checksum-verified hex file records
- support bundle refs and checksum-verified hex file records
- content counts and redaction flags

Import accepts both `desktop_project_package.v1` and legacy `desktop_project_export.v1`. The legacy path exists for compatibility with older local package files; new exports should not use the legacy schema.

Support bundles use `desktop_support_bundle.v1`. They contain job metadata, events, artifact metadata, model_run refs, runtime versions, and redaction flags. Artifact file contents are intentionally excluded from support bundles; `artifact_contents_included=false` is a contract constraint.

## Evidence Entry

The local Desktop package smoke entry is:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
```

It writes `tmp/ci-evidence/desktop-package-smoke.json` and currently proves:

- Desktop package/support bundle contract fixture validation.
- clean-runtime project package export/import round trip.
- checksum-verified artifact and support bundle file restore.
- project metadata, CanvasGraph, job, artifact, model_run, event, and support bundle restoration.
- support bundle redaction.
- Desktop React command wrapper typechecking.

This evidence is local/opt-in. It does not prove packaged-worker exe startup, NSIS installer behavior, code signing, auto update, or hosted workflow status.

## Release Boundary

P0 release artifacts remain unsigned packaged-worker and NSIS installer artifacts with smoke evidence. Signing, auto update, Microsoft Store packaging, and automated GitHub Release publication remain post-P0 and are governed by `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`.

Release artifact smoke commands live under `apps/desktop/scripts/` and require explicit artifact paths. Missing sidecar or installer artifacts must not be treated as a passing release.

## Current Gaps

- No generated Rust DTOs are committed for Desktop contracts.
- `desktop-package-smoke.ps1` is not yet a hosted workflow.
- Packaged-worker exe, NSIS installer, and download verification remain release-evidence work.
- The Desktop offline golden scenario is only partially covered until packaged worker and hosted/package artifact evidence are connected.
