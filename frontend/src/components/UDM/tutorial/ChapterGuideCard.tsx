import { Box, Heading, Text, VStack } from "@chakra-ui/react"

import { resolveLocalizedText } from "@/data/tutorialContent"
import type { TutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface ChapterGuideCardProps {
  lesson: TutorialLesson
}

export default function ChapterGuideCard({ lesson }: ChapterGuideCardProps) {
  const { t, language } = useI18n()

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
        <Text fontSize="sm">{resolveLocalizedText(language, lesson.summary)}</Text>
        <VStack align="stretch" gap={1} pt={1}>
          {lesson.entryHighlights.slice(0, 3).map((item) => (
            <Text key={item.zh} fontSize="xs" color="fg.muted">
              • {resolveLocalizedText(language, item)}
            </Text>
          ))}
        </VStack>
      </VStack>
    </Box>
  )
}
