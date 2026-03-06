import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

interface LessonProgress {
  currentStep: number
  startedAt: string
  lastOpenedAt: string
}

interface TutorialProgressState {
  completedLessons: string[]
  currentLesson: string | null
  lessonProgress: Record<string, LessonProgress>
  // Actions
  startLesson: (lessonKey: string) => void
  completeLesson: (lessonKey: string) => void
  updateLessonStep: (lessonKey: string, step: number) => void
  resetProgress: () => void
}

export const useTutorialProgressStore = create<TutorialProgressState>()(
  devtools(
    persist(
      (set, get) => ({
        completedLessons: [],
        currentLesson: null,
        lessonProgress: {},

        startLesson: (lessonKey) => {
          const now = new Date().toISOString()
          const existing = get().lessonProgress[lessonKey]
          set({
            currentLesson: lessonKey,
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: {
                currentStep: existing?.currentStep ?? 1,
                startedAt: existing?.startedAt ?? now,
                lastOpenedAt: now,
              },
            },
          })
        },

        completeLesson: (lessonKey) => {
          const completed = get().completedLessons
          if (!completed.includes(lessonKey)) {
            set({ completedLessons: [...completed, lessonKey] })
          }
        },

        updateLessonStep: (lessonKey, step) => {
          const progress = get().lessonProgress[lessonKey]
          if (!progress) return
          set({
            lessonProgress: {
              ...get().lessonProgress,
              [lessonKey]: { ...progress, currentStep: step },
            },
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
