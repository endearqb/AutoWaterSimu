import { useI18n } from "../../../i18n"
import NodePalette from "./NodePalette"

const ASM3NodesPanel = () => {
  const { t } = useI18n()
  const nodeTypes = [
    { type: "input", label: t("flow.node.input") },
    { type: "output", label: t("flow.node.output") },
    { type: "asm3", label: t("flow.node.asm3") },
    { type: "default", label: t("flow.node.default") },
  ]

  return <NodePalette nodeTypes={nodeTypes} />
}

export default ASM3NodesPanel
