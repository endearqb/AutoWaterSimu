# ASM 多时段边参数输入：接口字段级清单与任务拆分（一）

版本：v1.0  
日期：2026-02-12  
对应需求：`docs/asm_multi_period_edge_input_requirement_2026-02-12.md`

## 1. 目标与范围确认
- 本文仅覆盖一期需求：
  - 可变对象仅限边：`flow` 与边上各参数的 `a/b`
  - 时段边界为阶跃变化
  - 时段必须覆盖全程
  - 所有边都可变，默认不覆盖
  - 结果图支持“时段分割线/参数变更注记”可开关显示
- 本文是“接口与任务拆分”文档，不含代码实现。

## 2. 前端字段级清单

### 2.1 流程图持久化字段（`flow_data`）
适用：`exportFlowData()` / `importFlowData()`，以及保存流程图到后端。

| 字段 | 层级 | 类型 | 必填 | 默认值 | 校验规则 | 说明 |
|---|---|---|---|---|---|---|
| `timeSegments` | `flow_data` 顶层 | `TimeSegment[]` | 否 | `[]` | 若存在则必须通过连续覆盖校验 | 多时段计划定义 |
| `id` | `timeSegments[i]` | `string` | 是 | 自动生成 | 同一次计划内唯一 | 时段标识 |
| `startHour` | `timeSegments[i]` | `number` | 是 | - | `>=0` | 时段起始小时 |
| `endHour` | `timeSegments[i]` | `number` | 是 | - | `>startHour` | 时段结束小时 |
| `edgeOverrides` | `timeSegments[i]` | `Record<edgeId, EdgeOverride>` | 是 | `{}` | `edgeId` 必须存在于 `edges[].id` | 当前时段的边覆盖集合 |
| `flow` | `edgeOverrides[edgeId]` | `number` | 否 | 继承基线 | `>=0` | 边流量覆盖 |
| `factors` | `edgeOverrides[edgeId]` | `Record<paramName, FactorAB>` | 否 | 继承基线 | `paramName` 必须在 `customParameters[].name` 中 | 边参数系数覆盖 |
| `a` | `factors[paramName]` | `number` | 否 | 继承基线 | 数值 | 线性系数 a |
| `b` | `factors[paramName]` | `number` | 否 | 继承基线 | 数值 | 线性系数 b |

建议前端类型（用于 store / UI）：

```ts
type FactorAB = {
  a?: number
  b?: number
}

type EdgeOverride = {
  flow?: number
  factors?: Record<string, FactorAB> // key: custom parameter name
}

type TimeSegment = {
  id: string
  startHour: number
  endHour: number
  edgeOverrides: Record<string, EdgeOverride> // key: edge id
}
```

### 2.2 前端校验错误码（建议）
| 错误码 | 触发条件 | 提示建议 |
|---|---|---|
| `SEGMENT_EMPTY` | 配置时段模式但无时段 | 请至少添加 1 个时段 |
| `SEGMENT_START_NOT_ZERO` | 首段 `startHour != 0` | 第一段必须从 0 小时开始 |
| `SEGMENT_END_NOT_EQUAL_HOURS` | 末段 `endHour != hours` | 时段必须覆盖到总仿真时长 |
| `SEGMENT_GAP` | 相邻时段存在空洞 | 时段之间存在未覆盖区间 |
| `SEGMENT_OVERLAP` | 相邻时段重叠 | 时段之间存在重叠 |
| `SEGMENT_EDGE_NOT_FOUND` | 覆盖了不存在的边 | 目标边已不存在，请重新选择 |
| `SEGMENT_PARAM_NOT_FOUND` | 覆盖了不存在的参数 | 参数名不在当前模型参数集合 |
| `SEGMENT_INVALID_VALUE` | `flow/a/b` 非数值或越界 | 输入值非法，请检查 |

### 2.3 结果图显示开关（前端 UI 状态）
建议作为分析面板本地状态（可选持久化到 localStorage）：

```ts
type SegmentDisplayOptions = {
  showSegmentLines: boolean
  showParamChangeAnnotations: boolean
}
```

## 3. 后端接口字段级清单

### 3.1 计算提交接口（保持路径不变）
适用路径：
- `POST /api/v1/asm1/calculate-from-flowchart`
- `POST /api/v1/asm1slim/calculate-from-flowchart`
- `POST /api/v1/asm3/calculate-from-flowchart`

请求体（在现有 flowchart payload 基础上新增 `timeSegments`）：

| 字段 | 类型 | 必填 | 校验规则 | 备注 |
|---|---|---|---|---|
| `name` | `string` | 否 | - | 任务命名用途 |
| `nodes` | `array` | 是 | 不为空 | 现有字段 |
| `edges` | `array` | 是 | 不为空 | 现有字段 |
| `customParameters` | `array` | 是 | 可为空但需与模型一致 | 现有字段 |
| `calculationParameters.hours` | `number` | 是 | `>0` | 现有字段 |
| `calculationParameters.steps_per_hour` | `number` | 是 | `>0` | 现有字段 |
| `timeSegments` | `array` | 否 | 若存在必须完整通过时段校验 | 新增字段 |

响应体：
- 维持现有 `ASM*JobPublic` 结构，不破坏前端轮询逻辑。

### 3.2 作业输入回读接口（保持路径不变）
适用路径：
- `GET /api/v1/asm1/jobs/{job_id}/input-data`
- `GET /api/v1/asm1slim/jobs/{job_id}/input-data`
- `GET /api/v1/asm3/jobs/{job_id}/input-data`

约定：
- `input_data` 原样保留并返回 `timeSegments`，用于历史任务回显。

### 3.3 结果接口增强（兼容新增字段）
适用路径：
- `GET /api/v1/asm*/result/{job_id}`
- `GET /api/v1/asm*/result/{job_id}/timeseries`
- `GET /api/v1/asm*/result/{job_id}/final-values`

建议新增字段：

| 字段 | 建议位置 | 类型 | 必填 | 说明 |
|---|---|---|---|---|
| `segment_markers` | `result_data` 顶层 | `number[]` | 否 | 时段边界时间点（小时） |
| `parameter_change_events` | `result_data` 顶层 | `SegmentChangeEvent[]` | 否 | 各边界参数变化摘要 |
| `segment_count` | `summary_data` | `number` | 否 | 时段数量 |
| `parameter_change_event_count` | `summary_data` | `number` | 否 | 变更事件数量 |

建议事件结构：

```ts
type SegmentChangeEvent = {
  atHour: number
  edgeId: string
  changed: Array<"flow" | string> // string 可为 paramName_a / paramName_b
}
```

### 3.4 后端错误返回（建议）
- 时段校验失败统一返回 `422`，`detail` 使用结构化数组：

```json
{
  "detail": [
    { "code": "SEGMENT_GAP", "message": "Segments contain gap", "segment_id": "seg_2" }
  ]
}
```

## 4. 数据库存储与兼容策略
- 一期不改表结构，沿用 JSON 字段：
  - `input_data`：新增保存 `timeSegments`
  - `result_data`：新增保存 `segment_markers`、`parameter_change_events`
  - `summary_data`：新增保存 `segment_count`、事件统计
- 历史数据无上述字段时，前端按单段逻辑处理（兼容）。

## 5. 开发任务拆分（可执行版）

## 5.1 前端任务
| 编号 | 任务 | 主要文件 | 产出 | 依赖 |
|---|---|---|---|---|
| FE-01 | 增加时段类型与校验工具 | `frontend/src/stores/createModelFlowStore.ts`（接入）、新增 `frontend/src/utils/timeSegmentValidation.ts` | `TimeSegment` 校验与错误码 | 无 |
| FE-02 | Store 扩展时段状态与 CRUD | `frontend/src/stores/createModelFlowStore.ts` | `timeSegments` 状态、增删改排、序列化 | FE-01 |
| FE-03 | 流程图导入导出透传时段字段 | `frontend/src/stores/createModelFlowStore.ts` | `exportFlowData/importFlowData` 支持 `timeSegments` | FE-02 |
| FE-04 | 仿真面板新增“时段计划”编辑 UI | `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`、`frontend/src/components/Flow/inspectorbar/useSimulationController.ts` | 可编辑时段与边覆盖 | FE-02 |
| FE-05 | 提交前时段校验与错误提示 | `frontend/src/components/Flow/inspectorbar/useSimulationController.ts` | 阻止非法提交 | FE-01, FE-04 |
| FE-06 | 结果图开关与可视化标记 | `frontend/src/components/Flow/legacy-analysis/TimeSeriesChart.tsx`、`frontend/src/components/Flow/legacy-analysis/EdgeTimeSeriesChart.tsx`、`frontend/src/components/Flow/legacy-analysis/panels/SpatialProfilePanel.tsx`、`frontend/src/components/Flow/legacy-analysis/panels/EdgeConcentrationPanel.tsx` | 分割线/注记可开关显示 | BE-04 |
| FE-07 | i18n 文案补齐 | `frontend/src/i18n/messages/zh.ts`、`frontend/src/i18n/messages/en.ts` | 新功能文案 | FE-04 |

## 5.2 后端任务
| 编号 | 任务 | 主要文件 | 产出 | 依赖 |
|---|---|---|---|---|
| BE-01 | 定义时段输入模型与校验器 | `backend/app/models.py`、新增 `backend/app/services/time_segment_validation.py` | 时段结构与规则校验 | 无 |
| BE-02 | 路由接入时段校验（ASM1/ASM1Slim/ASM3） | `backend/app/api/routes/asm1.py`、`backend/app/api/routes/asm1slim.py`、`backend/app/api/routes/asm3.py` | 422 结构化错误返回 | BE-01 |
| BE-03 | 转换层支持时段覆盖映射 | `backend/app/services/data_conversion_service.py` | 将段覆盖映射到 `flow/Q_out/a/b` | BE-01 |
| BE-04 | 计算内核实现分段串联求解 | `backend/app/material_balance/core.py` | 分段求解、边界续算、结果合并 | BE-03 |
| BE-05 | 结果与摘要字段增强 | `backend/app/material_balance/core.py`、`backend/app/services/asm1_service.py`、`backend/app/services/asm1slim_service.py`、`backend/app/services/asm3_service.py` | `segment_markers` / 事件摘要落库 | BE-04 |
| BE-06 | 日志清理与结构化 | `backend/app/services/asm1_service.py`、`backend/app/services/asm1slim_service.py`、`backend/app/services/asm3_service.py` | `print` 收敛为 `logging` | BE-05 |

## 5.3 联调与验证任务
| 编号 | 任务 | 主要文件/动作 | 验收点 |
|---|---|---|---|
| QA-01 | 单组回归（无时段） | API + 前端手工回归 | 与现网结果一致 |
| QA-02 | 两段流量阶跃 | API 自动化用例 | 边界后 `flow_rate` 变化生效 |
| QA-03 | 两段 a/b 阶跃 | API 自动化用例 | 边界后浓度映射变化生效 |
| QA-04 | 非法时段校验 | API 自动化用例 | 重叠/空洞/未覆盖全程正确报错 |
| QA-05 | 图表可视化开关 | 前端手工用例 | 分割线/注记可显示与隐藏 |
| QA-06 | 历史任务加载兼容 | `GET /jobs/{job_id}/input-data` + UI | 老任务可正常回显 |

## 5.4 客户端生成与质量门禁
| 编号 | 任务 | 命令 | 说明 |
|---|---|---|---|
| DX-01 | 生成前端 OpenAPI Client | `./scripts/generate-client.sh`（或手动流程） | 后端 schema 改动后必须执行 |
| DX-02 | 前端类型检查 | `cd frontend; npx tsc --noEmit` | 必过 |
| DX-03 | 后端测试（建议） | `cd backend; .venv\\Scripts\\activate; pytest` | 重点覆盖分段求解 |

## 6. 推荐实施顺序
1. BE-01 ~ BE-04（先跑通后端分段计算语义）  
2. FE-01 ~ FE-05（完成配置与提交流程）  
3. BE-05 + FE-06（结果图分割线与注记）  
4. QA-01 ~ QA-06 + DX-01 ~ DX-03（回归与发布前校验）

## 7. 本文档落地结论
- 一期无需数据库迁移，可通过 JSON 扩展完成。
- 关键技术风险在 `core.py` 的分段串联求解与结果拼接，建议优先完成 BE-04 并先做单元测试。
- 只要 `timeSegments` 缺省时路径保持原逻辑，即可实现平滑上线。
