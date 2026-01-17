## 目标
- 默认使用 Multi（序列）模式；点击颜色即应用，不再需要“应用/重置”按钮。
- 去掉步数选项（6/8/10/12）与预览色条；调色盘窗口缩小，沿用气泡的玻璃样式；调色盘默认展开。
- 继续复用 PanelColorSelector 的布局与分组颜色逻辑。

## 设计与变更
- 扩展 PanelColorSelector（可选新 props）：
  - `defaultGroupedMode="sequence"`：让分组模式默认选择 Multi。
  - `defaultExpanded={true}`、`defaultGroupedExpanded={true}`：默认展开，隐藏展开/收起按钮（或保持无交互收起）。
  - `autoApply={true}`：在 `onAccentColorChange` 和 `onGroupedColorsChange` 触发时，直接调用上层提供的 `onApply(palette)` 并关闭面板。
- SimulationActionPlate 调色盘弹层：
  - 移除“应用/重置”按钮与步数芯片和预览行。
  - 面板尺寸：缩小到约 `w=320px, h=220px`，位置上移并靠左，样式沿用 `getGlassPanelStyles({ hovered: true })`。
  - 复用 PanelColorSelector：
    - `panelType="grouped"`。
    - `accentColor={selectedBase}` 与 `onAccentColorChange`：序列应用时以 `PanelColorSelector` 的 sequence 输出。
    - `onGroupedColorsChange={(colors) => onApply(colors)}`：若返回 `colors` 序列则直接应用；若返回 `primary/secondary` 则按现有 `buildColorScaleFromBase` 生成并应用。
  - 应用逻辑（点击颜色即应用）：
    - 计算 `modelKey`（asm1/asm3/asm1slim/materialBalance）。
    - 生成 `palette`（优先序列；否则从 `primary/secondary` 渐变拼接）。
    - `themeStore.setModelPalette(modelKey, selectedScheme, selectedBase, palette.length, palette)`；`themeStore.applyForModel(modelKey, order)`。
    - 关闭调色盘弹层，保持互斥逻辑不变。

## 每页面特征与独立主题
- 保留既有 tint 顺序突出特征（ASM1→asm1，ASM3→asm3，ASM1Slim→asmslim，物料平衡→default），并使用每页面独立存储与恢复的机制（已在各路由挂载时应用）。

## 互斥关闭
- 继续使用现有 mousedown 捕获，点击其他按钮或画布空白关闭调色盘，与其它弹层一致。

## 验证
- 类型检查：`cd frontend; npx tsc --noEmit`。
- 交互验证：
  - 打开调色盘，点击任一颜色立即应用并关闭面板；节点底色、边框、把手与 MiniMap 联动变化。
  - 切换页面后返回，仍保持各自页面独立主题。
  - 面板尺寸与玻璃风格与其他气泡一致。