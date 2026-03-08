import type { CalculationParameters } from "@/config/simulationConfig"

export interface TutorialFlowPreset {
  lessonKey: string
  calculationParameters: Partial<CalculationParameters>
  /** Override influent (input node) component concentrations */
  inputNodeOverrides: Record<string, number>
  /** Override reactor node properties */
  reactorOverrides: { volume?: string }
  /** Override edge flow rate (m³/h) */
  edgeFlowRate?: number
  /** Variables recommended for chart display */
  recommendedVariables: string[]
}

const chapter7Preset: TutorialFlowPreset = {
  lessonKey: "chapter-7",
  calculationParameters: {
    hours: 5,
    steps_per_hour: 20,
  },
  inputNodeOverrides: {
    S_S: 200,
    S_O: 0,
    S_NH: 25,
    S_NO: 0,
    S_ND: 5,
    X_BH: 0,
    X_BA: 0,
    X_S: 50,
    X_P: 0,
    X_ND: 0,
    S_ALK: 4,
  },
  reactorOverrides: {
    volume: "1000",
  },
  edgeFlowRate: 1000,
  recommendedVariables: ["S_S", "X_BH", "S_O", "S_NH", "S_NO"],
}

const TUTORIAL_FLOW_PRESETS: TutorialFlowPreset[] = [chapter7Preset]

export function getTutorialFlowPreset(
  lessonKey: string | null | undefined,
): TutorialFlowPreset | undefined {
  if (!lessonKey) return undefined
  return TUTORIAL_FLOW_PRESETS.find((p) => p.lessonKey === lessonKey)
}
