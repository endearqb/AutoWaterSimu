import {
  Alert,
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Icon,
  Progress,
  SimpleGrid,
  Spinner,
  Stat,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import type React from "react"
import {
  FiActivity,
  FiBarChart,
  FiClock,
  FiGitBranch,
  FiSettings,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi"

import { StatsService } from "@/client/sdk.gen"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/super-dashboard")({
  component: SuperDashboard,
})

// 状态颜色映射
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
    case "success":
      return "green"
    case "running":
    case "in_progress":
      return "blue"
    case "failed":
    case "error":
      return "red"
    case "pending":
    case "queued":
      return "yellow"
    default:
      return "gray"
  }
}

// 统计卡片组件
interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  colorScheme: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  colorScheme,
  trend,
}: StatCardProps) {
  return (
    <Card.Root>
      <Card.Body>
        <Flex justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontSize="sm" color="gray.600">
              {title}
            </Text>
            <Text fontSize="3xl" fontWeight="bold" lineHeight="1">
              {value}
            </Text>
            {subtitle && (
              <Text fontSize="sm" color="gray.500">
                {subtitle}
              </Text>
            )}
            {trend && (
              <HStack gap={1}>
                <Icon
                  as={FiTrendingUp}
                  color={trend.isPositive ? "green.500" : "red.500"}
                  transform={trend.isPositive ? "none" : "rotate(180deg)"}
                />
                <Text
                  fontSize="sm"
                  color={trend.isPositive ? "green.500" : "red.500"}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </Text>
              </HStack>
            )}
          </VStack>
          <Box p={3} bg={`${colorScheme}.100`} borderRadius="lg">
            <Icon as={icon} boxSize="6" color={`${colorScheme}.600`} />
          </Box>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

// 任务状态分布组件
interface JobStatusDistributionProps {
  title: string
  data: Record<string, number>
}

function JobStatusDistribution({ title, data }: JobStatusDistributionProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0)

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">{title}</Heading>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {Object.entries(data).map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0
            return (
              <Box key={status}>
                <Flex justify="space-between" mb={1}>
                  <HStack>
                    <Badge
                      colorScheme={getStatusColor(status)}
                      variant="subtle"
                    >
                      {status}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">
                      {count} 个任务
                    </Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {percentage.toFixed(1)}%
                  </Text>
                </Flex>
                <Progress.Root value={percentage} size="sm">
                  <Progress.Track borderRadius="full">
                    <Progress.Range bg={`${getStatusColor(status)}.500`} />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            )
          })}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

function SuperDashboard() {
  const { user: currentUser } = useAuth()

  const {
    data: dashboardStats,
    isLoading: isDashboardLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => StatsService.getDashboardStats(),
    enabled: currentUser?.is_superuser === true,
  })

  const { data: userStats, isLoading: isUserStatsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => StatsService.getUserStats(),
    enabled: currentUser?.is_superuser === true,
  })

  const isLoading = isDashboardLoading || isUserStatsLoading

  if (!currentUser?.is_superuser) {
    return (
      <Container maxW="full">
        <Box pt={12} m={4}>
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>您没有权限访问此页面。</Alert.Title>
          </Alert.Root>
        </Box>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container maxW="full">
        <Box pt={12} m={4} textAlign="center">
          <Spinner size="xl" />
          <Text mt={4}>加载统计数据中...</Text>
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxW="full">
        <Box pt={12} m={4}>
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>加载统计数据失败: {error.message}</Alert.Title>
          </Alert.Root>
        </Box>
      </Container>
    )
  }

  const stats = dashboardStats as any
  const userStatsData = userStats as any

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <VStack align="stretch" gap={8}>
          {/* 欢迎信息 */}
          <Box>
            <Heading size="xl" mb={2}>
              超级管理员控制台
            </Heading>
            <Text color="gray.600" fontSize="lg">
              欢迎回来，{currentUser?.full_name || currentUser?.email}！
            </Text>
          </Box>

          {/* 核心统计指标 */}
          <Box>
            <Heading size="lg" mb={4}>
              核心指标
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
              <StatCard
                title="总用户数"
                value={stats?.user_stats?.total_users || 0}
                subtitle={`活跃: ${stats?.user_stats?.active_users || 0}`}
                icon={FiUsers}
                colorScheme="blue"
                trend={{
                  value: stats?.user_stats?.recent_users || 0,
                  isPositive: true,
                }}
              />
              <StatCard
                title="总任务数"
                value={stats?.content_stats?.jobs?.total || 0}
                subtitle="所有类型任务"
                icon={FiActivity}
                colorScheme="green"
              />
              <StatCard
                title="总流程图"
                value={stats?.content_stats?.flowcharts?.total || 0}
                subtitle="所有类型流程图"
                icon={FiGitBranch}
                colorScheme="purple"
              />
              <StatCard
                title="超级管理员"
                value={stats?.user_stats?.superusers || 0}
                subtitle="系统管理员"
                icon={FiSettings}
                colorScheme="orange"
              />
            </SimpleGrid>
          </Box>

          {/* 详细统计 */}
          <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
            {/* 流程图分布 */}
            <Card.Root>
              <Card.Header>
                <HStack>
                  <Icon as={FiTarget} />
                  <Heading size="md">流程图分布</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  <Stat.Root>
                    <Stat.Label>物料平衡流程图</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.flowcharts?.material_balance || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label>ASM1 流程图</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.flowcharts?.asm1 || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label>ASM1 Slim 流程图</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.flowcharts?.asm1slim || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* 任务分布 */}
            <Card.Root>
              <Card.Header>
                <HStack>
                  <Icon as={FiBarChart} />
                  <Heading size="md">任务分布</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack align="stretch" gap={4}>
                  <Stat.Root>
                    <Stat.Label>物料平衡任务</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.jobs?.material_balance || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label>ASM1 任务</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.jobs?.asm1 || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label>ASM1 Slim 任务</Stat.Label>
                    <Stat.ValueText>
                      {stats?.content_stats?.jobs?.asm1slim || 0}
                    </Stat.ValueText>
                  </Stat.Root>
                </VStack>
              </Card.Body>
            </Card.Root>
          </Grid>

          {/* 任务状态分布 */}
          <Box>
            <Heading size="lg" mb={4}>
              任务状态分布
            </Heading>
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
              gap={6}
            >
              {stats?.job_status_stats?.material_balance && (
                <JobStatusDistribution
                  title="物料平衡任务状态"
                  data={stats.job_status_stats.material_balance}
                />
              )}
              {stats?.job_status_stats?.asm1 && (
                <JobStatusDistribution
                  title="ASM1 任务状态"
                  data={stats.job_status_stats.asm1}
                />
              )}
              {stats?.job_status_stats?.asm1slim && (
                <JobStatusDistribution
                  title="ASM1 Slim 任务状态"
                  data={stats.job_status_stats.asm1slim}
                />
              )}
            </Grid>
          </Box>

          {/* 用户类型分布 */}
          <Card.Root>
            <Card.Header>
              <HStack>
                <Icon as={FiUsers} />
                <Heading size="md">用户类型分布</Heading>
              </HStack>
            </Card.Header>
            <Card.Body>
              <HStack wrap="wrap" gap={4}>
                {stats?.user_stats?.user_type_distribution &&
                  Object.entries(stats.user_stats.user_type_distribution).map(
                    ([type, count]) => (
                      <Badge
                        key={type}
                        variant="subtle"
                        size="lg"
                        colorScheme="blue"
                      >
                        {type}: {count as React.ReactNode}
                      </Badge>
                    ),
                  )}
              </HStack>
            </Card.Body>
          </Card.Root>

          {/* 用户注册趋势 */}
          {userStatsData?.monthly_registrations &&
            userStatsData.monthly_registrations.length > 0 && (
              <Card.Root>
                <Card.Header>
                  <HStack>
                    <Icon as={FiTrendingUp} />
                    <Heading size="md">用户注册趋势</Heading>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} gap={4}>
                    {userStatsData.monthly_registrations
                      .slice(-6)
                      .map((item: any) => (
                        <Box
                          key={item.date}
                          textAlign="center"
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                        >
                          <Text fontSize="sm" color="gray.600">
                            {item.date}
                          </Text>
                          <Text fontSize="xl" fontWeight="bold">
                            {item.count}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            新用户
                          </Text>
                        </Box>
                      ))}
                  </SimpleGrid>
                </Card.Body>
              </Card.Root>
            )}

          {/* 活跃用户排行 */}
          <Box>
            <Heading size="lg" mb={4}>
              用户活跃度排行
            </Heading>
            <Grid
              templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
              gap={6}
            >
              <Card.Root>
                <Card.Header>
                  <HStack>
                    <Icon as={FiGitBranch} />
                    <Heading size="md">流程图创建排行</Heading>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>用户</Table.ColumnHeader>
                        <Table.ColumnHeader>流程图数量</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {stats?.activity_stats?.top_users_by_flowcharts?.map(
                        (user: any, index: number) => (
                          <Table.Row key={index}>
                            <Table.Cell>
                              <VStack align="start" gap={0}>
                                <Text fontWeight="medium">{user.name}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {user.email}
                                </Text>
                              </VStack>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant="outline" colorScheme="purple">
                                {user.flowchart_count}
                              </Badge>
                            </Table.Cell>
                          </Table.Row>
                        ),
                      )}
                    </Table.Body>
                  </Table.Root>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <HStack>
                    <Icon as={FiActivity} />
                    <Heading size="md">任务创建排行</Heading>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>用户</Table.ColumnHeader>
                        <Table.ColumnHeader>任务数量</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {stats?.activity_stats?.top_users_by_tasks?.map(
                        (user: any, index: number) => (
                          <Table.Row key={index}>
                            <Table.Cell>
                              <VStack align="start" gap={0}>
                                <Text fontWeight="medium">{user.name}</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {user.email}
                                </Text>
                              </VStack>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant="outline" colorScheme="green">
                                {user.task_count}
                              </Badge>
                            </Table.Cell>
                          </Table.Row>
                        ),
                      )}
                    </Table.Body>
                  </Table.Root>
                </Card.Body>
              </Card.Root>
            </Grid>
          </Box>

          {/* 最近活跃用户 */}
          {userStatsData?.user_activity && (
            <Card.Root>
              <Card.Header>
                <HStack>
                  <Icon as={FiClock} />
                  <Heading size="md">最近活跃用户</Heading>
                </HStack>
              </Card.Header>
              <Card.Body>
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>用户</Table.ColumnHeader>
                      <Table.ColumnHeader>用户类型</Table.ColumnHeader>
                      <Table.ColumnHeader>注册时间</Table.ColumnHeader>
                      <Table.ColumnHeader>活跃度</Table.ColumnHeader>
                      <Table.ColumnHeader>状态</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {userStatsData.user_activity
                      .slice(0, 10)
                      .map((user: any) => (
                        <Table.Row key={user.id}>
                          <Table.Cell>
                            <VStack align="start" gap={0}>
                              <Text fontWeight="medium">{user.name}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {user.email}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="subtle">{user.user_type}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString(
                                    "zh-CN",
                                  )
                                : "未知"}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack align="start" gap={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                总计: {user.activity?.total || 0}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                流程图: {user.activity?.flowcharts || 0} | 任务:{" "}
                                {user.activity?.jobs || 0}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorScheme={user.is_active ? "green" : "red"}
                              variant="subtle"
                            >
                              {user.is_active ? "活跃" : "非活跃"}
                            </Badge>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table.Root>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Box>
    </Container>
  )
}
