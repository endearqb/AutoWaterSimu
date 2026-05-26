# 目录说明：apps/desktop/src-tauri

## 1. 目录职责

本目录负责 Desktop Rust/Tauri scaffold。

本目录负责：

- Rust command placeholder。
- SQLite migration 草案。
- Tauri v2 config placeholder。
- Phase 3A 编译与单测基线。

本目录不负责：

- 完整 Tauri runtime wiring。
- React Desktop UI。
- Python worker sidecar packaging。
- Windows installer。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `Cargo.toml` | Rust crate 配置 |
| `src/commands.rs` | command placeholder |
| `src/migrations.rs` | SQLite migration 草案 |
| `tauri.conf.json` | Tauri v2 config placeholder |
| `capabilities/default.json` | Tauri capability placeholder |

## 3. 维护约定

1. Phase 3A command body 只返回 deterministic stub，不启动 worker。
2. Rust owns future SQLite writes and worker lifecycle。
3. React 不直接执行 shell 或写 SQLite。

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
2. 不要在 scaffold 阶段引入 installer、auto update 或 signing。
3. 后续 sidecar spawn 需要同步验证 stdout JSON-RPC 和本地路径 sandbox。
