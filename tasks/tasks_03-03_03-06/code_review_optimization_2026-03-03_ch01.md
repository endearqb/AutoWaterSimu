# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 1. 流程图页面 Bug 排查

---

## 1. 流程图页面 Bug 排查

> 排查目标：用户反馈"流程图页面新建流程图功能失效"

### BUG-1（P0）：Material Balance 页面 BubbleMenu 完全不渲染

**严重度**: P0 — 核心功能完全不可用

**现象**: Material Balance 流程图页面的右键/工具栏菜单（BubbleMenu）不显示，导致"新建流程图"、"保存"、"加载"、"导入导出"等所有操作入口均不可用。

**根因分析**:

1. `frontend/src/stores/flowStore.ts:147` 中初始化 `showBubbleMenu: false`：
   ```ts
   // flowStore.ts:146-147
   showMiniMap: false,
   showBubbleMenu: false,
   ```

2. `frontend/src/components/Flow/FlowLayout.tsx:321-326` 读取该字段并决定是否渲染 BubbleMenu：
   ```tsx
   const flowSnapshot = flowStore() as { showBubbleMenu?: boolean }
   const showBubbleMenu =
     typeof flowSnapshot.showBubbleMenu === "boolean"
       ? flowSnapshot.showBubbleMenu
       : true
   if (!showBubbleMenu) return null
   ```

3. 由于 `flowStore` 中 `showBubbleMenu` 为 `false`（类型为 boolean），`typeof === "boolean"` 检查通过 → 取到 `false` → `return null` → 整个 BubbleMenu 不渲染。

**ASM1/UDM 页面不受影响的原因**:
- ASM1/UDM 使用 `createModelFlowStore` 工厂函数创建的独立 store
- 这些 store 不包含 `showBubbleMenu` 字段
- `typeof undefined !== "boolean"` → 走 fallback `true` → 菜单正常显示

**影响链路**:
```
materialbalance.tsx 传入 BubbleMenuComponent={MaterialBalanceBubbleMenu}
  → FlowLayout.tsx 读取 flowStore().showBubbleMenu
    → 值为 false → return null
      → BubbleMenu（含新建/保存/加载/导入导出）全部不渲染
```

**修复方案**: 将 `frontend/src/stores/flowStore.ts:147` 的 `showBubbleMenu: false` 改为 `showBubbleMenu: true`。

**验收标准**:
- Material Balance 页面 BubbleMenu 正常渲染
- 新建、保存、加载、导入、导出功能均可操作
- ASM1/UDM 页面行为无回归

---

### BUG-2（P1）：ConfirmDialog "在线保存" 后不执行 pending action

**严重度**: P1 — 数据操作中断，用户需重复操作

**现象**: 用户在有未保存内容时点击"新建流程图" → 弹出确认对话框 → 选择"在线保存" → 保存对话框打开并完成保存 → 但新建流程图的操作丢失，用户需要再次点击新建。

**根因分析**:

1. `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx:170-172` 的 `handleConfirmAction` 中，`case "save"` 分支只调用了 `handleOpenSaveDialog()` 打开保存对话框：
   ```tsx
   case "save":
     handleOpenSaveDialog()
     break
   ```

2. 没有在保存完成后执行 `confirmDialog.pendingAction`（原始的"新建流程图"操作）。

3. `finally` 块中 `setConfirmDialog(null)` 清除了整个 confirmDialog 状态（包括 `pendingAction`），导致保存完成后无法继续执行原始操作。

**影响**: 所有通过 ConfirmDialog → "在线保存" 路径触发的 pending action 均丢失，包括：
- 新建流程图 → 保存 → 新建不执行
- 加载流程图 → 保存 → 加载不执行

**修复方案**:
- 在 `handleOpenSaveDialog()` 调用前，将 `confirmDialog.pendingAction` 保存到一个 ref 或闭包中
- 在 save dialog 的 `onClose` 回调中，判断保存成功后执行该 pendingAction
- 或将 pendingAction 作为参数传入 save dialog 组件

**验收标准**:
- 新建流程图 → 确认保存 → 保存完成后自动执行新建
- 加载流程图 → 确认保存 → 保存完成后自动打开加载对话框
- "跳过保存" 和 "导出保存" 路径行为不受影响



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

