import { Alert, Box, HStack, List, Stack, Tag, Text } from "@chakra-ui/react"
import { useMemo } from "react"
import { FiAlertTriangle } from "react-icons/fi"

import type { UDMResultData } from "@/components/Flow/legacy-analysis/udm-analysis"
import { useI18n } from "@/i18n"

interface ExplosionDetection {
  hasExplosion: boolean
  severity: "none" | "warning" | "critical"
  affectedVariables: string[]
}

export function detectExplosion(resultData: UDMResultData): ExplosionDetection {
  const affected = new Set<string>()
  let maxSeverity: "none" | "warning" | "critical" = "none"

  for (const [, nodeData] of Object.entries(resultData.node_data ?? {})) {
    for (const [key, series] of Object.entries(nodeData)) {
      if (key === "label" || !Array.isArray(series)) continue
      const arr = series as number[]
      for (let i = 0; i < arr.length; i++) {
        const val = arr[i]
        // Check NaN / Infinity
        if (val == null || !Number.isFinite(val)) {
          affected.add(key)
          maxSeverity = "critical"
          break
        }
        // Check extreme values
        if (Math.abs(val) > 1e10) {
          affected.add(key)
          maxSeverity = "critical"
          break
        }
        // Check rapid ratio (> 100x between consecutive steps)
        if (i > 0) {
          const prev = arr[i - 1]
          if (prev !== 0 && Math.abs(val / prev) > 100) {
            affected.add(key)
            if (maxSeverity !== "critical") maxSeverity = "warning"
          }
        }
      }
    }
  }

  return {
    hasExplosion: affected.size > 0,
    severity: maxSeverity,
    affectedVariables: Array.from(affected),
  }
}

interface ExplosionDebugChecklistProps {
  resultData: UDMResultData
}

export default function ExplosionDebugChecklist({
  resultData,
}: ExplosionDebugChecklistProps) {
  const { t } = useI18n()

  const detection = useMemo(() => detectExplosion(resultData), [resultData])

  if (!detection.hasExplosion) return null

  const isCritical = detection.severity === "critical"

  return (
    <Stack gap={3}>
      <Alert.Root status={isCritical ? "error" : "warning"}>
        <Alert.Indicator>
          <FiAlertTriangle />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>
            {t("flow.tutorial.explosionDebug.alertTitle")}
          </Alert.Title>
          <Alert.Description>
            <HStack flexWrap="wrap" gap={1} mt={1}>
              {detection.affectedVariables.map((v) => (
                <Tag.Root
                  key={v}
                  size="sm"
                  colorPalette={isCritical ? "red" : "orange"}
                >
                  <Tag.Label>{v}</Tag.Label>
                </Tag.Root>
              ))}
            </HStack>
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>

      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          {t("flow.tutorial.explosionDebug.checklistTitle")}
        </Text>
        <List.Root gap={2} pl={2}>
          {(
            [
              "checkInitialValues",
              "checkStoichiometry",
              "reduceStepSize",
              "checkVolume",
              "checkRateExpressions",
            ] as const
          ).map((key) => (
            <List.Item key={key} fontSize="sm">
              {t(`flow.tutorial.explosionDebug.items.${key}`)}
            </List.Item>
          ))}
        </List.Root>
      </Box>
    </Stack>
  )
}
