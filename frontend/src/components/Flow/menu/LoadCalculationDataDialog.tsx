import {
  Badge,
  Box,
  Button,
  HStack,
  Spinner,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useEffect, useState } from "react"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../../ui/dialog"

import { MaterialBalanceService } from "../../../client/sdk.gen"
import type {
  MaterialBalanceInput,
  MaterialBalanceJobPublic,
} from "../../../client/types.gen"
import useFlowStore from "../../../stores/flowStore"
import { useMaterialBalanceStore } from "../../../stores/materialBalanceStore"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "../../ui/pagination"

interface LoadCalculationDataDialogProps {
  isOpen: boolean
  onClose: () => void
}

const LoadCalculationDataDialog: React.FC<LoadCalculationDataDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [jobs, setJobs] = useState<MaterialBalanceJobPublic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedJob, setSelectedJob] =
    useState<MaterialBalanceJobPublic | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [resultSummary, setResultSummary] = useState<any>(null)

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalJobs, setTotalJobs] = useState(0)

  const {
    getUserJobs,
    getResultSummary,
    getFinalValues,
    getCalculationStatus,
  } = useMaterialBalanceStore()
  const {
    setNodes,
    setEdges,
    setCurrentFlowChartName,
    setCurrentJobId,
    addCustomParameter,
    updateEdgeParameterConfig,
    removeCustomParameter,
    customParameters,
    importFlowData,
  } = useFlowStore()

  // 获取任务列表
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
      fetchJobs(1)
    }
  }, [isOpen])

  // 当页面变化时获取数据
  useEffect(() => {
    if (isOpen) {
      fetchJobs(currentPage)
    }
  }, [currentPage, isOpen])

  const fetchJobs = async (page: number) => {
    setIsLoading(true)
    try {
      const skip = (page - 1) * pageSize
      const response = await getUserJobs(skip, pageSize)

      setJobs(response.data)
      setTotalJobs(response.count)
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "获取任务列表失败",
        description: "无法获取计算任务列表",
        type: "error",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 获取任务状态显示文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "等待中"
      case "running":
        return "计算中"
      case "success":
        return "已完成"
      case "failed":
        return "失败"
      case "cancelled":
        return "已取消"
      default:
        return "未知"
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "yellow"
      case "running":
        return "blue"
      case "success":
        return "green"
      case "failed":
        return "red"
      case "cancelled":
        return "gray"
      default:
        return "gray"
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  // 选择任务
  const handleSelectJob = async (job: MaterialBalanceJobPublic) => {
    setSelectedJob(job)
    setIsLoadingData(true)

    try {
      // 获取计算结果摘要
      if (job.status === "success") {
        const summary =
          await MaterialBalanceService.getCalculationResultSummary({
            jobId: job.job_id,
          })
        setResultSummary(summary)
      }
    } catch (error) {
      console.error("Failed to fetch job details:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // 加载选中的任务数据
  const handleLoadJobData = async () => {
    if (!selectedJob) return

    setIsLoadingData(true)
    try {
      // 获取输入数据和结果数据
      const jobDataResponse = await MaterialBalanceService.getJobInputData({
        jobId: selectedJob.job_id,
      })

      const rawInputData = jobDataResponse.input_data as any
      if (!rawInputData) {
        throw new Error("输入数据为空")
      }

      const isFlowchartData = (data: any) => {
        if (!data || typeof data !== "object") return false
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges))
          return false

        const nodeOk =
          data.nodes.length === 0 || typeof data.nodes[0]?.id === "string"
        const edgeOk =
          data.edges.length === 0 || typeof data.edges[0]?.source === "string"
        return nodeOk && edgeOk
      }

      const originalFlowchartData = (rawInputData as MaterialBalanceInput)
        ?.original_flowchart_data as any
      const flowchartData = isFlowchartData(rawInputData)
        ? rawInputData
        : isFlowchartData(originalFlowchartData)
          ? originalFlowchartData
          : null

      if (flowchartData) {
        const importResult = importFlowData?.(flowchartData)

        if (!importResult?.success) {
          // 回退到手动设置方式
          if (
            flowchartData.customParameters &&
            Array.isArray(flowchartData.customParameters)
          ) {
            const currentParams = [...customParameters]
            currentParams.forEach((param) => removeCustomParameter(param.name))

            flowchartData.customParameters.forEach((param: any) => {
              addCustomParameter(param.name, param.description)
            })
          }

          setNodes(flowchartData.nodes || [])
          setEdges(flowchartData.edges || [])

          if (flowchartData.edgeParameterConfigs) {
            Object.entries(flowchartData.edgeParameterConfigs).forEach(
              ([edgeId, configs]: [string, any]) => {
                Object.entries(configs).forEach(
                  ([paramName, config]: [string, any]) => {
                    updateEdgeParameterConfig(edgeId, paramName, config)
                  },
                )
              },
            )
          }
        }
      } else {
        // 从计算输入数据重建流程图（仅用于没有原始流程图数据的情况）
        const inputData = rawInputData as MaterialBalanceInput

        const nodes =
          inputData.nodes?.map((node) => ({
            id: node.node_id,
            type: node.is_inlet
              ? "input"
              : node.is_outlet
                ? "output"
                : "default",
            position: {
              x:
                typeof node.position?.x === "number"
                  ? node.position.x
                  : Math.random() * 400,
              y:
                typeof node.position?.y === "number"
                  ? node.position.y
                  : Math.random() * 400,
            },
            data: {
              label: node.node_id,
              volume: node.initial_volume,
            },
          })) || []

        const edges =
          inputData.edges?.map((edge) => ({
            id: edge.edge_id,
            source: edge.source_node_id,
            target: edge.target_node_id,
            type: "editable",
            data: {
              flow: edge.flow_rate,
            },
          })) || []

        setNodes(nodes)
        setEdges(edges)
      }

      // 设置流程图名称和当前任务ID
      setCurrentFlowChartName(selectedJob.job_name)
      setCurrentJobId(selectedJob.job_id)

      // 如果任务已完成，加载计算结果数据
      if (selectedJob.status === "success") {
        try {
          // 并行加载计算结果摘要和最终值数据
          await Promise.all([
            getResultSummary(selectedJob.job_id),
            getFinalValues(selectedJob.job_id),
            getCalculationStatus(selectedJob.job_id),
          ])
        } catch (error) {
          console.error("加载计算结果数据失败:", error)
          // 不阻止主要的数据加载流程
        }
      }

      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "加载成功",
        description: `已加载计算任务：${selectedJob.job_name}`,
        type: "success",
        duration: 3000,
      })

      onClose()
    } catch (error) {
      console.error("Failed to load job data:", error)
      const { toaster } = await import("../../ui/toaster")

      let errorMessage = "无法加载计算任务数据"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toaster.create({
        title: "加载失败",
        description: errorMessage,
        type: "error",
        duration: 5000,
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => !details.open && onClose()}
    >
      <DialogContent
        maxW="6xl"
        maxH="90vh"
        display="flex"
        flexDirection="column"
      >
        <DialogHeader flexShrink={0}>
          <DialogTitle>加载计算数据</DialogTitle>
        </DialogHeader>

        <DialogBody flex={1} overflow="hidden">
          <HStack align="start" gap={6} h="full">
            {/* 左侧：任务列表 */}
            <Box flex={1} h="full" display="flex" flexDirection="column">
              <Text fontSize="lg" fontWeight="bold" mb={4} flexShrink={0}>
                计算任务列表
              </Text>

              {isLoading ? (
                <Box textAlign="center" py={8}>
                  <Spinner size="lg" />
                  <Text mt={2}>加载中...</Text>
                </Box>
              ) : (
                <Box
                  flex={1}
                  overflowY="auto"
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                >
                  <Table.Root size="sm">
                    <Table.Header
                      position="sticky"
                      top={0}
                      bg="white"
                      zIndex={1}
                    >
                      <Table.Row>
                        <Table.ColumnHeader>任务名称</Table.ColumnHeader>
                        <Table.ColumnHeader>状态</Table.ColumnHeader>
                        <Table.ColumnHeader>创建时间</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {jobs.map((job) => (
                        <Table.Row
                          key={job.job_id}
                          cursor="pointer"
                          bg={
                            selectedJob?.job_id === job.job_id
                              ? "blue.50"
                              : "transparent"
                          }
                          _hover={{ bg: "gray.50" }}
                          onClick={() => handleSelectJob(job)}
                        >
                          <Table.Cell>
                            <Text
                              fontWeight={
                                selectedJob?.job_id === job.job_id
                                  ? "bold"
                                  : "normal"
                              }
                            >
                              {job.job_name}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge colorScheme={getStatusColor(job.status)}>
                              {getStatusText(job.status)}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm" color="gray.600">
                              {formatDate(job.created_at)}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}

              {!isLoading && jobs.length === 0 && (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">暂无计算任务</Text>
                </Box>
              )}

              {/* 分页控件 */}
              {!isLoading && totalJobs > 0 && (
                <VStack mt={4} gap={2}>
                  {totalJobs > pageSize && (
                    <PaginationRoot
                      count={totalJobs}
                      pageSize={pageSize}
                      page={currentPage}
                      onPageChange={(details) => setCurrentPage(details.page)}
                      variant="outline"
                      size="sm"
                    >
                      <HStack>
                        <PaginationPrevTrigger />
                        <PaginationItems />
                        <PaginationNextTrigger />
                      </HStack>
                    </PaginationRoot>
                  )}
                  <Text fontSize="sm" color="gray.600" textAlign="center">
                    显示第 {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, totalJobs)} 条，共{" "}
                    {totalJobs} 条记录
                  </Text>
                </VStack>
              )}
            </Box>

            {/* 右侧：任务详情 */}
            <Box flex={1} h="full" overflowY="auto">
              {selectedJob ? (
                <VStack align="start" gap={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    任务详情
                  </Text>

                  <Box
                    w="full"
                    p={4}
                    border="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                  >
                    <VStack align="start" gap={2}>
                      <HStack>
                        <Text fontWeight="bold">任务名称:</Text>
                        <Text>{selectedJob.job_name}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold">状态:</Text>
                        <Badge colorScheme={getStatusColor(selectedJob.status)}>
                          {getStatusText(selectedJob.status)}
                        </Badge>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold">创建时间:</Text>
                        <Text>{formatDate(selectedJob.created_at)}</Text>
                      </HStack>
                      {selectedJob.completed_at && (
                        <HStack>
                          <Text fontWeight="bold">完成时间:</Text>
                          <Text>{formatDate(selectedJob.completed_at)}</Text>
                        </HStack>
                      )}
                    </VStack>
                  </Box>

                  {/* 计算结果摘要 */}
                  {isLoadingData ? (
                    <Box textAlign="center" py={4}>
                      <Spinner />
                      <Text mt={2}>加载详情中...</Text>
                    </Box>
                  ) : (
                    resultSummary && (
                      <Box
                        w="full"
                        p={4}
                        border="1px"
                        borderColor="gray.200"
                        borderRadius="md"
                      >
                        <Text fontWeight="bold" mb={3}>
                          计算结果摘要
                        </Text>
                        <VStack align="start" gap={2} fontSize="sm">
                          <HStack>
                            <Text fontWeight="bold">总模拟时间:</Text>
                            <Text>
                              {resultSummary.total_time || "N/A"} 小时
                            </Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold">总步数:</Text>
                            <Text>{resultSummary.total_steps}</Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold">计算耗时:</Text>
                            <Text>
                              {resultSummary.calculation_time_seconds.toFixed(
                                2,
                              )}{" "}
                              秒
                            </Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold">收敛状态:</Text>
                            <Text>{resultSummary.convergence_status}</Text>
                          </HStack>
                          {resultSummary.final_mass_balance_error && (
                            <HStack>
                              <Text fontWeight="bold">最终质量平衡误差:</Text>
                              <Text>
                                {resultSummary.final_mass_balance_error.toExponential(
                                  2,
                                )}
                              </Text>
                            </HStack>
                          )}
                          <HStack>
                            <Text fontWeight="bold">最终总体积:</Text>
                            <Text>
                              {resultSummary.final_total_volume.toFixed(2)}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    )
                  )}
                </VStack>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">请选择一个计算任务查看详情</Text>
                </Box>
              )}
            </Box>
          </HStack>
        </DialogBody>

        <DialogFooter
          gap={3}
          flexWrap="wrap"
          flexShrink={0}
          borderTop="1px"
          borderColor="gray.200"
          pt={4}
        >
          <DialogCloseTrigger aria-label="关闭对话框" />
          <Button
            colorScheme="blue"
            onClick={handleLoadJobData}
            disabled={!selectedJob || isLoadingData}
            loading={isLoadingData}
            flexShrink={0}
          >
            加载数据
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default LoadCalculationDataDialog
