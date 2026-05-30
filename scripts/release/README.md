# 目录说明：scripts/release

## 1. 目录职责

本目录负责 AutoWaterSimu Next release governance 自动化。

本目录负责：

- merge gate 编排。
- release gate 编排。
- 生成本地/CI evidence JSON。

本目录不负责：

- 构建 Python worker packaged sidecar。
- 构建或签名 Windows installer。
- 替代各子目录自己的测试命令。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `next-release-gates.ps1` | 编排 Next merge/release gate，并写出 `tmp/release-evidence/next-release-gates.json` |

## 3. 维护约定

1. `Mode=merge` 只运行当前仓库可直接验证的 merge gates。
2. `Mode=release` 必须显式验证 packaged sidecar 和 NSIS installer artifact；没有 artifact 时应失败，除非调用方显式传入 `-AllowMissingPackageArtifacts`。
3. 使用 `-AllowMissingPackageArtifacts` 时，总 evidence status 必须是 `dry_run_skipped_artifacts`，不能被解释为 release 通过。
4. 脚本只记录 evidence，不把 release 成功写成源码事实。

## 4. 对外接口

本目录对本地 PowerShell 和 `.github/workflows/next-release-gates.yml` 暴露 release gate 入口。

## 5. 依赖边界

可以调用：

- `backend/.venv` Python。
- `go test`。
- `npm` / `npx`。
- `cargo test`。
- `apps/desktop/scripts/*` smoke。

不应该依赖未提交的本地 artifact，除非调用方通过参数显式传入路径。

## 6. 测试与验证

```powershell
.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong
```

完整 release gate 需要 Windows packaged sidecar 和 NSIS installer artifact：

```powershell
.\scripts\release\next-release-gates.ps1 -Mode release -SidecarPath <path-to-sidecar.exe> -InstallerPath <path-to-installer.exe>
```

## 7. AI 操作提示

不要用 `-AllowMissingPackageArtifacts` 声称 release gate 已通过；它只用于 CI dry run 或计划性 evidence。
