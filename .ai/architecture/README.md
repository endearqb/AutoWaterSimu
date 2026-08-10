# 目录说明：.ai/architecture

> 更新于:2026-07-11 · commit be0a736

## 职责

本目录记录 AutoWaterSimu 当前稳定的跨目录架构和 README First 文档边界。

本目录不记录单次变更流水账、历史决策全文或业务实现细节。

## 核心文件

| 文件 | 作用 |
|---|---|
| `README.md` | 当前架构层入口与维护边界 |

## 维护约定

1. Next 主线的业务架构事实以 `docs/architecture/README.md` 及其引用为准；本目录只补充 README First 和跨目录文档系统的稳定事实。
2. 修改 `AGENTS.md`、`VERSION`、README First 协议、`.ai/` 职责或跨目录长期边界时更新本文件；历史取舍同时写入 `.ai/decisions/`。
3. 单次原因、验证证据和未解决事项写入 `.ai/changes/`，不要复制到这里。

## 测试与验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\readme-contract-check.ps1 -FailOnWarnings
git diff --check -- .ai AGENTS.md README.md README_zh.md README_First.md
```
