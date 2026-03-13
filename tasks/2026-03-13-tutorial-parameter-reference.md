# 执行记录：教程 Step 2+ 增加参数说明表

**日期**: 2026-03-13

## 任务

在 Petersen 教程的 step 2（化学计量系数）和 step 3（速率表达式）阶段，矩阵下方增加一个可折叠的参数说明卡片，包含参数名、中英文说明和默认值。

## 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/components/UDM/tutorial/TutorialParameterReference.tsx` | 新建 | 可折叠参数说明卡片组件 |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 修改 | 导入并挂载组件（矩阵后、RecipeBar 前） |
| `frontend/src/i18n/messages/en/flow-models.ts` | 修改 | 新增 parameterReference + paramRef 列标题 |
| `frontend/src/i18n/messages/zh/flow-models.ts` | 修改 | 新增 parameterReference + paramRef 列标题 |
| `frontend/src/i18n/types.ts` | 修改 | 新增类型定义 |

## 实现细节

### TutorialParameterReference 组件
- 使用 Chakra UI `Collapsible.Root` 实现折叠（与 `ResultInterpretationCard` 相同模式）
- 接收 `parameterRows` 和 `lessonKey`
- 通过 `resolveTutorialParameterDisplay()` 获取中英文参数说明
- 表格列：参数名（mono 字体）、说明（label + description）、默认值（含单位）
- 默认展开状态
- 空参数时返回 null

### 挂载条件
- `isTutorialModel && showStoichSection`（step >= 2 时显示）
- 非教程模式下不显示

## 验证

- TypeScript 类型检查：通过
- Biome lint/format：通过
