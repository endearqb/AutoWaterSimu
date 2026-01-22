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
import { useI18n } from "../../../i18n"
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
  const { t } = useI18n()
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
        setNameError(t("flow.propertyPanel.errors.nameRequired"))
      } else {
        setNameError("")
      }

      if (paramName === "volume") {
        const numValue = Number.parseFloat(value)
        if (Number.isNaN(numValue) || numValue < 0) {
          setVolumeError(t("flow.propertyPanel.errors.volumeNonNegative"))
        } else {
          setVolumeError("")
        }
        if (numValue === 0) {
          value = "1e-3"
        }
      }

      if (customParameters.some((param) => param.name === paramName)) {
        const numValue = Number.parseFloat(value)
        if (value && (Number.isNaN(numValue) || numValue < 0)) {
          setParamErrors((prev) => ({
            ...prev,
            [paramName]: t("flow.propertyPanel.errors.paramNonNegative"),
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

  const handleEdgeFlowChange = (value: string) => {
    if (selectedEdge) {
      const numValue = Number.parseFloat(value)
      if (value && (Number.isNaN(numValue) || numValue < 0)) {
        setFlowRateError(t("flow.propertyPanel.errors.flowNonNegative"))
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
    setNewParamError("")

    if (!newParamName.trim()) {
      setNewParamError(t("flow.propertyPanel.errors.paramNameRequired"))
      return
    }

    if (customParameters.some((param) => param.name === newParamName.trim())) {
      setNewParamError(t("flow.propertyPanel.errors.paramNameExists"))
      return
    }

    if (["label", "volume"].includes(newParamName.trim())) {
      setNewParamError(t("flow.propertyPanel.errors.paramNameConflict"))
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
      addCustomParameter(
        pendingParamName,
        newParamDescription.trim() || undefined,
      )

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
    const elementParameters = isNode
      ? selectedNode?.data
        ? Object.keys(selectedNode.data).filter((key) =>
            customParameters.some((param) => param.name === key),
          )
        : []
      : customParameters.map((param) => param.name)

    return elementParameters.map((paramName) => {
      const param = customParameters.find((p) => p.name === paramName)
      if (!param) return null
      if (isNode) {
        const currentValue = (selectedNode?.data?.[param.name] as number) || ""
        const hasError = paramErrors[param.name]
        const label = t(param.label)
        const description = param.description
          ? t(param.description)
          : t("flow.propertyPanel.customParamPlaceholder")

        return (
          <Field.Root key={param.name} invalid={!!hasError}>
            <HStack align="flex-start" gap={4}>
              <HStack minW="80px" pt={2}>
                <Text>{label}</Text>
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  aria-label={t("flow.propertyPanel.deleteParamAriaLabel")}
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
                  placeholder={description}
                />
                {hasError && <Field.ErrorText>{hasError}</Field.ErrorText>}
              </Box>
            </HStack>
          </Field.Root>
        )
      }

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

          if (field === "a" && numValue !== 0) {
            newConfig.b = 0
          } else if (field === "b" && numValue !== 0) {
            newConfig.a = 0
          }

          updateEdgeParameterConfig(edgeId, paramName, newConfig)
        }
      }

      return (
        <Field.Root key={paramName}>
          <HStack align="flex-start" gap={4}>
            <HStack minW="80px" pt={2}>
              <Text>{t(param.label)}</Text>
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                aria-label={t("flow.propertyPanel.deleteParamAriaLabel")}
                onClick={() => handleDeleteParameter(paramName)}
              >
                <FiTrash2 />
              </IconButton>
            </HStack>
            <Box flex={1}>
              <Input
                value={calculatedValue.toFixed(2)}
                readOnly
                placeholder={
                  param.description ? t(param.description) : t(param.label)
                }
                style={{ backgroundColor: "#f7fafc", cursor: "not-allowed" }}
              />

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

  const targetLabel = t(
    isNode ? "flow.propertyPanel.target.node" : "flow.propertyPanel.target.edge",
  )

  return (
    <>
      <Stack gap={4} align="stretch">
        {isNode && selectedNode && (
          <>
            <Field.Root required invalid={!!nameError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  {t("flow.propertyPanel.nameLabel")}
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={(selectedNode.data?.label as string) || ""}
                    onChange={(e) =>
                      handleNodeInputChange("label", e.target.value)
                    }
                    className="nodrag"
                    placeholder={t("flow.propertyPanel.namePlaceholder")}
                  />
                  {nameError && <Field.ErrorText>{nameError}</Field.ErrorText>}
                </Box>
              </HStack>
            </Field.Root>

            <Field.Root invalid={!!volumeError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  {t("flow.propertyPanel.volumeLabel")}
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
                    placeholder={t("flow.propertyPanel.volumePlaceholder")}
                  />
                  {volumeError && (
                    <Field.ErrorText>{volumeError}</Field.ErrorText>
                  )}
                </Box>
              </HStack>
            </Field.Root>
          </>
        )}

        {!isNode && selectedEdge && (
          <Field.Root invalid={!!flowRateError}>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW="80px" pt={2}>
                {t("flow.propertyPanel.flowLabel")}
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(selectedEdge.data?.flow as number) || ""}
                  onChange={(e) => handleEdgeFlowChange(e.target.value)}
                  placeholder={t("flow.propertyPanel.flowPlaceholder")}
                />
                {flowRateError && (
                  <Field.ErrorText>{flowRateError}</Field.ErrorText>
                )}
              </Box>
            </HStack>
          </Field.Root>
        )}

        {renderCustomParameters()}

        {isAddingParam ? (
          <Stack gap={3}>
            <Field.Root required invalid={!!newParamError}>
              <HStack align="flex-start" gap={4}>
                <Field.Label minW="80px" pt={2}>
                  {t("flow.propertyPanel.paramNameLabel")}
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={newParamName}
                    onChange={(e) => setNewParamName(e.target.value)}
                    placeholder={t("flow.propertyPanel.paramNamePlaceholder")}
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
                  {t("flow.propertyPanel.paramDescriptionLabel")}
                </Field.Label>
                <Box flex={1}>
                  <Input
                    value={newParamDescription}
                    onChange={(e) => setNewParamDescription(e.target.value)}
                    placeholder={t(
                      "flow.propertyPanel.paramDescriptionPlaceholder",
                    )}
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
                {t("common.confirm")}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelAddParameter}
                size="sm"
              >
                {t("common.cancel")}
              </Button>
            </HStack>
          </Stack>
        ) : (
          <Button variant="outline" onClick={handleAddParameter} size="sm">
            <FiPlus />
            {t("flow.propertyPanel.addParam")}
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
              {pendingAction === "save"
                ? t("flow.propertyPanel.addConfirmTitle")
                : t("flow.propertyPanel.deleteConfirmTitle")}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            {pendingAction === "save"
              ? t("flow.propertyPanel.addConfirmBody", {
                  target: targetLabel,
                  name: pendingParamName,
                })
              : t("flow.propertyPanel.deleteConfirmBody", {
                  target: targetLabel,
                  name: pendingParamName,
                })}
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
                {t("common.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button colorScheme="red" onClick={handleConfirmAction}>
              {pendingAction === "save"
                ? t("flow.propertyPanel.addAction")
                : t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  )
}

export default PropertyPanel
