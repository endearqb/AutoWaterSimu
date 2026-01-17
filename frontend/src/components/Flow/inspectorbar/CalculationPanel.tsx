import { Box, Field, HStack, Stack, Text } from "@chakra-ui/react"
import { Slider } from "@chakra-ui/react"
import { useState } from "react"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"

interface CalculationPanelProps {
  store?: () => RFState // 可选的自定义 store
}

function CalculationPanel({ store }: CalculationPanelProps = {}) {
  const flowStore = store || useFlowStore
  const { selectedNode, updateNodeParameter } = flowStore()
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})

  // 通用计算参数配置
  const calculationParameters = [
    {
      name: "density",
      label: "密度",
      description: "流体密度",
      min: 800,
      max: 1200,
      step: 1,
      defaultValue: 1000,
      unit: "kg/m³",
    },
    {
      name: "viscosity",
      label: "粘度",
      description: "动力粘度",
      min: 0.001,
      max: 0.01,
      step: 0.0001,
      defaultValue: 0.001,
      unit: "Pa·s",
    },
    {
      name: "temperature",
      label: "温度",
      description: "操作温度",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
      unit: "°C",
    },
    {
      name: "pressure",
      label: "压力",
      description: "操作压力",
      min: 80,
      max: 120,
      step: 1,
      defaultValue: 101.325,
      unit: "kPa",
    },
    {
      name: "efficiency",
      label: "效率",
      description: "设备效率",
      min: 0.1,
      max: 1.0,
      step: 0.01,
      defaultValue: 0.85,
      unit: "-",
    },
  ]

  const handleParameterChange = (
    paramName: string,
    value: string,
    min: number,
    max: number,
  ) => {
    if (!selectedNode) return

    const numValue = Number.parseFloat(value)

    // 验证参数值 - 只有当值不是NaN且超出范围时才报错
    if (!Number.isNaN(numValue) && (numValue < min || numValue > max)) {
      setParamErrors((prev) => ({
        ...prev,
        [paramName]: `参数值必须在 ${min} - ${max} 范围内`,
      }))
    } else {
      setParamErrors((prev) => {
        const { [paramName]: removed, ...rest } = prev
        return rest
      })
    }

    // 只有当值是有效数字时才更新
    if (!Number.isNaN(numValue)) {
      updateNodeParameter(selectedNode.id, paramName, numValue)
    }
  }

  if (!selectedNode) {
    return (
      <Box>
        <Text color="gray.500">请选择一个节点查看计算参数</Text>
      </Box>
    )
  }

  return (
    <Stack gap={6} align="stretch">
      <Box>
        <Text fontSize="lg" fontWeight="semibold" mb={4}>
          计算参数设置
        </Text>

        <Stack gap={4}>
          {calculationParameters.map((param) => {
            const currentValue = Number(
              selectedNode.data?.[param.name] ?? param.defaultValue,
            )
            const hasError = paramErrors[param.name]

            return (
              <Field.Root key={param.name} invalid={!!hasError}>
                <Slider.Root
                  value={[currentValue]}
                  onValueChange={(details) =>
                    handleParameterChange(
                      param.name,
                      details.value[0].toString(),
                      param.min,
                      param.max,
                    )
                  }
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  width="100%"
                  mb={4}
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm">
                      {param.label} ({param.unit})
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

                <Text fontSize="xs" color="gray.600" mb={2}>
                  {param.description}
                </Text>

                {hasError && <Field.ErrorText>{hasError}</Field.ErrorText>}
              </Field.Root>
            )
          })}
        </Stack>
      </Box>

      <Box>
        <Text fontSize="sm" color="blue.600" fontStyle="italic">
          💡 提示：这些参数会影响流程计算结果，建议根据实际工艺条件进行设置。
        </Text>
      </Box>
    </Stack>
  )
}

export default CalculationPanel
