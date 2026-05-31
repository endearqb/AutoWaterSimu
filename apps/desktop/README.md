# 目录说明：apps/desktop

## 1. 目录职责

本目录负责 AutoWaterSimu Windows Desktop。

本目录负责：

- Tauri v2 / Rust local orchestration。
- React Desktop shell。
- local project registry, file-backed project package export/import smoke, and selected-project wiring for jobs/canvas graphs。
- external project package open/save dialogs with recent file tracking。
- SQLite local job store and queued-job cancellation。
- Python worker sidecar management, including explicit packaged-worker exe mode。
- local artifact JSON/CSV export、model run audit、support bundle and runtime backup/restore smoke。
- local CanvasGraph save/load and ProcessGraph validation smoke。
- Desktop packaging contract, NSIS installer build entrypoint, and release smoke scripts。

本目录不负责：

- Go Compute API。
- Web 多人协作能力。
- Python 科学计算算法重写。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `package.json` | 独立 Desktop React/Vite app 脚本与依赖 |
| `packaging/` | Desktop packaged sidecar build script、NSIS installer build script and release 契约 |
| `scripts/` | packaged sidecar and NSIS installer smoke scripts |
| `src/` | Phase 3C Desktop React dev MVP shell |
| `src-tauri/` | Rust/Tauri runtime、SQLite store、project registry/file-backed project package/recent files/project_id wiring、source-mode worker JSON-RPC、canvas/process graph commands、artifact JSON/CSV/model_run/support bundle/backup smoke |

本目录已提供 PyInstaller one-folder sidecar build、explicit packaged-worker runtime mode、Tauri resource-bundled NSIS installer build、packaging 契约和 artifact smoke 入口。后续仍需评估是否切换到单文件 sidecar + `externalBin`；signing/auto-update/GitHub Release publication 按 `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md` 作为 post-P0 policy-driven work。

## 3. 维护约定

1. React 不直接启动 worker 或执行 shell。
2. Rust owns SQLite writes and worker lifecycle。
3. Phase 3C 使用 source-mode Python worker，通过 JSON-RPC stdin/stdout 通信。
4. P0 不做 auto update、code signing、Microsoft Store 或自动 GitHub Release publication；当前 P0 release artifact 是 unsigned sidecar/NSIS installer 加 smoke evidence。
5. Project package external open/save uses Tauri dialog; Rust still validates absolute `.autowatersimu-project.json` paths and records successful paths in SQLite `recent_files` as `project_package`。
6. Desktop Vite dev server 使用 `127.0.0.1:1420`，避免和 legacy `frontend` 的 `5173` 冲突。
7. Backup/restore P0 先限制在 runtime-local `backups/` sandbox，恢复前必须校验 manifest checksum。
8. CanvasGraph save/load 先使用 SQLite `canvas_graphs` 表；ProcessGraph command 先做只读结构 validation，不隐式创建 compute job。
9. Project export writes the contract-backed `desktop_project_package.v1` either inside runtime-local `exports/` or to a user-selected external project package file, with project metadata, project-scoped job snapshots, job events, CanvasGraphs, artifact refs/files and support bundle refs/files. Import restores project metadata, CanvasGraphs, and checksum-verified file-backed jobs/artifacts/model runs/support bundles; legacy `desktop_project_export.v1` and older metadata-only packages remain importable but keep missing job/artifact/support bundle rows metadata-only.
10. 创建 compute job 或保存 CanvasGraph 时，React 可传入当前选中 `project_id`；Rust 必须验证项目存在后再写入 `compute_jobs.project_id` 或 `canvas_graphs.project_id`。
11. Packaged sidecar / installer smoke 必须通过显式 artifact 路径运行；缺少 artifact 不能声明 release 通过。
12. Desktop runtime 默认使用 source-mode Python worker；`AUTOWATERSIMU_DESKTOP_WORKER_EXE` 只在显式设置时启用 packaged worker exe。
13. PyInstaller one-folder sidecar 打入 installer 时使用 Tauri `bundle.resources` 保持 exe 与 `_internal` 目录相邻；不要只复制单个 exe。

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
cd apps\desktop; npm run typecheck
cd apps\desktop; npm run build
cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml
npm run release:build:installer -- -SidecarPath <path-to-sidecar.exe>
```

Phase 3C 已补 Desktop React build、Tauri release build smoke、SQLite runtime tests、source-mode worker spawn smoke、support bundle smoke 和 path sandbox tests。Packaged sidecar smoke、NSIS installer smoke 脚本已存在，完整 release 通过需要真实 sidecar 和 installer artifact。

## 7. AI 操作提示

处理本目录时优先检查 Tauri capability、路径 sandbox、project package checksum/file-backed restore boundary 和 support bundle 脱敏。
