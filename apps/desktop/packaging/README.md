# 目录说明：apps/desktop/packaging

## 1. 目录职责

本目录记录 Desktop packaging 契约。

本目录负责：

- Windows packaged sidecar artifact 命名约定。
- Tauri release resource staging and NSIS installer build entrypoint。
- NSIS installer smoke 验收入口。
- P0 unsigned release evidence 要求。

本目录不负责：

- 存放构建产物。
- 存放 signing key、证书或安装包。
- 定义 Python worker 的运行时业务逻辑。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | Desktop packaging 契约 |
| `build-packaged-sidecar.ps1` | 在 Windows 上使用 PyInstaller one-folder 构建 packaged worker sidecar，并可直接运行 smoke |
| `build-nsis-installer.ps1` | 将 PyInstaller one-folder sidecar 暂存到 Tauri release resources，构建 NSIS installer，并可直接运行 installer smoke |
| `pyinstaller_entrypoint.py` | PyInstaller package-mode entrypoint，避免直接脚本执行破坏相对导入 |

## 3. 维护约定

1. P0 Desktop packaged sidecar 目标文件名为 `simulation-worker-x86_64-pc-windows-msvc.exe`；该命名保留 Tauri v2 `externalBin` target triple 兼容性，但当前 one-folder release path 使用 resources 保持依赖目录相邻。
2. Packaged sidecar 必须通过 `apps/desktop/scripts/smoke-packaged-sidecar.ps1`，覆盖 `--self-check` 和 minimal material balance job。
3. NSIS installer 必须通过 `apps/desktop/scripts/smoke-nsis-installer.ps1`，覆盖 silent install、installed executable presence 和 best-effort silent uninstall。
4. P0 明确不包含 code signing、auto update、Microsoft Store 分发或自动 GitHub Release publication；该边界见 `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`。
5. release evidence 写入 `tmp/release-evidence/`，不得提交安装包、sidecar 二进制或 evidence 产物。
6. 当前 PyInstaller 输出为 one-folder sidecar；Tauri release 打包使用 `bundle.resources` 暂存整个目录，而不是只用 `externalBin` 复制单个 exe。
7. GitHub `workflow_dispatch` 可调用本目录脚本在 runner 上构建 unsigned artifacts，并通过 workflow artifact 上传；本目录仍不存放 signing material、updater keys 或发布密钥。

## 4. 对外接口

Packaging 对 release gate 暴露 artifact 路径：

- `AUTOWATERSIMU_PACKAGED_SIDECAR` 或 `-SidecarPath`
- `AUTOWATERSIMU_NSIS_INSTALLER` 或 `-InstallerPath`

## 5. 依赖边界

可以依赖：

- `services/simulation-worker/` 生成的 packaged worker。
- Tauri/NSIS 生成的 installer artifact。
- `contracts/examples/valid/material_balance_minimal.compute_job.v1.json` smoke fixture。

不应该依赖：

- legacy FastAPI。
- Go Compute API sidecar。
- 用户机器上的全局 Python。

## 6. 测试与验证

```powershell
.\apps\desktop\packaging\build-packaged-sidecar.ps1
.\apps\desktop\packaging\build-nsis-installer.ps1 -SidecarPath <path-to-simulation-worker-x86_64-pc-windows-msvc.exe>
.\apps\desktop\scripts\smoke-packaged-sidecar.ps1 -SidecarPath <path-to-simulation-worker-x86_64-pc-windows-msvc.exe>
.\apps\desktop\scripts\smoke-nsis-installer.ps1 -InstallerPath <path-to-nsis-setup.exe>
.\scripts\release\next-release-gates.ps1 -Mode release -SidecarPath <path-to-sidecar.exe> -InstallerPath <path-to-installer.exe>
```

## 7. AI 操作提示

不要把 `-AllowMissing` 的 skipped evidence 写成 release 通过；缺少 artifact 仍是 release blocker。
