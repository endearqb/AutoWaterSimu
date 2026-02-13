import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Portal,
  Slider,
  Text,
  VStack,
} from "@chakra-ui/react"
import { keyframes } from "@emotion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { FaChartLine, FaPalette } from "react-icons/fa"
import {
  FiBarChart2,
  FiClock,
  FiDatabase,
  FiDownload,
  FiFile,
  FiFolder,
  FiMap,
  FiMenu,
  FiPlay,
  FiRepeat,
  FiSave,
  FiSliders,
  FiUpload,
} from "react-icons/fi"
import { MaterialBalanceService } from "../../../client/sdk.gen"
import { useI18n } from "../../../i18n"
import { asm1Service } from "../../../services/asm1Service"
import { asm1SlimService } from "../../../services/asm1slimService"
import { asm3Service } from "../../../services/asm3Service"
import useFlowStore from "../../../stores/flowStore"
import { useThemePaletteStore } from "../../../stores/themePaletteStore"
import ASM1Analyzer from "../legacy-analysis/ASM1Analyzer"
import ASM1SlimAnalyzer from "../legacy-analysis/ASM1SlimAnalyzer"
import ASM3Analyzer from "../legacy-analysis/ASM3Analyzer"
import AnalysisDialog from "../legacy-analysis/AnalysisDialog"
import UDMAnalyzer from "../legacy-analysis/UDMAnalyzer"
import BaseDialogManager from "../menu/BaseDialogManager"
import BaseLoadCalculationDataDialog from "../menu/BaseLoadCalculationDataDialog"
import ConfirmDialog from "../menu/ConfirmDialog"
import { buildColorScaleFromBase } from "../nodes/utils/colorSchemes"
import {
  type GlassTint,
  getAccentColor,
  getGlassNodeStyles,
  getGlassPanelStyles,
  getOutlineColor,
} from "../nodes/utils/glass"
import PanelColorSelector from "./PanelColorSelector"
import TimeSegmentPlanEditor from "./TimeSegmentPlanEditor"
import type { SimulationControllerProps } from "./useSimulationController"
import { useSimulationController } from "./useSimulationController"

interface SimulationActionPlateProps extends SimulationControllerProps {}

function SimulationActionPlate(props: SimulationActionPlateProps) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [isStepsOpen, setIsStepsOpen] = useState(false)
  const [isResampleOpen, setIsResampleOpen] = useState(false)
  const [isStepsClosing, setIsStepsClosing] = useState(false)
  const [isResampleClosing, setIsResampleClosing] = useState(false)
  const [showMapLabel, setShowMapLabel] = useState(false)
  const [showAnalysisLabel, setShowAnalysisLabel] = useState(false)
  const [showStepsLabel, setShowStepsLabel] = useState(false)
  const [showResampleLabel, setShowResampleLabel] = useState(false)
  const [showHoursLabel, setShowHoursLabel] = useState(false)
  const [isHoursOpen, setIsHoursOpen] = useState(false)
  const [isHoursClosing, setIsHoursClosing] = useState(false)
  const [showSegmentsLabel, setShowSegmentsLabel] = useState(false)
  const [isSegmentsOpen, setIsSegmentsOpen] = useState(false)
  const [isSegmentsClosing, setIsSegmentsClosing] = useState(false)
  const [isBubbleOpen, setIsBubbleOpen] = useState(false)
  const [isBubbleClosing, setIsBubbleClosing] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    pendingAction: () => void
  } | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [isLoadCalculationDataDialogOpen, setIsLoadCalculationDataDialogOpen] =
    useState(false)
  const [showMenuLabel, setShowMenuLabel] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isPaletteClosing, setIsPaletteClosing] = useState(false)
  const [showPaletteLabel, setShowPaletteLabel] = useState(false)
  const [selectedScheme] = useState<
    | "monochromatic"
    | "complementary"
    | "analogous"
    | "triadic"
    | "tab10"
    | "extended"
  >("monochromatic")
  const [selectedBase, setSelectedBase] = useState<string>("#2563eb")
  const [groupedColors, setGroupedColors] = useState<any>(null)
  const [hoveredBubbleIndex, setHoveredBubbleIndex] = useState<number | null>(
    null,
  )
  const stepsBtnRef = useRef<HTMLButtonElement | null>(null)
  const resampleBtnRef = useRef<HTMLButtonElement | null>(null)
  const hoursBtnRef = useRef<HTMLButtonElement | null>(null)
  const segmentsBtnRef = useRef<HTMLButtonElement | null>(null)
  const bubbleBtnRef = useRef<HTMLButtonElement | null>(null)
  const themeBtnRef = useRef<HTMLButtonElement | null>(null)
  const stepsOverlayRef = useRef<HTMLDivElement | null>(null)
  const resampleOverlayRef = useRef<HTMLDivElement | null>(null)
  const hoursOverlayRef = useRef<HTMLDivElement | null>(null)
  const segmentsOverlayRef = useRef<HTMLDivElement | null>(null)
  const bubbleOverlayRef = useRef<HTMLDivElement | null>(null)
  const themeOverlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const canvasContainerRef = useRef<HTMLElement | null>(null)
  const portalRef = useRef<HTMLElement>(null!)
  useEffect(() => {
    canvasContainerRef.current =
      (document.querySelector(".react-flow") as HTMLElement) || document.body
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])
  const getAnchorCenter = (el?: HTMLElement | null) => {
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const {
    config,
    modelType,
    simulationHours,
    simulationSteps,
    samplingIntervalHours,
    validateAndUpdateParameters,
    calculateVolumeDepletionTime,
    maxSimulationTime,
    isJobCurrentlyRunning,
    handleStartSimulation,
    finalStore,
    edges,
    edgeParameterConfigs,
  } = useSimulationController(props)

  const flowStore = props.store || useFlowStore
  const {
    showMiniMap,
    setShowMiniMap,
    nodes: flowNodes,
    edges: flowEdges,
    timeSegments = [],
    setTimeSegments,
    addTimeSegment,
    updateTimeSegment,
    removeTimeSegment,
    copyTimeSegment,
    reorderTimeSegments,
    exportFlowData,
    importFlowData,
    setCurrentFlowChartName,
    newFlowChart,
    currentFlowChartName,
  } = flowStore() as any

  const segmentParameterNames = useMemo(() => {
    const exportedData = exportFlowData?.()
    const exportedParameters = exportedData?.customParameters
    if (!Array.isArray(exportedParameters)) return [] as string[]
    return exportedParameters
      .map((param: any) => String(param?.name || ""))
      .filter(Boolean)
  }, [exportFlowData, flowNodes, flowEdges, timeSegments])

  const supportsTimeSegments =
    typeof addTimeSegment === "function" &&
    typeof updateTimeSegment === "function" &&
    typeof removeTimeSegment === "function"

  const themeStore = useThemePaletteStore()

  const isStartDisabled =
    isJobCurrentlyRunning || !calculateVolumeDepletionTime.isValid

  const resolveTintFromModelType = (type?: string): GlassTint => {
    switch (type) {
      case "asm1":
        return "asm1"
      case "asm1slim":
        return "asmslim"
      case "asm3":
        return "asm3"
      default:
        return "default"
    }
  }

  const tint = resolveTintFromModelType(modelType)
  const accentColor = getAccentColor(tint)
  const accentOutlineColor = getOutlineColor(tint)
  const isClassic =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic",
      ) || ""
    ).trim() === "1"
  const isClassicGlass =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic-glass",
      ) || ""
    ).trim() === "1"
  const activeClassic = isClassic
  const activeClassicGlass = isClassicGlass
  const activeDefaultGlass = !isClassic && !isClassicGlass

  const panelStyles = {
    ...getGlassNodeStyles({ tint, hovered }),
    borderTopRadius: "3xl",
    borderBottomRadius: "36px",
    minWidth: "auto",
    minHeight: "auto",
    color: accentColor,
  }

  const hasResultData = !!finalStore.currentJob?.result_data

  const fadeInUp = keyframes`
    from { opacity: 0; transform: translateY(-10px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  `
  const fadeOutUp = keyframes`
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(-10px) scale(0.96); }
  `
  const rainbowPulse = keyframes`
    0% { opacity: 0.25; }
    50% { opacity: 0.8; }
    100% { opacity: 0.25; }
  `
  const getToggleButtonStyles = (isActive: boolean) => ({
    variant: "outline" as const,
    borderColor: accentColor,
    color: isActive ? "white" : accentColor,
    bg: isActive ? accentColor : "transparent",
    boxShadow: isActive ? `0 0 0 1px ${accentColor}` : "none",
    _hover: {
      bg: isActive ? accentColor : "whiteAlpha.200",
      color: isActive ? "white" : accentColor,
    },
    _focusVisible: { boxShadow: `0 0 0 1px ${accentColor}` },
    transition:
      "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
  })
  const sliderTrackProps = {
    bg: "whiteAlpha.300",
    borderRadius: "full",
    h: "4px",
  }
  const bubbleBaseShadow = getGlassPanelStyles({ hovered: true })
    .boxShadow as string
  const getBubbleButtonStyles = (isActive: boolean) => ({
    variant: "plain" as const,
    ...getGlassPanelStyles({ hovered: true }),
    borderRadius: "full",
    px: 2,
    py: 1,
    height: "24px",
    color: isActive ? "white" : accentColor,
    bg: isActive ? accentColor : "hsla(0,0%,100%,0.72)",
    boxShadow: isActive
      ? `0 0 0 1px ${accentColor}, 0 0 10px ${accentColor}`
      : bubbleBaseShadow,
    _hover: {
      ...getGlassPanelStyles({ hovered: true }),
      backgroundColor: accentColor,
      color: "white",
      outlineColor: accentColor,
    },
    _focusVisible: { boxShadow: `0 0 0 1px ${accentColor}` },
    transition:
      "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
  })
  const renderSliderThumb = (isDisabled = false) => (
    <Slider.Thumb
      index={0}
      boxSize={4}
      borderWidth="2px"
      borderColor="white"
      bg={accentColor}
      boxShadow={`0 0 0 1px rgba(0,0,0,0.25), 0 0 10px ${accentColor}`}
      opacity={isDisabled ? 0.5 : 1}
      transition="transform 0.15s ease, box-shadow 0.15s ease"
      _hover={{ transform: "scale(1.05)" }}
      _focusVisible={{ boxShadow: `0 0 0 2px white, 0 0 0 4px ${accentColor}` }}
    />
  )
  const isHoursDisabled = !calculateVolumeDepletionTime.isValid
  const startButtonGradient = `radial(circle at 40% 30%, ${accentColor} 0%, rgba(0,0,0,0.45) 100%)`
  const startButtonShadow = isStartDisabled ? "none" : `0 0 18px ${accentColor}`
  const startButtonBorderColor = isJobCurrentlyRunning
    ? accentOutlineColor
    : accentColor
  const classicText = (
    document.documentElement.style.getPropertyValue(
      "--chakra-colors-classic-text",
    ) || ""
  ).trim()
  const playIconColor = isStartDisabled
    ? "rgba(255,255,255,0.65)"
    : isClassic || isClassicGlass
      ? classicText || accentOutlineColor
      : accentOutlineColor
  const jobStatus = (finalStore.currentJob as any)?.status as string | undefined
  const isWaitingForResult =
    !hasResultData &&
    (isJobCurrentlyRunning ||
      jobStatus === "pending" ||
      jobStatus === "running")

  const triggerDownload = (data: string, name: string) => {
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const handleExportClick = async () => {
    const dataStr = JSON.stringify(exportFlowData?.(), null, 2)
    const name = currentFlowChartName || t("flow.menu.defaultFlowchartName")
    triggerDownload(dataStr, name)
  }
  const handleOpenSaveDialog = () => setIsSaveDialogOpen(true)
  const handleOpenLoadDialog = () => setIsLoadDialogOpen(true)
  const handleOpenLoadCalcDialog = () =>
    setIsLoadCalculationDataDialogOpen(true)

  const handleLoadJobData = async (
    job: any,
    flowState?: any,
    modelState?: any,
  ) => {
    const jobId = job?.job_id as string | undefined
    const jobName = job?.job_name as string | undefined

    if (!jobId) {
      throw new Error(t("flow.actionPlate.errors.jobIdMissing"))
    }

    let jobDataResponse: any
    switch (modelType) {
      case "asm1":
        jobDataResponse = await asm1Service.getJobInputData(jobId)
        break
      case "asm1slim":
        jobDataResponse = await asm1SlimService.getJobInputData(jobId)
        break
      case "asm3":
        jobDataResponse = await asm3Service.getJobInputData(jobId)
        break
      default:
        jobDataResponse = await MaterialBalanceService.getJobInputData({
          jobId,
        })
        break
    }

    const flowchartData = jobDataResponse?.input_data as any
    if (!flowchartData) {
      throw new Error(t("flow.actionPlate.errors.inputDataMissing"))
    }

    if (flowState) {
      const importResult = flowState.importFlowData?.(flowchartData)
      if (!importResult?.success) {
        flowState.setNodes?.(flowchartData.nodes || [])
        flowState.setEdges?.(flowchartData.edges || [])
      }

      flowState.setCurrentFlowChartName?.(jobName)
      flowState.setCurrentJobId?.(jobId)
    }

    if (job?.status === "success" && modelState) {
      try {
        await Promise.all([
          modelState.getResultSummary?.(jobId),
          modelState.getFinalValues?.(jobId),
          modelState.getCalculationStatus?.(jobId),
        ])
      } catch (error) {
        console.error(t("flow.simulation.loadResultFailed"), error)
      }
    }
  }
  const handleImportClick = () => {
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = ".json"
    fileInput.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const fileName = files[0].name.replace(/\.json$/, "")
        setCurrentFlowChartName?.(fileName)
        const reader = new FileReader()
        reader.onload = async (ev) => {
          try {
            const content = ev.target?.result as string
            const obj = JSON.parse(content)
            const result = importFlowData?.(obj)
            const { toaster } = await import("../../ui/toaster")
            toaster.create({
              title: result?.success
                ? t("flow.menu.importSuccess")
                : t("flow.menu.importFailed"),
              description: result?.message || "",
              type: result?.success ? "success" : "error",
              duration: 3000,
            })
          } catch {}
        }
        reader.readAsText(files[0])
      }
    }
    fileInput.click()
  }
  const handleNewFlowChart = () => {
    newFlowChart?.()
  }
  const handleConfirmAction = async (action: "save" | "export" | "skip") => {
    switch (action) {
      case "save":
        handleOpenSaveDialog()
        break
      case "export":
        await handleExportClick()
        break
      case "skip":
        confirmDialog?.pendingAction()
        break
    }
    setConfirmDialog(null)
  }

  const closeSteps = () => {
    if (isStepsOpen) {
      setIsStepsClosing(true)
      setTimeout(() => {
        setIsStepsOpen(false)
        setIsStepsClosing(false)
      }, 180)
    }
  }
  const closeResample = () => {
    if (isResampleOpen) {
      setIsResampleClosing(true)
      setTimeout(() => {
        setIsResampleOpen(false)
        setIsResampleClosing(false)
      }, 180)
    }
  }
  const closeHours = () => {
    if (isHoursOpen) {
      setIsHoursClosing(true)
      setTimeout(() => {
        setIsHoursOpen(false)
        setIsHoursClosing(false)
      }, 180)
    }
  }
  const closeSegments = () => {
    if (isSegmentsOpen) {
      setIsSegmentsClosing(true)
      setTimeout(() => {
        setIsSegmentsOpen(false)
        setIsSegmentsClosing(false)
      }, 180)
    }
  }
  const closeBubble = () => {
    if (isBubbleOpen) {
      setIsBubbleClosing(true)
      setTimeout(() => {
        setIsBubbleOpen(false)
        setIsBubbleClosing(false)
      }, 180)
    }
  }
  const closePalette = () => {
    if (isPaletteOpen) {
      setIsPaletteClosing(true)
      setTimeout(() => {
        setIsPaletteOpen(false)
        setIsPaletteClosing(false)
      }, 180)
    }
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        stepsOverlayRef.current?.contains(target) ||
        resampleOverlayRef.current?.contains(target) ||
        hoursOverlayRef.current?.contains(target) ||
        segmentsOverlayRef.current?.contains(target) ||
        bubbleOverlayRef.current?.contains(target) ||
        themeOverlayRef.current?.contains(target) ||
        stepsBtnRef.current?.contains(target) ||
        resampleBtnRef.current?.contains(target) ||
        hoursBtnRef.current?.contains(target) ||
        segmentsBtnRef.current?.contains(target) ||
        bubbleBtnRef.current?.contains(target) ||
        themeBtnRef.current?.contains(target)
      ) {
        return
      }
      const inPanel = panelRef.current?.contains(target)
      const inCanvas = canvasContainerRef.current?.contains(target)
      if (inPanel || inCanvas) {
        closeSteps()
        closeResample()
        closeHours()
        closeSegments()
        closeBubble()
        closePalette()
      }
    }
    document.addEventListener("mousedown", handler, { capture: true })
    return () =>
      document.removeEventListener("mousedown", handler, {
        capture: true,
      } as any)
  }, [
    isStepsOpen,
    isResampleOpen,
    isHoursOpen,
    isSegmentsOpen,
    isBubbleOpen,
    isPaletteOpen,
  ])

  return (
    <Box
      position="absolute"
      left="50%"
      bottom="2"
      transform="translateX(-50%)"
      zIndex={1200}
      pointerEvents="none"
      width="full"
      maxW="min(480px, 100vw - 80px)"
    >
      <Box
        pointerEvents="auto"
        data-simulation-action-plate
        {...panelStyles}
        px={4}
        py={4}
        ref={panelRef}
        position="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Portal container={portalRef}>
          {isWaitingForResult &&
            (() => {
              const r = panelRef.current?.getBoundingClientRect()
              if (!r) return null
              const pad = 4
              const borderW = 6
              return (
                <Box
                  position="fixed"
                  left={`${r.left - pad}px`}
                  top={`${r.top - pad}px`}
                  width={`${r.width + pad * 2}px`}
                  height={`${r.height + pad * 2}px`}
                  borderTopRadius="54px"
                  borderBottomRadius="36px"
                  zIndex={1600}
                  pointerEvents="none"
                  bg="transparent"
                  borderStyle="solid"
                  borderWidth={`${borderW}px`}
                  borderImageSlice={1}
                  borderImageSource={
                    "conic-gradient(from 0deg, #ff4d4d, #ffa64d, #ffff4d, #4dff4d, #4dffff, #4d4dff, #ff4dff, #ff4d4d)"
                  }
                  filter="blur(12px) saturate(160%)"
                  animation={`${rainbowPulse} 1.8s ease-in-out infinite`}
                />
              )
            })()}
        </Portal>
        {/* 顶部：模型信息 + EV 进度 + 运行参数概览 */}
        {/* <HStack justify="space-between" align="center" gap={6} mb={4}> */}
        {/* <VStack align="flex-start" gap={1}>
            <Text fontSize="sm" color={accentColor}>
              {modelType?.toUpperCase() || 'MODEL'}
            </Text>
          </VStack> */}
        {/* 
          <Box flex="1" px={4}>
            <Box w="100%" h="6px" bg="whiteAlpha.200" borderRadius="full">
              <Box
                w={`${progressPercentage}%`}
                h="100%"
                bgGradient="linear(to-r, orange.300, red.400)"
                borderRadius="full"
                transition="width 0.3s ease"
              />
            </Box>
            <HStack justify="space-between" mt={1}>
              <Text fontSize="xs" color="gray.400">
                {formatTime(elapsedTime)} / {formatTime(estimatedTotalTime)}
              </Text>
            </HStack>
          </Box> */}
        {/* <VStack align="flex-end" gap={1} minW="150px">
            <Text fontSize="xs" color={accentColor} opacity={0.75}>
              {formatTime(elapsedTime)} / {formatTime(estimatedTotalTime)}
            </Text>
          </VStack>
          <VStack align="flex-end" gap={1} minW="150px">
            <Text fontSize="sm" color={accentColor}>
              {simulationHours.toFixed(1)} h · {simulationSteps} steps/h
            </Text>
          </VStack>

        </HStack> */}

        {/* 中部：结果摘要 / Shutter / 高级参数提示 + 分析按钮 */}
        <HStack w="100%" align="center" gap={2} mb={4}>
          <Box flex={1} display="flex" justifyContent="flex-start">
            <HStack gap={2}>
              {config.stepsPerHour.visible && (
                <Field.Root>
                  <Button
                    size="xs"
                    {...getToggleButtonStyles(false)}
                    aria-label={t("flow.actionPlate.stepsAriaLabel")}
                    ref={stepsBtnRef}
                    onMouseEnter={() => setShowStepsLabel(true)}
                    onMouseLeave={() => setShowStepsLabel(false)}
                    onClick={() => {
                      if (!isStepsOpen) {
                        setIsStepsOpen(true)
                        setIsStepsClosing(false)
                        closeResample()
                        closeHours()
                        closeSegments()
                        closeBubble()
                      } else {
                        closeSteps()
                      }
                    }}
                  >
                    <HStack gap={1}>
                      <FiBarChart2 />
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showStepsLabel ? "80px" : "0px",
                          opacity: showStepsLabel ? 1 : 0,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {t("flow.simulation.stepsPerHour")}
                      </Text>
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showStepsLabel ? "0px" : "80px",
                          opacity: showStepsLabel ? 0 : 1,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {simulationSteps} {t("flow.simulation.unit.steps")}
                      </Text>
                    </HStack>
                  </Button>
                  <Portal container={portalRef}>
                    {isStepsOpen &&
                      (() => {
                        const panelRect =
                          panelRef.current?.getBoundingClientRect()
                        const left =
                          (panelRect?.left ??
                            getAnchorCenter(stepsBtnRef.current).x) + 20
                        const top = Math.max((panelRect?.top ?? 0) - 120, 0)
                        return (
                          <Box
                            ref={stepsOverlayRef}
                            position="fixed"
                            left={`${left}px`}
                            top={`${top}px`}
                            zIndex={2000}
                            pointerEvents="auto"
                            animation={`${isStepsClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                          >
                            <Box position="relative" w="160px" h="96px">
                              {computeArcPositions(
                                6,
                                200,
                                340,
                                96,
                                30,
                                120,
                              ).map((p, i) => {
                                const values = [10, 20, 30, 40, 50, 60]
                                const value = values[i]
                                const active = simulationSteps === value
                                return (
                                  <Button
                                    key={value}
                                    size="xs"
                                    {...getBubbleButtonStyles(active)}
                                    aria-pressed={active}
                                    position="absolute"
                                    left={`${p.x}px`}
                                    top={`${p.y}px`}
                                    transform="translate(-50%, -50%)"
                                    onClick={() => {
                                      validateAndUpdateParameters({
                                        steps_per_hour: value,
                                      })
                                      setIsStepsOpen(false)
                                      setIsStepsClosing(false)
                                    }}
                                  >
                                    {value}
                                  </Button>
                                )
                              })}
                            </Box>
                          </Box>
                        )
                      })()}
                  </Portal>
                </Field.Root>
              )}

              {config.samplingIntervalHours.visible && (
                <Field.Root display="inline-flex" w="auto">
                  <Button
                    size="xs"
                    {...getToggleButtonStyles(false)}
                    aria-label={t("flow.actionPlate.resampleAriaLabel")}
                    ref={resampleBtnRef}
                    onMouseEnter={() => setShowResampleLabel(true)}
                    onMouseLeave={() => setShowResampleLabel(false)}
                    onClick={() => {
                      if (!isResampleOpen) {
                        setIsResampleOpen(true)
                        setIsResampleClosing(false)
                        closeSteps()
                        closeHours()
                        closeSegments()
                        closeBubble()
                      } else {
                        closeResample()
                      }
                    }}
                  >
                    <HStack gap={1}>
                      <FiRepeat />
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showResampleLabel ? "80px" : "0px",
                          opacity: showResampleLabel ? 1 : 0,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {t("flow.simulation.resampleInterval")}
                      </Text>
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showResampleLabel ? "0px" : "80px",
                          opacity: showResampleLabel ? 0 : 1,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {typeof samplingIntervalHours === "number"
                          ? (1 / samplingIntervalHours).toFixed(1)
                          : t("common.notAvailable")}
                        {t("flow.simulation.unit.perHour")}
                      </Text>
                    </HStack>
                  </Button>
                  <Portal container={portalRef}>
                    {isResampleOpen &&
                      (() => {
                        const panelRect =
                          panelRef.current?.getBoundingClientRect()
                        const left =
                          (panelRect?.left ??
                            getAnchorCenter(resampleBtnRef.current).x) + 60
                        const top = Math.max((panelRect?.top ?? 0) - 120, 0)
                        return (
                          <Box
                            ref={resampleOverlayRef}
                            position="fixed"
                            left={`${left}px`}
                            top={`${top}px`}
                            zIndex={2000}
                            pointerEvents="auto"
                            animation={`${isResampleClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                          >
                            <Box position="relative" w="140px" h="88px">
                              {computeArcPositions(
                                2,
                                240,
                                300,
                                60,
                                80,
                                140,
                              ).map((p, i) => {
                                const values = [0.5, 1]
                                const value = values[i]
                                const active = samplingIntervalHours === value
                                return (
                                  <Button
                                    key={value}
                                    size="xs"
                                    {...getBubbleButtonStyles(active)}
                                    aria-pressed={active}
                                    position="absolute"
                                    left={`${p.x}px`}
                                    top={`${p.y}px`}
                                    transform="translate(-50%, -50%)"
                                    onClick={() => {
                                      validateAndUpdateParameters({
                                        sampling_interval_hours: value,
                                      })
                                      setIsResampleOpen(false)
                                      setIsResampleClosing(false)
                                    }}
                                  >
                                    {value}
                                  </Button>
                                )
                              })}
                            </Box>
                          </Box>
                        )
                      })()}
                  </Portal>
                </Field.Root>
              )}

              {supportsTimeSegments && (
                <Field.Root display="inline-flex" w="auto">
                  <Button
                    size="xs"
                    {...getToggleButtonStyles(isSegmentsOpen)}
                    aria-label={t("flow.actionPlate.segmentsAriaLabel")}
                    ref={segmentsBtnRef}
                    onMouseEnter={() => setShowSegmentsLabel(true)}
                    onMouseLeave={() => setShowSegmentsLabel(false)}
                    onClick={() => {
                      if (!isSegmentsOpen) {
                        setIsSegmentsOpen(true)
                        setIsSegmentsClosing(false)
                        closeSteps()
                        closeResample()
                        closeHours()
                        closeBubble()
                        closePalette()
                      } else {
                        closeSegments()
                      }
                    }}
                  >
                    <HStack gap={1}>
                      <FiSliders />
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showSegmentsLabel ? "84px" : "0px",
                          opacity: showSegmentsLabel ? 1 : 0,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {t("flow.simulation.timeSegments.shortLabel")}
                      </Text>
                      <Text
                        fontSize="xs"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        style={{
                          maxWidth: showSegmentsLabel ? "0px" : "110px",
                          opacity: showSegmentsLabel ? 0 : 1,
                          transition: "max-width 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        {timeSegments.length}{" "}
                        {t("flow.simulation.timeSegments.segmentCountSuffix")}
                      </Text>
                    </HStack>
                  </Button>
                  <Portal container={portalRef}>
                    {isSegmentsOpen &&
                      (() => {
                        const panelRect = panelRef.current?.getBoundingClientRect()
                        const desiredWidth = Math.min(
                          860,
                          Math.max(420, window.innerWidth - 24),
                        )
                        const left = Math.max(
                          12,
                          Math.min(
                            window.innerWidth - desiredWidth - 12,
                            (panelRect?.left ?? 12) - 40,
                          ),
                        )
                        const top = Math.max(
                          12,
                          (panelRect?.top ?? 0) - Math.min(540, window.innerHeight - 96),
                        )
                        return (
                          <Box
                            ref={segmentsOverlayRef}
                            position="fixed"
                            left={`${left}px`}
                            top={`${top}px`}
                            width={`${desiredWidth}px`}
                            zIndex={2000}
                            pointerEvents="auto"
                            animation={`${isSegmentsClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                          >
                            <Box
                              {...getGlassPanelStyles({ hovered: true })}
                              bg="hsla(0,0%,100%,0.88)"
                              borderRadius="xl"
                              borderWidth="1px"
                              borderColor="whiteAlpha.700"
                              p={3}
                              maxH="70vh"
                              overflowY="auto"
                            >
                              <TimeSegmentPlanEditor
                                timeSegments={timeSegments}
                                edges={flowEdges}
                                parameterNames={segmentParameterNames}
                                simulationHours={simulationHours}
                                setTimeSegments={setTimeSegments}
                                addTimeSegment={addTimeSegment}
                                updateTimeSegment={updateTimeSegment}
                                removeTimeSegment={removeTimeSegment}
                                copyTimeSegment={copyTimeSegment}
                                reorderTimeSegments={reorderTimeSegments}
                              />
                            </Box>
                          </Box>
                        )
                      })()}
                  </Portal>
                </Field.Root>
              )}
            </HStack>
          </Box>

          <Box display="flex" justifyContent="flex-end">
            {config.hours.visible && (
              <Field.Root>
                <Button
                  size="xs"
                  {...getToggleButtonStyles(false)}
                  aria-label={t("flow.actionPlate.hoursAriaLabel")}
                  ref={hoursBtnRef}
                  onMouseEnter={() => setShowHoursLabel(true)}
                  onMouseLeave={() => setShowHoursLabel(false)}
                  cursor={isHoursDisabled ? "not-allowed" : "pointer"}
                  onClick={
                    isHoursDisabled
                      ? undefined
                      : () => {
                          if (!isHoursOpen) {
                            setIsHoursOpen(true)
                            setIsHoursClosing(false)
                            closeSteps()
                            closeResample()
                            closeSegments()
                            closeBubble()
                          } else {
                            closeHours()
                          }
                        }
                  }
                >
                  <HStack gap={1}>
                    <FiClock />
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showHoursLabel ? "80px" : "0px",
                        opacity: showHoursLabel ? 1 : 0,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {t("flow.simulation.runtime")}
                    </Text>
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showHoursLabel ? "0px" : "80px",
                        opacity: showHoursLabel ? 0 : 1,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {Math.min(simulationHours, maxSimulationTime)}h
                    </Text>
                  </HStack>
                </Button>
                <Portal container={portalRef}>
                  {isHoursOpen &&
                    (() => {
                      const panelRect =
                        panelRef.current?.getBoundingClientRect()
                      const left =
                        (panelRect?.right ??
                          getAnchorCenter(hoursBtnRef.current).x) - 160
                      const top = Math.max((panelRect?.top ?? 0) - 40, 0)
                      return (
                        <Box
                          ref={hoursOverlayRef}
                          position="fixed"
                          left={`${left}px`}
                          top={`${top}px`}
                          zIndex={2000}
                          pointerEvents="auto"
                          animation={`${isHoursClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                        >
                          <Box position="relative" w="220px" h="96px">
                            <Field.Root>
                              <Slider.Root
                                value={[
                                  Math.min(simulationHours, maxSimulationTime),
                                ]}
                                onValueChange={(details) =>
                                  validateAndUpdateParameters({
                                    hours: details.value[0],
                                  })
                                }
                                min={config.hours.min}
                                max={maxSimulationTime}
                                step={config.hours.step}
                                width="100%"
                                disabled={isHoursDisabled}
                              >
                                <Slider.Control
                                  opacity={isHoursDisabled ? 0.5 : 1}
                                >
                                  <Slider.Track {...sliderTrackProps}>
                                    <Slider.Range
                                      bg={accentColor}
                                      borderRadius="inherit"
                                    />
                                  </Slider.Track>
                                  {renderSliderThumb(isHoursDisabled)}
                                </Slider.Control>
                              </Slider.Root>
                            </Field.Root>
                          </Box>
                        </Box>
                      )
                    })()}
                </Portal>
              </Field.Root>
            )}
          </Box>

          {/* 左侧：摘要信息 */}
          {/* <VStack align="flex-start" gap={2}>
            <Box>
              {finalStore.resultSummary ? (
                <VStack align="flex-start" gap={1}>
                  <Text fontSize="xs" color="gray.300">
                    时长 {finalStore.resultSummary.total_time} h · 步数{' '}
                    {finalStore.resultSummary.total_steps}
                  </Text>
                  <Text fontSize="xs" color="gray.300">
                    收敛 {finalStore.resultSummary.convergence_status}
                  </Text>
                </VStack>
              ) : (
                <Text fontSize="xs" color="gray.500">
                  暂无结果，点击中间按钮开始模拟。
                </Text>
              )}
            </Box>

            <Box>
              <Text fontSize="xs" color={accentColor} opacity={0.75}>
                Solver: {solverMethod}
              </Text>
            </Box>
          </VStack> */}

          <Box
            position="absolute"
            left="50%"
            top="50%"
            transform="translate(-50%, -50%)"
            zIndex={1700}
            pointerEvents="auto"
          >
            <VStack gap={1}>
              <Box
                as="button"
                w="54px"
                h="54px"
                borderRadius="full"
                bgGradient={startButtonGradient}
                borderWidth="2px"
                borderColor={
                  isStartDisabled ? "whiteAlpha.500" : startButtonBorderColor
                }
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor={isStartDisabled ? "not-allowed" : "pointer"}
                opacity={isStartDisabled ? 0.5 : 1}
                boxShadow={startButtonShadow}
                transition="transform 0.2s ease, box-shadow 0.2s ease"
                _hover={
                  isStartDisabled
                    ? undefined
                    : {
                        transform: "scale(1.02)",
                        boxShadow: `0 0 24px ${accentColor}`,
                      }
                }
                onClick={isStartDisabled ? undefined : handleStartSimulation}
              >
                <Box transform="translateX(2px)">
                  <FiPlay size={28} color={playIconColor} />
                </Box>
              </Box>
            </VStack>
          </Box>
        </HStack>

        {/* 计算完成状态提示 */}
        {/* {showCompletionAlert && (
          <Alert.Root
            status={isCalculationSuccessful ? 'success' : 'error'}
            mt={4}
            mb={2}
          >
            <Alert.Indicator>
              {isCalculationSuccessful ? <FiCheck /> : <FiX />}
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>
                {isCalculationSuccessful ? '计算完成' : '计算失败'}
              </Alert.Title>
              <Alert.Description>
                状态{' '}
                {finalStore.currentJob
                  ? getJobStatusText((finalStore.currentJob as any).status)
                  : '未知'}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )} */}

        <Box borderTopWidth={1} borderTopColor="whiteAlpha.200" mt={4}>
          <HStack w="100%" align="center" justify="space-between" gap={3}>
            <Box>
              <HStack gap={2} align="center">
                <Button
                  aria-label={t("flow.menu.actionsAriaLabel")}
                  size="xs"
                  {...getToggleButtonStyles(false)}
                  ref={bubbleBtnRef as any}
                  borderRadius="full"
                  h="32px"
                  minW="32px"
                  px={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => {
                    if (!isBubbleOpen) {
                      setIsBubbleOpen(true)
                      setIsBubbleClosing(false)
                      closeSteps()
                      closeResample()
                      closeHours()
                      closeSegments()
                      closePalette()
                    } else {
                      closeBubble()
                    }
                  }}
                  onMouseEnter={() => setShowMenuLabel(true)}
                  onMouseLeave={() => setShowMenuLabel(false)}
                >
                  <HStack gap={0}>
                    <FiMenu />
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showMenuLabel ? "80px" : "0px",
                        opacity: showMenuLabel ? 1 : 0,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {t("flow.menu.saveAndImport")}
                    </Text>
                  </HStack>
                </Button>
                <Portal container={portalRef}>
                  {isBubbleOpen &&
                    (() => {
                      const panelRect =
                        panelRef.current?.getBoundingClientRect()
                      const left = (panelRect?.left ?? 0) + 36
                      const top = (panelRect?.bottom ?? 0) - 80
                      const positions = computeArcPositions(
                        6,
                        150,
                        270,
                        150,
                        0,
                        0,
                      )
                      const hasUnsaved =
                        (flowNodes?.length || 0) > 0 ||
                        (flowEdges?.length || 0) > 0
                      const bubbleItems = [
                        {
                          icon: <FiFile />,
                          label: t("flow.menu.newFlowchart"),
                          onClick: () => {
                            if (hasUnsaved) {
                              setConfirmDialog({
                                isOpen: true,
                                title: t("flow.menu.newFlowchart"),
                                message: t("flow.menu.confirmSaveMessage"),
                                pendingAction: handleNewFlowChart,
                              })
                            } else {
                              handleNewFlowChart()
                            }
                            setIsBubbleOpen(false)
                          },
                        },
                        {
                          icon: <FiDownload />,
                          label: t("flow.menu.localExport"),
                          onClick: async () => {
                            await handleExportClick()
                            setIsBubbleOpen(false)
                          },
                        },
                        {
                          icon: <FiUpload />,
                          label: t("flow.menu.localImport"),
                          onClick: () => {
                            if (hasUnsaved) {
                              setConfirmDialog({
                                isOpen: true,
                                title: t("flow.menu.importFlowchart"),
                                message: t("flow.menu.confirmSaveMessage"),
                                pendingAction: handleImportClick,
                              })
                            } else {
                              handleImportClick()
                            }
                            setIsBubbleOpen(false)
                          },
                        },
                        {
                          icon: <FiSave />,
                          label: t("flow.menu.saveOnline"),
                          onClick: () => {
                            handleOpenSaveDialog()
                            setIsBubbleOpen(false)
                          },
                        },
                        {
                          icon: <FiFolder />,
                          label: t("flow.menu.loadOnline"),
                          onClick: () => {
                            handleOpenLoadDialog()
                            setIsBubbleOpen(false)
                          },
                        },
                        {
                          icon: <FiDatabase />,
                          label: t("flow.menu.loadCalculationData"),
                          onClick: () => {
                            handleOpenLoadCalcDialog()
                            setIsBubbleOpen(false)
                          },
                        },
                      ]
                      return (
                        <Box
                          ref={bubbleOverlayRef}
                          position="fixed"
                          left={`${left}px`}
                          top={`${top}px`}
                          zIndex={2000}
                          pointerEvents="auto"
                          animation={`${isBubbleClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                        >
                          <Box position="relative" w="220px" h="140px">
                            {bubbleItems.map((item, i) => (
                              <IconButton
                                key={i}
                                size="sm"
                                {...getBubbleButtonStyles(false)}
                                position="absolute"
                                left={`${positions[i].x}px`}
                                top={`${positions[i].y}px`}
                                transform="translate(-50%, -50%)"
                                onClick={item.onClick}
                                onMouseEnter={() => setHoveredBubbleIndex(i)}
                                onMouseLeave={() => setHoveredBubbleIndex(null)}
                              >
                                <HStack gap={0}>
                                  {item.icon}
                                  <Text
                                    fontSize="sm"
                                    whiteSpace="nowrap"
                                    overflow="hidden"
                                    style={{
                                      maxWidth:
                                        hoveredBubbleIndex === i
                                          ? "80px"
                                          : "0px",
                                      opacity: hoveredBubbleIndex === i ? 1 : 0,
                                      transition:
                                        "max-width 0.2s ease, opacity 0.2s ease",
                                    }}
                                  >
                                    {item.label}
                                  </Text>
                                </HStack>
                              </IconButton>
                            ))}
                          </Box>
                        </Box>
                      )
                    })()}
                </Portal>
                <Button
                  aria-label={t("flow.themePalette.ariaLabel")}
                  size="xs"
                  {...getToggleButtonStyles(false)}
                  ref={themeBtnRef as any}
                  borderRadius="full"
                  h="32px"
                  minW="32px"
                  px={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => {
                    if (!isPaletteOpen) {
                      setIsPaletteOpen(true)
                      setIsPaletteClosing(false)
                      closeSteps()
                      closeResample()
                      closeHours()
                      closeSegments()
                      closeBubble()
                    } else {
                      closePalette()
                    }
                  }}
                  onMouseEnter={() => setShowPaletteLabel(true)}
                  onMouseLeave={() => setShowPaletteLabel(false)}
                >
                  <HStack gap={0}>
                    <FaPalette />
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showPaletteLabel ? "80px" : "0px",
                        opacity: showPaletteLabel ? 1 : 0,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {t("flow.themePalette.title")}
                    </Text>
                  </HStack>
                </Button>
              </HStack>
              <Portal container={portalRef}>
                {isPaletteOpen &&
                  (() => {
                    const panelRect = panelRef.current?.getBoundingClientRect()
                    const left = (panelRect?.left ?? 0) - 400
                    const top = (panelRect?.bottom ?? 0) - 450
                    return (
                      <Box
                        ref={themeOverlayRef}
                        position="fixed"
                        left={`${left}px`}
                        top={`${top}px`}
                        zIndex={2000}
                        pointerEvents="auto"
                        animation={`${isPaletteClosing ? fadeOutUp : fadeInUp} 180ms ease`}
                      >
                        <Box position="relative" w="360px" h="220px">
                          <Box
                            {...getGlassPanelStyles({ hovered: true })}
                            p={3}
                            borderRadius="xl"
                            bg="hsla(0,0%,100%,0.72)"
                          >
                            <VStack gap={2}>
                              <PanelColorSelector
                                panelType={"grouped"}
                                accentColor={selectedBase}
                                onAccentColorChange={(c) => setSelectedBase(c)}
                                groupedChartColors={groupedColors}
                                onGroupedColorsChange={(colors) => {
                                  setGroupedColors(colors)
                                  const order =
                                    modelType === "asm1"
                                      ? [
                                          "asm1",
                                          "input",
                                          "output",
                                          "default",
                                          "asm3",
                                          "asmslim",
                                        ]
                                      : modelType === "asm3"
                                        ? [
                                            "asm3",
                                            "input",
                                            "output",
                                            "default",
                                            "asm1",
                                            "asmslim",
                                          ]
                                        : modelType === "asm1slim"
                                          ? [
                                              "asmslim",
                                              "input",
                                              "output",
                                              "default",
                                              "asm1",
                                              "asm3",
                                            ]
                                          : [
                                              "default",
                                              "input",
                                              "output",
                                              "asm1",
                                              "asm3",
                                              "asmslim",
                                            ]
                                  const modelKey =
                                    modelType === "materialBalance"
                                      ? "materialBalance"
                                      : modelType || "default"
                                  const palette =
                                    (colors as any).colors &&
                                    Array.isArray((colors as any).colors)
                                      ? (colors as any).colors
                                      : (() => {
                                          const a = buildColorScaleFromBase(
                                            colors.primary,
                                            4,
                                          )
                                          const b = buildColorScaleFromBase(
                                            colors.secondary || colors.primary,
                                            4,
                                          )
                                          return [...a, ...b]
                                        })()
                                  themeStore.setModelPalette(
                                    modelKey,
                                    selectedScheme,
                                    colors.primary,
                                    palette.length,
                                    palette,
                                  )
                                  themeStore.applyForModel(modelKey, order)
                                }}
                                dataGroupCount={8}
                                defaultGroupedMode={"sequence"}
                                defaultGroupedExpanded={true}
                              />
                              <HStack gap={2} w="100%" justify="center">
                                <Button
                                  size="xs"
                                  {...getToggleButtonStyles(activeClassic)}
                                  onClick={() => {
                                    const modelKey =
                                      modelType === "materialBalance"
                                        ? "materialBalance"
                                        : modelType || "default"
                                    themeStore.applyClassicThemeForModel(
                                      modelKey,
                                    )
                                  }}
                                >
                                  {t("flow.themePalette.classicTheme")}
                                </Button>
                                <Button
                                  size="xs"
                                  {...getToggleButtonStyles(activeClassicGlass)}
                                  onClick={() => {
                                    const modelKey =
                                      modelType === "materialBalance"
                                        ? "materialBalance"
                                        : modelType || "default"
                                    themeStore.applyClassicGlassThemeForModel(
                                      modelKey,
                                    )
                                  }}
                                >
                                  {t("flow.themePalette.classicGlass")}
                                </Button>
                                <Button
                                  size="xs"
                                  {...getToggleButtonStyles(activeDefaultGlass)}
                                  onClick={() => themeStore.reset()}
                                >
                                  {t("flow.themePalette.glass")}
                                </Button>
                                <Button
                                  size="xs"
                                  {...getToggleButtonStyles(false)}
                                  onClick={() => setIsPaletteOpen(false)}
                                >
                                  {t("common.close")}
                                </Button>
                              </HStack>
                            </VStack>
                          </Box>
                        </Box>
                      </Box>
                    )
                  })()}
              </Portal>
            </Box>
            <Box>
              <HStack gap={2} justify="flex-end">
                <Button
                  size="xs"
                  px={2}
                  variant="outline"
                  borderColor={accentColor}
                  color={accentColor}
                  borderRadius="full"
                  h="32px"
                  minW="32px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  opacity={hasResultData ? 1 : 0.5}
                  _hover={
                    hasResultData
                      ? { bg: "whiteAlpha.200", color: accentColor }
                      : { bg: "transparent" }
                  }
                  _focusVisible={{ boxShadow: `0 0 0 1px ${accentColor}` }}
                  cursor={hasResultData ? "pointer" : "not-allowed"}
                  onClick={
                    hasResultData ? () => setIsAnalysisOpen(true) : undefined
                  }
                  onMouseEnter={() => setShowAnalysisLabel(true)}
                  onMouseLeave={() => setShowAnalysisLabel(false)}
                >
                  <HStack gap={0}>
                    <FaChartLine />
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showAnalysisLabel ? "80px" : "0px",
                        opacity: showAnalysisLabel ? 1 : 0,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {t("flow.actionPlate.analysisResult")}
                    </Text>
                  </HStack>
                </Button>
                <Button
                  size="xs"
                  px={2}
                  {...getToggleButtonStyles(showMiniMap)}
                  aria-label={t("flow.actionPlate.minimap")}
                  borderRadius="full"
                  h="32px"
                  minW="32px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  onClick={() => setShowMiniMap(!showMiniMap)}
                  onMouseEnter={() => setShowMapLabel(true)}
                  onMouseLeave={() => setShowMapLabel(false)}
                >
                  <HStack gap={0}>
                    <FiMap />
                    <Text
                      fontSize="xs"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      style={{
                        maxWidth: showMapLabel ? "80px" : "0px",
                        opacity: showMapLabel ? 1 : 0,
                        transition: "max-width 0.2s ease, opacity 0.2s ease",
                      }}
                    >
                      {t("flow.actionPlate.minimap")}
                    </Text>
                  </HStack>
                </Button>
              </HStack>
            </Box>
          </HStack>
        </Box>

        {/* 分析对话框 */}
        <AnalysisDialog
          isOpen={isAnalysisOpen}
          onClose={() => setIsAnalysisOpen(false)}
          title={t("flow.analysis.dialogTitle")}
          size="cover"
        >
          {hasResultData && modelType === "asm1" && (
            <ASM1Analyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {hasResultData && modelType === "asm1slim" && (
            <ASM1SlimAnalyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {hasResultData && modelType === "asm3" && (
            <ASM3Analyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {hasResultData && modelType === "udm" && (
            <UDMAnalyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {hasResultData &&
            modelType !== "asm1" &&
            modelType !== "asm1slim" &&
            modelType !== "asm3" &&
            modelType !== "udm" && (
              <Text fontSize="sm" color={accentColor} opacity={0.8}>
                {t("flow.analysis.unavailable")}
              </Text>
            )}
        </AnalysisDialog>
        {confirmDialog && (
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            onClose={() => setConfirmDialog(null)}
            onConfirm={handleConfirmAction}
            title={confirmDialog.title}
            message={confirmDialog.message}
          />
        )}
        <BaseDialogManager
          flowStore={flowStore}
          modelStore={props.modelStore as any}
          isSaveDialogOpen={isSaveDialogOpen}
          isLoadDialogOpen={isLoadDialogOpen}
          onCloseSaveDialog={() => setIsSaveDialogOpen(false)}
          onCloseLoadDialog={() => setIsLoadDialogOpen(false)}
        />
        <BaseLoadCalculationDataDialog
          isOpen={isLoadCalculationDataDialogOpen}
          onClose={() => setIsLoadCalculationDataDialogOpen(false)}
          flowStore={flowStore}
          modelStore={props.modelStore as any}
          config={{
            pageSize: 10,
            jobNameField: "job_name",
            jobIdField: "job_id",
            jobStatusField: "status",
            jobCreatedAtField: "created_at",
            jobCompletedAtField: "completed_at",
            statusTextMap: {
              pending: t("flow.jobStatus.pending"),
              running: t("flow.jobStatus.running"),
              success: t("flow.jobStatus.success"),
              failed: t("flow.jobStatus.failed"),
              cancelled: t("flow.jobStatus.cancelled"),
            },
            statusColorMap: {
              pending: "yellow",
              running: "blue",
              success: "green",
              failed: "red",
              cancelled: "gray",
            },
            onLoadJobData: handleLoadJobData,
          }}
        />
      </Box>
    </Box>
  )
}

export default SimulationActionPlate
function computeArcPositions(
  count: number,
  startDeg: number,
  endDeg: number,
  radius: number,
  cx: number,
  cy: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const step = count === 1 ? 0 : (endDeg - startDeg) / (count - 1)
  return Array.from({ length: count }, (_, i) => {
    const deg = startDeg + step * i
    const rad = toRad(deg)
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  })
}
