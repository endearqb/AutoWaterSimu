import { Box, HStack, Stack, Tag, Text } from "@chakra-ui/react"
import { useCallback, useMemo, useState } from "react"

import TimeSeriesChart from "@/components/Flow/legacy-analysis/TimeSeriesChart"
import type { UDMResultData } from "@/components/Flow/legacy-analysis/udm-analysis"
import type { TutorialLesson } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"
import {
  formatAliasWithCanonical,
  resolveTutorialVariableLabel,
} from "@/utils/udmTutorialLocalization"

interface RecommendedChartsPanelProps {
  lesson: TutorialLesson
  resultData: UDMResultData
}

export default function RecommendedChartsPanel({
  lesson,
  resultData,
}: RecommendedChartsPanelProps) {
  const { t } = useI18n()

  const recommended = lesson.recommendedCharts ?? []

  // Build available variables from result data
  const availableVars = useMemo(() => {
    const vars = new Set<string>()
    for (const node of Object.values(resultData.node_data ?? {})) {
      for (const key of Object.keys(node)) {
        if (key === "label" || !Array.isArray(node[key])) continue
        vars.add(key)
      }
    }
    return Array.from(vars)
  }, [resultData])

  // Default to recommended variables that actually exist in data
  const [selectedVars, setSelectedVars] = useState<string[]>(() =>
    recommended.filter((v) => availableVars.includes(v)),
  )

  // Pick the first reactor node (non-input, non-output)
  const reactorNodeIds = useMemo(() => {
    const ids = Object.keys(resultData.node_data ?? {})
    return ids.filter((id) => !id.includes("input") && !id.includes("output"))
  }, [resultData])

  const timeRange = useMemo<[number, number]>(() => {
    const ts = resultData.timestamps ?? []
    return [ts[0] ?? 0, ts[ts.length - 1] ?? 1]
  }, [resultData])

  const [currentTimeRange, setCurrentTimeRange] =
    useState<[number, number]>(timeRange)

  const handleTimeRangeChange = useCallback(
    (range: [number, number]) => setCurrentTimeRange(range),
    [],
  )

  const hasChartData =
    reactorNodeIds.length > 0 &&
    selectedVars.length > 0 &&
    (resultData.timestamps?.length ?? 0) > 0

  const toggleVariable = (varName: string) => {
    setSelectedVars((prev) =>
      prev.includes(varName)
        ? prev.filter((v) => v !== varName)
        : [...prev, varName],
    )
  }

  if (reactorNodeIds.length === 0) return null

  return (
    <Stack gap={3} minW={0}>
      <Text fontSize="sm" fontWeight="semibold">
        {t("flow.tutorial.results.recommendedCharts")}
      </Text>
      <HStack flexWrap="wrap" gap={1} minW={0}>
        {availableVars.map((v) => {
          const isSelected = selectedVars.includes(v)
          const isRecommended = recommended.includes(v)
          const displayLabel = formatAliasWithCanonical(
            resolveTutorialVariableLabel(t, lesson.lessonKey, v),
            v,
          )
          return (
            <Tag.Root
              key={v}
              size="sm"
              variant={isSelected ? "solid" : "outline"}
              colorPalette={isRecommended ? "blue" : "gray"}
              cursor="pointer"
              onClick={() => toggleVariable(v)}
            >
              <Tag.Label>{displayLabel}</Tag.Label>
            </Tag.Root>
          )
        })}
      </HStack>
      {hasChartData ? (
        <Box w="full" minW={0} minH="250px">
          <TimeSeriesChart
            resultData={resultData}
            selectedNodes={reactorNodeIds}
            selectedVariables={selectedVars}
            timeRange={currentTimeRange}
            onTimeRangeChange={handleTimeRangeChange}
            showTimeRangeSlider={false}
            showSegmentLines={false}
            showParamChangeAnnotations={false}
            chartHeight={250}
            modelType="udm"
          />
        </Box>
      ) : selectedVars.length > 0 ? (
        <Text fontSize="xs" color="gray.500">
          {t("flow.analysis.emptyRange")}
        </Text>
      ) : (
        <Text fontSize="xs" color="gray.500">
          {t("flow.tutorial.results.selectVariableHint")}
        </Text>
      )}
    </Stack>
  )
}
