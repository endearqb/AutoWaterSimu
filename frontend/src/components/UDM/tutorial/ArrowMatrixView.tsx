import { Badge, Box, Table } from "@chakra-ui/react"

interface ArrowMatrixRow {
  name: string
  stoich: Record<string, string>
}

interface ArrowMatrixViewProps {
  componentNames: string[]
  processRows: ArrowMatrixRow[]
}

const resolveSymbol = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "0")
    return { label: "·", colorPalette: "gray" as const }
  if (trimmed.startsWith("-"))
    return { label: "↓", colorPalette: "red" as const }
  return { label: "↑", colorPalette: "green" as const }
}

export default function ArrowMatrixView({
  componentNames,
  processRows,
}: ArrowMatrixViewProps) {
  if (componentNames.length === 0 || processRows.length === 0) return null

  return (
    <Box borderWidth="1px" borderRadius="md" overflow="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Process</Table.ColumnHeader>
            {componentNames.map((componentName) => (
              <Table.ColumnHeader key={componentName}>
                {componentName}
              </Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {processRows.map((row) => (
            <Table.Row key={row.name}>
              <Table.Cell>{row.name || "-"}</Table.Cell>
              {componentNames.map((componentName) => {
                const symbol = resolveSymbol(row.stoich[componentName] || "0")
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
  )
}
