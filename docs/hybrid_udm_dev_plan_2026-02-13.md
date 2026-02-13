# Hybrid（仅 UDM）开发计划文档

版本：v1.0  
日期：2026-02-13  
状态：待执行  
对应需求：`docs/hybrid_udm_requirement_2026-02-13.md`

## 1. 实施目标

将 Hybrid 一期落地为 UDM-only：
- Hybrid 页面只使用 UDM 模型库中的模型。
- 通过模型对全局映射解决变量重叠与不重叠问题。
- 后端按“传输项全变量 + 反应项焦集变量”执行计算。

## 2. 总体方案

- 前端：新增 Hybrid（UDM）入口页、模型选择器、模型对映射器、UDM-only 画布。
- 后端：在现有 UDM 计算链路前增加映射解析与校验层。
- 数据：在 `flow_data` 增加 `hybrid_config`，任务提交时保存快照。

## 3. 影响范围

### 前端（预计）
- `frontend/src/routes/_layout/` 新增 Hybrid UDM 路由页面。
- `frontend/src/components/Flow/` 新增或扩展：
- 模型选择组件
- 模型对映射组件
- Hybrid UDM 专用工具栏/面板
- `frontend/src/stores/` 新增 Hybrid UDM Flow Store（可基于 `createModelFlowStore` 扩展）。
- `frontend/src/services/udmService.ts` 扩展 Hybrid 相关请求。
- 如涉及 OpenAPI 变更，更新 `frontend/src/client` 生成代码。

### 后端（预计）
- `backend/app/models.py`：扩展输入模型字段（`hybrid_config` 相关）。
- `backend/app/services/data_conversion_service.py`：解析 Hybrid 配置与映射快照。
- `backend/app/material_balance/udm_engine.py`：增加映射应用逻辑（源->目标变量投影）。
- `backend/app/material_balance/core.py`：接入映射后的运行态数据。
- `backend/app/api/routes/udm.py`：增加校验接口或扩展现有提交接口校验能力。
- `backend/app/tests/`：新增单测与集成测试。

## 4. 分阶段计划

### 阶段 A：数据结构与接口（后端优先）
- A1 定义 `hybrid_config` JSON 结构（`selected_models`、`model_pair_mappings`）。
- A2 扩展请求模型并保证向后兼容（旧图无该字段时走旧逻辑）。
- A3 增加映射校验服务（可独立调用）。

交付：
- 模型与接口变更代码。
- OpenAPI 更新。

### 阶段 B：映射解析与计算链路
- B1 将模型对映射解析为运行时索引映射表。
- B2 在边传输前后应用变量投影策略。
- B3 保持 UDM 速率项仅对焦集变量生效。
- B4 与 `timeSegments` 联合回归。

交付：
- 后端计算链路支持混合 UDM 模型。
- 日志与错误码可定位映射问题。

### 阶段 C：前端 Hybrid UDM 页面
- C1 新增 Hybrid UDM 路由。
- C2 模型多选入口（来源：UDM 模型库）。
- C3 模型对映射配置页面（进入画布前强校验）。
- C4 UDM-only 画布与节点模型绑定。

交付：
- 可从模型选择 -> 映射 -> 画布 -> 提交仿真的完整流程。

### 阶段 D：结果展示与可用性完善
- D1 结果视图增加按模型/变量过滤。
- D2 映射错误回显与定位优化。
- D3 流程图保存/加载映射快照一致性验证。

交付：
- 完整可用的 Hybrid UDM 用户体验。

## 5. 测试计划

### 单元测试
- 映射结构合法性校验。
- 焦集变量覆盖校验。
- 变量投影索引构建与冲突检测。

### 集成测试
- 两模型链路：A->B 映射正确应用。
- 三模型链路：A->B->C 连续映射与传输稳定。
- 非重叠变量在目标模型作为惰性变量演化。
- `timeSegments` + Hybrid 映射并存场景。

### 回归测试
- UDM 单模型旧流程图提交与结果读取不受影响。
- 历史任务回放不受影响。

## 6. 数据与迁移策略

- 不强制数据库大改，优先使用现有 JSON 字段承载新结构。
- 旧流程图导入时若无 `hybrid_config`，默认视为非 Hybrid。
- 提交任务时写入模型快照与映射快照，确保历史可复现。

## 7. OpenAPI 与前端客户端更新步骤

当后端接口/Schema 变更后，按项目规范执行：

1. 导出或获取最新 OpenAPI JSON（`/api/v1/openapi.json`）。
2. 生成前端客户端：
`cd frontend; npm run generate-client`
3. 前端类型检查：
`cd frontend; npx tsc --noEmit`

## 8. 风险与缓解

- 风险：映射规则与模型版本漂移导致运行时错误。  
缓解：保存版本锁定与映射快照，提交前强校验。

- 风险：映射错误难定位。  
缓解：后端返回节点/模型/变量级错误信息，前端可跳转定位。

- 风险：性能开销上升。  
缓解：映射编译为索引表，避免每步字符串查找。

## 9. 任务拆解清单（建议）

- FE-01 Hybrid UDM 路由与页面框架
- FE-02 模型选择器与会话状态
- FE-03 模型对映射编辑器
- FE-04 映射校验提示与阻断
- FE-05 UDM-only 画布联动与提交流程
- FE-06 结果视图过滤增强
- BE-01 输入模型扩展与向后兼容
- BE-02 映射校验服务
- BE-03 映射解析与运行时投影
- BE-04 计算链路接入与日志增强
- QA-01 单元测试套件
- QA-02 集成与回归测试套件

## 10. Definition of Done

1. Hybrid UDM 流程完整可用（选择模型、映射、建图、仿真、看结果）。
2. 模型对映射全图复用，无边级重复配置。
3. 后端计算语义符合需求文档定义。
4. 分段时间输入与 Hybrid 并行工作。
5. OpenAPI 客户端已更新，前端类型检查通过。
6. 回归测试通过且旧 UDM 功能无回归。
