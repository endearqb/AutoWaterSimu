## 目标
- 将两个 Popover 的定位边界从 `body` 改为 React Flow 画布根节点，以在画布层上定位且不撑大父组件。
- 保持“向上弹出”，并采用透明无边框、圆弧排列选项的布局。

## 边界选择
- 项目中 React Flow 根节点类名为 `.react-flow`（Canvas/FlowCanvas 里已有样式对该类操作）。
- 使用 Chakra v3 Popover 的 `positioning.boundary` 接受元素或返回元素的函数：设置为 `() => document.querySelector('.react-flow') || document.body`，在类名不存在时回退到 `body`。

## 实现步骤
1. 在 `SimulationActionPlate.tsx` 中为两个 Popover 的 `Popover.Root` 增加定位策略：
   - `positioning={{ placement: 'top', strategy: 'fixed', overlap: true, fitViewport: true, boundary: () => document.querySelector('.react-flow') || document.body }}`。
2. 设置弹层为透明无边框：
   - `Popover.Content`：`bg="transparent"`、`borderWidth={0}`、`boxShadow="none"`、去除模糊，设置 `zIndex={1500}` 以确保在画布上方。
3. 圆弧布局：
   - 在 `Popover.Content` 内放置相对定位容器（例如 `steps`：`w="160px" h="96px"`；`resample`：`w="140px" h="88px"`）。
   - 使用辅助函数 `computeArcPositions(count, startDeg, endDeg, radius, cx, cy)` 计算弧线上各按钮位置，并用 `position="absolute" left/top + translate(-50%, -50%)` 摆放。
   - 角度建议：`steps` 在 200°→340° 均匀分布；`resample` 在 240° 与 300°。半径 60–80 可按视觉微调。
4. 交互保持不变：
   - 点击选项调用 `validateAndUpdateParameters` 更新对应参数；按钮激活态沿用 `getToggleButtonStyles`。

## 代码变更点
- 文件：`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
- 修改两个 `Popover.Root positioning` 配置；调整两个 `Popover.Content` 样式；新增一个组件内的 `computeArcPositions` 函数并用于 `steps/resample` 的选项布局。

## 验证
- 类型检查：`cd frontend; npx tsc --noEmit`。
- 开发预览：
  - 点击 `steps`/`resample`，观察弹层位于按钮上方，内容透明无边框。
  - 弹层不撑大父组件；滚动或拖动画布时定位正常（固定策略 + 画布边界）。
  - 选项点击后参数更新与按钮激活态正确。

## 备用方案
- 若后续将画布根节点类名变更，可把 `.react-flow` 替换为统一的容器 `id` 或通过 `ref` 传递。
- 如遇到弹层被裁剪，可进一步提高 `zIndex` 或在画布容器上设置允许溢出显示。