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

import type { BaseModelState } from "../../../stores/baseModelStore"
import type { RFState } from "../../../stores/flowStore"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "../../ui/pagination"

/**
 * 通用LoadCalculationDataDialog组件的Props接口
 * @template TJob - 任务类型
 * @template TFlowChart - 流程图类型
 * @template TInput - 输入数据类型
 * @template TResult - 结果数据类型
 * @template TResultSummary - 结果摘要类型
 */
export interface BaseLoadCalculationDataDialogProps<
  TJob,
  TFlowChart,
  TInput,
  TResult,
  TResultSummary,
> {
  /** 是否打开对话框 */
  isOpen: boolean
  /** 关闭对话框回调 */
  onClose: () => void
  /** 流程图Store */
  flowStore?: () => RFState
  /** 模型Store */
  modelStore?: () => BaseModelState<
    TJob,
    TFlowChart,
    TInput,
    TResult,
    TResultSummary
  >
  /** 配置选项 */
  config?: {
    /** 页面大小 */
    pageSize?: number
    /** 任务名称字段 */
    jobNameField?: keyof TJob
    /** 任务ID字段 */
    jobIdField?: keyof TJob
    /** 任务状态字段 */
    jobStatusField?: keyof TJob
    /** 任务创建时间字段 */
    jobCreatedAtField?: keyof TJob
    /** 任务完成时间字段 */
    jobCompletedAtField?: keyof TJob
    /** 自定义状态文本映射 */
    statusTextMap?: Record<string, string>
    /** 自定义状态颜色映射 */
    statusColorMap?: Record<string, string>
    /** 自定义数据加载处理函数 */
    onLoadJobData?: (
      job: TJob,
      flowStore?: RFState,
      modelStore?: BaseModelState<
        TJob,
        TFlowChart,
        TInput,
        TResult,
        TResultSummary
      >,
    ) => Promise<void>
    /** 自定义结果摘要渲染函数 */
    renderResultSummary?: (summary: TResultSummary) => React.ReactNode
  }
}

/**
 * 通用LoadCalculationDataDialog组件
 * 管理计算任务的加载和显示
 * @template TJob - 任务类型
 * @template TFlowChart - 流程图类型
 * @template TInput - 输入数据类型
 * @template TResult - 结果数据类型
 * @template TResultSummary - 结果摘要类型
 */
const BaseLoadCalculationDataDialog = <
  TJob extends Record<string, any>,
  TFlowChart extends Record<string, any>,
  TInput extends Record<string, any>,
  TResult extends Record<string, any>,
  TResultSummary extends Record<string, any>,
>({
  isOpen,
  onClose,
  flowStore,
  modelStore,
  config = {},
}: BaseLoadCalculationDataDialogProps<
  TJob,
  TFlowChart,
  TInput,
  TResult,
  TResultSummary
>) => {
  const {
    pageSize = 10,
    jobNameField = "job_name" as keyof TJob,
    jobIdField = "job_id" as keyof TJob,
    jobStatusField = "status" as keyof TJob,
    jobCreatedAtField = "created_at" as keyof TJob,
    jobCompletedAtField = "completed_at" as keyof TJob,
    statusTextMap = {
      pending: "等待中",
      running: "计算中",
      success: "已完成",
      failed: "失败",
      cancelled: "已取消",
    },
    statusColorMap = {
      pending: "yellow",
      running: "blue",
      success: "green",
      failed: "red",
      cancelled: "gray",
    },
    onLoadJobData,
    renderResultSummary,
  } = config

  const [jobs, setJobs] = useState<TJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<TJob | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [resultSummary, setResultSummary] = useState<TResultSummary | null>(
    null,
  )

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)

  // 获取store状态
  const flowState = flowStore?.()
  const modelState = modelStore?.()

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

      if (modelState?.getUserJobs) {
        const response: { data: TJob[]; count: number } =
          await modelState.getUserJobs(skip, pageSize)
        // 处理标准格式：{ data: TJob[], count: number }
        setJobs(response.data)
        setTotalJobs(response.count)
      } else {
        // 如果没有getUserJobs方法，使用userJobs状态
        const userJobs = modelState?.userJobs || []
        const startIndex = skip
        const endIndex = startIndex + pageSize
        setJobs(userJobs.slice(startIndex, endIndex))
        setTotalJobs(userJobs.length)
      }
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
    return statusTextMap[status] || "未知"
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    return statusColorMap[status] || "gray"
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN")
  }

  // 选择任务
  const handleSelectJob = async (job: TJob) => {
    setSelectedJob(job)
    setIsLoadingData(true)

    try {
      // 获取计算结果摘要
      const status = job[jobStatusField] as string
      if (status === "success" && modelState?.getResultSummary) {
        const jobId = job[jobIdField] as string
        const summary = await modelState.getResultSummary(jobId)
        setResultSummary(summary as unknown as TResultSummary)
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
      if (onLoadJobData) {
        // 使用自定义加载函数
        await onLoadJobData(selectedJob, flowState, modelState)
      } else {
        // 默认加载逻辑
        await defaultLoadJobData(selectedJob)
      }

      const jobName = selectedJob[jobNameField] as string
      const { toaster } = await import("../../ui/toaster")
      toaster.create({
        title: "加载成功",
        description: `已加载计算任务：${jobName}`,
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

  // 默认加载任务数据逻辑
  const defaultLoadJobData = async (job: TJob) => {
    const jobId = job[jobIdField] as string
    const jobName = job[jobNameField] as string
    const status = job[jobStatusField] as string

    // 设置流程图名称和当前任务ID
    if (flowState?.setCurrentFlowChartName) {
      flowState.setCurrentFlowChartName(jobName)
    }
    if (flowState?.setCurrentJobId) {
      flowState.setCurrentJobId(jobId)
    }

    // 如果任务已完成，加载计算结果数据
    if (status === "success" && modelState) {
      try {
        // 并行加载计算结果数据
        const promises: Promise<any>[] = []
        if (modelState.getResultSummary) {
          promises.push(modelState.getResultSummary(jobId))
        }
        if (modelState.getFinalValues) {
          promises.push(modelState.getFinalValues(jobId))
        }
        if (modelState.getCalculationStatus) {
          promises.push(modelState.getCalculationStatus(jobId))
        }

        await Promise.all(promises)
      } catch (error) {
        console.error("加载计算结果数据失败:", error)
        // 不阻止主要的数据加载流程
      }
    }
  }

  // 默认结果摘要渲染
  const defaultRenderResultSummary = (summary: TResultSummary) => {
    return (
      <VStack align="start" gap={2} fontSize="sm">
        {Object.entries(summary).map(([key, value]) => (
          <HStack key={key}>
            <Text fontWeight="bold">{key}:</Text>
            <Text>{String(value)}</Text>
          </HStack>
        ))}
      </VStack>
    )
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
                      {jobs.map((job, index) => {
                        const jobId = job[jobIdField] as string
                        const jobName = job[jobNameField] as string
                        const status = job[jobStatusField] as string
                        const createdAt = job[jobCreatedAtField] as string

                        return (
                          <Table.Row
                            key={jobId || index}
                            cursor="pointer"
                            bg={
                              selectedJob && selectedJob[jobIdField] === jobId
                                ? "blue.50"
                                : "transparent"
                            }
                            _hover={{ bg: "gray.50" }}
                            onClick={() => handleSelectJob(job)}
                          >
                            <Table.Cell>
                              <Text
                                fontWeight={
                                  selectedJob &&
                                  selectedJob[jobIdField] === jobId
                                    ? "bold"
                                    : "normal"
                                }
                              >
                                {jobName}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge colorScheme={getStatusColor(status)}>
                                {getStatusText(status)}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontSize="sm" color="gray.600">
                                {formatDate(createdAt)}
                              </Text>
                            </Table.Cell>
                          </Table.Row>
                        )
                      })}
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
                        <Text>{selectedJob[jobNameField] as string}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold">状态:</Text>
                        <Badge
                          colorScheme={getStatusColor(
                            selectedJob[jobStatusField] as string,
                          )}
                        >
                          {getStatusText(selectedJob[jobStatusField] as string)}
                        </Badge>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold">创建时间:</Text>
                        <Text>
                          {formatDate(selectedJob[jobCreatedAtField] as string)}
                        </Text>
                      </HStack>
                      {selectedJob[jobCompletedAtField] && (
                        <HStack>
                          <Text fontWeight="bold">完成时间:</Text>
                          <Text>
                            {formatDate(
                              selectedJob[jobCompletedAtField] as string,
                            )}
                          </Text>
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
                        {renderResultSummary
                          ? renderResultSummary(resultSummary)
                          : defaultRenderResultSummary(resultSummary)}
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

export default BaseLoadCalculationDataDialog
