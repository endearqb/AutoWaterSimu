# 目录说明：apps/desktop/scripts

## 1. 目录职责

本目录保存 Desktop 专用 smoke 脚本。

本目录负责：

- packaged Python worker sidecar smoke。
- Windows NSIS installer smoke。
- 输出 release evidence JSON。

本目录不负责：

- 构建 sidecar。
- 构建 installer。
- 仓库级 merge gate 编排。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `smoke-packaged-sidecar.ps1` | 运行 packaged worker `--self-check` 和 minimal job |
| `smoke-nsis-installer.ps1` | 运行 NSIS silent install、installed app exe、installed sidecar smoke 和 best-effort uninstall，并记录 evidence |

## 3. 维护约定

1. smoke 脚本必须显式接收 artifact 路径，不能猜测未验证的本地构建产物。
2. 缺少 artifact 默认失败；`-AllowMissing` 只用于 dry run，不表示 release 通过。
3. evidence 写入 `tmp/release-evidence/`，不要提交生成结果。
4. Installer smoke 必须验证安装目录中存在 resource-bundled packaged sidecar，并复用 sidecar smoke 覆盖 `--self-check` 和 minimal job。

## 4. 对外接口

供 `scripts/release/next-release-gates.ps1`、本地 PowerShell 和 GitHub Actions 调用。

## 5. 依赖边界

可以读取 `contracts/examples/valid/` 的 minimal job fixture。

不应该启动 Go API 或 legacy FastAPI。

## 6. 测试与验证

```powershell
.\apps\desktop\scripts\smoke-packaged-sidecar.ps1 -SidecarPath <path-to-sidecar.exe>
.\apps\desktop\scripts\smoke-nsis-installer.ps1 -InstallerPath <path-to-installer.exe>
```

## 7. AI 操作提示

修改 installer smoke 时避免默认删除用户提供的安装目录；默认使用 `tmp/` 或系统临时目录下的唯一目录。
