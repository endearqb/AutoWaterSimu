# AutoWaterSimu UDM v2 React Flow UI/UX 审查与改造方案

> 仓库：`endearqb/AutoWaterSimu`  
> 审查分支：`codex/udm-v2-frontend-split`（用户所述 `origin/codex/udm-v2-frontend-split` 的 GitHub 远端分支）  
> 审查分支 HEAD：`61e2259d5f8f6310cf7cd7ab43230de388a7501e`  
> 对比基线：`main@1af043a7f6e18628ecbfb1ce9768aa161dca2329`  
> 审查方式：GitHub 源码与测试的只读审查  
> 仓库操作：**未提交、未推送、未创建 Pull Request**  
> 文档目的：给出可以直接拆解为开发任务的 UI/UX 统一方案，以及同一节点边缘/端口上多条连接线不重叠的实现策略与代码片段

---

## 1. 结论先行

当前 UDM v2 画布与 v1 的差异，并不主要来自颜色或节点圆角，而是来自**整体编辑器信息架构、反馈层级和交互契约**不同：

- v1 是“**全屏画布 + 浮动工作台 + 选择后出现的侧滑 Inspector + 低噪声辅助控件**”。
- v2 当前是“**页面标题 + 顶部按钮组 + 带边框画布 + 永久占宽 Inspector + 永久底部状态栏**”。

因此，仅调整 `NetworkV2NodeShell` 和四类 edge 的颜色，无法让 v2 真正接近 v1。建议同时实施两条主线：

1. **画布体验主线**：在 `frontend/src/features/udm-v2/**` 内部复刻 v1 的视觉与交互契约，但继续遵守 v2 hard isolation，不直接 import legacy `components/Flow/**`。
2. **边路由主线**：保留合同中的逻辑端口 ID，在渲染层为同一 source/target handle 上的多条边分配稳定的“视觉车道”，通过 fan-out / fan-in 虚拟锚点生成互不共线的路径；路由数据不得进入 store、保存 payload 或 `network_process_graph.v1`。

推荐目标不是“逐像素复制 v1”，而是：

> **复用 v1 的认知模型和操作节奏，保留 v2 的四类连接语义、独立状态模型与独立持久化边界。**

---

## 2. 审查范围与证据

### 2.1 v1 主要审查文件

| 文件 | 观察重点 |
|---|---|
| `frontend/src/components/Flow/FlowCanvas.tsx` | 全屏画布、点阵网格、控件、小地图、拖放、选择、hover handle |
| `frontend/src/components/Flow/FlowLayout.tsx` | 浮动工具栏、自动开合 Inspector、画布占满工作区 |
| `frontend/src/components/Flow/toolbar/BaseToolbarContainer.tsx` | 玻璃面板、锁定、拖动、折叠、图名编辑、分区视图 |
| `frontend/src/components/Flow/inspectorbar/BaseInspectorContainer.tsx` | 右侧滑入式属性面板 |
| `frontend/src/components/Flow/nodes/UDMNode.tsx` | 玻璃节点、hover/selected 才显示 handle、双击改名 |
| `frontend/src/components/Flow/nodes/utils/glass.ts` | 节点、面板、handle、网格和选中态的视觉 token |
| `frontend/src/components/Flow/edges/EditableEdge.tsx` | 低噪声边、选中加粗、按需显示/编辑标签 |
| `frontend/src/routes/_layout/udm.tsx` | v1 UDM 页面装配方式 |

### 2.2 v2 主要审查文件

| 文件 | 观察重点 |
|---|---|
| `frontend/src/features/udm-v2/canvas/NetworkV2Canvas.tsx` | 当前 React Flow 配置、Palette、Edge selector、MiniMap |
| `frontend/src/features/udm-v2/canvas/NetworkV2FlowLayout.tsx` | 当前页面级布局 |
| `frontend/src/features/udm-v2/canvas/NetworkV2Toolbar.tsx` | 顶部按钮组、保存/载入/校验/提交 |
| `frontend/src/features/udm-v2/palette/NetworkV2NodePalette.tsx` | 固定白色节点面板 |
| `frontend/src/features/udm-v2/edges/NetworkV2EdgeModeSelector.tsx` | 四类边模式选择器 |
| `frontend/src/features/udm-v2/nodes/NetworkV2NodeShell.tsx` | 端口定位、节点视觉、handle 可见性 |
| `frontend/src/features/udm-v2/edges/NetworkV2EdgeShell.tsx` | 边线宽、标签和选择反馈 |
| `frontend/src/features/udm-v2/edges/edgePath.ts` | 当前路径生成 |
| `frontend/src/features/udm-v2/state/createUdmV2FlowStore.ts` | onConnect、选择、持久状态 |
| `frontend/src/features/udm-v2/serialize/toNetworkProcessGraphV1.ts` | sourceHandle/targetHandle 和 UI metadata 的序列化边界 |
| `frontend/src/features/udm-v2/serialize/semanticValidation.ts` | 当前语义校验覆盖 |
| `frontend/src/features/udm-v2/README.md` | hard isolation 约束 |
| `.ai/decisions/0028-udm-v2-frontend-hard-isolation.md` | v1/v2 不得互相依赖的架构决策 |

### 2.3 审查限制

本次是源码级审查，没有在浏览器中运行该分支并形成真实截图基线。因此：

- 对结构、状态流、路径算法和明显 UX 差异的判断置信度高；
- 对具体阴影强度、字体压缩、窄屏断点等视觉细节，应在实现时通过 Playwright screenshot 和人工走查确认；
- 下文建议将“截图基线”列为第一个实施步骤，而不是把当前源码判断当成最终像素结论。

---

## 3. 当前差异与优先级

| 级别 | 问题 | 当前表现 | 影响 | 建议 |
|---|---|---|---|---|
| P0 | 同 handle 多边共线 | 所有边把相同端点直接交给 `getSmoothStepPath` | 多条边完全或部分遮挡，四类语义不可辨认 | 增加稳定视觉车道和 fan-out/fan-in |
| P0 | 端口兼容性不足 | `onConnect` 只检查 source/target 是否存在 | 信号边、沉降边可能连接到不匹配端口 | 增加 port capability 与 `isValidConnection` |
| P1 | 编辑器外壳与 v1 不同 | 页面标题、固定右栏、固定底栏 | 画布面积小、操作节奏与 v1 完全不同 | 改为全屏画布、浮动工作台、侧滑 Inspector |
| P1 | 工具入口碎片化 | Node Palette、Edge selector、顶部 toolbar 分成三块 | 视觉占用高，用户要在多个区域切换 | 合并到一个可折叠浮动工作台 |
| P1 | 边标签噪声高 | 四类边都永久显示白底标签 | 图稍复杂即出现大量遮挡 | 默认隐藏，选中/hover/显式命名时显示 |
| P1 | 边方向反馈弱 | 默认 edge options 未配置统一箭头 | 流向、控制方向不够直观 | 统一 `ArrowClosed`，marker 颜色随边类型 |
| P1 | 节点反馈不接近 v1 | 白色 card、handle 永久显示 | 画布视觉噪声较高，缺少 v1 的聚焦感 | feature-local 玻璃节点；hover/selected 才显示 handle |
| P2 | Canvas 行为不一致 | 缺少 v1 的 snap、zoom、fitView、控件位置配置 | 拖放和导航手感不同 | 复制交互参数，不复制 legacy 依赖 |
| P2 | MiniMap 未定制 | 使用 React Flow 默认外观 | 与 v1 视觉脱节 | 使用节点 accent、玻璃表面、移动端策略 |
| P2 | Load 使用 `window.prompt` | 以文本 prompt 选择图 | 可发现性、错误恢复和可访问性差 | 改为列表 Dialog |
| P2 | 多处硬编码英文 | Empty、Nodes、Edge、Inspector、状态等 | 与现有 i18n 体系不一致 | 纳入 feature-local i18n key |
| P2 | 颜色 token 重复 | selector 和四类 renderer 分别硬编码颜色 | 后续改色易漂移 | 单一 `edgeVisuals` token 表 |
| P3 | 缺少 UI 回归测试 | 测试聚焦合同、保存和 label formatter | 改造容易产生视觉/交互回归 | 增加路径、几何、截图和键盘 E2E |

---

## 4. 目标体验：v1 的操作节奏，v2 的语义能力

### 4.1 建议页面结构

```text
┌───────────────────────────────────────────────────────────────────────┐
│  浮动工作台                                                           │
│  [UDM v2] [图名] [节点] [边: 水力/泵/沉降/信号] [校验] [运行] [⋯]    │
│  可锁定、可拖动、可折叠                                               │
│                                                                       │
│                         React Flow 全屏画布                            │
│                                                                       │
│                                                                       │
│  [Controls]       [状态 chips / diagnostics]       [MiniMap] [菜单]   │
│                                                     ┌──────────────┐  │
│                                                     │ 侧滑 Inspector│  │
│                                                     │ 选中时打开    │  │
│                                                     └──────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.2 关键 UX 契约

#### 画布

- 画布占满页面可用区域，不再被永久标题、右侧栏和底栏切割。
- 使用 v1 同类点阵背景：20 px 基础网格，节点按 5 px 子网格吸附。
- `Controls` 固定左下；`MiniMap` 固定右下。
- 点击空白处清除 node/edge selection，并关闭 Inspector。
- 节点和边的选择互斥；选择一个时显式取消另一个。
- 桌面端支持框选、滚轮平移/缩放和 Delete；移动端减少误触行为。
- 空画布提示应位于视觉中心，但不抢占 pointer events；提示内容包含“拖入节点”和“先选择连接类型”。

#### 浮动工作台

将当前三个入口合并：

1. `NetworkV2Toolbar`
2. `NetworkV2NodePalette`
3. `NetworkV2EdgeModeSelector`

工作台建议分为：

- 标题区：`UDM v2` badge、图名、dirty 状态、锁定/折叠按钮；
- `Nodes` 区：Boundary、Reactor、Clarifier、Splitter、Controller；
- `Connections` 区：Hydraulic、Pump、Settling、Signal；
- `Actions` 区：New、Save、Save As、Load、Import、Export、Validate、Submit；
- 折叠后只保留图名、当前边类型、Validate/Submit 和展开按钮。

不要把所有动作永远横向铺开。高频操作直接显示，低频文件操作收进 `⋯` 菜单。

#### Inspector

- 默认关闭。
- 选中节点或边后自动打开。
- 取消选择后自动关闭；用户可手动固定打开。
- 使用 overlay/slide-over，而不是永久占用 280–340 px。
- 把内容分成三个层级：
  1. 当前元素字段；
  2. 当前元素 diagnostics；
  3. Graph-level constraints/validation。
- Graph-level 内容不要始终堆在每个元素字段下面，可放到单独 tab 或“Graph”视图。

#### 节点

- 采用 feature-local 的玻璃表面和 accent，不直接 import v1 `GlassNodeContainer`。
- selected 使用 2 px outline，而不是通过增加 border width 导致节点尺寸跳动。
- hover 有轻微阴影/outline 增强，不做大幅位移动画。
- handle 默认透明且不可交互；节点 hover、selected 或处于连接模式时显示。
- 连接进行中只高亮与当前 edge kind 兼容的端口。
- 节点标题支持双击编辑；Enter 保存、Escape 取消。
- 端口 label 通过 tooltip 或连接模式显示，避免永久堆在节点四周。

#### 边

四类边不能只依靠颜色区分，应同时使用：

| 类型 | 颜色 | 线型 | marker/附加语义 |
|---|---|---|---|
| Hydraulic | 蓝 | 实线 | 闭合箭头 |
| Pump | 琥珀/橙 | 实线或长短节奏 | 闭合箭头；可在 label 中显示泵符号 |
| Settling | 绿 | `6 4` 虚线 | 闭合箭头；label `J_TSS` |
| Signal | 紫 | 点线 `1 6` | 小箭头；不表现为物质流 |

其他规则：

- 未选中：约 1.25 px；
- 选中：约 2.5–3 px；
- 点击命中宽度：约 16–20 px 的透明 interaction width；
- 默认不显示白底 label；
- 选中、hover 或用户明确设置自定义 label 时才显示；
- edge label 使用已路由路径的中点，不再使用原始未分车道路径的中点；
- selected edge 提高 z-index，避免被其他边盖住。

---

## 5. 多条连接线不重叠：先区分“节点边缘”与“逻辑端口”

用户表述中的“从同一条边接入和接出”可能包含两个不同问题：

### 5.1 同一节点 side 上有多个不同逻辑端口

例如一个 Clarifier 的右侧有多个 outlet。此时应当：

- 每个 port 保留唯一 `Handle.id`；
- 在同一 side 上按端口数量均匀分布；
- serializer 继续保存真实 `sourceHandle` / `targetHandle`；
- 不需要为这些端口伪造多个 edge-only handle。

当前 `NetworkV2NodeShell.handleStyle()` 已经具备基础均匀分布能力，这部分可以保留并增强视觉反馈。

### 5.2 同一逻辑 handle 上有多条边

这是当前重叠的主要根因：

- 同组边的 `sourceX/sourceY/sourcePosition` 完全相同；
- 同组边的 `targetX/targetY/targetPosition` 也可能完全相同；
- `edgePath.ts` 不提供 lane、offset 或 waypoint；
- 因而 `getSmoothStepPath` 生成相同或高度重合的路径。

推荐采用下述方案。

---

## 6. 推荐路由方案：逻辑端口不变，渲染层分配稳定视觉车道

### 6.1 核心原则

1. **合同端口不变**  
   `sourceHandle`、`targetHandle` 继续是业务/合同中的真实 port ID。

2. **视觉车道是瞬态数据**  
   只在传给 `<ReactFlow edges={...}>` 的 render copy 中添加 `__routing`，不得写入 Zustand store，不得进入 `edge.data.ui`，不得进入 export payload。

3. **车道顺序必须确定性**  
   同一组边稳定排序；刷新、保存/载入、数组顺序变化后，边不能随机换道。

4. **源端和目标端都要分道**  
   只在中段加 offset 会造成起点/终点仍长期共线。必须在 handle 后立即 fan-out，并在目标 handle 前 fan-in。

5. **单条边保持中心线**  
   count = 1 时 offset = 0。

### 6.2 分组键

源端：

```text
source node id + source handle id
```

目标端：

```text
target node id + target handle id
```

示例：

```text
source-group = reactor-1::out
target-group = clarifier-1::feed
```

### 6.3 居中车道公式

对同一 endpoint group：

```text
offset(i) = (i - (count - 1) / 2) × spacing
```

示例，`spacing = 12 px`：

| 条数 | offsets |
|---:|---|
| 1 | `0` |
| 2 | `-6, +6` |
| 3 | `-12, 0, +12` |
| 4 | `-18, -6, +6, +18` |
| 5 | `-24, -12, 0, +12, +24` |

为避免 10 条边把端口扇出得过宽，应压缩 spacing：

```text
actualSpacing = min(nominalSpacing, maxSpan / (count - 1))
```

建议：

- nominal spacing：12 px；
- max span：56 px；
- fan-out normal distance：24 px；
- selected interaction width：18 px。

### 6.4 稳定排序

第一阶段使用简单、可预测的稳定排序：

1. edge kind priority：`hydraulic → pump → settling → signal`；
2. 对端 node ID；
3. 对端 handle ID；
4. edge ID。

第二阶段可升级为“几何感知排序”：

- Left/Right side：按对端 Y 坐标排序；
- Top/Bottom side：按对端 X 坐标排序；
- 同坐标时再按 edge kind 和 edge ID。

几何感知排序可以减少边在刚离开节点时互相交叉，但不是第一阶段上线的必要条件。

### 6.5 路径形状

每条边由五段语义组成：

```text
真实 source handle
  → 源端 fan-out 虚拟锚点
  → SmoothStep 中间路径
  → 目标端 fan-in 虚拟锚点
  → 真实 target handle
```

对于 Left/Right handle：

- normal 方向改变 X；
- lane offset 改变 Y。

对于 Top/Bottom handle：

- normal 方向改变 Y；
- lane offset 改变 X。

这样多条边只在真实 handle 的一个像素点相交，离开端口后立即分开，不再共享长线段。

### 6.6 为什么不优先使用“每条边一个动态 Handle”

动态 handle 方案也能避免重叠，但第一阶段不推荐：

- 会把视觉车道误当成业务端口；
- handle ID 可能进入保存合同，造成语义污染；
- 节点 handle 数量或位置变化后需要 `useUpdateNodeInternals()`；
- 重连、删除、载入和排序都更复杂；
- 可能破坏现有 source/target port 合同。

只有当产品语义明确要求“一个业务端口拥有可单独寻址的多个物理插槽”时，才应升级到动态 slot handle。

### 6.7 高密度降级策略

当同一 handle 超过约 8–10 条边：

1. 先压缩 lane spacing；
2. 未选中边降低 opacity；
3. label 仅对 selected/hover edge 显示；
4. 选中某节点时突出其相邻边，其他边淡化；
5. 若真实业务经常超过 10 条，再考虑：
   - edge bundling；
   - 自动插入 junction/splitter；
   - obstacle-aware router；
   - 显式多插槽端口。

不要在第一阶段直接引入全局自动布线库；当前问题可由本地确定性路由解决。

---

## 7. 代码片段一：统一四类边视觉 token

建议新增：

`frontend/src/features/udm-v2/edges/edgeVisuals.ts`

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
  shortLabel: string
}

export const NETWORK_V2_EDGE_VISUALS = {
  hydraulic: {
    stroke: "#2563eb",
    markerScale: 1,
    shortLabel: "Hyd",
  },
  pump: {
    stroke: "#b45309",
    dasharray: "10 3",
    markerScale: 1,
    shortLabel: "Pump",
  },
  settling: {
    stroke: "#15803d",
    dasharray: "6 4",
    markerScale: 0.95,
    shortLabel: "Settle",
  },
  signal: {
    stroke: "#7c3aed",
    dasharray: "1 6",
    markerScale: 0.8,
    shortLabel: "Signal",
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

然后让 `NetworkV2EdgeModeSelector` 和四个 edge renderer 都读取同一张表，删除各文件中的重复 hex color。

---

## 8. 代码片段二：为边生成瞬态车道数据

建议新增：

`frontend/src/features/udm-v2/edges/edgeRouting.ts`

```ts
import type { Edge } from "@xyflow/react"

import {
  NETWORK_V2_EDGE_KIND_ORDER,
  createNetworkV2Marker,
} from "./edgeVisuals"
import {
  normalizeNetworkV2EdgeKind,
  type NetworkV2EdgeData,
  type NetworkV2EdgeKind,
} from "./edgeModel"

const NOMINAL_LANE_SPACING_PX = 12
const MAX_ENDPOINT_SPAN_PX = 56

export type NetworkV2EndpointLane = {
  index: number
  count: number
  offset: number
}

export type NetworkV2EdgeRouting = {
  source: NetworkV2EndpointLane
  target: NetworkV2EndpointLane
}

export type NetworkV2RenderedEdgeData = NetworkV2EdgeData & {
  /**
   * Render-only metadata.
   * Never write this field into Zustand state or serialized payloads.
   */
  __routing?: NetworkV2EdgeRouting
}

type NetworkV2Edge = Edge<NetworkV2EdgeData>
type RenderedNetworkV2Edge = Edge<NetworkV2RenderedEdgeData>

const sourceEndpointKey = (edge: NetworkV2Edge) =>
  `${edge.source}::${edge.sourceHandle ?? "__default_source__"}`

const targetEndpointKey = (edge: NetworkV2Edge) =>
  `${edge.target}::${edge.targetHandle ?? "__default_target__"}`

function edgeKindRank(kind: NetworkV2EdgeKind) {
  return NETWORK_V2_EDGE_KIND_ORDER.indexOf(kind)
}

function compareEdges(a: NetworkV2Edge, b: NetworkV2Edge) {
  const aKind = normalizeNetworkV2EdgeKind(a.data?.edge_kind)
  const bKind = normalizeNetworkV2EdgeKind(b.data?.edge_kind)

  return (
    edgeKindRank(aKind) - edgeKindRank(bKind) ||
    `${a.target}::${a.targetHandle ?? ""}`.localeCompare(
      `${b.target}::${b.targetHandle ?? ""}`,
    ) ||
    `${a.source}::${a.sourceHandle ?? ""}`.localeCompare(
      `${b.source}::${b.sourceHandle ?? ""}`,
    ) ||
    a.id.localeCompare(b.id)
  )
}

function centeredLane(index: number, count: number): NetworkV2EndpointLane {
  if (count <= 1) {
    return { index: 0, count: 1, offset: 0 }
  }

  const spacing = Math.min(
    NOMINAL_LANE_SPACING_PX,
    MAX_ENDPOINT_SPAN_PX / (count - 1),
  )

  return {
    index,
    count,
    offset: (index - (count - 1) / 2) * spacing,
  }
}

function allocateEndpointLanes(
  edges: NetworkV2Edge[],
  keyOf: (edge: NetworkV2Edge) => string,
) {
  const groups = new Map<string, NetworkV2Edge[]>()

  for (const edge of edges) {
    const key = keyOf(edge)
    const group = groups.get(key)
    if (group) {
      group.push(edge)
    } else {
      groups.set(key, [edge])
    }
  }

  const lanes = new Map<string, NetworkV2EndpointLane>()

  for (const group of groups.values()) {
    const sorted = [...group].sort(compareEdges)
    sorted.forEach((edge, index) => {
      lanes.set(edge.id, centeredLane(index, sorted.length))
    })
  }

  return lanes
}

/**
 * Creates React Flow render copies.
 *
 * Important:
 * - `edges` is not mutated.
 * - `__routing` exists only in the render copy.
 * - serializers must continue receiving the original Zustand `edges`.
 */
export function decorateNetworkV2EdgesForRender(
  edges: NetworkV2Edge[],
): RenderedNetworkV2Edge[] {
  const sourceLanes = allocateEndpointLanes(edges, sourceEndpointKey)
  const targetLanes = allocateEndpointLanes(edges, targetEndpointKey)

  return edges.map((edge) => {
    const kind = normalizeNetworkV2EdgeKind(edge.data?.edge_kind)
    const data = edge.data

    if (!data) {
      return edge as RenderedNetworkV2Edge
    }

    return {
      ...edge,
      markerEnd: createNetworkV2Marker(kind),
      interactionWidth: 18,
      ariaLabel: `${kind} edge ${edge.id}`,
      data: {
        ...data,
        __routing: {
          source: sourceLanes.get(edge.id) ?? centeredLane(0, 1),
          target: targetLanes.get(edge.id) ?? centeredLane(0, 1),
        },
      },
    }
  })
}
```

### 8.1 重要边界

下面是正确调用方式：

```ts
const storedEdges = useUdmV2FlowStore((state) => state.edges)

const renderedEdges = useMemo(
  () => decorateNetworkV2EdgesForRender(storedEdges),
  [storedEdges],
)

<ReactFlow edges={renderedEdges} />
```

下面是错误做法：

```ts
// 错误：会把 __routing 写入 store，之后可能被保存或导出。
setEdges(decorateNetworkV2EdgesForRender(edges))
```

---

## 9. 代码片段三：fan-out / fan-in 路径

建议替换：

`frontend/src/features/udm-v2/edges/edgePath.ts`

```ts
import {
  Position,
  getSmoothStepPath,
  type EdgeProps,
  type XYPosition,
} from "@xyflow/react"

import type { NetworkV2EdgeRouting } from "./edgeRouting"

const FAN_OUT_DISTANCE_PX = 24

type RoutedPathInput = Pick<
  EdgeProps,
  | "sourcePosition"
  | "sourceX"
  | "sourceY"
  | "targetPosition"
  | "targetX"
  | "targetY"
> & {
  routing?: NetworkV2EdgeRouting
}

function endpointAnchor(
  x: number,
  y: number,
  position: Position,
  laneOffset: number,
): XYPosition {
  switch (position) {
    case Position.Left:
      return {
        x: x - FAN_OUT_DISTANCE_PX,
        y: y + laneOffset,
      }
    case Position.Right:
      return {
        x: x + FAN_OUT_DISTANCE_PX,
        y: y + laneOffset,
      }
    case Position.Top:
      return {
        x: x + laneOffset,
        y: y - FAN_OUT_DISTANCE_PX,
      }
    case Position.Bottom:
      return {
        x: x + laneOffset,
        y: y + FAN_OUT_DISTANCE_PX,
      }
    default:
      return { x, y }
  }
}

/**
 * getSmoothStepPath returns a complete SVG path beginning with M.
 * Remove only that initial M segment before concatenating it into our path.
 */
function withoutInitialMove(path: string) {
  return path.replace(/^M[^A-Za-z]*/i, "")
}

export function getNetworkV2RoutedPath({
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
  routing,
}: RoutedPathInput) {
  const sourceAnchor = endpointAnchor(
    sourceX,
    sourceY,
    sourcePosition,
    routing?.source.offset ?? 0,
  )
  const targetAnchor = endpointAnchor(
    targetX,
    targetY,
    targetPosition,
    routing?.target.offset ?? 0,
  )

  const [middlePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    sourceX: sourceAnchor.x,
    sourceY: sourceAnchor.y,
    targetPosition,
    targetX: targetAnchor.x,
    targetY: targetAnchor.y,
    borderRadius: 6,
    offset: 12,
  })

  const path = [
    `M ${sourceX},${sourceY}`,
    `L ${sourceAnchor.x},${sourceAnchor.y}`,
    withoutInitialMove(middlePath),
    `L ${targetX},${targetY}`,
  ].join(" ")

  return [path, labelX, labelY] as const
}
```

### 9.1 路径实现注意事项

- 若实际渲染中出现 source fan-out 段穿过节点，可将 `FAN_OUT_DISTANCE_PX` 调整为 handle 半径 + 16–24 px。
- 如果 node border 很厚，应保证 handle 位于节点外沿，而不是节点内部。
- 对自环边或 source/target 同节点，建议单独实现 loop path，不走上述普通路径。
- 若两个节点距离小于两端 fan-out 总距离，应压缩 fan-out：

```ts
const fanOut = Math.min(24, Math.max(10, distance / 4))
```

第一阶段可以先固定为 24 px，再由截图测试决定是否需要动态压缩。

---

## 10. 代码片段四：改造 Edge Shell

建议修改：

`frontend/src/features/udm-v2/edges/NetworkV2EdgeShell.tsx`

```tsx
import { Box } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react"

import { getNetworkV2RoutedPath } from "./edgePath"
import type {
  NetworkV2EdgeKind,
} from "./edgeModel"
import type {
  NetworkV2RenderedEdgeData,
} from "./edgeRouting"
import {
  NETWORK_V2_EDGE_VISUALS,
} from "./edgeVisuals"

type NetworkV2EdgeShellProps = EdgeProps & {
  kind: NetworkV2EdgeKind
  label: string
}

export function NetworkV2EdgeShell({
  kind,
  label,
  ...props
}: NetworkV2EdgeShellProps) {
  const data = props.data as NetworkV2RenderedEdgeData | undefined
  const visual = NETWORK_V2_EDGE_VISUALS[kind]

  const [edgePath, labelX, labelY] = getNetworkV2RoutedPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    routing: data?.__routing,
  })

  const selected = Boolean(props.selected)
  const customLabel = data?.ui?.label?.trim()
  const visibleLabel = customLabel || (selected ? label : "")

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
          strokeWidth: selected ? 2.75 : 1.25,
          opacity: selected ? 1 : 0.86,
        }}
      />

      {visibleLabel && (
        <EdgeLabelRenderer>
          <Box
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`}
            pointerEvents="all"
            className="nodrag nopan"
            bg="rgba(255,255,255,0.82)"
            borderWidth="1px"
            borderColor={selected ? visual.stroke : "rgba(148,163,184,0.45)"}
            borderRadius="4px"
            color="fg"
            fontSize="10px"
            lineHeight="1"
            px={1.5}
            py={1}
            boxShadow={selected ? "0 2px 8px rgba(15,23,42,0.14)" : "none"}
            backdropFilter="blur(6px)"
            onClick={(event) => event.stopPropagation()}
          >
            {visibleLabel}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
```

四类 edge component 改为显式传 `kind`，不再传颜色：

```tsx
export function HydraulicV2Edge(props: EdgeProps) {
  return (
    <NetworkV2EdgeShell
      {...props}
      kind="hydraulic"
      label={formatHydraulicV2EdgeLabel(
        props.data as NetworkV2EdgeData,
      )}
    />
  )
}
```

Pump、Settling、Signal 同理。

---

## 11. 代码片段五：Canvas 中一次性装饰边，并靠近 v1 行为

以下是 `NetworkV2Canvas.tsx` 的关键改造片段，不是整文件替换：

```tsx
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type IsValidConnection,
} from "@xyflow/react"
import { useCallback, useMemo } from "react"

import { decorateNetworkV2EdgesForRender } from "../edges/edgeRouting"
import { NETWORK_V2_EDGE_VISUALS } from "../edges/edgeVisuals"
import { isValidNetworkV2Connection } from "../nodes/portCompatibility"

// ...

const renderedEdges = useMemo(
  () => decorateNetworkV2EdgesForRender(edges),
  [edges],
)

const isValidConnection = useCallback<IsValidConnection>(
  (connection) =>
    isValidNetworkV2Connection({
      connection,
      nodes,
      edgeKind: activeEdgeKind,
    }),
  [activeEdgeKind, nodes],
)

const activeEdgeVisual = NETWORK_V2_EDGE_VISUALS[activeEdgeKind]

return (
  <Box
    h="100%"
    w="100%"
    position="relative"
    touchAction="none"
    userSelect="none"
    data-testid="udm-v2-canvas"
  >
    <ReactFlow
      aria-label="UDM Network v2 canvas"
      nodes={nodes}
      edges={renderedEdges}
      nodeTypes={networkV2NodeTypes}
      edgeTypes={networkV2EdgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      connectionLineStyle={{
        stroke: activeEdgeVisual.stroke,
        strokeWidth: 1.5,
        strokeDasharray: activeEdgeVisual.dasharray,
      }}
      onNodeClick={(_, node) => {
        setSelectedNodeId(node.id)
        setSelectedEdgeId(null)
      }}
      onEdgeClick={(_, edge) => {
        setSelectedEdgeId(edge.id)
        setSelectedNodeId(null)
      }}
      onPaneClick={() => {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMoveEnd={(_, viewport) => setViewport(viewport)}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
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
      defaultEdgeOptions={{
        type: networkV2EdgeTypeByKind[activeEdgeKind],
        interactionWidth: 18,
      }}
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
          pannable
          zoomable
          position="bottom-right"
          nodeStrokeWidth={1}
          nodeBorderRadius={3}
          maskColor="hsla(0, 0%, 0%, 0.05)"
          style={{
            backgroundColor: "hsl(0 0% 100% / 0.9)",
            border: "1px solid hsl(214.3 31.8% 91.4%)",
            borderRadius: "6px",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(15,23,42,0.1)",
          }}
        />
      )}
    </ReactFlow>

    {/* 这些 overlay 组件应位于 ReactFlow 之后或使用 Panel */}
    <NetworkV2FloatingWorkbench />
    <NetworkV2StatusOverlay />
    <NetworkV2InspectorDrawer />
  </Box>
)
```

### 11.1 关于 `onSelectionChange`

当前 v2 使用：

```tsx
onSelectionChange={({ nodes, edges }) => {
  setSelectedNodeId(nodes[0]?.id ?? null)
  setSelectedEdgeId(edges[0]?.id ?? null)
}}
```

它可能在多选、框选或 React Flow 内部 selection 更新时同时改写两类选择。为了复刻 v1 的“node 与 edge 单选互斥”体验，建议：

- 普通 click 使用 `onNodeClick` / `onEdgeClick` 显式设置；
- pane click 显式清空；
- 多选若未来需要，再引入 `selectedNodeIds` / `selectedEdgeIds`，不要用两个单值字段模拟多选。

---

## 12. 代码片段六：端口种类、能力与连接合法性

当前 `NetworkV2PortRole` 只有：

```ts
"inlet" | "outlet" | "signal_in" | "signal_out"
```

但合同中的 canonical port kind 是：

- `hydraulic_in`
- `hydraulic_out`
- `settling_in`
- `settling_out`
- `signal_in`
- `signal_out`

这不只是 UI 命名差异。当前 serializer 按 `role` 把普通 inlet/outlet 固定映射为 hydraulic port，因此仅增加 `edgeKinds: ["settling"]` 仍然会在导出时丢失 settling port 语义。

### 12.1 推荐的数据模型：先兼容迁移，最终以 `port_kind` 为准

建议增加合同一致的 `port_kind`。迁移期保留 `role`，等 fixtures、serializer 和 editor 全部切换后再考虑移除。

```ts
import type { NetworkV2EdgeKind } from "../edges/edgeModel"

export type NetworkV2PortKind =
  | "hydraulic_in"
  | "hydraulic_out"
  | "settling_in"
  | "settling_out"
  | "signal_in"
  | "signal_out"

export type NetworkV2Port = {
  id: string
  label: string
  placement: NetworkV2PortPlacement

  /**
   * Canonical semantic kind. New nodes and imported contracts should set it.
   */
  port_kind?: NetworkV2PortKind

  /**
   * Migration-only compatibility field for existing canvas fixtures.
   */
  role: NetworkV2PortRole

  /**
   * Optional override for ports that intentionally accept multiple edge kinds.
   */
  edgeKinds?: NetworkV2EdgeKind[]
}
```

兼容归一化：

```ts
const LEGACY_ROLE_TO_PORT_KIND: Record<
  NetworkV2PortRole,
  NetworkV2PortKind
> = {
  inlet: "hydraulic_in",
  outlet: "hydraulic_out",
  signal_in: "signal_in",
  signal_out: "signal_out",
}

export function normalizeNetworkV2PortKind(
  port: NetworkV2Port,
): NetworkV2PortKind {
  return port.port_kind ?? LEGACY_ROLE_TO_PORT_KIND[port.role]
}
```

默认边能力应由 canonical port kind 派生：

```ts
const DEFAULT_EDGE_KINDS_BY_PORT_KIND: Record<
  NetworkV2PortKind,
  NetworkV2EdgeKind[]
> = {
  hydraulic_in: ["hydraulic", "pump"],
  hydraulic_out: ["hydraulic", "pump"],
  settling_in: ["settling"],
  settling_out: ["settling"],
  signal_in: ["signal"],
  signal_out: ["signal"],
}

export function edgeKindsForPort(port: NetworkV2Port) {
  return (
    port.edgeKinds ??
    DEFAULT_EDGE_KINDS_BY_PORT_KIND[normalizeNetworkV2PortKind(port)]
  )
}
```

示例：

```ts
{
  id: "sludge",
  label: "Sludge",
  role: "outlet", // migration compatibility
  port_kind: "settling_out",
  placement: "bottom",
}
```

如果一个端口在产品语义上确实同时支持普通出流和沉降输运，可显式声明：

```ts
{
  id: "mixed_out",
  label: "Mixed outlet",
  role: "outlet",
  port_kind: "hydraulic_out",
  edgeKinds: ["hydraulic", "pump", "settling"],
  placement: "right",
}
```

这应当是例外，而不是所有 outlet 的默认行为。

### 12.2 `isValidConnection`

建议新增：

`frontend/src/features/udm-v2/nodes/portCompatibility.ts`

```ts
import type {
  Edge,
  Node,
} from "@xyflow/react"

import type {
  NetworkV2EdgeKind,
} from "../edges/edgeModel"
import type {
  NetworkV2NodeData,
  NetworkV2Port,
} from "./nodeTypes"
import {
  edgeKindsForPort,
  normalizeNetworkV2PortKind,
} from "./portKinds"

type ConnectionLike = {
  source: string | null
  target: string | null
  sourceHandle?: string | null
  targetHandle?: string | null
}

function isSourcePort(port: NetworkV2Port) {
  return normalizeNetworkV2PortKind(port).endsWith("_out")
}

function isTargetPort(port: NetworkV2Port) {
  return normalizeNetworkV2PortKind(port).endsWith("_in")
}

export function isValidNetworkV2Connection({
  connection,
  nodes,
  edgeKind,
}: {
  connection: ConnectionLike | Edge
  nodes: Node<NetworkV2NodeData>[]
  edgeKind: NetworkV2EdgeKind
}) {
  if (
    !connection.source ||
    !connection.target ||
    !connection.sourceHandle ||
    !connection.targetHandle
  ) {
    return false
  }

  if (connection.source === connection.target) {
    return false
  }

  const sourceNode = nodes.find((node) => node.id === connection.source)
  const targetNode = nodes.find((node) => node.id === connection.target)

  const sourcePort = sourceNode?.data.ports.find(
    (port) => port.id === connection.sourceHandle,
  )
  const targetPort = targetNode?.data.ports.find(
    (port) => port.id === connection.targetHandle,
  )

  if (!sourcePort || !targetPort) {
    return false
  }

  return (
    isSourcePort(sourcePort) &&
    isTargetPort(targetPort) &&
    edgeKindsForPort(sourcePort).includes(edgeKind) &&
    edgeKindsForPort(targetPort).includes(edgeKind)
  )
}
```

`NetworkV2Canvas` 使用 React Flow 顶层 `isValidConnection`，避免把完整 graph 查询逻辑重复放到每个 Handle 中。Handle 本身仍可根据 active edge kind 改变 opacity、accent 或 cursor。

### 12.3 serializer 必须同步

`toNetworkProcessGraphV1.ts`：

```ts
function toProcessPort(
  port: NetworkV2Port,
): NetworkProcessGraphV1Port {
  return {
    port_id: port.id,
    port_kind: normalizeNetworkV2PortKind(port),
  }
}
```

`fromNetworkProcessGraphV1.ts`：

```ts
function fromProcessPort(
  port: NetworkProcessGraphV1Port,
): NetworkV2Port {
  const isInput = port.port_kind.endsWith("_in")

  return {
    id: port.port_id,
    label: port.port_id,
    role:
      port.port_kind === "signal_in"
        ? "signal_in"
        : port.port_kind === "signal_out"
          ? "signal_out"
          : isInput
            ? "inlet"
            : "outlet",
    port_kind: port.port_kind,
    placement: isInput ? "left" : "right",
  }
}
```

其中 placement 是画布默认值，不是合同语义。用户之后可以在 UI 中调整 side；调整 side 不应改变 `port_kind`。

### 12.4 语义校验也要同步

UI 连接限制只能阻止新错误，不能阻止导入错误图。应在 `semanticValidation.ts` 增加：

```ts
type NetworkV2DiagnosticCode =
  | ExistingDiagnosticCodes
  | "EDGE_SOURCE_NODE_NOT_FOUND"
  | "EDGE_TARGET_NODE_NOT_FOUND"
  | "EDGE_SOURCE_PORT_NOT_FOUND"
  | "EDGE_TARGET_PORT_NOT_FOUND"
  | "EDGE_PORT_DIRECTION_INVALID"
  | "EDGE_PORT_KIND_INCOMPATIBLE"
  | "SELF_CONNECTION_FORBIDDEN"
```

校验每条 edge 的：

- source node 是否存在；
- target node 是否存在；
- source handle 是否存在；
- target handle 是否存在；
- source port 是否为 `*_out`；
- target port 是否为 `*_in`；
- edge kind 是否在两端 capability 中；
- 是否允许自环。

这样 UI、导入和合同转换使用同一套端口语义，不会出现“画布允许，但导出后变成另一类 port”的漂移。

---

## 13. 代码片段七：节点视觉和 handle 渐进显示

在 v2 feature 内新增视觉 token，而不是 import v1：

`frontend/src/features/udm-v2/nodes/networkV2NodeVisuals.ts`

```ts
import type { SystemStyleObject } from "@chakra-ui/react"

export const NETWORK_V2_NODE_RADIUS = "6px"
export const NETWORK_V2_GRID_SIZE = 20
export const NETWORK_V2_HANDLE_SIZE = 8

export function networkV2NodeSurface({
  accent,
  selected,
  hovered,
}: {
  accent: string
  selected: boolean
  hovered: boolean
}): SystemStyleObject {
  return {
    minW: "168px",
    maxW: "220px",
    position: "relative",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.52)",
    borderRadius: NETWORK_V2_NODE_RADIUS,
    backgroundColor: "rgba(255,255,255,0.64)",
    backdropFilter: "blur(8px)",
    boxShadow: hovered
      ? "0 10px 24px rgba(15,23,42,0.16)"
      : "0 5px 14px rgba(15,23,42,0.11)",
    outline: selected ? `2px solid ${accent}` : "0 solid transparent",
    outlineOffset: selected ? "2px" : "0",
    transition:
      "box-shadow 0.18s ease, outline-width 0.18s ease, outline-offset 0.18s ease",
  }
}
```

`NetworkV2NodeShell.tsx` 关键改造：

```tsx
import { useState } from "react"

export function NetworkV2NodeShell({
  data,
  selected = false,
  accent,
  icon: Icon,
  subtitle,
}: NetworkV2NodeShellProps) {
  const [hovered, setHovered] = useState(false)
  const showHandles = selected || hovered

  return (
    <Box
      as="fieldset"
      aria-label={`${data.label} ${data.node_kind} node`}
      {...networkV2NodeSurface({ accent, selected, hovered })}
      px={3}
      py={2}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {data.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={isTargetPort(port) ? "target" : "source"}
          position={positionByPlacement[port.placement]}
          aria-label={`${data.label} ${port.label} port`}
          title={port.label}
          style={{
            width: NETWORK_V2_HANDLE_SIZE,
            height: NETWORK_V2_HANDLE_SIZE,
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: "9999px",
            background: accent,
            opacity: showHandles ? 1 : 0,
            pointerEvents: showHandles ? "auto" : "none",
            transition: "opacity 0.16s ease",
            ...handleStyle(port, data.ports),
          }}
        />
      ))}

      {/* 节点内容 */}
      <HStack gap={2}>
        <Icon size={16} color={accent} />
        <Text fontWeight="700" fontSize="sm">
          {data.label}
        </Text>
      </HStack>

      <Text mt={1} fontSize="xs" color="fg.muted">
        {subtitle}
      </Text>
    </Box>
  )
}
```

注意：

- 不要用 `display: none` 隐藏 handle；这会让 React Flow 无法正确测量；
- 使用 `opacity` 和 `pointerEvents`；
- 如果未来动态改变 handle 的数量或几何位置，应调用 `useUpdateNodeInternals(nodeId)`；
- 当前只是改变 opacity，不需要更新内部几何。

---

## 14. 代码片段八：接近 v1 的页面布局

建议将 `NetworkV2FlowLayout` 从“文档页布局”改为“编辑器壳层”。

```tsx
import { Box } from "@chakra-ui/react"
import type { ReactNode } from "react"

type NetworkV2FlowLayoutProps = {
  canvas: ReactNode
  inspector: ReactNode
  toolbar: ReactNode
  status: ReactNode
  menu: ReactNode
  inspectorOpen: boolean
  onToggleInspector: () => void
}

export function NetworkV2FlowLayout({
  canvas,
  inspector,
  toolbar,
  status,
  menu,
  inspectorOpen,
  onToggleInspector,
}: NetworkV2FlowLayoutProps) {
  return (
    <Box
      h="100vh"
      w="100%"
      minH="520px"
      position="relative"
      overflow="hidden"
      data-udm-v2-editor
    >
      <Box h="100%" w="100%">
        {canvas}
      </Box>

      {toolbar}
      {status}
      {menu}

      <NetworkV2InspectorDrawer
        isOpen={inspectorOpen}
        onToggle={onToggleInspector}
      >
        {inspector}
      </NetworkV2InspectorDrawer>
    </Box>
  )
}
```

Inspector 开合状态可先放在 `UdmV2Page` 本地 UI state：

```tsx
const selectedNodeId = useUdmV2FlowStore((state) => state.selectedNodeId)
const selectedEdgeId = useUdmV2FlowStore((state) => state.selectedEdgeId)

const selectionExists = Boolean(selectedNodeId || selectedEdgeId)
const [inspectorPinned, setInspectorPinned] = useState(false)

const inspectorOpen = inspectorPinned || selectionExists
```

这类纯 UI 状态不应默认进入网络图持久化 payload。

### 14.1 标题与 runtime pending 文案放哪里

当前页面标题和 runtime pending 说明不应占据固定首屏高度：

- 图名放到浮动工作台标题区；
- runtime pending 使用状态 chip 或 dismissible notice；
- 长文案可放在 Submit 后的 toast/notification；
- graph family 可放到 tooltip 或 status overlay，不需要永久 badge。

---

## 15. Toolbar 重组建议

### 15.1 高频动作

永远可见：

- 当前边类型；
- Validate；
- Submit；
- Save；
- 折叠/展开。

### 15.2 节点与连接模式

推荐使用两个紧凑分组：

```text
Nodes:       Boundary | Reactor | Clarifier | Splitter | Controller
Connection: Hydraulic | Pump | Settling | Signal
```

选中连接类型后：

- 浮动工作台显示该类型的颜色、线型和图标；
- React Flow connection line 同步视觉；
- 不兼容 handle 变淡或保持隐藏；
- 兼容 handle 高亮；
- Escape 可取消正在进行的连接。

### 15.3 低频文件动作

放入 `⋯` 菜单：

- New；
- Save As；
- Load；
- Import JSON；
- Export JSON。

`Load` 应使用 Dialog：

```text
[搜索]
Plant A          v3    2 minutes ago
Plant B          v1    yesterday
...
[Cancel] [Load]
```

不要继续依赖 `window.prompt`。

---

## 16. 状态与持久化边界

### 16.1 应持久化

- nodes；
- edges；
- node position；
- source/target handle；
- edge kind 与业务参数；
- graph name/version；
- viewport（如果产品希望恢复视角）；
- 用户明确设置的 label；
- graph constraints。

### 16.2 不应持久化

- `__routing` lane index/offset；
- hover 状态；
- selected 状态；
- Inspector 是否打开；
- toolbar 拖动中的瞬时坐标；
- edge label 当前是否因 selection 显示；
- connection preview 状态。

### 16.3 可选持久化

这些取决于产品需求：

- toolbar 停靠位置；
- toolbar collapsed；
- Inspector pinned；
- MiniMap 显示开关。

若持久化，建议放到用户偏好/local storage，而不是 `network_process_graph.v1`。

---

## 17. Store 改造建议

当前 store 已有基础 graph actions，但 UI/UX 完整性还需要：

```ts
type UdmV2FlowActions = {
  // existing...
  deleteSelectedElement: () => void
  clearSelection: () => void
  selectNode: (id: string) => void
  selectEdge: (id: string) => void
}
```

示例：

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

deleteSelectedElement: () => {
  const {
    selectedNodeId,
    selectedEdgeId,
    nodes,
    edges,
  } = get()

  if (selectedEdgeId) {
    set({
      edges: edges.filter((edge) => edge.id !== selectedEdgeId),
      selectedEdgeId: null,
      dirty: true,
    })
    return
  }

  if (selectedNodeId) {
    set({
      nodes: nodes.filter((node) => node.id !== selectedNodeId),
      edges: edges.filter(
        (edge) =>
          edge.source !== selectedNodeId &&
          edge.target !== selectedNodeId,
      ),
      selectedNodeId: null,
      dirty: true,
    })
  }
},
```

还应考虑：

- `onEdgesChange` 收到 remove change 后清理相应 flow constraints；
- 删除 node 时清理引用其边的 constraints；
- `newGraph()` 前 dirty graph 应提供确认；
- Save 成功后再清 dirty；
- load 失败保留当前 graph，不要部分覆盖。

Undo/redo 可以后续增加，不应阻塞第一轮 UI parity。

---

## 18. 测试方案

### 18.1 单元测试：车道分配

新增：

`frontend/src/features/udm-v2/__tests__/edgeRouting.test.ts`

```ts
import { describe, expect, it } from "vitest"

import { decorateNetworkV2EdgesForRender } from "../edges/edgeRouting"
import {
  createNetworkV2EdgeData,
  networkV2EdgeTypeByKind,
  type NetworkV2EdgeKind,
} from "../edges/edgeModel"

const kinds: NetworkV2EdgeKind[] = [
  "hydraulic",
  "pump",
  "settling",
  "signal",
]

function parallelEdges() {
  return kinds.map((kind) => ({
    id: `edge-${kind}`,
    type: networkV2EdgeTypeByKind[kind],
    source: "source",
    sourceHandle: "out",
    target: "target",
    targetHandle: "in",
    data: createNetworkV2EdgeData(kind),
  }))
}

describe("decorateNetworkV2EdgesForRender", () => {
  it("assigns centered, unique lanes to four parallel edges", () => {
    const rendered = decorateNetworkV2EdgesForRender(parallelEdges())
    const offsets = rendered.map(
      (edge) => edge.data?.__routing?.source.offset,
    )

    expect(offsets).toEqual([-18, -6, 6, 18])
    expect(new Set(offsets).size).toBe(4)
  })

  it("keeps one edge on the center lane", () => {
    const [edge] = parallelEdges()
    const rendered = decorateNetworkV2EdgesForRender([edge])

    expect(rendered[0].data?.__routing?.source.offset).toBe(0)
    expect(rendered[0].data?.__routing?.target.offset).toBe(0)
  })

  it("is stable when input array order changes", () => {
    const original = decorateNetworkV2EdgesForRender(parallelEdges())
    const reversed = decorateNetworkV2EdgesForRender(
      [...parallelEdges()].reverse(),
    )

    const routeById = (edges: typeof original) =>
      Object.fromEntries(
        edges.map((edge) => [edge.id, edge.data?.__routing]),
      )

    expect(routeById(reversed)).toEqual(routeById(original))
  })

  it("does not mutate persistent edge data", () => {
    const stored = parallelEdges()
    decorateNetworkV2EdgesForRender(stored)

    expect(
      stored.some((edge) => "__routing" in edge.data),
    ).toBe(false)
  })
})
```

### 18.2 单元测试：路径唯一

```ts
it("creates different paths for different lane offsets", () => {
  const common = {
    sourceX: 100,
    sourceY: 100,
    sourcePosition: Position.Right,
    targetX: 400,
    targetY: 100,
    targetPosition: Position.Left,
  }

  const paths = [-18, -6, 6, 18].map((offset) =>
    getNetworkV2RoutedPath({
      ...common,
      routing: {
        source: { index: 0, count: 4, offset },
        target: { index: 0, count: 4, offset },
      },
    })[0],
  )

  expect(new Set(paths).size).toBe(4)
})
```

### 18.3 单元测试：端口兼容矩阵

至少覆盖：

| source | target | active kind | 预期 |
|---|---|---|---|
| `hydraulic_out` | `hydraulic_in` | hydraulic | true |
| `hydraulic_out` | `hydraulic_in` | pump | true/按产品规则 |
| `hydraulic_out` | `signal_in` | hydraulic | false |
| `signal_out` | `signal_in` | signal | true |
| `signal_out` | `hydraulic_in` | signal | false |
| `settling_out` | `settling_in` | settling | true |
| legacy generic outlet | legacy generic inlet | settling | false，除非显式 capability |
| node A | node A | 任意 | false |

### 18.4 Serializer 测试

必须验证：

```ts
const json = stableStringify(
  toNetworkProcessGraphV1({
    nodes,
    edges: storedEdges,
  }),
)

expect(json).not.toContain("__routing")
```

并继续验证：

- source_port/target_port 未改变；
- edge_kind 未改变；
- save/load roundtrip 后 lane 可重新确定性计算；
- 不需要把 lane 保存后再恢复。

### 18.5 Playwright：四类边同端口

构造两个节点，四条边共享相同 sourceHandle/targetHandle：

```ts
const paths = await page
  .locator(".react-flow__edge-path")
  .evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute("d"))
      .filter(Boolean),
  )

expect(paths).toHaveLength(4)
expect(new Set(paths).size).toBe(4)
```

进一步可测：

- 每条边可独立点击；
- 点击后 Inspector 显示正确 edge kind；
- 删除一条后其余三条重新居中；
- 保存/载入后路径分配稳定；
- 切换 edge kind 时 connection preview 同步；
- 不兼容 handle 无法落线。

### 18.6 截图回归

建议视口：

- `1440 × 900`：标准桌面；
- `1280 × 720`：紧凑桌面；
- `1024 × 768`：窄桌面/平板横屏；
- `390 × 844`：移动端。

截图状态：

1. 空画布；
2. 含 5 个节点和四类边；
3. 同 handle 四条平行边；
4. 节点 selected；
5. 边 selected；
6. Inspector 打开；
7. Toolbar 折叠；
8. diagnostics 展开。

---

## 19. 验收标准

### 19.1 UI/UX

- [ ] v2 首屏不再保留永久页面标题区。
- [ ] React Flow 画布占满工作区。
- [ ] Toolbar 是浮动、可折叠、可锁定的工作台。
- [ ] Node Palette 与四类 edge selector 被整合到工作台。
- [ ] Inspector 默认关闭，选中元素后自动滑入。
- [ ] 点击 pane 清空选择并关闭未固定 Inspector。
- [ ] Controls 左下、MiniMap 右下，视觉接近 v1。
- [ ] 节点 handle 默认隐藏，hover/selected/连接模式显示。
- [ ] 节点 selected 不发生尺寸跳动。
- [ ] 边默认低噪声，label 不永久占据画布。
- [ ] 四类边在灰度或色觉受限场景中仍可通过线型/marker/label 区分。
- [ ] 文案进入 i18n，不再新增硬编码英文。

### 19.2 多边路由

- [ ] 同一 source handle 的 2–10 条边离开端口后立即分开。
- [ ] 同一 target handle 的 2–10 条边进入端口前保持分开。
- [ ] 相同 source/target/handles 的四类边拥有四个不同 SVG path。
- [ ] 一条边时 lane offset 为 0。
- [ ] 删除任意边后剩余边重新居中。
- [ ] 交换 edge 数组顺序不改变 edge ID 对应的 lane。
- [ ] `__routing` 不进入 store、save payload、export JSON 或合同 serializer。
- [ ] label 使用 routed path 的 label coordinates。
- [ ] 每条边都有足够 interaction width，可独立点击。

### 19.3 语义

- [ ] Signal 只能连接 `signal_out → signal_in`。
- [ ] Settling 只能连接 `settling_out → settling_in`，或连接到显式声明多能力的端口。
- [ ] Hydraulic/Pump 的端口规则由 canonical `port_kind` 和 capability 明确表达。
- [ ] `toNetworkProcessGraphV1` 不再把 settling port 错映射为 hydraulic port。
- [ ] 导入错误图时 semantic validation 能报告端口错误。
- [ ] sourceHandle/targetHandle 仍是业务端口 ID。
- [ ] hard isolation 检查继续通过。

### 19.4 工程门槛

建议每个阶段至少运行：

```powershell
cd frontend
npm run typecheck
npm run test:unit
npm run check:udm-v2-boundary
npm run test:e2e
```

---

## 20. 分阶段实施方案

### 阶段 A：建立可验证基线

目标：避免“凭感觉接近 v1”。

1. 为 v1 `/udm` 和 v2 `/udm-v2` 建立相同节点拓扑 fixture。
2. 生成桌面与窄屏截图。
3. 把本方案的 UI/UX 验收项转成 Playwright 测试描述。
4. 给四类并行边增加专用 fixture。

退出条件：

- 当前差异有截图；
- 多边重叠可稳定复现；
- 后续每次变更有可比较证据。

### 阶段 B：先解决边语义和重叠

目标：先让图“可读、可点、语义正确”。

1. 新增 `edgeVisuals.ts`；
2. 新增 `edgeRouting.ts`；
3. 替换 `edgePath.ts`；
4. 改造 `NetworkV2EdgeShell`；
5. Canvas 使用 render-only decorated edges；
6. 加 marker、interaction width、按需 label；
7. 增加 port capability 和 connection validation；
8. 扩展 semantic validation；
9. 完成 unit + E2E。

退出条件：

- 四类并行边不共线；
- 每条可独立选择；
- 不污染 serializer；
- 端口兼容性测试通过。

### 阶段 C：统一编辑器外壳

目标：让 v2 的操作节奏接近 v1。

1. `NetworkV2FlowLayout` 改为全屏 editor shell；
2. Inspector 改为 feature-local slide-over；
3. Toolbar/Palette/Edge selector 合并为浮动工作台；
4. 状态栏改为 compact overlay；
5. 文件动作进入菜单；
6. `window.prompt` 替换为 Load dialog。

退出条件：

- 画布不再被固定右栏/底栏长期压缩；
- 高频操作在一个区域完成；
- 选中→Inspector→取消选择的流程与 v1 一致。

### 阶段 D：节点、画布和响应式细化

目标：完成视觉与操作细节。

1. feature-local 玻璃节点与面板 token；
2. hover/selected handle；
3. inline rename；
4. 点阵网格、snap、Controls、MiniMap；
5. i18n；
6. 移动端和窄屏；
7. screenshot regression。

退出条件：

- v1/v2 截图在布局和操作层级上接近；
- v2 四类连接能力仍清晰；
- 不出现 legacy import。

### 阶段 E：高密度与自动布线（可选）

仅在真实模型证明需要时实施：

- 几何感知 lane 排序；
- edge/node obstacle avoidance；
- junction 自动建议；
- edge bundling；
- topology auto-layout；
- undo/redo。

不要把该阶段作为前三阶段的前置条件。

---

## 21. 建议文件改动清单

### 新增

```text
frontend/src/features/udm-v2/edges/edgeVisuals.ts
frontend/src/features/udm-v2/edges/edgeRouting.ts
frontend/src/features/udm-v2/nodes/portCompatibility.ts
frontend/src/features/udm-v2/nodes/networkV2NodeVisuals.ts
frontend/src/features/udm-v2/canvas/NetworkV2FloatingWorkbench.tsx
frontend/src/features/udm-v2/canvas/NetworkV2InspectorDrawer.tsx
frontend/src/features/udm-v2/canvas/NetworkV2StatusOverlay.tsx
frontend/src/features/udm-v2/canvas/NetworkV2LoadDialog.tsx
frontend/src/features/udm-v2/__tests__/edgeRouting.test.ts
frontend/src/features/udm-v2/__tests__/portCompatibility.test.ts
frontend/tests/udm-v2-parallel-edges.spec.ts
frontend/tests/udm-v2-ui-parity.spec.ts
```

### 修改

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
frontend/src/features/udm-v2/serialize/semanticValidation.ts
frontend/src/i18n/messages/en/flow-core.ts
frontend/src/i18n/messages/zh/flow-core.ts
frontend/src/i18n/types.ts
```

### 原则上不应修改

为保持 hard isolation，这一轮不应为了复用 UI 而改动或 import：

```text
frontend/src/components/Flow/**
frontend/src/stores/flowStore.ts
frontend/src/stores/udmFlowStore.ts
frontend/src/services/udmService.ts
```

可以阅读、对照和 feature-local fork，但不能形成 v2 → legacy 依赖。

---

## 22. 关键设计决策

### 决策 1：复制“契约”，不复制依赖

复刻：

- 全屏 canvas；
- 浮动、折叠、锁定的工具面板；
- side drawer Inspector；
- 点阵网格和 MiniMap；
- hover/selected handle；
- 低噪声 edge label；
- 选择与删除节奏。

不复用：

- legacy Zustand store；
- legacy serializer；
- legacy UDM services；
- legacy Flow component imports；
- v1 单一 editable edge 数据模型。

### 决策 2：四类边的语义在 data/port capability，车道只负责展示

`edge_kind` 决定业务语义，`__routing` 只决定“画在哪里”。

这两者必须分离，避免以后算法调整造成合同版本变化。

### 决策 3：先局部确定性路由，再考虑全局自动布线

当前需求是 endpoint 重叠，不是通用电路 CAD 自动布线。局部 lane routing：

- 可解释；
- 易测；
- 不需要新依赖；
- 不改变合同；
- 能解决大多数当前场景。

### 决策 4：色彩不能成为唯一语义通道

四类边必须同时使用颜色、线型、箭头、label/icon 中至少两种以上通道。

### 决策 5：Graph-level Inspector 与 element-level Inspector 分层

持续把 flow constraints 和全图 diagnostics 堆在每个元素字段底部，会让 Inspector 难以扫描。应改成 tab、折叠区或独立 Graph 模式。

---

## 23. 主要风险与规避

| 风险 | 表现 | 规避 |
|---|---|---|
| render copy 被错误写回 store | export 出现 `__routing` | 类型名明确区分 persistent/rendered；serializer 测试禁止该字段 |
| lane 在刷新后跳动 | 相同边每次位置不同 | 禁止按数组当前 index 排序；使用 kind/opposite endpoint/id 稳定排序 |
| 多边仍在端点附近重叠 | 只给中段加 offset | source 与 target 都使用 fan-out/fan-in anchor |
| label 仍互相盖住 | 路径分开但标签永久显示 | 默认只显示 selected/custom label |
| handle 隐藏后不能连线 | 使用 `display:none` | 只使用 opacity + pointerEvents |
| port capability 改动破坏旧 fixture | 未指定能力时全部失效 | 为 hydraulic/pump/signal 提供兼容默认；settling 要求显式声明 |
| 视觉复刻破坏 hard isolation | v2 import legacy Flow | 所有 token/component 在 feature 内 fork；继续执行 boundary check |
| overlay 挡住画布交互 | 工具栏容器吃掉整层 pointer | 外层 `pointer-events:none`，具体 panel `pointer-events:auto` |
| 选中态导致节点尺寸跳动 | border 1px → 2px | 固定 border，selected 用 outline |
| 边难以点击 | 可见 stroke 太细 | `interactionWidth` 设为 18 左右 |
| 大图性能下降 | 每条 edge 自己读取全部 edges | Canvas 中一次 `useMemo` 分组；edge renderer 只读自己的 routing data |

---

## 24. 最终建议

按照影响和依赖关系，最佳实施顺序是：

```text
截图/fixture 基线
  → edge visual token
  → endpoint lane routing
  → port capability + semantic validation
  → edge interaction/labels/markers
  → full-screen shell
  → floating workbench
  → inspector drawer
  → glass nodes/hover handles
  → load dialog/i18n/mobile
  → screenshot regression
```

最重要的两个“不做”：

1. **不要为了 UI 相似而让 v2 import `frontend/src/components/Flow/**`。**
2. **不要把 lane/offset 存入 `edge.data.ui` 或合同 payload。**

最重要的两个“必须做”：

1. **同一逻辑 handle 的多边必须在 source 和 target 两端都分配稳定车道。**
2. **四类边必须由端口 capability 和 semantic validation 约束，而不只是靠当前选中的颜色模式。**

完成阶段 B 和阶段 C 后，v2 就会在“可读性、操作节奏、画布面积、选择反馈”上显著接近 v1，同时保留 v2 四类连接线和独立架构的优势。
