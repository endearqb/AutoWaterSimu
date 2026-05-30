# AutoWaterSimu Next COSS Source Manifest - 2026-05-31

## Purpose

This manifest records whether AutoWaterSimu Next has copied upstream COSS UI source files into this repository.

The current P0 implementation uses local-owned COSS-compatible styling and interaction patterns. No upstream COSS component source file has been copied into the tracked repository for this phase.

## Current Status

| Area | Current source status | Notes |
|---|---|---|
| Legacy web UI | Local legacy React + Chakra UI code | Kept as migration baseline; not a COSS source copy |
| Web Compute Jobs / lifecycle pages | Local-owned React implementation | Uses project CSS/classes and generated Compute client; no upstream COSS source copy recorded |
| Desktop React shell | Local-owned React/CSS implementation | `apps/desktop/src/styles.css` is repository-owned styling |
| Shared UI primitives | Local project components | No copied upstream COSS primitive file is tracked |

## Required Record For Future Copies

If a future change copies COSS source files, update this manifest in the same commit with:

| Field | Required value |
|---|---|
| Upstream repository URL | Exact repository URL |
| Upstream commit or tag | Immutable source reference |
| License | License applying to the copied files |
| Copied paths | Upstream paths and local destination paths |
| Local owner | Directory responsible for maintenance |
| Local changes | Summary of modifications from upstream |
| Verification | Typecheck/build/tests proving integration |

Do not copy mixed-license files unless the specific file license is known and compatible with this repository.

## Verification

This manifest is based on the current tracked source tree and the Development Plan requirement that COSS source copies must preserve source commit, license notice, and copied file scope.

Recommended check when updating this file:

```powershell
rg -n "COSS|coss" frontend apps docs\rebuild
git diff --check -- docs\rebuild
```

