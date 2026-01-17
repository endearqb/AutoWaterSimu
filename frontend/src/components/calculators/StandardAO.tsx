import { useColorModeValue } from "@/components/ui/color-mode"
import { Field } from "@/components/ui/field"
import { Tooltip } from "@/components/ui/tooltip"
import useCustomToast from "@/hooks/useCustomToast"
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  GridItem,
  HStack,
  NumberInput,
  Separator,
  Slider,
  Stat,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

type AOInputs = {
  Q: number // m3/d
  Nt: number // mg/L
  Nte: number // mg/L
  Kde_20: number // kgN/(kgMLSS·d) @20℃
  X: number // gMLSS/L
  T: number // ℃
  Y: number // kgVSS/kgBOD5
  So: number // mg/L
  Se: number // mg/L
  Yt: number // kgMLSS/kgBOD5
  F: number // —
  Na: number // mg/L
  Kn: number // mg/L
  Nke: number // mg/L
  R: number // —
}

type AOResult = {
  Kde_T: number
  delta_Xv: number // kgMLVSS/d
  Vn: number // m3
  mu: number // d^-1
  theta_co: number // d
  Vo: number // m3
  Q_Ri_0: number | null // m3/d (原式，若分母接近0则为 null)
  Q_Ri: number | null // m3/d (改法，同上)
}

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(Math.max(x, lo), hi)
const safeDiv = (num: number, den: number, eps = 1e-9) =>
  Math.abs(den) < eps ? null : num / den
const pos = (x: number, floor = 0) =>
  Number.isFinite(x) ? Math.max(x, floor) : floor

function computeAO(i: AOInputs): AOResult {
  const Kde_T = i.Kde_20 * 1.08 ** (i.T - 20)
  const delta_Xv = (i.Y * i.Q * (i.So - i.Se)) / 1000 // kgMLVSS/d

  const numeratorVn = 0.001 * i.Q * (i.Nt - i.Nte) - 0.12 * delta_Xv
  const denomVn = Kde_T * i.X
  const Vn = pos(numeratorVn / (denomVn || 1e-9)) // m3

  const mu = 0.47 * (i.Na / (i.Kn + i.Na)) * Math.exp(0.098 * (i.T - 15)) // d^-1
  const theta_co = pos(i.F / (mu || 1e-12)) // d

  const Vo = pos(
    (i.Q * (i.So - i.Se) * theta_co * i.Yt) / (1000 * (i.X || 1e-9)),
  ) // m3

  // 原公式
  const den1 = i.Nte - i.Nke
  const part1 = safeDiv(1000 * Vn * Kde_T * i.X, den1)
  const Q_Ri_0 = part1 === null ? null : part1 - i.Q * i.R

  // 变形公式
  const part2 = safeDiv(i.Nt - i.Nte, den1)
  const Q_Ri = part2 === null ? null : (part2 - i.R) * i.Q

  return { Kde_T, delta_Xv, Vn, mu, theta_co, Vo, Q_Ri_0, Q_Ri }
}

const LabeledSlider: React.FC<{
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  hint?: string
  decimals?: number
}> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  decimals = 2,
}) => {
  return (
    <Field>
      <Flex justify="space-between" mb={2}>
        <Text fontWeight="medium">{label}</Text>
        <HStack gap={2}>
          {hint && (
            <Tooltip content={hint}>
              <Badge cursor="help" colorScheme="gray">
                说明
              </Badge>
            </Tooltip>
          )}
          <Text fontWeight="bold" color="#AF8219">
            {value.toFixed(decimals)}
            {unit ? ` ${unit}` : ""}
          </Text>
        </HStack>
      </Flex>
      <Slider.Root
        value={[value]}
        onValueChange={(d: any) => onChange(d.value[0])}
        min={min}
        max={max}
        step={step}
        width="100%"
      >
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumbs />
        </Slider.Control>
      </Slider.Root>
    </Field>
  )
}

const LabeledNumber: React.FC<{
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  unit?: string
  min?: number
  max?: number
}> = ({ label, value, onChange, step = 1, unit, min, max }) => (
  <Field label={label}>
    <HStack>
      <NumberInput.Root
        value={value.toString()}
        step={step}
        min={min}
        max={max}
        onValueChange={(details) =>
          onChange(
            Number.isFinite(details.valueAsNumber) ? details.valueAsNumber : 0,
          )
        }
        w="full"
      >
        <NumberInput.Input />
        <NumberInput.Control>
          <NumberInput.IncrementTrigger />
          <NumberInput.DecrementTrigger />
        </NumberInput.Control>
      </NumberInput.Root>
      {unit && <Badge colorScheme="gray">{unit}</Badge>}
    </HStack>
  </Field>
)

const StatCard: React.FC<{
  label: string
  value: number | null | undefined
  unit?: string
  precision?: number
  warnIfNull?: boolean
}> = ({ label, value, unit, precision = 2, warnIfNull }) => {
  const color = value === null && warnIfNull ? "red.500" : "inherit"
  return (
    <Stat.Root>
      <Stat.Label>{label}</Stat.Label>
      <Stat.ValueText color={color}>
        {value === null || value === undefined
          ? "—"
          : Number.isFinite(value)
            ? value.toFixed(precision)
            : "—"}
        {unit ? ` ${unit}` : ""}
      </Stat.ValueText>
      {value === null && warnIfNull && (
        <Stat.HelpText color="red.500">分母接近 0，无法可靠计算</Stat.HelpText>
      )}
    </Stat.Root>
  )
}

const buildSweepData = (
  sweepKey: keyof AOInputs,
  sweep: number[],
  base: AOInputs,
): Array<{ x: number; Vn: number; QRi0: number | null }> => {
  return sweep.map((x) => {
    const i = { ...base, [sweepKey]: x } as AOInputs
    const r = computeAO(i)
    return {
      x,
      Vn: r.Vn,
      QRi0: r.Q_Ri_0,
    }
  })
}

const formatTick = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "")

const presetsQ = [2000, 5000, 10000, 20000, 50000]

export const AOSizingCalculator: React.FC = () => {
  const toast = useCustomToast()
  const cardBg = useColorModeValue("white", "gray.800")

  const [inp, setInp] = React.useState<AOInputs>({
    Q: 10000,
    Nt: 25,
    Nte: 8,
    Kde_20: 0.04,
    X: 1.8,
    T: 12,
    Y: 0.35,
    So: 150,
    Se: 5,
    Yt: 0.7,
    F: 3.0,
    Na: 25,
    Kn: 1.0,
    Nke: 2.0,
    R: 0.8,
  })

  const onChange = <K extends keyof AOInputs>(k: K, v: number) =>
    setInp((prev) => ({ ...prev, [k]: v }))

  const res = React.useMemo(() => computeAO(inp), [inp])

  // 图表数据（跟随当前参数，单参数扫描）
  const sweepKde = React.useMemo(() => {
    const arr = Array.from(
      { length: 81 },
      (_, idx) => 0.03 + (idx * (0.06 - 0.03)) / 80,
    )
    return buildSweepData("Kde_20", arr, inp)
  }, [inp])

  const sweepY = React.useMemo(() => {
    const arr = Array.from(
      { length: 61 },
      (_, idx) => 0.3 + (idx * (0.6 - 0.3)) / 60,
    )
    return buildSweepData("Y", arr, inp)
  }, [inp])

  //   const sweepT = React.useMemo(() => {
  //     const arr = Array.from({ length: 41 }, (_, idx) => 5 + idx * (25 - 5) / 40);
  //     return buildSweepData('T', arr, inp);
  //   }, [inp]);

  const warnDenomZero = Math.abs(inp.Nte - inp.Nke) < 1e-6

  React.useEffect(() => {
    if (warnDenomZero) {
      toast.showErrorToast(
        "Nte 与 Nke 过于接近，混合液回流量计算将变得不稳定。",
      )
    }
  }, [warnDenomZero, toast])

  return (
    <Box w="100%">
      <Card.Root bg={cardBg} shadow="md" borderRadius="xl" overflow="hidden">
        <Box px={8} pt={8}>
          <Text fontSize="3xl" fontWeight="extrabold" color="gray.800" mb={3}>
            AO 缺氧/好氧容积与混合液回流量交互式计算器
          </Text>
          <Text color="gray.600" mb={6}>
            基于缺氧反硝化与好氧硝化的尺寸估算：支持对关键经验参数进行敏感性分析（Kde_20、Y）。
          </Text>
        </Box>

        <Card.Body px={8} pb={8}>
          <Grid templateColumns={{ base: "1fr", xl: "1fr 1.2fr" }} gap={8}>
            {/* 左侧：输入 */}
            <GridItem>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                {/* 流量 Q：数字输入 + 预设 */}
                <GridItem colSpan={2}>
                  <LabeledNumber
                    label="Q 设计流量"
                    value={inp.Q}
                    onChange={(v) => onChange("Q", clamp(v, 1, 1e7))}
                    step={100}
                    unit="m³/d"
                    min={1}
                  />
                  <HStack mt={2} gap={2}>
                    {presetsQ.map((q) => (
                      <Button
                        key={q}
                        size="xs"
                        onClick={() => onChange("Q", q)}
                      >
                        {q.toLocaleString()} m³/d
                      </Button>
                    ))}
                  </HStack>
                </GridItem>

                <LabeledSlider
                  label="Nt 进水 TN"
                  value={inp.Nt}
                  onChange={(v) => onChange("Nt", v)}
                  min={0}
                  max={100}
                  step={1}
                  unit="mg/L"
                  hint="市政常见 15–60 mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="Nte 出水 TN"
                  value={inp.Nte}
                  onChange={(v) => onChange("Nte", v)}
                  min={0}
                  max={30}
                  step={0.5}
                  unit="mg/L"
                  decimals={1}
                />

                <LabeledSlider
                  label="Kde_20 反硝化速率 @20℃"
                  value={inp.Kde_20}
                  onChange={(v) => onChange("Kde_20", v)}
                  min={0.03}
                  max={0.06}
                  step={0.001}
                  unit="kgN/(kgMLSS·d)"
                  hint="经验取值 0.03–0.06（与活性比例/污泥性质相关）"
                  decimals={3}
                />

                <LabeledSlider
                  label="X 池内 MLSS"
                  value={inp.X}
                  onChange={(v) => onChange("X", v)}
                  min={0.5}
                  max={6}
                  step={0.1}
                  unit="g/L"
                  decimals={1}
                />

                <LabeledSlider
                  label="T 温度"
                  value={inp.T}
                  onChange={(v) => onChange("T", v)}
                  min={5}
                  max={35}
                  step={1}
                  unit="℃"
                  decimals={0}
                />

                <LabeledSlider
                  label="Y 污泥产率（VSS/BOD5）"
                  value={inp.Y}
                  onChange={(v) => onChange("Y", v)}
                  min={0.3}
                  max={0.6}
                  step={0.01}
                  unit="kg/kg"
                  hint="推荐 0.30–0.40（VSS口径）"
                />

                <LabeledSlider
                  label="So 进水 BOD₅"
                  value={inp.So}
                  onChange={(v) => onChange("So", v)}
                  min={50}
                  max={400}
                  step={5}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="Se 出水 BOD₅"
                  value={inp.Se}
                  onChange={(v) => onChange("Se", v)}
                  min={1}
                  max={50}
                  step={1}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="Yt 总产率（MLSS/BOD5）"
                  value={inp.Yt}
                  onChange={(v) => onChange("Yt", v)}
                  min={0.3}
                  max={1.2}
                  step={0.05}
                  unit="kg/kg"
                />

                <LabeledSlider
                  label="F 硝化安全系数"
                  value={inp.F}
                  onChange={(v) => onChange("F", v)}
                  min={1.5}
                  max={3.0}
                  step={0.1}
                  unit="—"
                />

                <LabeledSlider
                  label="Na 进水 NH₄⁺-N"
                  value={inp.Na}
                  onChange={(v) => onChange("Na", v)}
                  min={0}
                  max={60}
                  step={1}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="Kn 氨半速率常数"
                  value={inp.Kn}
                  onChange={(v) => onChange("Kn", v)}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  unit="mg/L"
                />

                <LabeledSlider
                  label="Nke 出水 TKN"
                  value={inp.Nke}
                  onChange={(v) => onChange("Nke", v)}
                  min={0.5}
                  max={10}
                  step={0.1}
                  unit="mg/L"
                />

                <LabeledSlider
                  label="R 污泥回流比"
                  value={inp.R}
                  onChange={(v) => onChange("R", v)}
                  min={0.5}
                  max={1.2}
                  step={0.05}
                  unit="—"
                />
              </Grid>
            </GridItem>

            {/* 右侧：敏感性分析图 */}
            <GridItem>
              <VStack align="stretch" gap={6}>
                <Box>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    敏感性分析：关键参数对设计结果的影响
                  </Text>
                  <VStack align="stretch" gap={6}>
                    <Box>
                      <Text fontSize="md" fontWeight="medium" mb={3}>
                        Kde₍20₎ → Vn 与 Q_Ri(原式)
                      </Text>
                      <Box h="240px" w="100%">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={sweepKde}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e0e0e0"
                            />
                            <XAxis
                              dataKey="x"
                              tickFormatter={formatTick}
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <YAxis
                              yAxisId="left"
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend fontSize={12} />
                            <ReferenceLine
                              y={0}
                              stroke="#999"
                              strokeDasharray="2 2"
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="Vn"
                              name="Vn (m³)"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="QRi0"
                              name="Q_Ri(原式) (m³/d)"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                      <Text mt={2} fontSize="xs" color="gray.500">
                        扫描范围：Kde_20 (0.03–0.06)
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="md" fontWeight="medium" mb={3}>
                        Y（VSS/BOD₅） → Vn 与 Q_Ri(原式)
                      </Text>
                      <Box h="240px" w="100%">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={sweepY}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e0e0e0"
                            />
                            <XAxis
                              dataKey="x"
                              tickFormatter={formatTick}
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <YAxis
                              yAxisId="left"
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              fontSize={12}
                              tick={{ fill: "#666" }}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #ccc",
                                borderRadius: "4px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend fontSize={12} />
                            <ReferenceLine
                              y={0}
                              stroke="#999"
                              strokeDasharray="2 2"
                            />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="Vn"
                              name="Vn (m³)"
                              stroke="#8884d8"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="QRi0"
                              name="Q_Ri(原式) (m³/d)"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                      <Text mt={2} fontSize="xs" color="gray.500">
                        扫描范围：Y (0.30–0.60)
                      </Text>
                    </Box>

                    {/* <Box>
                      <Text fontSize="md" fontWeight="medium" mb={3}>
                        T（温度） → Vn 与 Q_Ri(原式)
                      </Text>
                      <Box h="240px" w="100%">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sweepT} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                              dataKey="x"
                              tickFormatter={formatTick}
                              fontSize={12}
                              tick={{ fill: '#666' }}
                            />
                            <YAxis
                              yAxisId="left"
                              fontSize={12}
                              tick={{ fill: '#666' }}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              fontSize={12}
                              tick={{ fill: '#666' }}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            />
                            <Legend fontSize={12} />
                            <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="Vn"
                              name="Vn (m³)"
                              stroke="#ff7300"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="QRi0"
                              name="Q_Ri(原式) (m³/d)"
                              stroke="#387908"
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                      <Text mt={2} fontSize="xs" color="gray.500">
                        扫描范围：T (5–25℃)
                      </Text>
                    </Box> */}
                  </VStack>
                </Box>
              </VStack>
            </GridItem>
          </Grid>

          <Separator my={8} />

          {/* 核心结果和计算公式 */}
          <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={8}>
            {/* 左侧：核心结果 */}
            <GridItem>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    核心结果
                  </Text>
                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    <StatCard label="缺氧池容积 Vn" value={res.Vn} unit="m³" />
                    <StatCard label="好氧池容积 Vo" value={res.Vo} unit="m³" />
                    <StatCard
                      label="μ (比增长速率)"
                      value={res.mu}
                      unit="d⁻¹"
                    />
                    <StatCard
                      label="好氧停留时间 θco"
                      value={res.theta_co}
                      unit="d"
                    />
                    <StatCard
                      label="ΔXv 排泥活性量"
                      value={res.delta_Xv}
                      unit="kgMLVSS/d"
                    />
                    <StatCard
                      label="Kde(T) 修正"
                      value={res.Kde_T}
                      unit="kgN/(kgMLSS·d)"
                      precision={4}
                    />
                  </Grid>
                </Box>

                <Separator />

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    混合液/硝化液回流量
                  </Text>
                  <Grid
                    templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap={4}
                  >
                    <StatCard
                      label="Q_Ri (原式)"
                      value={res.Q_Ri_0}
                      unit="m³/d"
                      warnIfNull
                    />
                    <StatCard
                      label="Q_Ri (改法)"
                      value={res.Q_Ri}
                      unit="m³/d"
                      warnIfNull
                    />
                  </Grid>
                  {Math.abs(inp.Nte - inp.Nke) < 1e-6 && (
                    <Text mt={3} fontSize="sm" color="red.500">
                      提示：Nte 与 Nke
                      过近导致分母趋零，回流量结果不可靠；请调整指标目标或采用工程上限约束。
                    </Text>
                  )}
                </Box>
              </VStack>
            </GridItem>

            {/* 右侧：计算公式 */}
            <GridItem>
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={4}>
                  计算公式
                </Text>
                <VStack align="start" gap={2} fontSize="sm" color="gray.600">
                  <Box p={3} bg="gray.50" borderRadius="md" w="100%">
                    <Text fontWeight="medium" mb={2} color="gray.800">
                      温度修正与污泥产量
                    </Text>
                    <Text>Kde(T) = Kde_20 · 1.08^(T − 20)</Text>
                    <Text>ΔXv = Y · Q · (So − Se) / 1000</Text>
                  </Box>
                  <Box p={3} bg="gray.50" borderRadius="md" w="100%">
                    <Text fontWeight="medium" mb={2} color="gray.800">
                      池容计算
                    </Text>
                    <Text>
                      Vn = [0.001·Q·(Nt − Nte) − 0.12·ΔXv] / [Kde(T)·X]
                    </Text>
                    <Text>
                      μ = 0.47 · (Na / (Kn + Na)) · exp[0.098·(T − 15)]
                    </Text>
                    <Text>θco = F / μ</Text>
                    <Text>Vo = Q · (So − Se) · θco · Yt / (1000·X)</Text>
                  </Box>
                  <Box p={3} bg="gray.50" borderRadius="md" w="100%">
                    <Text fontWeight="medium" mb={2} color="gray.800">
                      回流量计算
                    </Text>
                    <Text>
                      Q_Ri(原式) = 1000·Vn·Kde(T)·X / (Nte − Nke) − Q·R
                    </Text>
                    <Text>Q_Ri(改法) = [(Nt − Nte)/(Nte − Nke) − R] · Q</Text>
                  </Box>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}

export default AOSizingCalculator
