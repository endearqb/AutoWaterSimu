# UDM v2 画布 UI/UX 对齐 v1 + 四类连接线防重叠方案

> 基于分支 `origin/codex/udm-v2-frontend-split`（HEAD `61e2259`）的代码审阅。
> v1 指 `/udm` 页面（`frontend/src/components/Flow/**` + `UDMNode` 等），
> v2 指 `/udm-v2` 页面（`frontend/src/features/udm-v2/**`）。

---

## 0. 结论摘要

- v2 目前是"白卡 + 常显 handle + 固定三段式布局"的原型形态，与 v1 的"玻璃拟态 + hover 显隐 handle + 满幅画布 + 滑入式检查器"差距集中在 **6 个方面**（见 §1 对照表），全部可以在 v2 目录内闭环补齐，不违反目录隔离约定。
- 四类边（hydraulic / pump / settling / signal）共用同一 handle 时的重叠问题，推荐用**"车道系统"（edge lanes）**解决：按 `(节点, handle)` 分组给每条边分配稳定车道号，在边渲染时沿节点边缘做锚点错位 + 阶梯化转折距离 + 标签对角错位。**不改 handle id、不动序列化契约**，是风险最低的方案（§5）。
- 需要更强的"物理分口"时，再叠加可选的**子锚点方案**（`portId@index` 命名 + 序列化剥后缀），作为阶段四（§6）。

**两条硬约束（务必遵守）：**

| 约束 | 出处 | 对方案的影响 |
|---|---|---|
| v2 目录不得 import `components/Flow/**`、legacy stores、legacy UDM service | `features/udm-v2/README.md` §3.1 | v1 的 `glass.ts`、`HoverContext`、`BaseInspectorContainer` 均需在 v2 内**复刻**为 `theme/glassV2.ts` 等，不能直接 import |
| `source_port: edge.sourceHandle \|\| "out"` / `target_port: edge.targetHandle \|\| "in"` | `serialize/toNetworkProcessGraphV1.ts` L144/L146 | handle id 即契约端口 id。防重叠优先在边渲染层做（车道方案），若上子锚点必须配 `portIdFromHandleId` 剥后缀 |

---

## 1. v1 vs v2 差距对照表

| 维度 | v1（/udm，FlowCanvas + FlowLayout） | v2（/udm-v2，NetworkV2Canvas） | 差距级别 |
|---|---|---|---|
| **整体布局** | 画布满幅 `calc(100vh)`；检查器为右侧**滑入式抽屉**（选中才弹出，画布 `margin-right` 推移）；浮动可拖拽/可锁定工具栏；BubbleMenu 浮动菜单 | 页头(Heading+toolbar) / 画布+**常驻 340px 检查器** / 底部状态栏 三段式；palette 与 edge selector 为画布内白卡 | ★★★ |
| **节点视觉** | 玻璃拟态：tint 0.45 背景 + `blur(8px)` + 四层内外阴影 + 左侧 3px accent 色条 + 6px 圆角 + 选中时外扩 outline；最小尺寸对齐 20px 网格 | 白底卡片 fieldset，图标+粗体标题+副标题；选中变 2px 边框+投影 | ★★★ |
| **Handle 交互** | 四边 handle **悬于节点边缘外 9px**；hover/选中才显示，离开 **500ms 延迟淡出**；16px 命中扩边 + rAF 节流的 hover 探测；tint 色圆点白描边；`isNotSelfConnection` 防自连 | handle **常显**在边框上，10px 圆点；无 hover 显隐；无自连防护、无端口角色防呆（signal 口可被水力边占用，只在 validateGraph 时报警） | ★★★ |
| **画布行为** | `snapToGrid [5,5]`、`fitViewOptions {padding:0.15, maxZoom:1}`、min/maxZoom、panOnScroll、双击缩放/框选/Delete 删除/Meta 多选（桌面）、移动端 touchAction 适配；Dots 背景（20 间距 slate 色）；样式化 MiniMap（按 tint 上色、毛玻璃、可开关） | 默认 ReactFlow 配置 + fitView；`Background color=#d4d8dd`；默认 Controls / MiniMap 无样式 | ★★ |
| **边视觉/交互** | 1.5px 描边，选中 3px 深色；**Arrow markerEnd 箭头**；标签为白底小 pill（9px），**双击内联编辑流量**；无值时留透明热区 | 2px（选中 3px），四色 + settling 虚线`6 4` / signal 点线`1 6`；**没有任何箭头**（全库 grep 无 MarkerType）；标签常显 pill 不可编辑（必须去检查器改）；多条边同 handle 时**路径与标签完全压盖** | ★★★ |
| **其他** | i18n（useI18n）全覆盖；MiniMap 品牌链接隐藏；节点默认选中框 CSS 复位 | 文案硬编码英文；未做 CSS 复位；`edge-${Date.now()}` 快速连线可能撞 id | ★ |

---

## 2. 总体方案与分阶段

```
P0 画布行为对齐        —— 只改 NetworkV2Canvas 配置项，半天，先把"手感"拉齐
P1 玻璃视觉 + Handle   —— theme/glassV2.ts + hoverContextV2 + NodeShell 重写
P2 边车道系统（核心）  —— edgeLanes + edgePath 升级 + EdgeShell 重写 + 箭头/编辑
P3 布局对齐            —— 满幅画布 + 滑入检查器 + 浮动玻璃面板
P4 可选：物理子锚点    —— portId@index 子 handle + 序列化剥后缀
```

新增/改动文件全部落在 `frontend/src/features/udm-v2/` 内：

```
features/udm-v2/
├─ theme/
│  ├─ glassV2.ts            # 新增：v2 玻璃拟态样式系统（复刻 v1 glass.ts）
│  └─ hoverContextV2.ts     # 新增：hover 节点上下文（复刻 v1 HoverContext）
├─ edges/
│  ├─ edgeLanes.ts          # 新增：车道分配纯函数（防重叠核心）
│  ├─ EdgeLaneContext.tsx   # 新增：车道表 Context
│  ├─ edgeVisuals.ts        # 新增：四类边配色/虚线/箭头统一出口
│  ├─ connectionRules.ts    # 新增：连线即时防呆（自连 + 端口角色）
│  ├─ portHandles.ts        # 新增：handleId ↔ portId 约定（P4 也用）
│  ├─ edgePath.ts           # 升级：接受车道几何参数（向后兼容）
│  ├─ NetworkV2EdgeShell.tsx# 重写：车道偏移 + 标签错位 + 双击编辑 + 箭头
│  └─ HydraulicV2Edge.tsx 等四个 kind 组件  # 小改：接入编辑回调
├─ nodes/NetworkV2NodeShell.tsx  # 重写：玻璃容器 + hover handle + 双击改名
├─ canvas/NetworkV2Canvas.tsx    # 重写：行为配置 + hover 探测 + 车道 Provider
├─ canvas/NetworkV2FlowLayout.tsx# 重写：v1 式满幅布局 + 滑入检查器
├─ state/createUdmV2FlowStore.ts # 补丁：onConnect/replaceGraph 补箭头、边 id 防撞
└─ serialize/toNetworkProcessGraphV1.ts # 仅 P4 需要：portIdFromHandleId
```

---

## 3. 阶段一（P0）+ 阶段二（P1）：画布行为与玻璃视觉

### 3.1 `theme/glassV2.ts`（新增）

复刻 v1 `components/Flow/nodes/utils/glass.ts` 的阴影/透明度结构（tint 0.45 / outline 0.7 / handle 0.9），色相沿用当前 v2 各 kind 的 accent 色，避免语义色突变：

```ts
// frontend/src/features/udm-v2/theme/glassV2.ts
// v2 专用玻璃拟态样式系统。
// 按目录隔离约定（features/udm-v2/README.md §3.1），udm-v2 不得 import
// components/Flow/**，因此这里"复刻"而非复用 v1 的 glass.ts。
import type { SystemStyleObject } from "@chakra-ui/react"
import { Position } from "@xyflow/react"
import type { CSSProperties } from "react"

import type { NetworkV2NodeKind } from "../nodes/nodeTypes"

export const V2_GRID_SIZE = 20 as const
export const V2_NODE_RADIUS = "6px" as const
export const V2_HOVER_PAD_PX = 16 as const
export const V2_HANDLE_HIDE_DELAY_MS = 500 as const

type Hsl = { h: number; s: number; l: number }

// 色相对应当前 v2 accent（#2563eb / #7c3aed / #15803d / #b45309 / #0f766e），
// 明度略提以配合 0.45 透明度的 tint 用法（与 v1 视觉密度一致）。
const KIND_HUES: Record<NetworkV2NodeKind, Hsl> = {
  boundary: { h: 221, s: 72, l: 56 },
  udm_reactor: { h: 262, s: 68, l: 58 },
  secondary_clarifier_10_layer: { h: 142, s: 58, l: 42 },
  splitter: { h: 28, s: 74, l: 50 },
  controller: { h: 175, s: 56, l: 42 },
}

const hsla = ({ h, s, l }: Hsl, alpha: number, dl = 0) =>
  `hsla(${h}, ${s}%, ${Math.max(0, Math.min(100, l + dl))}%, ${alpha})`

export const getV2Tint = (kind: NetworkV2NodeKind) =>
  hsla(KIND_HUES[kind], 0.45)
export const getV2Outline = (kind: NetworkV2NodeKind) =>
  hsla(KIND_HUES[kind], 0.7)
export const getV2Accent = (kind: NetworkV2NodeKind) =>
  hsla(KIND_HUES[kind], 0.85, -8)
export const getV2HandleColor = (kind: NetworkV2NodeKind) =>
  hsla(KIND_HUES[kind], 0.9)

// 阴影结构逐字对齐 v1 glass.ts
const DESKTOP_BASE_SHADOW = [
  "inset -2px -2px 8px 2px rgba(255,255,255,0.65)",
  "inset 2px 2px 6px -2px rgba(0,0,0,0.10)",
  "-6px -6px 6px rgba(255,255,255,0.8)",
  "4px 4px 12px rgba(0,0,0,0.2)",
].join(", ")

const DESKTOP_HOVER_SHADOW = [
  "inset -2px -2px 8px 2px rgba(255,255,255,0.75)",
  "inset 2px 2px 6px -2px rgba(0,0,0,0.12)",
  "-6px -6px 16px rgba(255,255,255,0.8)",
  "6px 6px 18px rgba(0,0,0,0.18)",
].join(", ")

const MOBILE_BASE_SHADOW = [
  "inset 1px 1px 2px rgba(255,255,255,0.55)",
  "inset -2px -2px 4px rgba(0,0,0,0.06)",
  "-4px -4px 10px rgba(255,255,255,0.45)",
  "4px 4px 12px rgba(0,0,0,0.1)",
].join(", ")

const MOBILE_HOVER_SHADOW = [
  "inset 1px 1px 2px rgba(255,255,255,0.65)",
  "inset -2px -2px 4px rgba(0,0,0,0.08)",
  "-4px -4px 12px rgba(255,255,255,0.55)",
  "4px 4px 14px rgba(0,0,0,0.14)",
].join(", ")

type GlassNodeOptions = {
  kind: NetworkV2NodeKind
  selected?: boolean
  hovered?: boolean
}

export const getV2GlassNodeStyles = ({
  kind,
  selected = false,
  hovered = false,
}: GlassNodeOptions): SystemStyleObject => ({
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,0.4)",
  borderRadius: V2_NODE_RADIUS,
  backgroundColor: getV2Tint(kind),
  boxShadow: {
    base: hovered ? MOBILE_HOVER_SHADOW : MOBILE_BASE_SHADOW,
    md: hovered ? DESKTOP_HOVER_SHADOW : DESKTOP_BASE_SHADOW,
  },
  backdropFilter: { base: "blur(6px)", md: "blur(8px)" },
  outlineStyle: "solid",
  outlineColor: getV2Outline(kind),
  outlineWidth: selected ? "2px" : "0px",
  outlineOffset: selected ? "2px" : "0px",
  transition:
    "box-shadow 0.2s ease, outline-width 0.2s ease, outline-offset 0.2s ease, outline-color 0.2s ease",
  position: "relative",
  minWidth: `${V2_GRID_SIZE * 6}px`,
  minHeight: `${V2_GRID_SIZE * 2}px`,
})

const HANDLE_SIZE = 8
const HANDLE_GAP = 1
const HANDLE_OFFSET = HANDLE_SIZE + HANDLE_GAP

// v1 的 handle 悬于节点边缘之外；v2 一条边上可能有多个端口（如二沉池底部
// RAS + WAS），因此比 v1 多一个 alongPct：端口沿该边的百分比位置。
const placement = (position: Position, alongPct: number): CSSProperties => {
  switch (position) {
    case Position.Top:
      return {
        top: `-${HANDLE_OFFSET}px`,
        left: `${alongPct}%`,
        transform: "translateX(-50%)",
      }
    case Position.Bottom:
      return {
        top: `calc(100% + ${HANDLE_GAP}px)`,
        left: `${alongPct}%`,
        transform: "translateX(-50%)",
      }
    case Position.Left:
      return {
        left: `-${HANDLE_OFFSET}px`,
        top: `${alongPct}%`,
        transform: "translateY(-50%)",
      }
    case Position.Right:
      return {
        left: `calc(100% + ${HANDLE_GAP}px)`,
        top: `${alongPct}%`,
        transform: "translateY(-50%)",
      }
    default:
      return { transform: "translate(-50%, -50%)" }
  }
}

export const getV2HandleStyle = (
  kind: NetworkV2NodeKind,
  visible: boolean,
  position: Position,
  alongPct = 50,
): CSSProperties => ({
  background: getV2HandleColor(kind),
  border: "1px solid rgba(255,255,255,0.85)",
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  borderRadius: "9999px",
  opacity: visible ? 1 : 0,
  transition: "opacity 0.2s ease",
  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  pointerEvents: visible ? "auto" : "none",
  ...placement(position, alongPct),
})

export const getV2GlassPanelStyles = ({
  hovered = false,
}: { hovered?: boolean } = {}): SystemStyleObject => ({
  backgroundColor: "hsla(0, 0%, 100%, 0.72)",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,0.45)",
  borderRadius: "16px",
  boxShadow: hovered ? DESKTOP_HOVER_SHADOW : DESKTOP_BASE_SHADOW,
  backdropFilter: "blur(8px)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
})
```

### 3.2 `theme/hoverContextV2.ts`（新增）

```ts
// frontend/src/features/udm-v2/theme/hoverContextV2.ts
import { createContext, useContext } from "react"

export type NodeHoverContextValue = { hoveredNodeId: string | null }

export const NodeHoverContext = createContext<NodeHoverContextValue>({
  hoveredNodeId: null,
})

export const useHoveredNodeIdV2 = () =>
  useContext(NodeHoverContext).hoveredNodeId
```

### 3.3 `nodes/NetworkV2NodeShell.tsx`（重写）

对齐 v1 UDMNode 的三个交互：hover/选中显 handle（500ms 延迟淡出）、双击内联改名、左侧 accent 色条。注意 props 增加 `id`（各 kind 节点组件透传 `props.id` 即可），`accent` 改由 kind 推导：

```tsx
// frontend/src/features/udm-v2/nodes/NetworkV2NodeShell.tsx
import { Box, HStack, Input, Text } from "@chakra-ui/react"
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react"
import type { LucideIcon } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"

import { makeIsValidConnection } from "../edges/connectionRules"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import {
  V2_GRID_SIZE,
  V2_HANDLE_HIDE_DELAY_MS,
  getV2Accent,
  getV2GlassNodeStyles,
  getV2HandleStyle,
} from "../theme/glassV2"
import { useHoveredNodeIdV2 } from "../theme/hoverContextV2"
import type {
  NetworkV2NodeData,
  NetworkV2Port,
  NetworkV2PortPlacement,
} from "./nodeTypes"

type NetworkV2NodeShellProps = {
  id: string
  data: NetworkV2NodeData
  selected?: boolean
  icon: LucideIcon
  subtitle: string
}

const positionByPlacement: Record<NetworkV2PortPlacement, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
}

const isTargetPort = (port: NetworkV2Port) =>
  port.role === "inlet" || port.role === "signal_in"

// 沿边均匀分布（保留原 v2 逻辑），供 getV2HandleStyle 的 alongPct 使用
const alongPct = (port: NetworkV2Port, ports: NetworkV2Port[]) => {
  const sidePorts = ports.filter((p) => p.placement === port.placement)
  const index = sidePorts.findIndex((p) => p.id === port.id)
  return ((index + 1) / (sidePorts.length + 1)) * 100
}

const isValidConnection = makeIsValidConnection(() =>
  useUdmV2FlowStore.getState(),
)

function NetworkV2NodeShellBase({
  id,
  data,
  selected,
  icon: Icon,
  subtitle,
}: NetworkV2NodeShellProps) {
  const kind = data.node_kind
  const accent = getV2Accent(kind)
  const updateNodeData = useUdmV2FlowStore((state) => state.updateNodeData)
  const hoveredNodeId = useHoveredNodeIdV2()
  const isHovered = hoveredNodeId === id
  const updateNodeInternals = useUpdateNodeInternals()

  // —— v1 同款：hover/选中显示 handle，离开 500ms 后淡出 ——
  const [showHandles, setShowHandles] = useState(!!selected)
  const hideTimerRef = useRef<number | null>(null)
  useEffect(() => {
    const active = isHovered || !!selected
    if (active) {
      setShowHandles(true)
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    } else if (!hideTimerRef.current) {
      hideTimerRef.current = window.setTimeout(() => {
        setShowHandles(false)
        hideTimerRef.current = null
      }, V2_HANDLE_HIDE_DELAY_MS)
    }
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [isHovered, selected])

  // —— v1 同款：双击内联改名 ——
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => setLabel(data.label), [data.label])
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])
  // label 改变会影响节点宽度，同步 handle 内部坐标（v1 useHandlePositionSync 同款）
  useEffect(() => updateNodeInternals(id), [id, label, updateNodeInternals])

  const commitLabel = () => {
    setIsEditing(false)
    updateNodeData(id, { label: label.trim() || data.label })
  }

  return (
    <Box
      aria-label={`${data.label} ${data.node_kind} node`}
      px={3}
      py={2}
      display="flex"
      flexDirection="column"
      justifyContent="center"
      maxW="240px"
      cursor={isEditing ? "text" : "pointer"}
      onDoubleClick={() => setIsEditing(true)}
      {...getV2GlassNodeStyles({ kind, selected, hovered: isHovered })}
    >
      {/* v1 同款：左侧 accent 色条 */}
      <Box
        position="absolute"
        left="6px"
        top="8px"
        bottom="8px"
        width="3px"
        borderRadius="full"
        bg={accent}
      />

      {data.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={isTargetPort(port) ? "target" : "source"}
          position={positionByPlacement[port.placement]}
          aria-label={`${data.label} ${port.label} port`}
          title={port.label}
          isValidConnection={isValidConnection}
          style={getV2HandleStyle(
            kind,
            showHandles,
            positionByPlacement[port.placement],
            alongPct(port, data.ports),
          )}
        />
      ))}

      <HStack gap={2} align="center" pl={2}>
        <Icon size={15} color={accent} />
        {isEditing ? (
          <Input
            ref={inputRef}
            className="nodrag"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitLabel()
              if (event.key === "Escape") {
                setLabel(data.label)
                setIsEditing(false)
              }
            }}
            size="xs"
            fontSize="sm"
            fontWeight="medium"
            color={accent}
          />
        ) : (
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={accent}
            lineHeight="1.2"
            userSelect="none"
          >
            {label}
          </Text>
        )}
      </HStack>
      <Text mt={0.5} pl={2} fontSize="2xs" color="gray.500" userSelect="none">
        {subtitle}
      </Text>
    </Box>
  )
}

export const NetworkV2NodeShell = memo(NetworkV2NodeShellBase)
```

各 kind 节点组件同步小改（以 UdmReactor 为例，其余四个同理，删除 `accent` 改传 `id`）：

```tsx
// frontend/src/features/udm-v2/nodes/UdmReactorV2Node.tsx
export function UdmReactorV2Node(props: NodeProps) {
  return (
    <NetworkV2NodeShell
      id={props.id}
      data={props.data as NetworkV2NodeData}
      selected={props.selected}
      icon={FlaskConical}
      subtitle="UDM reaction unit"
    />
  )
}
```

> 顺带把 `NetworkV2NodePalette` / `NetworkV2EdgeModeSelector` 外层白卡三件套
> （`bg="white" + borderWidth + boxShadow`）替换为 `{...getV2GlassPanelStyles()}`，
> palette 项可参考 v1 `toolbar/NodePalette.tsx` 用 `getV2GlassNodeStyles` 做玻璃小卡。

---

## 4. `canvas/NetworkV2Canvas.tsx`（重写）：行为对齐 + 两个 Provider

把 v1 FlowCanvas 的行为配置搬过来（吸附网格、缩放范围、快捷键、Dots 背景、样式化 MiniMap、CSS 复位），同时挂上 §3 的 hover 探测和 §5 的车道表：

```tsx
// frontend/src/features/udm-v2/canvas/NetworkV2Canvas.tsx
import { Box, Text } from "@chakra-ui/react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  type DragEvent,
  type MouseEventHandler,
  useMemo,
  useRef,
  useState,
} from "react"

import { EdgeLaneContext } from "../edges/EdgeLaneContext"
import { NetworkV2EdgeModeSelector } from "../edges/NetworkV2EdgeModeSelector"
import { makeIsValidConnection } from "../edges/connectionRules"
import { computeEdgeLanes } from "../edges/edgeLanes"
import { networkV2EdgeTypeByKind } from "../edges/edgeModel"
import { networkV2EdgeTypes } from "../edges/edgeTypes"
import { edgeMarkerEnd } from "../edges/edgeVisuals"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"
import {
  createNetworkV2Node,
  networkV2NodeTypes,
  normalizeNetworkV2NodeKind,
} from "../nodes/nodeTypes"
import {
  NETWORK_V2_NODE_DRAG_MIME,
  NetworkV2NodePalette,
} from "../palette/NetworkV2NodePalette"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { V2_GRID_SIZE, V2_HOVER_PAD_PX, getV2Accent } from "../theme/glassV2"
import { NodeHoverContext } from "../theme/hoverContextV2"

const isDesktop = () =>
  typeof window === "undefined" || window.innerWidth > 768

const isValidConnection = makeIsValidConnection(() =>
  useUdmV2FlowStore.getState(),
)

export function NetworkV2Canvas() {
  const { screenToFlowPosition } = useReactFlow()
  const nodes = useUdmV2FlowStore((state) => state.nodes)
  const edges = useUdmV2FlowStore((state) => state.edges)
  const onNodesChange = useUdmV2FlowStore((state) => state.onNodesChange)
  const onEdgesChange = useUdmV2FlowStore((state) => state.onEdgesChange)
  const onConnect = useUdmV2FlowStore((state) => state.onConnect)
  const addNode = useUdmV2FlowStore((state) => state.addNode)
  const setSelectedNodeId = useUdmV2FlowStore((s) => s.setSelectedNodeId)
  const setSelectedEdgeId = useUdmV2FlowStore((s) => s.setSelectedEdgeId)
  const setViewport = useUdmV2FlowStore((state) => state.setViewport)
  const showMiniMap = useUdmV2FlowStore((state) => state.showMiniMap)
  const activeEdgeKind = useUdmV2FlowStore((state) => state.activeEdgeKind)
  const setActiveEdgeKind = useUdmV2FlowStore((s) => s.setActiveEdgeKind)

  // —— 车道表：只依赖 edges，节点拖动不触发重算（见 §5.1 的稳定排序设计）——
  const laneMap = useMemo(() => computeEdgeLanes(edges), [edges])

  // —— v1 同款 hover 探测：16px 命中扩边 + rAF 节流 ——
  const rafLockRef = useRef(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    if (rafLockRef.current) return
    rafLockRef.current = true
    const { clientX, clientY } = event
    requestAnimationFrame(() => {
      try {
        const nodeEls = document.querySelectorAll<HTMLElement>(
          '[data-testid="udm-v2-canvas"] .react-flow__node',
        )
        let found: string | null = null
        for (const el of Array.from(nodeEls)) {
          const rect = el.getBoundingClientRect()
          if (
            clientX >= rect.left - V2_HOVER_PAD_PX &&
            clientX <= rect.right + V2_HOVER_PAD_PX &&
            clientY >= rect.top - V2_HOVER_PAD_PX &&
            clientY <= rect.bottom + V2_HOVER_PAD_PX
          ) {
            found = el.getAttribute("data-id")
            break
          }
        }
        setHoveredNodeId(found)
      } finally {
        rafLockRef.current = false
      }
    })
  }

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const rawKind = event.dataTransfer.getData(NETWORK_V2_NODE_DRAG_MIME)
    if (!rawKind) return
    const kind = normalizeNetworkV2NodeKind(rawKind)
    addNode(
      createNetworkV2Node(
        kind,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      ),
    )
  }

  return (
    <Box
      h="full"
      minH="520px"
      position="relative"
      data-testid="udm-v2-canvas"
      style={{ touchAction: "none", userSelect: "none" }}
      onMouseMove={handleMouseMove}
    >
      <style>{`
        [data-testid="udm-v2-canvas"] .react-flow {
          --xy-node-boxshadow-selected: none;
          --xy-node-border: none;
        }
        [data-testid="udm-v2-canvas"] .react-flow__minimap-mask a {
          display: none !important;
        }
        /* 边 hover 加粗（BaseEdge 的 20px 交互热区默认已足够） */
        [data-testid="udm-v2-canvas"] .react-flow__edge:hover .react-flow__edge-path {
          stroke-width: 2.5;
        }
      `}</style>

      <NetworkV2EdgeModeSelector
        activeKind={activeEdgeKind}
        onChange={setActiveEdgeKind}
      />
      <NetworkV2NodePalette />

      <NodeHoverContext.Provider value={{ hoveredNodeId }}>
        <EdgeLaneContext.Provider value={laneMap}>
          <ReactFlow
            aria-label="UDM Network v2 canvas"
            nodes={nodes}
            edges={edges}
            nodeTypes={networkV2NodeTypes}
            edgeTypes={networkV2EdgeTypes}
            defaultEdgeOptions={{
              type: networkV2EdgeTypeByKind[activeEdgeKind],
              markerEnd: edgeMarkerEnd(activeEdgeKind),
            }}
            isValidConnection={isValidConnection}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMoveEnd={(_, viewport) => setViewport(viewport)}
            onSelectionChange={({ nodes: sn, edges: se }) => {
              setSelectedNodeId(sn[0]?.id ?? null)
              setSelectedEdgeId(se[0]?.id ?? null)
            }}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            snapToGrid
            snapGrid={[V2_GRID_SIZE / 4, V2_GRID_SIZE / 4]}
            minZoom={0.1}
            maxZoom={isDesktop() ? 2 : 4}
            panOnScroll
            panOnDrag
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={isDesktop()}
            selectionOnDrag={isDesktop()}
            deleteKeyCode={isDesktop() ? ["Backspace", "Delete"] : null}
            multiSelectionKeyCode={isDesktop() ? "Meta" : null}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={V2_GRID_SIZE}
              size={1}
              color="hsl(215.4 16.3% 56.9%)"
            />
            <Controls position="bottom-left" />
            {showMiniMap && (
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                nodeColor={(node) =>
                  getV2Accent((node.data as NetworkV2NodeData).node_kind)
                }
                nodeStrokeColor="hsl(215.4 16.3% 46.9%)"
                nodeStrokeWidth={1}
                nodeBorderRadius={3}
                maskColor="hsla(0, 0%, 0%, 0.05)"
                style={{
                  backgroundColor: "hsl(0 0% 100% / 0.95)",
                  border: "1px solid hsl(214.3 31.8% 91.4%)",
                  borderRadius: "6px",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 4px 6px -1px hsla(222.2, 84%, 4.9%, 0.1)",
                }}
              />
            )}
          </ReactFlow>
        </EdgeLaneContext.Provider>
      </NodeHoverContext.Provider>

      {nodes.length === 0 && edges.length === 0 && (
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          display="grid"
          placeItems="center"
        >
          <Text color="fg.muted" fontSize="sm">
            Empty UDM Network v2 graph
          </Text>
        </Box>
      )}
    </Box>
  )
}
```

要点说明：

- **删除快捷键**不再需要 v1 那套自定义 `keydown` 监听——v2 的 store 用 `applyNodeChanges/applyEdgeChanges`，直接给 `deleteKeyCode={["Backspace","Delete"]}` 就能删（React Flow 自己发 remove change）。
- 两个 Provider 必须**包在 `<ReactFlow>` 外面**：边组件（含 `EdgeLabelRenderer` 的 portal）都能穿透拿到 Context。
- `defaultEdgeOptions.markerEnd` 只是兜底，正式赋值在 store 的 `onConnect`（§5.6），这样存档回放也带箭头。

### 4.1 连线即时防呆 `edges/connectionRules.ts`（新增）

v2 现在允许把水力边接到 controller 的 signal 口，要到 `validateGraph` 才报错。对齐 v1 的"拖到非法 handle 直接拒绝"体验：

```ts
// frontend/src/features/udm-v2/edges/connectionRules.ts
import type { Connection, Edge } from "@xyflow/react"

import type { NetworkV2NodeData, NetworkV2PortRole } from "../nodes/nodeTypes"
import type { NetworkV2EdgeKind } from "./edgeModel"
import { portIdFromHandleId } from "./portHandles"

type ConnectionRuleState = {
  nodes: Array<{ id: string; data: NetworkV2NodeData }>
  activeEdgeKind: NetworkV2EdgeKind
}

const SIGNAL_ROLES: NetworkV2PortRole[] = ["signal_in", "signal_out"]

/**
 * 连线阶段的即时防呆：
 * 1. 禁止自连（v1 connectionGuards 同款）；
 * 2. signal 边至少一端为 signal 口；非 signal 边不得占用 signal 口；
 * 3. 其余语义（flow_spec/transport_model 互斥等）仍由 validateGraph 兜底，
 *    此处保持宽松，避免和契约演进打架。
 */
export function makeIsValidConnection(getState: () => ConnectionRuleState) {
  return (conn: Connection | Edge): boolean => {
    if (!conn.source || !conn.target) return false
    if (conn.source === conn.target) return false

    const { nodes, activeEdgeKind } = getState()
    const findPort = (nodeId: string, handleId?: string | null) =>
      nodes
        .find((node) => node.id === nodeId)
        ?.data.ports.find((port) => port.id === portIdFromHandleId(handleId))

    const sourcePort = findPort(conn.source, conn.sourceHandle)
    const targetPort = findPort(conn.target, conn.targetHandle)
    if (!sourcePort || !targetPort) return true // 信息不足时放行

    const sourceIsSignal = SIGNAL_ROLES.includes(sourcePort.role)
    const targetIsSignal = SIGNAL_ROLES.includes(targetPort.role)
    if (activeEdgeKind === "signal") return sourceIsSignal || targetIsSignal
    return !sourceIsSignal && !targetIsSignal
  }
}
```

```ts
// frontend/src/features/udm-v2/edges/portHandles.ts
/**
 * 子锚点命名约定："{portId}@{index}"。
 * 契约层（network_process_graph.v1 的 source_port/target_port）只认 portId，
 * 序列化前必须用 portIdFromHandleId 剥掉后缀。
 * 阶段三（车道方案）里 handleId === portId，此函数是幂等的。
 */
export const SUB_HANDLE_SEPARATOR = "@"

export const portIdFromHandleId = (
  handleId?: string | null,
): string | undefined =>
  handleId ? handleId.split(SUB_HANDLE_SEPARATOR)[0] : undefined

export const makeSubHandleId = (portId: string, index: number) =>
  index === 0 ? portId : `${portId}${SUB_HANDLE_SEPARATOR}${index}`
```

---

## 5. 阶段三（P2·核心）：四类连接线的"车道系统"防重叠

### 5.0 问题与设计原理

现状：一个 handle 上挂 N 条边时，`getSmoothStepPath` 全部从同一个坐标出发/汇入，
第一段正交线、后续走廊、标签全部压盖；四类边虽有颜色区分，压盖后只剩最后渲染的那条可见。

**车道系统三板斧**（全部在渲染层完成，handle id / 序列化契约零改动）：

```
                     ①锚点沿边错位 ±gap        ②转折距离阶梯化 offset=20+lane*8
      ┌──────────┐
      │          ├┄┄┄ signal  (lane 2) ┄┄┄┄┄┄┄┄┄┐
      │  节点 A  ├━━━ pump    (lane 1) ━━━━━┓    ┊
      │   (out)  ├─── hydraulic(lane 0) ─┐  ┃    ┊
      └──────────┘                       │  ┃    ┊
        handle 圆点仍在原位               ▼  ▼    ▼
        三条边的起点在其上下 ±10px 展开， ③标签沿车道对角错位，互不压盖
        且各自在不同距离处转折 → 全程无重叠
```

- **① 锚点错位**：按 `(节点, handle)` 分组，组内每条边得到车道号 `0..n-1`，
  起/终点沿节点该边的**切向**平移 `(lane - (n-1)/2) * gap`，gap 会按节点边长自动收拢；
- **② 转折阶梯**：`getSmoothStepPath` 的 `offset`（离开节点后第一段正交线长度）按车道递增，
  平行走廊也错开；
- **③ 标签错位**：标签中心在 ① 的基础上再按车道做对角平移，避免同走廊标签互压。

**车道排序为什么"只看 kind + edge id"而不看几何位置**：

1. 只依赖 `edges` 数组 → `useMemo(computeEdgeLanes, [edges])`，**拖动节点不重算、车道不跳变**；
2. 同一对节点间的多条平行边，在 source 端和 target 端拿到**一致的相对次序** → 平行轨道天然不交叉；
3. kind 排序固定为 hydraulic(内圈) → pump → settling → signal(外圈)，符合"主工艺流居中、
   信号线走外侧"的读图习惯，也让四类边的相对位置全图一致。

### 5.1 `edges/edgeLanes.ts`（新增，纯函数）

```ts
// frontend/src/features/udm-v2/edges/edgeLanes.ts
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData } from "./edgeModel"

export type EdgeLaneInfo = {
  sourceLane: number
  sourceCount: number
  targetLane: number
  targetCount: number
}

export type EdgeLaneMap = Map<string, EdgeLaneInfo>

const KIND_ORDER: Record<string, number> = {
  hydraulic: 0,
  pump: 1,
  settling: 2,
  signal: 3,
}

const kindOrder = (edge: Edge<NetworkV2EdgeData>) =>
  KIND_ORDER[edge.data?.edge_kind ?? "hydraulic"] ?? 0

// 稳定排序：先 kind（hydraulic 内圈 → signal 外圈），再 edge id。
// 不依赖节点几何 ⇒ 拖动不跳变；同一对节点的平行边两端次序一致 ⇒ 不交叉。
const byStableOrder = (
  a: Edge<NetworkV2EdgeData>,
  b: Edge<NetworkV2EdgeData>,
) => kindOrder(a) - kindOrder(b) || a.id.localeCompare(b.id)

const groupKey = (nodeId: string, handleId?: string | null) =>
  `${nodeId}::${handleId ?? ""}`

export function computeEdgeLanes(
  edges: Edge<NetworkV2EdgeData>[],
): EdgeLaneMap {
  const sourceGroups = new Map<string, Edge<NetworkV2EdgeData>[]>()
  const targetGroups = new Map<string, Edge<NetworkV2EdgeData>[]>()

  for (const edge of edges) {
    const sKey = groupKey(edge.source, edge.sourceHandle)
    const tKey = groupKey(edge.target, edge.targetHandle)
    const sGroup = sourceGroups.get(sKey)
    if (sGroup) sGroup.push(edge)
    else sourceGroups.set(sKey, [edge])
    const tGroup = targetGroups.get(tKey)
    if (tGroup) tGroup.push(edge)
    else targetGroups.set(tKey, [edge])
  }

  const lanes: EdgeLaneMap = new Map()
  const ensure = (id: string): EdgeLaneInfo => {
    let info = lanes.get(id)
    if (!info) {
      info = { sourceLane: 0, sourceCount: 1, targetLane: 0, targetCount: 1 }
      lanes.set(id, info)
    }
    return info
  }

  for (const group of sourceGroups.values()) {
    group.sort(byStableOrder)
    group.forEach((edge, index) => {
      const info = ensure(edge.id)
      info.sourceLane = index
      info.sourceCount = group.length
    })
  }
  for (const group of targetGroups.values()) {
    group.sort(byStableOrder)
    group.forEach((edge, index) => {
      const info = ensure(edge.id)
      info.targetLane = index
      info.targetCount = group.length
    })
  }
  return lanes
}
```

### 5.2 `edges/EdgeLaneContext.tsx`（新增）

```tsx
// frontend/src/features/udm-v2/edges/EdgeLaneContext.tsx
import { createContext, useContext } from "react"

import type { EdgeLaneInfo, EdgeLaneMap } from "./edgeLanes"

export const EdgeLaneContext = createContext<EdgeLaneMap>(new Map())

export const useEdgeLane = (edgeId: string): EdgeLaneInfo | undefined =>
  useContext(EdgeLaneContext).get(edgeId)
```

### 5.3 `edges/edgePath.ts`（升级，向后兼容）

```ts
// frontend/src/features/udm-v2/edges/edgePath.ts
import { Position, getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"

export const LANE_GAP = 10 // 同侧相邻车道的锚点间距（px）
export const LANE_MAX_SPAN_RATIO = 0.7 // 扇出总宽不超过节点该边长的 70%
export const STEP_BASE = 20 // 第一段正交线基础长度（v1 smoothstep 默认手感）
export const STEP_GAP = 8 // 每条车道递增的转折距离

export type LaneGeometry = {
  lane: number
  count: number
  /** 该锚点所在节点边的长度（px），用于收拢扇出；未知时按 160 估算 */
  sideLength?: number
}

const centered = (lane: number, count: number) => lane - (count - 1) / 2

export function laneOffset(geom: LaneGeometry | undefined): number {
  if (!geom || geom.count <= 1) return 0
  const maxSpan = (geom.sideLength ?? 160) * LANE_MAX_SPAN_RATIO
  const gap = Math.min(LANE_GAP, maxSpan / Math.max(geom.count - 1, 1))
  return centered(geom.lane, geom.count) * gap
}

// 沿节点边的切向平移：左/右边 → 沿 Y；上/下边 → 沿 X
const shiftAlongSide = (
  x: number,
  y: number,
  position: Position,
  delta: number,
): [number, number] =>
  position === Position.Left || position === Position.Right
    ? [x, y + delta]
    : [x + delta, y]

export function getNetworkV2SmoothPath(
  props: Pick<
    EdgeProps,
    | "sourcePosition"
    | "sourceX"
    | "sourceY"
    | "targetPosition"
    | "targetX"
    | "targetY"
  >,
  lanes?: { source?: LaneGeometry; target?: LaneGeometry },
) {
  const [sourceX, sourceY] = shiftAlongSide(
    props.sourceX,
    props.sourceY,
    props.sourcePosition,
    laneOffset(lanes?.source),
  )
  const [targetX, targetY] = shiftAlongSide(
    props.targetX,
    props.targetY,
    props.targetPosition,
    laneOffset(lanes?.target),
  )
  const laneRank = Math.max(lanes?.source?.lane ?? 0, lanes?.target?.lane ?? 0)

  return getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: props.sourcePosition,
    targetX,
    targetY,
    targetPosition: props.targetPosition,
    borderRadius: 8,
    offset: STEP_BASE + laneRank * STEP_GAP,
  })
}
```

> 第二参数可选：现有的 `getNetworkV2SmoothPath(props)` 单参调用（含既有测试）不受影响。

### 5.4 `edges/edgeVisuals.ts`（新增）：四类边配色 / 虚线 / 箭头统一出口

```ts
// frontend/src/features/udm-v2/edges/edgeVisuals.ts
import { MarkerType } from "@xyflow/react"
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData, NetworkV2EdgeKind } from "./edgeModel"

export const EDGE_STROKE_BY_KIND: Record<NetworkV2EdgeKind, string> = {
  hydraulic: "#2563eb",
  pump: "#b45309",
  settling: "#15803d",
  signal: "#7c3aed",
}

export const EDGE_DASH_BY_KIND: Record<NetworkV2EdgeKind, string | undefined> =
  {
    hydraulic: undefined,
    pump: undefined,
    settling: "6 4",
    signal: "1 6",
  }

export const edgeMarkerEnd = (kind: NetworkV2EdgeKind) => ({
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color: EDGE_STROKE_BY_KIND[kind],
})

/** 统一补齐边的视觉属性；onConnect 与 replaceGraph（含历史存档回放）都走这一层 */
export const withNetworkV2EdgeVisuals = (
  edge: Edge<NetworkV2EdgeData>,
): Edge<NetworkV2EdgeData> => ({
  ...edge,
  markerEnd: edgeMarkerEnd(edge.data?.edge_kind ?? "hydraulic"),
})
```

### 5.5 `edges/NetworkV2EdgeShell.tsx`（重写）

接入车道 + 标签错位 + v1 式双击内联编辑 + 选中变深色（对齐 v1 EditableEdge 的
`stroke: hsl(222.2 47.4% 11.2%)`）：

```tsx
// frontend/src/features/udm-v2/edges/NetworkV2EdgeShell.tsx
import { Box, Input } from "@chakra-ui/react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  useInternalNode,
} from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { type MouseEvent, useState } from "react"

import { useEdgeLane } from "./EdgeLaneContext"
import { type LaneGeometry, getNetworkV2SmoothPath } from "./edgePath"

const LABEL_STAGGER_X = 22
const LABEL_STAGGER_Y = 11

type NetworkV2EdgeShellProps = EdgeProps & {
  label: string
  stroke: string
  strokeDasharray?: string
  /** 传入即支持 v1 式双击内联编辑（Hydraulic/Pump 改流量，Signal 改信号名） */
  editValue?: string
  editInputType?: "number" | "text"
  onCommitEdit?: (raw: string) => void
}

const sideLength = (
  node: ReturnType<typeof useInternalNode>,
  position: Position,
) =>
  position === Position.Left || position === Position.Right
    ? node?.measured?.height
    : node?.measured?.width

export function NetworkV2EdgeShell(props: NetworkV2EdgeShellProps) {
  const laneInfo = useEdgeLane(props.id)
  const sourceNode = useInternalNode(props.source)
  const targetNode = useInternalNode(props.target)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const sourceLane: LaneGeometry | undefined = laneInfo
    ? {
        lane: laneInfo.sourceLane,
        count: laneInfo.sourceCount,
        sideLength: sideLength(sourceNode, props.sourcePosition),
      }
    : undefined
  const targetLane: LaneGeometry | undefined = laneInfo
    ? {
        lane: laneInfo.targetLane,
        count: laneInfo.targetCount,
        sideLength: sideLength(targetNode, props.targetPosition),
      }
    : undefined

  const [edgePath, labelX, labelY] = getNetworkV2SmoothPath(props, {
    source: sourceLane,
    target: targetLane,
  })

  // 标签沿车道对角错位，避免同走廊多条边的标签互相压盖
  const centeredLane = laneInfo
    ? laneInfo.sourceLane - (laneInfo.sourceCount - 1) / 2
    : 0
  const staggeredX = labelX + centeredLane * LABEL_STAGGER_X
  const staggeredY = labelY + centeredLane * LABEL_STAGGER_Y

  const editable = !!props.onCommitEdit

  const beginEdit = (event: MouseEvent) => {
    if (!editable) return
    event.stopPropagation()
    setDraft(props.editValue ?? "")
    setIsEditing(true)
  }
  const commit = () => {
    setIsEditing(false)
    props.onCommitEdit?.(draft)
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={props.markerEnd}
        style={{
          ...props.style,
          stroke: props.selected ? "hsl(222.2 47.4% 11.2%)" : props.stroke,
          strokeDasharray: props.strokeDasharray,
          strokeLinecap: props.strokeDasharray ? "round" : undefined,
          strokeWidth: props.selected ? 3 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <Box
          position="absolute"
          transform={`translate(-50%, -50%) translate(${staggeredX}px,${staggeredY}px)`}
          fontSize="9px"
          pointerEvents="all"
          className="nodrag nopan"
          onClick={(event) => event.stopPropagation()}
        >
          {isEditing ? (
            <Input
              type={props.editInputType ?? "number"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit()
                if (event.key === "Escape") setIsEditing(false)
              }}
              size="sm"
              width="120px"
              fontSize="12px"
              autoFocus
              bg="white"
              border="1px solid hsl(214.3 31.8% 91.4%)"
              borderRadius="4px"
              px={2}
              py={1}
            />
          ) : (
            <Box
              onDoubleClick={beginEdit}
              cursor={editable ? "pointer" : "default"}
              bg={props.selected ? "blue.50" : "white"}
              border={`1px solid ${
                props.selected
                  ? "hsl(222.2 47.4% 11.2%)"
                  : "hsl(214.3 31.8% 91.4%)"
              }`}
              borderRadius="4px"
              px={2}
              py={1}
              textAlign="center"
              whiteSpace="nowrap"
              _hover={
                editable
                  ? { borderColor: "hsl(215.4 16.3% 56.9%)" }
                  : undefined
              }
            >
              {props.label}
            </Box>
          )}
        </Box>
      </EdgeLabelRenderer>
    </>
  )
}
```

### 5.6 四个 kind 边组件接入编辑（示例）与 store 补丁

```tsx
// frontend/src/features/udm-v2/edges/HydraulicV2Edge.tsx
import type { EdgeProps } from "@xyflow/react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2EdgeShell } from "./NetworkV2EdgeShell"
import type { NetworkV2EdgeData } from "./edgeModel"
import { EDGE_STROKE_BY_KIND } from "./edgeVisuals"

export function formatHydraulicV2EdgeLabel(data?: NetworkV2EdgeData) {
  const flow = data?.flow_spec?.value ?? 0
  const unit = data?.flow_spec?.unit ?? "m3/d"
  return `Q ${flow} ${unit}`
}

export function HydraulicV2Edge(props: EdgeProps) {
  const data = props.data as NetworkV2EdgeData | undefined
  const updateEdgeData = useUdmV2FlowStore((state) => state.updateEdgeData)

  return (
    <NetworkV2EdgeShell
      {...props}
      label={formatHydraulicV2EdgeLabel(data)}
      stroke={EDGE_STROKE_BY_KIND.hydraulic}
      editValue={String(data?.flow_spec?.value ?? 0)}
      editInputType="number"
      onCommitEdit={(raw) => {
        const value = Number.parseFloat(raw)
        if (Number.isNaN(value)) return
        updateEdgeData(props.id, {
          flow_spec: { mode: "fixed", unit: "m3/d", ...data?.flow_spec, value },
        })
      }}
    />
  )
}
```

- **PumpV2Edge**：同上，`stroke={EDGE_STROKE_BY_KIND.pump}`，提交同样写 `flow_spec.value`；
- **SignalV2Edge**：`editInputType="text"`，提交
  `updateEdgeData(props.id, { signal_spec: { ...(data?.signal_spec ?? { signal_name: raw }), signal_name: raw.trim() } })`
  （空串不提交），`strokeDasharray="1 6"`；
- **SettlingV2Edge**：暂不传 `onCommitEdit`（沉降通量由 transport_model 决定，留在检查器改），
  `strokeDasharray="6 4"`。

store 侧两处补丁（`state/createUdmV2FlowStore.ts`）：

```ts
import { withNetworkV2EdgeVisuals } from "../edges/edgeVisuals"

// ① onConnect：补箭头 + 边 id 防撞（快速连线 Date.now() 会重复）
onConnect: (connection: Connection) => {
  if (!connection.source || !connection.target) return
  const state = get()
  const newEdge = withNetworkV2EdgeVisuals({
    ...connection,
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: connection.source,
    target: connection.target,
    type: networkV2EdgeTypeByKind[state.activeEdgeKind],
    data: createNetworkV2EdgeData(state.activeEdgeKind),
  })
  set({ edges: [...state.edges, newEdge], dirty: true })
},

// ② replaceGraph：历史存档（没有 markerEnd 的旧边）回放时补齐
replaceGraph: (graph) =>
  set({
    nodes: graph.nodes,
    edges: graph.edges.map(withNetworkV2EdgeVisuals),
    /* …其余字段保持原样… */
  }),
```

### 5.7 参数调优速查

| 参数 | 默认 | 效果 |
|---|---|---|
| `LANE_GAP` | 10 | 同侧相邻边锚点间距；节点小/边多时被 `LANE_MAX_SPAN_RATIO` 自动收拢 |
| `STEP_BASE` / `STEP_GAP` | 20 / 8 | 转折阶梯；图很密时可降为 16 / 6 |
| `LABEL_STAGGER_X/Y` | 22 / 11 | 标签对角错位量；标签文字变长时按需加大 X |
| `KIND_ORDER` | hyd→pump→settle→signal | 想让 signal 贴内圈就改这里，一处生效全图 |

---

## 6. 阶段四（P3）：布局对齐 v1 —— 满幅画布 + 滑入式检查器

v1 的核心体验是"画布铺满、选中才弹检查器、面板都浮在画布上"。给 v2 一个紧凑实现
（`BaseInspectorContainer` 不能 import，这里按其行为复刻）：

```tsx
// frontend/src/features/udm-v2/canvas/NetworkV2FlowLayout.tsx
import { Box, Flex, IconButton } from "@chakra-ui/react"
import { ChevronRight } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { getV2GlassPanelStyles } from "../theme/glassV2"

const INSPECTOR_WIDTH = 340

type NetworkV2FlowLayoutProps = {
  canvas: ReactNode
  inspector: ReactNode
  statusBar: ReactNode
  toolbar: ReactNode
}

export function NetworkV2FlowLayout({
  canvas,
  inspector,
  statusBar,
  toolbar,
}: NetworkV2FlowLayoutProps) {
  const selectedNodeId = useUdmV2FlowStore((s) => s.selectedNodeId)
  const selectedEdgeId = useUdmV2FlowStore((s) => s.selectedEdgeId)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)

  // v1 行为：有选中即弹出，取消选中即收起
  useEffect(() => {
    setIsInspectorOpen(!!selectedNodeId || !!selectedEdgeId)
  }, [selectedNodeId, selectedEdgeId])

  return (
    <Box h="100vh" minH="640px" position="relative" overflow="hidden">
      {/* 画布满幅铺底；检查器打开时 margin-right 推移（v1 同款动画） */}
      <Box
        w="100%"
        h="100%"
        position="relative"
        transition="margin-right 0.15s ease"
        marginRight={isInspectorOpen ? `${INSPECTOR_WIDTH}px` : "0"}
      >
        {canvas}
        {/* 状态栏改为画布内浮动胶囊（原三段式底栏取消） */}
        <Box
          position="absolute"
          left="50%"
          bottom={3}
          transform="translateX(-50%)"
          zIndex={5}
          overflow="hidden"
          {...getV2GlassPanelStyles()}
          borderRadius="10px"
        >
          {statusBar}
        </Box>
      </Box>

      {/* 浮动玻璃工具栏（先做固定位版本；要 v1 的拖拽+锁定可后续加） */}
      <Box
        position="absolute"
        top={3}
        right={isInspectorOpen ? `${INSPECTOR_WIDTH + 12}px` : 3}
        zIndex={6}
        px={3}
        py={2}
        transition="right 0.15s ease"
        {...getV2GlassPanelStyles()}
      >
        {toolbar}
      </Box>

      {/* 右侧滑入式检查器 */}
      <Flex
        position="absolute"
        top={0}
        right={0}
        h="100%"
        w={`${INSPECTOR_WIDTH}px`}
        transform={
          isInspectorOpen
            ? "translateX(0)"
            : `translateX(${INSPECTOR_WIDTH}px)`
        }
        transition="transform 0.15s ease"
        bg="bg"
        borderLeftWidth="1px"
        borderColor="border"
        direction="column"
        overflow="auto"
        zIndex={7}
      >
        <IconButton
          aria-label="Collapse inspector"
          size="xs"
          variant="ghost"
          position="absolute"
          top={2}
          left={2}
          onClick={() => setIsInspectorOpen(false)}
        >
          <ChevronRight size={14} />
        </IconButton>
        <Box pt={10} px={1} flex="1">
          {inspector}
        </Box>
      </Flex>
    </Box>
  )
}
```

配套小改：

- `NetworkV2StatusBar` 去掉自身 `borderWidth`，字号收敛为浮动胶囊形态；
  图名 `currentNetworkGraphName` 可顺手做成双击改名（同 NodeShell 的内联编辑模式）；
- 原页头的 `UDM Network v2` 标题移入工具栏胶囊或删除（满幅画布不留页头行）；
- `UdmV2Page.tsx` 不需要动（props 形状未变）。

---

## 7. 阶段五（P4·可选）：物理子锚点方案

车道方案解决 90% 的可读性问题后，如果还希望"多条边真的插在不同的物理口上"
（例如一个 `out` 口最多同时拉 3 条线，各自有独立的可点选圆点），再上子锚点：

**① NodeShell：把 outlet 类端口展开为 N 个子 handle**（利用 §4.1 的 `makeSubHandleId`）：

```tsx
const SUB_HANDLE_COUNT = 3

{data.ports.flatMap((port) => {
  const fanOut = port.role === "outlet" // 需要时可对 inlet 同样开放
  const count = fanOut ? SUB_HANDLE_COUNT : 1
  const basePct = alongPct(port, data.ports)
  return Array.from({ length: count }, (_, i) => {
    const handleId = makeSubHandleId(port.id, i)
    const pct = basePct + (i - (count - 1) / 2) * 12 // 沿边按 12% 间隔展开
    return (
      <Handle
        key={handleId}
        id={handleId}
        type={isTargetPort(port) ? "target" : "source"}
        position={positionByPlacement[port.placement]}
        isValidConnection={isValidConnection}
        style={getV2HandleStyle(
          kind,
          showHandles,
          positionByPlacement[port.placement],
          pct,
        )}
      />
    )
  })
})}
```

**② 序列化剥后缀**（`serialize/toNetworkProcessGraphV1.ts`，仓库内仅此两处把
handle 当端口用，已 grep 确认）：

```diff
- source_port: edge.sourceHandle || "out",
+ source_port: portIdFromHandleId(edge.sourceHandle) || "out",
- target_port: edge.targetHandle || "in",
+ target_port: portIdFromHandleId(edge.targetHandle) || "in",
```

**③ 注意事项**：

- `fromNetworkProcessGraphV1` 加载时 `sourceHandle: edge.source_port` 会得到不带
  后缀的基础 handle id（= index 0 的子锚点），天然兼容；
- 车道系统与子锚点**可叠加**：车道按 handle id 分组，子锚点分散了组，剩余同子锚点
  的边仍由车道兜底；
- `serializer.roundtrip.test.ts` / `serializer.contract.test.ts` 需补一条
  "带 `@1` 后缀的 handle 序列化后 port id 不带后缀" 的用例。

---

## 8. 测试与验收

### 8.1 新增 `__tests__/edgeLanes.test.ts`

```ts
import type { Edge } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import { computeEdgeLanes } from "../edges/edgeLanes"
import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { createNetworkV2EdgeData } from "../edges/edgeModel"
import type { NetworkV2EdgeKind } from "../edges/edgeModel"

const edge = (
  id: string,
  kind: NetworkV2EdgeKind,
  overrides: Partial<Edge<NetworkV2EdgeData>> = {},
): Edge<NetworkV2EdgeData> => ({
  id,
  source: "a",
  target: "b",
  sourceHandle: "out",
  targetHandle: "in",
  data: createNetworkV2EdgeData(kind),
  ...overrides,
})

describe("computeEdgeLanes", () => {
  it("assigns dense distinct lanes to edges sharing a source handle", () => {
    const lanes = computeEdgeLanes([
      edge("e1", "hydraulic", { target: "b" }),
      edge("e2", "hydraulic", { target: "c" }),
      edge("e3", "signal", { target: "d" }),
    ])
    expect(lanes.get("e1")?.sourceCount).toBe(3)
    const sourceLanes = ["e1", "e2", "e3"].map(
      (id) => lanes.get(id)?.sourceLane,
    )
    expect([...sourceLanes].sort()).toEqual([0, 1, 2])
  })

  it("keeps signal edges on the outer lane", () => {
    const lanes = computeEdgeLanes([
      edge("z-hydraulic", "hydraulic", { target: "b" }),
      edge("a-signal", "signal", { target: "c" }),
    ])
    expect(lanes.get("a-signal")?.sourceLane).toBe(1) // kind 优先于 id
  })

  it("keeps parallel edges of one node pair consistent on both ends", () => {
    const lanes = computeEdgeLanes([
      edge("e1", "hydraulic"),
      edge("e2", "pump"),
    ])
    expect(lanes.get("e1")?.sourceLane).toBe(lanes.get("e1")?.targetLane)
    expect(lanes.get("e2")?.sourceLane).toBe(lanes.get("e2")?.targetLane)
  })

  it("is deterministic regardless of input order", () => {
    const a = computeEdgeLanes([edge("e1", "hydraulic"), edge("e2", "pump")])
    const b = computeEdgeLanes([edge("e2", "pump"), edge("e1", "hydraulic")])
    expect(a).toEqual(b)
  })
})
```

### 8.2 既有测试兼容性

- `edgeRenderers.test.tsx` 只测 label formatter 与类型注册 → 不受影响；
- `getNetworkV2SmoothPath` 单参调用保持可用 → `edgeModel/serializer` 系列测试不受影响；
- NodeShell props 变了（`accent` → `id`）：五个 kind 节点组件同步改即可，
  `inspector.fields.test.tsx` 等不渲染 NodeShell 的测试不受影响。

### 8.3 Playwright 冒烟（建议补）

1. 拖入 1 个 Reactor + 3 个 Boundary，从 Reactor 的 `out` 连出 2 条 hydraulic + 1 条 signal；
2. 断言 3 条 `.react-flow__edge-path` 的 `d` 属性两两不同（车道生效）；
3. 断言 3 个标签的 `transform` 两两不同（标签错位生效）；
4. hover Reactor → handle 可见；移开 600ms 后不可见；
5. 双击 hydraulic 标签输入 `1200` 回车 → 标签变 `Q 1200 m3/d` 且 store `dirty`。

### 8.4 验收清单（对照 v1 手感）

- [ ] 节点玻璃质感 + 左侧色条 + 选中外扩描边，与 /udm 页并排肉眼无违和
- [ ] handle hover 显、离开 500ms 淡出；拖线接近目标节点（16px 扩边内）handle 自动浮现
- [ ] 同一 handle 挂 4 类边：路径、箭头、标签全程无压盖；拖动节点车道不跳变
- [ ] 水力边接不上 signal 口（连线时即被拒绝），signal 边至少一端在 signal 口
- [ ] Delete/Backspace 删除、网格吸附、双击缩放、框选、MiniMap 按 kind 上色
- [ ] 旧存档载入后所有边带箭头（replaceGraph 补齐路径生效）
- [ ] 选中节点/边 → 检查器滑入；点空白 → 滑出，画布回到满幅

---

## 9. 落地顺序与工作量估算

| 顺序 | 内容 | 涉及文件 | 估算 |
|---|---|---|---|
| 1 | P0 画布行为（§4 中不含 Provider 的配置项） | NetworkV2Canvas | 0.5 天 |
| 2 | P2 车道系统 + 箭头 + 边编辑（**优先做**，收益最大） | edgeLanes / EdgeLaneContext / edgePath / edgeVisuals / EdgeShell / 4 个 kind 边 / store | 1~1.5 天 |
| 3 | P1 玻璃视觉 + hover handle + 连线防呆 | glassV2 / hoverContextV2 / NodeShell / connectionRules / portHandles / palette 换肤 | 1 天 |
| 4 | P3 布局对齐 | NetworkV2FlowLayout / StatusBar | 0.5 天 |
| 5 | 测试补齐 + Playwright 冒烟 | __tests__ / tests | 0.5 天 |
| 6 | P4 子锚点（可选，观察车道效果后再定） | NodeShell / serializer / roundtrip 测试 | 0.5 天 |

> 建议把 2（车道）排在 3（视觉）前面：车道方案是纯增量、风险最低、
> 用户"多线重叠"的痛点立刻消失；视觉换肤动的文件多，放后面减少 rebase 冲突。

---

## 附：本方案核对过的仓库事实

| 事实 | 位置 |
|---|---|
| v2 禁止 import `components/Flow/**` | `features/udm-v2/README.md` §3.1 |
| handle id 即契约端口 id（`source_port: edge.sourceHandle \|\| "out"`） | `serialize/toNetworkProcessGraphV1.ts` L144/L146；反向映射 `fromNetworkProcessGraphV1.ts` L148/L150 |
| v2 全库无 `MarkerType`（边无箭头） | `grep -rn MarkerType features/udm-v2` 仅 EdgeShell 透传 props.markerEnd |
| v2 端口沿边均匀分布算法 `(index+1)/(len+1)` | `nodes/NetworkV2NodeShell.tsx` handleStyle |
| v1 玻璃体系常量（tint 0.45/outline 0.7/handle 0.9、四层阴影、20px 网格、handle 外置 9px、500ms 隐藏延迟、16px hover 扩边） | `components/Flow/nodes/utils/glass.ts` |
| v1 画布行为基线（snapGrid [5,5]、fitView padding 0.15、zoom 0.1–2、Dots 背景、样式化 MiniMap、桌面/移动分支） | `components/Flow/FlowCanvas.tsx` |
| v1 滑入式检查器 + 画布 margin 推移 | `components/Flow/FlowLayout.tsx` |
| v2 store 用 applyNodeChanges/applyEdgeChanges（deleteKeyCode 可直接生效） | `state/createUdmV2FlowStore.ts` |
| `@xyflow/react ^12.8.2`（`useInternalNode`/`measured`/`isValidConnection` 可用） | `frontend/package.json` |

> **代码校验说明**：§4.1/§5 中的五个纯 TS 文件（edgeLanes / edgePath / edgeVisuals /
> connectionRules / portHandles）已在 `typescript@5.7 --strict` + `@xyflow/react@12.8.2`
> 真实类型下通过编译；`computeEdgeLanes` 已跑过行为自检（四类边同口得到车道 0/1/2/3、
> 平行边两端次序一致、输入顺序无关）。TSX 组件代码为对照仓库现有组件手写，
> 落地时请以本地 `tsc/biome` 为准。
