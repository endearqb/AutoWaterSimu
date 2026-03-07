# Ch02 开发完成情况核查报告（双基线）

- 核查对象：`tasks/code_review_optimization_2026-03-03_ch02.md`
- 核查日期：2026-03-05
- 核查口径：系统链路口径（不仅检查章节列举文件，还检查实际调用入口）
- 基线定义：
  - `当前工作区`：包含未提交改动
  - `HEAD 提交态`：仅看已提交内容（通过 `git show HEAD:<path>` 静态取证）

---

## 1. 核查对象与口径

本次核查覆盖 Ch02 的 5 项问题：

1. `P0-1` 流程图导入 `calculationParameters` 恢复策略
2. `P0-2` Flow 组件文档页快照/回滚完整性
3. `P1-1` UDM 任务列表总数统计性能
4. `P1-2` 权限不足错误码语义统一（400 -> 403）
5. `P2-1` Pydantic v2 迁移技术债

判定标准：

- `已完成`：核心修复到位，且系统链路无同级遗漏
- `部分完成`：核心修复已落地，但存在链路遗漏/一致性缺口/可交付阻断
- `未完成`：核心修复未落地或无有效证据

---

## 2. 基线定义与现场快照

### 2.1 当前工作区（含未提交改动）

`git status --short` 显示脏文件：

- `docs/code_review_ch02_implementation_2026-03-04.md`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/stores/flowStore.ts`

### 2.2 HEAD 提交态（不含未提交）

通过 `git show HEAD:<path>` 抽取证据，不切分支、不重置工作区。

---

## 3. 结论总览（双基线矩阵）

| 项目 | 当前工作区 | HEAD 提交态 | 结论摘要 |
|---|---|---|---|
| P0-1 导入恢复 `calculationParameters` | 部分完成 | 部分完成 | 已有策略弹窗与参数恢复能力，但系统链路仍有未走策略入口 |
| P0-2 文档页快照回滚完整性 | 已完成 | 部分完成 | 文档页字段已补齐；HEAD 下 store 类型/初始状态未完全对齐 |
| P1-1 UDM COUNT 优化 | 已完成 | 已完成 | 已改为 DB `COUNT`，无 `len(all())` 路径 |
| P1-2 权限错误码统一 | 已完成 | 已完成 | 目标路由已统一返回 `403`，未见 `Not enough permissions` 的 `400` 残留 |
| P2-1 Pydantic v2 迁移 | 已完成 | 已完成 | 已迁移至 `ConfigDict/json_schema_extra`，未见旧 `class Config/schema_extra` |

统计：

- 当前工作区：`4/5 已完成，1/5 部分完成`
- HEAD 提交态：`3/5 已完成，2/5 部分完成`

---

## 4. 逐项核查详情（P0-1 ~ P2-1）

### 4.1 P0-1：流程图导入恢复 calculationParameters

**判定**：

- 当前工作区：`部分完成`
- HEAD 提交态：`部分完成`

**已完成证据（核心能力已落地）**：

- `importFlowData(data, options?)` 已支持 `restoreCalculationParams`：
  - `frontend/src/stores/createModelFlowStore.ts:1056`
  - `frontend/src/stores/createModelFlowStore.ts:1209`
  - `frontend/src/stores/flowStore.ts:654`
  - `frontend/src/stores/flowStore.ts:758`
- 本地导入已接入策略弹窗：
  - `frontend/src/components/Flow/FlowLayout.tsx:239-241`
  - `frontend/src/components/Flow/FlowLayout.tsx:297`
  - `frontend/src/components/Flow/menu/ImportCalcParamsDialog.tsx:62-69`
- 文案已存在：
  - `frontend/src/i18n/messages/zh.ts:831-832,860-861`
  - `frontend/src/i18n/messages/en.ts:855-856,885-886`

**系统链路遗漏（导致未达“已完成”）**：

- 在线加载链路仍直接调用 `importFlowData(flow_data)`，未传策略参数：
  - `frontend/src/stores/createModelFlowStore.ts:1295`（`loadFlowChart`）
  - `frontend/src/components/Flow/menu/BaseDialogManager.tsx:285`
- `openflow` 路由使用旧 `Layout`，导入不走策略弹窗（已确认为兼容展示路径，当前版本范围内不修复）：
  - `frontend/src/routes/openflow.tsx:9`
  - `frontend/src/components/Flow/Layout.tsx:182`
  - `frontend/src/routes/openflow.tsx:49`

**影响结论**：

- 本地导入场景（场景 A）已增强；
- 在线加载/旧入口（场景 B）仍可能沿用当前参数，尚未形成“全链路一致”。

### 4.2 P0-2：Flow 组件文档页快照/回滚完整性

**判定**：

- 当前工作区：`已完成`
- HEAD 提交态：`部分完成`

**FlowComponentsDocs 已补齐证据**：

- 快照类型补齐：
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:40-42`
- 进入页快照补齐：
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:117-119`
- 离开页回滚补齐：
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:167-169`

**双基线差异关键点**：

- 当前工作区中，`flowStore` 类型和初始状态已补齐三字段（对齐快照字段）：
  - `frontend/src/stores/flowStore.ts:58-60`
  - `frontend/src/stores/flowStore.ts:149-151`
- HEAD 提交态中，`flowStore` 未声明/初始化上述字段（通过 `git show HEAD:frontend/src/stores/flowStore.ts` 取证）：
  - 类型段显示 `currentJobId` 后直接为 `showMiniMap/showBubbleMenu`（无三字段）
  - 初始状态段显示 `calculationParameters` 后直接为 `showMiniMap/showBubbleMenu`（无三字段）

**影响结论**：

- 当前工作区：快照字段与 store 状态定义一致，满足完整性目标；
- HEAD：文档页已改，但 store 对齐不完整，按系统链路口径判定为“部分完成”。

### 4.3 P1-1：UDM 任务列表总数统计优化

**判定**：

- 当前工作区：`已完成`
- HEAD 提交态：`已完成`

**证据**：

- 使用数据库计数查询：
  - `backend/app/api/routes/udm.py:569-574`
  - 核心语句：`select(func.count())`（`backend/app/api/routes/udm.py:570`）
- 未发现 `len(session.exec(...).all())` 计数模式回退。

### 4.4 P1-2：权限不足错误码语义统一

**判定**：

- 当前工作区：`已完成`
- HEAD 提交态：`已完成`

**证据（章节目标文件）**：

- `backend/app/api/routes/udm_hybrid_configs.py:90,137,168` 为 `403`
- `backend/app/api/routes/flowcharts.py:62,102,126` 为 `403`
- `backend/app/api/routes/udm_flowcharts.py:62,102,126` 为 `403`

**扩展一致性（系统链路）**：

- 同模式路由（如 `asm1_flowcharts.py`、`asm1slim_flowcharts.py`、`asm3_flowcharts.py`、`items.py`）也为 `403`。
- 未检出 `status_code=400, detail="Not enough permissions"` 残留。

### 4.5 P2-1：Pydantic v2 迁移

**判定**：

- 当前工作区：`已完成`
- HEAD 提交态：`已完成`

**证据**：

- `backend/app/material_balance/models.py:222-223`
  - `model_config = ConfigDict(...)`
  - `json_schema_extra=...`
- 未检出旧式 `class Config:` / `schema_extra = ...`。

---

## 5. 验证执行与证据缺口

### 5.1 已执行验证

1. 前端类型检查（当前工作区）
   - 命令：`cd frontend && npx tsc --noEmit`
   - 结果：通过（exit 0）

2. 后端目标测试（当前工作区）
   - 命令：`cd backend && pytest app/tests/hybrid_udm_validation_test.py app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/udm_engine_variable_binding_test.py -q`
   - 结果：阻断（`ModuleNotFoundError: No module named 'sqlmodel'`）

### 5.2 HEAD 提交态验证边界

- 由于未切换工作区，HEAD 采用静态取证。
- `git show HEAD:frontend/src/i18n/messages/zh.ts` 显示智能引号字符串（如 `:826-832`），存在前端构建/类型检查不可直接确认的风险。

---

## 6. 风险清单（按优先级）

### P0

1. `P0-1` 仍有入口未走导入参数策略（在线加载链路）
   - 风险：导入后 `hours/steps_per_hour` 可能与文件不一致，影响复现一致性

### P1

1. HEAD 提交态下文档页与 store 定义未完全对齐（`P0-2` 相关）
   - 风险：类型一致性与链路稳定性不足，发布态证据不完整

### P2

1. 后端测试环境依赖未就绪（缺少 `sqlmodel`）
   - 风险：无法对后端修复项给出运行级回归结论

---

## 7. 总结与后续动作

### 7.1 总结

- Ch02 的后端类修复（`P1-1/P1-2/P2-1`）在双基线下均已完成。
- 前端类修复中：
  - `P0-2` 在当前工作区完成、HEAD 为部分完成；
  - `P0-1` 双基线均为部分完成（核心功能已落地，但系统链路存在入口遗漏）。

### 7.2 建议后续动作（最小闭环）

1. 将 `P0-1` 的策略应用到在线加载入口，做到导入行为一致（`openflow` 旧 `Layout` 按兼容策略暂不修复）。
2. 将 `flowStore.ts` 三字段补齐改动纳入提交，消除 HEAD 与当前工作区在 `P0-2` 上的差异。
3. 补齐后端依赖后执行目标回归测试，补充运行级验证证据。

---

## 附：场景覆盖结论

- 场景 A（本地 JSON 导入含 `calculationParameters`）：已覆盖，支持用户策略选择。
- 场景 B（在线流程图加载链路）：部分覆盖，仍有不走策略入口（`openflow` 旧 `Layout` 已标记为范围外）。
- 场景 C（文档 Demo 进入/退出回滚）：当前工作区覆盖完整，HEAD 对齐不完整。
- 场景 D（UDM 列表总数性能路径）：已覆盖，使用 DB COUNT。
- 场景 E（权限不足错误码语义）：已覆盖，目标路由为 403。
- 场景 F（Pydantic v2 模型配置）：已覆盖，迁移完成。
