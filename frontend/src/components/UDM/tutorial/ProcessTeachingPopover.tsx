import { IconButton, Text, VStack } from "@chakra-ui/react"
import { FiInfo } from "react-icons/fi"

import { Tooltip } from "@/components/ui/tooltip"
import type { TutorialProcessTeaching } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface ProcessTeachingPopoverProps {
  teaching?: TutorialProcessTeaching
}

export default function ProcessTeachingPopover({
  teaching,
}: ProcessTeachingPopoverProps) {
  const { t } = useI18n()

  if (!teaching) return null

  return (
    <Tooltip
      placement="top-start"
      content={
        <VStack align="stretch" gap={2} maxW="260px">
          <Text fontWeight="semibold">{t(teaching.titleKey)}</Text>
          <Text fontSize="sm">{t(teaching.storyKey)}</Text>
          {teaching.mistakes.map((mistakeKey) => (
            <Text key={mistakeKey} fontSize="xs" color="fg.muted">
              • {t(mistakeKey)}
            </Text>
          ))}
        </VStack>
      }
    >
      <IconButton
        aria-label={t("flow.tutorial.processHelp")}
        size="2xs"
        variant="ghost"
      >
        <FiInfo />
      </IconButton>
    </Tooltip>
  )
}
