import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { useState } from "react"
import { FiPlus, FiTrash2 } from "react-icons/fi"
import useFlowStore from "../../../stores/flowStore"
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../../ui/dialog"

interface PropertyPanelProps {
  isNode: boolean
}

function PropertyPanel({ isNode }: PropertyPanelProps) {
  const {
    selectedNode,
    selectedEdge,
    nodes,
    customParameters,
    edgeParameterConfigs,
    updateNodeParameter,
    updateEdgeFlow,
    updateEdgeParameterConfig,
    addCustomParameter,
    // removeCustomParameter,
    addNodeParameter,
    removeNodeParameter,
    addEdgeParameter,
    removeEdgeParameter,
  } = useFlowStore()

  const [nameError, setNameError] = useState("")
  const [volumeError, setVolumeError] = useState("")
  const [flowRateError, setFlowRateError] = useState("")
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({})
  const [isAddingParam, setIsAddingParam] = useState(false)
  const [newParamName, setNewParamName] = useState("")
  const [newParamError, setNewParamError] = useState("")
  const [newParamDescription, setNewParamDescription] = useState<string>("")
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(
    null,
  )
  const [pendingParamName, setPendingParamName] = useState<string>("")

  const {
    open: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure()

  const handleNodeInputChange = (paramName: string, value: any) => {
    if (selectedNode) {
      if (paramName === "label" && !value.trim()) {
        setNameError("名称不能为空")
      } else {
        setNameError("")
      }

      if (paramName === "volume") {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setVolumeError("体积必须是非负数")
        } else {
          setVolumeError("")
        }
        // 如果输入为0，自动设置为默认的最小值
        if (numValue === 0) {
          value = "1e-3"
        }
      }

      // 验证自定义参数
      if (customParameters.some((param) => param.name === paramName)) {
        const numValue = Number.parseFloat(value)
        if (value && (Number.isNaN(numValue) || numValue < 0)) {
          setParamErrors((prev) => ({
            ...prev,
            [paramName]: "参数值必须是非负数",
          }))
        } else {
          setParamErrors((prev) => {
            const { [paramName]: removed, ...rest } = prev
            return rest
          })
        }
      }

      updateNodeParameter(selectedNode.id, paramName, value)
    }
  }

  // const handleEdgeInputChange = (paramName: string, value: any) => {
  //   if (selectedEdge) {
  //     // 验证自定义参数
  //     if (customParameters.some(param => param.name === paramName)) {
  //       const numValue = parseFloat(value);
  //       if (value && (isNaN(numValue) || numValue < 0)) {
  //         setParamErrors(prev => ({ ...prev, [paramName]: '参数值必须是非负数' }));
  //       } else {
  //         setParamErrors(prev => {
  //           const { [paramName]: removed, ...rest } = prev;
  //           return rest;
  //         });
  //       }
  //     }
  //     updateEdgeParameter(selectedEdge.id, paramName, value);
  //   }
  // };

  const handleEdgeFlowChange = (value: string) => {
    if (selectedEdge) {
      const numValue = Number.parseFloat(value)
      if (value && (Number.isNaN(numValue) || numValue < 0)) {
        setFlowRateError("流量必须是非负数")
      } else {
        setFlowRateError("")
      }
      updateEdgeFlow(selectedEdge.id, numValue || 0)
    }
  }

  const handleAddParameter = () => {
    setIsAddingParam(true)
    setNewParamName("")
    setNewParamDescription("")
    setNewParamError("")
  }

  const handleSaveNewParameter = () => {
    // 清除之前的错误
    setNewParamError("")

    if (!newParamName.trim()) {
      setNewParamError("参数名不能为空")
      return
    }

    if (customParameters.some((param) => param.name === newParamName.trim())) {
      setNewParamError("参数名已存在")
      return
    }

    if (["label", "volume"].includes(newParamName.trim())) {
      setNewParamError("参数名与系统参数冲突")
      return
    }

    setPendingAction("save")
    setPendingParamName(newParamName.trim())
    onConfirmOpen()
  }

  const handleSaveParameter = () => {
    handleSaveNewParameter()
  }

  const handleCancelAddParameter = () => {
    setIsAddingParam(false)
    setNewParamName("")
    setNewParamDescription("")
    setNewParamError("")
  }

  const handleDeleteParameter = (paramName: string) => {
    setPendingAction("delete")
    setPendingParamName(paramName)
    onConfirmOpen()
  }

  const handleConfirmAction = () => {
    if (pendingAction === "save") {
      // 添加到参数定义列表
      addCustomParameter(
        pendingParamName,
        newParamDescription.trim() || undefined,
      )

      // 为当前选中的元素添加参数
      if (isNode && selectedNode) {
        addNodeParameter(
          selectedNode.id,
          pendingParamName,
          newParamDescription.trim() || undefined,
          0,
        )
      } else if (!isNode && selectedEdge) {
        addEdgeParameter(
          selectedEdge.id,
          pendingParamName,
          newParamDescription.trim() || undefined,
          0,
        )
      }

      setNewParamName("")
      setNewParamDescription("")
      setNewParamError("")
      setIsAddingParam(false)
    } else if (pendingAction === "delete" && pendingParamName) {
      // 从当前选中的元素移除参数
      if (isNode && selectedNode) {
        removeNodeParameter(selectedNode.id, pendingParamName)
      } else if (!isNode && selectedEdge) {
        removeEdgeParameter(selectedEdge.id, pendingParamName)
      }
    }

    setPendingAction(null)
    setPendingParamName("")
    onConfirmClose()
  }

  const renderCustomParameters = () => {
    // 对于节点，显示data中存在的自定义参数
    // 对于边，显示所有定义的自定义参数（因为边的自定义参数存储在edgeParameterConfigs中）
    const elementParameters = isNode
      ? selectedNode?.data
        ? Object.keys(selectedNode.data).filter((key) =>
            customParameters.some((param) => param.name === key),
          )
        : []
      : customParameters.map((param) => param.name) // 边显示所有自定义参数

    return elementParameters.map((paramName) => {
      const param = customParameters.find((p) => p.name === paramName)
      if (!param) return null
      if (isNode) {
        // 节点参数的原有逻辑
        const currentValue = (selectedNode?.data?.[param.name] as number) || ""
        const hasError = paramErrors[param.name]

        return (
          <Field.Root key={param.name} invalid={!!hasError}>
            <HStack align="flex-start" gap={4}>
              <HStack minW="80px" pt={2}>
                <Text>{param.label}</Text>
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="删除参数"
                  onClick={() => handleDeleteParameter(paramName)}
                >
                  <FiTrash2 />
                </IconButton>
              </HStack>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentValue}
                  onChange={(e) =>
                    handleNodeInputChange(param.name, e.target.value)
                  }
                  className="nodrag"
                  placeholder={
                    param.description || "自定义参数，数据类型：浮点数"
                  }
                />
                {hasError && <Field.ErrorText>{hasError}</Field.ErrorText>}
              </Box>
            </HStack>
          </Field.Root>
        )
      }
      // 连接线参数的特殊逻辑
      const edgeId = selectedEdge?.id
      const sourceNodeId = selectedEdge?.source
      const sourceNode = nodes.find((node) => node.id === sourceNodeId)
      const sourceParamValue = (sourceNode?.data?.[param.name] as number) || 0

      const config = edgeParameterConfigs[edgeId || ""]?.[param.name] || {
        a: 1,
        b: 0,
      }
      const calculatedValue = config.a * sourceParamValue + config.b

      const handleConfigChange = (field: "a" | "b", value: string) => {
        if (edgeId) {
          const numValue = Number.parseFloat(value) || 0
          const newConfig = { ...config, [field]: numValue }

          // a和b互斥逻辑：只能有一个不为0
          if (field === "a" && numValue !== 0) {
            // 当修改a为非0时，b自动变为0
            newConfig.b = 0
          } else if (field === "b" && numValue !== 0) {
            // 当修改b为非0时，a自动变为0
            newConfig.a = 0
          }

          updateEdgeParameterConfig(edgeId, paramName, newConfig)
        }
      }

      return (
        <Field.Root key={paramName}>
          <HStack align="flex-start" gap={4}>
            <HStack minW="80px" pt={2}>
              <Text>{param.label}</Text>
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                aria-label="删除参数"
                onClick={() => handleDeleteParameter(paramName)}
              >
                <FiTrash2 />
              </IconButton>
            </HStack>
            <Box flex={1}>
              {/* 显示计算后的具体数值（不可修改） */}
              <Input
                value={calculatedValue.toFixed(2)}
                readOnly
                placeholder={param.description || `${param.label}，mg/L`}
                style={{ backgroundColor: "#f7fafc", cursor: "not-allowed" }}
              />

              {/* a和b系数标签和输入框在同一行 */}
              <HStack gap={2} mt={2} align="center">
                <Text fontSize="sm" minW="12px">
                  a
                </Text>
                <Input
                  type="number"
                  step="0.01"
                  value={config.a}
                  onChange={(e) => handleConfigChange("a", e.target.value)}
                  placeholder="10"
                  size="sm"
                  flex={1}
                />
                <Text fontSize="sm" minW="12px">
                  b
                </Text>
                <Input
                  type="number"
                  step="0.01"
                  value={config.b}
                  onChange={(e) => handleConfigChange("b", e.target.value)}
                  placeholder=""
                  size="sm"
                  flex={1}
                />
              </HStack>
            </Box>
          </HStack>
        </Field.Root>
      )
    })
  }

  return (
    <>
      <Stack gap={4} align="stretch">
        {/* 节点基础参数 */}
        {isNode && selectedNode && (
          <>
            <Field.Root required invalid={!!nameError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  名称
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={(selectedNode.data?.label as string) || ""}
                    onChange={(e) =>
                      handleNodeInputChange("label", e.target.value)
                    }
                    className="nodrag"
                    placeholder="节点的显示名称"
                  />
                  {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
                </Box>
              </HStack>
            </Field.Root>

            <Field.Root invalid={!!volumeError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  体积(m³)
                </Field.Label>
                <Box flex={1}>
                  <Input
                    type="number"
                    step="1e-3"
                    min="1e-3"
                    value={(selectedNode.data?.volume as number) || "1e-3"}
                    onChange={(e) =>
                      handleNodeInputChange("volume", e.target.value)
                    }
                    className="nodrag"
                    placeholder="节点的体积参数，单位：立方米，最小值：1e-3"
                  />
                  {volumeError && (
                    <Field.ErrorText>{volumeError}</Field.ErrorText>
                  )}
                </Box>
              </HStack>
            </Field.Root>
          </>
        )}

        {/* 连接线基础参数 */}
        {!isNode && selectedEdge && (
          <Field.Root invalid={!!flowRateError}>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW="80px" pt={2}>
                流量(m³/h)
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(selectedEdge.data?.flow as number) || ""}
                  onChange={(e) => handleEdgeFlowChange(e.target.value)}
                  placeholder="连接线的流量参数，单位：立方米/小时"
                />
                {flowRateError && (
                  <Field.ErrorText>{flowRateError}</Field.ErrorText>
                )}
              </Box>
            </HStack>
          </Field.Root>
        )}

        {/* 渲染自定义参数 */}
        {renderCustomParameters()}

        {/* 添加参数区域 */}
        {isAddingParam ? (
          <Stack gap={3}>
            <Field.Root required invalid={!!newParamError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  参数名称
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={newParamName}
                    onChange={(e) => setNewParamName(e.target.value)}
                    placeholder="参数名称"
                    className={isNode ? "nodrag" : ""}
                  />
                  {newParamError && (
                    <Field.ErrorText>{newParamError}</Field.ErrorText>
                  )}
                </Box>
              </HStack>
            </Field.Root>

            <Field.Root>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  填写说明
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={newParamDescription}
                    onChange={(e) => setNewParamDescription(e.target.value)}
                    placeholder="对参数的详细说明，非必填"
                    className={isNode ? "nodrag" : ""}
                  />
                </Box>
              </HStack>
            </Field.Root>

            <HStack>
              <Button
                colorScheme="green"
                onClick={handleSaveParameter}
                size="sm"
              >
                确认
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelAddParameter}
                size="sm"
              >
                取消
              </Button>
            </HStack>
          </Stack>
        ) : (
          <Button variant="outline" onClick={handleAddParameter} size="sm">
            <FiPlus />
            增加参数
          </Button>
        )}
      </Stack>

      <DialogRoot
        open={isConfirmOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            onConfirmClose()
            setPendingAction(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "save" ? "确认添加参数" : "确认删除参数"}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {pendingAction === "save"
              ? `确定要为当前${isNode ? "节点" : "连接线"}添加参数 "${pendingParamName}" 吗？`
              : `确定要从当前${isNode ? "节点" : "连接线"}删除参数 "${pendingParamName}" 吗？此操作不可恢复。`}
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button
                variant="outline"
                onClick={() => {
                  onConfirmClose()
                  setPendingAction(null)
                }}
              >
                取消
              </Button>
            </DialogActionTrigger>
            <Button colorScheme="red" onClick={handleConfirmAction}>
              {pendingAction === "save" ? "添加" : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

export default PropertyPanel
