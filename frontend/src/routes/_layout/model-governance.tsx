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

import {
  defaultParameterSetPromotionPlansQueryOptions,
  modelCatalogQueryOptions,
  modelCatalogSnapshotsQueryOptions,
  modelGovernanceQueryKeys,
  modelGovernanceVersionKey,
} from "@/features/model-governance/queries"
import type {
  ModelCatalog,
  ModelCatalogRecord,
  ModelParameterSetPromotionPlan,
} from "@/shared/api/computeTypes"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/_layout/model-governance")({
  component: ModelGovernance,
})

const zhText: Record<string, string> = {
  Approved: "已批准",
  Benchmarks: "基准案例",
  Catalog: "目录",
  "Catalog snapshots": "目录快照",
  Created: "创建时间",
  "Current model catalog": "当前模型目录",
  "Default set": "默认参数集",
  "Default status": "默认状态",
  "First page": "第一页",
  Loading: "加载中",
  Model: "模型",
  "Model governance": "模型治理",
  Models: "模型",
  "Next page": "下一页",
  "No catalog models are available.": "暂无可用模型目录。",
  "No persisted catalog snapshots are available.": "暂无持久化目录快照。",
  "Loading persisted catalog snapshots.": "正在加载持久化目录快照。",
  "Parameter hash": "参数哈希",
  "Parameter templates": "参数模板",
  "Payload hash": "Payload 哈希",
  "Persisted snapshots": "持久化快照",
  Promotion: "晋级状态",
  "Promotable sets": "可晋级参数集",
  Ready: "就绪",
  "Read-only catalog, parameter set, benchmark case, and persisted snapshot history.":
    "只读展示模型目录、参数集、基准案例与持久化快照历史。",
  Refresh: "刷新",
  "Set status": "参数集状态",
  Source: "来源",
  Status: "状态",
  Version: "版本",
  Versions: "版本",
  "Persisted history only; built-in fallback catalogs are not listed as stored snapshots.":
    "仅显示持久化历史；内置回退目录不会列为已存储快照。",
  templates: "个模板",
  versions: "个版本",
}

const textFor = (language: string, text: string) =>
  language === "zh" ? (zhText[text] ?? text) : text

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

function promotionStatusPalette(
  plan: ModelParameterSetPromotionPlan | undefined,
) {
  if (!plan) {
    return "gray"
  }
  if (plan.can_promote_to_approved || plan.current_status === "approved") {
    return "green"
  }
  if (plan.benchmark_cases_passed > 0) {
    return "orange"
  }
  return "red"
}

function promotionStatusLabel(
  plan: ModelParameterSetPromotionPlan | undefined,
  hasDefaultSet: boolean,
  isFetching: boolean,
) {
  if (!hasDefaultSet) {
    return "N/A"
  }
  if (!plan) {
    return isFetching ? "Loading" : "N/A"
  }
  if (plan.can_promote_to_approved) {
    return "Ready"
  }
  if (plan.current_status === "approved") {
    return "Approved"
  }
  return `${plan.benchmark_cases_passed}/${plan.benchmark_cases_checked}`
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
  promotionPlans,
  promotionPlansFetching,
  t,
}: {
  catalog: ModelCatalog | undefined
  isFetching: boolean
  promotionPlans: Record<string, ModelParameterSetPromotionPlan>
  promotionPlansFetching: boolean
  t: (text: string) => string
}) {
  const rows =
    catalog?.models.flatMap((model) =>
      model.versions.map((version) => ({
        benchmarkCount: version.benchmark_cases.length,
        displayName: model.display_name,
        modelKey: model.model_key,
        parameterHash: version.default_parameter_set?.parameter_hash ?? "N/A",
        parameterSet: version.default_parameter_set?.parameter_set_id ?? "N/A",
        parameterStatus: version.default_parameter_set?.status ?? "N/A",
        promotionPlan:
          promotionPlans[
            modelGovernanceVersionKey(model.model_key, version.model_version)
          ],
        status: version.status,
        templateCount: version.parameter_templates.length,
        version: version.model_version,
      })),
    ) ?? []

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={3}>
        <Heading size="md">{t("Current model catalog")}</Heading>
        <Text fontSize="sm" color="fg.muted">
          {isFetching ? t("Loading") : `${rows.length} ${t("versions")}`}
        </Text>
      </Flex>

      {rows.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          {t("No catalog models are available.")}
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>{t("Model")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Version")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Status")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Default set")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Set status")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Benchmarks")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Promotion")}</Table.ColumnHeader>
                <Table.ColumnHeader>{t("Parameter hash")}</Table.ColumnHeader>
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
                      {row.templateCount} {t("templates")}
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
                  <Table.Cell>
                    <Badge
                      colorPalette={promotionStatusPalette(row.promotionPlan)}
                    >
                      {promotionStatusLabel(
                        row.promotionPlan,
                        row.parameterSet !== "N/A",
                        promotionPlansFetching,
                      )}
                    </Badge>
                    {row.promotionPlan?.blocking_reasons[0] ? (
                      <Text fontSize="xs" color="fg.muted" truncate>
                        {row.promotionPlan.blocking_reasons[0]}
                      </Text>
                    ) : null}
                  </Table.Cell>
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
  t,
}: {
  items: ModelCatalogRecord[]
  isFetching: boolean
  t: (text: string) => string
}) {
  if (items.length === 0) {
    return (
      <Text color="fg.muted" fontSize="sm">
        {isFetching
          ? t("Loading persisted catalog snapshots.")
          : t("No persisted catalog snapshots are available.")}
      </Text>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>{t("Created")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Catalog")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Models")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Versions")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Default status")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Source")}</Table.ColumnHeader>
            <Table.ColumnHeader>{t("Payload hash")}</Table.ColumnHeader>
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
  const { language } = useI18n()
  const t = (text: string) => textFor(language, text)
  const [cursor, setCursor] = useState("")
  const queryClient = useQueryClient()

  const catalogQuery = useQuery(
    modelCatalogQueryOptions(modelGovernanceQueryKeys.catalog),
  )
  const snapshotQuery = useQuery(modelCatalogSnapshotsQueryOptions(cursor))

  const promotionTargets = useMemo(
    () =>
      catalogQuery.data?.models.flatMap((model) =>
        model.versions
          .filter((version) => version.default_parameter_set)
          .map((version) => ({
            modelKey: model.model_key,
            modelVersion: version.model_version,
          })),
      ) ?? [],
    [catalogQuery.data],
  )
  const promotionPlansQuery = useQuery(
    defaultParameterSetPromotionPlansQueryOptions(promotionTargets),
  )

  const catalogSummary = useMemo(
    () => metricSummary(catalogQuery.data),
    [catalogQuery.data],
  )
  const promotionPlans = promotionPlansQuery.data ?? {}
  const promotableSets = Object.values(promotionPlans).filter(
    (plan) => plan.can_promote_to_approved,
  ).length
  const snapshotItems = snapshotQuery.data?.items ?? []
  const error =
    catalogQuery.error || snapshotQuery.error || promotionPlansQuery.error

  return (
    <Container maxW="full" py={8}>
      <Stack gap={6}>
        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
          <Box>
            <Heading size="lg">{t("Model governance")}</Heading>
            <Text mt={1} color="fg.muted">
              {t(
                "Read-only catalog, parameter set, benchmark case, and persisted snapshot history.",
              )}
            </Text>
          </Box>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: modelGovernanceQueryKeys.root,
              })
            }}
          >
            <FiRefreshCw />
            {t("Refresh")}
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
            md: "repeat(4, minmax(0, 1fr))",
            xl: "repeat(7, minmax(0, 1fr))",
          }}
          gap={3}
        >
          <MetricTile label={t("Catalog")} value="default" />
          <MetricTile label={t("Models")} value={catalogSummary.models} />
          <MetricTile label={t("Versions")} value={catalogSummary.versions} />
          <MetricTile
            label={t("Parameter templates")}
            value={catalogSummary.parameterTemplates}
          />
          <MetricTile
            label={t("Benchmark cases")}
            value={catalogSummary.benchmarkCases}
          />
          <MetricTile
            label={t("Persisted snapshots")}
            value={snapshotQuery.data?.total_estimate}
          />
          <MetricTile label={t("Promotable sets")} value={promotableSets} />
        </Grid>

        <CatalogVersionTable
          catalog={catalogQuery.data}
          isFetching={catalogQuery.isFetching}
          promotionPlans={promotionPlans}
          promotionPlansFetching={promotionPlansQuery.isFetching}
          t={t}
        />

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Flex
            justify="space-between"
            align="center"
            gap={3}
            wrap="wrap"
            mb={3}
          >
            <Box>
              <Heading size="md">{t("Catalog snapshots")}</Heading>
              <Text fontSize="sm" color="fg.muted">
                {t(
                  "Persisted history only; built-in fallback catalogs are not listed as stored snapshots.",
                )}
              </Text>
            </Box>
            <HStack>
              <Button
                size="sm"
                variant="outline"
                disabled={!cursor}
                onClick={() => setCursor("")}
              >
                {t("First page")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!snapshotQuery.data?.next_cursor}
                onClick={() => {
                  setCursor(snapshotQuery.data?.next_cursor ?? "")
                }}
              >
                {t("Next page")}
                <FiChevronRight />
              </Button>
            </HStack>
          </Flex>
          <SnapshotTable
            items={snapshotItems}
            isFetching={snapshotQuery.isFetching}
            t={t}
          />
        </Box>
      </Stack>
    </Container>
  )
}
