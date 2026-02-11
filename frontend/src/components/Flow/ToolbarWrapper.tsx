import type React from "react"
import type { BaseModelState } from "../../stores/baseModelStore"
import type { RFState } from "../../stores/flowStore"
import ASM1NodesPanel from "./toolbar/ASM1NodesPanel"
import ASM1SlimNodesPanel from "./toolbar/ASM1SlimNodesPanel"
import ASM3NodesPanel from "./toolbar/ASM3NodesPanel"
import BaseToolbarContainer from "./toolbar/BaseToolbarContainer"
import NodesPanel from "./toolbar/NodesPanel"
import UDMNodesPanel from "./toolbar/UDMNodesPanel"

// 工具栏属性接口
interface ToolbarProps {
  sidebarWidth: number
  isToolbarLocked: boolean
  isToolbarCollapsed: boolean
  toolbarPosition: { x: number; y: number }
  isDragging: boolean
  onToggleLock: () => void
  onToggleCollapse: () => void
  onMouseDown: (e: React.MouseEvent) => void
  store?: () => RFState // 可选的自定义 store
  modelStore?: () => BaseModelState<any, any, any, any, any> // 可选的模型计算store
}

// 通用工具栏包装组件 (MaterialBalance)
export const ToolbarWrapper = (props: ToolbarProps) => {
  return (
    <BaseToolbarContainer
      {...props}
      nodesPanelComponent={NodesPanel}
      modelType="materialBalance"
    />
  )
}

// ASM1 工具栏包装组件
export const ASM1ToolbarWrapper = (props: ToolbarProps) => {
  return (
    <BaseToolbarContainer
      {...props}
      nodesPanelComponent={ASM1NodesPanel}
      modelType="asm1"
    />
  )
}

// ASM1Slim 工具栏包装组件
export const ASM1SlimToolbarWrapper = (props: ToolbarProps) => {
  return (
    <BaseToolbarContainer
      {...props}
      nodesPanelComponent={ASM1SlimNodesPanel}
      modelType="asm1slim"
    />
  )
}

// ASM3 工具栏包装组件
export const ASM3ToolbarWrapper = (props: ToolbarProps) => {
  return (
    <BaseToolbarContainer
      {...props}
      nodesPanelComponent={ASM3NodesPanel}
      modelType="asm3"
    />
  )
}

// UDM 宸ュ叿鏍忓寘瑁呯粍浠?
export const UDMToolbarWrapper = (props: ToolbarProps) => {
  return (
    <BaseToolbarContainer
      {...props}
      nodesPanelComponent={UDMNodesPanel}
      modelType="udm"
    />
  )
}

export type { ToolbarProps }
