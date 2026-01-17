import type { ModelFlowState } from "../../../stores/createModelFlowStore"
import ModelCalculationPanel from "./ModelCalculationPanel"

interface ASM1CalculationPanelProps {
  store?: () => ModelFlowState<any, any, any> // 可选的自定义 store
}

function ASM1CalculationPanel({ store }: ASM1CalculationPanelProps = {}) {
  return (
    <ModelCalculationPanel store={store} modelType="ASM1" nodeType="asm1" />
  )
}

export default ASM1CalculationPanel
