import { Box, Heading, List, Text, VStack } from "@chakra-ui/react"

import type { TutorialLesson, TutorialStep } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import ChapterGuideCard from "./ChapterGuideCard"

interface TutorialGuidePanelProps {
  lesson: TutorialLesson
  currentStep: TutorialStep
}

export default function TutorialGuidePanel({
  lesson,
  currentStep,
}: TutorialGuidePanelProps) {
  const { t } = useI18n()
  const stepGuide = lesson.stepGuides[currentStep]
  const watchItems = lesson.processTeaching
    .flatMap((item) => item.mistakes)
    .slice(0, 3)

  return (
    <VStack
      align="stretch"
      gap={4}
      position={{ lg: "sticky" }}
      top={{ lg: "88px" }}
    >
      <ChapterGuideCard lesson={lesson} />

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <VStack align="stretch" gap={3}>
          <Heading size="xs">
            {t("flow.tutorial.guide.objectivesTitle")}
          </Heading>
          <List.Root gap={2}>
            {lesson.objectives.map((objectiveKey) => (
              <List.Item key={objectiveKey}>
                <Text fontSize="sm">{t(objectiveKey)}</Text>
              </List.Item>
            ))}
          </List.Root>
        </VStack>
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <VStack align="stretch" gap={3}>
          <Heading size="xs">
            {t("flow.tutorial.guide.currentStepTitle", { step: currentStep })}
          </Heading>
          <Text fontWeight="medium">{t(stepGuide.titleKey)}</Text>
          <Text fontSize="sm" color="fg.muted">
            {t(stepGuide.bodyKey)}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {t("flow.tutorial.guide.focusAreas")}:{" "}
            {stepGuide.focusAreas
              .map((area) => t(`flow.tutorial.focusAreas.${area}`))
              .join(", ")}
          </Text>
        </VStack>
      </Box>

      {watchItems.length > 0 ? (
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <VStack align="stretch" gap={2}>
            <Heading size="xs">{t("flow.tutorial.guide.watchTitle")}</Heading>
            <List.Root gap={2}>
              {watchItems.map((itemKey) => (
                <List.Item key={itemKey}>
                  <Text fontSize="sm">{t(itemKey)}</Text>
                </List.Item>
              ))}
            </List.Root>
          </VStack>
        </Box>
      ) : null}
    </VStack>
  )
}
