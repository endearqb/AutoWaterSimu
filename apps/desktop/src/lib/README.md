# 目录说明：apps/desktop/src/lib

## 1. 目录职责

本目录保存 Desktop React shell 的轻量 helper。

本目录负责：

- Typed Tauri command wrappers。
- Browser-only fallback behavior for dev preview。
- Tauri dialog helpers for project package open/save path selection。
- Project registry/file-backed package export/import wrappers。
- CanvasGraph save/load and ProcessGraph validation wrappers。

本目录不负责：

- SQLite writes。
- Worker process spawn。
- Large UI layout。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `desktopCommands.ts` | Tauri `invoke` wrapper and browser fallback |
| `projectDialogs.ts` | `@tauri-apps/plugin-dialog` open/save helpers for `.autowatersimu-project.json` files |

## 3. 维护约定

1. Wrapper type changes must match Rust command payload/response shape。
2. Browser-only fallback should remain read-only and explicit。
3. Do not introduce Node filesystem/shell APIs here。
4. Job snapshot types include artifacts and model_runs; keep them aligned with Rust `store.rs` response JSON。
5. Export wrapper changes must match Rust command names exactly, including separate JSON artifact and CSV export commands。
6. Job lifecycle wrappers mirror Rust's conservative source-mode semantics; only queued jobs can be cancelled.
7. Backup/restore wrappers pass Rust-owned object keys only; React must not assemble filesystem paths.
8. Graph wrappers pass JSON strings to Rust and display returned records/errors; React must not write SQLite or local graph files.
9. Project wrappers mirror Rust `project_create` / `project_get` / `project_list` / `project_export` / `project_import` / external project package / recent project import commands; import/export object keys remain Rust-owned and sandbox-relative when using sandbox mode, and package count/imported-count types must match Rust response JSON, including artifact/support bundle file counts.
10. `createComputeJob()` and `saveCanvasGraph()` accept optional `projectId`; wrappers only forward it and do not validate project existence in React.
11. Dialog helpers may return user-selected absolute paths, but Rust commands must still validate suffix and perform all file reads/writes.

## 4. 对外接口

本目录向 Desktop React components 暴露 command functions。

## 5. 依赖边界

可以依赖 `@tauri-apps/api`。
可以依赖 `@tauri-apps/plugin-dialog` for path selection only。

不应该依赖 backend client、Chakra UI or Node runtime。

## 6. 测试与验证

```powershell
cd apps\desktop; npm run typecheck
```

## 7. AI 操作提示

Rust command signature 改动后同步更新此 wrapper and Desktop README。
