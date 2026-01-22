import {
  Box,
  Button,
  HStack,
  IconButton,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useState } from "react"
import { LuChevronDown, LuChevronUp } from "react-icons/lu"
import {
  ENHANCED_HEATMAP_SCHEMES,
  EXTENDED_COLOR_PALETTE,
  type EnhancedHeatmapColorSchemeId,
  type GroupedChartColors,
  HEATMAP_COLOR_SCHEMES,
  type HeatmapColorSchemeId,
  TAB10_COLORS,
  generateGroupedColors,
} from "../nodes/utils/colorSchemes"
import { useI18n } from "../../../i18n"

interface PanelColorSelectorProps {
  panelType: "basic" | "grouped" | "heatmap" | "enhanced-heatmap" | "custom"
  accentColor?: string
  onAccentColorChange?: (color: string) => void
  groupedChartColors?: GroupedChartColors
  onGroupedColorsChange?: (colors: GroupedChartColors) => void
  dataGroupCount?: number
  customColorPalette?: string[]
  onCustomPaletteChange?: (palette: string[]) => void
  heatmapScheme?: HeatmapColorSchemeId
  onHeatmapSchemeChange?: (scheme: HeatmapColorSchemeId) => void
  enhancedHeatmapScheme?: EnhancedHeatmapColorSchemeId
  onEnhancedHeatmapSchemeChange?: (scheme: EnhancedHeatmapColorSchemeId) => void
  onResetToGlobal?: () => void
  onReset?: () => void
  defaultGroupedMode?: "gradient" | "sequence"
  defaultExpanded?: boolean
  defaultGroupedExpanded?: boolean
}

const DEFAULT_COLOR_OPTIONS = TAB10_COLORS.slice(0, 9)

export const PanelColorSelector: React.FC<PanelColorSelectorProps> = ({
  panelType,
  accentColor,
  onAccentColorChange,
  groupedChartColors,
  onGroupedColorsChange,
  dataGroupCount,
  customColorPalette,
  heatmapScheme,
  onHeatmapSchemeChange,
  enhancedHeatmapScheme,
  onEnhancedHeatmapSchemeChange,
  onResetToGlobal,
  onReset,
  defaultGroupedMode,
  defaultExpanded,
  defaultGroupedExpanded,
}) => {
  const { t } = useI18n()
  const [isExpanded, setIsExpanded] = useState(!!defaultExpanded)
  const [isGroupedExpanded, setIsGroupedExpanded] = useState(
    !!defaultGroupedExpanded,
  )
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false)
  const [groupedColorMode, setGroupedColorMode] = useState<
    "gradient" | "sequence"
  >(defaultGroupedMode ?? "gradient")

  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      callback()
    }
  }

  const handleGroupedColorGeneration = (
    baseColor: string,
    type: GroupedChartColors["type"],
  ) => {
    const newColors = generateGroupedColors(baseColor, type)
    onGroupedColorsChange?.(newColors)
  }

  const handleSequenceColorGeneration = (baseColor: string, count?: number) => {
    const colorCount = count ?? dataGroupCount ?? 5
    const allColors = [...TAB10_COLORS, ...EXTENDED_COLOR_PALETTE]
    const baseIndex = allColors.findIndex(
      (color) => color.toLowerCase() === baseColor.toLowerCase(),
    )
    if (baseIndex === -1) return
    const sequenceColors = []
    for (let i = 0; i < colorCount; i++) {
      const colorIndex = (baseIndex + i) % allColors.length
      sequenceColors.push(allColors[colorIndex])
    }
    const newColors: GroupedChartColors & { colors?: string[] } = {
      type: "monochromatic",
      primary: baseColor,
      secondary: sequenceColors[1] || baseColor,
      colors: sequenceColors,
    }
    onGroupedColorsChange?.(newColors)
  }

  const getHeatmapGradient = (scheme: HeatmapColorSchemeId): string => {
    const colors = HEATMAP_COLOR_SCHEMES[scheme]?.colors || [
      "#ffffff",
      "#000000",
    ]
    return `linear-gradient(to right, ${colors.join(", ")})`
  }

  const getEnhancedHeatmapGradient = (
    scheme: EnhancedHeatmapColorSchemeId,
  ): string => {
    const colors = ENHANCED_HEATMAP_SCHEMES[scheme]?.colors || [
      "#ffffff",
      "#000000",
    ]
    return `linear-gradient(to right, ${colors.join(", ")})`
  }

  const renderBasicColors = () => {
    const colorsPerRow = 9
    const renderColorGrid = (colors: string[], title?: string) => {
      const rows = []
      for (let i = 0; i < colors.length; i += colorsPerRow) {
        const rowColors = colors.slice(i, i + colorsPerRow)
        rows.push(
          <HStack key={i} gap={2} justify="flex-start">
            {rowColors.map((color) => {
              const isActive =
                accentColor?.toLowerCase() === color.toLowerCase()
              return (
                <Button
                  key={color}
                  variant="ghost"
                  size="xs"
                  borderRadius="full"
                  minW="24px"
                  h="24px"
                  p={0}
                  borderWidth={isActive ? "2px" : "1px"}
                  borderColor={isActive ? "gray.900" : "gray.200"}
                  bg={color}
                  _hover={{
                    borderColor: "gray.500",
                    transform: "scale(1.1)",
                    boxShadow: "md",
                  }}
                  _focus={{
                    outline: "2px solid",
                    outlineColor: "blue.500",
                    outlineOffset: "2px",
                  }}
                  onClick={() => onAccentColorChange?.(color)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => onAccentColorChange?.(color))
                  }
                  aria-label={t("flow.palette.selectColor", { color })}
                  aria-pressed={isActive}
                  role="button"
                  tabIndex={0}
                />
              )
            })}
          </HStack>,
        )
      }
      return (
        <VStack align="stretch" gap={2}>
          {title && (
            <Text fontSize="xs" fontWeight="medium" color="gray.700">
              {title}
            </Text>
          )}
          {rows}
        </VStack>
      )
    }
    return (
      <VStack align="stretch" gap={3}>
        {renderColorGrid(DEFAULT_COLOR_OPTIONS)}
        {isExpanded && (
          <>
            <Separator />
            {renderColorGrid(
              EXTENDED_COLOR_PALETTE,
              t("flow.palette.extendedPalette"),
            )}
          </>
        )}
        <HStack justify="center" mt={2}>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={
              isExpanded
                ? t("flow.palette.collapseExtendedPalette")
                : t("flow.palette.expandExtendedPalette")
            }
          >
            {isExpanded ? <LuChevronUp /> : <LuChevronDown />}
          </IconButton>
        </HStack>
      </VStack>
    )
  }

  const renderGroupedColors = () => {
    const colorsPerRow = 9
    const renderColorGrid = (colors: string[]) => {
      const rows = []
      for (let i = 0; i < colors.length; i += colorsPerRow) {
        const rowColors = colors.slice(i, i + colorsPerRow)
        rows.push(
          <HStack key={i} gap={2} justify="flex-start">
            {rowColors.map((color) => {
              const isActive =
                groupedChartColors?.primary?.toLowerCase() ===
                color.toLowerCase()
              return (
                <Button
                  key={color}
                  variant="ghost"
                  size="xs"
                  borderRadius="full"
                  minW="24px"
                  h="24px"
                  p={0}
                  borderWidth={isActive ? "2px" : "1px"}
                  borderColor={isActive ? "gray.900" : "gray.200"}
                  bg={color}
                  _hover={{
                    borderColor: "gray.500",
                    transform: "scale(1.1)",
                    boxShadow: "md",
                  }}
                  _focus={{
                    outline: "2px solid",
                    outlineColor: "blue.500",
                    outlineOffset: "2px",
                  }}
                  onClick={() => {
                    if (groupedColorMode === "gradient") {
                      handleGroupedColorGeneration(color, "monochromatic")
                    } else {
                      handleSequenceColorGeneration(color)
                    }
                  }}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => {
                      if (groupedColorMode === "gradient") {
                        handleGroupedColorGeneration(color, "monochromatic")
                      } else {
                        handleSequenceColorGeneration(color)
                      }
                    })
                  }
                  aria-label={t("flow.palette.selectGroupedColor", { color })}
                  aria-pressed={isActive}
                  role="button"
                  tabIndex={0}
                />
              )
            })}
          </HStack>,
        )
      }
      return (
        <VStack align="stretch" gap={2}>
          {rows}
        </VStack>
      )
    }
    return (
      <VStack align="stretch" gap={3}>
        {renderColorGrid(DEFAULT_COLOR_OPTIONS)}
        {isGroupedExpanded && (
          <>
            <Separator />
            {renderColorGrid(EXTENDED_COLOR_PALETTE)}
          </>
        )}
        <HStack justify="center" mt={2}>
          <Button
            size="xs"
            variant={groupedColorMode === "gradient" ? "solid" : "outline"}
            onClick={() => setGroupedColorMode("gradient")}
          >
            {t("flow.palette.modeGradient")}
          </Button>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={() => setIsGroupedExpanded(!isGroupedExpanded)}
            aria-label={
              isGroupedExpanded
                ? t("flow.palette.collapseExtendedPalette")
                : t("flow.palette.expandExtendedPalette")
            }
          >
            {isGroupedExpanded ? <LuChevronUp /> : <LuChevronDown />}
          </IconButton>
          <Button
            size="xs"
            variant={groupedColorMode === "sequence" ? "solid" : "outline"}
            onClick={() => setGroupedColorMode("sequence")}
          >
            {t("flow.palette.modeSequence")}
          </Button>
        </HStack>
      </VStack>
    )
  }

  const renderHeatmapSchemes = () => {
    const basicHeatmapSchemes = [
      "blueRed",
      "coolWarm",
      "seabornDiverging",
      "greenOrange",
    ] as HeatmapColorSchemeId[]
    const renderHeatmapGrid = (
      schemes: HeatmapColorSchemeId[],
      title?: string,
    ) => (
      <VStack align="stretch" gap={2}>
        {title && (
          <Text fontSize="xs" fontWeight="medium" color="gray.700">
            {title}
          </Text>
        )}
        <HStack gap={2} flexWrap="wrap">
          {schemes.map((scheme) => {
            const schemeKey = scheme as HeatmapColorSchemeId
            const meta = HEATMAP_COLOR_SCHEMES[schemeKey]
            const gradient = getHeatmapGradient(schemeKey)
            const isActive = heatmapScheme === schemeKey
            return (
              <Box
                key={scheme}
                as="button"
                w="60px"
                h="20px"
                borderRadius="md"
                borderWidth={isActive ? "2px" : "1px"}
                borderColor={isActive ? "gray.900" : "gray.200"}
                background={gradient}
                _hover={{
                  borderColor: "gray.500",
                  transform: "scale(1.05)",
                }}
                _focus={{
                  outline: "2px solid",
                  outlineColor: "blue.500",
                  outlineOffset: "2px",
                }}
                onClick={() => onHeatmapSchemeChange?.(schemeKey)}
                onKeyDown={(e) =>
                  handleKeyDown(e, () => onHeatmapSchemeChange?.(schemeKey))
                }
                aria-label={t("flow.palette.selectHeatmapScheme", {
                  name: meta.name,
                })}
                aria-pressed={isActive}
                role="button"
                tabIndex={0}
                title={meta.name}
              />
            )
          })}
        </HStack>
      </VStack>
    )
    return (
      <VStack align="stretch" gap={3}>
        <Text fontSize="xs" fontWeight="medium" color="gray.700">
          {t("flow.palette.heatmapTitle")}
        </Text>
        {renderHeatmapGrid(basicHeatmapSchemes)}
        {isHeatmapExpanded && (
          <>
            <Separator />
            <VStack align="stretch" gap={2}>
              <Text fontSize="xs" fontWeight="medium" color="gray.700">
                {t("flow.palette.enhancedPalette")}
              </Text>
              <HStack gap={2} flexWrap="wrap">
                {Object.keys(ENHANCED_HEATMAP_SCHEMES).map((scheme) => {
                  const schemeKey = scheme as EnhancedHeatmapColorSchemeId
                  const meta = ENHANCED_HEATMAP_SCHEMES[schemeKey]
                  const gradient = getEnhancedHeatmapGradient(schemeKey)
                  const isActive = enhancedHeatmapScheme === schemeKey
                  return (
                    <Box
                      key={scheme}
                      as="button"
                      w="60px"
                      h="20px"
                      borderRadius="md"
                      borderWidth={isActive ? "2px" : "1px"}
                      borderColor={isActive ? "gray.900" : "gray.200"}
                      background={gradient}
                      _hover={{
                        borderColor: "gray.500",
                        transform: "scale(1.05)",
                      }}
                      _focus={{
                        outline: "2px solid",
                        outlineColor: "blue.500",
                        outlineOffset: "2px",
                      }}
                      onClick={() => onEnhancedHeatmapSchemeChange?.(schemeKey)}
                      onKeyDown={(e) =>
                        handleKeyDown(e, () =>
                          onEnhancedHeatmapSchemeChange?.(schemeKey),
                        )
                      }
                      aria-label={t("flow.palette.selectEnhancedHeatmapScheme", {
                        name: meta.name,
                      })}
                      aria-pressed={isActive}
                      role="button"
                      tabIndex={0}
                      title={meta.name}
                    />
                  )
                })}
              </HStack>
            </VStack>
          </>
        )}
        <HStack justify="center" mt={2}>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={() => setIsHeatmapExpanded(!isHeatmapExpanded)}
            aria-label={
              isHeatmapExpanded
                ? t("flow.palette.collapseExtendedPalette")
                : t("flow.palette.expandExtendedPalette")
            }
          >
            {isHeatmapExpanded ? <LuChevronUp /> : <LuChevronDown />}
          </IconButton>
        </HStack>
      </VStack>
    )
  }

  const renderEnhancedHeatmapSchemes = () => {
    return (
      <VStack align="stretch" gap={3}>
        <HStack gap={2} flexWrap="wrap">
          {Object.keys(ENHANCED_HEATMAP_SCHEMES).map((scheme) => {
            const schemeKey = scheme as EnhancedHeatmapColorSchemeId
            const meta = ENHANCED_HEATMAP_SCHEMES[schemeKey]
            const gradient = getEnhancedHeatmapGradient(schemeKey)
            const isActive = enhancedHeatmapScheme === schemeKey
            return (
              <Box
                key={scheme}
                as="button"
                w="60px"
                h="20px"
                borderRadius="md"
                borderWidth={isActive ? "2px" : "1px"}
                borderColor={isActive ? "gray.900" : "gray.200"}
                background={gradient}
                _hover={{
                  borderColor: "gray.500",
                  transform: "scale(1.05)",
                }}
                _focus={{
                  outline: "2px solid",
                  outlineColor: "blue.500",
                  outlineOffset: "2px",
                }}
                onClick={() => onEnhancedHeatmapSchemeChange?.(schemeKey)}
                onKeyDown={(e) =>
                  handleKeyDown(e, () =>
                    onEnhancedHeatmapSchemeChange?.(schemeKey),
                  )
                }
                aria-label={t("flow.palette.selectEnhancedHeatmapScheme", {
                  name: meta.name,
                })}
                aria-pressed={isActive}
                role="button"
                tabIndex={0}
                title={meta.name}
              />
            )
          })}
        </HStack>
      </VStack>
    )
  }

  const renderCustomPalette = () => (
    <VStack align="stretch" gap={3}>
      <Text fontSize="xs" fontWeight="medium" color="gray.700">
        {t("flow.palette.customPaletteTitle")}
      </Text>
      {customColorPalette && customColorPalette.length > 0 ? (
        <HStack gap={2} flexWrap="wrap">
          {customColorPalette.map((color, index) => (
            <Box
              key={index}
              w="20px"
              h="20px"
              bg={color}
              borderRadius="sm"
              border="1px solid"
              borderColor="gray.200"
              cursor="pointer"
              _hover={{ borderColor: "gray.400" }}
            />
          ))}
        </HStack>
      ) : (
        <Text fontSize="xs" color="gray.500">
          {t("flow.palette.customPaletteEmpty")}
        </Text>
      )}
    </VStack>
  )

  const renderContent = () => {
    switch (panelType) {
      case "basic":
        return renderBasicColors()
      case "grouped":
        return renderGroupedColors()
      case "heatmap":
        return renderHeatmapSchemes()
      case "enhanced-heatmap":
        return renderEnhancedHeatmapSchemes()
      case "custom":
        return renderCustomPalette()
      default:
        return renderBasicColors()
    }
  }

  return (
    <VStack align="stretch" gap={3} p={3} minW="200px" maxW="300px">
      {renderContent()}
      {(onResetToGlobal || onReset) && (
        <>
          <Separator />
          <Button
            size="xs"
            variant="outline"
            onClick={onResetToGlobal || onReset}
            colorScheme="gray"
          >
            {t("flow.palette.resetToGlobal")}
          </Button>
        </>
      )}
    </VStack>
  )
}

export default PanelColorSelector
