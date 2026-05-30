# 目录说明：apps/desktop/src-tauri/src

## 1. 目录职责

本目录保存 Desktop Tauri Rust runtime source。

本目录负责：

- Tauri command registration and wrappers。
- SQLite migrations/store for projects, jobs, artifacts, model runs, support bundles and canvas graphs。
- Source-mode Python worker JSON-RPC bridge。
- Packaged worker exe launch mode selected by explicit env/constructor path。
- Tauri resource discovery for packaged worker exe in release builds。
- Runtime orchestration、project package export/import、canvas/process graph commands、path sandbox、artifact JSON/CSV export、support bundle and backup/restore logic。

本目录不负责：

- React Desktop UI。
- Packaged sidecar distribution and installer packaging。
- Go Compute API server。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `main.rs`、`lib.rs` | Tauri entrypoint and invoke handler registration |
| `commands.rs` | command wrappers exposed to React |
| `runtime.rs` | project registry/package export/import, project-aware compute job runtime orchestration, process graph validation, artifact export and backup/restore |
| `worker.rs` | Python worker process bridge |
| `store.rs` | SQLite project-aware canvas graph/job/event/artifact/model_run/support bundle store and project package snapshots |
| `migrations.rs` | SQLite migration runner |
| `path_sandbox.rs` | artifact export path constraints |

## 3. 维护约定

1. React side effects go through commands; Rust owns SQLite and worker lifecycle.
2. Job state transitions stay `queued -> running -> succeeded|failed|cancelled|timed_out`; queued jobs may also move directly to `cancelled`.
3. Terminal jobs cannot be rerun silently.
4. Sandbox rules must prevent arbitrary file writes outside allowed runtime/export paths.
5. `model_run.v1` records from successful worker results are local audit data and should stay queryable through job snapshots/support bundles.
6. CSV export is derived from `material_balance_time_series_artifact.v1` only; unsupported artifact types must fail clearly.
7. Source-mode cancellation only applies before a job starts running.
8. Backup restore may replace SQLite/artifact/support bundle files only after manifest checksum verification.
9. CanvasGraph save/load owns only persisted canvas JSON; ProcessGraph validation is read-only and must not enqueue jobs.
10. Project create/list/get owns local project metadata. Project package export stays inside runtime-local `exports/` and includes project-scoped job snapshots, CanvasGraphs, artifact refs and support bundle refs without artifact/support bundle file contents. Import may restore project metadata and CanvasGraphs; job/artifact/support bundle refs remain metadata-only.
11. `project_id` attachment for jobs and CanvasGraphs is optional, but when present it must reference an existing project row.
12. Packaged worker mode is explicit: tests use `AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE`, runtime uses `AUTOWATERSIMU_DESKTOP_WORKER_EXE`, release startup may set that env var from Tauri resource discovery, and default development behavior remains source-mode worker.
13. Release resource discovery expects `simulation-worker/simulation-worker-x86_64-pc-windows-msvc.exe` under Tauri resources so the PyInstaller exe remains adjacent to its `_internal` directory.

## 4. 对外接口

本目录通过 Tauri commands 对 `apps/desktop/src` 暴露 local runtime capabilities。

## 5. 依赖边界

可以依赖 local SQLite、Tauri、source-mode worker path and contracts wire shape。

不应该依赖 legacy FastAPI routes or Go API internals。

## 6. 测试与验证

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
```

Optional packaged worker smoke:

```powershell
$env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE="<path-to-sidecar.exe>"
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml packaged_worker_exe_smoke_when_env_is_available -- --nocapture
```

## 7. AI 操作提示

修改 worker stdout parsing、timeout or path sandbox 时补 Rust tests；不要只检查 happy path。
