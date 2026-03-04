# BUG-3 修复记录：ConfirmDialog "不保存" 和 "导出" 后 pending action 不执行

**日期**: 2026-03-04
**文件**: `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`

## 问题描述

流程图有内容时，点击新建/加载/导入/加载计算数据 → 弹出 ConfirmDialog → 选择"不保存"→ 对话框关闭但不执行对应操作。选择"导出"后文件下载但原始操作也不执行。

## 根因

1. **click-outside 监听器干扰**: `mousedown` 事件监听器在点击 ConfirmDialog 按钮时触发 `setIsOpen(false)`，导致 Portal 中的 DOM 元素被替换，`click` 事件丢失
2. **export 分支不执行 pending action**: `handleConfirmAction` 的 `case "export"` 只导出文件，不调用 `pendingAction`
3. **从 state 闭包读取 pendingAction**: 结合问题 1 的重渲染干扰，存在闭包失效风险

## 修复内容

### 修改 1：click-outside 排除 Dialog 区域（第 135-143 行）

在 `handleClickOutside` 中添加判断，如果点击目标在 `[role='dialog']` 或 `[data-dialog-backdrop]` 内则跳过关闭：

```tsx
if (target.closest("[role='dialog']") || target.closest("[data-dialog-backdrop]")) return
```

### 修改 2：添加 `showConfirmDialog` 辅助函数（第 158-162 行）

统一设置 `pendingActionRef.current` 和 `confirmDialog` state，确保 ref 始终和 state 同步：

```tsx
const showConfirmDialog = (title: string, message: string, action: () => void) => {
  pendingActionRef.current = action
  setConfirmDialog({ isOpen: true, title, message, pendingAction: action })
}
```

替换了 `handleLoadClick`、`handleLoadCalculationData`、`handleNewFlowChartClick`、`handleImportClick` 中的 4 处 `setConfirmDialog({...})` 调用。

### 修改 3：`handleConfirmAction` 从 ref 读取，export 补充执行（第 175-214 行）

- `save` 分支：不再从 `confirmDialog.pendingAction` 赋值给 ref（因为 `showConfirmDialog` 已设置好）
- `export` 分支：导出后调用 `pendingAction?.()` 并清空 ref
- `skip` 分支：从 `pendingActionRef.current` 读取而非 `confirmDialog.pendingAction()`
- `catch` 分支：清空 ref 防止泄漏

## 验证

- `tsc --noEmit` 通过，无类型错误

## 调试日志开关（默认关闭）

- 默认不输出 `confirm-debug` 日志。
- 临时开启（任选其一）：
  - `window.__FLOW_CONFIRM_DEBUG__ = true`
  - `localStorage.setItem("FLOW_CONFIRM_DEBUG", "1")`
- 关闭：
  - `window.__FLOW_CONFIRM_DEBUG__ = false`
  - `localStorage.removeItem("FLOW_CONFIRM_DEBUG")`
- 需要打断点时再开启：
  - `window.__FLOW_CONFIRM_BREAK__ = true`

## 最小回归清单（防回归）

1. ASM/UDM 左下菜单：未保存状态下点“新建” -> Confirm 点“`不保存`”，应立即执行新建。
2. ASM/UDM 左下菜单：未保存状态下点“新建” -> Confirm 点“`导出`”，应先导出再执行新建。
3. ASM/UDM 左下菜单：未保存状态下点“新建” -> Confirm 点“`保存`”并保存成功，应执行新建。
4. ASM/UDM 左下菜单：未保存状态下点“新建” -> Confirm 点“`保存`”后手动关闭保存框，不应执行新建。
5. ASM/UDM 左下菜单：未保存状态下点“导入” -> Confirm 点“`不保存`”，应弹文件选择器。
6. ASM/UDM 左下菜单：未保存状态下点“导入” -> Confirm 点“`导出`”，应导出后弹文件选择器。
7. ASM/UDM 左下菜单：未保存状态下点“导入” -> Confirm 点“`保存`”并保存成功，应提示“请再次点击本地导入继续”，不自动弹文件选择器。
8. ASM/UDM 右侧动作面板：对“新建/导入”重复执行第 1-7 条，行为必须一致。
9. Confirm 打开时快速连续点击按钮，不应出现“无响应或直接关闭且不执行 pending action”。
10. 静态检查：`frontend` 下执行 `npx tsc --noEmit` 必须通过。

## 经验沉淀（本次可复用）

### 1. 现象识别信号

1. “按钮看起来点到了，但动作没执行”，优先怀疑事件链路被中断，而不是业务逻辑本身。
2. 左下菜单与右侧动作面板同时复现，优先排查共享交互模式（全局监听、Dialog 行为），而不是单个入口代码。
3. “像点了窗口外直接关闭”这类体感，通常对应 dismiss 路径提前触发。
4. 控制台 `Violation`（如非被动监听、reflow 慢）多数是性能提示，不直接等同于功能失败根因。

### 2. 根因模型

1. 全局 `mousedown`（尤其 capture）与 Dialog 按钮 `click` 存在竞争，可能先触发关闭导致确认点击链路丢失。
2. `pending action` 放在 state/闭包中，遇到重渲染或提前关闭时容易读到过期值。
3. 关闭语义混杂（确认成功关闭 vs 用户取消关闭）会放大竞态，造成 pending 被提前清理。

### 3. 稳定修复原则

1. `pending action` 用 `ref` 管理，避免闭包失效。
2. 全局外部点击监听在 `confirmDialogOpenRef.current === true` 时必须首行短路。
3. ConfirmDialog 拆分语义：`onConfirm` 与 `onDismiss` 分离，避免混用。
4. `save` 分支不立即执行 pending，统一在保存成功回调里串行执行。
5. `onSaveSuccess` 支持 `Promise` 并 `await`，保证“保存成功后继续”顺序稳定。
6. “保存后继续导入”遵循浏览器限制，采用提示用户二次点击导入作为默认兜底。

### 4. 调试策略

1. 调试日志默认关闭，按需开启（`window.__FLOW_CONFIRM_DEBUG__ = true` 或 `localStorage` 开关）。
2. 重点观察最小链路日志：`showConfirmDialog -> click-* -> handleConfirmAction-start -> ...-after`。
3. 若出现 `dismiss-via-onOpenChange` 且无 `click-*`，可直接判定为走了关闭路径而非确认路径。
4. 需要断点时再打开 `window.__FLOW_CONFIRM_BREAK__ = true`，避免日常噪声。

### 5. 防回归工程化要求

1. 三条入口（BaseBubbleMenu / SimulationActionPlate / legacy BubbleMenu）行为必须同构。
2. 每次改 ConfirmDialog 或全局点击监听后，至少回归“新建/导入 + 不保存/导出/保存后继续”全路径。
3. 保持“最小回归清单”可执行且短小，提交前按清单走一遍。
4. 保留轻量可控的调试开关，避免线上或日常开发日志污染。

### 6. 同类问题快速排查顺序（建议）

1. 先确认是“没进入确认按钮逻辑”还是“进入后 pending 没执行”。
2. 再检查全局 `mousedown/pointerdown` 是否在 Dialog 打开时被正确短路。
3. 最后检查 pending 的存储位置（优先 `ref`）和保存成功回调是否串行 `await`。
