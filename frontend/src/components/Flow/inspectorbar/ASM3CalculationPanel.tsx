import type { ModelFlowState } from "../../../stores/createModelFlowStore"
import ModelCalculationPanel from "./ModelCalculationPanel"

interface ASM3CalculationPanelProps {
  store?: () => ModelFlowState<any, any, any> // 可选的自定义 store
}

function ASM3CalculationPanel({ store }: ASM3CalculationPanelProps = {}) {
  return (
    <ModelCalculationPanel store={store} modelType="ASM3" nodeType="asm3" />
  )
}

export default ASM3CalculationPanel
