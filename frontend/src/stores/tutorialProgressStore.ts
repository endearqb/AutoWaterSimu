import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

import type { TutorialMode, TutorialStep } from "@/data/tutorialLessons"

export interface LessonProgress {
  modelId: string | null
  currentStep: TutorialStep
  completedSteps: TutorialStep[]
  startedAt: string
  lastOpenedAt: string
  validatePassed: boolean
  simulationRanAt: string | null
  mode: TutorialMode
}

interface StartLessonOptions {
  modelId?: string | null
  defaultStep?: TutorialStep
  mode?: TutorialMode
}

interface TutorialProgressState {
  completedLessons: string[]
  currentLesson: string | null
  lessonProgress: Record<string, LessonProgress>
  startLesson: (lessonKey: string, options?: StartLessonOptions) => void
  attachLessonModel: (lessonKey: string, modelId: string) => void
  updateLessonStep: (lessonKey: string, step: TutorialStep) => void
  setLessonMode: (lessonKey: string, mode: TutorialMode) => void
  markValidationResult: (lessonKey: string, passed: boolean) => void
  recordSimulationRun: (lessonKey: string) => void
  completeLesson: (lessonKey: string) => void
  resetLesson: (lessonKey: string) => void
  resetProgress: () => void
}

const buildInitialLessonProgress = (
  defaultStep: TutorialStep,
  mode: TutorialMode,
  now: string,
  modelId?: string | null,
): LessonProgress => ({
  modelId: modelId ?? null,
  currentStep: defaultStep,
  completedSteps: [],
  startedAt: now,
  lastOpenedAt: now,
  validatePassed: false,
  simulationRanAt: null,
  mode,
})

export const useTutorialProgressStore = create<TutorialProgressState>()(
  devtools(
    persist(
      (set, get) => ({
        completedLessons: [],
        currentLesson: null,
        lessonProgress: {},

        startLesson: (lessonKey, options) => {
          const now = new Date().toISOString()
          const existing = get().lessonProgress[lessonKey]
          const defaultStep = options?.defaultStep ?? 1
          const mode = options?.mode ?? "guided"
          set({
            currentLesson: lessonKey,
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: existing
                ? {
                    ...existing,
                    modelId: options?.modelId ?? existing.modelId,
                    mode: options?.mode ?? existing.mode,
                    lastOpenedAt: now,
                  }
                : buildInitialLessonProgress(
                    defaultStep,
                    mode,
                    now,
                    options?.modelId,
                  ),
            },
          })
        },

        attachLessonModel: (lessonKey, modelId) => {
          const now = new Date().toISOString()
          const existing = get().lessonProgress[lessonKey]
          if (!existing) {
            set({
              lessonProgress: {
                ...get().lessonProgress,
                [lessonKey]: buildInitialLessonProgress(
                  1,
                  "guided",
                  now,
                  modelId,
                ),
              },
            })
            return
          }
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                ...existing,
                modelId,
                lastOpenedAt: now,
              },
            },
          })
        },

        updateLessonStep: (lessonKey, step) => {
          const progress = get().lessonProgress[lessonKey]
          if (!progress) return
          const now = new Date().toISOString()
          const completedSteps = progress.completedSteps.includes(
            progress.currentStep,
          )
            ? progress.completedSteps
            : [...progress.completedSteps, progress.currentStep].sort()
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                ...progress,
                currentStep: step,
                completedSteps,
                lastOpenedAt: now,
              },
            },
          })
        },

        setLessonMode: (lessonKey, mode) => {
          const progress = get().lessonProgress[lessonKey]
          if (!progress) return
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                ...progress,
                mode,
              },
            },
          })
        },

        markValidationResult: (lessonKey, passed) => {
          const progress = get().lessonProgress[lessonKey]
          if (!progress) return
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                ...progress,
                validatePassed: passed,
                lastOpenedAt: new Date().toISOString(),
              },
            },
          })
        },

        recordSimulationRun: (lessonKey) => {
          const progress = get().lessonProgress[lessonKey]
          if (!progress) return
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                ...progress,
                simulationRanAt: new Date().toISOString(),
              },
            },
          })
        },

        completeLesson: (lessonKey) => {
          const completed = get().completedLessons
          const progress = get().lessonProgress[lessonKey]
          const lessonProgress = progress
            ? {
                ...get().lessonProgress,
                [lessonKey]: {
                  ...progress,
                  completedSteps: Array.from(
                    new Set([...progress.completedSteps, progress.currentStep]),
                  ).sort(),
                  validatePassed: true,
                },
              }
            : get().lessonProgress
          set({
            completedLessons: completed.includes(lessonKey)
              ? completed
              : [...completed, lessonKey],
            lessonProgress,
          })
        },

        resetLesson: (lessonKey) => {
          const lessonProgress = { ...get().lessonProgress }
          delete lessonProgress[lessonKey]
          set({
            completedLessons: get().completedLessons.filter(
              (item) => item !== lessonKey,
            ),
            currentLesson:
              get().currentLesson === lessonKey ? null : get().currentLesson,
            lessonProgress,
          })
        },

        resetProgress: () =>
          set({
            completedLessons: [],
            currentLesson: null,
            lessonProgress: {},
          }),
      }),
      { name: "petersen-tutorial-progress" },
    ),
    { name: "tutorial-progress-store" },
  ),
)
