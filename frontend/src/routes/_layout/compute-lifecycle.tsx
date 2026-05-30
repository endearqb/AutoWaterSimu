import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Input,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi"

import type {
  ArtifactRetentionAction,
  ArtifactRetentionSweepReport,
} from "@/client/compute"
import { computeJobsService } from "@/services/computeJobsService"

export const Route = createFileRoute("/_layout/compute-lifecycle")({
  component: ComputeLifecycle,
})

interface ComputeMetrics {
  apiUp?: number
  artifactsTotal?: number
  jobsByStatus: Record<string, number>
  retentionCandidates?: number
  workersRegistered?: number
}

const emptyMetrics: ComputeMetrics = {
  jobsByStatus: {},
}

const parseMetricNumber = (value: string) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseComputeMetrics = (metricsText: string): ComputeMetrics => {
  const metrics: ComputeMetrics = { jobsByStatus: {} }
  for (const line of metricsText.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const jobMatch = trimmed.match(
      /^autowatersimu_compute_jobs_total\{status="([^"]+)"\}\s+(.+)$/,
    )
    if (jobMatch) {
      const value = parseMetricNumber(jobMatch[2])
      if (value !== undefined) {
        metrics.jobsByStatus[jobMatch[1]] = value
      }
      continue
    }

    const [name, rawValue] = trimmed.split(/\s+/, 2)
    const value = parseMetricNumber(rawValue ?? "")
    if (value === undefined) {
      continue
    }
    if (name === "autowatersimu_compute_api_up") {
      metrics.apiUp = value
    }
    if (name === "autowatersimu_compute_workers_registered_total") {
      metrics.workersRegistered = value
    }
    if (name === "autowatersimu_compute_artifacts_total") {
      metrics.artifactsTotal = value
    }
    if (name === "autowatersimu_compute_artifact_retention_candidates_total") {
      metrics.retentionCandidates = value
    }
  }
  return metrics
}

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

const formatJson = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "N/A"
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
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

function MetricTile({
  label,
  value,
  tone = "gray",
}: {
  label: string
  value: string | number | undefined
  tone?: "blue" | "green" | "gray" | "orange" | "red"
}) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4} minH="96px">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <HStack mt={2} justify="space-between" align="center">
        <Text fontSize="2xl" fontWeight="semibold">
          {value ?? "N/A"}
        </Text>
        <Badge colorPalette={tone}>{tone}</Badge>
      </HStack>
    </Box>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <Textarea
      value={formatJson(value)}
      readOnly
      minH="160px"
      fontFamily="mono"
      fontSize="xs"
      resize="vertical"
    />
  )
}

function actionPalette(action: ArtifactRetentionAction["action"]) {
  switch (action) {
    case "deleted":
      return "red"
    case "would_delete":
      return "orange"
    default:
      return "gray"
  }
}

function RetentionReportTable({
  items,
}: {
  items: ArtifactRetentionAction[]
}) {
  if (items.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        No retention candidates in the latest report.
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Artifact</Table.ColumnHeader>
            <Table.ColumnHeader>Job</Table.ColumnHeader>
            <Table.ColumnHeader>Policy</Table.ColumnHeader>
            <Table.ColumnHeader>Action</Table.ColumnHeader>
            <Table.ColumnHeader>Reason</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item) => (
            <Table.Row key={`${item.artifact_id}-${item.action}`}>
              <Table.Cell maxW="220px" truncate>
                {item.artifact_id}
              </Table.Cell>
              <Table.Cell maxW="180px" truncate>
                {item.job_id}
              </Table.Cell>
              <Table.Cell>{item.retention_policy}</Table.Cell>
              <Table.Cell>
                <Badge colorPalette={actionPalette(item.action)}>
                  {item.action}
                </Badge>
              </Table.Cell>
              <Table.Cell maxW="260px" truncate>
                {item.reason ?? "N/A"}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

function ComputeLifecycle() {
  const queryClient = useQueryClient()
  const [retentionLimit, setRetentionLimit] = useState("100")
  const [retentionReport, setRetentionReport] =
    useState<ArtifactRetentionSweepReport | null>(null)

  const healthQuery = useQuery({
    queryKey: ["compute-lifecycle", "health"],
    queryFn: () => computeJobsService.checkHealth(),
  })
  const metricsQuery = useQuery({
    queryKey: ["compute-lifecycle", "metrics"],
    queryFn: () => computeJobsService.getMetrics(),
  })

  const metrics = useMemo(
    () =>
      metricsQuery.data ? parseComputeMetrics(metricsQuery.data) : emptyMetrics,
    [metricsQuery.data],
  )

  const sweepLimit = Math.max(1, Number.parseInt(retentionLimit, 10) || 100)
  const reportItems = retentionReport?.items ?? []
  const wouldDelete = reportItems.filter(
    (item) => item.action === "would_delete",
  ).length
  const archiveBlocked = reportItems.filter(
    (item) => item.reason === "archive_executor_not_configured",
  ).length
  const deleteEnabled = Boolean(retentionReport?.dry_run && wouldDelete > 0)

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["compute-lifecycle"] })
  }

  const dryRunMutation = useMutation({
    mutationFn: () =>
      computeJobsService.sweepArtifactRetention({
        dry_run: true,
        limit: sweepLimit,
      }),
    onSuccess: (report) => {
      setRetentionReport(report)
      refreshAll()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      computeJobsService.sweepArtifactRetention({
        dry_run: false,
        limit: sweepLimit,
      }),
    onSuccess: (report) => {
      setRetentionReport(report)
      refreshAll()
    },
  })

  const pending = dryRunMutation.isPending || deleteMutation.isPending
  const error =
    healthQuery.error ||
    metricsQuery.error ||
    dryRunMutation.error ||
    deleteMutation.error

  return (
    <Container maxW="full">
      <Stack gap={6}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <Box>
            <Heading size="lg">Compute lifecycle</Heading>
            <Text color="fg.muted" fontSize="sm">
              Health, metrics, and artifact retention controls.
            </Text>
          </Box>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={healthQuery.isFetching || metricsQuery.isFetching}
          >
            <FiRefreshCw />
            Refresh
          </Button>
        </Flex>

        {error && (
          <Box borderWidth="1px" borderRadius="md" p={4} borderColor="red.300">
            <Text color="red.600">{formatError(error)}</Text>
          </Box>
        )}

        <Grid
          templateColumns={{
            base: "repeat(1, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            xl: "repeat(6, minmax(0, 1fr))",
          }}
          gap={4}
        >
          <MetricTile
            label="API up"
            value={metrics.apiUp}
            tone={metrics.apiUp === 1 ? "green" : "red"}
          />
          <MetricTile
            label="Queued jobs"
            value={metrics.jobsByStatus.queued}
            tone={(metrics.jobsByStatus.queued ?? 0) > 0 ? "orange" : "gray"}
          />
          <MetricTile
            label="Running jobs"
            value={metrics.jobsByStatus.running}
            tone={(metrics.jobsByStatus.running ?? 0) > 0 ? "blue" : "gray"}
          />
          <MetricTile
            label="Workers"
            value={metrics.workersRegistered}
            tone={(metrics.workersRegistered ?? 0) > 0 ? "green" : "orange"}
          />
          <MetricTile label="Artifacts" value={metrics.artifactsTotal} />
          <MetricTile
            label="Retention candidates"
            value={metrics.retentionCandidates}
            tone={(metrics.retentionCandidates ?? 0) > 0 ? "orange" : "gray"}
          />
        </Grid>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <Heading size="md">Artifact retention</Heading>
            <HStack wrap="wrap">
              <Input
                aria-label="Retention candidate limit"
                type="number"
                min={1}
                max={1000}
                value={retentionLimit}
                onChange={(event) => setRetentionLimit(event.target.value)}
                size="sm"
                w="100px"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => dryRunMutation.mutate()}
              >
                <FiSearch />
                Dry run
              </Button>
              <Button
                size="sm"
                colorPalette="red"
                variant="outline"
                disabled={pending || !deleteEnabled}
                onClick={() => deleteMutation.mutate()}
              >
                <FiTrash2 />
                Delete eligible TTL
              </Button>
            </HStack>
          </Flex>

          <Grid
            templateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              md: "repeat(6, minmax(0, 1fr))",
            }}
            gap={3}
            my={4}
          >
            <MetricTile label="Checked" value={retentionReport?.checked} />
            <MetricTile label="Deleted" value={retentionReport?.deleted} />
            <MetricTile label="Skipped" value={retentionReport?.skipped} />
            <MetricTile label="Would delete" value={wouldDelete} />
            <MetricTile label="Archive blockers" value={archiveBlocked} />
            <MetricTile
              label="Generated"
              value={formatDateTime(retentionReport?.generated_at)}
            />
          </Grid>

          <RetentionReportTable items={reportItems} />
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="md" mb={3}>
            Latest retention report
          </Heading>
          <JsonBlock value={retentionReport ?? { status: "not_run" }} />
        </Box>
      </Stack>
    </Container>
  )
}

export default ComputeLifecycle
