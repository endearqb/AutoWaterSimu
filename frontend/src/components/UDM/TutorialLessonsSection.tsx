import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react"
import { FiArrowRight } from "react-icons/fi"

import {
  TUTORIAL_LESSONS,
  type TutorialLesson,
  getTutorialLesson,
} from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import TutorialLessonCard from "./TutorialLessonCard"

interface TutorialLessonsSectionProps {
  onOpenLesson: (
    lesson: TutorialLesson,
    existingModelId?: string | null,
  ) => Promise<void> | void
}

export default function TutorialLessonsSection({
  onOpenLesson,
}: TutorialLessonsSectionProps) {
  const { t } = useI18n()
  const { completedLessons, currentLesson, lessonProgress, startLesson } =
    useTutorialProgressStore()

  const isUnlocked = (lessonKey: string): boolean => {
    const lesson = getTutorialLesson(lessonKey)
    if (!lesson) return false
    return lesson.prerequisites.every((pre) => completedLessons.includes(pre))
  }

  const getPrerequisiteName = (lessonKey: string): string | undefined => {
    const lesson = getTutorialLesson(lessonKey)
    if (!lesson) return undefined
    const missing = lesson.prerequisites.find(
      (pre) => !completedLessons.includes(pre),
    )
    if (!missing) return undefined
    return t(`flow.tutorial.chapters.${missing}.title`)
  }

  const handleStart = async (lessonKey: string) => {
    const lesson = getTutorialLesson(lessonKey)
    if (!lesson) return
    const progress = lessonProgress[lessonKey]
    startLesson(lessonKey, {
      modelId: progress?.modelId,
      defaultStep: lesson.stepConfig.defaultStep,
      mode: progress?.mode ?? "guided",
    })
    await onOpenLesson(lesson, progress?.modelId)
  }

  const handleContinue = async (lessonKey: string) => {
    const lesson = getTutorialLesson(lessonKey)
    if (!lesson) return
    const progress = lessonProgress[lessonKey]
    startLesson(lessonKey, {
      modelId: progress?.modelId,
      defaultStep: lesson.stepConfig.defaultStep,
      mode: progress?.mode ?? "guided",
    })
    await onOpenLesson(lesson, progress?.modelId)
  }

  // "Continue learning" quick-access: show if there's a current in-progress lesson
  const continueLesson =
    currentLesson && !completedLessons.includes(currentLesson)
      ? getTutorialLesson(currentLesson)
      : null

  return (
    <Box mt={8}>
      <Heading size="md" mb={1}>
        {t("flow.tutorial.sectionTitle")}
      </Heading>
      <Text fontSize="sm" color="fg.muted" mb={4}>
        {t("flow.tutorial.sectionSubtitle")}
      </Text>

      {continueLesson && (
        <Flex mb={4}>
          <Button
            colorPalette="blue"
            size="sm"
            onClick={() => {
              void handleContinue(continueLesson.lessonKey)
            }}
          >
            {t("flow.tutorial.continueLearning")}:{" "}
            {t(`flow.tutorial.chapters.${continueLesson.chapter}.title`)}
            <FiArrowRight />
          </Button>
        </Flex>
      )}

      <VStack align="stretch" gap={3}>
        {TUTORIAL_LESSONS.map((lesson) => (
          <TutorialLessonCard
            key={lesson.lessonKey}
            lesson={lesson}
            progress={lessonProgress[lesson.lessonKey]}
            isCompleted={completedLessons.includes(lesson.lessonKey)}
            isUnlocked={isUnlocked(lesson.lessonKey)}
            unlockedByName={getPrerequisiteName(lesson.lessonKey)}
            onStart={() => {
              void handleStart(lesson.lessonKey)
            }}
            onContinue={() => {
              void handleContinue(lesson.lessonKey)
            }}
          />
        ))}
      </VStack>
    </Box>
  )
}
