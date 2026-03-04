# ConfirmDialog Debug Playbook

## 目的

这份手册用于排查并修复以下类型问题：

1. ConfirmDialog 点击了按钮但不执行后续动作。
2. ConfirmDialog 看起来“直接关闭”，像走了点窗外关闭逻辑。
3. `不保存 / 导出 / 保存后继续` 在不同入口行为不一致。

适用入口：

1. `BaseBubbleMenu`（左下菜单）
2. `SimulationActionPlate`（右侧动作面板）
3. `BubbleMenu`（legacy）

## 典型现象

1. 按钮有视觉反馈，但 pending action 未执行。
2. 导出成功了，但后续 pending action 没有继续。
3. 点击保存后没有继续动作，或保存框关闭后行为异常。
4. 用户体感是“没选就被关闭了”。

## 常见根因模型

1. 全局 `mousedown` / `pointerdown` 与 Dialog 按钮 `click` 竞争，导致按钮链路被中断。
2. pending action 存在 state/闭包中，重渲染后读取到过期值。
3. `confirm` 与 `dismiss` 语义混用，关闭时过早清理 pending。
4. `save` 成功回调没有串行 `await`，时序不稳定。

## 快速定位顺序（推荐）

1. 先判断是否进入按钮链路：
   - 是否出现 `click-skip / click-export / click-save`
   - 是否出现 `handleConfirmAction-start`
2. 若未进入按钮链路，优先查全局外部点击监听是否在 confirm 打开时短路。
3. 若进入按钮链路但未继续，检查 pending 存储是否为 `ref`，以及 save 成功回调是否串行执行。

## 调试日志开关

默认关闭，按需开启。

开启：

```js
window.__FLOW_CONFIRM_DEBUG__ = true
// 或
localStorage.setItem("FLOW_CONFIRM_DEBUG", "1")
```

关闭：

```js
window.__FLOW_CONFIRM_DEBUG__ = false
localStorage.removeItem("FLOW_CONFIRM_DEBUG")
```

需要断点时：

```js
window.__FLOW_CONFIRM_BREAK__ = true
```

## 稳定修复策略

1. pending action 统一用 `ref` 保存（不要依赖 state 闭包）。
2. 增加 `confirmDialogOpenRef`，全局外部点击监听首行短路：
   - `if (confirmDialogOpenRef.current) return`
3. ConfirmDialog 明确区分：
   - `onConfirm`: 执行确认动作
   - `onDismiss`: 仅处理取消/关闭
4. `save` 分支只打开保存框，不立即执行 pending。
5. `onSaveSuccess` 中再执行 pending，并在调用链上 `await onSaveSuccess?.()`。
6. 导出失败不继续 pending。
7. “保存后继续导入”遵循浏览器限制：提示用户再点一次导入，不自动弹文件选择器。

## 最小回归清单

1. 新建 -> Confirm -> `不保存`：应立即执行新建。
2. 新建 -> Confirm -> `导出`：应先导出再执行新建。
3. 新建 -> Confirm -> `保存` 且保存成功：应执行新建。
4. 新建 -> Confirm -> `保存` 后手动关闭保存框：不应执行新建。
5. 导入 -> Confirm -> `不保存`：应弹文件选择器。
6. 导入 -> Confirm -> `导出`：应导出后弹文件选择器。
7. 导入 -> Confirm -> `保存` 且保存成功：应提示“再点一次导入”，不自动弹选择器。
8. 左下菜单与右侧动作面板都要覆盖 1-7，行为一致。
9. Confirm 打开时快速连续点击，不应无响应或误关闭。
10. `frontend` 执行 `npx tsc --noEmit` 通过。

## 涉及代码位点（本项目）

1. `frontend/src/components/Flow/menu/ConfirmDialog.tsx`
2. `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`
3. `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
4. `frontend/src/components/Flow/menu/BubbleMenu.tsx`
5. `frontend/src/components/Flow/menu/BaseDialogManager.tsx`
6. `frontend/src/utils/confirmDebug.ts`

## 反模式（避免）

1. 在 confirm 打开时仍让全局 capture 监听参与关闭逻辑。
2. 从 `confirmDialog` state 直接取 `pendingAction()` 执行。
3. 在 `save` 点击时立即执行 pending。
4. 在 `onCloseSaveDialog` 中执行 pending（应只负责关闭和清理）。

## 完成标准

满足以下三条即可视为修复完成：

1. 功能：`不保存 / 导出 / 保存后继续` 三条链路在各入口一致可用。
2. 稳定：快速点击、重复打开关闭不出现偶发失效。
3. 工程：回归清单通过，`tsc --noEmit` 通过，调试日志默认关闭。

