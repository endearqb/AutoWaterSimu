import {
  Box,
  Button,
  Dialog,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { UDMModelDetailPublic } from "@/client/types.gen"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useEffect, useState } from "react"

import { useUDMFlowStore } from "../../stores/udmFlowStore"
import UDMModelEditorForm from "./UDMModelEditorForm"

interface UDMModelEditorDialogProps {
  isOpen: boolean
  onClose: () => void
  initialModelId?: string
}

function UDMModelEditorDialog({
  isOpen,
  onClose,
  initialModelId,
}: UDMModelEditorDialogProps) {
  const { t } = useI18n()
  const { showSuccessToast, showWarningToast } = useCustomToast()
  const [activeModelId, setActiveModelId] = useState<string | undefined>(
    initialModelId,
  )
  const [lastSavedModel, setLastSavedModel] = useState<
    UDMModelDetailPublic | undefined
  >(undefined)

  const selectedNode = useUDMFlowStore((state) => state.selectedNode)
  const nodes = useUDMFlowStore((state) => state.nodes)
  const setNodes = useUDMFlowStore((state) => state.setNodes)
  const customParameters = useUDMFlowStore((state) => state.customParameters)
  const addCustomParameter = useUDMFlowStore((state) => state.addCustomParameter)

  useEffect(() => {
    if (isOpen) {
      setActiveModelId(initialModelId)
      setLastSavedModel(undefined)
    }
  }, [isOpen, initialModelId])

  const buildNodeModelData = (model: UDMModelDetailPublic) => {
    const latest = model.latest_version
    if (!latest) return null

    const components = (latest.components || []) as Array<Record<string, any>>
    const parameters = (latest.parameters || []) as Array<Record<string, any>>
    const processes = (latest.processes || []) as Array<Record<string, any>>

    const parameterValues: Record<string, number> = {}
    parameters.forEach((param) => {
      const name = String(param.name || "").trim()
      if (!name) return
      const value = Number.parseFloat(
        String(param.default_value ?? param.defaultValue ?? "0"),
      )
      parameterValues[name] = Number.isFinite(value) ? value : 0
    })

    const componentValues: Record<string, string> = {}
    const componentNames: string[] = []
    components.forEach((component) => {
      const name = String(component.name || "").trim()
      if (!name) return
      componentNames.push(name)
      const value = Number.parseFloat(
        String(component.default_value ?? component.defaultValue ?? "0"),
      )
      componentValues[name] = String(Number.isFinite(value) ? value : 0)
    })

    return {
      componentNames,
      componentValues,
      nodeData: {
        udmModel: {
          id: model.id,
          name: model.name,
          version: model.current_version,
          hash: latest.content_hash,
          components,
          parameters,
          processes,
          parameterValues,
        },
        udmModelSnapshot: {
          id: model.id,
          name: model.name,
          version: model.current_version,
          hash: latest.content_hash,
          components,
          parameters,
          processes,
          meta: latest.meta || {},
        },
        udmComponents: components,
        udmComponentNames: componentNames,
        udmProcesses: processes,
        udmParameters: parameterValues,
        udmParameterValues: parameterValues,
        udmModelId: model.id,
        udmModelVersion: model.current_version,
        udmModelHash: latest.content_hash,
      },
    }
  }

  const applyModelToNodes = (target: "selected" | "all") => {
    if (!lastSavedModel) {
      showWarningToast(t("flow.udmEditor.dialog.toast.saveBeforeApply"))
      return
    }

    const modelData = buildNodeModelData(lastSavedModel)
    if (!modelData) {
      showWarningToast(t("flow.udmEditor.dialog.toast.missingVersion"))
      return
    }

    modelData.componentNames.forEach((name) => {
      if (!customParameters.some((param) => param.name === name)) {
        addCustomParameter(name)
      }
    })

    const updatedNodes = nodes.map((node) => {
      if (node.type !== "udm") return node
      if (target === "selected" && node.id !== selectedNode?.id) return node

      return {
        ...node,
        data: {
          ...node.data,
          ...modelData.componentValues,
          ...modelData.nodeData,
        },
      }
    })

    setNodes(updatedNodes)
    showSuccessToast(
      target === "selected"
        ? t("flow.udmEditor.dialog.toast.appliedToCurrent")
        : t("flow.udmEditor.dialog.toast.appliedToAll"),
    )
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="cover"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="95vw" maxH="95vh" overflow="hidden">
          <Dialog.Header>
            <VStack align="stretch" gap={3}>
              <Dialog.Title>{t("flow.udmEditor.dialog.title")}</Dialog.Title>
              <HStack gap={2} wrap="wrap">
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => setActiveModelId(undefined)}
                >
                  {t("flow.udmEditor.dialog.actions.newBlankModel")}
                </Button>
                {initialModelId ? (
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setActiveModelId(initialModelId)}
                  >
                    {t("flow.udmEditor.dialog.actions.editBoundModel")}
                  </Button>
                ) : null}
                {activeModelId ? (
                  <Text fontSize="xs" color="gray.600">
                    {t("flow.udmEditor.dialog.activeModelId", {
                      id: activeModelId,
                    })}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="gray.600">
                    {t("flow.udmEditor.dialog.newMode")}
                  </Text>
                )}
              </HStack>
            </VStack>
          </Dialog.Header>

          <Dialog.Body overflow="auto" pb={6}>
            <Box pr={2}>
              <UDMModelEditorForm
                modelId={activeModelId}
                onModelIdChange={setActiveModelId}
                onModelSaved={setLastSavedModel}
                onGeneratedFlowchart={() => onClose()}
                hideBackButton
                containerMaxW="100%"
                headingText=""
                descriptionText={t("flow.udmEditor.dialog.formDescription")}
              />
            </Box>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2} wrap="wrap" w="full" justify="space-between">
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => applyModelToNodes("selected")}
                  disabled={!lastSavedModel || selectedNode?.type !== "udm"}
                >
                  {t("flow.udmEditor.dialog.actions.applyToCurrentNode")}
                </Button>
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => applyModelToNodes("all")}
                  disabled={!lastSavedModel}
                >
                  {t("flow.udmEditor.dialog.actions.applyToAllNodes")}
                </Button>
              </HStack>
              <Button variant="subtle" onClick={onClose}>
                {t("common.close")}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export default UDMModelEditorDialog
