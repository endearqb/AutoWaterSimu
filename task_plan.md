# 任务计划 (Task Plan): ASM 多时段输入需求梳理与文档落地

## 目标 (Goal)
基于现有前端流程图交互、后端计算链路与数据库结构，完成“ASM 模拟支持多时段多组输入”的可落地需求文档（先讨论、后开发）。

## 当前阶段 (Current Phase)
阶段 1

## 阶段划分 (Phases)

### 阶段 1：现状探索（前端/后端/数据结构）
- [ ] 梳理前端流程图与模拟提交入口
- [ ] 梳理后端 ASM 计算入口与请求模型
- [ ] 梳理数据库表与结果存储结构
- [ ] 将发现记录在 `findings.md`
- **状态:** in_progress

### 阶段 2：需求抽象与边界定义
- [ ] 明确“多时段输入”的业务语义（时间段、步长、覆盖字段）
- [ ] 明确与现有单组输入的兼容策略
- [ ] 定义核心约束与校验规则
- **状态:** pending

### 阶段 3：方案设计（不编码）
- [ ] 设计前端交互草案（时段编辑、校验、预览）
- [ ] 设计后端 API/Schema 草案
- [ ] 设计数据库结构演进方案
- [ ] 设计计算引擎执行语义（分段、过渡、结果聚合）
- **状态:** pending

### 阶段 4：需求文档落地
- [ ] 输出需求文档初稿（范围、术语、流程、数据模型、非功能）
- [ ] 输出迭代建议（MVP/增强阶段）
- [ ] 标注风险与待确认事项
- **状态:** pending

### 阶段 5：与你评审并定稿
- [ ] 逐条确认关键决策
- [ ] 根据反馈修订文档
- [ ] 形成可进入开发的版本
- **状态:** pending

## 关键问题 (Key Questions)
1. 多时段配置是否只作用于 Input 节点，还是也覆盖回流边/运行参数？
2. 时段定义采用“绝对时间戳”还是“相对小时偏移”？
3. 段与段交界处使用“阶跃变化”还是“线性过渡”？
4. 输出结果是否需要按时段聚合展示（除逐步时序外）？
5. 历史任务与历史流程图如何无缝兼容旧格式？

## 决策记录 (Decisions Made)
| 决策 | 理由 |
|----------|-----------|
| 先做需求与结构评审，不直接编码 | 用户明确要求先讨论并落地需求文档 |
| 先从现有前后端与数据库真实结构反推方案 | 避免脱离当前实现做抽象设计，减少后续返工 |

## 遇到的错误 (Errors Encountered)
| 错误 | 尝试次数 | 解决方法 |
|-------|---------|------------|
|       | 1       |            |

## 备注 (Notes)
- 每完成一个阶段更新状态：pending → in_progress → complete
- 关键发现同步沉淀到 `findings.md`
- 过程日志同步写入 `progress.md`

## 2026-02-12 Update (Multi-Segment Requirement Confirmed)

### Phase Status Update
- Phase 1: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete
- Phase 5: in_progress

### Confirmed Scope
1. Variable range only includes edge `flow`, `param_a`, `param_b`.
2. Segment boundary uses step change.
3. Segments must fully cover the whole simulation duration.
4. Periodic template is out of phase 1 scope.
5. All edges are configurable; default behavior is inherit baseline (no override).
6. Result chart must support toggleable segment lines and parameter-change annotations.

### Requirement Artifact
- `docs/asm_multi_period_edge_input_requirement_2026-02-12.md`

## 2026-02-12 Update (API Field Checklist + Task Breakdown)
- Output artifact: `docs/asm_multi_period_edge_input_api_and_tasks_2026-02-12.md`
- Added frontend field-level checklist (`timeSegments`, edge overrides, display toggles, validation codes).
- Added backend endpoint-level checklist (request/response/storage/error contract).
- Added executable work breakdown (FE/BE/QA/DX) with file-level landing points.
- Phase 5 can proceed to implementation planning confirmation.

## 2026-02-12 Update (Development Schedule Version)
- Added schedule artifact: `docs/asm_multi_period_edge_input_dev_schedule_2026-02-12.md`
- Included dated milestones (M0~M4), week-by-week plan (W0~W4), dependency path, risk buffer, and optional accelerated plan.
- Phase 5 status suggestion: ready for implementation kickoff.
