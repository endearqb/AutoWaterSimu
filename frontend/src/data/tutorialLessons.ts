/** Petersen-matrix tutorial course metadata (MVP — pure frontend, no backend) */

export type TutorialDifficulty = "beginner" | "intermediate" | "full"
export type TutorialTemplateType = "exercise" | "answer" | "case" | "guide"

export interface TutorialLesson {
  /** Unique key, used in URL and localStorage */
  lessonKey: string
  /** Chapter-level label, e.g. "chapter-1" */
  level: string
  difficulty: TutorialDifficulty
  templateType: TutorialTemplateType
  /** Estimated completion time in minutes */
  estimatedMinutes: number
  /** Keys of prerequisite lessons (empty = no prereqs) */
  prerequisites: string[]
  /** Backend seed-template key to load, e.g. "asm1slim" / "asm1" */
  seedTemplateKey: string
  /** Teaching-mode step config */
  stepConfig: {
    defaultStep: number
    maxStep: number
  }
  /** Recommended chart variables for observation */
  recommendedCharts: string[]
  /** If true, card is shown but disabled ("coming soon") */
  comingSoon?: boolean
}

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  {
    lessonKey: "chapter-1",
    level: "chapter-1",
    difficulty: "beginner",
    templateType: "guide",
    estimatedMinutes: 15,
    prerequisites: [],
    seedTemplateKey: "asm1slim",
    stepConfig: { defaultStep: 1, maxStep: 3 },
    recommendedCharts: ["S_S", "X_BH"],
  },
  {
    lessonKey: "chapter-2",
    level: "chapter-2",
    difficulty: "beginner",
    templateType: "exercise",
    estimatedMinutes: 25,
    prerequisites: ["chapter-1"],
    seedTemplateKey: "asm1slim",
    stepConfig: { defaultStep: 1, maxStep: 5 },
    recommendedCharts: ["S_S", "X_BH", "S_O"],
  },
  {
    lessonKey: "chapter-3",
    level: "chapter-3",
    difficulty: "intermediate",
    templateType: "exercise",
    estimatedMinutes: 30,
    prerequisites: ["chapter-2"],
    seedTemplateKey: "asm1slim",
    stepConfig: { defaultStep: 1, maxStep: 4 },
    recommendedCharts: ["S_S", "S_NH", "S_NO"],
  },
  {
    lessonKey: "chapter-7",
    level: "chapter-7",
    difficulty: "intermediate",
    templateType: "case",
    estimatedMinutes: 40,
    prerequisites: ["chapter-3"],
    seedTemplateKey: "asm1",
    stepConfig: { defaultStep: 1, maxStep: 6 },
    recommendedCharts: ["S_S", "X_BH", "S_O", "S_NH", "S_NO"],
    comingSoon: true,
  },
]

/** Get a single tutorial lesson by key */
export function getTutorialLesson(key: string): TutorialLesson | undefined {
  return TUTORIAL_LESSONS.find((l) => l.lessonKey === key)
}

/** Return all lessons that are not marked comingSoon */
export function getAvailableLessons(): TutorialLesson[] {
  return TUTORIAL_LESSONS.filter((l) => !l.comingSoon)
}
