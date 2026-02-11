import { useColorModeValue } from "@/components/ui/color-mode"
import { useI18n } from "@/i18n"
import {
  Box,
  Card,
  Flex,
  Grid,
  GridItem,
  Slider,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"

interface AORValues {
  // 基本参数
  S0: number // 生物反应池进水五日生化需氧量（mg/L）
  Se: number // 生物反应池出水五日生化需氧量（mg/L）
  Q: number // 生物反应池的进水流量（m3/d）
  Nk: number // 生物反应池进水总凯氏氮浓度（mg/L）
  Nke: number // 生物反应池出水总凯氏氮浓度（mg/L）
  Nt: number // 生物反应池进水总氮浓度（mg/L）
  Noe: number // 生物反应池出水硝态氮浓度（mg/L）
  V: number // 曝气池容积（m3）
  N_prime: number // 曝气池内混合液挥发性悬浮固体平均浓度（gVSS/L）
  theta: number // 设计污泥龄（d）
  b_prime: number // 污泥自身氧化率（1/d）
}

interface SORValues {
  EA: number // 氧利用率（%）
  H: number // 曝气池空气释放点距水面的高度（m）
  T: number // 混合液温度，℃
  C0: number // 混合液剩余DO值（mg/L）
  alpha: number // 混合液中KLa值与清水中KLa值之比
  beta: number // 混合液的饱和溶解氧值与清水的饱和溶解氧之比
}

type AORResult = {
  Oa: number // BOD需氧量
  Ob: number // 硝化需氧量
  Oc: number // 内源需氧量
  total: number // 总需氧量
  deltaXv: number // 排出生物反应池系统的微生物量
}

type SORResult = {
  Ot: number // 曝气池逸出气体中含氧
  Csm: number // 曝气装置在水下深度处至池面的清水平均溶解氧值
  N0: number // 标准传氧速率
  Gs: number // 供空气体积
  airWaterRatio: number // 气水比
}

const AORCalculator: React.FC = () => {
  const { t } = useI18n()
  const [aorValues, setAorValues] = React.useState<AORValues>({
    S0: 420,
    Se: 30,
    Q: 10000,
    Nk: 50.0,
    Nke: 5.0,
    Nt: 60.0,
    Noe: 3.0,
    V: 14450.0,
    N_prime: 3.5,
    theta: 38.0,
    b_prime: 0.08,
  })

  const [sorValues, setSorValues] = React.useState<SORValues>({
    EA: 0.2,
    H: 8.5,
    T: 30.0,
    C0: 2.0,
    alpha: 0.8,
    beta: 0.9,
  })

  const cardBg = useColorModeValue("white", "gray.800")

  // 常数
  const a = 1.47 // 碳的氧当量
  const b = 4.57 // 氧化每公斤氨氮所需氧量
  const c = 1.42 // 细菌细胞的氧当量

  // AOR计算函数
  const calculateAOR = (): AORResult => {
    const { S0, Se, Q, Nk, Nke, Nt, Noe, V, N_prime, theta, b_prime } =
      aorValues

    // 计算排出生物反应池系统的微生物量
    const deltaXv = (V * N_prime) / theta

    // BOD需氧量
    const Oa = 0.001 * a * Q * (S0 - Se) - c * deltaXv

    // 硝化需氧量
    const Ob =
      b * (0.001 * Q * (Nk - Nke) - 0.12 * deltaXv) -
      0.62 * b * (0.001 * Q * (Nt - Nke - Noe) - 0.12 * deltaXv)

    // 内源需氧量
    const Oc = c * b_prime * V * N_prime

    const total = Oa + Ob + Oc

    return { Oa, Ob, Oc, total, deltaXv }
  }

  // SOR计算函数
  const calculateSOR = (aorTotal: number): SORResult => {
    const { EA, H, T, C0, alpha, beta } = sorValues
    const { Q } = aorValues

    // 曝气池逸出气体中含氧
    const Ot = (21 * (1 - EA)) / (79 + 21 * (1 - EA))

    // 压力计算
    const Pa = 0.1 // 当地大气压力（Mpa）
    const Pb = Pa + H / 100 // 曝气装置处绝对压力

    // 清水表面处饱和溶解氧
    const Csw = 8.4 // 简化值，实际应根据温度计算
    const Cs = 9.17 // 标准条件下清水中饱和溶解氧

    // 曝气装置在水下深度处至池面的清水平均溶解氧值
    const Csm = Csw * (Ot / 0.42 + (10 * Pb) / 2.068)

    // 标准传氧速率
    const N0 = (aorTotal * Cs) / (alpha * (beta * Csm - C0) * 1.024 ** (T - 20))

    // 供空气体积
    const Gs = N0 / (0.3 * EA)

    // 气水比
    const airWaterRatio = Gs / Q

    return { Ot, Csm, N0, Gs, airWaterRatio }
  }

  const aorResult = calculateAOR()
  const sorResult = calculateSOR(aorResult.total)

  const getAORInterpretation = (value: number) => {
    if (value < 5000) {
      return {
        text: t("calculators.aor.interpretations.aorLow"),
        color: "green.500",
        bgColor: "green.50",
      }
    }
    if (value < 15000) {
      return {
        text: t("calculators.aor.interpretations.aorMedium"),
        color: "yellow.600",
        bgColor: "yellow.50",
      }
    }
    return {
      text: t("calculators.aor.interpretations.aorHigh"),
      color: "red.500",
      bgColor: "red.50",
    }
  }

  const getAirWaterRatioInterpretation = (ratio: number) => {
    if (ratio < 10) {
      return {
        text: t("calculators.aor.interpretations.airWaterLow"),
        color: "blue.500",
        bgColor: "blue.50",
      }
    }
    if (ratio < 20) {
      return {
        text: t("calculators.aor.interpretations.airWaterMedium"),
        color: "green.500",
        bgColor: "green.50",
      }
    }
    return {
      text: t("calculators.aor.interpretations.airWaterHigh"),
      color: "orange.500",
      bgColor: "orange.50",
    }
  }

  // 仪表盘旋转角度计算
  const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi)

  // AOR仪表：将 AOR ∈ [0, 20000] 映射到 [-90°, 90°]
  const aorRotation = clamp(((aorResult.total - 10000) / 10000) * 90, -90, 90)

  // 气水比仪表：将气水比 ∈ [5, 30] 映射到 [-90°, 90°]
  const airWaterRotation = clamp(
    ((sorResult.airWaterRatio - 17.5) / 12.5) * 90,
    -90,
    90,
  )

  const aorInterpretation = getAORInterpretation(aorResult.total)
  const airWaterInterpretation = getAirWaterRatioInterpretation(
    sorResult.airWaterRatio,
  )

  return (
    <Box w="100%">
      <Card.Root bg={cardBg} shadow="md" borderRadius="xl" overflow="hidden">
        <Card.Body p={8}>
          <Text fontSize="3xl" fontWeight="extrabold" color="gray.800" mb={4}>
            {t("calculators.aor.title")}
          </Text>

          <Text maxW="full" mx="auto" fontSize="lg" color="gray.600" mb={6}>
            {t("calculators.aor.description")}
          </Text>

          <Tabs.Root defaultValue="aor" variant="enclosed">
            <Tabs.List mb={6}>
              <Tabs.Trigger value="aor">
                {t("calculators.aor.tabs.aor")}
              </Tabs.Trigger>
              <Tabs.Trigger value="sor">
                {t("calculators.aor.tabs.sor")}
              </Tabs.Trigger>
            </Tabs.List>

            <Grid
              templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
              gap={8}
              alignItems="start"
            >
              {/* 左侧：输入区域 */}
              <GridItem>
                <Tabs.Content value="aor">
                  <VStack gap={6}>
                    {/* S0 - 进水BOD */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.S0]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, S0: d.value[0] }))
                        }
                        min={100}
                        max={1000}
                        step={10}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.s0Influent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.S0.toFixed(0)}
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

                    {/* Se - 出水BOD */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Se]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Se: d.value[0] }))
                        }
                        min={5}
                        max={100}
                        step={1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.seEffluent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Se.toFixed(0)}
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

                    {/* Q - 进水流量 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Q]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Q: d.value[0] }))
                        }
                        min={1000}
                        max={50000}
                        step={500}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.flowRate")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Q.toFixed(0)}
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

                    {/* Nk - 进水总凯氏氮 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Nk]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Nk: d.value[0] }))
                        }
                        min={10}
                        max={150}
                        step={1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.nkInfluent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Nk.toFixed(1)}
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

                    {/* Nke - 出水总凯氏氮 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Nke]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Nke: d.value[0] }))
                        }
                        min={1}
                        max={20}
                        step={0.1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.nkeEffluent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Nke.toFixed(1)}
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

                    {/* Nt - 进水总氮 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Nt]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Nt: d.value[0] }))
                        }
                        min={20}
                        max={200}
                        step={1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.ntInfluent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Nt.toFixed(1)}
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

                    {/* Noe - 出水硝态氮 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.Noe]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, Noe: d.value[0] }))
                        }
                        min={0.5}
                        max={15}
                        step={0.1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.noeEffluent")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.Noe.toFixed(1)}
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

                    {/* V - 曝气池容积 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.V]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({ ...prev, V: d.value[0] }))
                        }
                        min={5000}
                        max={50000}
                        step={500}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.volume")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.V.toFixed(0)}
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

                    {/* N_prime - MLVSS */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.N_prime]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({
                            ...prev,
                            N_prime: d.value[0],
                          }))
                        }
                        min={1.0}
                        max={8.0}
                        step={0.1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.mlvss")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.N_prime.toFixed(1)}
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

                    {/* theta - 污泥龄 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.theta]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({
                            ...prev,
                            theta: d.value[0],
                          }))
                        }
                        min={5}
                        max={60}
                        step={1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.sludgeAge")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.theta.toFixed(0)}
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

                    {/* b_prime - 污泥自身氧化率 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[aorValues.b_prime]}
                        onValueChange={(d) =>
                          setAorValues((prev) => ({
                            ...prev,
                            b_prime: d.value[0],
                          }))
                        }
                        min={0.04}
                        max={0.15}
                        step={0.01}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.bPrime")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {aorValues.b_prime.toFixed(2)}
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
                        {t("calculators.aor.hints.bPrime")}
                      </Text>
                    </Box>
                  </VStack>
                </Tabs.Content>

                <Tabs.Content value="sor">
                  <VStack gap={6}>
                    {/* EA - 氧利用率 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.EA]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({ ...prev, EA: d.value[0] }))
                        }
                        min={0.1}
                        max={0.35}
                        step={0.01}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.ea")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {(sorValues.EA * 100).toFixed(0)}%
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

                    {/* H - 曝气深度 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.H]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({ ...prev, H: d.value[0] }))
                        }
                        min={3.0}
                        max={15.0}
                        step={0.5}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.depth")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {sorValues.H.toFixed(1)}
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

                    {/* T - 混合液温度 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.T]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({ ...prev, T: d.value[0] }))
                        }
                        min={5}
                        max={35}
                        step={1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.temperature")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {sorValues.T.toFixed(0)}
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

                    {/* C0 - 剩余DO */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.C0]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({ ...prev, C0: d.value[0] }))
                        }
                        min={0.5}
                        max={5.0}
                        step={0.1}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.c0")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {sorValues.C0.toFixed(1)}
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

                    {/* alpha - KLa修正系数 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.alpha]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({
                            ...prev,
                            alpha: d.value[0],
                          }))
                        }
                        min={0.6}
                        max={1.0}
                        step={0.01}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.alpha")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {sorValues.alpha.toFixed(2)}
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
                        {t("calculators.aor.hints.alpha")}
                      </Text>
                    </Box>

                    {/* beta - 饱和DO修正系数 */}
                    <Box w="100%">
                      <Slider.Root
                        value={[sorValues.beta]}
                        onValueChange={(d) =>
                          setSorValues((prev) => ({
                            ...prev,
                            beta: d.value[0],
                          }))
                        }
                        min={0.85}
                        max={1.0}
                        step={0.01}
                        width="100%"
                      >
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontWeight="medium">
                            {t("calculators.aor.labels.beta")}
                          </Text>
                          <Text
                            fontWeight="bold"
                            color="#AF8219"
                            minW="12"
                            textAlign="right"
                          >
                            {sorValues.beta.toFixed(2)}
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
                        {t("calculators.aor.hints.beta")}
                      </Text>
                    </Box>
                  </VStack>
                </Tabs.Content>
              </GridItem>

              {/* 右侧：结果显示 */}
              <GridItem>
                <VStack align="center" justify="center" p={4} gap={6}>
                  {/* AOR 结果 */}
                  <VStack align="center" gap={3}>
                    <Text fontSize="lg" fontWeight="semibold">
                      {t("calculators.aor.results.aorTitle")}
                    </Text>

                    {/* AOR 仪表盘 */}
                    <Box position="relative" mb={2}>
                      <Box
                        w="180px"
                        h="90px"
                        position="relative"
                        overflow="hidden"
                        borderRadius="90px 90px 0 0"
                        bg="linear-gradient(to right, #22c55e, #eab308, #ef4444)"
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
                          transform={`translateX(-50%) rotate(${aorRotation}deg)`}
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
                      {Number.isFinite(aorResult.total)
                        ? aorResult.total.toFixed(0)
                        : "—"}
                      <Text as="span" fontSize="lg" color="gray.500" ml={2}>
                        {t("calculators.aor.results.unitKgO2PerDay")}
                      </Text>
                    </Text>

                    <Box
                      bg={aorInterpretation.bgColor}
                      color={aorInterpretation.color}
                      px={3}
                      py={1}
                      borderRadius="lg"
                      fontSize="lg"
                      fontWeight="medium"
                      textAlign="center"
                    >
                      {aorInterpretation.text}
                    </Box>

                    {/* AOR 分解 */}
                    <Box
                      bg={useColorModeValue("gray.50", "gray.700")}
                      borderRadius="md"
                      p={3}
                      w="100%"
                    >
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        {t("calculators.aor.results.aorBreakdown")}
                      </Text>
                      <VStack
                        align="stretch"
                        gap={1}
                        fontFamily="mono"
                        fontSize="xs"
                      >
                        <Text>
                          {t("calculators.aor.results.bodDemand")}
                          {Number.isFinite(aorResult.Oa)
                            ? aorResult.Oa.toFixed(0)
                            : "—"}{" "}
                          {t("calculators.aor.results.unitKgO2PerDay")}
                        </Text>
                        <Text>
                          {t("calculators.aor.results.nitrificationDemand")}
                          {Number.isFinite(aorResult.Ob)
                            ? aorResult.Ob.toFixed(0)
                            : "—"}{" "}
                          {t("calculators.aor.results.unitKgO2PerDay")}
                        </Text>
                        <Text>
                          {t("calculators.aor.results.endogenousDemand")}
                          {Number.isFinite(aorResult.Oc)
                            ? aorResult.Oc.toFixed(0)
                            : "—"}{" "}
                          {t("calculators.aor.results.unitKgO2PerDay")}
                        </Text>
                        <Text>
                          {t("calculators.aor.results.biomass")}
                          {Number.isFinite(aorResult.deltaXv)
                            ? aorResult.deltaXv.toFixed(0)
                            : "—"}{" "}
                          {t("calculators.aor.results.unitKgPerDay")}
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>

                  {/* SOR 结果 */}
                  <VStack align="center" gap={3}>
                    <Text fontSize="lg" fontWeight="semibold">
                      {t("calculators.aor.results.sorTitle")}
                    </Text>

                    <Text fontSize="3xl" fontWeight="bold" textAlign="center">
                      {Number.isFinite(sorResult.N0)
                        ? sorResult.N0.toFixed(0)
                        : "—"}
                      <Text as="span" fontSize="lg" color="gray.500" ml={2}>
                        {t("calculators.aor.results.unitKgO2PerDay")}
                      </Text>
                    </Text>

                    {/* 气水比仪表盘 */}
                    <Box position="relative" mb={2}>
                      <Box
                        w="180px"
                        h="90px"
                        position="relative"
                        overflow="hidden"
                        borderRadius="90px 90px 0 0"
                        bg="linear-gradient(to right, #3b82f6, #22c55e, #eab308, #f97316)"
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
                          transform={`translateX(-50%) rotate(${airWaterRotation}deg)`}
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

                    {/* 气水比显示 */}
                    <VStack align="center" gap={2}>
                      <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                        {Number.isFinite(sorResult.airWaterRatio)
                          ? sorResult.airWaterRatio.toFixed(1)
                          : "—"}
                        <Text as="span" fontSize="md" color="gray.500" ml={1}>
                          {t("calculators.aor.results.airWaterRatio")}
                        </Text>
                      </Text>

                      <Box
                        bg={airWaterInterpretation.bgColor}
                        color={airWaterInterpretation.color}
                        px={3}
                        py={1}
                        borderRadius="lg"
                        fontSize="md"
                        fontWeight="medium"
                        textAlign="center"
                      >
                        {airWaterInterpretation.text}
                      </Box>
                    </VStack>

                    {/* SOR 分解 */}
                    <Box
                      bg={useColorModeValue("gray.50", "gray.700")}
                      borderRadius="md"
                      p={3}
                      w="100%"
                    >
                      <Text fontSize="sm" fontWeight="semibold" mb={2}>
                        {t("calculators.aor.results.sorBreakdown")}
                      </Text>
                      <VStack
                        align="stretch"
                        gap={1}
                        fontFamily="mono"
                        fontSize="xs"
                      >
                        <Text>
                          {t("calculators.aor.results.oxygenOffgas")}
                          {Number.isFinite(sorResult.Ot)
                            ? (sorResult.Ot * 100).toFixed(1)
                            : "—"}
                          %
                        </Text>
                        <Text>
                          {t("calculators.aor.results.avgDo")}
                          {Number.isFinite(sorResult.Csm)
                            ? sorResult.Csm.toFixed(1)
                            : "—"}{" "}
                          mg/L
                        </Text>
                        <Text>
                          {t("calculators.aor.results.airSupply")}
                          {Number.isFinite(sorResult.Gs)
                            ? sorResult.Gs.toFixed(0)
                            : "—"}{" "}
                          m³/d
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>
                </VStack>
              </GridItem>
            </Grid>
          </Tabs.Root>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}

export default AORCalculator
