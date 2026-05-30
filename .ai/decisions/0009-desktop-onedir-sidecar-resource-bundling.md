# 0009 - Desktop Onedir Sidecar Resource Bundling

## Status

Accepted.

## Context

AutoWaterSimu Next Desktop now builds the Python simulation worker with PyInstaller `--onedir`. The generated executable depends on sibling files under the same output directory, especially the `_internal` directory. Tauri v2 `externalBin` is designed around target-triple-specific executable files, but using it alone would copy only the executable and break the PyInstaller onedir layout.

## Decision

- Keep the worker executable named `simulation-worker-x86_64-pc-windows-msvc.exe` for target-triple compatibility.
- Package the current PyInstaller onedir worker into the NSIS installer through Tauri `bundle.resources`.
- Stage the full sidecar directory under `apps/desktop/src-tauri/target/release-sidecar/simulation-worker` before release builds.
- In packaged Desktop startup, discover `simulation-worker/simulation-worker-x86_64-pc-windows-msvc.exe` under Tauri resources and set `AUTOWATERSIMU_DESKTOP_WORKER_EXE` when the file exists.
- Keep source-mode worker execution as the development default.

## Consequences

- The installed worker executable remains adjacent to its PyInstaller `_internal` directory and can pass self-check/minimal-job smoke after installation.
- NSIS installer smoke must verify both the installed Desktop executable and the installed packaged sidecar.
- A future move to PyInstaller one-file or another single-binary sidecar can revisit `externalBin`, but should not silently replace the current onedir resource contract.
