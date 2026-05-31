import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { FiChevronRight, FiRefreshCw } from "react-icons/fi"

import type { ModelCatalog, ModelCatalogRecord } from "@/client/compute"
import { computeJobsService } from "@/services/computeJobsService"

export const Route = createFileRoute("/_layout/model-governance")({
  component: ModelGovernance,
})

const formatDateTime = (value: unknown) => {
  if (!value) {
    return "N/A"
  }
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return date.toLocaleString()
}

const formatError = (error: unknown) => {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    const body =
      record.body && typeof record.body === "object"
        ? (record.body as Record<string, unknown>)
        : {}
    return (
      (typeof body.message === "string" && body.message) ||
      (typeof body.detail === "string" && body.detail) ||
      (typeof record.message === "string" && record.message) ||
      "Request failed"
    )
  }
  return "Request failed"
}

const versionStatusPalette = (status: string) => {
  switch (status) {
    case "active":
      return "green"
    case "deprecated":
      return "orange"
    case "archived":
      return "gray"
    default:
      return "blue"
  }
}

const parameterStatusPalette = (status: string) => {
  switch (status) {
    case "approved":
      return "green"
    case "validated":
      return "teal"
    case "candidate":
      return "blue"
    case "retired":
      return "gray"
    case "draft":
      return "orange"
    default:
      return "gray"
  }
}

function metricSummary(catalog: ModelCatalog | undefined) {
  const models = catalog?.models ?? []
  const versions = models.flatMap((model) => model.versions)
  return {
    benchmarkCases: versions.reduce(
      (total, version) => total + version.benchmark_cases.length,
      0,
    ),
    models: models.length,
    parameterTemplates: versions.reduce(
      (total, version) => total + version.parameter_templates.length,
      0,
    ),
    versions: versions.length,
  }
}

function MetricTile({
  label,
  value,
}: {
  label: string
  value: string | number | undefined
}) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4} minH="92px">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text mt={2} fontSize="2xl" fontWeight="semibold">
        {value ?? "N/A"}
      </Text>
    </Box>
  )
}

function CatalogVersionTable({
  catalog,
  isFetching,
}: {
  catalog: ModelCatalog | undefined
  isFetching: boolean
}) {
  const rows =
    catalog?.models.flatMap((model) =>
      model.versions.map((version) => ({
        benchmarkCount: version.benchmark_cases.length,
        displayName: model.display_name,
        modelKey: model.model_key,
        parameterHash: version.default_parameter_set?.parameter_hash ?? "N/A",
        parameterSet:
          version.default_parameter_set?.parameter_set_id ?? "N/A",
        parameterStatus: version.default_parameter_set?.status ?? "N/A",
        status: version.status,
        templateCount: version.parameter_templates.length,
        version: version.model_version,
      })),
    ) ?? []

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={3}>
        <Heading size="md">Current model catalog</Heading>
        <Text fontSize="sm" color="fg.muted">
          {isFetching ? "Loading" : `${rows.length} versions`}
        </Text>
      </Flex>

      {rows.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          No catalog models are available.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Model</Table.ColumnHeader>
                <Table.ColumnHeader>Version</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Default set</Table.ColumnHeader>
                <Table.ColumnHeader>Set status</Table.ColumnHeader>
                <Table.ColumnHeader>Benchmarks</Table.ColumnHeader>
                <Table.ColumnHeader>Parameter hash</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={`${row.modelKey}-${row.version}`}>
                  <Table.Cell maxW="240px" truncate>
                    {row.displayName}
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {row.modelKey}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{row.version}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={versionStatusPalette(row.status)}>
                      {row.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell maxW="220px" truncate>
                    {row.parameterSet}
                    <Text fontSize="xs" color="fg.muted">
                      {row.templateCount} templates
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      colorPalette={parameterStatusPalette(row.parameterStatus)}
                    >
                      {row.parameterStatus}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{row.benchmarkCount}</Table.Cell>
                  <Table.Cell maxW="280px" truncate>
                    {row.parameterHash}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  )
}

function snapshotVersionSummary(snapshot: ModelCatalogRecord) {
  const summary = metricSummary(snapshot.payload)
  const defaultStatuses = new Set<string>()
  for (const model of snapshot.payload.models) {
    for (const version of model.versions) {
      if (version.default_parameter_set?.status) {
        defaultStatuses.add(version.default_parameter_set.status)
      }
    }
  }
  return {
    ...summary,
    defaultStatuses: Array.from(defaultStatuses),
  }
}

function SnapshotTable({
  items,
  isFetching,
}: {
  items: ModelCatalogRecord[]
  isFetching: boolean
}) {
  if (items.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        {isFetching
          ? "Loading persisted catalog snapshots."
          : "No persisted catalog snapshots are available."}
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Created</Table.ColumnHeader>
            <Table.ColumnHeader>Catalog</Table.ColumnHeader>
            <Table.ColumnHeader>Models</Table.ColumnHeader>
            <Table.ColumnHeader>Versions</Table.ColumnHeader>
            <Table.ColumnHeader>Default status</Table.ColumnHeader>
            <Table.ColumnHeader>Source</Table.ColumnHeader>
            <Table.ColumnHeader>Payload hash</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((snapshot) => {
            const summary = snapshotVersionSummary(snapshot)
            return (
              <Table.Row
                key={`${snapshot.catalog_id}-${snapshot.payload_hash}-${snapshot.created_at}`}
              >
                <Table.Cell>{formatDateTime(snapshot.created_at)}</Table.Cell>
                <Table.Cell>{snapshot.catalog_id}</Table.Cell>
                <Table.Cell>{summary.models}</Table.Cell>
                <Table.Cell>{summary.versions}</Table.Cell>
                <Table.Cell maxW="220px">
                  <HStack gap={2} wrap="wrap">
                    {summary.defaultStatuses.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        N/A
                      </Text>
                    ) : (
                      summary.defaultStatuses.map((status) => (
                        <Badge
                          key={status}
                          colorPalette={parameterStatusPalette(status)}
                        >
                          {status}
                        </Badge>
                      ))
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell maxW="220px" truncate>
                  {snapshot.source_system}
                  <Text fontSize="xs" color="fg.muted" truncate>
                    {snapshot.requested_by}
                  </Text>
                </Table.Cell>
                <Table.Cell maxW="280px" truncate>
                  {snapshot.payload_hash}
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

function ModelGovernance() {
  const [cursor, setCursor] = useState("")
  const queryClient = useQueryClient()

  const catalogQuery = useQuery({
    queryFn: computeJobsService.listModelCatalog,
    queryKey: ["model-governance", "catalog"],
  })
  const snapshotQuery = useQuery({
    queryFn: () =>
      computeJobsService.listModelCatalogSnapshots({
        catalogId: "default",
        cursor: cursor || undefined,
        limit: 20,
      }),
    queryKey: ["model-governance", "snapshots", cursor],
  })

  const catalogSummary = useMemo(
    () => metricSummary(catalogQuery.data),
    [catalogQuery.data],
  )
  const snapshotItems = snapshotQuery.data?.items ?? []
  const error = catalogQuery.error || snapshotQuery.error

  return (
    <Container maxW="7xl" py={8}>
      <Stack gap={6}>
        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
          <Box>
            <Heading size="lg">Model governance</Heading>
            <Text mt={1} color="fg.muted">
              Read-only catalog, parameter set, benchmark case, and persisted
              snapshot history.
            </Text>
          </Box>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["model-governance"] })
            }}
          >
            <FiRefreshCw />
            Refresh
          </Button>
        </Flex>

        {error ? (
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text color="red.600" fontSize="sm">
              {formatError(error)}
            </Text>
          </Box>
        ) : null}

        <Grid
          templateColumns={{
            base: "repeat(2, minmax(0, 1fr))",
            md: "repeat(6, minmax(0, 1fr))",
          }}
          gap={3}
        >
          <MetricTile label="Catalog" value="default" />
          <MetricTile label="Models" value={catalogSummary.models} />
          <MetricTile label="Versions" value={catalogSummary.versions} />
          <MetricTile
            label="Parameter templates"
            value={catalogSummary.parameterTemplates}
          />
          <MetricTile
            label="Benchmark cases"
            value={catalogSummary.benchmarkCases}
          />
          <MetricTile
            label="Persisted snapshots"
            value={snapshotQuery.data?.total_estimate}
          />
        </Grid>

        <CatalogVersionTable
          catalog={catalogQuery.data}
          isFetching={catalogQuery.isFetching}
        />

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={3}>
            <Box>
              <Heading size="md">Catalog snapshots</Heading>
              <Text fontSize="sm" color="fg.muted">
                Persisted history only; built-in fallback catalogs are not
                listed as stored snapshots.
              </Text>
            </Box>
            <HStack>
              <Button
                size="sm"
                variant="outline"
                disabled={!cursor}
                onClick={() => setCursor("")}
              >
                First page
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!snapshotQuery.data?.next_cursor}
                onClick={() => {
                  setCursor(snapshotQuery.data?.next_cursor ?? "")
                }}
              >
                Next page
                <FiChevronRight />
              </Button>
            </HStack>
          </Flex>
          <SnapshotTable
            items={snapshotItems}
            isFetching={snapshotQuery.isFetching}
          />
        </Box>
      </Stack>
    </Container>
  )
}
