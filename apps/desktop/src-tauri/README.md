# 目录说明：apps/desktop/src-tauri

## 1. 目录职责

本目录负责 Desktop Rust/Tauri runtime foundation。

本目录负责：

- Rust command runtime wrapper。
- SQLite migration runner 与本地 job store。
- source-mode Python worker JSON-RPC smoke。
- artifact export sandbox 与 support bundle smoke。
- Tauri v2 config placeholder。
- Phase 3B 编译与单测基线。

本目录不负责：

- 完整 Tauri runtime wiring。
- React Desktop UI。
- Python worker packaged sidecar。
- Windows installer。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `Cargo.toml` | Rust crate 配置 |
| `src/commands.rs` | command wrapper |
| `src/migrations.rs` | SQLite migrations 与 migration runner |
| `src/store.rs` | SQLite job/event/artifact/support bundle store |
| `src/runtime.rs` | Desktop runtime orchestration |
| `src/worker.rs` | source-mode Python worker process bridge |
| `src/path_sandbox.rs` | local export path validation |
| `tauri.conf.json` | Tauri v2 config placeholder |
| `capabilities/default.json` | Tauri capability placeholder |

## 3. 维护约定

1. Command body 必须经由 Rust runtime，不让 React 直接启动 worker。
2. Rust owns SQLite writes and worker lifecycle。
3. React 不直接执行 shell 或写 SQLite。
4. Phase 3B worker 是 source-mode dev sidecar；packaged `externalBin` 留到后续。
5. Job 状态机只允许 `queued -> running -> succeeded|failed|timed_out`；terminal job 不允许重复运行。

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
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`apps/desktop/README.md` 和本 README。
2. 不要在 3B runtime foundation 阶段引入 installer、auto update 或 signing。
3. sidecar spawn 变更需要同步验证 stdout JSON-RPC、stderr tail 和本地路径 sandbox。
