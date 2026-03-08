import { create } from "zustand"
import { devtools } from "zustand/middleware"

interface UdmTutorialFlowState {
  tutorialLessonKey: string | null
  setTutorialLessonKey: (key: string | null) => void
  clearTutorial: () => void
}

export const useUdmTutorialFlowStore = create<UdmTutorialFlowState>()(
  devtools(
    (set) => ({
      tutorialLessonKey: null,
      setTutorialLessonKey: (key) => set({ tutorialLessonKey: key }),
      clearTutorial: () => set({ tutorialLessonKey: null }),
    }),
    { name: "udm-tutorial-flow-store" },
  ),
)
