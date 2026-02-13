# 发现与决策 (Findings & Decisions)

## 需求分析 (Requirements)
- 用户目标：ASM 系列模拟当前仅支持单组输入，新增多时段多组输入能力。
- 典型场景：
  - 前 12 小时使用一组输入，后 12 小时切换另一组输入。
  - 每隔 N 小时动态调整进水浓度、进水流量、回流流量等关键量。
- 工作方式要求：先讨论需求并形成文档，不立即进入编码开发。

## 研究发现 (Research Findings)
- 当前代码中流程图与模拟相关前端目录主要在 `frontend/src/components/Flow` 与 `frontend/src/stores`。
- 已定位与“加载/回填模拟任务数据”相关组件：
  - `frontend/src/components/Flow/menu/MaterialBalanceBubbleMenu.tsx`
  - `frontend/src/components/Flow/menu/LoadCalculationDataDialog.tsx`
- 后端存在 ASM1Slim 作业与状态相关结构迹象（如 `asm1slimjob`），后续需继续精读模型与 API。

## 技术决策 (Technical Decisions)
| 决策 | 理由 |
|----------|-----------|
| 采用“先现状后方案”顺序 | 先确保需求文档与真实实现一致，再提改造方案 |
| 文档化记录所有关键发现 | 该任务跨前端、后端、数据库，避免上下文丢失 |

## 遇到的问题 (Issues Encountered)
| 问题 | 解决方法 |
|-------|------------|
| 初次全局检索命中量过大 | 改为按模块和关键词分段检索，逐层收敛 |

## 资源链接 (Resources)
- `frontend/src/components/Flow/menu/MaterialBalanceBubbleMenu.tsx`
- `frontend/src/components/Flow/menu/LoadCalculationDataDialog.tsx`
- `frontend/src/stores/flowStore.ts`
- `backend/app/`
- `backend/app/alembic/versions/`
- `AGENTS.md`

## 视觉/浏览器发现 (Visual/Browser Findings)
- 本轮无图片/PDF 浏览结果。

---
*每进行 2 次查看/浏览器/搜索操作后更新此文件*

## 2026-02-12 Confirmed Decisions (User Aligned)
- Feature scope narrowed to edge-side variables only: `flow`, `param_a`, `param_b`.
- Segment switching policy: step change at boundaries.
- Full coverage rule is mandatory for all segments.
- Periodic templates are deferred (planned for later phase).
- Every edge can be overridden per segment; default is no override.
- Visualization must provide optional segment split lines and parameter-change notes.

## New Requirement Document
- `docs/asm_multi_period_edge_input_requirement_2026-02-12.md`

## 2026-02-12 Artifact Added
- New delivery doc: `docs/asm_multi_period_edge_input_api_and_tasks_2026-02-12.md`
- Document includes:
  - Frontend persisted fields and validation code list
  - Backend API request/response/storage field contract
  - Detailed implementation work packages and acceptance checkpoints

## 2026-02-12 Schedule Artifact
- New document: `docs/asm_multi_period_edge_input_dev_schedule_2026-02-12.md`
- Contains:
  - Baseline timeline with concrete dates
  - Milestone gates and acceptance checkpoints
  - Critical path and parallelization guidance
  - Risk/contingency and acceleration option
