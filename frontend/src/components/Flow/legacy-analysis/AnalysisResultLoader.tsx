import type { Edge } from "@xyflow/react"
import {
  Alert,
  Button,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { FaChartLine } from "react-icons/fa"
import { useI18n } from "../../../i18n"
import ASM1Analyzer from "./ASM1Analyzer"
import ASM1SlimAnalyzer from "./ASM1SlimAnalyzer"
import ASM3Analyzer from "./ASM3Analyzer"
import AnalysisButton from "./AnalysisButton"
import AnalysisDialog from "./AnalysisDialog"
import UDMAnalyzer from "./UDMAnalyzer"

interface EdgeParameterConfig {
  a: number
  b: number
}

type AnalysisModelType =
  | "asm1"
  | "ASM1"
  | "asm1slim"
  | "ASM1Slim"
  | "asm3"
  | "ASM3"
  | "udm"
  | "UDM"
  | "ASM2d"
  | "ADM1"
  | "materialBalance"
  | "other"

type LoadStatus = "idle" | "loading" | "ready" | "error"

interface AnalysisResultLoaderProps {
  enabled: boolean
  modelType: AnalysisModelType
  jobId?: string
  legacyResultData?: Record<string, unknown> | null
  loadAnalysisResult?: (jobId: string) => Promise<Record<string, unknown>>
  edges?: Edge[]
  nodes?: Array<{ type?: string; data?: Record<string, unknown> }>
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
  accentColor?: string
}

interface AnalysisResultButtonProps
  extends Omit<AnalysisResultLoaderProps, "enabled" | "accentColor"> {
  label?: string
  disabled?: boolean
  loading?: boolean
}

const hasLegacyAnalysisShape = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.timestamps) && Boolean(record.node_data)
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || "Unknown error")

export const AnalysisResultLoader = ({
  enabled,
  modelType,
  jobId,
  legacyResultData,
  loadAnalysisResult,
  edges,
  nodes,
  edgeParameterConfigs,
  accentColor = "gray.600",
}: AnalysisResultLoaderProps) => {
  const { t } = useI18n()
  const [status, setStatus] = useState<LoadStatus>("idle")
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!enabled) return

    if (hasLegacyAnalysisShape(legacyResultData)) {
      setStatus("ready")
      setResultData(legacyResultData)
      setError(null)
      return
    }

    if (!jobId || !loadAnalysisResult) {
      setStatus("error")
      setResultData(null)
      setError(t("flow.analysis.loadFailed"))
      return
    }

    let cancelled = false
    setStatus("loading")
    setResultData(null)
    setError(null)
    loadAnalysisResult(jobId)
      .then((data) => {
        if (cancelled) return
        setStatus("ready")
        setResultData(data)
      })
      .catch((loadError) => {
        if (cancelled) return
        setStatus("error")
        setError(errorMessage(loadError))
      })

    return () => {
      cancelled = true
    }
  }, [enabled, jobId, legacyResultData, loadAnalysisResult, retryKey, t])

  if (!enabled) return null

  if (status === "loading") {
    return (
      <VStack py={10} gap={3}>
        <Spinner size="lg" />
        <Text color={accentColor}>{t("flow.analysis.loading")}</Text>
      </VStack>
    )
  }

  if (status === "error") {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t("flow.analysis.loadFailed")}</Alert.Title>
          <Alert.Description>
            <VStack align="flex-start" gap={3}>
              <Text>{error || t("flow.analysis.loadFailed")}</Text>
              <Button size="sm" onClick={() => setRetryKey((value) => value + 1)}>
                {t("flow.analysis.retry")}
              </Button>
            </VStack>
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  if (!resultData) return null

  switch (modelType) {
    case "asm1":
    case "ASM1":
      return (
        <ASM1Analyzer
          resultData={resultData as any}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "asm1slim":
    case "ASM1Slim":
      return (
        <ASM1SlimAnalyzer
          resultData={resultData as any}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "asm3":
    case "ASM3":
      return (
        <ASM3Analyzer
          resultData={resultData as any}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "udm":
    case "UDM":
      return (
        <UDMAnalyzer
          resultData={resultData as any}
          edges={edges}
          nodes={nodes}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    default:
      return (
        <Text fontSize="sm" color={accentColor} opacity={0.8}>
          {t("flow.analysis.unavailable")}
        </Text>
      )
  }
}

export const AnalysisResultButton = ({
  modelType,
  jobId,
  legacyResultData,
  loadAnalysisResult,
  edges,
  nodes,
  edgeParameterConfigs,
  label,
  disabled = false,
  loading = false,
}: AnalysisResultButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const data = hasLegacyAnalysisShape(legacyResultData)
    ? legacyResultData
    : jobId
      ? { jobId }
      : null

  return (
    <>
      <AnalysisButton
        label={label}
        icon={<Icon as={FaChartLine} />}
        disabled={disabled || !data}
        loading={loading}
        onAnalyze={() => setIsDialogOpen(true)}
        data={data}
        colorScheme="blue"
      />
      <AnalysisDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={label}
        size="cover"
      >
        <AnalysisResultLoader
          enabled={isDialogOpen}
          modelType={modelType}
          jobId={jobId}
          legacyResultData={legacyResultData}
          loadAnalysisResult={loadAnalysisResult}
          edges={edges}
          nodes={nodes}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      </AnalysisDialog>
    </>
  )
}
