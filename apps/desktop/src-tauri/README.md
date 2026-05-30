# 目录说明：apps/desktop/src-tauri

## 1. 目录职责

本目录负责 Desktop Rust/Tauri runtime foundation。

本目录负责：

- Rust command runtime wrapper。
- Tauri command registration 与 app entrypoint。
- SQLite migration runner 与本地 project/job/artifact/model_run store。
- Tauri dialog plugin registration for project package open/save。
- Project-aware job and canvas graph persistence。
- source-mode Python worker JSON-RPC smoke。
- explicit packaged worker exe mode for local/release smoke。
- release-only Tauri config for resource-bundled PyInstaller one-folder sidecar。
- CanvasGraph save/load and ProcessGraph validation command surface。
- artifact JSON/CSV export sandbox、model_run audit、support bundle 与 backup/restore smoke。
- Tauri v2 config。
- Phase 3C 编译与单测基线。

本目录不负责：

- React Desktop UI。
- Python worker packaged sidecar。
- Windows installer。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `Cargo.toml` | Rust crate 配置 |
| `build.rs` | Tauri build script |
| `src/main.rs` | Tauri binary entrypoint |
| `src/lib.rs` | Tauri command registration and tests |
| `src/commands.rs` | Tauri command wrapper |
| `src/migrations.rs` | SQLite migrations 与 migration runner |
| `src/store.rs` | SQLite project/job/event/artifact/model_run/support bundle/canvas graph/recent files store |
| `src/runtime.rs` | Desktop runtime orchestration, including project package export/import, artifact JSON/CSV export and backup/restore |
| `src/path_sandbox.rs` | local export path validation |
| `src/worker.rs` | source-mode Python worker process bridge |
| `icons/icon.ico` | Windows resource icon for Tauri build |
| `tauri.conf.json` | Tauri v2 config |
| `tauri.release.conf.json` | Release overlay config that enables NSIS bundling and stages the packaged worker as a resource |
| `capabilities/default.json` | Tauri capability file with minimal dialog open/save permissions |

## 3. 维护约定

1. Command body 必须经由 Rust runtime，不让 React 直接启动 worker。
2. Rust owns SQLite writes and worker lifecycle。
3. React 不直接执行 shell 或写 SQLite。
4. Phase 3C 默认 worker 是 source-mode dev sidecar；设置 `AUTOWATERSIMU_DESKTOP_WORKER_EXE` 后 Desktop runtime 可显式改用 packaged worker exe。Release build 通过 `tauri.release.conf.json` 把 PyInstaller one-folder sidecar 作为 Tauri resource 打入 NSIS installer。
5. Job 状态机只允许 `queued -> running -> succeeded|failed|cancelled|timed_out`；terminal job 不允许重复运行。
6. Tauri commands must be registered in one `invoke_handler` call。
7. 成功 compute result 中的 `runtime_audit.model_runs` 需要持久化到 SQLite，并随 job snapshot/support bundle 返回。
8. CSV export 仅从受支持的 material balance time-series artifact 派生，仍必须写入 runtime-local export sandbox。
9. Source-mode worker 当前只支持取消 queued job；running job 不伪装为可中断。
10. Backup/restore P0 使用 runtime-local `backups/`；restore 必须先校验 manifest 中的 SQLite/artifact checksums。
11. CanvasGraph persistence validates graph IDs and edge/node references before SQLite upsert; ProcessGraph validation returns structured errors without mutating job state。
12. Project registry commands use the local `projects` table; project package import/export may use runtime-local `exports/` or user-selected external `.autowatersimu-project.json` files. External paths must be absolute, suffix-validated in Rust, and recorded in `recent_files` only after successful import/export。
13. `compute_job_create` and `canvas_graph_save` may receive an optional `project_id`; runtime/store must reject unknown project ids instead of silently writing dangling references。
14. Packaged sidecar 和 NSIS installer release smoke 由 Desktop scripts 执行；Rust packaged mode 只能通过显式 exe path 或 Tauri resource 中存在的 packaged exe 选择，不应在 development 中静默替换 source-mode。
15. PyInstaller one-folder sidecar 不应只通过 `externalBin` 复制单个 exe；必须保持 exe 与 `_internal` 目录相邻。

## 4. 对外接口

本目录未来对 Desktop React shell 暴露 Tauri commands。

修改这些接口时需同步检查 Desktop README、worker CLI 行为和 migration tests。

## 5. 依赖边界

可以依赖：

- local SQLite。
- `services/simulation-worker/` sidecar。
- `contracts/` wire shape。

不应该依赖：

- Go Compute API。
- legacy FastAPI route。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
cd apps\desktop; npm run tauri -- build
```

Release NSIS build with a generated sidecar:

```powershell
cd apps\desktop
npm run release:build:installer -- -SidecarPath <path-to-sidecar.exe>
```

Release artifact smoke 入口：

```powershell
.\apps\desktop\scripts\smoke-packaged-sidecar.ps1 -SidecarPath <path-to-sidecar.exe>
.\apps\desktop\scripts\smoke-nsis-installer.ps1 -InstallerPath <path-to-installer.exe>
```

真实 packaged worker runtime smoke：

```powershell
$env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE="<path-to-sidecar.exe>"
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml packaged_worker_exe_smoke_when_env_is_available -- --nocapture
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`apps/desktop/README.md` 和本 README。
2. 不要在未准备真实 packaged artifact 时引入 installer、auto update 或 signing。
3. sidecar spawn 变更需要同步验证 stdout JSON-RPC、stderr tail 和本地路径 sandbox。
