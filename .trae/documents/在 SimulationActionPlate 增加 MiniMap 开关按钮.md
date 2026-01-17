**目标**

* 扩大节点 hover 判定范围（比节点略大）

* 当鼠标移出判定范围后，连接点延时消失

**实现思路**

* 画布级指针检测：在画布捕获鼠标位置，基于每个节点的 DOM 边界框，使用“外扩 padding”判断是否处于 hover 范围，不改变节点实际尺寸与拖拽行为。

* 节点级延时状态：节点根据全局 hoveredNodeId 决定是否处于 hover；当从 hover→非 hover 时，保持连接点显示一段时间后再隐藏。

**改动文件**

* `frontend/src/components/Flow/FlowCanvas.tsx`

* `frontend/src/components/Flow/nodes/utils/glass.ts`

* 所有节点组件（示例）：

  * `frontend/src/components/Flow/nodes/DefaultNode.tsx`

  * `frontend/src/components/Flow/nodes/InputNode.tsx`

  * `frontend/src/components/Flow/nodes/OutputNode.tsx`

  * 以及 ASM1/ASM3/ASMSlim/CashWallet/GoalProgress/TrafficStats 等同类文件

**具体修改点**

* Flow 画布：`frontend/src/components/Flow/FlowCanvas.tsx`

  * 引入 hover 管理（上下文或局部状态），在外层 `Box` 或 `ReactFlow` 上添加 `onMouseMove`，实时检测鼠标是否落在任意节点的“扩展判定框”内：

    * 读取节点 DOM：通过 `.react-flow__node[data-id="<nodeId>"]` 获取每个节点元素，使用 `getBoundingClientRect()`。

    * 外扩判定：将矩形四边分别外扩 `pad` 像素（例如 8px），若鼠标坐标在扩展矩形内则认为 hover。

    * 状态输出：设置 `hoveredNodeId`；如果不在任何扩展矩形内，置为 `null`。

  * 参考插入位置：在 `Box` 容器定义处添加事件（`FlowCanvas.tsx:145-160`），并在 `ReactFlow` 外包裹一个提供 `hoveredNodeId` 的 Context（保持当前结构；不影响现有 `onNodeClick/onPaneClick`）。

* 样式工具：`frontend/src/components/Flow/nodes/utils/glass.ts`

  * 增加可配置常量，例如：

    * `export const NODE_HOVER_PAD_PX = 8`（用于 hover 判定外扩像素）

  * 现有句柄样式的透明度渐变已存在（`getHandleStyle`，`glass.ts:172-185`）；延时消失通过节点状态控制，不需更改此处。

* 节点组件（以 DefaultNode 为例）：`frontend/src/components/Flow/nodes/DefaultNode.tsx`

  * 替换 hover 来源：将 `isHovered` 从本地的 `onMouseEnter/onMouseLeave` 切换为“画布级 hoveredNodeId === id”。

    * 变更位置：`DefaultNode.tsx:31`（`handlesVisible` 计算）、`DefaultNode.tsx:65-67`（容器的 `hovered` 传值）、移除或保留 `DefaultNode.tsx:77-79` 的鼠标事件，改由全局 hover 控制。

  * 新增延时隐藏逻辑：

    * 新增 `const [showHandles, setShowHandles] = useState(false)`；当 `hovered || selected` 为真时立即 `setShowHandles(true)`。

    * 当两者都为假时，启动 `setTimeout(() => setShowHandles(false), HIDE_DELAY_MS)`（例如 250ms），并在重新 hover 时清除定时器。

    * 将 `handlesVisible` 改为 `showHandles`（原位于 `DefaultNode.tsx:31`）。

  * 其它节点同样调整：

    * `InputNode.tsx:31`、`InputNode.tsx:77-79`

    * `OutputNode.tsx:31`、`OutputNode.tsx:77-79`

    * 其余节点文件按相同模式将 `handlesVisible = isHovered || !!selected` 改为延时可见状态，并使用全局 hover 判断。

**参数**

* 判定范围：`NODE_HOVER_PAD_PX` 默认 8，可按需调整。

* 消失延时：`HIDE_DELAY_MS` 建议 200–300ms，默认 250ms。

**验证步骤**

* 在前端启动后，将鼠标移近节点边缘（距边界小于 `NODE_HOVER_PAD_PX`），连接点出现。

* 鼠标移出扩展判定范围，连接点在 `HIDE_DELAY_MS` 后淡出隐藏。

* 保持现有交互：节点拖拽、选中、编辑、连线不受影响。

* 运行类型检查：`cd frontend; npx tsc --noEmit`。

**注意事项**

* 不改变节点实际占位尺寸与布局；仅通过画布级事件实现“判定范围”扩展。

* 建议对 `onMouseMove` 进行 `requestAnimationFrame` 节流，避免频繁计算。

* 若部分节点内容动态导致尺寸变化，维持现有 `useHandlePositionSync`（`useHandlePositionSync.ts:4-11`）即可同步句柄位置。

