import { Badge, Box, Button, Flex, HStack, Text } from "@chakra-ui/react"
import { FiCheck } from "react-icons/fi"

import type { TutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface LessonProgress {
  currentStep: number
}

interface TutorialLessonCardProps {
  lesson: TutorialLesson
  progress?: LessonProgress
  isCompleted: boolean
  isUnlocked: boolean
  unlockedByName?: string
  onStart: () => void
  onContinue: () => void
}

export default function TutorialLessonCard({
  lesson,
  progress,
  isCompleted,
  isUnlocked,
  unlockedByName,
  onStart,
  onContinue,
}: TutorialLessonCardProps) {
  const { t } = useI18n()
  const isComingSoon = !!lesson.comingSoon
  const isStarted = !!progress
  const disabled = isComingSoon || !isUnlocked

  return (
    <Flex
      borderWidth="1px"
      borderRadius="md"
      p={4}
      align="center"
      justify="space-between"
      gap={4}
      opacity={disabled ? 0.5 : 1}
      bg={isCompleted ? "green.50" : undefined}
      _dark={isCompleted ? { bg: "green.950" } : undefined}
    >
      <Box flex="1" minW={0}>
        <Flex align="center" gap={2} wrap="wrap">
          <Badge colorPalette="purple" size="sm">
            {t(`flow.tutorial.chapters.${lesson.level}.title`)}
          </Badge>
          <Badge
            colorPalette={lesson.difficulty === "beginner" ? "green" : "orange"}
            size="sm"
          >
            {t(`flow.tutorial.difficulty.${lesson.difficulty}`)}
          </Badge>
          <Badge colorPalette="blue" size="sm">
            {t(`flow.tutorial.templateType.${lesson.templateType}`)}
          </Badge>
          {isCompleted && (
            <Badge colorPalette="green" size="sm">
              <HStack gap={1}>
                <FiCheck />
                <span>{t("flow.tutorial.completed")}</span>
              </HStack>
            </Badge>
          )}
        </Flex>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          {t(`flow.tutorial.chapters.${lesson.level}.subtitle`)}
        </Text>
        <HStack mt={1} gap={3}>
          <Text fontSize="xs" color="fg.muted">
            {t("flow.tutorial.minutes", { n: lesson.estimatedMinutes })}
          </Text>
          {!isUnlocked && unlockedByName && (
            <Text fontSize="xs" color="orange.600">
              {t("flow.tutorial.prerequisite", { name: unlockedByName })}
            </Text>
          )}
          {isComingSoon && (
            <Text fontSize="xs" color="fg.muted" fontStyle="italic">
              {t("flow.tutorial.comingSoon")}
            </Text>
          )}
        </HStack>
      </Box>

      <Box flexShrink={0}>
        {isStarted && !isCompleted ? (
          <Button
            size="sm"
            colorPalette="blue"
            disabled={disabled}
            onClick={onContinue}
          >
            {t("flow.tutorial.continueLearning")}
          </Button>
        ) : (
          <Button
            size="sm"
            colorPalette={isCompleted ? "green" : "blue"}
            variant={isCompleted ? "subtle" : "solid"}
            disabled={disabled}
            onClick={onStart}
          >
            {isCompleted
              ? t("flow.tutorial.viewAnswer")
              : t("flow.tutorial.startLearning")}
          </Button>
        )}
      </Box>
    </Flex>
  )
}
