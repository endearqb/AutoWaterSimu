# 目录说明：docs/operations

## 1. 目录职责

本目录负责：

- AutoWaterSimu Next 运行手册。
- 运维检查清单、SLO/告警草案和人工处置流程。
- 对当前已实现 API / metrics / release gate 的长期操作说明。

本目录不负责：

- 单次任务过程记录。
- 业务代码实现。
- 未实现功能的承诺性说明。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `compute_api_lifecycle_runbook.md` | Compute API lifecycle、metrics 和 artifact retention 手动操作手册 |

## 3. 维护约定

1. Runbook 必须基于当前代码事实和已验证命令。
2. 尚未实现的 scheduler、archive backend、UI 或 alerting 只能写为待实施项。
3. 涉及 destructive 操作时必须先写 dry-run 和回滚限制。

## 4. 对外接口

本目录对开发者、Agent 和运维人员暴露长期操作上下文。

## 5. 依赖边界

可以引用：

- `apps/api/`
- `scripts/release/`
- `.github/workflows/`

不应该依赖：

- 临时 `tmp/` evidence。
- 未提交的本地 artifact。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
git diff --check -- docs
```

## 7. AI 操作提示

1. 先读取 `docs/README.md` 和本 README。
2. 不要把未实现能力写成当前事实。
3. 运维命令示例默认使用 PowerShell。
