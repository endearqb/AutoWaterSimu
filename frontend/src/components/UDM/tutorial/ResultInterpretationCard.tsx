import { Box, Collapsible, HStack, Stack, Tag, Text } from "@chakra-ui/react"
import { useState } from "react"
import { FiChevronDown, FiChevronRight } from "react-icons/fi"

import {
  type TutorialInsight,
  getTutorialTakeaways,
  getTutorialInsights,
} from "@/data/tutorialInsights"
import { useI18n } from "@/i18n"
import { resolveLocalizedText } from "@/data/tutorialContent"
import {
  formatAliasWithCanonical,
  resolveTutorialVariableLabel,
} from "@/utils/udmTutorialLocalization"

interface InsightItemProps {
  lessonKey: string
  insight: TutorialInsight
}

interface ResultInterpretationCardProps {
  lessonKey: string
  hasSimulationResult: boolean
}

function InsightItem({ lessonKey, insight }: InsightItemProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <Box borderWidth={1} borderRadius="md" overflow="hidden">
      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <HStack
            px={3}
            py={2}
            cursor="pointer"
            _hover={{ bg: "gray.50" }}
            justify="space-between"
          >
            <HStack gap={2}>
              {open ? (
                <FiChevronDown size={14} />
              ) : (
                <FiChevronRight size={14} />
              )}
              <Text fontSize="sm" fontWeight="medium">
                {t(insight.titleKey)}
              </Text>
            </HStack>
            <HStack gap={1}>
              {insight.relatedVariables.map((v) => (
                <Tag.Root
                  key={v}
                  size="sm"
                  variant="outline"
                  colorPalette="blue"
                >
                  <Tag.Label>
                    {formatAliasWithCanonical(
                      resolveTutorialVariableLabel(t, lessonKey, v),
                      v,
                    )}
                  </Tag.Label>
                </Tag.Root>
              ))}
            </HStack>
          </HStack>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box px={3} pb={3} pt={1}>
            <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">
              {t(insight.bodyKey)}
            </Text>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}

export default function ResultInterpretationCard({
  lessonKey,
  hasSimulationResult,
}: ResultInterpretationCardProps) {
  const { t, language } = useI18n()
  const insights = getTutorialInsights(lessonKey)
  const takeaways = getTutorialTakeaways(lessonKey)

  const visibleInsights = insights.filter(
    (item) =>
      item.triggerCondition === "always" ||
      (item.triggerCondition === "simulation-complete" && hasSimulationResult),
  )

  if (visibleInsights.length === 0) return null

  return (
    <Stack gap={2}>
      {takeaways.length > 0 ? (
        <Box borderWidth={1} borderRadius="md" p={3}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            {language === "zh" ? "结果提示" : "Key Takeaways"}
          </Text>
          <Stack gap={1}>
            {takeaways.map((item) => (
              <Text key={item.zh} fontSize="sm" color="gray.600">
                • {resolveLocalizedText(language, item)}
              </Text>
            ))}
          </Stack>
        </Box>
      ) : null}
      <Text fontSize="sm" fontWeight="semibold">
        {t("flow.tutorial.results.insightsTitle")}
      </Text>
      <Stack gap={2}>
        {visibleInsights.map((insight) => (
          <InsightItem
            key={insight.id}
            lessonKey={lessonKey}
            insight={insight}
          />
        ))}
      </Stack>
    </Stack>
  )
}
