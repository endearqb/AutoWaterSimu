# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 9. 统一开发计划

---

## 9. 统一开发计划

> 合并自 `docs/20260303_progress_optimization_execution_plan.md` 并扩展

### 9.1 排期总览

| 批次 | 周期 | 任务ID | 优先级 | 目标 |
|------|------|--------|--------|------|
| A | Week 1（第 1-2 天） | A0 | P0 | 修复 BubbleMenu 不渲染（BUG-1） |
| A | Week 1（第 1-3 天） | A1 | P0 | 修复导入参数恢复一致性（P0-1） |
| A | Week 1（第 1-3 天） | A2 | P0 | 修复 Demo 页状态污染风险（P0-2） |
| A | Week 1（第 2-3 天） | A3 | P0 | 修复 focal variable 前后端不一致（F-3.3） |
| B | Week 1-2 | B0 | P1 | 修复 ConfirmDialog pending action（BUG-2） |
| B | Week 1-2 | B1 | P1 | 优化 UDM 任务统计查询性能（P1-1） |
| B | Week 1-2 | B2 | P1 | 统一权限错误码语义 400→403（P1-2） |
| B | Week 1-2 | B3 | P1 | 前端体验修复合集（U-1.1, U-1.2, U-1.4, U-2.3） |
| B | Week 1-2 | B4 | P1 | 后端一致性修复合集（C-1, B-1） |
| C | Week 2 | C1 | P2 | Pydantic v2 配置迁移（P2-1） |
| D | Week 2-3 | D1 | P1/P2 | 时段计划功能与 UI 收口（F-2.1, U-2.1, U-2.2） |
| D | Week 2-3 | D2 | P1/P2 | Hybrid UDM 体验收口（F-3.1, U-3.1, C-3） |
| D | Week 2-3 | D3 | P1/P2 | UDM 编辑体验收口（F-1.1, F-1.2, U-1.3, U-1.6） |
| D | Week 2-3 | D4 | P1/P2 | 全局交互一致性收口（C-4, B-4） |

### 9.2 任务详述

#### A0：修复 BubbleMenu 不渲染

- **类型**: Bug 修复
- **影响文件**: `frontend/src/stores/flowStore.ts`
- **方案**: 将 `showBubbleMenu: false` 改为 `showBubbleMenu: true`
- **验收标准**:
  - Material Balance 页面 BubbleMenu 正常渲染
  - ASM1/UDM 页面无回归

#### A1：导入恢复 `calculationParameters`

- **类型**: 功能正确性
- **影响文件**:
  - `frontend/src/stores/createModelFlowStore.ts`
  - `frontend/src/components/Flow/*`（如需导入策略 UI）
- **方案**:
  - `importFlowData` 接收并应用导入数据中的 `calculationParameters`
  - 增加策略参数：`useImportedCalculationParameters = true`（默认）；可选保留当前参数模式
- **验收标准**:
  - 导入前后 `hours/steps_per_hour` 与文件一致（默认策略）
  - E2E 场景中，导入同一 JSON 能复现相同计算结果

#### A2：FlowComponentsDocs 完整快照回滚

- **类型**: 状态隔离
- **影响文件**: `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx`
- **方案**:
  - 快照补齐关键字段：`timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`
  - 或重构为 demo 独立 store，彻底隔离业务状态
- **验收标准**:
  - 进入/退出 demo 页面后，业务流程图状态与进入前一致
  - 不出现"残留时段/Hybrid 配置"问题

#### A3：focal variable 提取前后端对齐

- **类型**: 数据正确性
- **影响文件**: `frontend/src/utils/hybridUdm.ts`
- **方案**: 前端变量提取正则结果中过滤掉 `ALLOWED_FUNCTIONS` 和 `RESERVED_CONSTANTS`
- **验收标准**: 包含 `exp(X)` 的表达式中 `exp` 不被识别为 focal variable

#### B0：修复 ConfirmDialog pending action 丢失

- **类型**: Bug 修复
- **影响文件**: `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`
- **方案**: 在 save dialog 关闭回调中链接 pendingAction 执行
- **验收标准**:
  - 新建流程图 → 确认保存 → 保存完成后自动执行新建
  - "跳过" 和 "导出" 路径不受影响

#### B1：UDM 任务总数查询性能优化

- **类型**: 后端性能
- **影响文件**: `backend/app/api/routes/udm.py`
- **方案**: 将 `len(session.exec(select(...)).all())` 替换为数据库 `count(*)` 查询
- **验收标准**: 任务总数统计 SQL 为聚合查询，大数据量下响应时间明显下降

#### B2：权限不足语义统一为 `403`

- **类型**: 接口一致性
- **影响文件**:
  - `backend/app/api/routes/udm_hybrid_configs.py`
  - `backend/app/api/routes/flowcharts.py`
  - `backend/app/api/routes/udm_flowcharts.py`
- **方案**: 权限不足统一返回 `HTTPException(status_code=403, detail="Not enough permissions")`
- **验收标准**: 相关接口权限不足均返回 403，前端不出现权限错误误报为"参数错误"的提示

#### B3：前端体验修复合集

- **范围**: U-1.1（AlertDialog 替换）、U-1.2（NativeSelect）、U-1.4（唯一 key）、U-2.3（工具函数提取）
- **验收标准**: 各子项独立验证通过

#### B4：后端一致性修复合集

- **范围**: C-1（错误消息统一）、B-1（递归深度限制）
- **验收标准**: 后端错误消息统一为英文 error code，表达式深度超限返回明确错误

#### C1：Pydantic v2 配置迁移

- **类型**: 技术债清理
- **影响文件**: `backend/app/material_balance/models.py`
- **方案**: `class Config` + `schema_extra` 迁移到 `model_config` + `json_schema_extra`
- **验收标准**: 测试不再出现相关迁移警告，OpenAPI 示例输出语义一致

#### D1：时段计划功能与 UI 收口

- **功能**: 提供"自动均分时段"快捷入口、时段模板保存/加载
- **UI/UX**: 继承值图形化标记，窄屏自适应布局

#### D2：Hybrid UDM 体验收口

- **功能**: 映射完整率与缺失项前置校验，Pair mapping 优化
- **UI/UX**: 映射区支持筛选与分组，节点显示绑定模型名称

#### D3：UDM 编辑体验收口

- **功能**: 模型列表分页、函数快捷插入面板
- **UI/UX**: 长表单分段导航、搜索框 debounce

#### D4：全局交互一致性收口

- **功能**: 危险操作统一确认流程
- **UI/UX**: 统一 loading / disabled / toast 反馈规范，错误消息风格统一


