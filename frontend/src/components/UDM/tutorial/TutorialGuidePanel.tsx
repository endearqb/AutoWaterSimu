import { Box, Heading, IconButton, List, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { FiBookOpen, FiX } from "react-icons/fi"

import type { TutorialLesson, TutorialStep } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import ChapterGuideCard from "./ChapterGuideCard"

interface TutorialGuidePanelProps {
  lesson: TutorialLesson
  currentStep: TutorialStep
  variant?: "sidebar" | "floating"
}

function TutorialGuidePanelContent({
  lesson,
  currentStep,
}: Pick<TutorialGuidePanelProps, "lesson" | "currentStep">) {
  const { t } = useI18n()
  const stepGuide = lesson.stepGuides[currentStep]
  const watchItems = lesson.processTeaching
    .flatMap((item) => item.mistakes)
    .slice(0, 3)

  return (
    <VStack align="stretch" gap={4}>
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

export default function TutorialGuidePanel({
  lesson,
  currentStep,
  variant = "sidebar",
}: TutorialGuidePanelProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  if (variant === "floating") {
    return (
      <Box
        position="fixed"
        top={{ base: "120px", md: "96px" }}
        right={{ base: "16px", md: "24px" }}
        zIndex={30}
      >
        {isOpen ? (
          <Box
            w={{ base: "min(360px, calc(100vw - 32px))", md: "360px" }}
            maxH="calc(100vh - 128px)"
            overflowY="auto"
            borderWidth="1px"
            borderRadius="xl"
            bg="background.card"
            boxShadow="lg"
            p={4}
            pr={14}
          >
            <IconButton
              aria-label={t("flow.tutorial.guide.chapterLabel")}
              variant="solid"
              size="sm"
              borderRadius="full"
              position="absolute"
              top="12px"
              right="12px"
              onClick={() => setIsOpen(false)}
            >
              <FiX />
            </IconButton>
            <TutorialGuidePanelContent
              lesson={lesson}
              currentStep={currentStep}
            />
          </Box>
        ) : (
          <IconButton
            aria-label={t("flow.tutorial.guide.chapterLabel")}
            title={t("flow.tutorial.guide.chapterLabel")}
            variant="solid"
            size="lg"
            borderRadius="full"
            boxShadow="lg"
            onClick={() => setIsOpen(true)}
          >
            <FiBookOpen />
          </IconButton>
        )}
      </Box>
    )
  }

  return (
    <VStack
      align="stretch"
      gap={4}
      position={{ lg: "sticky" }}
      top={{ lg: "88px" }}
    >
      <TutorialGuidePanelContent lesson={lesson} currentStep={currentStep} />
    </VStack>
  )
}
