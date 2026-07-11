# 0029 - README First v2.1 分级执行协议

## 状态

已接受，2026-07-11。

## 背景

仓库此前采用统一的 README First 执行和记录流程。项目已有大量目录契约和文档门禁，低风险任务继续承担完整流程会增加维护成本。

## 决策

采用上游 ReadmeFirst v2.1 的 L0/L1/L2 分级协议，并保留更严格的 AutoWaterSimu 专属规则和 `readme-contract-check.ps1` 门禁：

- L0 只读取最近目录 README，不写 changes；
- L1 读取目标路径上下文并写短记录；
- L2 读取 `.ai/architecture/` 与必要历史，写完整记录和新鲜验证证据；
- `.ai/architecture/` 保存当前稳定的文档系统与跨目录边界；`changes/`、`decisions/` 分别保存单次原因和长期取舍；
- glossary、handoff、plans/done 为触发式扩展，不为日常任务增加固定负担。

## 后果

日常任务可按风险缩减阅读和记录，但公共接口、跨模块、配置、删除和架构变更仍必须按 L2 执行。现有历史 changes 不重写；系统性巡检与压缩留给后续维护任务。
