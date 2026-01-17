import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type ExternalLegendBarSeries = {
  key: string
  dataKey: string
  name: string
  color: string
}

type ChartMargin = { top: number; right: number; bottom: number; left: number }

interface ExternalLegendBarChartProps {
  data: unknown[]
  xDataKey: string
  xAxisHeight: number
  series: ExternalLegendBarSeries[]
  plotAreaHeight?: number
  margin?: ChartMargin
  xAxisAngle?: number
  xAxisTextAnchor?: "start" | "middle" | "end"
  emptyText?: string
}

const ExternalLegendBarChart: React.FC<ExternalLegendBarChartProps> = ({
  data,
  xDataKey,
  xAxisHeight,
  series,
  plotAreaHeight = 450,
  margin,
  xAxisAngle,
  xAxisTextAnchor,
  emptyText = "暂无数据",
}) => {
  const chartMargin = useMemo<ChartMargin>(() => {
    return margin ?? { top: 20, right: 30, left: 20, bottom: 10 }
  }, [margin])

  const chartAreaHeight = useMemo(() => {
    return plotAreaHeight + chartMargin.top + chartMargin.bottom + xAxisHeight
  }, [chartMargin.bottom, chartMargin.top, plotAreaHeight, xAxisHeight])

  if (!data || data.length === 0) {
    return (
      <Box w="full" py={8}>
        <Text color="gray.500" textAlign="center">
          {emptyText}
        </Text>
      </Box>
    )
  }

  return (
    <VStack w="full" align="start" gap={3}>
      <Box w="full" h={chartAreaHeight}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xDataKey}
              height={xAxisHeight}
              angle={xAxisAngle}
              textAnchor={xAxisTextAnchor}
            />
            <YAxis />
            <Tooltip />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {series.length > 0 && (
        <Box w="full" display="flex" flexWrap="wrap" gap={2}>
          {series.map((s) => (
            <HStack
              key={s.key}
              gap={2}
              px={2}
              py={1}
              bg="gray.50"
              borderRadius="sm"
            >
              <Box w="12px" h="3px" bg={s.color} borderRadius="full" />
              <Text fontSize="sm" color="gray.700">
                {s.name}
              </Text>
            </HStack>
          ))}
        </Box>
      )}
    </VStack>
  )
}

export default ExternalLegendBarChart
