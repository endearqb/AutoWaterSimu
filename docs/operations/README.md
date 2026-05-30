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
| `compute_api_job_event_retention_runbook.md` | Compute API job event retention / archive policy and future dry-run-first pruning boundary |
| `compute_api_backup_restore_runbook.md` | Compute API PostgreSQL metadata 与 artifact 目录备份/恢复手册 |
| `compute_api_token_secret_runbook.md` | Compute API 静态 bearer token、scope、rotation、revocation 与 secret handling 操作手册 |
| `compute_api_tenancy_observability_runbook.md` | Compute API tenant/project metadata boundary、trace/logging expectations 与 OpenTelemetry adoption trigger |
| `support_bundle_runbook.md` | Desktop support bundle、project package support files 与 Compute API evidence package 操作边界 |
| `monitoring/` | Compute API Prometheus alert rules、Alertmanager route 示例、Grafana dashboard 示例、receiver policy 与 monitoring deployment runbook |

## 3. 维护约定

1. Runbook 必须基于当前代码事实和已验证命令。
2. 尚未实现的生产对象存储 archive backend、UI 或生产监控部署只能写为待实施项；scheduler 和 `local_fs_archive` 已实现但默认关闭，alert rules / route / dashboard 文件仅表示可复制的监控样例。
3. 涉及 destructive 操作时必须先写 dry-run 和回滚限制。
4. Compute API retention deletion 前必须明确 PostgreSQL metadata 与 artifact object files 的一致性备份/恢复边界。
5. Token/secret runbook 只能使用占位符，不得记录真实 bearer token、签名 key、数据库密码或更新通道密钥。
6. tenant/project 字段在 P0 是 metadata boundary，不得写成完整 RBAC 或计费隔离已实现。
7. job event retention 当前只记录策略边界；未实现自动裁剪前不得写成已有后台 worker 或 endpoint。

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
