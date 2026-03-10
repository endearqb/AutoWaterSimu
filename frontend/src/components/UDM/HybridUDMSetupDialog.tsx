import type { UDMModelDetailPublic, UDMModelPublic } from "@/client/types.gen"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  HStack,
  IconButton,
  NativeSelect,
  Spinner,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { Edge, Node } from "@xyflow/react"
import { useEffect, useMemo, useState } from "react"
import { FiInfo } from "react-icons/fi"

import type { CustomParameter } from "../../config/modelConfigs"
import {
  type UDMHybridConfigPublic,
  udmService,
} from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import type {
  HybridUDMConfig,
  HybridUDMModelPairMapping,
} from "../../types/hybridUdm"
import {
  LOCAL_EXEMPT_TOKEN,
  buildCanonicalParametersFromModelDetails,
  buildCanonicalParametersFromSelectedModels,
  buildHybridModelKey,
  buildHybridPairKey,
  extractHybridComponentNamesFromDetail,
  extractHybridFocalVarsFromDetail,
  extractHybridProcessesFromDetail,
  toHybridConfigFromUnknown,
  toHybridSelectedModel,
  uniqueStrings,
} from "../../utils/hybridUdm"
import {
  extractLessonKeyFromModelDetail,
  extractLessonKeyFromModelSummary,
  formatAliasWithCanonical,
  resolveTutorialModelDisplayName,
  resolveTutorialVariableLabel,
} from "../../utils/udmTutorialLocalization"
import { Checkbox } from "../ui/checkbox"
import { Tooltip } from "../ui/tooltip"

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
  flowEdges?: Edge[]
  flowNodes?: Node[]
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
  flowEdges,
  flowNodes,
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
  const [modelDetails, setModelDetails] = useState<
    Record<string, UDMModelDetailPublic>
  >({})
  const [mappingSelections, setMappingSelections] =
    useState<MappingSelectionMap>({})
  const [isApplying, setIsApplying] = useState(false)

  const selectedDetails = useMemo(
    () =>
      selectedModelIds
        .map((id) => modelDetails[id])
        .filter((detail): detail is UDMModelDetailPublic => !!detail),
    [selectedModelIds, modelDetails],
  )

  const getSummaryModelDisplayName = (model: UDMModelPublic) =>
    formatAliasWithCanonical(
      resolveTutorialModelDisplayName(
        t,
        extractLessonKeyFromModelSummary(model),
        model.name,
      ),
      model.name,
    )

  const getDetailModelDisplayName = (detail: UDMModelDetailPublic) =>
    formatAliasWithCanonical(
      resolveTutorialModelDisplayName(
        t,
        extractLessonKeyFromModelDetail(detail),
        detail.name,
      ),
      detail.name,
    )

  // F-3.1: Build set of required pair keys based on actual flow edges
  const requiredPairKeys = useMemo(() => {
    if (!flowEdges || !flowNodes) return null // fallback to full N²

    // Build node-id -> model-key lookup
    const nodeModelKeyMap = new Map<string, string>()
    flowNodes.forEach((node) => {
      if (node.type !== "udm") return
      const data = (node.data || {}) as Record<string, unknown>
      const modelId = String(data.udmModelId || "").trim()
      const version = Number(data.udmModelVersion)
      if (!modelId || !Number.isInteger(version)) return
      nodeModelKeyMap.set(node.id, buildHybridModelKey(modelId, version))
    })

    const keys = new Set<string>()
    flowEdges.forEach((edge) => {
      const sourceKey = nodeModelKeyMap.get(edge.source)
      const targetKey = nodeModelKeyMap.get(edge.target)
      if (!sourceKey || !targetKey || sourceKey === targetKey) return
      // Parse model key back to id@version
      const [srcId, srcVer] = sourceKey.split("@")
      const [tgtId, tgtVer] = targetKey.split("@")
      keys.add(buildHybridPairKey(srcId, Number(srcVer), tgtId, Number(tgtVer)))
    })
    return keys
  }, [flowEdges, flowNodes])

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
        // F-3.1: skip pairs not present in actual edges (when edge info available)
        if (requiredPairKeys !== null && !requiredPairKeys.has(key)) return
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
  }, [selectedDetails, requiredPairKeys])

  // F-3.2: Mapping progress computation
  const mappingProgress = useMemo(() => {
    let totalVars = 0
    let mappedVars = 0
    const perPair: Record<string, { mapped: number; total: number }> = {}

    pairDescriptors.forEach((pair) => {
      let pairMapped = 0
      const pairTotal = pair.targetFocalVars.length
      pair.targetFocalVars.forEach((targetVar) => {
        const val = mappingSelections[pair.key]?.[targetVar]
        if (val && val !== "") {
          pairMapped++
        }
      })
      perPair[pair.key] = { mapped: pairMapped, total: pairTotal }
      totalVars += pairTotal
      mappedVars += pairMapped
    })

    return { totalVars, mappedVars, perPair }
  }, [pairDescriptors, mappingSelections])

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
        const pairExisting =
          effectiveHybridConfig?.model_pair_mappings?.[pair.key]
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
          const existing = existingRows.find(
            (item) => item.target_var === targetVar,
          )
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

  const updatePairMapping = (
    pairMappingKey: string,
    targetVar: string,
    sourceVar: string,
  ) => {
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
    const selectedSaved = savedConfigs.find(
      (item) => item.id === selectedSavedConfigId,
    )
    if (!selectedSaved) {
      showErrorToast(t("flow.hybridSetup.toasts.savedConfigNotFound"))
      return
    }

    const normalizedConfig = toHybridConfigFromUnknown(
      selectedSaved.hybrid_config,
    )
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
      const selected = selectedDetails.map((detail) =>
        toHybridSelectedModel(detail),
      )
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
      const canonicalParameters =
        buildCanonicalParametersFromModelDetails(selectedDetails)
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

  // F-3.2: Badge color based on mapping progress
  const getMappingBadgeColor = () => {
    const { totalVars, mappedVars } = mappingProgress
    if (totalVars === 0) return "gray"
    if (mappedVars === totalVars) return "green"
    if (mappedVars === 0) return "red"
    return "yellow"
  }

  // U-3.2: Build tooltip content for model preview
  const buildModelTooltipContent = (modelId: string) => {
    const loadedDetail = modelDetails[modelId]
    if (!loadedDetail) return t("flow.hybridSetup.modelPreview.notLoaded")

    const lessonKey = extractLessonKeyFromModelDetail(loadedDetail)
    const compNames = extractHybridComponentNamesFromDetail(loadedDetail)
    const processCount = extractHybridProcessesFromDetail(loadedDetail).length

    const compLine = t("flow.hybridSetup.modelPreview.components", {
      list:
        compNames.length > 0
          ? compNames
              .map((name) =>
                formatAliasWithCanonical(
                  resolveTutorialVariableLabel(t, lessonKey, name),
                  name,
                ),
              )
              .join(", ")
          : "-",
    })
    const procLine = t("flow.hybridSetup.modelPreview.processes", {
      count: String(processCount),
    })

    return (
      <VStack align="start" gap={1}>
        <Text fontSize="xs">{compLine}</Text>
        <Text fontSize="xs">{procLine}</Text>
      </VStack>
    )
  }

  const isPairMappingDisabled = selectedDetails.length < 2

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => !e.open && onClose()}
      size="xl"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="90vw">
          <Dialog.Header>
            <Dialog.Title>{t("flow.hybridSetup.title")}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Tabs.Root defaultValue="selectModels" variant="enclosed">
              <Tabs.List mb={4}>
                <Tabs.Trigger value="selectModels">
                  {t("flow.hybridSetup.tabs.selectModels")}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="pairMapping"
                  disabled={isPairMappingDisabled}
                >
                  <HStack gap={2}>
                    <Text>{t("flow.hybridSetup.tabs.pairMapping")}</Text>
                    {!isPairMappingDisabled &&
                      mappingProgress.totalVars > 0 && (
                        <Badge
                          size="sm"
                          colorPalette={getMappingBadgeColor()}
                          variant="solid"
                        >
                          {t("flow.hybridSetup.mappingProgress.mapped", {
                            mapped: String(mappingProgress.mappedVars),
                            total: String(mappingProgress.totalVars),
                          })}
                        </Badge>
                      )}
                  </HStack>
                </Tabs.Trigger>
              </Tabs.List>

              {/* Tab 1: Select Models */}
              <Tabs.Content value="selectModels">
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
                            onChange={(e) =>
                              setSelectedSavedConfigId(e.target.value)
                            }
                          >
                            <option value="">
                              {isLoadingSavedConfigs
                                ? t("flow.hybridSetup.savedConfigs.loading")
                                : t(
                                    "flow.hybridSetup.savedConfigs.placeholder",
                                  )}
                            </option>
                            {savedConfigs.map((savedConfig) => (
                              <option
                                key={savedConfig.id}
                                value={savedConfig.id}
                              >
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
                        <Text fontSize="sm">
                          {t("flow.hybridSetup.loadingModels")}
                        </Text>
                      </HStack>
                    ) : (
                      <VStack
                        align="stretch"
                        gap={2}
                        maxH="220px"
                        overflowY="auto"
                      >
                        {availableModels.map((model) => {
                          const checked = selectedModelIds.includes(model.id)
                          const loadedDetail = modelDetails[model.id]
                          return (
                            <Tooltip
                              key={model.id}
                              content={buildModelTooltipContent(model.id)}
                              placement="right"
                              openDelay={300}
                            >
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={2}
                                borderColor={checked ? "blue.300" : "gray.200"}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={({ checked: next }) =>
                                    toggleModelSelection(
                                      model.id,
                                      Boolean(next),
                                    )
                                  }
                                >
                                  <HStack gap={2}>
                                    <Text fontSize="sm" fontWeight="medium">
                                      {getSummaryModelDisplayName(model)}
                                    </Text>
                                    <Badge variant="subtle">
                                      v
                                      {loadedDetail?.current_version ||
                                        model.current_version}
                                    </Badge>
                                  </HStack>
                                </Checkbox>
                              </Box>
                            </Tooltip>
                          )
                        })}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              </Tabs.Content>

              {/* Tab 2: Pair Mapping */}
              <Tabs.Content value="pairMapping">
                <VStack align="stretch" gap={4}>
                  {/* F-3.2: Overall mapping progress summary */}
                  {mappingProgress.totalVars > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      {t("flow.hybridSetup.mappingProgress.overall", {
                        mapped: String(mappingProgress.mappedVars),
                        total: String(mappingProgress.totalVars),
                      })}
                    </Text>
                  )}

                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={3}>
                      {t("flow.hybridSetup.pairMappingTitle")}
                    </Text>
                    {pairDescriptors.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        {t("flow.hybridSetup.pairMappingEmpty")}
                      </Text>
                    ) : (
                      <VStack
                        align="stretch"
                        gap={4}
                        maxH="420px"
                        overflowY="auto"
                      >
                        {pairDescriptors.map((pair) => {
                          const pairProgress = mappingProgress.perPair[pair.key]
                          return (
                            <Box
                              key={pair.key}
                              borderWidth="1px"
                              borderRadius="md"
                              p={3}
                            >
                              <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" fontWeight="medium">
                                  {getDetailModelDisplayName(pair.source)} (v
                                  {pair.source.current_version}) {"->"}{" "}
                                  {getDetailModelDisplayName(pair.target)} (v
                                  {pair.target.current_version})
                                </Text>
                                {/* F-3.2: Per-pair progress badge */}
                                {pairProgress && pairProgress.total > 0 && (
                                  <Badge
                                    size="sm"
                                    colorPalette={
                                      pairProgress.mapped === pairProgress.total
                                        ? "green"
                                        : pairProgress.mapped === 0
                                          ? "red"
                                          : "yellow"
                                    }
                                    variant="subtle"
                                  >
                                    {t(
                                      "flow.hybridSetup.mappingProgress.mapped",
                                      {
                                        mapped: String(pairProgress.mapped),
                                        total: String(pairProgress.total),
                                      },
                                    )}
                                  </Badge>
                                )}
                              </HStack>

                              {pair.targetFocalVars.length === 0 ? (
                                <Text fontSize="xs" color="gray.500">
                                  {t("flow.hybridSetup.targetNoFocal")}
                                </Text>
                              ) : (
                                <VStack align="stretch" gap={2}>
                                  {pair.targetFocalVars.map((targetVar) => (
                                    <Flex
                                      key={`${pair.key}:${targetVar}`}
                                      align="center"
                                      gap={3}
                                    >
                                      <Box minW="120px">
                                        <Text fontSize="sm">
                                          {formatAliasWithCanonical(
                                            resolveTutorialVariableLabel(
                                              t,
                                              extractLessonKeyFromModelDetail(
                                                pair.target,
                                              ),
                                              targetVar,
                                            ),
                                            targetVar,
                                          )}
                                        </Text>
                                      </Box>
                                      {/* U-3.3: Tooltip on localExempt NativeSelect */}
                                      <NativeSelect.Root size="sm" flex="1">
                                        <NativeSelect.Field
                                          value={
                                            mappingSelections[pair.key]?.[
                                              targetVar
                                            ] || LOCAL_EXEMPT_TOKEN
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
                                          {pair.sourceComponents.map(
                                            (sourceVar) => (
                                              <option
                                                key={sourceVar}
                                                value={sourceVar}
                                              >
                                                {formatAliasWithCanonical(
                                                  resolveTutorialVariableLabel(
                                                    t,
                                                    extractLessonKeyFromModelDetail(
                                                      pair.source,
                                                    ),
                                                    sourceVar,
                                                  ),
                                                  sourceVar,
                                                )}
                                              </option>
                                            ),
                                          )}
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator />
                                      </NativeSelect.Root>
                                      <Tooltip
                                        content={t(
                                          "flow.hybridSetup.localExemptTooltip",
                                        )}
                                        placement="top"
                                      >
                                        <IconButton
                                          variant="ghost"
                                          size="2xs"
                                          aria-label={t(
                                            "flow.hybridSetup.localExemptTooltip",
                                          )}
                                        >
                                          <FiInfo />
                                        </IconButton>
                                      </Tooltip>
                                    </Flex>
                                  ))}
                                </VStack>
                              )}
                            </Box>
                          )
                        })}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              </Tabs.Content>
            </Tabs.Root>
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
