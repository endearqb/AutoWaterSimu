import { Box, Heading, Text, VStack } from "@chakra-ui/react"

import type { TutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface ChapterGuideCardProps {
  lesson: TutorialLesson
}

export default function ChapterGuideCard({ lesson }: ChapterGuideCardProps) {
  const { t } = useI18n()

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <VStack align="stretch" gap={2}>
        <Text fontSize="xs" color="fg.muted">
          {t("flow.tutorial.guide.chapterLabel")}
        </Text>
        <Heading size="sm">
          {t(`flow.tutorial.chapters.${lesson.chapter}.title`)}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          {t(`flow.tutorial.chapters.${lesson.chapter}.subtitle`)}
        </Text>
      </VStack>
    </Box>
  )
}
