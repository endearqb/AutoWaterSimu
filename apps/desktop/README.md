# 目录说明：apps/desktop

## 1. 目录职责

本目录负责 AutoWaterSimu Windows Desktop。

本目录负责：

- Tauri v2 / Rust local orchestration。
- React Desktop shell。
- SQLite local job store。
- Python worker sidecar management。
- local artifact and support bundle。

本目录不负责：

- Go Compute API。
- Web 多人协作能力。
- Python 科学计算算法重写。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `src-tauri/` | Phase 3A Rust/Tauri scaffold、SQLite migration 草案和 command placeholders |

后续新增 React Desktop shell、真实 worker sidecar spawn、SQLite runtime wiring 和 installer packaging。

## 3. 维护约定

1. React 不直接启动 worker 或执行 shell。
2. Rust owns SQLite writes and worker lifecycle。
3. sidecar 通过 JSON-RPC stdin/stdout 通信。
4. P0 不做 auto update、code signing、Microsoft Store。

## 4. 对外接口

对最终用户暴露 Windows 本地建模、仿真、导出和离线演示能力。

## 5. 依赖边界

可以依赖：

- `contracts/`
- `services/simulation-worker/`
- local SQLite。

不应该依赖：

- Go API sidecar。
- legacy FastAPI route。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
```

Phase 3B 之后再补 Tauri dev smoke、SQLite runtime tests、sidecar spawn smoke、NSIS installer smoke。

## 7. AI 操作提示

处理本目录时优先检查 Tauri capability、路径 sandbox 和 support bundle 脱敏。
