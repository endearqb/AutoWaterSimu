import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  NativeSelect,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { UDMModelDetailPublic, UDMModelPublic } from "@/client/types.gen"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useEffect, useMemo, useState } from "react"

import type { CustomParameter } from "../../config/modelConfigs"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import type {
  HybridUDMConfig,
  HybridUDMModelPairMapping,
  HybridUDMSelectedModel,
} from "../../types/hybridUdm"
import { Checkbox } from "../ui/checkbox"

interface HybridUDMSetupDialogProps {
  isOpen: boolean
  onClose: () => void
}

type MappingSelectionMap = Record<string, Record<string, string>>

const LOCAL_EXEMPT_TOKEN = "__local__"

const modelKey = (modelId: string, version: number) => `${modelId}@${version}`
const pairKey = (
  sourceModelId: string,
  sourceVersion: number,
  targetModelId: string,
  targetVersion: number,
) => `${modelKey(sourceModelId, sourceVersion)}->${modelKey(targetModelId, targetVersion)}`

const unique = (items: string[]) => {
  const seen = new Set<string>()
  const output: string[] = []
  items.forEach((item) => {
    const normalized = String(item || "").trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    output.push(normalized)
  })
  return output
}

const extractComponents = (
  detail: UDMModelDetailPublic | undefined,
): Array<Record<string, unknown>> => {
  const latest = (detail?.latest_version || {}) as Record<string, unknown>
  const components = latest.components
  return Array.isArray(components)
    ? (components.filter((item) => !!item && typeof item === "object") as Array<
        Record<string, unknown>
      >)
    : []
}

const extractProcesses = (
  detail: UDMModelDetailPublic | undefined,
): Array<Record<string, unknown>> => {
  const latest = (detail?.latest_version || {}) as Record<string, unknown>
  const processes = latest.processes
  return Array.isArray(processes)
    ? (processes.filter((item) => !!item && typeof item === "object") as Array<
        Record<string, unknown>
      >)
    : []
}

const extractComponentNames = (detail: UDMModelDetailPublic | undefined): string[] =>
  unique(
    extractComponents(detail).map((component) => String(component.name || "").trim()),
  )

const extractFocalVars = (detail: UDMModelDetailPublic | undefined): string[] => {
  const componentNames = new Set(extractComponentNames(detail))
  if (componentNames.size === 0) return []

  const ids = new Set<string>()
  const regex = /[A-Za-z_][A-Za-z0-9_]*/g
  extractProcesses(detail).forEach((processRow) => {
    const rawExpr = processRow.rate_expr ?? processRow.rateExpr
    const expr = String(rawExpr || "").trim()
    if (!expr) return
    const matches = expr.match(regex) || []
    matches.forEach((token) => {
      if (componentNames.has(token)) {
        ids.add(token)
      }
    })
  })
  return Array.from(ids)
}

const toHybridSelectedModel = (detail: UDMModelDetailPublic): HybridUDMSelectedModel => {
  const latest = (detail.latest_version || {}) as Record<string, unknown>
  return {
    model_id: detail.id,
    version: detail.current_version,
    name: detail.name,
    hash: String(
      latest.content_hash || latest.hash || "",
    ).trim(),
    components: extractComponents(detail),
    parameters: Array.isArray(latest.parameters)
      ? (latest.parameters as Array<Record<string, unknown>>)
      : [],
    processes: extractProcesses(detail),
    meta:
      latest.meta && typeof latest.meta === "object"
        ? (latest.meta as Record<string, unknown>)
        : null,
  }
}

const buildCanonicalParameters = (
  details: UDMModelDetailPublic[],
): CustomParameter[] => {
  const paramMap = new Map<string, CustomParameter>()
  details.forEach((detail) => {
    extractComponents(detail).forEach((component) => {
      const name = String(component.name || "").trim()
      if (!name || paramMap.has(name)) return
      const defaultValueRaw = Number.parseFloat(
        String(component.default_value ?? component.defaultValue ?? "0"),
      )
      const defaultValue = Number.isFinite(defaultValueRaw) ? defaultValueRaw : 0
      const unit = String(component.unit || "").trim()
      paramMap.set(name, {
        name,
        label: String(component.label || name),
        description: unit ? `Unit: ${unit}` : undefined,
        defaultValue,
      })
    })
  })
  return Array.from(paramMap.values())
}

function HybridUDMSetupDialog({ isOpen, onClose }: HybridUDMSetupDialogProps) {
  const { t } = useI18n()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const hybridConfig = useUDMFlowStore((state) => state.hybridConfig)
  const applyHybridSetup = useUDMFlowStore((state) => state.applyHybridSetup)

  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<UDMModelPublic[]>([])
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [modelDetails, setModelDetails] = useState<Record<string, UDMModelDetailPublic>>(
    {},
  )
  const [mappingSelections, setMappingSelections] = useState<MappingSelectionMap>(
    {},
  )
  const [isApplying, setIsApplying] = useState(false)

  const selectedDetails = useMemo(
    () =>
      selectedModelIds
        .map((id) => modelDetails[id])
        .filter((detail): detail is UDMModelDetailPublic => !!detail),
    [selectedModelIds, modelDetails],
  )

  const pairDescriptors = useMemo(() => {
    const pairs: Array<{
      key: string
      source: UDMModelDetailPublic
      target: UDMModelDetailPublic
      sourceComponents: string[]
      targetFocalVars: string[]
    }> = []
    selectedDetails.forEach((source) => {
      selectedDetails.forEach((target) => {
        if (source.id === target.id) return
        const key = pairKey(
          source.id,
          source.current_version,
          target.id,
          target.current_version,
        )
        pairs.push({
          key,
          source,
          target,
          sourceComponents: extractComponentNames(source),
          targetFocalVars: extractFocalVars(target),
        })
      })
    })
    return pairs
  }, [selectedDetails])

  const isReadyForApply = useMemo(() => {
    if (selectedDetails.length === 0) return false
    return pairDescriptors.every((pair) =>
      pair.targetFocalVars.every(
        (targetVar) =>
          !!mappingSelections[pair.key]?.[targetVar] &&
          mappingSelections[pair.key]?.[targetVar] !== "",
      ),
    )
  }, [selectedDetails.length, pairDescriptors, mappingSelections])

  const fetchModelDetail = async (modelId: string) => {
    if (modelDetails[modelId]) return modelDetails[modelId]
    const detail = await udmService.getModel(modelId)
    setModelDetails((prev) => ({ ...prev, [modelId]: detail }))
    return detail
  }

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    const load = async () => {
      try {
        setIsLoadingModels(true)
        const response = await udmService.getModels({ limit: 500 })
        if (!isMounted) return
        setAvailableModels(response.data || [])

        const initialSelected =
          hybridConfig?.mode === "udm_only"
            ? unique(
                (hybridConfig.selected_models || []).map((item) =>
                  String(item.model_id || ""),
                ),
              )
            : []
        setSelectedModelIds(initialSelected)

        if (initialSelected.length > 0) {
          await Promise.all(initialSelected.map((id) => fetchModelDetail(id)))
        }
      } catch (error) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : t("flow.hybridSetup.toasts.loadModelsFailed"),
        )
      } finally {
        if (isMounted) {
          setIsLoadingModels(false)
        }
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    setMappingSelections((prev) => {
      const next: MappingSelectionMap = {}
      pairDescriptors.forEach((pair) => {
        const pairExisting = hybridConfig?.model_pair_mappings?.[pair.key]
        const existingRows = Array.isArray(pairExisting?.variable_map)
          ? pairExisting.variable_map
          : []

        const nextVarMap: Record<string, string> = {}
        pair.targetFocalVars.forEach((targetVar) => {
          const prevValue = prev[pair.key]?.[targetVar]
          if (prevValue) {
            nextVarMap[targetVar] = prevValue
            return
          }
          const existing = existingRows.find((item) => item.target_var === targetVar)
          if (existing) {
            if (existing.local_exempt || !existing.source_var) {
              nextVarMap[targetVar] = LOCAL_EXEMPT_TOKEN
            } else {
              nextVarMap[targetVar] = String(existing.source_var)
            }
            return
          }
          nextVarMap[targetVar] = pair.sourceComponents.includes(targetVar)
            ? targetVar
            : LOCAL_EXEMPT_TOKEN
        })
        next[pair.key] = nextVarMap
      })
      return next
    })
  }, [isOpen, pairDescriptors, hybridConfig?.model_pair_mappings])

  const toggleModelSelection = async (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds((prev) => unique([...prev, modelId]))
      try {
        await fetchModelDetail(modelId)
      } catch (error) {
        showErrorToast(
          error instanceof Error
            ? error.message
            : t("flow.hybridSetup.toasts.fetchModelDetailFailed"),
        )
      }
      return
    }
    setSelectedModelIds((prev) => prev.filter((id) => id !== modelId))
    setMappingSelections((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        if (key.includes(`${modelId}@`)) {
          delete next[key]
        }
      })
      return next
    })
  }

  const updatePairMapping = (pairMappingKey: string, targetVar: string, sourceVar: string) => {
    setMappingSelections((prev) => ({
      ...prev,
      [pairMappingKey]: {
        ...(prev[pairMappingKey] || {}),
        [targetVar]: sourceVar,
      },
    }))
  }

  const applySetup = async () => {
    if (!isReadyForApply) {
      showErrorToast(t("flow.hybridSetup.toasts.mappingIncomplete"))
      return
    }

    try {
      setIsApplying(true)
      const selected = selectedDetails.map((detail) => toHybridSelectedModel(detail))
      const pairMappings: Record<string, HybridUDMModelPairMapping> = {}

      pairDescriptors.forEach((pair) => {
        const variable_map = pair.targetFocalVars.map((targetVar) => {
          const selectedSource =
            mappingSelections[pair.key]?.[targetVar] || LOCAL_EXEMPT_TOKEN
          if (selectedSource === LOCAL_EXEMPT_TOKEN) {
            return {
              source_var: null,
              target_var: targetVar,
              enabled: true,
              local_exempt: true,
              mode: "local_exempt",
            }
          }
          return {
            source_var: selectedSource,
            target_var: targetVar,
            enabled: true,
          }
        })

        pairMappings[pair.key] = {
          source_model_id: pair.source.id,
          source_version: pair.source.current_version,
          target_model_id: pair.target.id,
          target_version: pair.target.current_version,
          variable_map,
        }
      })

      const hybridPayload: HybridUDMConfig = {
        mode: "udm_only",
        selected_models: selected,
        model_pair_mappings: pairMappings,
      }
      const canonicalParameters = buildCanonicalParameters(selectedDetails)
      applyHybridSetup(hybridPayload, canonicalParameters)
      showSuccessToast(t("flow.hybridSetup.toasts.applied"))
      onClose()
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.hybridSetup.toasts.applyFailed"),
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="90vw">
          <Dialog.Header>
            <Dialog.Title>{t("flow.hybridSetup.title")}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <VStack align="stretch" gap={5}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  {t("flow.hybridSetup.description")}
                </Text>
                {isLoadingModels ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text fontSize="sm">{t("flow.hybridSetup.loadingModels")}</Text>
                  </HStack>
                ) : (
                  <VStack align="stretch" gap={2} maxH="220px" overflowY="auto">
                    {availableModels.map((model) => {
                      const checked = selectedModelIds.includes(model.id)
                      const loadedDetail = modelDetails[model.id]
                      return (
                        <Box
                          key={model.id}
                          borderWidth="1px"
                          borderRadius="md"
                          p={2}
                          borderColor={checked ? "blue.300" : "gray.200"}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={({ checked: next }) =>
                              toggleModelSelection(model.id, Boolean(next))
                            }
                          >
                            <HStack gap={2}>
                              <Text fontSize="sm" fontWeight="medium">
                                {model.name}
                              </Text>
                              <Badge variant="subtle">
                                v{loadedDetail?.current_version || model.current_version}
                              </Badge>
                            </HStack>
                          </Checkbox>
                        </Box>
                      )
                    })}
                  </VStack>
                )}
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={3}>
                  {t("flow.hybridSetup.pairMappingTitle")}
                </Text>
                {pairDescriptors.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    {t("flow.hybridSetup.pairMappingEmpty")}
                  </Text>
                ) : (
                  <VStack align="stretch" gap={4} maxH="420px" overflowY="auto">
                    {pairDescriptors.map((pair) => (
                      <Box key={pair.key} borderWidth="1px" borderRadius="md" p={3}>
                        <Text fontSize="sm" fontWeight="medium" mb={2}>
                          {pair.source.name} (v{pair.source.current_version}) {"->"}{" "}
                          {pair.target.name} (v{pair.target.current_version})
                        </Text>

                        {pair.targetFocalVars.length === 0 ? (
                          <Text fontSize="xs" color="gray.500">
                            {t("flow.hybridSetup.targetNoFocal")}
                          </Text>
                        ) : (
                          <VStack align="stretch" gap={2}>
                            {pair.targetFocalVars.map((targetVar) => (
                              <Flex key={`${pair.key}:${targetVar}`} align="center" gap={3}>
                                <Box minW="120px">
                                  <Text fontSize="sm">{targetVar}</Text>
                                </Box>
                                <NativeSelect.Root size="sm" flex="1">
                                  <NativeSelect.Field
                                    value={
                                      mappingSelections[pair.key]?.[targetVar] ||
                                      LOCAL_EXEMPT_TOKEN
                                    }
                                    onChange={(e) =>
                                      updatePairMapping(
                                        pair.key,
                                        targetVar,
                                        e.target.value,
                                      )
                                    }
                                  >
                                    <option value={LOCAL_EXEMPT_TOKEN}>
                                      {t("flow.hybridSetup.localExempt")}
                                    </option>
                                    {pair.sourceComponents.map((sourceVar) => (
                                      <option key={sourceVar} value={sourceVar}>
                                        {sourceVar}
                                      </option>
                                    ))}
                                  </NativeSelect.Field>
                                  <NativeSelect.Indicator />
                                </NativeSelect.Root>
                              </Flex>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="subtle" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={applySetup}
                loading={isApplying}
                disabled={!isReadyForApply}
              >
                {t("flow.hybridSetup.applyButton")}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export default HybridUDMSetupDialog
