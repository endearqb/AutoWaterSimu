# Phrase9 执行说明（UI/UX 收口）

日期：2026-02-11  
范围：`docs/UDM/phrase1-5_7-10_processed_stoich_rateexpr_canvas_uiux_plan.md` 中 Phrase9  
目标：冻结列、批量粘贴、错误跳转、变更提示

---

## 1. 本次已完成

### 1.1 冻结列（矩阵可读性）
- 文件：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 调整：
  - Process 表格容器改为 `overflow="auto"` + `maxH="520px"`，支持大矩阵滚动。
  - 表头 `top=0` 粘性固定。
  - 首两列（`process name`、`rateExpr`）在表头与表体都设置 `position="sticky"`，横向滚动时保持可见。

### 1.2 批量粘贴（TSV/CSV）
- 文件：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 调整：
  - 已接入 `handleStoichPaste` 到 Stoich 输入单元格 `onPaste`。
  - 支持以当前单元格为起点，按“行列块”批量写入（`\t` 或 `,` 分隔）。
  - 粘贴内容超出现有行数时自动扩展 `processRows`。
  - 新增 `Stoich 全部清零` 按钮，便于快速重置矩阵。

### 1.3 校验错误跳转（定位效率）
- 文件：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 调整：
  - `validation.errors / warnings` 改为可点击按钮。
  - 点击后调用 `jumpToIssue`：
    - 优先定位到具体 stoich 单元格（`process + component`）。
    - 无法定位 component 时回退到 process 名称输入框。
  - 为 process 与 stoich 输入框建立 ref 映射，支持 `scrollIntoView + focus + select`。

### 1.4 变更提示（离开保护）
- 文件：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 调整：
  - 新增基线签名 `baselineSignature` 与实时签名对比，形成 `isDirty`。
  - 页面刷新/关闭前（`beforeunload`）在未保存状态下提示。
  - “返回模型库”按钮改为走 `handleBackClick`，未保存时二次确认。
  - 操作区新增状态徽标：`有未保存变更` / `已保存`。

---

## 2. 代码变更文件

- `frontend/src/components/UDM/UDMModelEditorForm.tsx`

---

## 3. 验证记录

已执行并通过：

```powershell
cd frontend; npx tsc --noEmit
```

---

## 4. 仍未完成（留待后续 phrase）

以下项未在本次 Phrase9 中落地：

1. 单元格级内联错误标记（目前是底部列表可点击跳转，未在 cell 内直接高亮错误态）。
2. 行/列 hover 高亮（当前未实现矩阵十字辅助高亮）。
3. 编辑器快捷键（如 `Ctrl/Cmd + S` 保存）与 Esc 行为统一策略。
4. Phrase10 联调与端到端回归清单执行（本次仅完成 Phrase9 功能收口）。

