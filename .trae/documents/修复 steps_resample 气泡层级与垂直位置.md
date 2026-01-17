## 问题概述
- 点击 `steps`/`resample` 时的气泡浮层被面板遮挡，表现为“在面板的下一层”。
- 组件当前将 Portal 容器挂载到 `.react-flow`，该容器存在 `transform`/堆叠上下文，导致 `position: fixed` 元素的层级与定位受影响。
- 现有定位使用按钮中心点 (`getBoundingClientRect()`)，`top` 取 `anchor.y - 8`（见 `SimulationActionPlate.tsx:215–247, 271–303`）。面板整体的 `zIndex=1200`（见 `SimulationActionPlate.tsx:139–148`），气泡 `zIndex=1500` 但仍可能被父级堆叠上下文影响。

## 目标
- 气泡应位于面板之上（层级更高），且垂直位置整体在“面板的 y 轴位置上方”，而非被覆盖。

## 方案
1. 将 Portal 挂载到 `document.body`，避开 `.react-flow` 的堆叠上下文与变换影响；保留 `position="fixed"`。
2. 为面板容器增加 `ref`（如 `panelRef`），通过 `panelRef.current.getBoundingClientRect().top` 获取面板顶部 `panelTop`。
3. 气泡的 `top` 改为依据 `panelTop` 进行定位：`top = Math.max(panelTop - 8, 0)`，从而整体出现在面板上方；`left` 仍以按钮 `anchor.x` 对齐即可。
4. 略微提升气泡 `zIndex`（如 `2000`），确保在页面其它浮层之上。
5. 保留现有圆弧按钮布局与样式，仅调整 Portal 挂载与外层容器定位。

## 具体改动点
- 在面板 Box（应用 `panelStyles` 的元素）上添加 `ref={panelRef}`。
- 移除两处 Portal 的 `container={canvasContainerRef}`，使用默认挂载到 `document.body`。
- 在 `isStepsOpen` 与 `isResampleOpen` 的渲染分支中：
  - 增加 `panelTop = panelRef.current?.getBoundingClientRect().top ?? 0`。
  - 外层浮层 Box 使用：`position="fixed"`, `left=anchor.x`, `top=Math.max(panelTop - 8, 0)`, `zIndex=2000`。

## 验证
- 启动前端预览，依次点击 `steps` 与 `resample`：
  - 气泡不再被遮挡，位于面板上方，交互正常。
  - 浏览器窗口缩放/滚动后定位仍正确（基于 viewport rect）。
  - 其它模型类型（`asm1`/`asm1slim`/`asm3`）与分析弹窗不受影响。

## 影响范围与风险
- 改动仅在 `SimulationActionPlate.tsx`，不会影响全局布局。
- 若页面存在其它极高层级的浮层，`zIndex=2000` 可按需再调整。
- 若后续希望精确贴靠按钮而非面板顶部，可将 `top` 由 `panelTop` 切回 `anchor.y` 并增加负偏移量。