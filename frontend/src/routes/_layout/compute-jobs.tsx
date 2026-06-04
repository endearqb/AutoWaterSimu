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
import { type KeyboardEvent, useMemo, useState } from "react"
import {
  FiArchive,
  FiDownload,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiXCircle,
} from "react-icons/fi"

import { ContractTransformError } from "@/contracts"
import {
  cancelComputeJobMutationOptions,
  computeHealthQueryOptions,
  computeJobDetailQueryOptions,
  computeJobEventsQueryOptions,
  computeJobProductionReadinessQueryOptions,
  computeJobQueryKeys,
  computeJobResultQueryOptions,
  createDemoJobMutationOptions,
  createJobFromFlowExportMutationOptions,
  getComputeJobsBaseUrl,
  listComputeJobsQueryOptions,
  resolveEvidenceReferenceMutationOptions,
} from "@/features/compute-jobs/queries"
import {
  confirmDraftTextMutationOptions,
  validateContractTextMutationOptions,
} from "@/features/contracts/queries"
import {
  downloadArtifactMutationOptions,
  downloadEvidencePackageMutationOptions,
  sweepArtifactRetentionMutationOptions,
} from "@/features/lifecycle/queries"
import {
  modelCatalogQueryOptions,
  modelGovernanceQueryKeys,
  modelRunsQueryOptions,
} from "@/features/model-governance/queries"
import type {
  ArtifactRecord,
  ArtifactRetentionSweepReport,
  ContractValidationResponse,
  EventRecord,
  EvidenceReferenceResolution,
  JobSnapshot,
  ModelCatalog,
  ModelRun,
  ProductionReadinessReport,
  EvidenceDownloadResult,
} from "@/shared/api/computeTypes"
import useFlowStore from "@/stores/flowStore"

export const Route = createFileRoute("/_layout/compute-jobs")({
  component: ComputeJobs,
})

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const textValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

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
  const record = asRecord(error)
  const body = asRecord(record.body)
  return (
    textValue(body.message) ||
    textValue(body.detail) ||
    textValue(record.message) ||
    "Request failed"
  )
}

const statusPalette = (status: string) => {
  switch (status) {
    case "succeeded":
      return "green"
    case "running":
      return "blue"
    case "failed":
      return "red"
    case "timed_out":
      return "orange"
    case "cancel_requested":
    case "cancelled":
      return "yellow"
    default:
      return "gray"
  }
}

const readinessPalette = (status: string) => {
  switch (status) {
    case "ready_for_external_approval":
      return "green"
    case "blocked":
      return "red"
    default:
      return "gray"
  }
}

const checkPalette = (status: string) => {
  switch (status) {
    case "passed":
      return "green"
    case "warning":
      return "yellow"
    case "failed":
      return "red"
    default:
      return "gray"
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge colorPalette={statusPalette(status)}>{status || "unknown"}</Badge>
  )
}

function JsonBlock({
  value,
  minH = "120px",
}: {
  value: unknown
  minH?: string
}) {
  return (
    <Textarea
      value={formatJson(value)}
      readOnly
      minH={minH}
      fontFamily="mono"
      fontSize="xs"
      resize="vertical"
    />
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | number | boolean | undefined
}) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm" truncate>
        {value === undefined || value === "" ? "N/A" : String(value)}
      </Text>
    </Box>
  )
}

interface ModelRunSearchForm {
  jobId: string
  modelKey: string
  modelVersion: string
}

const emptyModelRunFilters: ModelRunSearchForm = {
  jobId: "",
  modelKey: "",
  modelVersion: "",
}

const modelRunText = (modelRun: ModelRun, key: string) =>
  textValue(asRecord(modelRun)[key]) || "N/A"

const agentDraftSample = {
  schema_version: "agent_scenario_draft.v1",
  draft_id: "draft_material_balance_minimal",
  created_by: "agent:web",
  scenario_summary: "Run the minimal material balance scenario.",
  proposed_request: {
    schema_version: "simulation_request.v1",
    request_id: "sim_req_material_balance_minimal",
  },
  requires_confirmation: true,
}

const simulationRequestSample = {
  schema_version: "simulation_request.v1",
  request_id: "sim_req_material_balance_minimal",
  source_system: "autowatersimu-web",
  requested_by: "user:web",
  job_type: "simulation.material_balance.v1",
  input_ref: {
    simulation_input_id: "si_material_balance_minimal",
  },
  external_refs: {},
}

const constraintDraftSample = {
  schema_version: "constraint_draft.v1",
  constraint_id: "constraint_material_balance_cod_limit",
  created_by: "agent:web",
  scope: "simulation_request",
  target_ref: {
    request_id: "sim_req_material_balance_minimal",
  },
  constraints: [
    {
      constraint_key: "max_effluent_cod",
      description: "Effluent COD should stay below the configured limit.",
      metric: "effluent_cod",
      operator: "<=",
      value: 30,
      unit: "mg/L",
      severity: "warning",
    },
  ],
  requires_confirmation: true,
}

const resultExplanationSample = {
  schema_version: "result_explanation.v1",
  explanation_id: "explanation_material_balance_minimal",
  job_id: "job_material_balance_minimal",
  created_by: "agent:web",
  summary:
    "The material balance smoke run completed and produced auditable evidence references.",
  evidence_refs: [
    "evidence_package:evidence_job_material_balance_minimal",
    "model_run:mr_material_balance_minimal",
  ],
  statements: [
    {
      statement:
        "The run completed without model warnings in the recorded model run.",
      evidence_refs: ["model_run:mr_material_balance_minimal"],
      severity: "info",
      metric: "warning_count",
      value: 0,
    },
  ],
}

const draftConfirmationSample = {
  schema_version: "draft_confirmation.v1",
  confirmation_id: "confirm_draft_material_balance_minimal",
  draft_schema_version: "agent_scenario_draft.v1",
  draft_id: "draft_material_balance_minimal",
  decision: "approved",
  confirmed_by: "user:web",
  confirmed_at: "2026-05-30T00:00:00Z",
  requires_confirmation_acknowledged: true,
  draft: agentDraftSample,
}

const sampleText = (value: unknown) => JSON.stringify(value, null, 2)

function ModelRunsHistoryPanel({
  filters,
  isFetching,
  modelRuns,
  onClear,
  onFiltersChange,
  onSearch,
  onUseSelectedJob,
  selectedJobId,
  totalEstimate,
}: {
  filters: ModelRunSearchForm
  isFetching: boolean
  modelRuns: ModelRun[]
  onClear: () => void
  onFiltersChange: (filters: ModelRunSearchForm) => void
  onSearch: () => void
  onUseSelectedJob: () => void
  selectedJobId: string | null
  totalEstimate: number
}) {
  const searchOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      onSearch()
    }
  }

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Heading size="md">Model run history</Heading>
        <Text fontSize="sm" color="fg.muted">
          {isFetching ? "Loading" : `${modelRuns.length} of ${totalEstimate}`}
        </Text>
      </Flex>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(3, minmax(0, 1fr))",
        }}
        gap={3}
      >
        <Input
          size="sm"
          value={filters.jobId}
          onChange={(event) =>
            onFiltersChange({ ...filters, jobId: event.target.value })
          }
          onKeyDown={searchOnEnter}
          placeholder="Job ID"
        />
        <Input
          size="sm"
          value={filters.modelKey}
          onChange={(event) =>
            onFiltersChange({ ...filters, modelKey: event.target.value })
          }
          onKeyDown={searchOnEnter}
          placeholder="Model key"
        />
        <Input
          size="sm"
          value={filters.modelVersion}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              modelVersion: event.target.value,
            })
          }
          onKeyDown={searchOnEnter}
          placeholder="Model version"
        />
      </Grid>

      <HStack mt={3} wrap="wrap">
        <Button size="sm" colorPalette="blue" onClick={onSearch}>
          <FiSearch />
          Search
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!selectedJobId}
          onClick={onUseSelectedJob}
        >
          Selected job
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </HStack>

      <Box mt={4} overflowX="auto">
        {modelRuns.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            No model runs found.
          </Text>
        ) : (
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Run</Table.ColumnHeader>
                <Table.ColumnHeader>Job</Table.ColumnHeader>
                <Table.ColumnHeader>Model</Table.ColumnHeader>
                <Table.ColumnHeader>Version</Table.ColumnHeader>
                <Table.ColumnHeader>Parameter hash</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {modelRuns.map((modelRun, index) => (
                <Table.Row
                  key={`${modelRunText(modelRun, "model_run_id")}-${index}`}
                >
                  <Table.Cell maxW="220px" truncate>
                    {modelRunText(modelRun, "model_run_id")}
                  </Table.Cell>
                  <Table.Cell maxW="220px" truncate>
                    {modelRunText(modelRun, "job_id")}
                  </Table.Cell>
                  <Table.Cell>{modelRunText(modelRun, "model_key")}</Table.Cell>
                  <Table.Cell>
                    {modelRunText(modelRun, "model_version")}
                  </Table.Cell>
                  <Table.Cell maxW="260px" truncate>
                    {modelRunText(modelRun, "parameter_hash")}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Box>
  )
}

function ModelCatalogPanel({
  catalog,
  isFetching,
}: {
  catalog: ModelCatalog | undefined
  isFetching: boolean
}) {
  const rows =
    catalog?.models.flatMap((model) =>
      model.versions.map((version) => ({
        benchmarkCount: version.benchmark_cases?.length ?? 0,
        displayName: model.display_name,
        modelKey: model.model_key,
        parameterHash: version.default_parameter_set?.parameter_hash ?? "N/A",
        parameterSet: version.default_parameter_set?.parameter_set_id ?? "N/A",
        parameterStatus: version.default_parameter_set?.status ?? "N/A",
        status: version.status,
        templateCount: version.parameter_templates.length,
        version: version.model_version,
      })),
    ) ?? []

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Heading size="md">Model catalog</Heading>
        <Text fontSize="sm" color="fg.muted">
          {isFetching ? "Loading" : `${rows.length} versions`}
        </Text>
      </Flex>

      {rows.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          No models registered.
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
                  <Table.Cell maxW="220px" truncate>
                    {row.displayName}
                    <Text fontSize="xs" color="fg.muted" truncate>
                      {row.modelKey}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{row.version}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette="green">{row.status}</Badge>
                  </Table.Cell>
                  <Table.Cell maxW="220px" truncate>
                    {row.parameterSet}
                    <Text fontSize="xs" color="fg.muted">
                      {row.templateCount} templates
                    </Text>
                  </Table.Cell>
                  <Table.Cell>{row.parameterStatus}</Table.Cell>
                  <Table.Cell>{row.benchmarkCount}</Table.Cell>
                  <Table.Cell maxW="260px" truncate>
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

function ArtifactRetentionPanel({
  deletePending,
  dryRunPending,
  onDelete,
  onDryRun,
  report,
}: {
  deletePending: boolean
  dryRunPending: boolean
  onDelete: () => void
  onDryRun: () => void
  report: ArtifactRetentionSweepReport | null
}) {
  const wouldDelete =
    report?.items.filter((item) => item.action === "would_delete").length ?? 0
  const wouldArchive =
    report?.items.filter((item) => item.action === "would_archive").length ?? 0
  const retentionEnabled = Boolean(
    report?.dry_run && wouldDelete + wouldArchive > 0,
  )

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Heading size="md">Artifact retention</Heading>
        <HStack wrap="wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={dryRunPending}
            onClick={onDryRun}
          >
            <FiSearch />
            Dry run
          </Button>
          <Button
            size="sm"
            colorPalette="red"
            variant="outline"
            disabled={deletePending || !retentionEnabled}
            onClick={onDelete}
          >
            <FiArchive />
            Apply retention
          </Button>
        </HStack>
      </Flex>

      <Grid
        templateColumns={{
          base: "repeat(2, minmax(0, 1fr))",
          md: "repeat(7, minmax(0, 1fr))",
        }}
        gap={3}
        mb={3}
      >
        <Field label="Checked" value={report?.checked} />
        <Field label="Deleted" value={report?.deleted} />
        <Field label="Archived" value={report?.archived} />
        <Field label="Skipped" value={report?.skipped} />
        <Field label="Would delete" value={wouldDelete} />
        <Field label="Would archive" value={wouldArchive} />
        <Field label="Generated" value={formatDateTime(report?.generated_at)} />
      </Grid>

      <JsonBlock value={report ?? { status: "not_run" }} minH="120px" />
    </Box>
  )
}

function ContractValidationPanel({
  draftText,
  confirmPending,
  isPending,
  onDraftChange,
  onLoadAgentDraft,
  onLoadConstraintDraft,
  onLoadDraftConfirmation,
  onLoadResultExplanation,
  onLoadSimulationRequest,
  onConfirmDraft,
  onValidate,
  result,
}: {
  draftText: string
  confirmPending: boolean
  isPending: boolean
  onDraftChange: (value: string) => void
  onLoadAgentDraft: () => void
  onLoadConstraintDraft: () => void
  onLoadDraftConfirmation: () => void
  onLoadResultExplanation: () => void
  onLoadSimulationRequest: () => void
  onConfirmDraft: () => void
  onValidate: () => void
  result: ContractValidationResponse | null
}) {
  const state = result ? (result.valid ? "valid" : "invalid") : "not checked"

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <Heading size="md">Contract validation</Heading>
        <Badge colorPalette={result?.valid ? "green" : result ? "red" : "gray"}>
          {state}
        </Badge>
      </Flex>

      <HStack mb={3} wrap="wrap">
        <Button size="sm" variant="outline" onClick={onLoadAgentDraft}>
          Agent draft
        </Button>
        <Button size="sm" variant="outline" onClick={onLoadSimulationRequest}>
          Simulation request
        </Button>
        <Button size="sm" variant="outline" onClick={onLoadConstraintDraft}>
          Constraint draft
        </Button>
        <Button size="sm" variant="outline" onClick={onLoadResultExplanation}>
          Result explanation
        </Button>
        <Button size="sm" variant="outline" onClick={onLoadDraftConfirmation}>
          Draft confirmation
        </Button>
        <Button
          size="sm"
          colorPalette="blue"
          disabled={isPending}
          onClick={onValidate}
        >
          Validate
        </Button>
        <Button
          size="sm"
          colorPalette="green"
          variant="outline"
          disabled={confirmPending}
          onClick={onConfirmDraft}
        >
          Confirm draft
        </Button>
      </HStack>

      <Textarea
        value={draftText}
        onChange={(event) => onDraftChange(event.target.value)}
        minH="180px"
        fontFamily="mono"
        fontSize="xs"
        resize="vertical"
        aria-label="Contract JSON"
      />

      {result && (
        <Box mt={4}>
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            }}
            gap={3}
            mb={3}
          >
            <Field
              label="Document schema"
              value={result.document_schema_version}
            />
            <Field label="Contract schema" value={result.contract_schema} />
          </Grid>
          {result.errors.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              No validation errors.
            </Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Path</Table.ColumnHeader>
                  <Table.ColumnHeader>Message</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {result.errors.map((issue, index) => (
                  <Table.Row key={`${issue.path}-${index}`}>
                    <Table.Cell maxW="220px" truncate>
                      {issue.path}
                    </Table.Cell>
                    <Table.Cell>{issue.message}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
          {result.warnings.length > 0 && (
            <Box mt={3}>
              <Text fontSize="xs" color="fg.muted">
                Warnings
              </Text>
              <Stack gap={1} mt={1}>
                {result.warnings.map((warning) => (
                  <Text key={warning} fontSize="sm" color="fg.muted">
                    {warning}
                  </Text>
                ))}
              </Stack>
            </Box>
          )}
          {result.confirmation_record && (
            <Box mt={3}>
              <Text fontSize="xs" color="fg.muted">
                Persisted confirmation
              </Text>
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                }}
                gap={3}
                mt={1}
              >
                <Field
                  label="Confirmation ID"
                  value={result.confirmation_record.confirmation_id}
                />
                <Field
                  label="Decision"
                  value={result.confirmation_record.decision}
                />
                <Field
                  label="Confirmed by"
                  value={result.confirmation_record.confirmed_by}
                />
                <Field
                  label="Payload hash"
                  value={result.confirmation_record.payload_hash}
                />
              </Grid>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

function JobsTable({
  jobs,
  selectedJobId,
  onSelect,
}: {
  jobs: JobSnapshot[]
  selectedJobId: string | null
  onSelect: (jobId: string) => void
}) {
  if (jobs.length === 0) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={6}>
        <Text color="fg.muted">No compute jobs found.</Text>
      </Box>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Job</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>Events</Table.ColumnHeader>
            <Table.ColumnHeader>Created</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {jobs.map((snapshot) => (
            <Table.Row
              key={snapshot.job.job_id}
              cursor="pointer"
              bg={
                selectedJobId === snapshot.job.job_id ? "bg.subtle" : undefined
              }
              onClick={() => onSelect(snapshot.job.job_id)}
            >
              <Table.Cell maxW="220px" truncate>
                {snapshot.job.job_id}
              </Table.Cell>
              <Table.Cell>
                <StatusBadge status={snapshot.job.status} />
              </Table.Cell>
              <Table.Cell maxW="220px" truncate>
                {snapshot.job.job_type}
              </Table.Cell>
              <Table.Cell>{snapshot.event_count}</Table.Cell>
              <Table.Cell>{formatDateTime(snapshot.job.created_at)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

function JobDetail({
  snapshot,
  result,
  productionReadiness,
  productionReadinessLoading,
  evidenceDownload,
  evidenceRef,
  evidenceResolution,
  onCancel,
  cancelPending,
  onDownload,
  downloading,
  onDownloadEvidence,
  onEvidenceRefChange,
  onResolveEvidenceRef,
  evidenceDownloading,
  evidenceResolving,
}: {
  snapshot: JobSnapshot | undefined
  result: unknown
  productionReadiness: ProductionReadinessReport | undefined
  productionReadinessLoading: boolean
  evidenceDownload: EvidenceDownloadResult | null
  evidenceRef: string
  evidenceResolution: EvidenceReferenceResolution | null
  onCancel: () => void
  cancelPending: boolean
  onDownload: (artifact: ArtifactRecord) => void
  downloading: boolean
  onDownloadEvidence: () => void
  onEvidenceRefChange: (value: string) => void
  onResolveEvidenceRef: () => void
  evidenceDownloading: boolean
  evidenceResolving: boolean
}) {
  if (!snapshot) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Text color="fg.muted">Select a job to inspect details.</Text>
      </Box>
    )
  }

  const job = snapshot.job
  const artifacts = snapshot.artifacts ?? []
  const resultRecord = asRecord(result)
  const resultSummary = resultRecord.summary ?? job.summary
  const modelRuns = Array.isArray(resultRecord.model_runs)
    ? resultRecord.model_runs
    : []
  const errorText =
    [job.error_code, job.error_message].filter(Boolean).join(": ") || undefined
  const resolveRefOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && evidenceRef.trim()) {
      onResolveEvidenceRef()
    }
  }

  return (
    <Stack gap={4}>
      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Flex justify="space-between" gap={3} align="flex-start" wrap="wrap">
          <Stack gap={1}>
            <Heading size="md">Job detail</Heading>
            <Text fontSize="sm" color="fg.muted" truncate maxW="560px">
              {job.job_id}
            </Text>
          </Stack>
          <HStack>
            <StatusBadge status={job.status} />
            <Button
              size="sm"
              variant="outline"
              disabled={evidenceDownloading || !job.result_hash}
              onClick={onDownloadEvidence}
            >
              <FiDownload />
              Evidence
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="red"
              disabled={cancelPending}
              onClick={onCancel}
            >
              <FiXCircle />
              Cancel
            </Button>
          </HStack>
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          }}
          gap={3}
          mt={4}
        >
          <Field label="Job type" value={job.job_type} />
          <Field label="Attempt" value={job.attempt} />
          <Field label="Payload hash" value={job.payload_hash} />
          <Field label="Result hash" value={job.result_hash} />
          <Field label="Evidence file" value={evidenceDownload?.filename} />
          <Field label="Evidence checksum" value={evidenceDownload?.checksum} />
          <Field label="Worker" value={String(job.worker_id ?? "")} />
          <Field label="Queued" value={formatDateTime(job.queued_at)} />
          <Field label="Started" value={formatDateTime(job.started_at)} />
          <Field label="Finished" value={formatDateTime(job.finished_at)} />
        </Grid>

        {errorText && (
          <Box mt={4} borderWidth="1px" borderRadius="md" p={3} color="red.fg">
            <Text fontSize="sm">{errorText}</Text>
          </Box>
        )}
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={3}>
          Result summary
        </Heading>
        <JsonBlock value={resultSummary} />
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
          <Heading size="sm">Production readiness</Heading>
          <Badge
            colorPalette={readinessPalette(
              productionReadiness?.readiness_status ?? "",
            )}
          >
            {productionReadinessLoading
              ? "Loading"
              : (productionReadiness?.readiness_status ?? "N/A")}
          </Badge>
        </Flex>

        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
          }}
          gap={3}
          mb={3}
        >
          <Field
            label="Production ready"
            value={
              productionReadiness
                ? productionReadiness.production_ready
                  ? "yes"
                  : "no"
                : undefined
            }
          />
          <Field
            label="External approval"
            value={
              productionReadiness
                ? productionReadiness.external_approval_required
                  ? "required"
                  : "not required"
                : undefined
            }
          />
          <Field
            label="Auto publish"
            value={
              productionReadiness
                ? productionReadiness.auto_publish_allowed
                  ? "allowed"
                  : "blocked"
                : undefined
            }
          />
          <Field
            label="Evidence package"
            value={productionReadiness?.evidence_package_id}
          />
          <Field
            label="Blocking reasons"
            value={productionReadiness?.blocking_reasons.join(", ")}
          />
          <Field
            label="Warnings"
            value={productionReadiness?.warnings.join(", ")}
          />
        </Grid>

        {productionReadiness ? (
          <Stack gap={3}>
            <Grid
              templateColumns={{
                base: "repeat(2, minmax(0, 1fr))",
                md: "repeat(6, minmax(0, 1fr))",
              }}
              gap={3}
            >
              <Field
                label="Risk total"
                value={productionReadiness.risk_findings_summary.total}
              />
              {Object.entries(
                productionReadiness.risk_findings_summary.by_severity,
              ).map(([severity, count]) => (
                <Field key={severity} label={severity} value={count} />
              ))}
            </Grid>

            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Check</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Message</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {productionReadiness.checks.map((check) => (
                  <Table.Row key={check.check_id}>
                    <Table.Cell maxW="220px" truncate>
                      {check.check_id}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={checkPalette(check.status)}>
                        {check.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{check.message}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Stack>
        ) : (
          <Text color="fg.muted" fontSize="sm">
            {job.result_hash ? "Loading readiness report." : "N/A"}
          </Text>
        )}
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
          <Heading size="sm">Evidence ref lookup</Heading>
          {evidenceResolution && (
            <Badge colorPalette={evidenceResolution.resolved ? "green" : "red"}>
              {evidenceResolution.ref_type || "ref"}
            </Badge>
          )}
        </Flex>
        <HStack gap={2} align="stretch">
          <Input
            size="sm"
            value={evidenceRef}
            onChange={(event) => onEvidenceRefChange(event.target.value)}
            onKeyDown={resolveRefOnEnter}
            placeholder="model_run:..."
          />
          <Button
            size="sm"
            variant="outline"
            disabled={
              evidenceResolving || !evidenceRef.trim() || !job.result_hash
            }
            onClick={onResolveEvidenceRef}
          >
            <FiSearch />
            Resolve
          </Button>
        </HStack>
        {evidenceResolution && (
          <Box mt={3}>
            <Grid
              templateColumns={{
                base: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              }}
              gap={3}
              mb={3}
            >
              <Field
                label="Reference"
                value={evidenceResolution.evidence_ref}
              />
              <Field label="Reference ID" value={evidenceResolution.ref_id} />
              <Field
                label="Resolved"
                value={evidenceResolution.resolved ? "yes" : "no"}
              />
            </Grid>
            <JsonBlock
              value={evidenceResolution.payload ?? evidenceResolution}
              minH="120px"
            />
          </Box>
        )}
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={3}>
          Model runs
        </Heading>
        <JsonBlock value={modelRuns} minH="96px" />
      </Box>

      <Box borderWidth="1px" borderRadius="md" p={4}>
        <Heading size="sm" mb={3}>
          Artifacts
        </Heading>
        {artifacts.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            No artifacts recorded.
          </Text>
        ) : (
          <Stack gap={3}>
            {artifacts.map((artifact) => (
              <Flex
                key={artifact.artifact_id}
                justify="space-between"
                align="center"
                gap={3}
                wrap="wrap"
              >
                <Box minW={0}>
                  <Text fontSize="sm" truncate>
                    {artifact.artifact_id}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" truncate>
                    {artifact.object_key}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloading}
                  onClick={() => onDownload(artifact)}
                >
                  <FiDownload />
                  Download
                </Button>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

function EventsPanel({ events }: { events: EventRecord[] }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Heading size="sm" mb={3}>
        Events
      </Heading>
      {events.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          No events loaded.
        </Text>
      ) : (
        <Stack gap={3}>
          {events.map((event, index) => (
            <Box
              key={String(event.id ?? `${event.event_type}-${index}`)}
              borderWidth="1px"
              borderRadius="md"
              p={3}
            >
              <Flex justify="space-between" gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="medium">
                  {String(event.event_type ?? "event")}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {formatDateTime(event.created_at)}
                </Text>
              </Flex>
              <Box mt={2}>
                <JsonBlock value={event.event} minH="80px" />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function ComputeJobs() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [transformIssues, setTransformIssues] = useState<
    ContractTransformError["details"]
  >([])
  const [evidenceDownload, setEvidenceDownload] =
    useState<EvidenceDownloadResult | null>(null)
  const [evidenceRefText, setEvidenceRefText] = useState("")
  const [evidenceResolution, setEvidenceResolution] =
    useState<EvidenceReferenceResolution | null>(null)
  const [modelRunFilters, setModelRunFilters] =
    useState<ModelRunSearchForm>(emptyModelRunFilters)
  const [appliedModelRunFilters, setAppliedModelRunFilters] =
    useState<ModelRunSearchForm>(emptyModelRunFilters)
  const [contractDraftText, setContractDraftText] = useState(
    sampleText(agentDraftSample),
  )
  const [contractValidationResult, setContractValidationResult] =
    useState<ContractValidationResponse | null>(null)
  const [retentionSweepReport, setRetentionSweepReport] =
    useState<ArtifactRetentionSweepReport | null>(null)
  const queryClient = useQueryClient()
  const exportCurrentFlowData = useFlowStore((state) => state.exportFlowData)
  const currentFlowChartName = useFlowStore(
    (state) => state.currentFlowChartName,
  )
  const currentFlowNodeCount = useFlowStore((state) => state.nodes.length)

  const selectJob = (jobId: string) => {
    setSelectedJobId(jobId)
    setEvidenceRefText("")
    setEvidenceResolution(null)
  }

  const healthQuery = useQuery({
    ...computeHealthQueryOptions(),
    retry: false,
  })

  const jobsQuery = useQuery({
    ...listComputeJobsQueryOptions(statusFilter),
    refetchInterval: 10000,
  })

  const jobs = jobsQuery.data?.items ?? []
  const selectedFromList = useMemo(
    () => jobs.find((snapshot) => snapshot.job.job_id === selectedJobId),
    [jobs, selectedJobId],
  )

  const detailQuery = useQuery(computeJobDetailQueryOptions(selectedJobId))

  const resultQuery = useQuery({
    ...computeJobResultQueryOptions(selectedJobId),
    retry: false,
  })

  const eventsQuery = useQuery(computeJobEventsQueryOptions(selectedJobId))

  const modelRunsQuery = useQuery({
    ...modelRunsQueryOptions({
      jobId: appliedModelRunFilters.jobId.trim(),
      modelKey: appliedModelRunFilters.modelKey.trim(),
      modelVersion: appliedModelRunFilters.modelVersion.trim(),
    }),
    refetchInterval: 15000,
  })

  const modelCatalogQuery = useQuery({
    ...modelCatalogQueryOptions(modelGovernanceQueryKeys.catalogSummary),
    staleTime: 60000,
  })

  const createDemoMutation = useMutation({
    ...createDemoJobMutationOptions(),
    onMutate: () => setTransformIssues([]),
    onSuccess: (snapshot) => {
      selectJob(snapshot.job.job_id)
      queryClient.invalidateQueries({ queryKey: ["compute-jobs"] })
    },
  })

  const submitCurrentFlowMutation = useMutation({
    ...createJobFromFlowExportMutationOptions(
      () => exportCurrentFlowData(),
      currentFlowChartName || undefined,
    ),
    onMutate: () => setTransformIssues([]),
    onError: (error) => {
      if (error instanceof ContractTransformError) {
        setTransformIssues(error.details)
      }
    },
    onSuccess: (snapshot) => {
      selectJob(snapshot.job.job_id)
      queryClient.invalidateQueries({ queryKey: ["compute-jobs"] })
    },
  })

  const cancelMutation = useMutation({
    ...cancelComputeJobMutationOptions(),
    onSuccess: (snapshot) => {
      selectJob(snapshot.job.job_id)
      queryClient.invalidateQueries({ queryKey: ["compute-jobs"] })
      queryClient.invalidateQueries({
        queryKey: computeJobQueryKeys.detail(snapshot.job.job_id),
      })
    },
  })

  const downloadMutation = useMutation(downloadArtifactMutationOptions())

  const downloadEvidenceMutation = useMutation({
    ...downloadEvidencePackageMutationOptions(),
    onMutate: () => setEvidenceDownload(null),
    onSuccess: (download) => setEvidenceDownload(download),
  })

  const resolveEvidenceMutation = useMutation({
    ...resolveEvidenceReferenceMutationOptions(),
    onMutate: () => setEvidenceResolution(null),
    onSuccess: (resolution) => setEvidenceResolution(resolution),
  })

  const contractValidationMutation = useMutation({
    ...validateContractTextMutationOptions(),
    onSuccess: (result) => setContractValidationResult(result),
  })

  const draftConfirmationMutation = useMutation({
    ...confirmDraftTextMutationOptions(),
    onSuccess: (result) => setContractValidationResult(result),
  })

  const retentionDryRunMutation = useMutation({
    ...sweepArtifactRetentionMutationOptions(() => ({
      dry_run: true,
      limit: 100,
    })),
    onSuccess: (report) => setRetentionSweepReport(report),
  })

  const retentionDeleteMutation = useMutation({
    ...sweepArtifactRetentionMutationOptions(() => ({
      dry_run: false,
      limit: 100,
    })),
    onSuccess: (report) => {
      setRetentionSweepReport(report)
      queryClient.invalidateQueries({ queryKey: ["compute-jobs"] })
    },
  })

  const selectedSnapshot = detailQuery.data ?? selectedFromList
  const productionReadinessQuery = useQuery({
    ...computeJobProductionReadinessQueryOptions(
      selectedJobId,
      Boolean(selectedJobId && selectedSnapshot?.job.result_hash),
    ),
    retry: false,
  })
  const healthStatus = healthQuery.isError
    ? "offline"
    : healthQuery.isLoading
      ? "checking"
      : "ready"
  const selectedEvidenceDownload =
    evidenceDownload?.jobId === selectedJobId ? evidenceDownload : null
  const selectedEvidenceResolution =
    evidenceResolution?.job_id === selectedJobId ? evidenceResolution : null

  return (
    <Container maxW="full" py={8}>
      <Stack gap={6}>
        <Flex justify="space-between" align="flex-start" gap={4} wrap="wrap">
          <Stack gap={1}>
            <Heading size="lg">Compute Jobs</Heading>
            <Text color="fg.muted">
              Web control surface for the Go Compute API P0 lifecycle.
            </Text>
          </Stack>
          <HStack wrap="wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => jobsQuery.refetch()}
              disabled={jobsQuery.isFetching}
            >
              <FiRefreshCw />
              Refresh
            </Button>
            <Button
              size="sm"
              colorPalette="blue"
              onClick={() => createDemoMutation.mutate()}
              disabled={createDemoMutation.isPending}
            >
              <FiPlus />
              Demo job
            </Button>
            <Button
              size="sm"
              colorPalette="green"
              variant="outline"
              onClick={() => submitCurrentFlowMutation.mutate()}
              disabled={
                submitCurrentFlowMutation.isPending ||
                currentFlowNodeCount === 0
              }
            >
              <FiSend />
              Current flow
            </Button>
          </HStack>
        </Flex>

        <Box borderWidth="1px" borderRadius="md" p={4}>
          <Flex justify="space-between" align="center" gap={4} wrap="wrap">
            <HStack gap={3} wrap="wrap">
              <Field
                label="Compute API"
                value={getComputeJobsBaseUrl()}
              />
              <Field label="Health" value={healthStatus} />
              <Field
                label="Ready"
                value={healthQuery.isSuccess ? "yes" : "N/A"}
              />
            </HStack>
            <Input
              maxW="220px"
              size="sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              placeholder="Filter by status"
            />
          </Flex>
          {healthQuery.isError && (
            <Text mt={3} fontSize="sm" color="red.fg">
              {formatError(healthQuery.error)}
            </Text>
          )}
        </Box>

        {(jobsQuery.isError ||
          modelRunsQuery.isError ||
          modelCatalogQuery.isError ||
          createDemoMutation.isError ||
          submitCurrentFlowMutation.isError ||
          cancelMutation.isError ||
          downloadMutation.isError ||
          downloadEvidenceMutation.isError ||
          productionReadinessQuery.isError ||
          resolveEvidenceMutation.isError ||
          contractValidationMutation.isError ||
          draftConfirmationMutation.isError ||
          retentionDryRunMutation.isError ||
          retentionDeleteMutation.isError) && (
          <Box borderWidth="1px" borderRadius="md" p={4} color="red.fg">
            <Text fontSize="sm">
              {formatError(
                jobsQuery.error ||
                  modelRunsQuery.error ||
                  modelCatalogQuery.error ||
                  createDemoMutation.error ||
                  submitCurrentFlowMutation.error ||
                  cancelMutation.error ||
                  downloadMutation.error ||
                  downloadEvidenceMutation.error ||
                  productionReadinessQuery.error ||
                  resolveEvidenceMutation.error ||
                  contractValidationMutation.error ||
                  draftConfirmationMutation.error ||
                  retentionDryRunMutation.error ||
                  retentionDeleteMutation.error,
              )}
            </Text>
            {transformIssues.length > 0 && (
              <Stack gap={2} mt={3}>
                {transformIssues.map((issue) => (
                  <Text key={`${issue.path}-${issue.reason}`} fontSize="xs">
                    {issue.path}: {issue.reason}
                  </Text>
                ))}
              </Stack>
            )}
          </Box>
        )}

        <Grid
          templateColumns={{
            base: "1fr",
            xl: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
          }}
          gap={6}
          alignItems="start"
        >
          <Box borderWidth="1px" borderRadius="md" p={4}>
            <Flex justify="space-between" align="center" mb={3} gap={3}>
              <Heading size="md">Jobs</Heading>
              <Text fontSize="sm" color="fg.muted">
                {jobsQuery.isFetching
                  ? "Loading"
                  : `${jobs.length} of ${jobsQuery.data?.total_estimate ?? 0}`}
              </Text>
            </Flex>
            <JobsTable
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelect={selectJob}
            />
          </Box>

          <Stack gap={4}>
            <JobDetail
              snapshot={selectedSnapshot}
              result={resultQuery.data}
              productionReadiness={productionReadinessQuery.data}
              productionReadinessLoading={productionReadinessQuery.isFetching}
              evidenceDownload={selectedEvidenceDownload}
              evidenceRef={evidenceRefText}
              evidenceResolution={selectedEvidenceResolution}
              onCancel={() => {
                if (selectedJobId) {
                  cancelMutation.mutate(selectedJobId)
                }
              }}
              cancelPending={cancelMutation.isPending}
              onDownload={(artifact) => downloadMutation.mutate(artifact)}
              downloading={downloadMutation.isPending}
              onDownloadEvidence={() => {
                if (selectedJobId) {
                  downloadEvidenceMutation.mutate(selectedJobId)
                }
              }}
              onEvidenceRefChange={setEvidenceRefText}
              onResolveEvidenceRef={() => {
                if (selectedJobId && evidenceRefText.trim()) {
                  resolveEvidenceMutation.mutate({
                    evidenceRef: evidenceRefText.trim(),
                    jobId: selectedJobId,
                  })
                }
              }}
              evidenceDownloading={downloadEvidenceMutation.isPending}
              evidenceResolving={resolveEvidenceMutation.isPending}
            />
            <EventsPanel events={eventsQuery.data?.items ?? []} />
          </Stack>
        </Grid>

        <ModelCatalogPanel
          catalog={modelCatalogQuery.data}
          isFetching={modelCatalogQuery.isFetching}
        />

        <ArtifactRetentionPanel
          deletePending={retentionDeleteMutation.isPending}
          dryRunPending={retentionDryRunMutation.isPending}
          onDelete={() => retentionDeleteMutation.mutate()}
          onDryRun={() => retentionDryRunMutation.mutate()}
          report={retentionSweepReport}
        />

        <ContractValidationPanel
          draftText={contractDraftText}
          confirmPending={draftConfirmationMutation.isPending}
          isPending={contractValidationMutation.isPending}
          onDraftChange={setContractDraftText}
          onLoadAgentDraft={() => {
            setContractDraftText(sampleText(agentDraftSample))
            setContractValidationResult(null)
          }}
          onLoadSimulationRequest={() => {
            setContractDraftText(sampleText(simulationRequestSample))
            setContractValidationResult(null)
          }}
          onLoadConstraintDraft={() => {
            setContractDraftText(sampleText(constraintDraftSample))
            setContractValidationResult(null)
          }}
          onLoadDraftConfirmation={() => {
            setContractDraftText(sampleText(draftConfirmationSample))
            setContractValidationResult(null)
          }}
          onLoadResultExplanation={() => {
            setContractDraftText(sampleText(resultExplanationSample))
            setContractValidationResult(null)
          }}
          onConfirmDraft={() =>
            draftConfirmationMutation.mutate(contractDraftText)
          }
          onValidate={() =>
            contractValidationMutation.mutate(contractDraftText)
          }
          result={contractValidationResult}
        />

        <ModelRunsHistoryPanel
          filters={modelRunFilters}
          isFetching={modelRunsQuery.isFetching}
          modelRuns={modelRunsQuery.data?.items ?? []}
          onClear={() => {
            setModelRunFilters(emptyModelRunFilters)
            setAppliedModelRunFilters(emptyModelRunFilters)
          }}
          onFiltersChange={setModelRunFilters}
          onSearch={() => setAppliedModelRunFilters({ ...modelRunFilters })}
          onUseSelectedJob={() => {
            if (selectedJobId) {
              const nextFilters = { ...modelRunFilters, jobId: selectedJobId }
              setModelRunFilters(nextFilters)
              setAppliedModelRunFilters(nextFilters)
            }
          }}
          selectedJobId={selectedJobId}
          totalEstimate={modelRunsQuery.data?.total_estimate ?? 0}
        />
      </Stack>
    </Container>
  )
}
