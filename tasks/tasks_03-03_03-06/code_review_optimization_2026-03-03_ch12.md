# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 12. 附录：审查涉及的核心文件清单

---

## 12. 附录：审查涉及的核心文件清单

### 前端

| 文件路径 | 功能 |
|----------|------|
| `frontend/src/stores/flowStore.ts` | Material Balance 流程图状态管理（含 BUG-1） |
| `frontend/src/stores/createModelFlowStore.ts` | 模型流程图 store 工厂（含 P0-1） |
| `frontend/src/components/Flow/FlowLayout.tsx` | 流程图布局组件（BubbleMenu 渲染逻辑） |
| `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx` | BubbleMenu 基础组件（含 BUG-2） |
| `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx` | Demo 页面（含 P0-2） |
| `frontend/src/routes/_layout/udmModels.tsx` | UDM 模型库页面 |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | UDM 模型编辑器路由 |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | UDM 模型编辑表单（核心） |
| `frontend/src/components/UDM/UDMModelEditorDialog.tsx` | 流程图内嵌模型编辑弹窗 |
| `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | 表达式单元格编辑器 |
| `frontend/src/components/UDM/HybridUDMSetupDialog.tsx` | Hybrid 配置对话框 |
| `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx` | 全局时段计划编辑器 |
| `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx` | 边级时段编辑器 |
| `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx` | UDM 属性面板 |
| `frontend/src/components/Flow/inspectorbar/UDMCalculationPanel.tsx` | UDM 计算参数面板 |
| `frontend/src/components/Flow/nodes/UDMNode.tsx` | UDM 节点组件 |
| `frontend/src/stores/udmFlowStore.ts` | UDM 流程图状态管理 |
| `frontend/src/services/udmService.ts` | UDM API 服务封装 |
| `frontend/src/utils/timeSegmentValidation.ts` | 时段校验工具 |
| `frontend/src/utils/hybridUdm.ts` | Hybrid 工具函数（含 F-3.3） |
| `frontend/src/types/hybridUdm.ts` | Hybrid 类型定义 |

### 后端

| 文件路径 | 功能 |
|----------|------|
| `backend/app/api/routes/udm.py` | UDM 计算与任务 API（含 P1-1） |
| `backend/app/api/routes/udm_models.py` | UDM 模型 CRUD API |
| `backend/app/api/routes/udm_flowcharts.py` | UDM 流程图 API（含 P1-2） |
| `backend/app/api/routes/udm_hybrid_configs.py` | Hybrid 配置 API（含 P1-2） |
| `backend/app/api/routes/flowcharts.py` | 通用流程图 API（含 P1-2） |
| `backend/app/services/udm_expression.py` | 表达式校验与求值引擎 |
| `backend/app/services/udm_seed_templates.py` | 模板种子数据 |
| `backend/app/services/hybrid_udm_validation.py` | Hybrid 校验服务 |
| `backend/app/services/time_segment_validation.py` | 时段校验服务 |
| `backend/app/material_balance/models.py` | 仿真 Pydantic 模型（含 P2-1） |
| `backend/app/material_balance/udm_ode.py` | UDM ODE 求解器 |
| `backend/app/material_balance/udm_engine.py` | UDM 计算引擎 |

