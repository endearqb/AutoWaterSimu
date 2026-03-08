import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react"
import { useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { FiAward, FiBookOpen } from "react-icons/fi"

import type { UDMResultData } from "@/components/Flow/legacy-analysis/udm-analysis"
import { TUTORIAL_LESSONS, getTutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import type { BaseModelState } from "@/stores/baseModelStore"
import type { RFState } from "@/stores/flowStore"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import ExplosionDebugChecklist from "./ExplosionDebugChecklist"
import RecommendedChartsPanel from "./RecommendedChartsPanel"
import ResultInterpretationCard from "./ResultInterpretationCard"

interface TutorialResultsPanelProps {
  lessonKey: string
  store?: () => RFState
  modelStore?: () => BaseModelState<any, any, any, any, any>
}

export default function TutorialResultsPanel({
  lessonKey,
  modelStore,
}: TutorialResultsPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const lesson = getTutorialLesson(lessonKey)

  // Get result data from model store
  const currentModelStore = modelStore?.()
  const resultData = currentModelStore?.currentJob?.result_data as
    | UDMResultData
    | undefined
  const isJobSuccess = currentModelStore?.currentJob?.status === "success"

  // Tutorial progress
  const progress = useTutorialProgressStore((s) => s.lessonProgress[lessonKey])
  const completedLessons = useTutorialProgressStore((s) => s.completedLessons)
  const completeLesson = useTutorialProgressStore((s) => s.completeLesson)

  // Determine completion
  const isComplete = useMemo(() => {
    if (!progress) return false
    return progress.validatePassed && !!progress.simulationRanAt
  }, [progress])

  const isAlreadyCompleted = completedLessons.includes(lessonKey)

  // Find next lesson suggestion
  const nextLesson = useMemo(() => {
    const currentIdx = TUTORIAL_LESSONS.findIndex(
      (l) => l.lessonKey === lessonKey,
    )
    if (currentIdx < 0) return null
    for (let i = currentIdx + 1; i < TUTORIAL_LESSONS.length; i++) {
      const candidate = TUTORIAL_LESSONS[i]
      if (candidate.comingSoon) continue
      return candidate
    }
    return null
  }, [lessonKey])

  if (!lesson) {
    return (
      <Text fontSize="sm" color="gray.500">
        {t("flow.tutorial.results.unknownLesson")}
      </Text>
    )
  }

  // No simulation yet
  if (!resultData || !isJobSuccess) {
    return (
      <Stack gap={4} py={2}>
        <HStack gap={2}>
          <FiBookOpen />
          <Text fontSize="sm" fontWeight="semibold">
            {t("flow.tutorial.results.panelTitle")}
          </Text>
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {t("flow.tutorial.results.noResultHint")}
        </Text>
      </Stack>
    )
  }

  // Has results — render full panel
  const handleComplete = () => {
    completeLesson(lessonKey)
  }

  const handleNextLesson = () => {
    if (nextLesson) {
      navigate({
        to: "/udmModelEditor",
        search: { lessonKey: nextLesson.lessonKey },
      })
    }
  }

  return (
    <Stack gap={4} py={2}>
      <HStack gap={2}>
        <FiBookOpen />
        <Text fontSize="sm" fontWeight="semibold">
          {t("flow.tutorial.results.panelTitle")}
        </Text>
      </HStack>

      {/* Explosion debug checklist (shown first if detected) */}
      <ExplosionDebugChecklist resultData={resultData} />

      {/* Recommended charts */}
      <RecommendedChartsPanel lesson={lesson} resultData={resultData} />

      {/* Interpretation cards */}
      <ResultInterpretationCard
        lessonKey={lessonKey}
        hasSimulationResult={true}
      />

      {/* Completion card */}
      {isComplete && !isAlreadyCompleted && (
        <Box
          p={4}
          borderWidth={1}
          borderRadius="md"
          borderColor="green.200"
          bg="green.50"
        >
          <HStack gap={2} mb={2}>
            <FiAward color="green" />
            <Text fontSize="sm" fontWeight="bold" color="green.700">
              {t("flow.tutorial.completion.congratsTitle")}
            </Text>
          </HStack>
          <Text fontSize="sm" color="green.700" mb={3}>
            {t("flow.tutorial.completion.congratsBody")}
          </Text>
          <HStack gap={2}>
            <Button size="sm" colorPalette="green" onClick={handleComplete}>
              {t("flow.tutorial.completion.markComplete")}
            </Button>
            {nextLesson && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                onClick={handleNextLesson}
              >
                {t("flow.tutorial.completion.nextChapter")}
              </Button>
            )}
          </HStack>
        </Box>
      )}

      {/* Already completed */}
      {isAlreadyCompleted && (
        <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          borderColor="green.200"
          bg="green.50"
        >
          <HStack gap={2}>
            <FiAward color="green" />
            <Text fontSize="sm" color="green.700">
              {t("flow.tutorial.completion.alreadyCompleted")}
            </Text>
          </HStack>
          {nextLesson && (
            <Button
              size="sm"
              variant="outline"
              colorPalette="blue"
              mt={2}
              onClick={handleNextLesson}
            >
              {t("flow.tutorial.completion.nextChapter")}
            </Button>
          )}
        </Box>
      )}
    </Stack>
  )
}
