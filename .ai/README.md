# 目录说明：.ai

> 更新于:2026-07-11 · commit be0a736

## 1. 目录职责

本目录保存 README First 协作记录。

本目录负责：

- AI 变更记录。
- 长期架构决策。
- 当前稳定架构与跨目录边界。
- 按需启用的术语表和会话交接。
- 可选计划和 review 记录。

本目录不负责：

- 源码实现。
- 构建产物。
- 临时缓存。

## 2. 核心文件

| 子目录 | 作用 |
|---|---|
| `changes/` | 单次变更记录 |
| `decisions/` | 长期架构决策 |
| `architecture/` | 当前稳定架构与 README First 文档边界 |
| `plans/` | 可选复杂任务计划 |
| `reviews/` | 可选 review 记录 |
| `glossary.md` | 按需共享术语表 |
| `handoff.md` | 未完成任务的跨会话交接 |
| `readme-contracts.json` | README 分类、预算和 P0 漂移检查配置 |

## 3. 维护约定

1. 按 `AGENTS.md` 与 `README_First.md` 的 L0/L1/L2 分级决定是否写入 `.ai/changes/`：L0 不记录，L1 短记录，L2 完整记录；避免把流水账写进 README。
2. 改变架构、目录职责、公共接口或长期维护规则时写入 `.ai/decisions/`。
3. 记录原因、范围、验证和剩余不确定性，不重复粘贴完整 diff。
4. `.ai/architecture/` 只记录当前稳定事实；历史原因写入 `decisions/`，单次变更写入 `changes/`。
5. README 类型和自动检查规则维护在 `readme-contracts.json`，脚本实现放在 `scripts/readme-contract-check.ps1`。

## 4. 对外接口

本目录对后续 Agent 和开发者暴露修改背景。

## 5. 依赖边界

只保存 Markdown 记录，不保存私密 token 或客户数据。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
git diff --check -- .ai
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\readme-contract-check.ps1 -FailOnWarnings
```

## 7. AI 操作提示

优先引用具体文件路径和验证命令，避免写泛泛结论。
