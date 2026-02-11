import {
  Alert,
  Box,
  Button,
  Field,
  HStack,
  Input,
  Portal,
  Select,
  Stack,
  Text,
  createListCollection,
} from "@chakra-ui/react"
import { Slider } from "@chakra-ui/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FiCheck, FiPlay, FiX } from "react-icons/fi"
import {
  type CalculationParameters,
  getSimulationConfig,
  validateCalculationParameters,
} from "../../../config/simulationConfig"
import { useI18n } from "../../../i18n"
import {
  getJobStatusText as asm1GetJobStatusText,
  isJobCompleted as asm1IsJobCompleted,
  isJobRunning as asm1IsJobRunning,
  isJobSuccessful as asm1IsJobSuccessful,
} from "../../../stores/asm1Store"
import {
  getJobStatusText as asm1SlimGetJobStatusText,
  isJobCompleted as asm1SlimIsJobCompleted,
  isJobRunning as asm1SlimIsJobRunning,
  isJobSuccessful as asm1SlimIsJobSuccessful,
} from "../../../stores/asm1slimStore"
import { useASM1SlimStore } from "../../../stores/asm1slimStore"
import {
  getJobStatusText as asm3GetJobStatusText,
  isJobCompleted as asm3IsJobCompleted,
  isJobRunning as asm3IsJobRunning,
  isJobSuccessful as asm3IsJobSuccessful,
} from "../../../stores/asm3Store"
import type { BaseModelState } from "../../../stores/baseModelStore"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import {
  getJobStatusText as materialBalanceGetJobStatusText,
  isJobCompleted as materialBalanceIsJobCompleted,
  isJobRunning as materialBalanceIsJobRunning,
  isJobSuccessful as materialBalanceIsJobSuccessful,
} from "../../../stores/materialBalanceStore"
import { type ModelType, createAnalysisButton } from "../legacy-analysis"

interface SimulationPanelProps {
  store?: () => RFState // 可选的自定义 store
  modelStore?: () => BaseModelState<any, any, any, any, any> // 可选的模型store
  modelType?: string // 模型类型，用于获取对应的配置
}

function SimulationPanel({
  store,
  modelStore,
  modelType = "materialBalance",
}: SimulationPanelProps = {}) {
  const { t } = useI18n()
  const portalRef = useRef<HTMLElement>(null!)
  useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  // 获取当前模型的配置
  const config = getSimulationConfig(modelType)

  // 根据modelType选择正确的辅助函数
  const getModelHelpers = (type: string) => {
    switch (type) {
      case "asm3":
        return {
          isJobCompleted: asm3IsJobCompleted,
          isJobSuccessful: asm3IsJobSuccessful,
          isJobRunning: asm3IsJobRunning,
          getJobStatusText: asm3GetJobStatusText,
        }
      case "asm1":
        return {
          isJobCompleted: asm1IsJobCompleted,
          isJobSuccessful: asm1IsJobSuccessful,
          isJobRunning: asm1IsJobRunning,
          getJobStatusText: asm1GetJobStatusText,
        }
      case "asm1slim":
        return {
          isJobCompleted: asm1SlimIsJobCompleted,
          isJobSuccessful: asm1SlimIsJobSuccessful,
          isJobRunning: asm1SlimIsJobRunning,
          getJobStatusText: asm1SlimGetJobStatusText,
        }
      default: // materialBalance
        return {
          isJobCompleted: materialBalanceIsJobCompleted,
          isJobSuccessful: materialBalanceIsJobSuccessful,
          isJobRunning: materialBalanceIsJobRunning,
          getJobStatusText: materialBalanceGetJobStatusText,
        }
    }
  }

  const { isJobCompleted, isJobSuccessful, isJobRunning, getJobStatusText } =
    getModelHelpers(modelType)

  // 参数验证状态
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // 验证参数的函数
  const validateAndUpdateParameters = (
    newParams: Partial<CalculationParameters>,
  ) => {
    const validation = validateCalculationParameters(newParams, modelType)
    setValidationErrors(validation.errors)

    // 只有在验证通过时才更新参数
    if (validation.isValid) {
      updateCalculationParameters(newParams)
    }

    return validation.isValid
  }
  const flowStore = store || useFlowStore
  const {
    selectedNode,
    calculationParameters,
    updateCalculationParameters,
    exportFlowData,
    setCurrentJobId,
    currentFlowChartName,
    importedFileName,
    currentJobId,
    nodes,
    edges,
    edgeParameterConfigs,
  } = flowStore()

  // 模拟计算相关状态 - 从flowStore获取
  const {
    hours: simulationHours,
    steps_per_hour: simulationSteps,
    solver_method: solverMethod,
    tolerance,
    max_iterations: maxIterations,
    max_memory_mb: maxMemoryMb,
    sampling_interval_hours: samplingIntervalHours,
  } = calculationParameters

  // 使用传入的modelStore或默认的ASM1SlimStore
  const defaultModelStore = useASM1SlimStore()
  const currentModelStore = modelStore ? modelStore() : defaultModelStore

  // 从modelStore获取计算相关方法和状态
  const {
    createCalculationJobFromFlowchart,
    isLoading: isCalculating,
    currentJob,
    getCalculationStatus,
    pollJobStatus,
    resultSummary,
    getResultSummary,
    getFinalValues,
  } = currentModelStore

  // 直接使用传入的modelStore，不使用fallback机制
  const finalStore = {
    createCalculationJobFromFlowchart,
    isLoading: isCalculating,
    currentJob,
    getCalculationStatus,
    pollJobStatus,
    resultSummary,
    getResultSummary,
    getFinalValues,
  }

  // 用于存储轮询清理函数的引用
  const pollCleanupRef = useRef<(() => void) | null>(null)

  // 计时器相关状态
  const [elapsedTime, setElapsedTime] = useState(0) // 已经过的时间（秒）
  const [estimatedTotalTime, setEstimatedTotalTime] = useState(0) // 预估总时间（秒）
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 处理模拟计算
  const handleStartSimulation = async () => {
    if (!selectedNode) return

    try {
      // 清理之前的轮询和计时器
      if (pollCleanupRef.current) {
        pollCleanupRef.current()
        pollCleanupRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      // 重置计时器状态
      setElapsedTime(0)

      // 直接使用flowStore的数据结构，后端会处理转换
      const flowData = exportFlowData()

      // 计算预估总时间（基于复杂度的简单估算）
      const nodeCount = flowData.nodes?.length || 0
      const edgeCount = flowData.edges?.length || 0
      const customParamCount = flowData.customParameters?.length || 0
      const hours = flowData.calculationParameters?.hours || 1
      const stepsPerHour = flowData.calculationParameters?.steps_per_hour || 10
      const totalSteps = hours * stepsPerHour

      // 基于复杂度估算计算时间（秒）
      const complexityFactor =
        (nodeCount + edgeCount) * customParamCount * (totalSteps / 100)
      let estimatedTime = 2 // 基础时间10秒
      if (complexityFactor <= 100) {
        estimatedTime = 2
      } else if (complexityFactor <= 300) {
        estimatedTime = 4
      } else if (complexityFactor <= 600) {
        estimatedTime = 8
      } else if (complexityFactor <= 1100) {
        estimatedTime = 16
      } else {
        estimatedTime = 60
      }
      setEstimatedTotalTime(estimatedTime)

      // 获取流程图名称，优先使用currentFlowChartName，其次使用importedFileName，最后使用默认名称
      const flowChartName =
        currentFlowChartName ||
        importedFileName ||
        t("flow.simulation.defaultFlowchartName", {
          timestamp: new Date().toLocaleString(),
        })

      // 在flowData中添加名称信息
      const flowDataWithName = {
        ...flowData,
        name: flowChartName,
      }

      const job =
        await finalStore.createCalculationJobFromFlowchart(flowDataWithName)

      // 将创建的任务ID设置到flowStore中
      if (job?.job_id) {
        setCurrentJobId(job.job_id)
        console.log("计算任务已创建，Job ID:", job.job_id)

        // 启动计时器
        timerRef.current = setInterval(() => {
          setElapsedTime((prev) => prev + 1)
        }, 1000)

        // 开始轮询任务状态，传递流程图数据用于动态调整轮询间隔
        pollCleanupRef.current = finalStore.pollJobStatus(
          job.job_id,
          undefined,
          flowData,
        )
      }
    } catch (error) {
      console.error("模拟计算失败:", error)
    }
  }

  // 组件卸载时清理轮询和计时器
  useEffect(() => {
    return () => {
      if (pollCleanupRef.current) {
        pollCleanupRef.current()
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 当任务完成时停止计时器
  useEffect(() => {
    if (
      finalStore.currentJob &&
      isJobCompleted(finalStore.currentJob.status) &&
      timerRef.current
    ) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [finalStore.currentJob?.status])

  // 当currentJobId变化时，获取任务状态
  useEffect(() => {
    if (currentJobId && !finalStore.currentJob) {
      finalStore.getCalculationStatus(currentJobId).catch(console.error)
    }
  }, [currentJobId, finalStore.currentJob])

  // 当计算任务成功完成时，获取计算结果摘要和最终值数据
  useEffect(() => {
    if (
      finalStore.currentJob &&
      finalStore.currentJob.status === "success" &&
      currentJobId
    ) {
      // 每次任务成功完成时都重新获取结果数据
      const promises = [
        finalStore.getResultSummary(currentJobId),
        finalStore.getFinalValues(currentJobId),
      ]

      Promise.all(promises).catch(console.error)
    }
  }, [finalStore.currentJob?.status, currentJobId])

  // 判断是否显示计算完成提示
  const showCompletionAlert =
    finalStore.currentJob && isJobCompleted(finalStore.currentJob.status)
  const isCalculationSuccessful =
    finalStore.currentJob && isJobSuccessful(finalStore.currentJob.status)
  // 判断任务是否正在运行（包括pending和running状态）
  const isJobCurrentlyRunning = finalStore.currentJob
    ? isJobRunning(finalStore.currentJob.status)
    : false

  // 格式化时间显示（秒转换为 mm:ss 格式）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 计算剩余时间
  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime)

  // 计算进度百分比
  const progressPercentage =
    estimatedTotalTime > 0
      ? Math.min(100, (elapsedTime / estimatedTotalTime) * 100)
      : 0

  // 计算体积耗尽时间的函数
  const calculateVolumeDepletionTime = useMemo(() => {
    if (!nodes || !edges || nodes.length === 0 || edges.length === 0) {
      return { time: config.hours.max, isValid: true } // 使用配置的最大值
    }

    let minDepletionTime = config.hours.max // 使用配置的最大值

    // 遍历所有非进出节点
    nodes.forEach((node: any) => {
      const nodeType = node.type
      const nodeData = node.data

      // 跳过进水端和出水端节点
      if (nodeType === "input" || nodeType === "output") {
        return
      }

      // 获取节点的初始体积
      const initialVolume =
        Number.parseFloat(nodeData?.volume as string) || 1e-6

      // 计算流入该节点的总流量
      let totalInflowRate = 0
      // 计算流出该节点的总流量
      let totalOutflowRate = 0

      edges.forEach((edge: any) => {
        const edgeData = edge.data
        const flowRate = Number.parseFloat(edgeData?.flow as string) || 0

        // 如果边的目标是当前节点，则为流入
        if (edge.target === node.id) {
          totalInflowRate += flowRate
        }
        // 如果边的源是当前节点，则为流出
        if (edge.source === node.id) {
          totalOutflowRate += flowRate
        }
      })

      // 计算净流出速率（流出 - 流入）
      const netOutflowRate = totalOutflowRate - totalInflowRate

      // 如果净流出速率大于0，计算体积耗尽时间
      if (netOutflowRate > 0) {
        const depletionTime = initialVolume / netOutflowRate
        minDepletionTime = Math.min(minDepletionTime, depletionTime)
      }
    })

    // 检查是否小于0.5小时
    const isValid = minDepletionTime >= 0.5
    const finalTime = isValid
      ? Math.min(minDepletionTime, config.hours.max)
      : minDepletionTime

    return { time: finalTime, isValid }
  }, [nodes, edges])

  // 动态计算运行时间滑块的最大值
  const maxSimulationTime = calculateVolumeDepletionTime.isValid
    ? Math.floor(calculateVolumeDepletionTime.time * 2) / 2 // 向下取整到0.5的倍数
    : 0.5 // 如果无效，设置为0.5作为默认值

  return (
    <Stack gap={6} align="stretch">
      <Box>
        {/* 运行时间滑块 */}
        {config.hours.visible && (
          <Field.Root mb={4}>
            <Slider.Root
              value={[Math.min(simulationHours, maxSimulationTime)]}
              onValueChange={(details) =>
                validateAndUpdateParameters({ hours: details.value[0] })
              }
              min={config.hours.min}
              max={maxSimulationTime}
              step={config.hours.step}
              width="100%"
              disabled={!calculateVolumeDepletionTime.isValid}
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">
                  {t(config.hours.label)}
                  {config.hours.unit ? ` (${t(config.hours.unit)})` : ""}
                </Text>
                <Slider.ValueText fontSize="sm" />
              </HStack>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
            {!calculateVolumeDepletionTime.isValid && (
              <Alert.Root status="error" mt={2}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    <Text fontSize="xs">
                      {t("flow.simulation.minTimeError", {
                        time: calculateVolumeDepletionTime.time.toFixed(2),
                        min: 0.5,
                      })}
                    </Text>
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}
            {calculateVolumeDepletionTime.isValid &&
              maxSimulationTime < config.hours.max && (
                <Text fontSize="xs" color="orange.500" mt={1}>
                  {t("flow.simulation.maxTimeAdjusted", {
                    time: maxSimulationTime,
                  })}
                </Text>
              )}
          </Field.Root>
        )}

        {/* 每小时步数滑块 */}
        {config.stepsPerHour.visible && (
          <Field.Root mb={4}>
            <Slider.Root
              value={[simulationSteps]}
              onValueChange={(details) =>
                validateAndUpdateParameters({
                  steps_per_hour: details.value[0],
                })
              }
              min={config.stepsPerHour.min}
              max={config.stepsPerHour.max}
              step={config.stepsPerHour.step}
              width="100%"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">
                  {t(config.stepsPerHour.label)}
                  {config.stepsPerHour.unit
                    ? ` (${t(config.stepsPerHour.unit)})`
                    : ""}
                </Text>
                <Slider.ValueText fontSize="sm" />
              </HStack>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
          </Field.Root>
        )}

        {/* 求解器方法选择 */}
        {config.solverMethod.visible && (
          <Field.Root mb={4}>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm">{t(config.solverMethod.label)}</Text>
            </HStack>
            <Input
              value={solverMethod}
              onChange={(e) =>
                validateAndUpdateParameters({ solver_method: e.target.value })
              }
              placeholder={config.solverMethod.placeholder}
              readOnly={config.solverMethod.readOnly}
              style={{
                backgroundColor: config.solverMethod.readOnly
                  ? "#f7fafc"
                  : "transparent",
              }}
            />
          </Field.Root>
        )}

        {/* 容差设置 */}
        {config.tolerance.visible && (
          <Field.Root mb={4}>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm">{t(config.tolerance.label)}</Text>
            </HStack>
            <Input
              type={config.tolerance.type}
              step={config.tolerance.step}
              value={tolerance}
              onChange={(e) => {
                const newValue = Number.parseFloat(e.target.value)
                if (!Number.isNaN(newValue)) {
                  validateAndUpdateParameters({ tolerance: newValue })
                }
              }}
              placeholder={config.tolerance.placeholder}
              readOnly={config.tolerance.readOnly}
            />
          </Field.Root>
        )}

        {/* 最大迭代次数滑块 */}
        {config.maxIterations.visible && (
          <Field.Root mb={4}>
            <Slider.Root
              value={[maxIterations]}
              onValueChange={(details) =>
                validateAndUpdateParameters({
                  max_iterations: details.value[0],
                })
              }
              min={config.maxIterations.min}
              max={config.maxIterations.max}
              step={config.maxIterations.step}
              width="100%"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">
                  {t(config.maxIterations.label)}
                  {config.maxIterations.unit
                    ? ` (${t(config.maxIterations.unit)})`
                    : ""}
                </Text>
                <Slider.ValueText fontSize="sm" />
              </HStack>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
          </Field.Root>
        )}

        {/* 最大内存限制滑块 */}
        {config.maxMemoryMb.visible && (
          <Field.Root mb={4}>
            <Slider.Root
              value={[maxMemoryMb]}
              onValueChange={(details) =>
                validateAndUpdateParameters({ max_memory_mb: details.value[0] })
              }
              min={config.maxMemoryMb.min}
              max={config.maxMemoryMb.max}
              step={config.maxMemoryMb.step}
              width="100%"
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">
                  {t(config.maxMemoryMb.label)}
                  {config.maxMemoryMb.unit
                    ? ` (${t(config.maxMemoryMb.unit)})`
                    : ""}
                </Text>
                <Slider.ValueText fontSize="sm" />
              </HStack>
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumbs />
              </Slider.Control>
            </Slider.Root>
          </Field.Root>
        )}

        {/* 采样间隔选择框 */}
        {config.samplingIntervalHours.visible && (
          <Field.Root mb={6}>
            <Select.Root
              collection={createListCollection({
                items:
                  config.samplingIntervalHours.options?.map((option) => ({
                    label: option.label,
                    value: String(option.value),
                  })) || [],
              })}
              value={[
                String(
                  samplingIntervalHours ||
                    config.samplingIntervalHours.defaultValue,
                ),
              ]}
              onValueChange={(details) =>
                validateAndUpdateParameters({
                  sampling_interval_hours: Number(details.value[0]),
                })
              }
              size="sm"
            >
              <Select.HiddenSelect />
              <Select.Label fontSize="sm">
                {t(config.samplingIntervalHours.label)}
                {config.samplingIntervalHours.unit
                  ? ` (${t(config.samplingIntervalHours.unit)})`
                  : ""}
              </Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText
                    placeholder={t("flow.simulation.selectSamplingInterval")}
                  />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal container={portalRef}>
                <Select.Positioner>
                  <Select.Content>
                    {config.samplingIntervalHours.options?.map((option) => (
                      <Select.Item
                        key={option.value}
                        item={{
                          label: option.label,
                          value: String(option.value),
                        }}
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Field.Root>
        )}

        {/* 验证错误提示 */}
        {validationErrors.length > 0 && (
          <Alert.Root status="error" mb={4}>
            <Alert.Indicator>
              <FiX />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {t("flow.simulation.validationErrorTitle")}
              </Alert.Title>
              <Alert.Description>
                {validationErrors.map((error, index) => (
                  <Text key={index} fontSize="sm">
                    {error}
                  </Text>
                ))}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* 计算完成状态提示 */}
        {showCompletionAlert && (
          <Alert.Root
            status={isCalculationSuccessful ? "success" : "error"}
            mb={4}
          >
            <Alert.Indicator>
              {isCalculationSuccessful ? <FiCheck /> : <FiX />}
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {isCalculationSuccessful
                  ? t("flow.simulation.completedTitle")
                  : t("flow.simulation.failedTitle")}
              </Alert.Title>
              <Alert.Description>
                {t("flow.simulation.statusLabel", {
                  status: getJobStatusText(finalStore.currentJob?.status),
                })}
                {finalStore.currentJob?.error_message && (
                  <Text fontSize="sm" mt={1} color="red.500">
                    {t("flow.simulation.errorLabel", {
                      error: finalStore.currentJob.error_message,
                    })}
                  </Text>
                )}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* 计算进度显示 */}
        {isJobCurrentlyRunning && (
          <Box mb={4} p={4} borderWidth={1} borderRadius="md" bg="blue.50">
            <Text fontSize="md" fontWeight="bold" mb={3} color="blue.700">
              {t("flow.simulation.inProgress")}
            </Text>
            <Stack gap={2}>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.600">
                  {t("flow.simulation.elapsedTime")}
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {formatTime(elapsedTime)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.600">
                  {t("flow.simulation.remainingTime")}
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                  color={remainingTime <= 10 ? "orange.600" : "gray.700"}
                >
                  {formatTime(remainingTime)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.600">
                  {t("flow.simulation.estimatedTotalTime")}
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {formatTime(estimatedTotalTime)}
                </Text>
              </HStack>
              <Box mt={2}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    {t("flow.simulation.progress")}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {progressPercentage.toFixed(1)}%
                  </Text>
                </HStack>
                <Box w="100%" h="6px" bg="gray.200" borderRadius="full">
                  <Box
                    w={`${progressPercentage}%`}
                    h="100%"
                    bg={progressPercentage >= 100 ? "orange.400" : "blue.400"}
                    borderRadius="full"
                    transition="width 0.3s ease"
                  />
                </Box>
              </Box>
              {progressPercentage >= 100 && (
                <Text fontSize="xs" color="orange.600" mt={1}>
                  {t("flow.simulation.overdue")}
                </Text>
              )}
            </Stack>
          </Box>
        )}

        {/* 模拟计算按钮 */}
        <Button
          colorScheme="blue"
          onClick={handleStartSimulation}
          loading={finalStore.isLoading}
          loadingText={t("flow.simulation.loadingButton")}
          size="md"
          disabled={
            !selectedNode ||
            !!isJobCurrentlyRunning ||
            !calculateVolumeDepletionTime.isValid
          }
        >
          <FiPlay />
          {t("flow.simulation.startButton")}
        </Button>

        {/* 计算结果摘要显示 */}
        {finalStore.resultSummary &&
          finalStore.currentJob &&
          finalStore.currentJob.status === "success" && (
            <Box mt={4} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text fontSize="md" fontWeight="bold" mb={3}>
                {t("flow.simulation.summaryTitle")}
              </Text>
              <Stack gap={2}>
                {finalStore.resultSummary.total_time && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      {t("flow.simulation.totalTime")}
                    </Text>
                    <Text fontSize="sm">
                      {finalStore.resultSummary.total_time}{" "}
                      {t("flow.simulation.unit.hours")}
                    </Text>
                  </HStack>
                )}
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    {t("flow.simulation.totalSteps")}
                  </Text>
                  <Text fontSize="sm">
                    {finalStore.resultSummary.total_steps}{" "}
                    {t("flow.simulation.unit.steps")}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    {t("flow.simulation.calculationTime")}
                  </Text>
                  <Text fontSize="sm">
                    {finalStore.resultSummary.calculation_time_seconds.toFixed(
                      3,
                    )}{" "}
                    {t("flow.simulation.unit.seconds")}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    {t("flow.simulation.convergenceStatus")}
                  </Text>
                  <Text
                    fontSize="sm"
                    color={
                      finalStore.resultSummary.convergence_status ===
                      "converged"
                        ? "green.600"
                        : "red.600"
                    }
                  >
                    {finalStore.resultSummary.convergence_status}
                  </Text>
                </HStack>
                {finalStore.resultSummary.final_mass_balance_error && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      {t("flow.simulation.finalMassBalanceError")}
                    </Text>
                    <Text fontSize="sm">
                      {finalStore.resultSummary.final_mass_balance_error.toExponential(
                        6,
                      )}
                    </Text>
                  </HStack>
                )}
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    {t("flow.simulation.finalTotalVolume")}
                  </Text>
                  <Text fontSize="sm">
                    {finalStore.resultSummary.final_total_volume.toFixed(6)}
                  </Text>
                </HStack>
                {finalStore.resultSummary.solver_method && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      {t("flow.simulation.solverMethod")}
                    </Text>
                    <Text fontSize="sm">
                      {finalStore.resultSummary.solver_method}
                    </Text>
                  </HStack>
                )}
                {finalStore.resultSummary.error_message && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">
                      {t("flow.simulation.errorLabelShort")}
                    </Text>
                    <Text fontSize="sm" color="red.600">
                      {finalStore.resultSummary.error_message}
                    </Text>
                  </HStack>
                )}

                {/* 数据分析按钮 */}
                {finalStore.currentJob?.result_data && (
                  <Box
                    mt={3}
                    pt={3}
                    borderTopWidth={1}
                    borderTopColor="gray.200"
                  >
                    {(() => {
                      const AnalysisButton = createAnalysisButton({
                        modelType: (modelType as ModelType) || "other",
                        label: t("flow.simulation.analysisButton"),
                        resultData: finalStore.currentJob.result_data,
                        edges: edges,
                        edgeParameterConfigs: edgeParameterConfigs,
                        disabled: !isCalculationSuccessful,
                      })
                      return <AnalysisButton />
                    })()}
                  </Box>
                )}
              </Stack>
            </Box>
          )}
      </Box>
    </Stack>
  )
}

export default SimulationPanel
