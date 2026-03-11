import { Badge, Box, Table, Text, VStack } from "@chakra-ui/react"

import { useI18n } from "@/i18n"
import { Tooltip } from "@/components/ui/tooltip"
import {
  resolveTutorialProcessDisplay,
  resolveTutorialVariableLabel,
} from "@/utils/udmTutorialLocalization"

interface ArrowMatrixRow {
  name: string
  stoich: Record<string, string>
}

interface ComponentInfo {
  label?: string | null
  note?: string | null
}

interface ArrowMatrixViewProps {
  lessonKey?: string
  componentNames: string[]
  processRows: ArrowMatrixRow[]
  componentInfos?: Map<string, ComponentInfo>
}

const resolveSymbol = (value: string, t: (key: string) => string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "0") {
    return {
      label: t("flow.tutorial.matrix.noneSymbol"),
      colorPalette: "gray" as const,
    }
  }
  if (trimmed.startsWith("-")) {
    return {
      label: t("flow.tutorial.matrix.consumeSymbol"),
      colorPalette: "red" as const,
    }
  }
  return {
    label: t("flow.tutorial.matrix.produceSymbol"),
    colorPalette: "green" as const,
  }
}

export default function ArrowMatrixView({
  lessonKey,
  componentNames,
  processRows,
  componentInfos,
}: ArrowMatrixViewProps) {
  const { t } = useI18n()

  if (componentNames.length === 0 || processRows.length === 0) return null

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="hidden">
      <VStack align="stretch" gap={0}>
        <Box px={4} py={3} borderBottomWidth="1px">
          <Text fontWeight="semibold">
            {t("flow.tutorial.matrix.title")}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {t("flow.tutorial.matrix.description")}
          </Text>
        </Box>
        <Box overflow="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  {t("flow.tutorial.matrix.processHeader")}
                </Table.ColumnHeader>
                {componentNames.map((componentName) => {
                  const info = componentInfos?.get(componentName)
                  const headerContent = (
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium">
                        {resolveTutorialVariableLabel(
                          t,
                          lessonKey,
                          componentName,
                          info?.label,
                        )}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {componentName}
                      </Text>
                    </VStack>
                  )
                  return (
                    <Table.ColumnHeader key={componentName}>
                      {info?.note ? (
                        <Tooltip content={info.note}>{headerContent}</Tooltip>
                      ) : (
                        headerContent
                      )}
                    </Table.ColumnHeader>
                  )
                })}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {processRows.map((row) => (
                <Table.Row key={row.name}>
                  <Table.Cell>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium">
                        {resolveTutorialProcessDisplay(t, lessonKey, row.name).label}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {row.name || "-"}
                      </Text>
                    </VStack>
                  </Table.Cell>
                  {componentNames.map((componentName) => {
                    const symbol = resolveSymbol(
                      row.stoich[componentName] || "0",
                      t,
                    )
                    return (
                      <Table.Cell key={`${row.name}-${componentName}`}>
                        <Badge colorPalette={symbol.colorPalette} variant="subtle">
                          {symbol.label}
                        </Badge>
                      </Table.Cell>
                    )
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </VStack>
    </Box>
  )
}
