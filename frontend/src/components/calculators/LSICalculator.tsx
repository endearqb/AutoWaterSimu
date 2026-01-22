import { useColorModeValue } from "@/components/ui/color-mode"
import {
  Box,
  Card,
  Flex,
  Grid,
  GridItem,
  Slider,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import { useI18n } from "@/i18n"

interface SliderValues {
  ph: number // pH
  ta: number // 碳酸盐碱度 (mg/L as CaCO3) —— 若为总碱度，请先校正
  ch: number // 钙硬度 (mg/L as CaCO3)
  temp: number // 温度 (°C)
  tds: number // 总溶解性固体 (mg/L)
}

const LSICalculator: React.FC = () => {
  const { t } = useI18n()
  const [values, setValues] = React.useState<SliderValues>({
    ph: 7.5,
    ta: 100,
    ch: 150,
    temp: 25,
    tds: 300,
  })

  const cardBg = useColorModeValue("white", "gray.800")

  // -------- helpers ----------
  const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi)
  const safe = (x: number, floor = 1e-6) => Math.max(x, floor)
  const log10 = (x: number) => Math.log10(x)

  type LSIResult = {
    lsi: number
    ir: number // 雷兹纳指数
    pHs: number
    A: number
    B: number
    C: number
    D: number
  }

  // 连续公式（行业通用）：LSI = pH - pHs, IR = 2*pHs - pH
  // pHs = (9.3 + A + B) - (C + D)
  // A = (log10(TDS) - 1) / 10
  // B = -13.12 * log10(T[K]) + 34.55
  // C = log10(Ca 硬度 as CaCO3) - 0.4
  // D = log10(碳酸盐碱度 as CaCO3)
  const calculateLSI = (
    ph: number,
    ta: number,
    ch: number,
    tempC: number,
    tds: number,
  ): LSIResult => {
    const T_K = tempC + 273.15

    const A = (log10(safe(tds)) - 1) / 10
    const B = -13.12 * log10(safe(T_K) + 273) + 34.55
    const C = log10(safe(ch)) - 0.4
    const D = log10(safe(ta))

    const pHs = 9.3 + A + B - (C + D)
    const lsi = ph - pHs // 朗格利尔指数
    const ir = 2 * pHs - ph // 雷兹纳指数

    return { lsi, ir, pHs, A, B, C, D }
  }

  const { ph, ta, ch, temp, tds } = values
  const { lsi, ir, pHs, A, B, C, D } = calculateLSI(ph, ta, ch, temp, tds)

  const getInterpretation = (lsiValue: number) => {
    if (lsiValue < -0.3) {
      return {
        text: t("calculators.lsi.interpretation.corrosive"),
        color: "red.500",
        bgColor: "red.50",
      }
    }
    if (lsiValue > 0.3) {
      return {
        text: t("calculators.lsi.interpretation.scaling"),
        color: "yellow.600",
        bgColor: "yellow.50",
      }
    }
    return {
      text: t("calculators.lsi.interpretation.balanced"),
      color: "green.500",
      bgColor: "green.50",
    }
  }

  const getRyznarInterpretation = (irValue: number) => {
    if (irValue < 5) {
      return {
        text: t("calculators.lsi.ryznarInterpretation.strongScaling"),
        color: "orange.600",
        bgColor: "orange.50",
      }
    }
    if (irValue < 6) {
      return {
        text: t("calculators.lsi.ryznarInterpretation.slightScaling"),
        color: "yellow.600",
        bgColor: "yellow.50",
      }
    }
    if (irValue < 7) {
      return {
        text: t("calculators.lsi.ryznarInterpretation.balanced"),
        color: "green.500",
        bgColor: "green.50",
      }
    }
    if (irValue < 7.5) {
      return {
        text: t("calculators.lsi.ryznarInterpretation.slightCorrosive"),
        color: "blue.500",
        bgColor: "blue.50",
      }
    }
    if (irValue < 8) {
      return {
        text: t("calculators.lsi.ryznarInterpretation.significantCorrosive"),
        color: "purple.500",
        bgColor: "purple.50",
      }
    }
    return {
      text: t("calculators.lsi.ryznarInterpretation.strongCorrosive"),
      color: "red.600",
      bgColor: "red.50",
    }
  }

  const interpretation = getInterpretation(lsi)
  const ryznarInterpretation = getRyznarInterpretation(ir)
  const formatValue = (value: number, decimals: number) =>
    Number.isFinite(value) ? value.toFixed(decimals) : "—"

  // 简单仪表：将 LSI ∈ [-2, 2] 映射到 [-90°, 90°]
  const rotation = clamp(lsi * 45, -90, 90)
  // 雷兹纳指数仪表：将 IR ∈ [4, 10] 映射到 [-90°, 90°]
  const ryznarRotation = clamp((ir - 7) * 30, -90, 90)

  return (
    <Box w="100%">
      <Card.Root bg={cardBg} shadow="md" borderRadius="xl" overflow="hidden">
        <Card.Body p={8}>
          <Text fontSize="3xl" fontWeight="extrabold" color="gray.800" mb={4}>
            {t("calculators.lsi.title")}
          </Text>

          <Text maxW="full" mx="auto" fontSize="lg" color="gray.600" mb={6}>
            {t("calculators.lsi.description")}
          </Text>

          <Grid
            templateColumns={{ base: "1fr", lg: "1fr 1fr 1fr" }}
            gap={8}
            alignItems="center"
          >
            {/* 左侧：输入区域 */}
            <GridItem>
              <VStack gap={6}>
                {/* pH */}
                <Box w="100%">
                  <Slider.Root
                    value={[values.ph]}
                    onValueChange={(d) =>
                      setValues((prev) => ({ ...prev, ph: d.value[0] }))
                    }
                    min={6.0}
                    max={9.5}
                    step={0.1}
                    width="100%"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="medium">
                        {t("calculators.lsi.labels.ph")}
                      </Text>
                      <Text
                        fontWeight="bold"
                        color="#AF8219"
                        minW="12"
                        textAlign="right"
                      >
                        {values.ph.toFixed(1)}
                      </Text>
                    </Flex>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>

                {/* 碳酸盐碱度 TA */}
                <Box w="100%">
                  <Slider.Root
                    value={[values.ta]}
                    onValueChange={(d) =>
                      setValues((prev) => ({ ...prev, ta: d.value[0] }))
                    }
                    min={5}
                    max={500}
                    step={1}
                    width="100%"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="medium">
                        {t("calculators.lsi.labels.ta")}
                      </Text>
                      <Text
                        fontWeight="bold"
                        color="#AF8219"
                        minW="12"
                        textAlign="right"
                      >
                        {values.ta.toFixed(0)}
                      </Text>
                    </Flex>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {t("calculators.lsi.hints.ta")}
                  </Text>
                </Box>

                {/* 钙硬度 CH */}
                <Box w="100%">
                  <Slider.Root
                    value={[values.ch]}
                    onValueChange={(d) =>
                      setValues((prev) => ({ ...prev, ch: d.value[0] }))
                    }
                    min={5}
                    max={1000}
                    step={1}
                    width="100%"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="medium">
                        {t("calculators.lsi.labels.ch")}
                      </Text>
                      <Text
                        fontWeight="bold"
                        color="#AF8219"
                        minW="12"
                        textAlign="right"
                      >
                        {values.ch.toFixed(0)}
                      </Text>
                    </Flex>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>

                {/* 温度 °C */}
                <Box w="100%">
                  <Slider.Root
                    value={[values.temp]}
                    onValueChange={(d) =>
                      setValues((prev) => ({ ...prev, temp: d.value[0] }))
                    }
                    min={0}
                    max={100}
                    step={1}
                    width="100%"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="medium">
                        {t("calculators.lsi.labels.temp")}
                      </Text>
                      <Text
                        fontWeight="bold"
                        color="#AF8219"
                        minW="12"
                        textAlign="right"
                      >
                        {values.temp.toFixed(0)}
                      </Text>
                    </Flex>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>

                {/* TDS */}
                <Box w="100%">
                  <Slider.Root
                    value={[values.tds]}
                    onValueChange={(d) =>
                      setValues((prev) => ({ ...prev, tds: d.value[0] }))
                    }
                    min={1}
                    max={5000}
                    step={10}
                    width="100%"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="medium">
                        {t("calculators.lsi.labels.tds")}
                      </Text>
                      <Text
                        fontWeight="bold"
                        color="#AF8219"
                        minW="12"
                        textAlign="right"
                      >
                        {values.tds.toFixed(0)}
                      </Text>
                    </Flex>
                    <Slider.Control>
                      <Slider.Track>
                        <Slider.Range />
                      </Slider.Track>
                      <Slider.Thumbs />
                    </Slider.Control>
                  </Slider.Root>
                </Box>
              </VStack>
            </GridItem>

            {/* 右侧：结果 */}
            <GridItem>
              <VStack align="center" justify="center" p={4} gap={6}>
                {/* LSI 结果 */}
                <VStack align="center" gap={3}>
                  <Text fontSize="lg" fontWeight="semibold">
                    {t("calculators.lsi.sections.lsi")}
                  </Text>

                  {/* LSI 仪表盘 */}
                  <Box position="relative" mb={2}>
                    <Box
                      w="180px"
                      h="90px"
                      position="relative"
                      overflow="hidden"
                      borderRadius="90px 90px 0 0"
                      bg="linear-gradient(to right, #ef4444, #eab308, #22c55e)"
                    >
                      <Box
                        position="absolute"
                        top="15px"
                        left="15px"
                        w="150px"
                        h="75px"
                        bg={cardBg}
                        borderRadius="75px 75px 0 0"
                      />
                      <Box
                        position="absolute"
                        bottom="0"
                        left="50%"
                        w="2px"
                        h="75px"
                        bg="gray.800"
                        transformOrigin="bottom"
                        transform={`translateX(-50%) rotate(${rotation}deg)`}
                        transition="transform 0.3s ease"
                        _before={{
                          content: '""',
                          position: "absolute",
                          bottom: "-4px",
                          left: "-4px",
                          w: "8px",
                          h: "8px",
                          bg: "gray.800",
                          borderRadius: "full",
                        }}
                      />
                    </Box>
                  </Box>

                  <Text fontSize="3xl" fontWeight="bold" textAlign="center">
                    {Number.isFinite(lsi) ? lsi.toFixed(2) : "—"}
                  </Text>

                  <Box
                    bg={interpretation.bgColor}
                    color={interpretation.color}
                    px={3}
                    py={1}
                    borderRadius="lg"
                    fontSize="lg"
                    fontWeight="medium"
                    textAlign="center"
                  >
                    {interpretation.text}
                  </Box>
                </VStack>

                {/* 雷兹纳指数结果 */}
                <VStack align="center" gap={3}>
                  <Text fontSize="lg" fontWeight="semibold">
                    {t("calculators.lsi.sections.rsi")}
                  </Text>

                  {/* 雷兹纳指数仪表盘 */}
                  <Box position="relative" mb={2}>
                    <Box
                      w="180px"
                      h="90px"
                      position="relative"
                      overflow="hidden"
                      borderRadius="90px 90px 0 0"
                      bg="linear-gradient(to right, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #dc2626)"
                    >
                      <Box
                        position="absolute"
                        top="15px"
                        left="15px"
                        w="150px"
                        h="75px"
                        bg={cardBg}
                        borderRadius="75px 75px 0 0"
                      />
                      <Box
                        position="absolute"
                        bottom="0"
                        left="50%"
                        w="2px"
                        h="75px"
                        bg="gray.800"
                        transformOrigin="bottom"
                        transform={`translateX(-50%) rotate(${ryznarRotation}deg)`}
                        transition="transform 0.3s ease"
                        _before={{
                          content: '""',
                          position: "absolute",
                          bottom: "-4px",
                          left: "-4px",
                          w: "8px",
                          h: "8px",
                          bg: "gray.800",
                          borderRadius: "full",
                        }}
                      />
                    </Box>
                  </Box>

                  <Text fontSize="3xl" fontWeight="bold" textAlign="center">
                    {Number.isFinite(ir) ? ir.toFixed(2) : "—"}
                  </Text>

                  <Box
                    bg={ryznarInterpretation.bgColor}
                    color={ryznarInterpretation.color}
                    px={3}
                    py={1}
                    borderRadius="lg"
                    fontSize="lg"
                    fontWeight="medium"
                    textAlign="center"
                  >
                    {ryznarInterpretation.text}
                  </Box>
                </VStack>
              </VStack>
            </GridItem>
            <GridItem>
              {/* 结果分解 */}
              <Box
                mt={4}
                w="100%"
                bg={useColorModeValue("gray.50", "gray.700")}
                borderRadius="md"
                p={4}
              >
                <Text fontSize="md" fontWeight="semibold" mb={2}>
                  {t("calculators.lsi.sections.breakdown")}
                </Text>
                <VStack align="stretch" gap={1} fontFamily="mono" fontSize="sm">
                  <Text>
                    {t("calculators.lsi.breakdown.phInput", {
                      value: ph.toFixed(2),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.pHs", {
                      value: formatValue(pHs, 3),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.lsi", {
                      value: formatValue(lsi, 3),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.rsi", {
                      value: formatValue(ir, 3),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.a", {
                      value: formatValue(A, 4),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.b", {
                      value: formatValue(B, 4),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.c", {
                      value: formatValue(C, 4),
                    })}
                  </Text>
                  <Text>
                    {t("calculators.lsi.breakdown.d", {
                      value: formatValue(D, 4),
                    })}
                  </Text>
                </VStack>
                <Text mt={3} color="gray.500" fontSize="xs">
                  {t("calculators.lsi.note")}
                </Text>
              </Box>
            </GridItem>
          </Grid>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}

export { LSICalculator }
