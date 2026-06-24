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
import { FiArchive, FiRefreshCw, FiSearch } from "react-icons/fi"

import {
  computeLifecycleHealthQueryOptions,
  computeLifecycleMetricsQueryOptions,
  computeLifecycleQueryKeys,
  sweepArtifactRetentionMutationOptions,
} from "@/features/lifecycle/queries"
import type {
  ArtifactRetentionAction,
  ArtifactRetentionSweepReport,
} from "@/shared/api/computeTypes"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/_layout/compute-lifecycle")({
  component: ComputeLifecycle,
})

const zhText: Record<string, string> = {
  Action: "操作",
  "API up": "API 在线",
  Archive: "归档",
  "Archive blockers": "归档阻塞",
  Archived: "已归档",
  Artifact: "产物",
  Artifacts: "产物",
  "Artifact retention": "产物保留",
  "Apply retention": "执行保留策略",
  Checked: "已检查",
  "Compute lifecycle": "计算生命周期",
  Deleted: "已删除",
  "Dry run": "试运行",
  Generated: "生成时间",
  "Health, metrics, and artifact retention controls.":
    "健康状态、指标和产物保留控制。",
  Job: "任务",
  "Latest retention report": "最新保留报告",
  "No retention candidates in the latest report.":
    "最新报告中没有保留策略候选项。",
  Policy: "策略",
  Queued: "排队中",
  "Queued jobs": "排队任务",
  Reason: "原因",
  Refresh: "刷新",
  "Retention candidate limit": "保留候选数量上限",
  "Retention candidates": "保留候选",
  Running: "运行中",
  "Running jobs": "运行任务",
  Skipped: "已跳过",
  Workers: "Worker",
  "Would archive": "将归档",
  "Would delete": "将删除",
}

const textFor = (language: string, text: string) =>
  language === "zh" ? (zhText[text] ?? text) : text

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
    case "archived":
      return "green"
    case "would_archive":
      return "blue"
    default:
      return "gray"
  }
}

function RetentionReportTable({
  items,
  t,
}: {
  items: ArtifactRetentionAction[]
  t: (text: string) => string
}) {
  if (items.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        {t("No retention candidates in the latest report.")}
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{t("Artifact")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Job")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Policy")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Action")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Archive")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Reason")}</Table.ColumnHeader>
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
              <Table.Cell maxW="220px" truncate>
                {item.archive_object_key ?? item.archive_provider ?? "N/A"}
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
  const { language } = useI18n()
  const t = (text: string) => textFor(language, text)
  const queryClient = useQueryClient()
  const [retentionLimit, setRetentionLimit] = useState("100")
  const [retentionReport, setRetentionReport] =
    useState<ArtifactRetentionSweepReport | null>(null)

  const healthQuery = useQuery(computeLifecycleHealthQueryOptions())
  const metricsQuery = useQuery(computeLifecycleMetricsQueryOptions())

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
  const wouldArchive = reportItems.filter(
    (item) => item.action === "would_archive",
  ).length
  const archiveBlocked = reportItems.filter(
    (item) => item.reason === "archive_executor_not_configured",
  ).length
  const retentionEnabled = Boolean(
    retentionReport?.dry_run && wouldDelete + wouldArchive > 0,
  )

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: computeLifecycleQueryKeys.root })
  }

  const dryRunMutation = useMutation({
    ...sweepArtifactRetentionMutationOptions(() => ({
        dry_run: true,
        limit: sweepLimit,
      })),
    onSuccess: (report) => {
      setRetentionReport(report)
      refreshAll()
    },
  })

  const deleteMutation = useMutation({
    ...sweepArtifactRetentionMutationOptions(() => ({
        dry_run: false,
        limit: sweepLimit,
      })),
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
            <Heading size="lg">{t("Compute lifecycle")}</Heading>
            <Text color="fg.muted" fontSize="sm">
              {t("Health, metrics, and artifact retention controls.")}
            </Text>
          </Box>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={healthQuery.isFetching || metricsQuery.isFetching}
          >
            <FiRefreshCw />
            {t("Refresh")}
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
            label={t("API up")}
            value={metrics.apiUp}
            tone={metrics.apiUp === 1 ? "green" : "red"}
          />
          <MetricTile
            label={t("Queued jobs")}
            value={metrics.jobsByStatus.queued}
            tone={(metrics.jobsByStatus.queued ?? 0) > 0 ? "orange" : "gray"}
          />
          <MetricTile
            label={t("Running jobs")}
            value={metrics.jobsByStatus.running}
            tone={(metrics.jobsByStatus.running ?? 0) > 0 ? "blue" : "gray"}
          />
          <MetricTile
            label={t("Workers")}
            value={metrics.workersRegistered}
            tone={(metrics.workersRegistered ?? 0) > 0 ? "green" : "orange"}
          />
          <MetricTile label={t("Artifacts")} value={metrics.artifactsTotal} />
          <MetricTile
            label={t("Retention candidates")}
            value={metrics.retentionCandidates}
            tone={(metrics.retentionCandidates ?? 0) > 0 ? "orange" : "gray"}
          />
        </Grid>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Flex justify="space-between" align="center" gap={3} wrap="wrap">
            <Heading size="md">{t("Artifact retention")}</Heading>
            <HStack wrap="wrap">
              <Input
                aria-label={t("Retention candidate limit")}
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
                {t("Dry run")}
              </Button>
              <Button
                size="sm"
                colorPalette="red"
                variant="outline"
                disabled={pending || !retentionEnabled}
                onClick={() => deleteMutation.mutate()}
              >
                <FiArchive />
                {t("Apply retention")}
              </Button>
            </HStack>
          </Flex>

          <Grid
            templateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              xl: "repeat(7, minmax(0, 1fr))",
            }}
            gap={3}
            my={4}
          >
            <MetricTile label={t("Checked")} value={retentionReport?.checked} />
            <MetricTile label={t("Deleted")} value={retentionReport?.deleted} />
            <MetricTile label={t("Archived")} value={retentionReport?.archived} />
            <MetricTile label={t("Skipped")} value={retentionReport?.skipped} />
            <MetricTile label={t("Would delete")} value={wouldDelete} />
            <MetricTile label={t("Would archive")} value={wouldArchive} />
            <MetricTile label={t("Archive blockers")} value={archiveBlocked} />
            <MetricTile
              label={t("Generated")}
              value={formatDateTime(retentionReport?.generated_at)}
            />
          </Grid>

          <RetentionReportTable items={reportItems} t={t} />
        </Box>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Heading size="md" mb={3}>
            {t("Latest retention report")}
          </Heading>
          <JsonBlock value={retentionReport ?? { status: "not_run" }} />
        </Box>
      </Stack>
    </Container>
  )
}

export default ComputeLifecycle
