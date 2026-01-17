import { Box, Text } from "@chakra-ui/react"
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from "chart.js"
import type React from "react"
import { useEffect, useRef } from "react"
import { Chart } from "react-chartjs-2"
import type { ChartConfig } from "../../data/articles/types"

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

interface InteractiveChartProps {
  config: ChartConfig
  height?: number
  onDataUpdate?: (newData: any) => void
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  config,
  height = 350,
  onDataUpdate,
}) => {
  const chartRef = useRef<ChartJS>(null)

  useEffect(() => {
    if (chartRef.current && onDataUpdate) {
      // const chart = chartRef.current;
      // 可以在这里添加图表交互逻辑
    }
  }, [config.data, onDataUpdate])

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: !!config.title,
        text: config.title,
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
    scales:
      config.type === "radar"
        ? {}
        : {
            x: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
            y: {
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
          },
    ...config.options,
  }

  return (
    <Box
      w="100%"
      h={`${height}px`}
      bg="white"
      p={4}
      borderRadius="lg"
      shadow="md"
    >
      {config.title && (
        <Text fontSize="lg" fontWeight="bold" mb={4} textAlign="center">
          {config.title}
        </Text>
      )}
      <Box h={`${height - (config.title ? 80 : 40)}px`}>
        <Chart
          ref={chartRef}
          type={config.type}
          data={config.data}
          options={defaultOptions}
        />
      </Box>
    </Box>
  )
}
