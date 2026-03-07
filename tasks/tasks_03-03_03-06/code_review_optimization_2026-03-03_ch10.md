# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 10. 测试与回归策略

---

## 10. 测试与回归策略

### 10.1 后端

- **现有测试（继续使用并扩展）**:
  - `backend/tests/test_hybrid_udm_validation.py`
  - `backend/tests/test_time_segment_validation.py`
  - `backend/tests/test_material_balance_segment_overrides.py`
  - `backend/tests/test_udm_engine_variable_binding.py`
- **新增测试**:
  - 权限码回归测试（断言 403）
  - `/udm/jobs` 大数据量场景性能回归（聚合计数）
  - 表达式深度限制回归

### 10.2 前端

- **必跑**: `cd frontend; npx tsc --noEmit`
- **建议补充**:
  - Material Balance 页面 BubbleMenu 渲染验证
  - ConfirmDialog → 保存 → pendingAction 执行链路验证
  - `FlowComponentsDocs` 进出页面状态恢复测试
  - 导入流程图后 `calculationParameters` 应用策略测试


