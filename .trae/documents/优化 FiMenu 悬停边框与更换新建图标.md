## 目标
- 主菜单 `FiMenu` 悬停时按钮边框与光晕效果与面板其他按钮一致（强调色轮廓、发光、文字保持现有展开动画）。
- 将“新建流程图”的气泡按钮图标改为 `FiFile`，更符合语义。

## 实现
- 在 `SimulationActionPlate.tsx` 的 `bubbleTriggerStyles` 增加 `_hover` 与 `_focusVisible`，采用与 `getBubbleButtonStyles` 相同风格：悬停时背景为 `accentColor`、文字白色、轮廓与发光基于 `accentColor`。
- 在气泡按钮配置中，将新建项的 `icon` 从 `FiMenu` 改为 `FiFile`，并在顶部导入增加 `FiFile`。
- 运行类型检查确保无误。

## 验证
- 悬停主菜单按钮时边框与光晕显著变化，对齐其他按钮的视觉反馈。
- 悬停标签与气泡按钮文字显示保持现有展开动画；点击行为不变。
- 类型检查通过。