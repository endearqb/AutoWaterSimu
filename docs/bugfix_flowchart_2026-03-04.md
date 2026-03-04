# 流程图页面 Bug 修复记录 - 2026-03-04

## 修复概览

修复了流程图页面两个 Bug，恢复新建流程图等核心功能。

## BUG-1：Material Balance 页面 BubbleMenu 不渲染 (P0)

**文件**: `frontend/src/stores/flowStore.ts:147`

**根因**: `showBubbleMenu` 初始化为 `false`，导致 FlowLayout 中 BubbleMenu 不渲染。

**修复**: 将 `showBubbleMenu: false` 改为 `showBubbleMenu: true`。

## BUG-2：ConfirmDialog pending action 丢失 (P1)

**文件**: `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`

**根因**: `handleConfirmAction` 的 `case "save"` 分支打开保存对话框后，`finally` 块 `setConfirmDialog(null)` 清除了 `pendingAction`，导致保存完成后无法继续执行原始操作。

**修复**:
1. 添加 `useRef` import 和 `pendingActionRef` 用于持久存储 pending action
2. `case "save"` 中先将 `confirmDialog.pendingAction` 存入 ref
3. `onCloseSaveDialog` 回调中，关闭对话框后检查并执行 ref 中的 pending action，然后置空

## 验证

- `tsc --noEmit` 通过，无类型错误
