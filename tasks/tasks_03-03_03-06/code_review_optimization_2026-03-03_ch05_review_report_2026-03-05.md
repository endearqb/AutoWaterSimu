# Ch05 Hybrid UDM 开发工作审阅报告（双基线）

- 审阅对象: `tasks/code_review_optimization_2026-03-03_ch05.md`
- 对照输入: 本次提交说明中的 7 项已完成内容
- 审阅日期: 2026-03-05
- 审阅口径: 系统链路口径（实现落地 + 前后端一致性 + 回归风险）
- 基线定义:
  - `当前工作区`: 含未提交改动
  - `HEAD 提交态`: `git show HEAD:<path>` 静态取证（不切分支、不重置）

---

## 1. 主要发现（发现优先）

### M-1（中高）F-3.3 仍存在前后端“焦集变量提取”口径不一致（当前工作区）

**现象与证据**

- 前端新增内建符号过滤（当前工作区）:
  - `frontend/src/utils/hybridUdm.ts:9` 定义 `KNOWN_BUILTINS`
  - `frontend/src/utils/hybridUdm.ts:87` 提取时排除 `KNOWN_BUILTINS`
- 后端 Hybrid 校验侧仍为“AST 标识符 ∩ 组件名”，未过滤内建函数/常量:
  - `backend/app/services/hybrid_udm_validation.py:84-101`
- 后端组件名校验仅约束“非空、唯一”，未限制保留字:
  - `backend/app/models.py:322-329`

**风险**

- 当组件名与内建符号重名（如 `exp/log/pi/e`）且表达式中出现同名标识符时:
  - 前端映射 UI 不要求该变量（被过滤）
  - 后端校验可能要求该变量（未过滤）
- 会出现“前端可提交、后端报缺映射”的链路分歧。

**结论**

- `当前工作区`: `部分完成`（前端做了过滤，但跨层未完全一致）
- `HEAD 提交态`: `未完成`（前端过滤改动本身也未进入 HEAD）

### M-2（中）自动化回归覆盖不足，当前结论以静态取证为主

**现象与证据**

- 前端改动较多（对话框结构、映射算法、解绑语义、i18n），未见对应自动化测试文件新增。
- 前端类型检查通过:
  - `frontend`: `npx tsc --noEmit` -> `exit 0`
- 后端目标测试在当前环境无法执行:
  - `backend`: `pytest app/tests/hybrid_udm_validation_test.py -q` -> `ModuleNotFoundError: No module named 'sqlmodel'`

**风险**

- 关键交互场景（Tab 切换、pair 过滤边界、解绑重绑）缺少自动化保护，后续改动易回归。

### L-1（低）U-3.3 的 tooltip 触发器可用性一般（可访问性）

**现象与证据**

- 当前使用纯文本 `?` 作为 tooltip 触发器:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:696-698`

**风险**

- 键盘可达性、可点击区域和语义化可访问性较弱（非阻断）。

---

## 2. 结论总览（双基线矩阵）

| 项目 | 当前工作区 | HEAD 提交态 | 结论摘要 |
|---|---|---|---|
| F-3.1 Pair Mapping O(N²) 优化 | 已完成 | 未完成 | 已接入 `flowEdges/flowNodes` + `requiredPairKeys` 过滤；HEAD 无此实现 |
| F-3.2 映射完整性 badges | 已完成 | 未完成 | 已有总体/Tab/每对 pair 进度与颜色；HEAD 无 |
| F-3.3 builtin 过滤 | 部分完成 | 未完成 | 前端已过滤，但后端 Hybrid 校验口径未同步 |
| F-3.4 节点解绑 | 已完成 | 未完成 | 下拉可选空值并清理 `udmModel*` 关键字段；HEAD 无 |
| U-3.1 Tab 布局 | 已完成 | 未完成 | 对话框已拆分 Select Models / Pair Mapping 两个标签页 |
| U-3.2 模型详情预览 | 已完成 | 未完成 | 已加模型 tooltip 预览（组分+过程数+未加载态） |
| U-3.3 local_exempt 术语与提示 | 已完成 | 未完成 | 文案更友好，新增 tooltip 解释与 `?` 触发器 |

统计:

- 当前工作区: `6/7 已完成，1/7 部分完成`
- HEAD 提交态: `0/7 已完成，7/7 未完成`

---

## 3. 逐项核查详情（F-3.1 ~ U-3.3）

### 3.1 F-3.1 Pair Mapping O(N²) 优化

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- `HybridUDMSetupDialogProps` 新增:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:58-59`
- 基于图边构建 required pair:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:104-131`
- pair 生成时按 required set 过滤:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:151`
- `UDMBubbleMenu` 透传 nodes/edges:
  - `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx:35-36,232-233`

**HEAD 证据**

- 未检出 `flowEdges/flowNodes/requiredPairKeys` 相关实现。

### 3.2 F-3.2 映射完整性 badges

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- 进度计算:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:165-185`
- 颜色分级（0%/部分/100%）:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:440-447`
- Tab 触发器 badge:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:491-501`
- 映射页总体进度:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:606-612`
- pair 级进度 badge:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:635-651`

**HEAD 证据**

- 未检出 `mappingProgress` 与 badge 相关实现。

### 3.3 F-3.3 builtin 过滤

**判定**

- 当前工作区: `部分完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- 前端新增 builtin 集并过滤:
  - `frontend/src/utils/hybridUdm.ts:9-12,87`
- 后端表达式白名单:
  - `backend/app/services/udm_expression.py:10-20`
- 但后端 Hybrid focal 提取未做同类过滤:
  - `backend/app/services/hybrid_udm_validation.py:84-101`

**HEAD 证据**

- `frontend/src/utils/hybridUdm.ts` 未检出 `KNOWN_BUILTINS`。

### 3.4 F-3.4 节点解绑

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- 解绑分支与字段清理:
  - `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx:336-353`
- 下拉空值可选:
  - `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx:486-488`
- 新文案键:
  - `frontend/src/i18n/messages/zh.ts:519`
  - `frontend/src/i18n/messages/en.ts:536`
  - `frontend/src/i18n/types.ts:510`

**HEAD 证据**

- 未检出 `if (!nextModelKey)` 解绑逻辑与 `unbindModel` 文案。

### 3.5 U-3.1 Tab 布局

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- 使用 `Tabs.Root` 拆分两页:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:483-712`
- 标签文案键:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:486,490`
  - `frontend/src/i18n/messages/zh.ts:745-748`
  - `frontend/src/i18n/messages/en.ts:768-771`

**HEAD 证据**

- `HybridUDMSetupDialog.tsx` 未检出 `Tabs.Root` 与 `tabs.*` 文案调用。

### 3.6 U-3.2 模型详情 tooltip 预览

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- tooltip 内容构建（组分列表+过程数+未加载态）:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:450-470`
- 模型项包装 tooltip:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:565-570`
- 文案键:
  - `frontend/src/i18n/messages/zh.ts:749-753`
  - `frontend/src/i18n/messages/en.ts:772-776`

**HEAD 证据**

- 未检出 `modelPreview.*` 相关实现与文案。

### 3.7 U-3.3 local_exempt 术语与提示

**判定**

- 当前工作区: `已完成`
- HEAD 提交态: `未完成`

**当前工作区证据**

- 文案更新:
  - `frontend/src/i18n/messages/zh.ts:743-744`
  - `frontend/src/i18n/messages/en.ts:766-767`
- 映射行 tooltip:
  - `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:692-699`

**HEAD 证据**

- 旧文案仍为:
  - `frontend/src/i18n/messages/zh.ts:742` (`"本地豁免"`)
  - `frontend/src/i18n/messages/en.ts:765` (`"Local exempt"`)
- 未检出 `localExemptTooltip`。

---

## 4. 公共接口/类型影响与兼容性评估

1. `HybridUDMSetupDialogProps` 新增可选字段 `flowEdges?: Edge[]`、`flowNodes?: Node[]`  
   - 兼容性: 向后兼容（可选参数），旧调用点不强制修改。

2. `i18n` 类型新增键 `unbindModel`、`localExemptTooltip`、`tabs.*`、`modelPreview.*`、`mappingProgress.*`  
   - 兼容性: 类型层面是正向约束；当前工作区 `en/zh/types` 已对齐，`tsc` 通过。

3. `UDMPropertyPanel` 交互语义变更（支持空值解绑并清理 UDM 绑定字段）  
   - 影响: 用户可回退到未绑定状态，降低误操作恢复成本。

---

## 5. 测试与场景覆盖核查

### 5.1 Pair 过滤场景（无边/有边/跨模型/同模型）

- 当前工作区: 代码路径已覆盖
  - 无边或未传 edges/nodes: 回退全量 N²（`requiredPairKeys === null`）
  - 有边且跨模型: 仅保留 required pair
  - 同模型边: 显式跳过
- HEAD 提交态: 未覆盖（无该逻辑）

### 5.2 映射完整性场景（0%/部分/100%）

- 当前工作区: `getMappingBadgeColor()` 三态分支覆盖（红/黄/绿）
- HEAD 提交态: 未覆盖

### 5.3 local_exempt 场景（默认/切换/tooltip）

- 当前工作区: 已覆盖（默认 `LOCAL_EXEMPT_TOKEN` + 下拉切换 + tooltip）
- HEAD 提交态: 未覆盖（仅旧术语，缺 tooltip）

### 5.4 模型详情预览场景（未加载/已加载）

- 当前工作区: 已覆盖（`notLoaded` + components/processes）
- HEAD 提交态: 未覆盖

### 5.5 节点解绑场景（清理字段/UI/错误提示）

- 当前工作区: 已覆盖（空值 option + 清理关键字段 + 错误状态复位）
- HEAD 提交态: 未覆盖

### 5.6 回归场景（i18n 完整性 + TS 编译）

- 当前工作区:
  - `frontend`: `npx tsc --noEmit` 通过（exit 0）
- HEAD 提交态:
  - 本次未切换执行，仅做静态取证

---

## 6. 验证执行结果与证据边界

### 6.1 已执行

1. 前端类型检查
   - 命令: `cd frontend && npx tsc --noEmit`
   - 结果: 通过（exit 0）

2. 后端目标测试（Hybrid）
   - 命令: `cd backend && pytest app/tests/hybrid_udm_validation_test.py -q`
   - 结果: 阻断（`ModuleNotFoundError: No module named 'sqlmodel'`）

### 6.2 证据边界

- 双基线中的 HEAD 采用静态取证，不做检出切换。
- 本报告不扩展评审 Ch04 时段优化实现，仅覆盖 Ch05 范围。

---

## 7. 风险清单与建议修复顺序

### P1

1. 对齐 F-3.3 的前后端口径（建议统一在 `hybrid_udm_validation.py` 加入与前端一致的 builtin 过滤，或通过后端接口下发统一保留字列表）。
2. 补齐 Ch05 的自动化回归（至少覆盖 pair 过滤、映射进度、解绑流程、local_exempt 语义）。

### P2

1. 将 `?` 文本触发器升级为具备可访问语义的 icon button（含 `aria-label`）。

---

## 8. 最终结论（可发布性判断）

- **当前工作区**: Ch05 开发项整体达到“可联调”状态（`6/7 已完成`），但在 **F-3.3 跨层一致性** 与 **自动化回归覆盖** 上仍有缺口；建议完成 P1 项后再进入发布候选。
- **HEAD 提交态**: Ch05 目标能力尚未落地（`0/7 已完成`），不可视为已交付状态。

