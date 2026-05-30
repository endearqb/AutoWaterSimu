# 目录说明：docs/operations/monitoring

## 1. 目录职责

本目录负责：

- Compute API 监控规则样例。
- 基于当前 `/metrics` 指标的 Prometheus alert rules。

本目录不负责：

- 部署 Prometheus / Alertmanager。
- 管理生产通知渠道。
- 存放临时 scrape 数据或 dashboard 截图。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `compute_api_alerts.yml` | Compute API Prometheus alert rules |

## 3. 维护约定

1. Alert expressions 只能引用当前代码实际暴露的 metrics。
2. 阈值先保持保守，部署时可按环境覆盖。
3. 不把 rule 文件存在视为生产告警已部署。

## 4. 对外接口

本目录对运维人员和 CI/release 审查暴露可复制到 Prometheus 的 rule group。

## 5. 依赖边界

可以引用：

- `apps/api/internal/compute` 暴露的 `/metrics` 指标。
- `docs/operations/compute_api_lifecycle_runbook.md`。

不应该依赖：

- 尚未暴露的 archive-specific 指标。
- 私有 dashboard 或外部告警平台。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
git diff --check -- docs/operations/monitoring
```

如果本地安装了 Prometheus，可额外运行：

```powershell
promtool check rules docs/operations/monitoring/compute_api_alerts.yml
```

## 7. AI 操作提示

1. 新增 alert 前先确认 `/metrics` 已实际暴露对应指标。
2. 不要为未实现组件编写假指标规则。
