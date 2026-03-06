# 综合审查修复报告 Ch01-Ch07

> **项目**: AutoWaterSimu
> **审查周期**: 2026-03-03 ~ 2026-03-06
> **生成日期**: 2026-03-06
> **数据来源**: `tasks/code_review_optimization_2026-03-03_ch01~ch07` 系列文档及各执行/复审报告

---

## 目录

1. [总览仪表盘](#1-总览仪表盘)
2. [各章详细汇总](#2-各章详细汇总)
3. [跨章遗留风险清单](#3-跨章遗留风险清单)
4. [实际业务审核指南](#4-实际业务审核指南)
5. [前端测试清单](#5-前端测试清单)
6. [后端验证清单](#6-后端验证清单)

---

## 1. 总览仪表盘

### 1.1 各章统计总表

| 章节 | 主题 | Issue 数 | 已完成 | 部分完成 | 未开始 | 完成率 | 关键风险 |
|:----:|------|:--------:|:------:|:--------:|:------:|:------:|----------|
| Ch01 | 流程图页面 Bug | 2 | 0 | 0 | **2** | 0% | P0: BubbleMenu 不渲染、ConfirmDialog 丢动作 |
| Ch02 | 开发进度审查 | 5 | 3 | **2** | 0 | 60% | P0-1 在线加载缺参数策略 |
| Ch03 | UDM 模型编辑器 | 10 | **6** | 0 | 4 | 60% | 未做项均为增强功能 |
| Ch04 | 时段规划编辑器 | 8 | **3** | 2 | 3 | 38% | F-2.1 快速拆分 NaN/Infinity 无校验 |
| Ch05 | Hybrid UDM 配置 | 7 | **6** | 1 | 0 | 86% | F-3.3 前后端焦点变量提取不一致 |
| Ch06 | 跨模块公共问题 | 5 | **1** | 4 | 0 | 20% | C-3 Handle 同步、C-2 类型安全缺口 |
| Ch07 | 后端服务层 | 4 | **3** | 0 | 1 | 75% | B-4 执行报告记录不准确 |
| **合计** | | **41** | **22** | **9** | **10** | **54%** | |

### 1.2 总体完成率

```
已完成  ██████████████████████░░░░░░░░░░░░░░░░░░░  22/41 (54%)
部分    █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   9/41 (22%)
未开始  ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10/41 (24%)
```

### 1.3 风险分布

| 优先级 | 数量 | 说明 |
|:------:|:----:|------|
| P0 关键阻断 | 3 | BUG-1, BUG-2, F-2.1 安全校验 |
| P1 重要 | 5 | P0-1 参数策略, F-2.3 小时缺失, F-3.3 前后端不一致, C-2 类型, C-3 Handle |
| P2 增强 | 6+ | 版本历史、模板、拖拽、响应式等 |

---

## 2. 各章详细汇总

### 2.1 Ch01 — 流程图页面 Bug 扫描

**审查文档**: `code_review_optimization_2026-03-03_ch01.md`
**完成状态**: `code_review_optimization_2026-03-03_ch01_completion_status.md`

| ID | 严重度 | 描述 | 状态 | 涉及文件 |
|----|:------:|------|:----:|----------|
| BUG-1 | **P0** | Material Balance 页面 BubbleMenu 完全不渲染 | 未开始 | `flowStore.ts:147`, `FlowLayout.tsx:321-326` |
| BUG-2 | **P1** | ConfirmDialog「保存在线」后丢失待执行动作 | 未开始 | `BaseBubbleMenu.tsx:170-172`, `ConfirmDialog.tsx` |

**根因分析**:
- BUG-1: `flowStore` 中 `showBubbleMenu: false` 直接阻断 BubbleMenu 渲染（`typeof === "boolean"` 判真但值为 `false`）
- BUG-2: `pendingAction` 在 `finally` 块被清空，save 完成后无法回调执行

**修复要点**:
- BUG-1: 将 `showBubbleMenu: false` 改为 `true`（1 行改动）
- BUG-2: 用 `useRef` 保存 `pendingAction`，save 成功回调后执行

**遗留风险**: 无额外风险，修复后即可解除阻断

---

### 2.2 Ch02 — 开发进度审查

**审查文档**: `code_review_optimization_2026-03-03_ch02.md`
**完成状态**: `code_review_optimization_2026-03-03_ch02_completion_status.md`

| ID | 严重度 | 描述 | 状态 | 涉及文件 |
|----|:------:|------|:----:|----------|
| P0-1 | **P0** | Flow 导入缺少 `calculationParameters` 恢复策略 | 部分完成 | `createModelFlowStore.ts:1056-1079,1200-1212,1295`, `ImportCalcParamsDialog.tsx` |
| P0-2 | P0 | Flow 演示页快照字段不完整 | 已完成 | `FlowComponentsDocs.tsx:28-169`, `flowStore.ts:58-60,149-151` |
| P1-1 | P1 | UDM 任务列表用 `len(all())` 查询效率低 | 已完成 | `backend/app/api/routes/udm.py:569-574` |
| P1-2 | P1 | 权限错误用 400 而非 403 | 已完成 | `udm_hybrid_configs.py`, `flowcharts.py`, `udm_flowcharts.py` |
| P2-1 | P2 | Pydantic v2 迁移债务 | 已完成 | `backend/app/material_balance/models.py:222-223` |

**修复摘要**:
- P1-1: 改用 DB `COUNT` 查询 `func.count()`
- P1-2: 统一返回 `403 Forbidden`
- P2-1: 迁移至 `ConfigDict` + `json_schema_extra`

**遗留风险**:
- **P0-1**: 本地 JSON 导入已有策略对话框；但「在线流程图加载」路径（`createModelFlowStore.ts:1295`）仍缺少策略参数，可能导致导入时 hours/steps_per_hour 不匹配

---

### 2.3 Ch03 — UDM 模型库 & 编辑器

**审查文档**: `code_review_optimization_2026-03-03_ch03.md`
**执行报告**: `ch03-udm-optimization-2026-03-05.md`

| ID | 类型 | 描述 | 状态 | 涉及文件 |
|----|:----:|------|:----:|----------|
| F-1.1 | 功能 | 模型列表分页 | 已完成 | `udmModels.tsx` |
| F-1.2 | 功能 | 表达式编辑器函数/常量面板 | 已完成 | `ExpressionCellEditorDialog.tsx` |
| F-1.3 | 功能 | 模型版本历史 diff | 未开始 | — |
| F-1.4 | 功能 | 模型 JSON 导入/导出 | 未开始 | — |
| U-1.1 | UX | 删除确认 `window.confirm` → Chakra Dialog | 已完成 | `udmModels.tsx` |
| U-1.2 | UX | 参数表 scale 选择器原生 → Chakra NativeSelect | 已完成 | `UDMModelEditorForm.tsx` |
| U-1.3 | UX | 表单过长需导航锚点 | 未开始 | — |
| U-1.4 | UX | 表格行用数组索引做 key → UUID | 已完成 | `UDMModelEditorForm.tsx:1022,1201,1391` |
| U-1.5 | UX | 行拖拽排序 | 未开始 | — |
| U-1.6 | UX | 搜索需按 Enter → 300ms debounce 自动搜索 | 已完成 | `udmModels.tsx:144-152` |

**额外修复 — 分页边界用例**:
- 问题: 删除最后一页的最后一项时 `count>0, data=[]` 导致"幽灵空状态"
- 修复: `useEffect` 自动回退页码，分页控件独立于数据显示

**验证**: TypeScript 编译 + Biome lint 通过

---

### 2.4 Ch04 — 时段规划编辑器

**审查文档**: `code_review_optimization_2026-03-03_ch04.md`
**执行报告**: `ch04-time-segment-optimization-2026-03-05.md`

| ID | 类型 | 描述 | 状态 | 涉及文件 |
|----|:----:|------|:----:|----------|
| Step 1 | 重构 | U-2.3 提取重复工具函数 | 已完成 | `timeSegmentHelpers.ts` (新), `TimeSegmentPlanEditor.tsx`, `EdgeTimeSegmentEditor.tsx` |
| Step 2 | 功能 | F-2.1 快速拆分按钮 | **部分** | `TimeSegmentPlanEditor.tsx:212-215,342,347` |
| Step 3 | 功能 | F-2.3 显示模拟小时数 | **部分** | `EdgeTimeSegmentEditor.tsx` |
| Step 4 | UX | U-2.2 继承值视觉区分 | 已完成 | 两个编辑器组件 |
| Step 5 | 验证 | 构建检查 | 通过 | — |
| F-2.2 | 功能 | 时段模板保存/加载 | 未开始 | — |
| U-2.1 | UX | 窄屏响应式布局 | 未开始 | — |
| U-2.4 | UX | 拖拽排序 | 未开始 | — |

**关键风险 — F-2.1 安全缺陷** (P0):

```
用户输入 NaN   → 生成 [0, NaN], [NaN, 2*NaN], ... → 渲染正常但科学上无意义
用户输入 ∞     → 生成 [0, ∞], ... → 下游计算可能崩溃
用户输入负数   → 生成负时长时段
缺失: Number.isFinite 检查、上限校验（建议 max 100 段）、空输入回退
```

**遗留风险**:
- F-2.1: 无效输入不校验可能导致数据完整性问题
- F-2.3: 错误信息缺少预期小时数值

---

### 2.5 Ch05 — Hybrid UDM 配置

**审查文档**: `code_review_optimization_2026-03-03_ch05.md`
**复审报告**: `code_review_optimization_2026-03-03_ch05_review_report_2026-03-05.md`

| ID | 类型 | 描述 | 状态 | 涉及文件 |
|----|:----:|------|:----:|----------|
| F-3.1 | 性能 | 配对映射 O(N²) 优化 | 已完成 | `hybridUdm.ts` |
| F-3.2 | UX | 映射完成度徽章/进度指示 | 已完成 | `HybridUDMSetupDialog.tsx` |
| F-3.3 | 一致性 | 内置符号过滤 | **部分** | 前端 `hybridUdm.ts:9,87`; 后端 `hybrid_udm_validation.py:84-101` |
| F-3.4 | 功能 | 节点解绑能力 | 已完成 | `HybridUDMSetupDialog.tsx` |
| U-3.1 | UX | Tab 分步设置对话框 | 已完成 | `HybridUDMSetupDialog.tsx` |
| U-3.2 | UX | 模型预览 tooltip | 已完成 | `HybridUDMSetupDialog.tsx` |
| U-3.3 | UX | `local_exempt` 术语优化 | 已完成 | `HybridUDMSetupDialog.tsx` |

**关键风险 — F-3.3 前后端不一致** (P1):

前端过滤了 `KNOWN_BUILTINS = ['exp', 'log', 'sqrt', 'pow', 'min', 'max', 'abs', 'clip', 'pi', 'e']`，不要求它们的变量映射。

后端 `hybrid_udm_validation.py` 使用 AST 提取标识符时**未过滤**这些内置符号，可能要求前端已过滤掉的变量进行映射。

**场景**: 组件名为 `exp` + 表达式含 `exp(x)` → 前端不要求映射 → 后端报 "missing variable mapping"

**遗留风险**: 用户可在前端提交通过但后端校验失败的 Hybrid 配置

---

### 2.6 Ch06 — 跨模块公共问题

**审查文档**: `code_review_optimization_2026-03-03_ch06.md`
**执行报告**: `ch06-cross-module-fixes-2026-03-06.md`
**复审报告**: `code_review_optimization_2026-03-03_ch06_review_report_2026-03-06.md`
**补充修复**: `ch06_review_fixes_2026-03-06.md`, `ch06_m3_type_safety_fix_2026-03-06.md`

| ID | 严重度 | 描述 | 状态 | 涉及文件 |
|----|:------:|------|:----:|----------|
| C-1 | 中 | 后端错误消息中英混用 | 部分完成 | `udm_expression.py`, `hybrid_udm_validation.py` |
| C-2 | 中 | TypeScript 类型安全 (松散 `any`) | 部分完成 | `UDMNode.tsx`, `UDMBubbleMenu.tsx`, `UDMModelEditorDialog.tsx`, `UDMModelEditorForm.tsx`, `UDMPropertyPanel.tsx` |
| C-3 | 中高 | UDM 节点绑定/解绑视觉反馈 | 部分完成 | `UDMNode.tsx`, `UDMBubbleMenu.tsx` |
| C-4 | 低 | 危险操作缺少 loading 状态 | 已完成 | `ItemActionsMenu.tsx` |
| C-5 | 中 | 键盘可访问性 aria-label 缺失 | 部分完成 | `ExpressionCellEditorDialog.tsx`, i18n 文件 |

**M-1 修复 — Handle 同步依赖缺失**:
- 问题: `useHandlePositionSync([label])` 仅依赖 `label`，但 bind/unbind 状态改变节点高度，Handle 锚点不会重新计算
- 修复: 更新依赖为 `[label, isBound, boundModelName]`

**M-2 修复 — aria-label 国际化**:
- 问题: `aria-label="Insert variable ${name}"` 硬编码英文
- 修复: 接入 i18n 系统，新增 4 个 aria 相关翻译键

**M-3 修复 — 类型安全增强**:
- 新增文件: `frontend/src/types/udmNodeData.ts`
  - `UDMNodeModelSnapshot` 接口（完整模型数据）
  - `UDMNodeData extends Record<string, unknown>`（节点载荷）
- 5 个文件从 `any` 改为具体领域类型

**验证**: TypeScript 零错误，`pnpm build` 通过

---

### 2.7 Ch07 — 后端服务层

**审查文档**: `code_review_optimization_2026-03-03_ch07.md`
**执行报告**: `ch07_review_report_2026-03-06.md`
**交叉报告**: `code_review_optimization_2026-03-03_ch07_review_report_2026-03-06.md`

| ID | 严重度 | 描述 | 状态 | 涉及文件 |
|----|:------:|------|:----:|----------|
| B-1 | **高** | `_evaluate_ast` 递归无上限 | 已完成 | `udm_expression.py` |
| B-2 | 中 | `build_hybrid_runtime_info` 巨型函数 (~330行) | 已完成 | `hybrid_udm_validation.py` |
| B-3 | 中 | 模型删除缺级联验证 | 已验证 | ORM + DB FK + Alembic 三层均有 CASCADE |
| B-4 | 低 | 错误消息语言统一 | **文档问题** | `udm_expression.py`, `hybrid_udm_validation.py` |

**修复摘要**:
- B-1: 新增 `MAX_AST_DEPTH = 50`，递归超限抛异常。验证: 49 层通过、50+ 被拦截
- B-2: 拆分为 8 个私有函数 + `_BuildContext` 数据类。6/6 核心用例行为不变
- B-3: ORM `sa_relationship_kwargs={"cascade": "all, delete-orphan"}`、DB 外键 `ON DELETE CASCADE`、Alembic migration 三层均确认
- B-4: **注意** — 执行报告记载为 "NO ACTION"，但实际存在中→英翻译改动。文档需修订

**遗留风险**:
- B-1 仅手工验证，建议补自动化边界测试
- B-4 执行报告不准确，需更新

---

## 3. 跨章遗留风险清单

按优先级排序，汇总所有未完成或有回归风险的条目。

### 3.1 P0 — 关键阻断（必须修复）

| # | 来源 | 问题 | 影响 | 建议修复工作量 |
|:-:|:----:|------|------|:--------------:|
| 1 | Ch01 BUG-1 | Material Balance BubbleMenu 不渲染 | 该页面功能完全不可用 | 5 分钟 |
| 2 | Ch01 BUG-2 | ConfirmDialog 保存后丢失 pendingAction | 用户必须重复点击操作 | 30 分钟 |
| 3 | Ch04 F-2.1 | 快速拆分输入 NaN/Infinity/负数无校验 | 可创建无效时段计划，影响数据完整性 | 15 分钟 |

### 3.2 P1 — 重要（应尽快修复）

| # | 来源 | 问题 | 影响 | 建议修复工作量 |
|:-:|:----:|------|------|:--------------:|
| 4 | Ch02 P0-1 | 在线加载缺 import 参数策略对话框 | 导入流程图参数不匹配 | 1-2 小时 |
| 5 | Ch05 F-3.3 | 前后端焦点变量提取白名单不一致 | 用户提交的 Hybrid 配置后端拒绝 | 1 小时 |
| 6 | Ch04 F-2.3 | 错误信息缺少预期小时数值 | 用户无法判断校验期望 | 30 分钟 |
| 7 | Ch06 C-2 | 类型系统不完整（仍有 `Record<string, unknown>`） | 类型安全仍有缺口 | 持续改进 |
| 8 | Ch06 C-3 | Handle 同步边缘情况 | M-1 修复后需实际验证 | 验证 15 分钟 |
| 9 | Ch07 B-4 | 执行报告 B-4 记载"NO ACTION"但实际有改动 | 文档不准确 | 15 分钟 |

### 3.3 P2 — 增强功能（按需实现）

| # | 来源 | 描述 | 类型 |
|:-:|:----:|------|:----:|
| 10 | Ch03 F-1.3 | 模型版本历史 diff UI | 功能 |
| 11 | Ch03 F-1.4 | 模型 JSON 导入/导出 | 功能 |
| 12 | Ch03 U-1.3 | 表单导航锚点/步骤器 | UX |
| 13 | Ch03 U-1.5 | 表格行拖拽排序 | UX |
| 14 | Ch04 F-2.2 | 时段模板保存/加载 | 功能 |
| 15 | Ch04 U-2.1 | 窄屏/移动端响应式布局 | UX |
| 16 | Ch04 U-2.4 | 时段拖拽排序 | UX |

---

## 4. 实际业务审核指南

按功能模块组织，给出在浏览器中的审核路径。

### 4.1 流程图页面（Material Balance）

**对应修复项**: Ch01 BUG-1, BUG-2

**审核路径**:
1. 导航至 Material Balance 流程图页面
2. 检查 BubbleMenu（右键/选中菜单）是否正常弹出
3. 在 BubbleMenu 中点击任意需要确认的操作（如删除节点）
4. 在 ConfirmDialog 中选择「先保存在线」
5. 保存完成后检查之前的操作是否被正确执行

**关注点**:
- BubbleMenu 应正常渲染（BUG-1 修复前完全不显示）
- 保存后 pendingAction 应自动执行（BUG-2 修复前需重复点击）

### 4.2 UDM 模型编辑器

**对应修复项**: Ch03 F-1.1, F-1.2, U-1.1~U-1.6

**审核路径 — 模型列表**:
1. 导航至 UDM 模型列表页 (`/udmModels`)
2. 验证分页: 若模型数超过每页限制，底部显示分页控件
3. 验证搜索: 输入关键词后 300ms 自动触发搜索，结果实时更新
4. 验证分页边界: 翻到最后一页 → 删除唯一模型 → 应自动回退到上一页
5. 验证删除确认: 点击删除按钮 → 弹出 Chakra Dialog（非 `window.confirm`）→ 确认按钮显示 loading

**审核路径 — 表达式编辑器**:
1. 进入任意 UDM 模型编辑页
2. 点击动力学表达式单元格进入表达式编辑器
3. 验证函数/常量面板: 右侧应显示可用函数 (`exp`, `log`, `sqrt`, ...) 和常量 (`pi`, `e`)
4. 点击函数名 → 光标应正确插入函数模板到表达式输入框

**审核路径 — 编辑表单**:
1. 验证参数表 scale 选择器为 Chakra NativeSelect（非原生 `<select>`）
2. 新增多行后快速删除/增加行 → 验证无 key 重复警告（UUID key 修复）

### 4.3 时段计划编辑器

**对应修复项**: Ch04 Step 1~4

**审核路径**:
1. 在流程图中选中节点，打开 Inspector → 时段计划编辑器
2. 验证快速拆分: 输入拆分数量 → 点击拆分 → 时段均匀分割
3. **安全测试**: 输入 `0`, 负数, 非数字, 极大数字 → 应有合理的错误提示或拒绝（当前未实现，需修复后验证）
4. 验证继承值: 边时段编辑器中继承自节点的值应以虚线边框 + 链接图标显示
5. 验证模拟小时数: 边时段编辑器顶部应显示总模拟小时数
6. 验证时段合计: 所有时段的结束时间之和应等于模拟小时数，否则显示校验提示

### 4.4 Hybrid UDM 配置对话框

**对应修复项**: Ch05 F-3.1~F-3.4, U-3.1~U-3.3

**审核路径**:
1. 在包含多个 UDM 节点的流程图中打开 Hybrid UDM 配置
2. 验证 Tab 布局: 「选择模型」和「配对映射」分 Tab 展示
3. 验证映射进度: 每个配对应显示完成度百分比/颜色指示（0% 红/部分黄/100% 绿）
4. 验证模型预览: Hover 模型名称 → tooltip 显示组件列表、过程数
5. 验证解绑: 在下拉菜单中选择空值 → 节点应清除绑定状态
6. 验证 `local_exempt` 说明: 相关字段应有 tooltip 解释含义
7. **跨层测试**: 创建含内置函数名（如 `exp`）的组件 → 检查前端是否正确过滤 → 提交后后端是否接受

### 4.5 UDM 节点可视化

**对应修复项**: Ch06 C-3 (M-1 修复), C-4

**审核路径**:
1. 在流程图中放置 UDM 节点
2. 绑定模型 → 节点应显示模型名称副标题
3. 解绑模型 → 节点显示「未绑定」警告
4. **Handle 同步测试**: 绑定/解绑切换后，检查节点的连接锚点（Handle）是否正确跟随节点高度变化
5. 验证 Duplicate 和 Publish 按钮操作时显示 loading 状态

### 4.6 后端安全

**对应修复项**: Ch07 B-1, B-2, B-3

**审核路径**:
1. 递归深度限制: 构造嵌套 50+ 层的表达式 → API 应返回错误而非卡死
2. 级联删除: 删除父级 UDM 模型 → 关联数据（flowchart, hybrid config 等）应一并删除
3. 权限校验: 用非所有者账号访问他人模型 → 应返回 403

---

## 5. 前端测试清单

### 5.1 Ch01 — BubbleMenu & ConfirmDialog

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 1 | 打开 Material Balance 流程图页面 → 右键/选中节点 | BubbleMenu 弹出并显示所有菜单项 | BUG-1 | 待修复后测试 |
| 2 | BubbleMenu → 点击删除 → ConfirmDialog 弹出 → 点击「保存在线」 | 保存完成后节点被删除 | BUG-2 | 待修复后测试 |
| 3 | BubbleMenu → 点击删除 → ConfirmDialog → 点击「取消」 | 对话框关闭，节点不变 | BUG-2 | 待修复后测试 |

### 5.2 Ch02 — 导入参数策略

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 4 | 本地导入 JSON 流程图（参数不同） | 弹出 ImportCalcParamsDialog 选择策略 | P0-1 | 可测试 |
| 5 | 在线加载不同参数的流程图 | 同样弹出参数策略对话框 | P0-1 | 待修复后测试 |

### 5.3 Ch03 — UDM 模型列表

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 6 | `/udmModels` 页面 → 创建 >10 个模型 | 底部显示分页控件，翻页正常 | F-1.1 | 可测试 |
| 7 | 搜索框输入关键词 → 等待 300ms | 列表自动过滤，无需按 Enter | U-1.6 | 可测试 |
| 8 | 搜索后翻到第 N 页 → 清空搜索 | 页码自动重置为第 1 页 | F-1.1 | 可测试 |
| 9 | 翻到最后一页（仅 1 个模型）→ 删除该模型 | 自动回退到上一页，不显示空状态 | F-1.1 边界 | 可测试 |
| 10 | 点击删除 → 弹出确认对话框 → 确认 | Chakra Dialog 显示，确认按钮 loading，删除成功 | U-1.1 | 可测试 |
| 11 | 进入模型编辑页 → 参数表 scale 列 | 下拉选择器为 Chakra NativeSelect 样式 | U-1.2 | 可测试 |
| 12 | 编辑页连续添加/删除多行 → 打开 Console | 无 React key 重复警告 | U-1.4 | 可测试 |

### 5.4 Ch03 — 表达式编辑器

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 13 | 模型编辑 → 点击动力学表达式单元格 | 表达式编辑器弹出 | F-1.2 | 可测试 |
| 14 | 表达式编辑器 → 右侧面板点击 `exp` | 表达式输入框插入 `exp()` 模板，光标在括号内 | F-1.2 | 可测试 |
| 15 | 表达式编辑器 → 点击常量 `pi` | 输入框插入 `pi` | F-1.2 | 可测试 |

### 5.5 Ch04 — 时段规划

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 16 | 选中节点 → Inspector → 时段编辑器 → 输入拆分数 3 → 点击拆分 | 时段被均分为 3 段 | F-2.1 | 可测试 |
| 17 | 拆分数输入 `abc` / `0` / `-1` → 点击拆分 | 应拒绝或提示错误（**当前缺失校验**） | F-2.1 安全 | 待修复后测试 |
| 18 | 边时段编辑器 → 查看继承值 | 继承值以虚线边框 + 链接图标显示 | U-2.2 | 可测试 |
| 19 | 边时段编辑器顶部 | 显示总模拟小时数 | F-2.3 | 可测试 |

### 5.6 Ch05 — Hybrid UDM

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 20 | 多 UDM 节点流程图 → 打开 Hybrid 配置 | Tab 布局: 选择模型 / 配对映射 | U-3.1 | 可测试 |
| 21 | 配对映射 Tab → 查看进度 | 每对显示完成百分比，颜色编码 | F-3.2 | 可测试 |
| 22 | 模型名称 Hover | Tooltip 显示组件数量、过程列表 | U-3.2 | 可测试 |
| 23 | 下拉菜单选择空值 → 解绑节点 | 节点绑定清除，相关字段清空 | F-3.4 | 可测试 |
| 24 | `local_exempt` 字段 Hover | Tooltip 解释该字段含义 | U-3.3 | 可测试 |
| 25 | 创建组件名为 `exp` + 含 `exp(x)` 表达式 → 提交 | 前端不要求映射 `exp`；后端也应接受（**当前可能失败**） | F-3.3 | 待修复后测试 |

### 5.7 Ch06 — UDM 节点 & 无障碍

| # | 操作步骤 | 预期结果 | 对应修复 | 状态 |
|:-:|---------|---------|:--------:|:----:|
| 26 | 放置 UDM 节点 → 绑定模型 | 节点显示模型名称副标题 | C-3 | 可测试 |
| 27 | 绑定 → 解绑 → 重新绑定 | Handle 锚点位置始终正确跟随节点高度 | C-3 M-1 | 可测试 |
| 28 | 模型列表 → Duplicate 按钮 | 操作中显示 loading 状态 | C-4 | 可测试 |
| 29 | 表达式编辑器 → Tab 键导航按钮 | 按钮具有 aria-label（可用屏幕阅读器验证） | C-5 M-2 | 可测试 |
| 30 | 切换语言(zh/en) → 表达式编辑器 aria-label | aria-label 跟随语言切换 | C-5 M-2 | 可测试 |

---

## 6. 后端验证清单

### 6.1 自动化测试

```bash
cd backend

# 运行全部测试（需要 sqlmodel 依赖和数据库连接）
uv run pytest

# 运行特定测试文件
uv run pytest app/tests/api/routes/test_users.py

# 运行 UDM 相关测试
uv run pytest -k "udm"
```

> **注意**: 当前完整测试套件因 `sqlmodel` 依赖未安装在测试环境中而被阻塞。需先确认依赖安装。

### 6.2 手动 API 测试

#### B-1: 递归深度限制

```bash
# 构造嵌套 50+ 层表达式并调用编译端点
# 预期: 返回错误消息，非无限递归/崩溃
curl -X POST http://localhost:8000/api/v1/udm/compile-expression \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expression": "(((((...50+层嵌套...)))))"}'
# 预期结果: 400 错误，消息含 "depth" 或 "recursion"
```

#### B-2: Hybrid Runtime 构建

```bash
# 调用 Hybrid UDM 模拟端点
# 验证拆分后的 8 个子函数行为与原单体函数一致
curl -X POST http://localhost:8000/api/v1/udm/hybrid/simulate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... 合法 Hybrid 配置 ... }'
# 预期结果: 正常返回模拟结果
```

#### B-3: 级联删除

```bash
# 1. 创建 UDM 模型 → 记录 model_id
# 2. 创建关联的 flowchart → 记录 flowchart_id
# 3. 删除 UDM 模型
curl -X DELETE http://localhost:8000/api/v1/udm-models/$MODEL_ID \
  -H "Authorization: Bearer $TOKEN"
# 4. 尝试获取关联 flowchart → 预期 404
curl http://localhost:8000/api/v1/udm-flowcharts/$FLOWCHART_ID \
  -H "Authorization: Bearer $TOKEN"
# 预期结果: 404 Not Found
```

#### B-4: 错误消息语言

```bash
# 发送不合法的 UDM 表达式
curl -X POST http://localhost:8000/api/v1/udm/compile-expression \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expression": "invalid!!!"}'
# 预期结果: 错误消息为英文（非中文混合）
```

#### 权限测试 (Ch02 P1-2)

```bash
# 用 User A 的 Token 访问 User B 的资源
curl http://localhost:8000/api/v1/udm-flowcharts/$OTHER_USER_FLOWCHART_ID \
  -H "Authorization: Bearer $USER_A_TOKEN"
# 预期结果: 403 Forbidden（非 400 Bad Request）
```

---

## 附录 A: 数据来源映射表

| 章节 | 审查文档 | 执行报告 | 复审报告 |
|:----:|---------|---------|---------|
| Ch01 | `ch01.md` | `ch01_completion_status.md` | — |
| Ch02 | `ch02.md` | `ch02_completion_status.md` | — |
| Ch03 | `ch03.md` | `ch03-udm-optimization-2026-03-05.md` | — |
| Ch04 | `ch04.md` | `ch04-time-segment-optimization-2026-03-05.md` | — |
| Ch05 | `ch05.md` | `ch05_review_report_2026-03-05.md` | — |
| Ch06 | `ch06.md` | `ch06-cross-module-fixes-2026-03-06.md` | `ch06_review_report` + `ch06_review_fixes` + `ch06_m3_type_safety_fix` |
| Ch07 | `ch07.md` | `ch07_review_report_2026-03-06.md` | `ch07_review_report (cross)` |

> 所有文档路径前缀: `tasks/code_review_optimization_2026-03-03_`（审查文档）或 `tasks/`（执行/复审报告）

## 附录 B: 涉及文件清单

### 前端（54+ 文件）

**核心 Flow/布局**:
- `frontend/src/stores/flowStore.ts`
- `frontend/src/components/Flow/FlowLayout.tsx`
- `frontend/src/components/Flow/FlowInspector.tsx`
- `frontend/src/stores/createModelFlowStore.ts`

**时段编辑**:
- `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx`
- `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx`
- `frontend/src/utils/timeSegmentHelpers.ts` (新增)
- `frontend/src/utils/timeSegmentValidation.ts`

**UDM 模型编辑器**:
- `frontend/src/routes/_layout/udmModels.tsx`
- `frontend/src/routes/_layout/udmModelEditor.tsx`
- `frontend/src/components/UDM/UDMModelEditorDialog.tsx`
- `frontend/src/components/UDM/UDMModelEditorForm.tsx`
- `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx`
- `frontend/src/components/UDM/HybridUDMSetupDialog.tsx`
- `frontend/src/types/udmNodeData.ts` (新增)

**UDM 节点 & 菜单**:
- `frontend/src/components/Flow/nodes/UDMNode.tsx`
- `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx`
- `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx`
- `frontend/src/components/Common/ItemActionsMenu.tsx`

**国际化**:
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/i18n/messages/en.ts`

### 后端（12+ 文件）

- `backend/app/api/routes/udm_models.py`
- `backend/app/api/routes/udm_hybrid_configs.py`
- `backend/app/api/routes/flowcharts.py`
- `backend/app/api/routes/udm_flowcharts.py`
- `backend/app/services/udm_expression.py`
- `backend/app/services/hybrid_udm_validation.py`
- `backend/app/material_balance/models.py`

## 附录 C: 时间线

| 日期 | 活动 | 产出 |
|:----:|------|------|
| 2026-03-03 | Ch01-Ch07 初始审查创建 | 7 份审查文档 |
| 2026-03-04 | Ch01 完成状态验证 | 2 个 Bug 记录 |
| 2026-03-05 | Ch02 双基线审查 | 4/5 完成 |
| 2026-03-05 | Ch03 执行完成 | 6 项任务 + 分页修复 |
| 2026-03-05 | Ch04 执行 & 审查 | 3/5 完成，F-2.1 安全风险识别 |
| 2026-03-05 | Ch05 复审完成 | 6/7 完成 |
| 2026-03-06 | Ch06 执行 + M1/M2/M3 修复 | Handle 同步、i18n、类型系统 |
| 2026-03-06 | Ch07 执行 & 审查 | 3/4 完成，B-4 文档问题 |
| 2026-03-06 | 综合报告生成 | 本文档 |

---

> **报告结束** — 生成于 2026-03-06
