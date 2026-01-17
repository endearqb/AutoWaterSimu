import type { ModelFlowState } from "../../../stores/createModelFlowStore"
import ModelCalculationPanel from "./ModelCalculationPanel"

interface ASM1SlimCalculationPanelProps {
  store?: () => ModelFlowState<any, any, any> // 可选的自定义 store
}

function ASM1SlimCalculationPanel({
  store,
}: ASM1SlimCalculationPanelProps = {}) {
  return (
    <ModelCalculationPanel
      store={store}
      modelType="ASM1Slim"
      nodeType="asmslim"
    />
  )
}

export default ASM1SlimCalculationPanel
