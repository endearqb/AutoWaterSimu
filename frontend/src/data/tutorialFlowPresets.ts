/**
 * Tutorial Flow Presets — 仿真场景预设配置
 *
 * 每个 preset 定义一个教程章节在"一键仿真"时使用的默认参数：
 *   - calculationParameters: 仿真时长、步长
 *   - inputNodeOverrides: 进水组分浓度覆盖
 *   - reactorOverrides: 反应器属性（如体积）
 *   - edgeFlowRate: 管道流量
 *   - recommendedVariables: 结果页推荐观测的变量
 *
 * 新增章节步骤：
 *   1. 在此文件新增 chapterXPreset 对象
 *   2. 将其加入 TUTORIAL_FLOW_PRESETS 数组
 *   3. 确保 lessonKey 与 tutorialLessons.ts 中对应章节的 lessonKey 一致
 *
 * 关联文件：
 *   - tutorialLessons.ts — 章节地图（定义 lessonKey、步骤、模板关联）
 *   - tutorialInsights.ts — 教学解释卡（仿真完成后的引导内容）
 *   - i18n/messages/{zh,en}.ts — 所有文案
 */
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

const chapter1Preset: TutorialFlowPreset = {
  lessonKey: "chapter-1",
  calculationParameters: {
    hours: 2,
    steps_per_hour: 20,
  },
  inputNodeOverrides: {
    dissolvedOxygen: 2.0,
    cod: 200,
    nitrate: 0,
    ammonia: 25,
    totalAlkalinity: 100,
  },
  reactorOverrides: {
    volume: "500",
  },
  edgeFlowRate: 500,
  recommendedVariables: ["cod", "dissolvedOxygen"],
}

const chapter2Preset: TutorialFlowPreset = {
  lessonKey: "chapter-2",
  calculationParameters: {
    hours: 3,
    steps_per_hour: 20,
  },
  inputNodeOverrides: {
    dissolvedOxygen: 2.0,
    cod: 200,
    nitrate: 0,
    ammonia: 25,
    totalAlkalinity: 100,
  },
  reactorOverrides: {
    volume: "800",
  },
  edgeFlowRate: 800,
  recommendedVariables: ["cod", "dissolvedOxygen", "ammonia"],
}

const chapter3Preset: TutorialFlowPreset = {
  lessonKey: "chapter-3",
  calculationParameters: {
    hours: 4,
    steps_per_hour: 20,
  },
  inputNodeOverrides: {
    dissolvedOxygen: 0.5,
    cod: 250,
    nitrate: 15,
    ammonia: 30,
    totalAlkalinity: 120,
  },
  reactorOverrides: {
    volume: "1000",
  },
  edgeFlowRate: 1000,
  recommendedVariables: ["cod", "ammonia", "nitrate"],
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
    S_NO: 10,
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

const TUTORIAL_FLOW_PRESETS: TutorialFlowPreset[] = [
  chapter1Preset,
  chapter2Preset,
  chapter3Preset,
  chapter7Preset,
]

export function getTutorialFlowPreset(
  lessonKey: string | null | undefined,
): TutorialFlowPreset | undefined {
  if (!lessonKey) return undefined
  return TUTORIAL_FLOW_PRESETS.find((p) => p.lessonKey === lessonKey)
}
