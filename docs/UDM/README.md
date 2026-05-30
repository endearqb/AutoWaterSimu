# 目录说明：docs/UDM

## 1. 目录职责

本目录保存 UDM 需求、计划和执行报告。

本目录负责：

- UDM feature requirement discussion。
- UI/UX execution plans and implementation reports。
- Petersen/stoich/rate expression tutorial planning context。

本目录不负责：

- UDM runtime code。
- Current task checklist。
- Architecture decisions that should live in `.ai/decisions`。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `requirement_discuss.md` | UDM requirement discussion |
| `phrase1-10_plan.md` | UDM phase plan |
| `implementation_report_2026-02-11.md` | implementation report |
| `phrase*_plan.md`、`phrase*_report_*.md` | phase-specific planning/report records |

## 3. 维护约定

1. 本目录可记录 UDM 长期背景，但当前执行计划应写入 `tasks/`。
2. 若文档中的约定已被代码取代，最终报告需指出差异。
3. 不把未确认的业务规则写成当前事实。

## 4. 对外接口

本目录对 UDM editor/runtime/tutorial tasks 提供 historical context。

## 5. 依赖边界

文档可引用 backend/frontend paths but should not duplicate source code。

## 6. 测试与验证

```powershell
git diff --check -- docs\UDM
```

## 7. AI 操作提示

UDM 代码变更前先读更近的 source README；本目录是背景，不覆盖当前代码和测试。
