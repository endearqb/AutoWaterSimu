# AutoWaterSimu 开发进度整理（2026-03-03）

## 1. 范围与基线

- 统计范围：2026-01-28 至 2026-03-03
- 分支基线：`main`（已与 `origin/main` 同步）
- 工作区状态：干净（无未提交改动）

## 2. 阶段进展（时间线）

### 2026-01-28 ~ 2026-01-29：首页与演示壳层

- 新增 PostHog 风格首页 Demo（`/posthog-demo`）及桌面式窗口交互。
- 完成弹窗内嵌页面、示例流程图预览、Flow Components 展示与多端体验修整。
- 首页路由逐步切换至 `posthog-demo`，并完善 i18n 与 embed 场景兼容。

### 2026-02-11：UDM 建模主链路打通

- 新增 UDM 模型库页与模型编辑器页。
- 完成模板建模、复制、发布切换、删除、校验、参数范围维护。
- 完成“保存并生成默认画布”与 UDM 画布联动。
- UDM 分析链路与参数面板能力补齐，并通过前端类型检查。

### 2026-02-12：UDM 编辑体验升级 + ASM 多时段一期落地

- UDM `rateExpr` / `stoich` 支持弹窗编辑与变量参数快捷插入。
- UDM Components 新增 `freeze` 能力（`dC/dt=0`）。
- 前端上线“时段计划”编辑器，支持按边分段覆盖 `flow/param_a/param_b`。
- 图表支持时段分割线与参数变更注记开关。
- 后端补齐多时段输入与结果增强字段，新增对应测试。

### 2026-02-13：Hybrid UDM 一期

- 后端新增 Hybrid 映射校验与编译服务，支持模型对映射与焦集变量检查。
- 新增 `POST /api/v1/udm/validate-hybrid-flowchart`。
- `calculate-from-flowchart` 增加 Hybrid 严格校验失败错误码。
- 前端新增 Hybrid Setup 对话框、节点模型绑定与提交流程前置校验。
- Hybrid 新增文案完成 i18n，OpenAPI 客户端同步更新。

### 2026-02-14：Hybrid 配置管理完善

- 新增独立 Hybrid 配置页（`/hybrid`），支持配置创建、编辑、删除、应用。
- 后端新增 Hybrid 配置 CRUD（`/api/v1/udm-hybrid-configs`）及数据库表。
- 抽取 Hybrid 配置应用公共工具，清理旧绑定字段，避免脏数据。
- 修复新路由类型识别问题（`routeTree.gen.ts` 同步）。

### 2026-02-20 ~ 2026-03-02：文档与协作补充

- 教程文档持续补充（`tutorial in progress`）。
- 新增 `CLAUDE.md` 协作说明文档。

## 3. 当前模块状态（截至 2026-03-03）

- Posthog-demo 首页与桌面演示：已完成并在主干。
- UDM 模型库/编辑器/画布联动：已完成并可用。
- ASM 多时段边参数一期：核心功能已完成，处于统一回归与发布收口阶段。
- Hybrid UDM 一期：核心能力已完成并含配置管理页。
- 文档体系：持续补充中（教程/协作说明仍在迭代）。

## 4. 重要接口与类型变更

- 新增接口：`POST /api/v1/udm/validate-hybrid-flowchart`
- 新增接口：`/api/v1/udm-hybrid-configs`（配置 CRUD）
- 提交校验增强：`calculate-from-flowchart` 增加 Hybrid 严格校验失败返回（`HYBRID_UDM_VALIDATION_FAILED`）
- 模型字段扩展：
  - `hybrid_config`
  - 多时段输入与结果增强字段（如 `segment_count`、`parameter_change_event_count`）
- 前端客户端生成文件已多次同步：
  - `frontend/src/client/sdk.gen.ts`
  - `frontend/src/client/types.gen.ts`

## 5. 已知待收口项与风险

- UDM Phrase9 执行报告中记录的部分 UX 收尾项仍标记为后续处理（如单元格级内联错误标记、矩阵 hover 高亮、快捷键策略统一、Phrase10 端到端回归清单）。
- ASM 多时段一期已完成功能交付，但仍建议按发布门禁执行一次集中回归（兼容无时段历史任务、两段/多段边界场景、图表标注一致性）。
- 当前提交节奏显示最近以文档为主，需与产品节奏确认是否进入“冻结 + 回归”窗口。

## 6. 建议下一步（执行向）

1. 统一执行一轮前后端回归并记录结果（含 Hybrid + 多时段 + 旧 UDM 兼容）。
2. 对 UDM Phrase9 遗留 UX 项做取舍（纳入近期迭代或转入后续版本）。
3. 若近期有发布计划，补齐 RC 验收清单并同步版本发布说明。
