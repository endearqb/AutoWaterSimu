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
import type {
  UDMHybridConfigPublic,
  UDMModelDetailPublic,
  UDMModelPublic,
} from "@/client/types.gen"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useEffect, useMemo, useState } from "react"

import type { CustomParameter } from "../../config/modelConfigs"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import type {
  HybridUDMConfig,
  HybridUDMModelPairMapping,
} from "../../types/hybridUdm"
import {
  LOCAL_EXEMPT_TOKEN,
  buildCanonicalParametersFromModelDetails,
  buildCanonicalParametersFromSelectedModels,
  buildHybridPairKey,
  extractHybridComponentNamesFromDetail,
  extractHybridFocalVarsFromDetail,
  toHybridConfigFromUnknown,
  toHybridSelectedModel,
  uniqueStrings,
} from "../../utils/hybridUdm"
import { Checkbox } from "../ui/checkbox"

interface HybridUDMSetupDialogProps {
  isOpen: boolean
  onClose: () => void
  initialConfig?: HybridUDMConfig | null
  onApply?: (
    config: HybridUDMConfig,
    canonicalParameters: CustomParameter[],
  ) => void
  applyButtonLabel?: string
  showSavedConfigSelector?: boolean
  onOpenHybridPage?: () => void
}

type MappingSelectionMap = Record<string, Record<string, string>>

function HybridUDMSetupDialog({
  isOpen,
  onClose,
  initialConfig,
  onApply,
  applyButtonLabel,
  showSavedConfigSelector = true,
  onOpenHybridPage,
}: HybridUDMSetupDialogProps) {
  const { t } = useI18n()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const storeHybridConfig = useUDMFlowStore((state) => state.hybridConfig)
  const applyHybridSetup = useUDMFlowStore((state) => state.applyHybridSetup)
  const effectiveHybridConfig = initialConfig ?? storeHybridConfig

  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isLoadingSavedConfigs, setIsLoadingSavedConfigs] = useState(false)
  const [availableModels, setAvailableModels] = useState<UDMModelPublic[]>([])
  const [savedConfigs, setSavedConfigs] = useState<UDMHybridConfigPublic[]>([])
  const [selectedSavedConfigId, setSelectedSavedConfigId] = useState("")
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
        const key = buildHybridPairKey(
          source.id,
          source.current_version,
          target.id,
          target.current_version,
        )
        pairs.push({
          key,
          source,
          target,
          sourceComponents: extractHybridComponentNamesFromDetail(source),
          targetFocalVars: extractHybridFocalVarsFromDetail(target),
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

  const handleApplyConfig = (
    nextConfig: HybridUDMConfig,
    canonicalParameters: CustomParameter[],
  ) => {
    if (onApply) {
      onApply(nextConfig, canonicalParameters)
      return
    }
    applyHybridSetup(nextConfig, canonicalParameters)
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
          effectiveHybridConfig?.mode === "udm_only"
            ? uniqueStrings(
                (effectiveHybridConfig.selected_models || []).map((item) =>
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

    if (showSavedConfigSelector) {
      const loadSavedConfigs = async () => {
        try {
          setIsLoadingSavedConfigs(true)
          const response = await udmService.getHybridConfigs(0, 200)
          if (!isMounted) return
          setSavedConfigs(response.data || [])
        } catch (error) {
          showErrorToast(
            error instanceof Error
              ? error.message
              : t("flow.hybridSetup.toasts.loadSavedConfigsFailed"),
          )
        } finally {
          if (isMounted) {
            setIsLoadingSavedConfigs(false)
          }
        }
      }
      void loadSavedConfigs()
    } else {
      setSavedConfigs([])
      setSelectedSavedConfigId("")
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, effectiveHybridConfig, showSavedConfigSelector])

  useEffect(() => {
    if (!isOpen) return

    setMappingSelections((prev) => {
      const next: MappingSelectionMap = {}
      pairDescriptors.forEach((pair) => {
        const pairExisting = effectiveHybridConfig?.model_pair_mappings?.[pair.key]
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
  }, [isOpen, pairDescriptors, effectiveHybridConfig?.model_pair_mappings])

  const toggleModelSelection = async (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds((prev) => uniqueStrings([...prev, modelId]))
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

  const applySelectedSavedConfig = () => {
    if (!selectedSavedConfigId) return
    const selectedSaved = savedConfigs.find((item) => item.id === selectedSavedConfigId)
    if (!selectedSaved) {
      showErrorToast(t("flow.hybridSetup.toasts.savedConfigNotFound"))
      return
    }

    const normalizedConfig = toHybridConfigFromUnknown(selectedSaved.hybrid_config)
    if (!normalizedConfig) {
      showErrorToast(t("flow.hybridSetup.toasts.savedConfigInvalid"))
      return
    }

    const canonicalParameters = buildCanonicalParametersFromSelectedModels(
      normalizedConfig.selected_models || [],
    )
    handleApplyConfig(normalizedConfig, canonicalParameters)
    showSuccessToast(t("flow.hybridSetup.toasts.savedConfigApplied"))
    onClose()
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
      const canonicalParameters = buildCanonicalParametersFromModelDetails(selectedDetails)
      handleApplyConfig(hybridPayload, canonicalParameters)
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
              {showSavedConfigSelector && (
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={3}>
                    {t("flow.hybridSetup.savedConfigs.title")}
                  </Text>
                  <HStack align="stretch">
                    <NativeSelect.Root size="sm" flex="1">
                      <NativeSelect.Field
                        value={selectedSavedConfigId}
                        onChange={(e) => setSelectedSavedConfigId(e.target.value)}
                      >
                        <option value="">
                          {isLoadingSavedConfigs
                            ? t("flow.hybridSetup.savedConfigs.loading")
                            : t("flow.hybridSetup.savedConfigs.placeholder")}
                        </option>
                        {savedConfigs.map((savedConfig) => (
                          <option key={savedConfig.id} value={savedConfig.id}>
                            {savedConfig.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Button
                      variant="subtle"
                      onClick={applySelectedSavedConfig}
                      disabled={!selectedSavedConfigId}
                    >
                      {t("flow.hybridSetup.savedConfigs.applyButton")}
                    </Button>
                    {onOpenHybridPage && (
                      <Button variant="outline" onClick={onOpenHybridPage}>
                        {t("flow.hybridSetup.savedConfigs.manageButton")}
                      </Button>
                    )}
                  </HStack>
                </Box>
              )}

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
                {applyButtonLabel || t("flow.hybridSetup.applyButton")}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export default HybridUDMSetupDialog
