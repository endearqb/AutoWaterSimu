import { useI18n } from "../../../i18n"
import NodePalette from "./NodePalette"

const ASM1SlimNodesPanel = () => {
  const { t } = useI18n()
  const nodeTypes = [
    { type: "input", label: t("flow.node.input") },
    { type: "output", label: t("flow.node.output") },
    { type: "asmslim", label: t("flow.node.asm1slim") },
    { type: "default", label: t("flow.node.default") },
  ]

  return <NodePalette nodeTypes={nodeTypes} />
}

export default ASM1SlimNodesPanel
