## 目标与原则
- 在 `SimulationActionPlate` 面板底部左下角加入一个“菜单”主按钮，点击后展开 6 个气泡按钮，功能与现有画布左下角 BubbleMenu 保持一致。
- 去重：原有画布左下角 BubbleMenu 改为受控开关，默认不渲染，通过 `flowStore().showBubbleMenu` 控制。
- 复用现有对话框与服务逻辑（在线保存/加载、加载计算数据），避免重复实现。

## 涉及位置
- `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`：新增左下角菜单主按钮与 6 个气泡按钮，以及关联对话框。
- `frontend/src/components/Flow/FlowLayout.tsx:271-281`：渲染 BubbleMenu 的位置改为受控，读取 `flowStore().showBubbleMenu`。
- `frontend/src/stores/flowStore.ts:112-114, 277-282`：已存在 `showBubbleMenu`（默认 false）与 setter，不修改。
- 参考复用：
  - `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`（功能与交互逻辑完整）
  - `frontend/src/components/Flow/menu/ASM1BubbleMenu.tsx`（对话框配置示例）

## 具体实现
### 1) 面板内主按钮与气泡布局
- 在 `SimulationActionPlate` 面板容器内左下角加入主按钮（`FiMenu`），`pointerEvents="auto"`。
- 点击主按钮后，通过 `Portal` 在面板相对位置弹出 6 个气泡按钮，使用现有 `getBubbleButtonStyles` 与 `computeArcPositions` 辅助方法实现环形/扇形排布。
- 6 个气泡与功能映射：
  - `FiPlus`：新建流程图 → `flowStore().newFlowChart()`，并在需要时弹确认对话框。
  - `FiDownload`：本地导出 → 使用 `flowStore().exportFlowData()` 生成 JSON，创建 Blob + `a` 标签下载（与 BaseBubbleMenu 保持一致行为）。
  - `FiUpload`：本地导入 → 触发文件选择框，`flowStore().importFlowData()`，并设置 `currentFlowChartName`（同 BaseBubbleMenu）。
  - `FiSave`：在线保存 → 打开保存对话框。
  - `FiFolder`：在线加载 → 打开加载对话框。
  - `FiDatabase`：加载计算数据 → 打开“加载计算数据”对话框。
- 动画与交互：沿用 `fadeInUp`/`fadeOutUp`；点击面板/画布空白区域关闭。

### 2) 复用对话框与数据加载
- 在 `SimulationActionPlate` 中引入并挂载：
  - `BaseDialogManager`：控制在线保存/加载两个对话框，传入 `flowStore` 与对应 `modelStore`。
  - `BaseLoadCalculationDataDialog`：加载计算结果数据，按 `ASM1BubbleMenu` 的配置示例传入 `renderResultSummary` 等。
- 对话框触发条件：由气泡按钮控制 `isSaveDialogOpen`、`isLoadDialogOpen`、`isLoadCalculationDataDialogOpen` 三个本地状态。
- 兼容多模型：依据 `props.modelType` 与 `props.modelStore` 注入对应 Store，保证 ASM1/ASM1Slim/ASM3 复用。

### 3) 去重控制（默认不渲染原 BubbleMenu）
- 修改 `FlowLayout.tsx` 渲染逻辑：
  - 读取 `const { showBubbleMenu } = flowStore();`
  - 仅当 `showBubbleMenu` 为 `true` 时渲染 `BubbleMenuComponent`/`BubbleMenu`，否则跳过。
- 初始值已为 `false`，因此默认不渲染旧位置菜单。

### 4) 类型与样式一致性
- 保持 Chakra UI v3 API；沿用 `getGlassNodeStyles`/`getGlassPanelStyles` 主题风格与当前面板色彩（`accentColor`）。
- 组件内尽量使用已经存在的样式方法与动画定义，避免引入新依赖。

### 5) 验证与运行
- 类型检查：`cd frontend; npx tsc --noEmit`。
- 本地预览：`cd frontend; npm install; npm run dev`，打开页面验证：
  - 面板左下角主按钮展开与关闭动画正常。
  - 6 个气泡按钮触发行为与现有 BubbleMenu 一致（含确认对话框与在线保存/加载对话框）。
  - 原画布左下角 BubbleMenu 默认不可见；将 `flowStore().setShowBubbleMenu(true)` 后可恢复旧位置渲染以对比。

## 代码引用
- 面板样式与工具方法：`frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx:102-110, 141-161, 764-772`
- 旧 BubbleMenu 渲染位置：`frontend/src/components/Flow/FlowLayout.tsx:271-281`
- BubbleMenu 功能与交互参考：`frontend/src/components/Flow/menu/BaseBubbleMenu.tsx:274-466`
- ASM1 菜单对话框配置示例：`frontend/src/components/Flow/menu/ASM1BubbleMenu.tsx:141-180`
- 受控开关（现成）：`frontend/src/stores/flowStore.ts:112-114, 277-282`

## 变更摘要
- 在 `SimulationActionPlate` 面板内新增菜单主按钮与 6 个气泡功能按钮，并挂载已有保存/加载/计算数据对话框。
- 将旧 BubbleMenu 改为受控渲染，默认关闭，避免重复显示。