import { Box, Collapsible, HStack, Table, Text } from "@chakra-ui/react"
import { useState } from "react"
import { FiChevronDown, FiChevronRight } from "react-icons/fi"

import { useI18n } from "@/i18n"
import { resolveTutorialParameterDisplay } from "@/utils/udmTutorialLocalization"

interface ParameterRow {
  name: string
  defaultValue: string
  unit: string
}

interface TutorialParameterReferenceProps {
  parameterRows: ParameterRow[]
  lessonKey: string | undefined
}

export default function TutorialParameterReference({
  parameterRows,
  lessonKey,
}: TutorialParameterReferenceProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  const validRows = parameterRows.filter((r) => r.name.trim())
  if (validRows.length === 0) return null

  return (
    <Box borderWidth={1} borderRadius="md" overflow="hidden" mt={4}>
      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <HStack
            px={3}
            py={2}
            cursor="pointer"
            _hover={{ bg: "bg.subtle" }}
            userSelect="none"
          >
            {open ? <FiChevronDown /> : <FiChevronRight />}
            <Text fontWeight="medium" fontSize="sm">
              {t("flow.udmEditor.form.sections.parameterReference")}
            </Text>
          </HStack>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box px={3} pb={3}>
            <Table.ScrollArea>
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.paramRef.name")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.paramRef.description")}
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                      {t("flow.udmEditor.form.paramRef.defaultValue")}
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {validRows.map((row) => {
                    const display = resolveTutorialParameterDisplay(
                      t,
                      lessonKey,
                      row.name,
                    )
                    return (
                      <Table.Row key={row.name}>
                        <Table.Cell>
                          <Text fontFamily="mono" fontSize="xs">
                            {row.name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs">
                            {display.label}
                            {display.description ? (
                              <Text as="span" color="fg.muted">
                                {" "}
                                — {display.description}
                              </Text>
                            ) : null}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="xs" fontFamily="mono">
                            {row.defaultValue}
                            {row.unit ? ` ${row.unit}` : ""}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Table.ScrollArea>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  )
}
