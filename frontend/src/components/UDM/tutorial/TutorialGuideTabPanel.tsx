import { Text } from "@chakra-ui/react"

import { getTutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import TutorialGuidePanel from "./TutorialGuidePanel"

interface TutorialGuideTabPanelProps {
  lessonKey: string
}

export default function TutorialGuideTabPanel({
  lessonKey,
}: TutorialGuideTabPanelProps) {
  const { t } = useI18n()
  const lesson = getTutorialLesson(lessonKey)
  const progress = useTutorialProgressStore((state) => state.lessonProgress[lessonKey])

  if (!lesson) {
    return (
      <Text fontSize="sm" color="gray.500">
        {t("flow.tutorial.results.unknownLesson")}
      </Text>
    )
  }

  return (
    <TutorialGuidePanel
      lesson={lesson}
      currentStep={progress?.currentStep ?? lesson.stepConfig.defaultStep}
      variant="sidebar"
    />
  )
}
