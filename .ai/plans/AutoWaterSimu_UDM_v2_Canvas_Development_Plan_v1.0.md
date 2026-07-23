# AutoWaterSimu UDM v2 画布 UI/UX 与多边路由开发方案 v1.0

> **状态**：Ready for Development  
> **适用仓库**：`endearqb/AutoWaterSimu`  
> **目标分支基线**：`codex/udm-v2-frontend-split`  
> **审查基线 HEAD**：`61e2259d5f8f6310cf7cd7ab43230de388a7501e`  
> **目标页面**：`/udm-v2`  
> **参考页面**：legacy `/udm`  
> **来源**：合并并修正以下两份方案  
> - `AutoWaterSimu_UDM_v2_ReactFlow_UIUX_Review_and_Edge_Routing_Plan.md`
> - `udm-v2-canvas-alignment-plan.md`
>
> **仓库操作声明**：本文档只定义实施方案和参考代码，不包含 commit、push 或 Pull Request 操作。

---

## 0. 文档约定

本文使用以下约束级别：

- **MUST**：进入 v1.0 必须满足，否则不能验收。
- **SHOULD**：应在 v1.0 完成；若延期，必须记录原因和替代措施。
- **MAY**：可选增强，不阻塞 v1.0。
- **DEFERRED**：明确不进入 v1.0，避免范围膨胀。

本文代码是与当前仓库结构匹配的实现参考。落地时以仓库实际 TypeScript、Chakra UI v3、`@xyflow/react@12.8.2` 类型检查结果为准。

---

# 1. 最终结论与冻结决策

## 1.1 核心判断

当前 v2 与 v1 的差异不是单纯的颜色、圆角或线宽差异，而是编辑器架构不同：

```text
v1:
全屏画布
+ 浮动可折叠工作台
+ 选择后滑入的 Inspector
+ 低噪声节点与连接线
+ Hover/Selected 才显示 Handle

v2 当前:
页面标题
+ 顶部横向按钮组
+ 带边框画布
+ 常驻右侧 Inspector
+ 永久底部状态栏
+ 独立 Node Palette / Edge Selector
```

v1.0 的目标是：

> **复刻 v1 的认知模型、画布占比和交互节奏，同时保留 v2 的四类连接线、独立 store、独立 serializer 和 hard isolation。**

## 1.2 冻结的设计决策

| 编号 | 决策 | 状态 |
|---|---|---|
| D1 | v2 不得 import `frontend/src/components/Flow/**`、legacy store 或 legacy UDM service | MUST |
| D2 | 同一逻辑 Handle 上的多条边使用“端点车道 + fan-out/fan-in”解决 | MUST |
| D3 | 车道表通过 feature-local Context 提供，不写入 edge data、store 或合同 | MUST |
| D4 | marker、interaction width 等视觉属性只在 render copy 中派生 | MUST |
| D5 | 路径必须从真实 source Handle 开始，并在真实 target Handle 结束 | MUST |
| D6 | 新端口使用 canonical `port_kind`，四类边按严格能力矩阵连接 | MUST |
| D7 | UI 连接校验和导入后的 semantic validation 共用同一语义规则 | MUST |
| D8 | Toolbar、Node Palette、Edge Selector 合并为一个浮动工作台 | MUST |
| D9 | Inspector 改为选择后滑入式，不再永久占据画布宽度 | MUST |
| D10 | Edge label 默认低噪声，仅 selected 或 custom label 时显示 | MUST |
| D11 | `portId@index` 物理子锚点方案不进入 v1.0 | DEFERRED |
| D12 | 全局障碍规避、自动布线、edge bundling 不进入 v1.0 | DEFERRED |

## 1.3 v1.0 的成功标准

完成后，用户应明显感受到：

1. v2 的工作区和操作节奏接近 v1；
2. 四类边的颜色、线型、箭头和字段含义清晰；
3. 同一 source 或 target Handle 上 2–10 条边在端点走廊不再长期共线；
4. 每条边都能独立点击、选择和编辑；
5. Signal、Settling、Hydraulic、Pump 不再连接到错误端口；
6. 保存和导出数据中不出现 lane、marker、hover 等渲染状态；
7. v1 页面和 legacy store 不受影响。

---

# 2. 范围与非目标

## 2.1 v1.0 范围

### 画布

- 全屏编辑器壳层；
- 20 px 点阵背景；
- 5 px 子网格吸附；
- Controls 左下；
- MiniMap 右下；
- 明确的 node/edge 单选互斥行为；
- 点击空白清除选择；
- 桌面端 Delete 删除；
- 响应式画布和面板布局。

### 节点

- feature-local 玻璃视觉；
- selected 使用 outline，不改变节点尺寸；
- Hover、Selected 或正在连线时显示 Handle；
- 双击节点标题内联编辑；
- canonical port kind；
- 兼容端口高亮，不兼容端口不可落线。

### 边

- 四类边统一视觉 token；
- render-only 箭头；
- endpoint lane；
- fan-out/fan-in；
- 足够的点击热区；
- selected/custom label；
- Hydraulic/Pump/Signal 的可选内联编辑；
- edge type 与 edge kind 同步。

### 编辑器外壳

- 浮动工作台；
- 可折叠、可锁定，SHOULD 支持拖动；
- 侧滑 Inspector；
- compact 状态 overlay；
- Load Dialog；
- i18n；
- diagnostics 与 graph-level constraints 分层。

### 工程质量

- 单元测试；
- serializer 测试；
- semantic validation 测试；
- Playwright 交互测试；
- screenshot regression；
- hard isolation 检查；
- 100 节点 / 300 边的基础性能走查。

## 2.2 非目标

以下内容不进入 v1.0：

- v1 与 v2 共享组件抽象；
- 修改 legacy `/udm` 画布；
- 物理多插槽端口；
- edge bundling；
- 全局 obstacle-aware router；
- 自动拓扑布局；
- 自环边；
- undo/redo；
- 多人实时协作；
- 合同版本升级。

---

# 3. 当前差距与优先级

| 优先级 | 问题 | 当前影响 | v1.0 处理 |
|---|---|---|---|
| P0 | 同一 Handle 多边共线 | 四类边互相遮挡，无法独立识别 | endpoint lane + fan-out/fan-in |
| P0 | 端口语义过宽 | 错误连接只能晚到 validate 才发现 | canonical `port_kind` + capability matrix |
| P0 | `edge_kind` 与 `edge.type` 可能漂移 | renderer 与业务语义不一致 | store 更新时原子同步 |
| P1 | 固定三段式布局 | 画布长期被标题、右栏、底栏压缩 | 全屏 editor shell |
| P1 | 三个工具入口碎片化 | 操作区域分散、视觉占用大 | 单一浮动工作台 |
| P1 | Handle 常显 | 节点视觉噪声高 | hover/selected/connecting 渐进显示 |
| P1 | Label 永久显示 | 中型图即拥挤 | selected/custom 才显示 |
| P1 | 边无统一箭头 | 流向和控制方向不直观 | render-only `ArrowClosed` |
| P2 | `window.prompt` Load | 可访问性和错误恢复差 | Load Dialog |
| P2 | 文案硬编码英文 | 与项目 i18n 不一致 | feature i18n keys |
| P2 | selection 也会令 dirty | 仅点击元素就显示未保存 | 过滤非持久 change |
| P2 | `Date.now()` edge id | 快速创建可能碰撞 | `crypto.randomUUID()` |
| P3 | 缺少视觉回归 | UI 改造后风险不可控 | Playwright screenshots |

---

# 4. 目标 UI/UX 规格

## 4.1 页面结构

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  浮动工作台                                                              │
│  [UDM v2] [图名] [dirty] [Nodes] [Connections] [Validate] [Submit] [⋯]  │
│  [锁定] [折叠]                                                           │
│                                                                          │
│                         React Flow 全屏画布                               │
│                                                                          │
│                                                                          │
│ [Controls]       [状态 / diagnostics overlay]             [MiniMap]      │
│                                                   ┌───────────────────┐  │
│                                                   │ Inspector Drawer  │  │
│                                                   │ Element / Graph   │  │
│                                                   └───────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## 4.2 画布契约

- MUST 占满编辑器容器。
- MUST 使用 `BackgroundVariant.Dots`。
- MUST 使用 20 px 背景网格、5 px snap grid。
- MUST 使用 `fitViewOptions={{ padding: 0.15, maxZoom: 1 }}`。
- MUST 支持 `minZoom=0.1`、桌面 `maxZoom=2`。
- MUST 在 pane click 时清空 node 和 edge selection。
- MUST 通过 `onNodeClick` / `onEdgeClick` 保持两类选择互斥。
- MUST 只启用 `Delete` 作为删除快捷键；v1.0 不启用 Backspace，避免输入框内误删元素。
- SHOULD 在移动端关闭框选和双击缩放。
- SHOULD 恢复保存的 viewport；没有 viewport 时才 fit view。

## 4.3 浮动工作台

### 高频动作

始终可见：

- 图名；
- dirty 状态；
- 当前连接类型；
- Save；
- Validate；
- Submit；
- 折叠按钮。

### 工作区

```text
Nodes:
Boundary | Reactor | Clarifier | Splitter | Controller

Connections:
Hydraulic | Pump | Settling | Signal
```

### 低频动作

放入 `⋯` 菜单：

- New；
- Save As；
- Load；
- Import JSON；
- Export JSON；
- MiniMap 开关。

### 行为

- MUST 可折叠。
- MUST 可锁定。
- SHOULD 可拖动。
- 外层 overlay MUST `pointer-events: none`，实际面板 MUST `pointer-events: auto`。
- 拖动位置、折叠和锁定状态若保存，必须进入 user preference/local storage，而不是 graph payload。

## 4.4 Inspector

- 默认关闭。
- 选中 node 或 edge 后自动打开。
- pane click 后自动关闭，除非用户固定。
- 宽度基线 360 px。
- 画布区域通过 `right` 动画缩小，不使用“100% width + margin-right”造成溢出。
- 内容分为：
  - `Element`：当前 node/edge 字段；
  - `Diagnostics`：当前元素诊断；
  - `Graph`：flow constraints、全图 validation。
- Graph-level 内容不得永久堆在每个元素字段下方。

## 4.5 节点

- 基础尺寸与 20 px 网格对齐。
- 使用半透明 tint、blur 和 v1 同类阴影。
- selected 使用 2 px outline 和 2 px offset。
- Hover 只增强阴影，不做位移动画。
- Handle 尺寸 8 px，位于节点边缘外约 9 px。
- Handle 显示条件：

```text
selected
OR hovered
OR connectionInProgress
```

- 不兼容 active edge kind 的 Handle：
  - opacity 低；
  - pointer events 禁用；
  - cursor 显示不可用。
- 节点标题双击编辑：
  - Enter 保存；
  - Escape 取消；
  - blur 保存；
  - 修改后调用 `useUpdateNodeInternals(id)`。
- Handle 隐藏只使用 opacity/pointer events，禁止 `display:none`。

## 4.6 边

| 类型 | 颜色 | 线型 | 箭头 | 默认标签 |
|---|---|---|---|---|
| Hydraulic | `#2563eb` | 实线 | ArrowClosed | `Q {value} {unit}` |
| Pump | `#b45309` | `10 3` 或实线 | ArrowClosed | `Pump Q {value} {unit}` |
| Settling | `#15803d` | `6 4` | ArrowClosed | `J_TSS` |
| Signal | `#7c3aed` | `1 6` | 小 ArrowClosed | signal name |

边的共同规则：

- normal stroke：1.25–1.5 px；
- selected stroke：2.75–3 px；
- interaction width：18 px；
- stroke linecap/linejoin：round；
- selected edge 置于更高层；
- 默认不展示自动生成 label；
- selected 时展示自动生成 label；
- custom `data.ui.label` 始终展示；
- label 使用 routed path 的坐标；
- Hydraulic/Pump label 可编辑 flow value；
- Signal label 可编辑 signal name；
- Settling 参数继续在 Inspector 中编辑。

---

# 5. 多边防重叠最终算法

## 5.1 问题定义

端点分两种情况：

### 多个不同逻辑端口位于同一节点边

继续使用多个唯一 Handle ID，并沿节点 side 均匀分布。当前 v2 的：

```text
(index + 1) / (sidePorts.length + 1)
```

可以保留。

### 多条边共用同一逻辑端口

这是 v1.0 要解决的主要问题。分组键：

```text
source group = sourceNodeId + sourceHandleId
target group = targetNodeId + targetHandleId
```

每个 endpoint group 独立分配视觉车道。

## 5.2 车道排序

稳定顺序：

1. edge kind priority；
2. 对端 node ID；
3. 对端 handle ID；
4. edge ID。

kind priority：

```text
hydraulic → pump → settling → signal
```

为让主要工艺流更靠近中心，不直接把排序结果映射为从负到正的线性位置，而使用“中心向外”的 slot 顺序。

四条边的几何 offset 是：

```text
-18, -6, +6, +18
```

按中心向外分配后，优先级顺序得到：

```text
hydraulic → -6
pump      → +6
settling  → -18
signal    → +18
```

这使 hydraulic/pump 更接近中心，signal 更容易保持在外侧。

## 5.3 车道公式

基础间距：

```text
nominalSpacing = 12 px
maxEndpointSpan = 56 px
spacing = min(nominalSpacing, maxEndpointSpan / (count - 1))
offset(i) = (i - (count - 1) / 2) × spacing
```

单条边：

```text
count = 1 → offset = 0
```

高密度时自动压缩：

```text
10 条边 → spacing ≈ 6.22 px
```

## 5.4 路径几何

路径必须包含：

```text
真实 source Handle
→ source fan-out anchor
→ SmoothStep 中段
→ target fan-in anchor
→ 真实 target Handle
```

不能把“平移后的坐标”直接作为 SVG path 起点，否则边会与真实 Handle 脱节。

### 方向定义

对于 Left/Right：

- normal 方向改变 X；
- lane offset 改变 Y。

对于 Top/Bottom：

- normal 方向改变 Y；
- lane offset 改变 X。

### 路径连续性

每条路径：

- 第一条命令 MUST 是真实 source 坐标；
- 最后一段 MUST 到达真实 target 坐标；
- 除真实 Handle 点外，同 endpoint group 的边 SHOULD 立即分开。

## 5.5 可保证与不可保证

v1.0 保证：

- endpoint corridor 不长期重叠；
- 完全平行的同端点多边拥有不同 path；
- source-only 和 target-only 多边都能分道；
- lane 分配稳定；
- 删除边后剩余边重新居中。

v1.0 不保证：

- 任意节点布局下全局无交叉；
- 自动绕开所有节点；
- 自环边；
- 最短路径；
- 电路 CAD 级布线。

验收用语必须是“端点走廊分离”，不能写“全程绝对无重叠”。

## 5.6 高密度降级

当同一 Handle 超过 8–10 条边：

1. 压缩 spacing；
2. 非选中边降低 opacity；
3. label 仅 selected/custom 显示；
4. 选中节点时突出相邻边；
5. 对真实高扇出业务建议插入 Splitter/Junction；
6. 只有产品明确要求物理插槽时，才重新评估子 Handle。

---

# 6. 端口语义与连接规则

## 6.1 Canonical Port Kind

新端口的规范类型：

```ts
export type NetworkV2PortKind =
  | "hydraulic_in"
  | "hydraulic_out"
  | "settling_in"
  | "settling_out"
  | "signal_in"
  | "signal_out"
```

迁移期可保留旧 `role`：

```ts
export type NetworkV2PortRole =
  | "inlet"
  | "outlet"
  | "signal_in"
  | "signal_out"
```

最终 `port_kind` 是合同语义，`placement` 是 UI 几何，二者不能混用。

## 6.2 默认能力矩阵

| source | target | 允许 edge kind |
|---|---|---|
| `hydraulic_out` | `hydraulic_in` | hydraulic、pump |
| `settling_out` | `settling_in` | settling |
| `signal_out` | `signal_in` | signal |

不允许：

- `signal_out → hydraulic_in`；
- `hydraulic_out → signal_in`；
- `signal_in` 作为 source；
- `signal_out` 作为 target；
- settling edge 连接 generic hydraulic port；
- 自连接。

## 6.3 兼容迁移顺序

严格规则不能一次性先于数据迁移启用。正确顺序：

1. 增加可选 `port_kind` 和 normalizer；
2. 更新 node factory；
3. 更新 contract importer；
4. 更新 serializer；
5. 更新 fixtures；
6. 更新 semantic validation；
7. 启用严格 UI connection rule；
8. 测试全部通过后将 `port_kind` 改为 required；
9. 后续版本再移除 legacy `role`。

---

# 7. 状态与持久化边界

## 7.1 Graph payload 应保存

- nodes；
- edges；
- node positions；
- source/target Handle；
- edge kind 和业务字段；
- graph name/version；
- flow constraints；
- viewport（产品决定是否恢复）；
- 用户明确设置的 custom label；
- node UI placement/collapsed 等已定义的稳定 metadata。

## 7.2 Graph payload 不得保存

- lane index、count、offset；
- fan-out anchor；
- marker config；
- interaction width；
- hover；
- connection preview；
- label 当前因 selected 而可见；
- Inspector 打开状态；
- toolbar dragging 状态；
- CSS 视觉 token。

## 7.3 User preference 可保存

以下值可进入 local storage 或用户偏好 API：

- toolbar position；
- toolbar collapsed；
- toolbar locked；
- inspector pinned；
- MiniMap show/hide；
- 工作台 tab。

不得放入 `network_process_graph.v1`。

## 7.4 最终数据流

```text
Zustand persistent edges
        │
        ├── useMemo(computeEdgeLanes) ──────> EdgeLaneContext
        │
        └── useMemo(decorateEdgeVisuals) ───> renderedEdges
                                                │
                                                ▼
                                           ReactFlow
```

Lane 不进入 edge data；marker 只进入 render copy。

---

# 8. 建议目录与文件变更

## 8.1 新增

```text
frontend/src/features/udm-v2/theme/networkV2Theme.ts
frontend/src/features/udm-v2/interaction/NetworkV2InteractionContext.tsx

frontend/src/features/udm-v2/edges/edgeVisuals.ts
frontend/src/features/udm-v2/edges/edgeLanes.ts
frontend/src/features/udm-v2/edges/EdgeLaneContext.tsx
frontend/src/features/udm-v2/edges/renderEdgeVisuals.ts
frontend/src/features/udm-v2/edges/connectionRules.ts

frontend/src/features/udm-v2/nodes/portKinds.ts

frontend/src/features/udm-v2/canvas/NetworkV2FloatingWorkbench.tsx
frontend/src/features/udm-v2/canvas/NetworkV2InspectorDrawer.tsx
frontend/src/features/udm-v2/canvas/NetworkV2StatusOverlay.tsx
frontend/src/features/udm-v2/canvas/NetworkV2LoadDialog.tsx

frontend/src/features/udm-v2/__tests__/edgeLanes.test.ts
frontend/src/features/udm-v2/__tests__/edgePath.test.ts
frontend/src/features/udm-v2/__tests__/portCompatibility.test.ts
frontend/src/features/udm-v2/__tests__/renderPersistenceBoundary.test.ts

frontend/tests/udm-v2-parallel-edges.spec.ts
frontend/tests/udm-v2-ui-parity.spec.ts
```

## 8.2 修改

```text
frontend/src/features/udm-v2/UdmV2Page.tsx
frontend/src/features/udm-v2/canvas/NetworkV2Canvas.tsx
frontend/src/features/udm-v2/canvas/NetworkV2FlowLayout.tsx
frontend/src/features/udm-v2/canvas/NetworkV2Toolbar.tsx
frontend/src/features/udm-v2/canvas/NetworkV2StatusBar.tsx

frontend/src/features/udm-v2/palette/NetworkV2NodePalette.tsx

frontend/src/features/udm-v2/edges/NetworkV2EdgeModeSelector.tsx
frontend/src/features/udm-v2/edges/NetworkV2EdgeShell.tsx
frontend/src/features/udm-v2/edges/edgePath.ts
frontend/src/features/udm-v2/edges/HydraulicV2Edge.tsx
frontend/src/features/udm-v2/edges/PumpV2Edge.tsx
frontend/src/features/udm-v2/edges/SettlingV2Edge.tsx
frontend/src/features/udm-v2/edges/SignalV2Edge.tsx

frontend/src/features/udm-v2/nodes/NetworkV2NodeShell.tsx
frontend/src/features/udm-v2/nodes/nodeTypes.ts

frontend/src/features/udm-v2/state/createUdmV2FlowStore.ts

frontend/src/features/udm-v2/serialize/toNetworkProcessGraphV1.ts
frontend/src/features/udm-v2/serialize/fromNetworkProcessGraphV1.ts
frontend/src/features/udm-v2/serialize/semanticValidation.ts

frontend/src/i18n/messages/en/flow-core.ts
frontend/src/i18n/messages/zh/flow-core.ts
frontend/src/i18n/types.ts
```

## 8.3 原则上不修改

```text
frontend/src/components/Flow/**
frontend/src/stores/flowStore.ts
frontend/src/stores/udmFlowStore.ts
frontend/src/services/udmService.ts
```

---

# 9. 核心实现参考

## 9.1 四类边视觉 token

**文件：`edges/edgeVisuals.ts`**

```ts
import { MarkerType } from "@xyflow/react"

import type { NetworkV2EdgeKind } from "./edgeModel"

export const NETWORK_V2_EDGE_KIND_ORDER: NetworkV2EdgeKind[] = [
  "hydraulic",
  "pump",
  "settling",
  "signal",
]

export type NetworkV2EdgeVisual = {
  stroke: string
  dasharray?: string
  markerScale: number
  defaultOpacity: number
}

export const NETWORK_V2_EDGE_VISUALS = {
  hydraulic: {
    stroke: "#2563eb",
    markerScale: 1,
    defaultOpacity: 0.9,
  },
  pump: {
    stroke: "#b45309",
    dasharray: "10 3",
    markerScale: 1,
    defaultOpacity: 0.92,
  },
  settling: {
    stroke: "#15803d",
    dasharray: "6 4",
    markerScale: 0.95,
    defaultOpacity: 0.9,
  },
  signal: {
    stroke: "#7c3aed",
    dasharray: "1 6",
    markerScale: 0.8,
    defaultOpacity: 0.84,
  },
} satisfies Record<NetworkV2EdgeKind, NetworkV2EdgeVisual>

export function createNetworkV2Marker(kind: NetworkV2EdgeKind) {
  const visual = NETWORK_V2_EDGE_VISUALS[kind]

  return {
    type: MarkerType.ArrowClosed,
    color: visual.stroke,
    width: 16 * visual.markerScale,
    height: 16 * visual.markerScale,
  }
}
```

`NetworkV2EdgeModeSelector`、connection preview 和四个 renderer 必须读取同一表，不再重复硬编码颜色。

---

## 9.2 Endpoint Lane 分配

**文件：`edges/edgeLanes.ts`**

```ts
import type { Edge } from "@xyflow/react"

import {
  NETWORK_V2_EDGE_KIND_ORDER,
} from "./edgeVisuals"
import {
  normalizeNetworkV2EdgeKind,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
} from "./edgeModel"

const NOMINAL_LANE_SPACING_PX = 12
const MAX_ENDPOINT_SPAN_PX = 56

export type EndpointLane = {
  index: number
  count: number
  offset: number
}

export type EdgeLaneInfo = {
  source: EndpointLane
  target: EndpointLane
}

export type EdgeLaneMap = ReadonlyMap<string, EdgeLaneInfo>

type NetworkEdge = Edge<NetworkV2EdgeData>

const sourceKey = (edge: NetworkEdge) =>
  `${edge.source}::${edge.sourceHandle ?? "__source__"}`

const targetKey = (edge: NetworkEdge) =>
  `${edge.target}::${edge.targetHandle ?? "__target__"}`

const kindRank = (kind: NetworkV2EdgeKind) =>
  NETWORK_V2_EDGE_KIND_ORDER.indexOf(kind)

const compareForSource = (a: NetworkEdge, b: NetworkEdge) => {
  const ak = normalizeNetworkV2EdgeKind(a.data?.edge_kind)
  const bk = normalizeNetworkV2EdgeKind(b.data?.edge_kind)

  return (
    kindRank(ak) - kindRank(bk) ||
    `${a.target}::${a.targetHandle ?? ""}`.localeCompare(
      `${b.target}::${b.targetHandle ?? ""}`,
    ) ||
    a.id.localeCompare(b.id)
  )
}

const compareForTarget = (a: NetworkEdge, b: NetworkEdge) => {
  const ak = normalizeNetworkV2EdgeKind(a.data?.edge_kind)
  const bk = normalizeNetworkV2EdgeKind(b.data?.edge_kind)

  return (
    kindRank(ak) - kindRank(bk) ||
    `${a.source}::${a.sourceHandle ?? ""}`.localeCompare(
      `${b.source}::${b.sourceHandle ?? ""}`,
    ) ||
    a.id.localeCompare(b.id)
  )
}

function linearOffsets(count: number): number[] {
  if (count <= 1) return [0]

  const spacing = Math.min(
    NOMINAL_LANE_SPACING_PX,
    MAX_ENDPOINT_SPAN_PX / (count - 1),
  )

  return Array.from(
    { length: count },
    (_, index) => (index - (count - 1) / 2) * spacing,
  )
}

/**
 * Priority edges occupy center lanes first.
 * Example:
 * [-18, -6, 6, 18] -> [-6, 6, -18, 18]
 */
function centerOutOffsets(count: number): number[] {
  return linearOffsets(count).sort(
    (a, b) => Math.abs(a) - Math.abs(b) || a - b,
  )
}

function allocate(
  groups: Map<string, NetworkEdge[]>,
  compare: (a: NetworkEdge, b: NetworkEdge) => number,
) {
  const lanes = new Map<string, EndpointLane>()

  for (const group of groups.values()) {
    const sorted = [...group].sort(compare)
    const offsets = centerOutOffsets(sorted.length)

    sorted.forEach((edge, index) => {
      lanes.set(edge.id, {
        index,
        count: sorted.length,
        offset: offsets[index] ?? 0,
      })
    })
  }

  return lanes
}

function groupBy(
  edges: NetworkEdge[],
  keyOf: (edge: NetworkEdge) => string,
) {
  const groups = new Map<string, NetworkEdge[]>()

  for (const edge of edges) {
    const key = keyOf(edge)
    const group = groups.get(key)
    if (group) group.push(edge)
    else groups.set(key, [edge])
  }

  return groups
}

const centerLane = (): EndpointLane => ({
  index: 0,
  count: 1,
  offset: 0,
})

export function computeEdgeLanes(edges: NetworkEdge[]): EdgeLaneMap {
  const sourceLanes = allocate(
    groupBy(edges, sourceKey),
    compareForSource,
  )
  const targetLanes = allocate(
    groupBy(edges, targetKey),
    compareForTarget,
  )

  return new Map(
    edges.map((edge) => [
      edge.id,
      {
        source: sourceLanes.get(edge.id) ?? centerLane(),
        target: targetLanes.get(edge.id) ?? centerLane(),
      },
    ]),
  )
}
```

特点：

- 不修改 edge；
- 输入数组换序后结果稳定；
- 节点拖动不触发重排；
- 同一对端点的平行边两端排序一致；
- Hydraulic/Pump 优先占据中心 lane。

---

## 9.3 Lane Context

**文件：`edges/EdgeLaneContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  type ReactNode,
} from "react"

import type {
  EdgeLaneInfo,
  EdgeLaneMap,
} from "./edgeLanes"

const EMPTY_LANES: EdgeLaneMap = new Map()

const EdgeLaneContext =
  createContext<EdgeLaneMap>(EMPTY_LANES)

export function EdgeLaneProvider({
  value,
  children,
}: {
  value: EdgeLaneMap
  children: ReactNode
}) {
  return (
    <EdgeLaneContext.Provider value={value}>
      {children}
    </EdgeLaneContext.Provider>
  )
}

export function useEdgeLane(
  edgeId: string,
): EdgeLaneInfo | undefined {
  return useContext(EdgeLaneContext).get(edgeId)
}
```

Context 的目的不是全局状态，而是避免：

- 把 lane 写入 `edge.data`；
- 每个 edge renderer 独立扫描全部 edges；
- lane 被 serializer 意外导出。

---

## 9.4 连续的 fan-out/fan-in 路径

**文件：`edges/edgePath.ts`**

```ts
import {
  Position,
  getSmoothStepPath,
  type EdgeProps,
  type XYPosition,
} from "@xyflow/react"

import type { EdgeLaneInfo } from "./edgeLanes"

const DEFAULT_FAN_DISTANCE_PX = 24
const MIN_FAN_DISTANCE_PX = 10
const LABEL_NUDGE_FACTOR = 0.25

type RoutedPathInput = Pick<
  EdgeProps,
  | "sourcePosition"
  | "sourceX"
  | "sourceY"
  | "targetPosition"
  | "targetX"
  | "targetY"
> & {
  lanes?: EdgeLaneInfo
}

function fanDistance(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const distance = Math.hypot(
    targetX - sourceX,
    targetY - sourceY,
  )

  return Math.min(
    DEFAULT_FAN_DISTANCE_PX,
    Math.max(MIN_FAN_DISTANCE_PX, distance / 6),
  )
}

function endpointAnchor(
  x: number,
  y: number,
  position: Position,
  laneOffset: number,
  distance: number,
): XYPosition {
  switch (position) {
    case Position.Left:
      return { x: x - distance, y: y + laneOffset }
    case Position.Right:
      return { x: x + distance, y: y + laneOffset }
    case Position.Top:
      return { x: x + laneOffset, y: y - distance }
    case Position.Bottom:
      return { x: x + laneOffset, y: y + distance }
    default:
      return { x, y }
  }
}

function stripInitialMove(path: string) {
  return path.replace(
    /^M\s*[-+]?[\d.eE]+\s*,?\s*[-+]?[\d.eE]+/,
    "",
  )
}

function labelNudge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  lanes,
}: RoutedPathInput) {
  const sourceOffset = lanes?.source.offset ?? 0
  const targetOffset = lanes?.target.offset ?? 0
  const dominantOffset =
    Math.abs(sourceOffset) >= Math.abs(targetOffset)
      ? sourceOffset
      : targetOffset

  const horizontal =
    Math.abs(targetX - sourceX) >=
    Math.abs(targetY - sourceY)

  return horizontal
    ? { x: 0, y: dominantOffset * LABEL_NUDGE_FACTOR }
    : { x: dominantOffset * LABEL_NUDGE_FACTOR, y: 0 }
}

export function getNetworkV2RoutedPath(
  input: RoutedPathInput,
) {
  const distance = fanDistance(
    input.sourceX,
    input.sourceY,
    input.targetX,
    input.targetY,
  )

  const sourceAnchor = endpointAnchor(
    input.sourceX,
    input.sourceY,
    input.sourcePosition,
    input.lanes?.source.offset ?? 0,
    distance,
  )
  const targetAnchor = endpointAnchor(
    input.targetX,
    input.targetY,
    input.targetPosition,
    input.lanes?.target.offset ?? 0,
    distance,
  )

  const [middlePath, middleLabelX, middleLabelY] =
    getSmoothStepPath({
      sourcePosition: input.sourcePosition,
      sourceX: sourceAnchor.x,
      sourceY: sourceAnchor.y,
      targetPosition: input.targetPosition,
      targetX: targetAnchor.x,
      targetY: targetAnchor.y,
      borderRadius: 8,
      offset: 12,
    })

  const path = [
    `M ${input.sourceX},${input.sourceY}`,
    `L ${sourceAnchor.x},${sourceAnchor.y}`,
    stripInitialMove(middlePath),
    `L ${input.targetX},${input.targetY}`,
  ].join(" ")

  const nudge = labelNudge(input)

  return [
    path,
    middleLabelX + nudge.x,
    middleLabelY + nudge.y,
  ] as const
}
```

### 必须测试的几何属性

- path 以真实 source 坐标开始；
- path 最终到达真实 target 坐标；
- 不同 lane offset 产生不同 path；
- source-only 分道有效；
- target-only 分道有效；
- 短距离节点不会产生负 fan distance；
- 一条边仍在中心 lane。

---

## 9.5 Render-only marker 和交互热区

**文件：`edges/renderEdgeVisuals.ts`**

```ts
import type { Edge } from "@xyflow/react"

import {
  normalizeNetworkV2EdgeKind,
  type NetworkV2EdgeData,
} from "./edgeModel"
import { createNetworkV2Marker } from "./edgeVisuals"

export function decorateEdgesForRender(
  edges: Edge<NetworkV2EdgeData>[],
): Edge<NetworkV2EdgeData>[] {
  return edges.map((edge) => {
    const kind = normalizeNetworkV2EdgeKind(
      edge.data?.edge_kind,
    )

    return {
      ...edge,
      markerEnd: createNetworkV2Marker(kind),
      interactionWidth: 18,
    }
  })
}
```

该函数：

- 不修改原数组；
- 不修改 `edge.data`；
- 只用于 `<ReactFlow edges={renderedEdges}>`；
- serializer 继续读取 Zustand 原始 edges。

---

## 9.6 Edge Shell

**文件：`edges/NetworkV2EdgeShell.tsx`**

```tsx
import { Box, Input } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react"
import {
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react"

import { useEdgeLane } from "./EdgeLaneContext"
import { getNetworkV2RoutedPath } from "./edgePath"
import type {
  NetworkV2EdgeData,
  NetworkV2EdgeKind,
} from "./edgeModel"
import {
  NETWORK_V2_EDGE_VISUALS,
} from "./edgeVisuals"

type NetworkV2EdgeShellProps = EdgeProps & {
  kind: NetworkV2EdgeKind
  generatedLabel: string
  editValue?: string
  editInputType?: "number" | "text"
  onCommitEdit?: (raw: string) => void
}

export function NetworkV2EdgeShell({
  kind,
  generatedLabel,
  editValue,
  editInputType = "text",
  onCommitEdit,
  ...props
}: NetworkV2EdgeShellProps) {
  const lanes = useEdgeLane(props.id)
  const data = props.data as
    | NetworkV2EdgeData
    | undefined
  const visual = NETWORK_V2_EDGE_VISUALS[kind]

  const [edgePath, labelX, labelY] =
    useMemo(
      () =>
        getNetworkV2RoutedPath({
          sourceX: props.sourceX,
          sourceY: props.sourceY,
          sourcePosition: props.sourcePosition,
          targetX: props.targetX,
          targetY: props.targetY,
          targetPosition: props.targetPosition,
          lanes,
        }),
      [
        lanes,
        props.sourcePosition,
        props.sourceX,
        props.sourceY,
        props.targetPosition,
        props.targetX,
        props.targetY,
      ],
    )

  const customLabel = data?.ui?.label?.trim()
  const visibleLabel =
    customLabel || (props.selected ? generatedLabel : "")

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const beginEdit = (event: MouseEvent) => {
    if (!onCommitEdit) return
    event.stopPropagation()
    setDraft(editValue ?? "")
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraft(editValue ?? "")
  }

  const commitEdit = () => {
    setIsEditing(false)
    onCommitEdit?.(draft)
  }

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    // 防止 React Flow 或 window 级 Delete 处理器误删边。
    event.stopPropagation()

    if (event.key === "Enter") commitEdit()
    if (event.key === "Escape") cancelEdit()
  }

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        interactionWidth={18}
        style={{
          ...props.style,
          stroke: visual.stroke,
          strokeDasharray: visual.dasharray,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: props.selected ? 2.75 : 1.35,
          opacity: props.selected
            ? 1
            : visual.defaultOpacity,
        }}
      />

      {visibleLabel && (
        <EdgeLabelRenderer>
          <Box
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
            pointerEvents="all"
            className="nodrag nopan"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {isEditing ? (
              <Input
                aria-label={`Edit ${kind} edge`}
                type={editInputType}
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value)
                }
                onBlur={commitEdit}
                onKeyDown={handleInputKeyDown}
                size="sm"
                width="120px"
                fontSize="12px"
                autoFocus
                bg="white"
                borderWidth="1px"
                borderColor={visual.stroke}
                borderRadius="4px"
                px={2}
                py={1}
              />
            ) : (
              <Box
                onDoubleClick={beginEdit}
                cursor={
                  onCommitEdit ? "pointer" : "default"
                }
                bg="rgba(255,255,255,0.84)"
                borderWidth="1px"
                borderColor={
                  props.selected
                    ? visual.stroke
                    : "rgba(148,163,184,0.45)"
                }
                borderRadius="4px"
                color="fg"
                fontSize="10px"
                lineHeight="1"
                px={1.5}
                py={1}
                whiteSpace="nowrap"
                boxShadow={
                  props.selected
                    ? "0 2px 8px rgba(15,23,42,0.14)"
                    : "none"
                }
                backdropFilter="blur(6px)"
              >
                {visibleLabel}
              </Box>
            )}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
```

### 四个 renderer 的职责

每个 renderer 只负责：

- 传入 kind；
- 格式化 generated label；
- 定义是否支持 inline edit；
- 将编辑结果写入业务字段。

不得再单独定义 stroke、dasharray 或 marker。

---

## 9.7 Port Kind 与 capability

**文件：`nodes/portKinds.ts`**

```ts
import type {
  NetworkV2EdgeKind,
} from "../edges/edgeModel"
import type {
  NetworkV2Port,
  NetworkV2PortRole,
} from "./nodeTypes"

export type NetworkV2PortKind =
  | "hydraulic_in"
  | "hydraulic_out"
  | "settling_in"
  | "settling_out"
  | "signal_in"
  | "signal_out"

const LEGACY_ROLE_TO_PORT_KIND: Record<
  NetworkV2PortRole,
  NetworkV2PortKind
> = {
  inlet: "hydraulic_in",
  outlet: "hydraulic_out",
  signal_in: "signal_in",
  signal_out: "signal_out",
}

const DEFAULT_EDGE_KINDS: Record<
  NetworkV2PortKind,
  readonly NetworkV2EdgeKind[]
> = {
  hydraulic_in: ["hydraulic", "pump"],
  hydraulic_out: ["hydraulic", "pump"],
  settling_in: ["settling"],
  settling_out: ["settling"],
  signal_in: ["signal"],
  signal_out: ["signal"],
}

export function normalizePortKind(
  port: NetworkV2Port,
): NetworkV2PortKind {
  return (
    port.port_kind ??
    LEGACY_ROLE_TO_PORT_KIND[port.role]
  )
}

export function edgeKindsForPort(
  port: NetworkV2Port,
): readonly NetworkV2EdgeKind[] {
  return (
    port.edgeKinds ??
    DEFAULT_EDGE_KINDS[normalizePortKind(port)]
  )
}

export const isSourcePort = (
  port: NetworkV2Port,
) => normalizePortKind(port).endsWith("_out")

export const isTargetPort = (
  port: NetworkV2Port,
) => normalizePortKind(port).endsWith("_in")
```

在 `nodeTypes.ts` 中扩展：

```ts
export type NetworkV2Port = {
  id: string
  label: string
  role: NetworkV2PortRole
  placement: NetworkV2PortPlacement

  // 迁移期 optional；完成迁移后改为 required。
  port_kind?: NetworkV2PortKind

  // 只有确有多能力业务语义时才设置。
  edgeKinds?: NetworkV2EdgeKind[]
}
```

---

## 9.8 共享连接校验

**文件：`edges/connectionRules.ts`**

```ts
import type {
  Connection,
  Edge,
  Node,
} from "@xyflow/react"

import type {
  NetworkV2EdgeData,
  NetworkV2EdgeKind,
} from "./edgeModel"
import type {
  NetworkV2NodeData,
} from "../nodes/nodeTypes"
import {
  edgeKindsForPort,
  isSourcePort,
  isTargetPort,
} from "../nodes/portKinds"

type ConnectionLike =
  | Connection
  | Edge<NetworkV2EdgeData>

export type ConnectionValidationResult = {
  valid: boolean
  code?:
    | "MISSING_ENDPOINT"
    | "SELF_CONNECTION"
    | "SOURCE_NODE_NOT_FOUND"
    | "TARGET_NODE_NOT_FOUND"
    | "SOURCE_PORT_NOT_FOUND"
    | "TARGET_PORT_NOT_FOUND"
    | "SOURCE_DIRECTION_INVALID"
    | "TARGET_DIRECTION_INVALID"
    | "EDGE_KIND_INCOMPATIBLE"
}

export function validateNetworkV2Connection({
  connection,
  nodes,
  edgeKind,
}: {
  connection: ConnectionLike
  nodes: Node<NetworkV2NodeData>[]
  edgeKind: NetworkV2EdgeKind
}): ConnectionValidationResult {
  if (
    !connection.source ||
    !connection.target ||
    !connection.sourceHandle ||
    !connection.targetHandle
  ) {
    return {
      valid: false,
      code: "MISSING_ENDPOINT",
    }
  }

  if (connection.source === connection.target) {
    return {
      valid: false,
      code: "SELF_CONNECTION",
    }
  }

  const sourceNode = nodes.find(
    (node) => node.id === connection.source,
  )
  const targetNode = nodes.find(
    (node) => node.id === connection.target,
  )

  if (!sourceNode) {
    return {
      valid: false,
      code: "SOURCE_NODE_NOT_FOUND",
    }
  }
  if (!targetNode) {
    return {
      valid: false,
      code: "TARGET_NODE_NOT_FOUND",
    }
  }

  const sourcePort = sourceNode.data.ports.find(
    (port) => port.id === connection.sourceHandle,
  )
  const targetPort = targetNode.data.ports.find(
    (port) => port.id === connection.targetHandle,
  )

  if (!sourcePort) {
    return {
      valid: false,
      code: "SOURCE_PORT_NOT_FOUND",
    }
  }
  if (!targetPort) {
    return {
      valid: false,
      code: "TARGET_PORT_NOT_FOUND",
    }
  }

  if (!isSourcePort(sourcePort)) {
    return {
      valid: false,
      code: "SOURCE_DIRECTION_INVALID",
    }
  }
  if (!isTargetPort(targetPort)) {
    return {
      valid: false,
      code: "TARGET_DIRECTION_INVALID",
    }
  }

  if (
    !edgeKindsForPort(sourcePort).includes(edgeKind) ||
    !edgeKindsForPort(targetPort).includes(edgeKind)
  ) {
    return {
      valid: false,
      code: "EDGE_KIND_INCOMPATIBLE",
    }
  }

  return { valid: true }
}
```

该纯函数必须同时用于：

1. React Flow `isValidConnection`；
2. store `onConnect` 的防御式校验；
3. semantic validation 的 edge 检查。

---

## 9.9 Serializer 同步

### `toNetworkProcessGraphV1.ts`

```ts
function toProcessPort(
  port: NetworkV2Port,
): NetworkProcessGraphV1Port {
  return {
    port_id: port.id,
    port_kind: normalizePortKind(port),
  }
}
```

### `fromNetworkProcessGraphV1.ts`

```ts
function defaultPlacementForPortKind(
  portKind: NetworkV2PortKind,
): NetworkV2PortPlacement {
  if (portKind === "settling_in") return "top"
  if (portKind === "settling_out") return "bottom"
  if (portKind.endsWith("_in")) return "left"
  return "right"
}

function fromProcessPort(
  port: NetworkProcessGraphV1Port,
): NetworkV2Port {
  const portKind =
    port.port_kind as NetworkV2PortKind

  return {
    id: port.port_id,
    label: port.port_id,
    role:
      portKind === "signal_in"
        ? "signal_in"
        : portKind === "signal_out"
          ? "signal_out"
          : portKind.endsWith("_in")
            ? "inlet"
            : "outlet",
    port_kind: portKind,
    placement:
      defaultPlacementForPortKind(portKind),
  }
}
```

注意：

- placement 是 UI 默认值，不改变合同语义；
- lane 不参与 serializer；
- marker 不参与 serializer；
- 不使用 `portId@index` 后缀。

---

## 9.10 Semantic Validation

在现有 `NetworkV2DiagnosticCode` union 末尾追加以下字面量：

```ts
| "EDGE_SOURCE_NODE_NOT_FOUND"
| "EDGE_TARGET_NODE_NOT_FOUND"
| "EDGE_SOURCE_PORT_NOT_FOUND"
| "EDGE_TARGET_PORT_NOT_FOUND"
| "EDGE_SOURCE_DIRECTION_INVALID"
| "EDGE_TARGET_DIRECTION_INVALID"
| "EDGE_PORT_KIND_INCOMPATIBLE"
| "SELF_CONNECTION_FORBIDDEN"
```

每条 edge 应调用共享校验器：

```ts
const result = validateNetworkV2Connection({
  connection: edge,
  nodes,
  edgeKind,
})

if (!result.valid) {
  diagnostics.push(
    edgeDiagnostic(edge.id, {
      code: mapConnectionCode(result.code),
      fieldPath: "sourceHandle/targetHandle",
      message: connectionMessage(result.code),
    }),
  )
}
```

UI 只能阻止新错误；semantic validation 必须处理：

- 导入的旧文件；
- 手工编辑 JSON；
- 测试注入；
- 程序性 graph replacement。

---

## 9.11 Canvas 集成

以下为关键结构，不是整文件替换：

```tsx
const laneMap = useMemo(
  () => computeEdgeLanes(edges),
  [edges],
)

const renderedEdges = useMemo(
  () => decorateEdgesForRender(edges),
  [edges],
)

const isValidConnection = useCallback(
  (connection: Connection) =>
    validateNetworkV2Connection({
      connection,
      nodes,
      edgeKind: activeEdgeKind,
    }).valid,
  [activeEdgeKind, nodes],
)

const activeVisual =
  NETWORK_V2_EDGE_VISUALS[activeEdgeKind]

return (
  <NetworkV2InteractionProvider>
    <EdgeLaneProvider value={laneMap}>
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        nodeTypes={networkV2NodeTypes}
        edgeTypes={networkV2EdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        connectionLineStyle={{
          stroke: activeVisual.stroke,
          strokeWidth: 1.5,
          strokeDasharray: activeVisual.dasharray,
        }}
        onNodeClick={(_, node) =>
          selectNode(node.id)
        }
        onEdgeClick={(_, edge) =>
          selectEdge(edge.id)
        }
        onPaneClick={clearSelection}
        onNodeMouseEnter={(_, node) =>
          setHoveredNodeId(node.id)
        }
        onNodeMouseLeave={() =>
          setHoveredNodeId(null)
        }
        onConnectStart={() =>
          setConnectionInProgress(true)
        }
        onConnectEnd={() =>
          setConnectionInProgress(false)
        }
        fitView
        fitViewOptions={{
          padding: 0.15,
          maxZoom: 1,
        }}
        snapToGrid
        snapGrid={[5, 5]}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        selectionOnDrag
        deleteKeyCode="Delete"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(215.4 16.3% 56.9%)"
        />
        <Controls position="bottom-left" />
        {showMiniMap && (
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={networkV2MiniMapNodeColor}
            nodeStrokeWidth={1}
            nodeBorderRadius={3}
            maskColor="hsla(0,0%,0%,0.05)"
          />
        )}
      </ReactFlow>
    </EdgeLaneProvider>
  </NetworkV2InteractionProvider>
)
```

### 为什么不继续使用 DOM 全量扫描

附件计划复刻了 v1 的 `querySelectorAll(".react-flow__node")` + rAF hover 探测。v1.0 改为：

- React Flow `onNodeMouseEnter`；
- React Flow `onNodeMouseLeave`；
- `onConnectStart` / `onConnectEnd`；
- Node 内部 500 ms hide delay。

这样避免每次 mousemove 扫描全部 DOM 节点，在 100+ 节点时更稳定。

---

## 9.12 Node 视觉与 Handle 显隐

### Interaction Context

```tsx
type NetworkV2InteractionState = {
  hoveredNodeId: string | null
  connectionInProgress: boolean
}
```

Node Shell 先计算期望状态，再使用 500 ms 延迟隐藏：

```ts
const shouldShowHandles =
  selected ||
  hoveredNodeId === id ||
  connectionInProgress

const [handlesVisible, setHandlesVisible] =
  useState(shouldShowHandles)

useEffect(() => {
  if (shouldShowHandles) {
    setHandlesVisible(true)
    return
  }

  const timer = window.setTimeout(
    () => setHandlesVisible(false),
    500,
  )

  return () => window.clearTimeout(timer)
}, [shouldShowHandles])
```

端口样式逻辑：

```ts
const compatible =
  edgeKindsForPort(port).includes(activeEdgeKind)

const interactive =
  handlesVisible && compatible
```

Handle：

```tsx
<Handle
  id={port.id}
  type={isTargetPort(port) ? "target" : "source"}
  position={positionByPlacement[port.placement]}
  style={{
    ...getHandlePlacementStyle(port, data.ports),
    width: 8,
    height: 8,
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.85)",
    background: accent,
    opacity: handlesVisible
      ? compatible
        ? 1
        : 0.18
      : 0,
    pointerEvents: interactive
      ? "auto"
      : "none",
    transition: "opacity 0.16s ease",
  }}
/>
```

### Node surface

```ts
export function networkV2NodeSurface({
  tint,
  accent,
  selected,
  hovered,
}: {
  tint: string
  accent: string
  selected: boolean
  hovered: boolean
}): SystemStyleObject {
  return {
    minW: "168px",
    maxW: "240px",
    minH: "40px",
    position: "relative",
    borderWidth: "1px",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: "6px",
    backgroundColor: tint,
    backdropFilter: "blur(8px)",
    boxShadow: hovered
      ? [
          "inset -2px -2px 8px 2px rgba(255,255,255,0.75)",
          "inset 2px 2px 6px -2px rgba(0,0,0,0.12)",
          "-6px -6px 16px rgba(255,255,255,0.8)",
          "6px 6px 18px rgba(0,0,0,0.18)",
        ].join(", ")
      : [
          "inset -2px -2px 8px 2px rgba(255,255,255,0.65)",
          "inset 2px 2px 6px -2px rgba(0,0,0,0.10)",
          "-6px -6px 6px rgba(255,255,255,0.8)",
          "4px 4px 12px rgba(0,0,0,0.2)",
        ].join(", "),
    outline: selected
      ? `2px solid ${accent}`
      : "0 solid transparent",
    outlineOffset: selected ? "2px" : "0",
    transition:
      "box-shadow 0.18s ease, outline-width 0.18s ease",
  }
}
```

### Inline rename 注意事项

- Input 必须使用 `nodrag`；
- keydown 必须 `stopPropagation()`；
- Enter 保存；
- Escape 恢复；
- blur 保存；
- label 更新后调用 `useUpdateNodeInternals(id)`。

---

## 9.13 Editor Shell

```tsx
const INSPECTOR_WIDTH = 360

<Box
  h="100vh"
  minH="520px"
  position="relative"
  overflow="hidden"
  data-udm-v2-editor
>
  <Box
    position="absolute"
    top={0}
    bottom={0}
    left={0}
    right={
      inspectorOpen
        ? `${INSPECTOR_WIDTH}px`
        : "0"
    }
    transition="right 0.18s ease"
  >
    {canvas}
  </Box>

  <NetworkV2FloatingWorkbench
    inspectorOpen={inspectorOpen}
  />

  <NetworkV2StatusOverlay />

  <NetworkV2InspectorDrawer
    isOpen={inspectorOpen}
    width={INSPECTOR_WIDTH}
    pinned={inspectorPinned}
    onPinChange={setInspectorPinned}
  >
    {inspector}
  </NetworkV2InspectorDrawer>
</Box>
```

Inspector open：

```ts
const selectionExists =
  Boolean(selectedNodeId || selectedEdgeId)

const inspectorOpen =
  inspectorPinned || selectionExists
```

Toolbar 拖动时坐标必须限制在 editor container 内，不使用全局 `window.innerWidth` 作为唯一边界。

---

## 9.14 Store 加固

### 选择 actions

```ts
selectNode: (id) =>
  set({
    selectedNodeId: id,
    selectedEdgeId: null,
  }),

selectEdge: (id) =>
  set({
    selectedNodeId: null,
    selectedEdgeId: id,
  }),

clearSelection: () =>
  set({
    selectedNodeId: null,
    selectedEdgeId: null,
  }),
```

### 过滤非持久 change，避免选择即 dirty

```ts
const isPersistentNodeChange = (
  change: NodeChange<Node<NetworkV2NodeData>>,
) =>
  [
    "add",
    "remove",
    "position",
    "replace",
  ].includes(change.type)

const isPersistentEdgeChange = (
  change: EdgeChange<Edge<NetworkV2EdgeData>>,
) =>
  [
    "add",
    "remove",
    "replace",
  ].includes(change.type)

onNodesChange: (changes) => {
  const persistent =
    changes.some(isPersistentNodeChange)

  set({
    nodes: applyNodeChanges(changes, get().nodes),
    dirty: persistent ? true : get().dirty,
  })
},

onEdgesChange: (changes) => {
  const persistent =
    changes.some(isPersistentEdgeChange)

  set({
    edges: applyEdgeChanges(changes, get().edges),
    dirty: persistent ? true : get().dirty,
  })
},
```

### `onConnect` 防御式校验

即使 Canvas 已经使用 `isValidConnection`，store 仍必须验证，以防程序性调用。

```ts
onConnect: (connection) => {
  const state = get()
  const validation =
    validateNetworkV2Connection({
      connection,
      nodes: state.nodes,
      edgeKind: state.activeEdgeKind,
    })

  if (!validation.valid) return

  const kind = state.activeEdgeKind

  const edge: Edge<NetworkV2EdgeData> = {
    ...connection,
    id: `edge-${crypto.randomUUID()}`,
    source: connection.source!,
    target: connection.target!,
    type: networkV2EdgeTypeByKind[kind],
    data: createNetworkV2EdgeData(kind),
  }

  set({
    edges: [...state.edges, edge],
    dirty: true,
  })
},
```

### `edge_kind` 与 renderer type 原子同步

```ts
updateEdgeData: (edgeId, patch) =>
  set({
    edges: get().edges.map((edge) => {
      if (edge.id !== edgeId || !edge.data) {
        return edge
      }

      const nextKind =
        patch.edge_kind ??
        edge.data.edge_kind

      return {
        ...edge,
        type:
          networkV2EdgeTypeByKind[nextKind],
        data: {
          ...edge.data,
          ...patch,
          edge_kind: nextKind,
          component_policy:
            patch.component_policy ??
            edge.data.component_policy,
        },
      }
    }),
    dirty: true,
  }),
```

### 删除时清理 constraints

删除 edge：

- 清理直接引用该 edge 的 constraint；
- 从 `edge_ids` 中移除；
- 空 constraint 删除。

删除 node：

- 删除相邻 edges；
- 对相邻 edge 执行同样 constraint cleanup。

---

# 10. 实施阶段与退出条件

## Phase 0：基线与保护网

### 工作

- 建立 v1/v2 相同拓扑 fixture；
- 建立四类边同端点 fixture；
- 保存 1440×900 和 1280×720 截图；
- 增加当前重叠现象的失败测试；
- 确认现有 typecheck/unit/boundary 基线。

### 退出条件

- 差异可截图复现；
- 多边共线可稳定复现；
- 当前测试基线已记录。

### 估算

0.5–1 人日。

---

## Phase 1：边视觉与端点车道

### 工作

- `edgeVisuals.ts`；
- `edgeLanes.ts`；
- `EdgeLaneContext.tsx`；
- `renderEdgeVisuals.ts`；
- fan-out/fan-in `edgePath.ts`；
- `NetworkV2EdgeShell`；
- 四个 renderer；
- marker 和 interaction width；
- selected/custom label。

### 退出条件

- 四类同端点边 path 唯一；
- source-only/target-only 分道；
- path 起止点连续；
- 删除边后重新居中；
- lane/marker 不进入 JSON。

### 估算

1.5–2.5 人日。

---

## Phase 2：端口语义与验证

### 工作

- optional `port_kind`；
- node factory backfill；
- contract importer；
- serializer；
- fixtures；
- capability matrix；
- Canvas `isValidConnection`；
- store 防御式校验；
- semantic validation；
- `edge_kind`/`edge.type` 同步。

### 退出条件

- 六类 canonical port kind roundtrip；
- 四类边严格连接矩阵通过；
- 非法导入图产生明确 diagnostics；
- 现有合法 fixture 不回归。

### 估算

1.5–2.5 人日。

---

## Phase 3：全屏壳层与统一工作台

### 工作

- `NetworkV2FlowLayout`；
- Inspector Drawer；
- Toolbar + Palette + Edge selector 合并；
- 状态 overlay；
- 工作台折叠、锁定；
- SHOULD 完成拖动；
- pane click 与 Inspector 联动。

### 退出条件

- 首屏无永久标题区；
- 画布不被常驻右栏/底栏压缩；
- 高频操作集中在一个工作台；
- 选择与取消选择节奏接近 v1。

### 估算

2–3 人日。

---

## Phase 4：节点、画布与交互细化

### 工作

- feature-local glass token；
- Handle 渐进显示；
- compatible handle 高亮；
- node inline rename；
- grid/snap/zoom；
- MiniMap；
- empty state；
- responsive；
- store dirty 过滤。

### 退出条件

- 节点 selected 不跳尺寸；
- Handle 可发现且不常驻；
- connectionInProgress 时目标端口可见；
- 仅 selection 不标记 dirty；
- 窄屏无严重遮挡。

### 估算

1–2 人日。

---

## Phase 5：Load Dialog、i18n 与可访问性

### 工作

- 替换 `window.prompt`；
- Load Dialog 搜索、选择、错误态；
- 中英文 i18n；
- aria labels；
- keyboard focus；
- reduced motion；
- toast/error feedback。

### 退出条件

- 不再使用 prompt 选择 graph；
- 新增文案无硬编码英文；
- 键盘可完成主要操作；
- 输入框 Delete 不误删元素。

### 估算

1–2 人日。

---

## Phase 6：回归与性能

### 工作

- Unit；
- Serializer；
- Semantic；
- Playwright；
- Screenshot；
- 100 nodes / 300 edges；
- Chrome/Edge；
- 关键移动端视口。

### 退出条件

- Definition of Done 全部通过；
- 无 v1 回归；
- 无 boundary violation；
- 无 payload 污染；
- 无阻塞级 UX 缺陷。

### 估算

1.5–3 人日。

---

## 总估算

生产级 v1.0：

```text
8–14 人日
```

4–6 人日只能完成演示级版本，不应作为完整生产验收承诺。

---

# 11. 测试方案

## 11.1 Lane 单元测试

必须覆盖：

1. 单边 offset 为 0；
2. 2、3、4、8、10 条边 offset 唯一；
3. 最大 span 不超过 56 px；
4. 输入数组换序，edge ID 对应 offset 不变；
5. 相同两端点的平行边 source/target offset 一致；
6. 删除一条后剩余 offset 重新居中；
7. hydraulic/pump 优先占中心 slot；
8. source-only group；
9. target-only group。

示例：

```ts
it("assigns center-out deterministic lanes", () => {
  const lanes = computeEdgeLanes(
    parallelEdges([
      "hydraulic",
      "pump",
      "settling",
      "signal",
    ]),
  )

  expect(
    lanes.get("edge-hydraulic")?.source.offset,
  ).toBe(-6)

  expect(
    lanes.get("edge-pump")?.source.offset,
  ).toBe(6)

  expect(
    lanes.get("edge-settling")?.source.offset,
  ).toBe(-18)

  expect(
    lanes.get("edge-signal")?.source.offset,
  ).toBe(18)
})
```

## 11.2 Path 单元测试

必须覆盖：

- path 以 `M sourceX,sourceY` 开始；
- path 最后到 target；
- 不同 offset 产生不同 path；
- source-only offset；
- target-only offset；
- Top/Bottom；
- Left/Right；
- 近距离节点；
- count=1；
- label 坐标是有限数值。

## 11.3 Port compatibility

| source | target | edge kind | 预期 |
|---|---|---|---|
| hydraulic_out | hydraulic_in | hydraulic | true |
| hydraulic_out | hydraulic_in | pump | true |
| hydraulic_out | signal_in | hydraulic | false |
| signal_out | signal_in | signal | true |
| signal_out | hydraulic_in | signal | false |
| settling_out | settling_in | settling | true |
| hydraulic_out | hydraulic_in | settling | false |
| 同一 node | 任意 | 任意 | false |
| 缺 sourceHandle | 任意 | 任意 | false |

## 11.4 Serializer

必须断言：

```ts
expect(json).not.toContain("__routing")
expect(json).not.toContain("lane")
expect(json).not.toContain("markerEnd")
expect(json).not.toContain("interactionWidth")
```

并验证：

- six port kinds roundtrip；
- source_port/target_port 不变；
- edge_kind 不变；
- save/load 后 lane 可重新计算；
- visual token 改动不影响合同 JSON。

## 11.5 Semantic validation

非法图：

- source node missing；
- target node missing；
- source port missing；
- target port missing；
- source direction invalid；
- target direction invalid；
- kind incompatible；
- self connection；
- edge kind/type mismatch。

每种错误有稳定 code、element id 和 field path。

## 11.6 Playwright

### 场景 A：四类边同一 source/target

- 注入两个节点；
- 四条边共享 Handle；
- 断言 4 个 path `d` 唯一；
- 断言每条边可点击；
- 点击后 Inspector edge kind 正确；
- 删除一条后剩余三条重新分布。

### 场景 B：target-only fan-in

- 三个 source；
- 一个 target Handle；
- 断言目标端进入段不共线；
- 每条边可单独点击。

### 场景 C：连接防呆

- Hydraulic 拖向 signal_in，无法落线；
- Signal 拖向 hydraulic_in，无法落线；
- Settling 只接受 settling ports；
- self connection 被拒绝。

### 场景 D：节点与 Inspector

- hover 显示 Handle；
- 移开后延迟隐藏；
- connection start 后兼容 Handle 可见；
- node selected 后 Inspector 滑入；
- pane click 后滑出；
- inline rename Enter/Escape。

### 场景 E：输入安全

- 选中 edge；
- 双击 flow label；
- 输入数字；
- Backspace/Delete 不删除 edge；
- Enter 更新值并令 dirty；
- Escape 不更新。

## 11.7 Screenshot regression

视口：

- 1440×900；
- 1280×720；
- 1024×768；
- 390×844。

状态：

1. 空画布；
2. 标准五节点；
3. 四类边；
4. 同端点四边；
5. node selected；
6. edge selected；
7. Inspector；
8. toolbar expanded；
9. toolbar collapsed；
10. diagnostics。

## 11.8 性能走查

Fixture：

```text
100 nodes
300 edges
其中 20 个 endpoint group 各 6–10 条边
```

检查：

- 鼠标移动无明显卡顿；
- 不使用 DOM 全量扫描；
- lane 只在 edges 引用变化时重算；
- Edge renderer 不扫描全 graph；
- 节点拖动不重新分 lane；
- selection 不触发 graph dirty；
- 内存无持续增长。

---

# 12. 验收标准

## 12.1 UI/UX

- [ ] `/udm-v2` 为全屏 editor shell。
- [ ] 不再有永久页面标题区。
- [ ] Toolbar、Palette、Edge selector 已合并。
- [ ] 工作台可折叠、可锁定。
- [ ] Inspector 选择后滑入、取消选择后滑出。
- [ ] Controls 左下、MiniMap 右下。
- [ ] 节点使用 feature-local glass surface。
- [ ] 节点 selected 不改变尺寸。
- [ ] Handle 非常显。
- [ ] 正在连接时兼容端口可发现。
- [ ] Edge label 默认低噪声。
- [ ] 四类边不只靠颜色区分。
- [ ] Load 不使用 `window.prompt`。
- [ ] 新增文案进入 i18n。
- [ ] 移动端无阻塞性遮挡。

## 12.2 多边路由

- [ ] 同一 source Handle 的 2–10 条边离开端点后分离。
- [ ] 同一 target Handle 的 2–10 条边进入端点前分离。
- [ ] 四类平行边 path 唯一。
- [ ] path 与真实 Handle 连续。
- [ ] 单边 offset 为 0。
- [ ] 删除后重新居中。
- [ ] 输入数组换序不改变 lane。
- [ ] label 使用 routed path 坐标。
- [ ] 每条边可独立点击。
- [ ] lane 不进入任何持久数据。

## 12.3 语义

- [ ] Signal 只能 `signal_out → signal_in`。
- [ ] Settling 只能 `settling_out → settling_in`。
- [ ] Hydraulic/Pump 使用 hydraulic ports。
- [ ] 自连接被拒绝。
- [ ] UI 与 semantic validation 规则一致。
- [ ] 六种 port kind roundtrip。
- [ ] `edge.type` 与 `edge.data.edge_kind` 始终匹配。

## 12.4 Store 与持久化

- [ ] selection 不令 graph dirty。
- [ ] marker 不进入 store。
- [ ] interaction width 不进入 store。
- [ ] lane 不进入 store。
- [ ] 删除 node/edge 清理 constraints。
- [ ] Save 成功才清 dirty。
- [ ] Load 失败保留当前 graph。
- [ ] edge id 无碰撞风险。

## 12.5 工程门槛

```powershell
cd frontend
npm run typecheck
npm run test:unit
npm run check:udm-v2-boundary
npm run test:e2e
npm run build
```

全部通过。

---

# 13. 风险登记与规避

| 风险 | 可能表现 | 规避措施 |
|---|---|---|
| Lane 随刷新跳动 | 同一边换到其他轨道 | 稳定排序，不使用数组当前 index |
| 路径与 Handle 脱节 | 视觉断口 | 真实 Handle → anchor → middle → 真实 Handle |
| 只解决 source | target 仍重叠 | source/target 独立分组 |
| Custom label 重叠 | 路径分开但文字覆盖 | routed 坐标 + 低噪声显示 |
| Marker 污染 JSON | payload 出现视觉字段 | render copy 派生 |
| Port 迁移破坏 fixture | 合法旧图突然 invalid | 按 §6.3 顺序迁移 |
| UI 阻止但导入仍错 | JSON 可绕过 | semantic validation 共用规则 |
| Handle 隐藏后无法连接 | pointer events 被关闭 | connecting 时显示兼容 Handle |
| 输入 Delete 误删边 | 编辑 flow 时元素消失 | input keydown stopPropagation；只启用 Delete |
| Selection 标 dirty | 用户只点一下就未保存 | 过滤 select/dimensions change |
| 大图 hover 卡顿 | mousemove 扫描全部节点 | React Flow node events + Context |
| 工作台遮挡画布 | overlay 捕获整层 pointer | 容器 none、面板 auto |
| Inspector 动画导致溢出 | 画布宽度不正确 | absolute canvas + animated right |
| kind/type 漂移 | validation mismatch | updateEdgeData 原子同步 |
| v2 引用 legacy | hard isolation 失败 | feature-local fork + boundary check |

---

# 14. Definition of Done

一个工作包只有同时满足以下条件，才算完成：

1. TypeScript 无错误；
2. Biome/项目 lint 无新增错误；
3. 对应 unit test 已增加；
4. 对应 Playwright 场景已增加或更新；
5. serializer payload 无视觉字段；
6. hard isolation 通过；
7. 中英文文案完整；
8. 键盘操作可用；
9. 1440×900 和 1280×720 截图通过；
10. 没有修改 legacy Flow 组件以迁就 v2；
11. 代码注释解释“为什么”，不重复代码本身；
12. README 或 feature 维护说明已更新。

---

# 15. 推荐开发任务拆分

## Task 1：基线 fixture 与测试骨架

- 同拓扑 v1/v2 fixture；
- parallel edges fixture；
- screenshots；
- 失败测试。

## Task 2：Edge visual system

- token；
- render marker；
- interaction width；
- renderer 去重。

## Task 3：Endpoint lanes

- lane pure function；
- Context；
- path；
- path tests。

## Task 4：Edge interaction

- Edge Shell；
- low-noise labels；
- inline edit；
- Delete safety。

## Task 5：Port semantics

- `port_kind`；
- node factory/importer；
- serializer；
- fixtures。

## Task 6：Connection validation

- shared validator；
- Canvas；
- store；
- semantic diagnostics。

## Task 7：Editor shell

- full-screen layout；
- Inspector；
- status overlay。

## Task 8：Floating workbench

- toolbar/palette/selector merge；
- collapse/lock；
- drag；
- low-frequency menu。

## Task 9：Node visuals

- glass tokens；
- Handle visibility；
- compatibility highlight；
- inline rename。

## Task 10：Load/i18n/responsive

- Load Dialog；
- i18n；
- keyboard；
- mobile。

## Task 11：Regression and performance

- E2E；
- screenshots；
- 100/300 fixture；
- final DoD。

---

# 16. 明确延期项

## 16.1 物理子 Handle

不采用：

```text
out
out@1
out@2
```

原因：

- UI slot 无法稳定从合同 roundtrip；
- 容易将视觉车道误认为业务端口；
- 保存/载入后 slot 选择丢失；
- 动态 Handle 数量增加 React Flow 内部同步复杂度。

重新评估条件：

- 产品明确把多个插槽视为可寻址业务实体；
- 合同增加 slot metadata；
- serializer 可以无损 roundtrip；
- UI 有明确的 slot 管理需求。

## 16.2 全局自动布线

只有在以下证据出现后再考虑：

- endpoint lanes 后仍有大量不可读交叉；
- 大多数用户图超过 100 节点；
- 用户频繁手工整理路径；
- 自动 layout 已稳定；
- 有障碍路由测试集。

---

# 17. 最终实施顺序

```text
基线与截图
→ edge visual token
→ lane map + Context
→ fan-out/fan-in path
→ Edge Shell / marker / label / edit
→ canonical port_kind
→ shared connection validation
→ serializer + semantic validation
→ full-screen editor shell
→ floating workbench
→ inspector drawer
→ glass nodes / Handle interaction
→ Load Dialog / i18n / responsive
→ unit / E2E / screenshots / performance
```

这套顺序优先解决“图不可读”和“语义错误”两个高风险问题，再处理外壳与视觉对齐，避免先完成漂亮界面、后续又因端口模型和路由重构返工。

---

# 附录 A：推荐参数

| 参数 | 初始值 | 调整方向 |
|---|---:|---|
| Grid gap | 20 px | 与 v1 保持 |
| Snap grid | 5 px | 与 v1 保持 |
| Lane nominal spacing | 12 px | 图密可降至 10 |
| Lane max endpoint span | 56 px | 大节点可升至 64 |
| Fan distance | 24 px | 短边动态压缩到 ≥10 |
| SmoothStep border radius | 8 px | 更硬朗可降至 6 |
| SmoothStep offset | 12 px | 图密可降至 8 |
| Normal edge width | 1.35 px | 最低不低于 1.2 |
| Selected edge width | 2.75 px | 最高不超过 3 |
| Interaction width | 18 px | 移动端可升至 22 |
| Handle size | 8 px | 移动端可升至 10 |
| Handle hide delay | 500 ms | 400–650 可调 |
| Inspector width | 360 px | 窄屏改 overlay |
| Node radius | 6 px | 与 v1 接近 |

---

# 附录 B：四类边测试拓扑

```text
Boundary A
   out
    ├── hydraulic ─┐
    ├── pump ──────┤
    ├── settling ──┤──> Reactor B / in
    └── signal ────┘
```

注意：该图只用于“同端点四条路径”的渲染测试。语义测试必须使用各自正确的 port kind，不应为了截图而让 settling/signal 连接到 hydraulic ports。建议准备两个 fixture：

1. `parallel-routing-fixture`：纯渲染层，注入四边验证路径；
2. `semantic-four-kind-fixture`：使用 hydraulic、settling、signal 各自正确端口验证合同与 UI。

---

# 附录 C：上线前检查表

- [ ] 分支基线已重新确认。
- [ ] 所有新增文件位于 `features/udm-v2/**`。
- [ ] 没有 legacy import。
- [ ] `port_kind` 数据迁移顺序正确。
- [ ] render copy 与 stored edges 分离。
- [ ] path continuity 测试通过。
- [ ] source-only/target-only lane 测试通过。
- [ ] serializer 无视觉字段。
- [ ] Load Dialog 替代 prompt。
- [ ] dirty 过滤 selection。
- [ ] edge kind/type 同步。
- [ ] constraints 删除清理。
- [ ] desktop screenshots 通过。
- [ ] mobile smoke 通过。
- [ ] 100/300 性能走查通过。
- [ ] build/typecheck/unit/e2e/boundary 全绿。

---

**版本结论**：

> 本文档已将两份原方案中可直接采用的实现合并，并修正了路径端点脱节、连接规则过宽、marker 持久化、子 Handle roundtrip、DOM hover 扫描、selection dirty 和布局溢出等问题。按本文实施，可直接进入 UDM v2 画布开发。
