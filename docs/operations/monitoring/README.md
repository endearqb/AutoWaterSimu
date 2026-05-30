# 目录说明：docs/operations/monitoring

## 1. 目录职责

本目录负责：

- Compute API 监控规则样例。
- 基于当前 `/metrics` 指标的 Prometheus alert rules。
- Alertmanager routing 与 Grafana dashboard provisioning 示例。
- Monitoring deployment 核对 runbook。

本目录不负责：

- 部署 Prometheus / Alertmanager。
- 部署或托管 Grafana。
- 管理生产通知渠道。
- 存放真实 webhook URL、receiver secret 或 on-call 策略。
- 存放临时 scrape 数据或 dashboard 截图。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `compute_api_alerts.yml` | Compute API Prometheus alert rules |
| `alertmanager_route_example.yml` | Alertmanager route/receiver 示例，仅包含占位 webhook |
| `compute_api_grafana_dashboard.json` | Grafana dashboard provisioning JSON，仅引用当前已暴露 metrics |
| `monitoring_deployment_runbook.md` | 将 alert/dashboard 示例接入真实监控系统的操作核对手册 |
| `receiver_policy_runbook.md` | 真实 receiver/on-call/secret 接入策略，不存放真实 URL 或 token |

## 3. 维护约定

1. Alert expressions 只能引用当前代码实际暴露的 metrics。
2. 阈值先保持保守，部署时可按环境覆盖。
3. 不把 rule、route 或 dashboard 文件存在视为生产监控已部署。
4. Alertmanager 示例只能使用占位 receiver，不得提交真实 URL 或 secret。
5. 真实 receiver、on-call owner 和 secret 只在部署环境配置；本目录只能记录策略与验证清单。

## 4. 对外接口

本目录对运维人员和 CI/release 审查暴露可复制到 Prometheus、Alertmanager 和 Grafana 的监控样例。

## 5. 依赖边界

可以引用：

- `apps/api/internal/compute` 暴露的 `/metrics` 指标。
- `docs/operations/compute_api_lifecycle_runbook.md`。

不应该依赖：

- 尚未暴露的 archive provider latency/error 等细分指标。
- 私有 dashboard 或外部告警平台。
- 生产 receiver secret。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
git diff --check -- docs/operations/monitoring
```

同时建议解析 YAML 和 JSON：

```powershell
backend\.venv\Scripts\python -c "import json, yaml; yaml.safe_load(open('docs/operations/monitoring/compute_api_alerts.yml', encoding='utf-8')); yaml.safe_load(open('docs/operations/monitoring/alertmanager_route_example.yml', encoding='utf-8')); json.load(open('docs/operations/monitoring/compute_api_grafana_dashboard.json', encoding='utf-8'))"
```

如果本地安装了 Prometheus，可额外运行：

```powershell
promtool check rules docs/operations/monitoring/compute_api_alerts.yml
```

## 7. AI 操作提示

1. 新增 alert 前先确认 `/metrics` 已实际暴露对应指标。
2. 不要为未实现组件编写假指标规则。
3. 不要把示例 receiver 或 dashboard 写成生产部署事实。
4. 更新 receiver 策略时确认没有真实 webhook、token、个人联系方式或私有频道名。
