import {
  Badge,
  Box,
  Button,
  Collapsible,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"

import {
  resolveLocalizedText,
  type LocalizedText,
} from "@/data/tutorialContent"
import { useI18n } from "@/i18n"

export interface ContinuityCheckItemData {
  process_name: string
  dimension: string
  balance_value: number
  status: "pass" | "warn" | "error"
  explanation: string
  suggestion?: string | null
  details?: {
    contributions?: Array<{
      component: string
      stoich: number
      factor: number
      contribution: number
      expr: string
    }>
  } | null
}

interface ContinuityCheckPanelProps {
  continuityChecks: ContinuityCheckItemData[]
  onJumpToProcess?: (processName: string) => void
  notes?: LocalizedText[]
}

const STATUS_PALETTE: Record<string, string> = {
  pass: "green",
  warn: "orange",
  error: "red",
}

const STATUS_ICON: Record<string, string> = {
  pass: "\u2713",
  warn: "\u26A0",
  error: "\u2717",
}

export default function ContinuityCheckPanel({
  continuityChecks,
  onJumpToProcess,
  notes = [],
}: ContinuityCheckPanelProps) {
  const { t, language } = useI18n()
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (!continuityChecks || continuityChecks.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="xs" mb={2}>
          {t("flow.tutorial.continuity.sectionTitle")}
        </Heading>
        <Text color="gray.500" fontSize="sm">
          {t("flow.tutorial.continuity.emptyHint")}
        </Text>
      </Box>
    )
  }

  // 按维度分组
  const dimensions = Array.from(
    new Set(continuityChecks.map((c) => c.dimension)),
  )

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <VStack align="stretch" gap={3}>
        <Heading size="xs">
          {t("flow.tutorial.continuity.sectionTitle")}
        </Heading>

        {notes.length > 0 ? (
          <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
            <VStack align="stretch" gap={1}>
              <Text fontSize="xs" fontWeight="medium">
                {language === "zh" ? "阅读提示" : "Reading Notes"}
              </Text>
              {notes.map((note) => (
                <Text key={note.zh} fontSize="xs" color="fg.muted">
                  • {resolveLocalizedText(language, note)}
                </Text>
              ))}
            </VStack>
          </Box>
        ) : null}

        {dimensions.map((dim) => {
          const items = continuityChecks.filter((c) => c.dimension === dim)
          const allPass = items.every((c) => c.status === "pass")
          return (
            <Box key={dim}>
              <HStack gap={2} mb={1}>
                <Badge
                  colorPalette={allPass ? "green" : "orange"}
                  variant="subtle"
                >
                  {t(`flow.tutorial.continuity.dimensionLabels.${dim}`) || dim}
                </Badge>
              </HStack>
              <VStack align="stretch" gap={1}>
                {items.map((item, idx) => {
                  const globalIdx = continuityChecks.indexOf(item)
                  const isExpanded = expandedIdx === globalIdx
                  return (
                    <Box key={`${item.process_name}-${idx}`}>
                      <HStack gap={2}>
                        <Badge
                          colorPalette={STATUS_PALETTE[item.status]}
                          size="sm"
                        >
                          {STATUS_ICON[item.status]}{" "}
                          {t(
                            `flow.tutorial.continuity.statusLabels.${item.status}`,
                          )}
                        </Badge>
                        <Button
                          size="xs"
                          variant="ghost"
                          justifyContent="flex-start"
                          flex={1}
                          onClick={() => onJumpToProcess?.(item.process_name)}
                          title={t("flow.tutorial.continuity.jumpToProcess")}
                        >
                          {item.process_name}
                        </Button>
                        <Text fontSize="xs" color="gray.500" flexShrink={0}>
                          {t("flow.tutorial.continuity.balanceLabel")}:{" "}
                          {item.balance_value.toFixed(6)}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            setExpandedIdx(isExpanded ? null : globalIdx)
                          }
                        >
                          {isExpanded ? "\u25B2" : "\u25BC"}
                        </Button>
                      </HStack>
                      <Collapsible.Root open={isExpanded}>
                        <Collapsible.Content>
                          <Box pl={6} pt={1} pb={2}>
                            <Text fontSize="xs" color="gray.600" mb={1}>
                              <strong>
                                {t("flow.tutorial.continuity.explanationLabel")}
                                :
                              </strong>{" "}
                              {item.explanation}
                            </Text>
                            {item.suggestion && (
                              <Text fontSize="xs" color="orange.600" mb={1}>
                                <strong>
                                  {t(
                                    "flow.tutorial.continuity.suggestionLabel",
                                  )}
                                  :
                                </strong>{" "}
                                {item.suggestion}
                              </Text>
                            )}
                            {item.details?.contributions && (
                              <Box mt={1}>
                                {item.details.contributions.map((c, ci) => (
                                  <Text
                                    key={ci}
                                    fontSize="xs"
                                    fontFamily="mono"
                                    color="gray.500"
                                  >
                                    {c.component}: {c.expr || c.stoich} x{" "}
                                    {c.factor} = {c.contribution.toFixed(6)}
                                  </Text>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Collapsible.Content>
                      </Collapsible.Root>
                    </Box>
                  )
                })}
              </VStack>
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
