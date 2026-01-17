import {
  Box,
  Button,
  Field,
  HStack,
  Image,
  Slider,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FiPlay, FiSettings } from "react-icons/fi"
import ASM1Analyzer from "../legacy-analysis/ASM1Analyzer"
import ASM1SlimAnalyzer from "../legacy-analysis/ASM1SlimAnalyzer"
import ASM3Analyzer from "../legacy-analysis/ASM3Analyzer"
import AnalysisDialog from "../legacy-analysis/AnalysisDialog"
import {
  GLASS_PANEL_RADIUS,
  type GlassTint,
  getAccentColor,
  getOutlineColor,
} from "../nodes/utils/glass"
import type { SimulationControllerProps } from "./useSimulationController"
import { useSimulationController } from "./useSimulationController"

interface SimulationActionPlateMPCIIProps extends SimulationControllerProps {}

function SimulationActionPlateMPCII(props: SimulationActionPlateMPCIIProps) {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [ev, setEv] = useState(0)
  const [priority, setPriority] = useState<"M" | "S" | "I">("S")

  const {
    config,
    modelType,
    simulationSteps,
    tolerance,
    maxIterations,
    maxMemoryMb,
    samplingIntervalHours,
    validateAndUpdateParameters,
    calculateVolumeDepletionTime,
    isJobCurrentlyRunning,
    elapsedTime,
    estimatedTotalTime,
    formatTime,
    handleStartSimulation,
    finalStore,
    edges,
    edgeParameterConfigs,
  } = useSimulationController(props)

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

  const stepOptions: number[] = []
  for (
    let value = config.stepsPerHour.min;
    value <= config.stepsPerHour.max;
    value += config.stepsPerHour.step
  ) {
    stepOptions.push(value)
  }
  const samplingOptions = config.samplingIntervalHours.options ?? []

  const getCapsuleButton = (
    label: string,
    active: boolean,
    onClick: () => void,
  ) => (
    <Button
      size="xs"
      variant="outline"
      borderColor={accentColor}
      color={active ? "white" : accentColor}
      bg={active ? accentColor : "transparent"}
      boxShadow={active ? `0 0 0 1px ${accentColor}` : "none"}
      _hover={{
        bg: active ? accentColor : "whiteAlpha.200",
        color: active ? "white" : accentColor,
      }}
      _focusVisible={{ boxShadow: `0 0 0 1px ${accentColor}` }}
      onClick={onClick}
    >
      {label}
    </Button>
  )

  const startButtonGradient = `radial(circle at 40% 30%, ${accentColor} 0%, rgba(0,0,0,0.45) 100%)`
  const startButtonShadow = isStartDisabled ? "none" : `0 0 18px ${accentColor}`
  const startButtonBorderColor = isJobCurrentlyRunning
    ? accentOutlineColor
    : accentColor
  const playIconColor = isStartDisabled ? "rgba(255,255,255,0.65)" : "#f8fafc"

  return (
    <Box
      position="absolute"
      left="50%"
      bottom="2"
      transform="translateX(-50%)"
      zIndex={1200}
      pointerEvents="none"
      width="full"
      maxW="min(720px, 100vw - 80px)"
    >
      <Box
        pointerEvents="auto"
        position="relative"
        px={0}
        py={0}
        borderRadius={GLASS_PANEL_RADIUS}
        overflow="hidden"
      >
        <Box position="absolute" inset={0}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 720 180"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1b1c1f" />
                <stop offset="55%" stopColor="#151618" />
                <stop offset="100%" stopColor="#0f1012" />
              </linearGradient>
              <linearGradient id="lowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#121315" />
                <stop offset="100%" stopColor="#1a1b1e" />
              </linearGradient>
              <radialGradient id="gloss" cx="40%" cy="0%" r="80%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter
                id="innerShadow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feOffset dx="0" dy="1" />
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite
                  in="SourceGraphic"
                  in2="blur"
                  operator="arithmetic"
                  k2="-1"
                  k3="1"
                />
              </filter>
            </defs>
            <path
              d="M16,0 H704 a16,16 0 0 1 16,16 V92 a12,12 0 0 1 -12,12 H12 a12,12 0 0 1 -12,-12 V16 a16,16 0 0 1 16,-16 Z"
              fill="url(#plateGrad)"
            />
            <path
              d="M20,92 H700 a28,28 0 0 1 28,28 V160 a20,20 0 0 1 -20,20 H40 a20,20 0 0 1 -20,-20 V120 a28,28 0 0 1 0,-28 Z"
              fill="url(#lowerGrad)"
            />
            <rect x="0" y="0" width="720" height="180" fill="url(#gloss)" />
          </svg>
        </Box>
        <Box position="relative" px={6} py={4}>
          <HStack justify="space-between" align="center" mb={3}>
            <HStack gap={3}>
              <Box
                w="36px"
                h="36px"
                borderRadius="full"
                bgGradient={`radial(circle at 50% 40%, ${accentColor} 0%, rgba(0,0,0,0.6) 100%)`}
                boxShadow={`0 0 12px ${accentColor}`}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="xs">FVL</Text>
              </Box>
              <Box
                w="36px"
                h="36px"
                borderRadius="full"
                display="grid"
                placeItems="center"
                borderWidth="2px"
                borderColor="whiteAlpha.400"
              >
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  borderWidth="3px"
                  borderColor={accentColor}
                  borderStyle="solid"
                />
              </Box>
            </HStack>
            <Box flex="1" mx={4}>
              <Slider.Root
                value={[ev]}
                onValueChange={(d) => setEv(d.value[0])}
                min={-3}
                max={3}
                step={0.1}
                width="100%"
              >
                <Slider.Control>
                  <Slider.Track bg="whiteAlpha.300" borderRadius="full" h="4px">
                    <Slider.Range bg={accentColor} borderRadius="inherit" />
                  </Slider.Track>
                  <Slider.Thumb
                    index={0}
                    boxSize={4}
                    borderWidth="2px"
                    borderColor="white"
                    bg={accentColor}
                    boxShadow={`0 0 0 1px rgba(0,0,0,0.25), 0 0 10px ${accentColor}`}
                  />
                </Slider.Control>
              </Slider.Root>
              <HStack justify="center" mt={1}>
                <Text fontSize="xs">EV {ev.toFixed(1)}</Text>
              </HStack>
            </Box>
            <VStack align="flex-end" minW="160px">
              <Text fontSize="xs">{simulationSteps} SS</Text>
              <Text fontSize="xs">{ev.toFixed(1)} EV</Text>
              <Text fontSize="xs">{maxMemoryMb} ISO</Text>
            </VStack>
          </HStack>
          <HStack justify="space-between" align="center">
            <HStack gap={3}>
              <Box
                w="56px"
                h="40px"
                borderRadius="md"
                overflow="hidden"
                bg="whiteAlpha.200"
              >
                {finalStore.currentJob?.result_data ? (
                  <Image src="" alt="" w="100%" h="100%" objectFit="cover" />
                ) : (
                  <Box w="100%" h="100%" display="grid" placeItems="center">
                    <Text fontSize="xs" color="gray.300">
                      Gallery
                    </Text>
                  </Box>
                )}
              </Box>
              <HStack px={3} py={2} borderRadius="full" bg="whiteAlpha.100">
                <Text fontSize="xs">{modelType?.toUpperCase() || "MODE"}</Text>
              </HStack>
            </HStack>
            <Box
              as="button"
              w="60px"
              h="60px"
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
              <FiPlay size={28} color={playIconColor} />
            </Box>
            <HStack gap={3} px={4} py={2} borderRadius="xl" bg="whiteAlpha.100">
              {getCapsuleButton("M", priority === "M", () => setPriority("M"))}
              {getCapsuleButton("S", priority === "S", () => setPriority("S"))}
              {getCapsuleButton("I", priority === "I", () => setPriority("I"))}
            </HStack>
            <Box
              w="40px"
              h="40px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="whiteAlpha.100"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              cursor={
                finalStore.currentJob?.result_data ? "pointer" : "not-allowed"
              }
              opacity={finalStore.currentJob?.result_data ? 1 : 0.5}
              onClick={
                finalStore.currentJob?.result_data
                  ? () => setIsAnalysisOpen(true)
                  : undefined
              }
            >
              <FiSettings color={accentColor} />
            </Box>
          </HStack>
          <HStack mt={4} gap={4} align="center">
            {config.stepsPerHour.visible && (
              <Field.Root>
                <HStack mb={1}>
                  <Text fontSize="xs">
                    {config.stepsPerHour.label}
                    {config.stepsPerHour.unit
                      ? ` (${config.stepsPerHour.unit})`
                      : ""}
                  </Text>
                </HStack>
                <HStack gap={1} flexWrap="wrap">
                  {stepOptions.map((value) => (
                    <Button
                      key={value}
                      size="xs"
                      variant="outline"
                      borderColor={accentColor}
                      color={simulationSteps === value ? "white" : accentColor}
                      bg={
                        simulationSteps === value ? accentColor : "transparent"
                      }
                      boxShadow={
                        simulationSteps === value
                          ? `0 0 0 1px ${accentColor}`
                          : "none"
                      }
                      _hover={{
                        bg:
                          simulationSteps === value
                            ? accentColor
                            : "whiteAlpha.200",
                        color:
                          simulationSteps === value ? "white" : accentColor,
                      }}
                      _focusVisible={{ boxShadow: `0 0 0 1px ${accentColor}` }}
                      onClick={() =>
                        validateAndUpdateParameters({ steps_per_hour: value })
                      }
                    >
                      {value}
                    </Button>
                  ))}
                </HStack>
              </Field.Root>
            )}
            {config.samplingIntervalHours.visible &&
              samplingOptions.length > 0 && (
                <Field.Root>
                  <HStack mb={1}>
                    <Text fontSize="xs">
                      {config.samplingIntervalHours.label}
                      {config.samplingIntervalHours.unit
                        ? ` (${config.samplingIntervalHours.unit})`
                        : ""}
                    </Text>
                  </HStack>
                  <HStack gap={1}>
                    {samplingOptions.map((option) => (
                      <Button
                        key={option.value}
                        size="xs"
                        variant="outline"
                        borderColor={accentColor}
                        color={
                          samplingIntervalHours === option.value
                            ? "white"
                            : accentColor
                        }
                        bg={
                          samplingIntervalHours === option.value
                            ? accentColor
                            : "transparent"
                        }
                        boxShadow={
                          samplingIntervalHours === option.value
                            ? `0 0 0 1px ${accentColor}`
                            : "none"
                        }
                        _hover={{
                          bg:
                            samplingIntervalHours === option.value
                              ? accentColor
                              : "whiteAlpha.200",
                          color:
                            samplingIntervalHours === option.value
                              ? "white"
                              : accentColor,
                        }}
                        _focusVisible={{
                          boxShadow: `0 0 0 1px ${accentColor}`,
                        }}
                        onClick={() =>
                          validateAndUpdateParameters({
                            sampling_interval_hours: option.value,
                          })
                        }
                      >
                        {option.label}
                      </Button>
                    ))}
                  </HStack>
                </Field.Root>
              )}
          </HStack>
          <HStack justify="space-between" mt={2} opacity={0.75}>
            <Text fontSize="xs">
              {formatTime(elapsedTime)} / {formatTime(estimatedTotalTime)}
            </Text>
            <Text fontSize="xs">
              Tol {tolerance} · Iter {maxIterations} · Mem {maxMemoryMb}MB
            </Text>
          </HStack>
        </Box>
        <AnalysisDialog
          isOpen={isAnalysisOpen}
          onClose={() => setIsAnalysisOpen(false)}
          title="计算结果分析"
          size="xl"
        >
          {finalStore.currentJob?.result_data && modelType === "asm1" && (
            <ASM1Analyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {finalStore.currentJob?.result_data && modelType === "asm1slim" && (
            <ASM1SlimAnalyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {finalStore.currentJob?.result_data && modelType === "asm3" && (
            <ASM3Analyzer
              resultData={finalStore.currentJob?.result_data}
              edges={edges}
              edgeParameterConfigs={edgeParameterConfigs}
            />
          )}
          {finalStore.currentJob?.result_data &&
            modelType !== "asm1" &&
            modelType !== "asm1slim" &&
            modelType !== "asm3" && (
              <Text fontSize="sm" color={accentColor} opacity={0.8}>
                当前模型暂未配置图形化分析视图。
              </Text>
            )}
        </AnalysisDialog>
      </Box>
    </Box>
  )
}

export default SimulationActionPlateMPCII
