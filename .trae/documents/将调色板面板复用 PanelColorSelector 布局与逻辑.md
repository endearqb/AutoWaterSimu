## 目标
- 在 SimulationActionPlate 的调色板弹层中复用 `PanelColorSelector` 的布局与逻辑，统一颜色选择体验。
- 使用其“基础配色”和“分组配色”两块，驱动当前主题生成（单色渐变/组合/序列），并与每页面独立主题、特征节点优先、节点底色联动保持一致。

## 集成点
- 引入组件：在 `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx` 顶部导入 `PanelColorSelector`。
- 替换当前弹层的色块与预览区域，将其改为嵌入 `PanelColorSelector`，保留底部“应用/重置”按钮。
- 面板尺寸与位置维持扩大与上移（宽≈520px，高≈320px；top 上移）。

## 组件与状态映射
- 传入 props：
  - `panelType`: `'grouped'`（默认显示分组配色），也可带 `basic` 一并渲染；通过组件内部切换 Mono/Multi。
  - `accentColor`: 绑定到当前 `selectedBase`，`onAccentColorChange` 修改 `selectedBase`。
  - `groupedChartColors`：用来接收 `PanelColorSelector` 产生的 `GroupedChartColors`，包括 `primary/secondary` 以及扩展 `colors`。
  - `onGroupedColorsChange`: 当变化时计算生成 `previewPalette`（若 `colors` 存在则直接使用，否则根据 `primary/secondary` 用现有 `buildColorScaleFromBase` 生成两段并合并）。
  - `dataGroupCount`: 映射到当前系列步数（例如 6/8/10），用于序列生成。
  - `onReset`: 触发 `themeStore.reset()` 并关闭面板。
- 保留底部“应用”按钮：将 `selectedScheme/selectedBase/steps(previewPalette.length)` 与当前页面的 tint 顺序一起调用 `themeStore.setModelPalette(modelKey, ...)` 和 `themeStore.applyForModel(modelKey, order)`。

## 每页面特征保留
- 不改动路由挂载时 `applyStoredForModel(...)`。
- 保持 tint 顺序突出：
  - ASM1→`['asm1','input','output','default','asm3','asmslim']`
  - ASM3→`['asm3','input','output','default','asm1','asmslim']`
  - ASM1Slim→`['asmslim','input','output','default','asm1','asm3']`
  - 物料平衡→`['default','input','output','asm1','asm3','asmslim']`

## 互斥与关闭
- 继续使用既有 mousedown 捕获（包含 `themeOverlayRef`），点击其他按钮或画布空白关闭；面板内部按钮互斥逻辑保持一致。

## 验证
- 类型检查：`cd frontend; npx tsc --noEmit`。
- 运行前端，检查每页面：
  - 通过 PanelColorSelector 选择颜色或分组后，预览与应用一致；
  - 应用后仅当前页面主题更新并持久化；
  - 节点底色、边框、把手、MiniMap 联动变化；
  - 点击空白或其他按钮关闭面板。