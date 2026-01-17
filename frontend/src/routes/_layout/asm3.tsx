import { createFileRoute, redirect } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"

import { UsersService } from "@/client"
import { isLoggedIn } from "@/hooks/useAuth"
import type { NodeTypes } from "@xyflow/react"
import FlowCanvas from "../../components/Flow/FlowCanvas"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { ASM3ToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import ASM3CalculationPanel from "../../components/Flow/inspectorbar/ASM3CalculationPanel"
import ASM3PropertyPanel from "../../components/Flow/inspectorbar/ASM3PropertyPanel"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import ASM3BubbleMenu from "../../components/Flow/menu/ASM3BubbleMenu"
import ASM3Node from "../../components/Flow/nodes/ASM3Node"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import { useASM3FlowStore } from "../../stores/asm3FlowStore"
import { useASM3Store } from "../../stores/asm3Store"
import { useThemePaletteStore } from "../../stores/themePaletteStore"

export const Route = createFileRoute("/_layout/asm3")({
  component: ASM3Page,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }

    // 检查用户权限：只允许ultra用户和超级管理员访问
    try {
      const user = await UsersService.readUserMe()
      const hasAccess = user.is_superuser || user.user_type === "ultra"

      if (!hasAccess) {
        throw redirect({
          to: "/dashboard",
        })
      }
    } catch (error) {
      // 如果获取用户信息失败，重定向到登录页
      throw redirect({
        to: "/login",
      })
    }
  },
})

// 创建带有store的节点类型工厂函数
const createASM3NodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
  asm3: (props: any) => <ASM3Node {...props} store={store} />,
})

// 定义 ASM3 默认节点数据工厂函数
// 注意：ASM3 节点的固定参数现在由 useASM3FlowStore 的 addNode 函数自动添加
const asm3DefaultNodeDataFactory: DefaultNodeDataFactory = (
  nodeType: string,
) => {
  switch (nodeType) {
    case "input":
      return { label: "进水端" }
    case "output":
      return { label: "出水端" }
    case "asm3":
      return {
        label: "ASM3节点",
        // 固定参数由 store 自动添加，无需在此处定义
      }
    default:
      return { label: "默认节点" }
  }
}

// 定义 ASM3 检查器配置
const asm3InspectorConfig = {
  nodeTabs: [
    {
      key: "parameters",
      label: "参数设置",
      component: ASM3PropertyPanel,
      props: { isNode: true },
    },
    {
      key: "calculation",
      label: "计算参数",
      component: ASM3CalculationPanel,
      props: { store: useASM3FlowStore },
    },
    {
      key: "simulation",
      label: "模拟计算",
      component: SimulationPanel,
      props: {
        store: useASM3FlowStore,
        modelStore: useASM3Store,
        modelType: "asm3",
      },
    },
  ],
  edgePanel: {
    component: ASM3PropertyPanel,
    props: { isNode: false },
  },
  defaultTab: "parameters",
}

function ASM3Page() {
  // ✅ 使用 useMemo 确保 nodeTypes 引用稳定
  const asm3NodeTypes = useMemo(() => createASM3NodeTypes(useASM3FlowStore), [])
  const themeStore = useThemePaletteStore()
  useEffect(() => {
    themeStore.applyStoredForModel("asm3", [
      "asm3",
      "input",
      "output",
      "default",
      "asm1",
      "asmslim",
    ])
  }, [])

  return (
    <ReactFlowProvider>
      <FlowLayout
        canvas={
          <FlowCanvas
            nodeTypes={asm3NodeTypes}
            defaultNodeDataFactory={asm3DefaultNodeDataFactory}
            store={useASM3FlowStore}
          />
        }
        inspector={
          <FlowInspector
            config={asm3InspectorConfig}
            store={useASM3FlowStore}
          />
        }
        toolbar={(props) => (
          <ASM3ToolbarWrapper
            {...props}
            store={useASM3FlowStore}
            modelStore={useASM3Store}
          />
        )}
        BubbleMenuComponent={ASM3BubbleMenu}
        store={useASM3FlowStore}
        simulationControlProps={{
          store: useASM3FlowStore,
          modelStore: useASM3Store,
          modelType: "asm3",
        }}
      />
    </ReactFlowProvider>
  )
}

export default ASM3Page
