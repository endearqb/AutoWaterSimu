import { useColorModeValue } from "@/components/ui/color-mode"
import { Field } from "@/components/ui/field"
import {
  Badge,
  Box,
  Button,
  Card,
  Collapsible,
  Flex,
  Grid,
  GridItem,
  HStack,
  NumberInput,
  Portal,
  Select,
  Separator,
  Slider,
  Stat,
  Tabs,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react"
import React from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"

// 输入参数接口
interface DWAInputs {
  // 常数或建议数值
  f_s: number // 溶解性的惰性COD占总COD比例
  f_A: number // 颗粒性惰性组分比例
  f_COD: number // 易降解COD比例
  f_B: number // 进水可过滤无机物质
  S_orgN_AN: number // 出水有机氮
  Y_COD_abb: number // 可降解COD产泥系数
  b: number // 15℃衰减系数
  C_0: number // 混合液剩余DO值
  C_S: number // 标准条件下清水中饱和溶解氧
  S_NO3_ZB: number // 设定进水硝酸盐氮
  miu_A_max: number // 15℃硝化菌最大比生长速率

  // 进出水流量与水质
  Q_d_Knoz: number // 日平均进水水量
  C_COD_ZB: number // 进水化学需氧量
  C_BOD5_ZB: number // 进水生物需氧量
  C_P_ZB: number // 进水总磷
  C_TN_ZB: number // 进水总氮
  C_SS_ZB: number // 进水悬浮固体
  T_C: number // 设计温度
  S_COD_AN: number // 出水化学需氧量
  S_BOD5_AN: number // 出水生物需氧量
  S_TP_AN: number // 出水总磷
  S_TN_AN: number // 出水总氮
  S_NH4_AN: number // 出水氨氮
  S_SS_AN: number // 出水悬浮固体
  TS_BB: number // 生物池污泥浓度

  // 传氧速率参数
  alfa: number // α混合液KLa/清水KLa
  beta: number // β混合液饱和溶解氧/清水饱和溶解氧
  h_TB2A: number // 曝气装置与池底距离
  h_tk: number // 设计水深
  h_El: number // 当地海拔高度
  E_A: number // 氧利用率

  // 选择参数
  COD_dos_name: string // 碳源类型
  P_dos_name: string // 除磷剂类型

  // 二沉池参数
  DSVI: number // 污泥体积指数
  t_E: number // 设计浓缩时间
  RV: number // 污泥回流比
  f: number // 污泥回流短流系数
  q_A: number // 设计表面负荷
}

// 计算结果接口
interface DWAResult {
  // 基础计算结果
  Q_d_max: number // 设计流量
  V_BB: number // 曝气池容积
  V_an: number // 厌氧池容积
  V_D: number // 缺氧池容积
  V_aero: number // 好氧池容积
  V_bioT: number // 总容积

  // 水力停留时间
  HRT_an: number // 厌氧池水力停留时间
  HRT_D: number // 缺氧池水力停留时间
  HRT_aero: number // 好氧池水力停留时间
  HRT_bioT: number // 总水力停留时间

  // 污泥相关
  US_d_r: number // 剩余污泥量
  t_TS_Bem_f: number // 设计污泥泥龄

  // 供氧相关
  OV_h_aM: number // 平均耗氧量
  OV_h_max: number // 最高耗氧量
  SOR: number // 标准传氧速率

  // 回流比
  RF: number // 反硝化所需的回流比
  RZ: number // 反硝化所需的内回流比

  // 负荷
  L_C: number // 好氧池COD负荷
  L_B: number // 好氧池BOD负荷

  // 二沉池结果
  Ast: number // 二沉池表面积
  h: number // 二沉池深度

  // 外加碳源
  C_COD_dos_f: number // 外加碳源化学需氧量
  V_D_over_V_BB_f: number // 缺氧池与生物池容积比
}

// 计算函数
function calculateDWA(inputs: DWAInputs): DWAResult {
  const {
    f_s,
    f_A,
    f_COD,
    f_B,
    S_orgN_AN,
    Y_COD_abb,
    b,
    C_0,
    C_S,
    S_NO3_ZB,
    miu_A_max,
    Q_d_Knoz,
    C_COD_ZB,
    C_BOD5_ZB,
    C_P_ZB,
    C_TN_ZB,
    C_SS_ZB,
    T_C,
    S_COD_AN,
    S_BOD5_AN,
    S_TP_AN,
    S_TN_AN,
    S_NH4_AN,
    TS_BB,
    alfa,
    beta,
    h_TB2A,
    h_tk,
    h_El,
    E_A,
    COD_dos_name,
    P_dos_name,
    DSVI,
    t_E,
    RV,
    f,
    q_A,
  } = inputs

  // 计算设计流量
  const Q_h_Knoz = Q_d_Knoz / 24
  let Kz: number
  if (Q_h_Knoz <= 13) {
    Kz = 2.7
  } else if (Q_h_Knoz >= 2600) {
    Kz = 1.5
  } else {
    Kz = 3.5778 * Q_h_Knoz ** -0.112
  }
  const Q_d_max = Q_d_Knoz * Kz

  // 计算碳平衡
  const X_TS_ZB = C_SS_ZB
  const X_COD_ZB = X_TS_ZB * 1.6 * (1 - f_B)
  const S_COD_inert_ZB = f_s * C_COD_ZB
  const X_COD_inert_ZB = f_A * X_COD_ZB
  const C_COD_abb_ZB = C_COD_ZB - S_COD_inert_ZB - X_COD_inert_ZB

  // 计算出水氮平衡
  const S_TKN_AN = S_NH4_AN + S_orgN_AN
  const S_anorgN_UW = S_TN_AN - S_TKN_AN

  // 计算硝化菌泥龄
  const B_d_COD_Z = (Q_d_Knoz * C_COD_ZB) / 1000
  let PF: number
  if (B_d_COD_Z <= 2400) {
    PF = 2.1
  } else if (B_d_COD_Z > 12000) {
    PF = 1.5
  } else {
    PF = 2.1 - ((B_d_COD_Z - 2400) * 0.6) / 9600
  }
  const t_TS_aerob_Bem = ((PF * 1.6) / miu_A_max) * 1.103 ** (15 - T_C)

  // 投加碳源类型
  let Y_COD_dos: number
  if (COD_dos_name === "甲醇") {
    Y_COD_dos = 0.45
  } else if (COD_dos_name === "乙醇" || COD_dos_name === "醋酸") {
    Y_COD_dos = 0.42
  } else {
    Y_COD_dos = 0.42
  }

  const F_T = 1.072 ** (T_C - 15)
  let C_COD_dos_f = 0
  let V_D_over_V_BB_f = 0.2
  let x_f = 0
  const max = 0.6

  while (x_f < 1) {
    // 污泥产量的计算
    const t_TS_Bem_f = t_TS_aerob_Bem / (1 - V_D_over_V_BB_f)
    const X_COD_BM_f =
      (C_COD_abb_ZB * Y_COD_abb + C_COD_dos_f * Y_COD_dos) /
      (1 + b * t_TS_Bem_f * F_T)
    const X_COD_inert_BM_f = 0.2 * X_COD_BM_f * t_TS_Bem_f * b * F_T
    // 污泥产量计算（在循环中使用）

    // 反硝化硝态氮浓度计算
    const S_NO3_AN_f = 0.7 * S_anorgN_UW
    const X_orngN_BM_f = 0.07 * X_COD_BM_f
    const X_orgN_inert_f = 0.03 * (X_COD_inert_BM_f + X_COD_inert_ZB)
    const S_NO3_D_f =
      C_TN_ZB -
      S_NO3_AN_f -
      S_orgN_AN -
      S_NH4_AN -
      X_orngN_BM_f -
      X_orgN_inert_f

    // 碳降解的需氧量
    const OV_C_f = C_COD_abb_ZB + C_COD_dos_f - X_COD_BM_f - X_COD_inert_BM_f
    const OV_C_la_vorg_f =
      f_COD * C_COD_abb_ZB * (1 - Y_COD_abb) + C_COD_dos_f * (1 - Y_COD_dos)
    const OV_C_D_f =
      0.75 *
      (OV_C_la_vorg_f + (OV_C_f - OV_C_la_vorg_f) * V_D_over_V_BB_f ** 0.68)

    // 耗氧量和供氧量平衡
    x_f = OV_C_D_f / 2.86 / S_NO3_D_f
    if (V_D_over_V_BB_f < max && x_f < 1) {
      V_D_over_V_BB_f += 0.01
    } else if (V_D_over_V_BB_f >= max && x_f < 1) {
      V_D_over_V_BB_f = max
      C_COD_dos_f += 0.01
    }
  }

  // 最终计算
  const t_TS_Bem_f = t_TS_aerob_Bem / (1 - V_D_over_V_BB_f)
  const X_COD_BM_f =
    (C_COD_abb_ZB * Y_COD_abb + C_COD_dos_f * Y_COD_dos) /
    (1 + b * t_TS_Bem_f * F_T)
  const X_COD_inert_BM_f = 0.2 * X_COD_BM_f * t_TS_Bem_f * b * F_T
  const US_d_C_f =
    (Q_d_Knoz *
      (X_COD_inert_ZB / 1.33 +
        (X_COD_BM_f + X_COD_inert_ZB) / (0.93 * 1.42) +
        f_B * X_TS_ZB)) /
    1000

  const S_NO3_AN_f = 0.7 * S_anorgN_UW
  const X_orngN_BM_f = 0.07 * X_COD_BM_f
  const X_orgN_inert_f = 0.03 * (X_COD_inert_BM_f + X_COD_inert_ZB)
  const S_NO3_D_f =
    C_TN_ZB - S_NO3_AN_f - S_orgN_AN - S_NH4_AN - X_orngN_BM_f - X_orgN_inert_f

  const OV_C_f = C_COD_abb_ZB + C_COD_dos_f - X_COD_BM_f - X_COD_inert_BM_f

  // 生物处理与化学除磷量
  const C_P_AN = 0.7 * S_TP_AN
  const X_P_BM = 0.005 * C_COD_ZB
  const X_P_BioP = 0.006 * C_COD_ZB
  const X_P_Fall = C_P_ZB - C_P_AN - X_P_BM - X_P_BioP
  const Me_3plus = (1.5 * X_P_Fall) / 31

  // 除磷污泥产量
  let X_P_Fall_Fe = 0
  let X_P_Fall_Al = 0
  if (P_dos_name === "铝盐") {
    X_P_Fall_Al = 27 * Me_3plus
  } else if (P_dos_name === "铁盐") {
    X_P_Fall_Fe = 55.8 * Me_3plus
  }
  const US_d_P =
    (Q_d_Knoz * (3 * X_P_BioP + 6.8 * X_P_Fall_Fe + 5.3 * X_P_Fall_Al)) / 1000

  // 污泥产量
  const US_d_r = US_d_C_f + US_d_P
  const M_TS_BB = t_TS_Bem_f * US_d_r
  const M_TS_D = V_D_over_V_BB_f * M_TS_BB
  const M_TS_aero = M_TS_BB - M_TS_D
  const L_C = ((C_COD_ZB - S_COD_AN) * Q_d_Knoz) / 1000 / M_TS_aero
  const L_B = ((C_BOD5_ZB - S_BOD5_AN) * Q_d_Knoz) / 1000 / M_TS_aero

  // 生物池容积
  const V_BB = M_TS_BB / TS_BB
  const V_an = 1 * Q_h_Knoz
  const V_D = V_BB * V_D_over_V_BB_f
  const V_aero = V_BB - V_D
  const V_bioT = V_BB + V_an
  const HRT_an = V_an / Q_h_Knoz
  const HRT_D = V_D / Q_h_Knoz
  const HRT_aero = V_aero / Q_h_Knoz
  const HRT_bioT = V_bioT / Q_h_Knoz

  // 回流比
  const RF = (S_NO3_D_f - S_NO3_ZB) / S_NO3_AN_f
  const RZ = RF - 1

  // 耗氧量物料平衡
  const OV_d_C = (Q_d_Knoz * OV_C_f) / 1000
  const OV_d_N = (Q_d_Knoz * 4.3 * (S_NO3_D_f - S_NO3_ZB + S_NO3_AN_f)) / 1000
  const OV_d_D = (Q_d_Knoz * 2.86 * S_NO3_D_f) / 1000
  const OV_h_aM = (OV_d_C - OV_d_D + OV_d_N) / 24
  const OV_h_max = Kz * OV_h_aM

  // 标准传氧速率
  const O_t = (21 * (1 - E_A)) / (79 + 21 * (1 - E_A))
  const P_a = (101325 - h_El / 12 / 133) / 1000000
  const P_b = P_a + ((h_tk - h_TB2A) * 9.81) / 1000
  const C_SW = (8.24 * P_a) / 0.101325
  const C_SM = C_SW * (O_t / 42 + P_b / (2 * P_a))
  const FCF = (alfa * (beta * C_SM - C_0)) / C_S
  const SOR = OV_h_aM / FCF

  // 二沉池计算
  const TS_BS = (1000 / DSVI) * t_E ** (1 / 3)
  const TS_RS = f * TS_BS
  const TS_BB_sst = (RV * TS_RS) / (1 + RV)
  const DSV = TS_BB_sst * DSVI
  const Ast = Q_d_max / 24 / q_A
  const h4 = (TS_BB_sst * q_A * (1 + RV) * t_E) / TS_BS
  const h2 = (0.5 * q_A * (1 + RV)) / (1 - DSV / 1000)
  const h3 = (1.5 * 0.3 * q_A * DSV * (1 + RV)) / 500
  const h1 = 0.5
  const h = h1 + h2 + h3 + h4

  return {
    Q_d_max,
    V_BB,
    V_an,
    V_D,
    V_aero,
    V_bioT,
    HRT_an,
    HRT_D,
    HRT_aero,
    HRT_bioT,
    US_d_r,
    t_TS_Bem_f,
    OV_h_aM,
    OV_h_max,
    SOR,
    RF,
    RZ,
    L_C,
    L_B,
    Ast,
    h,
    C_COD_dos_f,
    V_D_over_V_BB_f,
  }
}

// 二沉池计算函数
function calculateSST(
  Q_M: number,
  DSVI: number,
  t_E: number,
  RV: number,
  f: number,
  q_A: number,
) {
  const Q_h_Knoz = Q_M / 24
  let Kz: number
  if (Q_h_Knoz <= 13) {
    Kz = 2.7
  } else if (Q_h_Knoz >= 2600) {
    Kz = 1.5
  } else {
    Kz = 3.5778 * Q_h_Knoz ** -0.112
  }
  const Q_d_max = Q_M * Kz
  const TS_BS = (1000 / DSVI) * t_E ** (1 / 3)
  const TS_RS = f * TS_BS
  const TS_BB = (RV * TS_RS) / (1 + RV)
  const DSV = TS_BB * DSVI
  const Ast = Q_d_max / 24 / q_A
  const h4 = (TS_BB * q_A * (1 + RV) * t_E) / TS_BS
  const h2 = (0.5 * q_A * (1 + RV)) / (1 - DSV / 1000)
  const h3 = (1.5 * 0.3 * q_A * DSV * (1 + RV)) / 500
  const q_sv = q_A * DSV
  const h1 = 0.5
  const h = h1 + h2 + h3 + h4

  return {
    Q_d_max,
    Ast,
    TS_BB,
    TS_RS,
    h1,
    h2,
    h3,
    h4,
    h,
    q_sv,
  }
}

// 滑块组件
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
  step = 0.01,
  unit,
  hint,
  decimals = 2,
}) => {
  return (
    <Box w="100%">
      <Slider.Root
        value={[value]}
        onValueChange={(d) => onChange(d.value[0])}
        min={min}
        max={max}
        step={step}
        width="100%"
      >
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontWeight="medium" fontSize="sm">
            {label}
          </Text>
          <Text fontWeight="bold" color="#AF8219" minW="16" textAlign="right">
            {value.toFixed(decimals)} {unit}
          </Text>
        </Flex>
        <Slider.Control>
          <Slider.Track>
            <Slider.Range />
          </Slider.Track>
          <Slider.Thumbs />
        </Slider.Control>
      </Slider.Root>
      {hint && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {hint}
        </Text>
      )}
    </Box>
  )
}

// 数字输入组件
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
        min={min}
        max={max}
        step={step}
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

// 统计卡片组件
const StatCard: React.FC<{
  label: string
  value: number
  unit?: string
  precision?: number
  color?: string
}> = ({ label, value, unit, precision = 2, color = "blue" }) => {
  return (
    <Stat.Root>
      <Stat.Label fontSize="sm" color="gray.600">
        {label}
      </Stat.Label>
      <Stat.ValueText fontSize="xl" fontWeight="bold" color={`${color}.600`}>
        {Number.isFinite(value) ? value.toFixed(precision) : "—"}
        {unit && (
          <Text as="span" fontSize="sm" color="gray.500" ml={1}>
            {unit}
          </Text>
        )}
      </Stat.ValueText>
    </Stat.Root>
  )
}

export const DWACalculator: React.FC = () => {
  const cardBg = useColorModeValue("white", "gray.800")

  const [inputs, setInputs] = React.useState<DWAInputs>({
    // 常数或建议数值
    f_s: 0.1,
    f_A: 0.3,
    f_COD: 0.2,
    f_B: 0.3,
    S_orgN_AN: 2.0,
    Y_COD_abb: 0.67,
    b: 0.17,
    C_0: 2.0,
    C_S: 9.17,
    S_NO3_ZB: 0,
    miu_A_max: 0.47,

    // 进出水流量与水质
    Q_d_Knoz: 10000,
    C_COD_ZB: 400,
    C_BOD5_ZB: 200,
    C_P_ZB: 8,
    C_TN_ZB: 50,
    C_SS_ZB: 300,
    T_C: 15,
    S_COD_AN: 50,
    S_BOD5_AN: 10,
    S_TP_AN: 1,
    S_TN_AN: 15,
    S_NH4_AN: 5,
    S_SS_AN: 10,
    TS_BB: 5,

    // 传氧速率参数
    alfa: 0.85,
    beta: 0.95,
    h_TB2A: 0.2,
    h_tk: 5.0,
    h_El: 100,
    E_A: 0.3,

    // 选择参数
    COD_dos_name: "醋酸",
    P_dos_name: "铝盐",

    // 二沉池参数
    DSVI: 120,
    t_E: 2.0,
    RV: 0.7,
    f: 0.8,
    q_A: 1.2,
  })

  // 添加计算状态和结果状态
  const [isCalculating, setIsCalculating] = React.useState(false)
  const [result, setResult] = React.useState<DWAResult | null>(null)
  const [sstResult, setSstResult] = React.useState<any>(null)
  const [chartData, setChartData] = React.useState<any[]>([])

  const onChange = <K extends keyof DWAInputs>(key: K, value: DWAInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  // 计算函数
  const handleCalculate = React.useCallback(async () => {
    setIsCalculating(true)

    // 使用 setTimeout 来模拟异步计算，避免阻塞UI
    setTimeout(() => {
      try {
        const newResult = calculateDWA(inputs)
        const newSstResult = calculateSST(
          inputs.Q_d_Knoz,
          inputs.DSVI,
          inputs.t_E,
          inputs.RV,
          inputs.f,
          inputs.q_A,
        )

        // 生成图表数据
        const newChartData = []
        for (let i = 0.1; i <= 0.6; i += 0.05) {
          const testInputs = { ...inputs, f_COD: i }
          const testResult = calculateDWA(testInputs)
          newChartData.push({
            f_COD: i,
            V_BB: testResult.V_BB,
            SOR: testResult.SOR,
            HRT_bioT: testResult.HRT_bioT,
          })
        }

        setResult(newResult)
        setSstResult(newSstResult)
        setChartData(newChartData)
      } catch (error) {
        console.error("计算错误:", error)
      } finally {
        setIsCalculating(false)
      }
    }, 100)
  }, [inputs])

  // 移除初始自动计算，让用户手动点击按钮计算

  return (
    <Box w="100%">
      <Card.Root bg={cardBg} shadow="md" borderRadius="xl" overflow="hidden">
        <Card.Body p={8}>
          <Text fontSize="3xl" fontWeight="extrabold" color="gray.800" mb={4}>
            DWA A/O 工艺设计计算器
          </Text>

          <Text maxW="full" mx="auto" fontSize="lg" color="gray.600" mb={4}>
            基于德国 DWA 标准的 A/O
            工艺设计计算，包含缺氧/好氧池容积、污泥龄、供氧量、二沉池等关键参数的计算与优化。
          </Text>

          <Tabs.Root defaultValue="water-quality" variant="enclosed">
            <Tabs.List mb={6}>
              <Tabs.Trigger value="water-quality">进出水水质</Tabs.Trigger>
              <Tabs.Trigger value="process-params">工艺参数</Tabs.Trigger>
              <Tabs.Trigger value="oxygen-params">供氧参数</Tabs.Trigger>
              <Tabs.Trigger value="sst-params">二沉池参数</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="water-quality">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "1fr 1fr",
                  lg: "1fr 1fr 1fr",
                }}
                gap={6}
              >
                <LabeledNumber
                  label="日平均进水水量"
                  value={inputs.Q_d_Knoz}
                  onChange={(v) => onChange("Q_d_Knoz", v)}
                  step={100}
                  unit="m³/d"
                  min={1}
                />

                <LabeledSlider
                  label="进水COD"
                  value={inputs.C_COD_ZB}
                  onChange={(v) => onChange("C_COD_ZB", v)}
                  min={100}
                  max={800}
                  step={10}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="进水BOD5"
                  value={inputs.C_BOD5_ZB}
                  onChange={(v) => onChange("C_BOD5_ZB", v)}
                  min={50}
                  max={400}
                  step={5}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="进水总氮"
                  value={inputs.C_TN_ZB}
                  onChange={(v) => onChange("C_TN_ZB", v)}
                  min={10}
                  max={100}
                  step={1}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="进水总磷"
                  value={inputs.C_P_ZB}
                  onChange={(v) => onChange("C_P_ZB", v)}
                  min={1}
                  max={20}
                  step={0.5}
                  unit="mg/L"
                  decimals={1}
                />

                <LabeledSlider
                  label="进水悬浮固体"
                  value={inputs.C_SS_ZB}
                  onChange={(v) => onChange("C_SS_ZB", v)}
                  min={100}
                  max={600}
                  step={10}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="出水COD"
                  value={inputs.S_COD_AN}
                  onChange={(v) => onChange("S_COD_AN", v)}
                  min={10}
                  max={100}
                  step={5}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="出水总氮"
                  value={inputs.S_TN_AN}
                  onChange={(v) => onChange("S_TN_AN", v)}
                  min={5}
                  max={30}
                  step={1}
                  unit="mg/L"
                  decimals={0}
                />

                <LabeledSlider
                  label="出水氨氮"
                  value={inputs.S_NH4_AN}
                  onChange={(v) => onChange("S_NH4_AN", v)}
                  min={1}
                  max={15}
                  step={0.5}
                  unit="mg/L"
                  decimals={1}
                />
              </Grid>
            </Tabs.Content>

            <Tabs.Content value="process-params">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "1fr 1fr",
                  lg: "1fr 1fr 1fr",
                }}
                gap={6}
              >
                <LabeledSlider
                  label="设计温度"
                  value={inputs.T_C}
                  onChange={(v) => onChange("T_C", v)}
                  min={5}
                  max={35}
                  step={1}
                  unit="℃"
                  decimals={0}
                />

                <LabeledSlider
                  label="生物池污泥浓度"
                  value={inputs.TS_BB}
                  onChange={(v) => onChange("TS_BB", v)}
                  min={2}
                  max={8}
                  step={0.1}
                  unit="g/L"
                  decimals={1}
                />

                <LabeledSlider
                  label="易降解COD比例"
                  value={inputs.f_COD}
                  onChange={(v) => onChange("f_COD", v)}
                  min={0.15}
                  max={0.25}
                  step={0.01}
                  unit=""
                  decimals={2}
                  hint="典型值 0.15-0.25"
                />

                <LabeledSlider
                  label="可降解COD产泥系数"
                  value={inputs.Y_COD_abb}
                  onChange={(v) => onChange("Y_COD_abb", v)}
                  min={0.3}
                  max={0.8}
                  step={0.01}
                  unit=""
                  decimals={2}
                  hint="典型值 0.67"
                />

                <LabeledSlider
                  label="15℃衰减系数"
                  value={inputs.b}
                  onChange={(v) => onChange("b", v)}
                  min={0.1}
                  max={0.2}
                  step={0.01}
                  unit="d⁻¹"
                  decimals={2}
                  hint="典型值 0.17"
                />

                <LabeledSlider
                  label="硝化菌最大比生长速率"
                  value={inputs.miu_A_max}
                  onChange={(v) => onChange("miu_A_max", v)}
                  min={0.2}
                  max={0.47}
                  step={0.01}
                  unit="d⁻¹"
                  decimals={2}
                  hint="15℃条件下"
                />

                <Field label="碳源类型">
                  <Select.Root
                    collection={createListCollection({
                      items: [
                        { label: "甲醇", value: "甲醇" },
                        { label: "乙醇", value: "乙醇" },
                        { label: "醋酸", value: "醋酸" },
                      ],
                    })}
                    value={[inputs.COD_dos_name]}
                    onValueChange={(details: any) =>
                      onChange("COD_dos_name", details.value[0])
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="选择碳源类型" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {createListCollection({
                            items: [
                              { label: "甲醇", value: "甲醇" },
                              { label: "乙醇", value: "乙醇" },
                              { label: "醋酸", value: "醋酸" },
                            ],
                          }).items.map((item) => (
                            <Select.Item key={item.value} item={item}>
                              {item.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </Field>

                <Field label="除磷剂类型">
                  <Select.Root
                    collection={createListCollection({
                      items: [
                        { label: "铁盐", value: "铁盐" },
                        { label: "铝盐", value: "铝盐" },
                      ],
                    })}
                    value={[inputs.P_dos_name]}
                    onValueChange={(details: any) =>
                      onChange("P_dos_name", details.value[0])
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="选择除磷剂类型" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {createListCollection({
                            items: [
                              { label: "铁盐", value: "铁盐" },
                              { label: "铝盐", value: "铝盐" },
                            ],
                          }).items.map((item) => (
                            <Select.Item key={item.value} item={item}>
                              {item.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </Field>
              </Grid>
            </Tabs.Content>

            <Tabs.Content value="oxygen-params">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "1fr 1fr",
                  lg: "1fr 1fr 1fr",
                }}
                gap={6}
              >
                <LabeledSlider
                  label="α (混合液KLa/清水KLa)"
                  value={inputs.alfa}
                  onChange={(v) => onChange("alfa", v)}
                  min={0.8}
                  max={0.85}
                  step={0.01}
                  unit=""
                  decimals={2}
                  hint="典型值 0.8-0.85"
                />

                <LabeledSlider
                  label="β (混合液饱和DO/清水饱和DO)"
                  value={inputs.beta}
                  onChange={(v) => onChange("beta", v)}
                  min={0.9}
                  max={0.97}
                  step={0.01}
                  unit=""
                  decimals={2}
                  hint="典型值 0.9-0.97"
                />

                <LabeledSlider
                  label="混合液剩余DO值"
                  value={inputs.C_0}
                  onChange={(v) => onChange("C_0", v)}
                  min={0.5}
                  max={5}
                  step={0.1}
                  unit="mg/L"
                  decimals={1}
                />

                <LabeledSlider
                  label="氧利用率"
                  value={inputs.E_A}
                  onChange={(v) => onChange("E_A", v)}
                  min={0.2}
                  max={0.4}
                  step={0.01}
                  unit=""
                  decimals={2}
                />

                <LabeledNumber
                  label="曝气装置与池底距离"
                  value={inputs.h_TB2A}
                  onChange={(v) => onChange("h_TB2A", v)}
                  step={0.1}
                  unit="m"
                  min={0.1}
                  max={1}
                />

                <LabeledNumber
                  label="设计水深"
                  value={inputs.h_tk}
                  onChange={(v) => onChange("h_tk", v)}
                  step={0.5}
                  unit="m"
                  min={3}
                  max={8}
                />

                <LabeledNumber
                  label="当地海拔高度"
                  value={inputs.h_El}
                  onChange={(v) => onChange("h_El", v)}
                  step={10}
                  unit="m"
                  min={0}
                  max={2000}
                />
              </Grid>
            </Tabs.Content>

            <Tabs.Content value="sst-params">
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "1fr 1fr",
                  lg: "1fr 1fr 1fr",
                }}
                gap={6}
              >
                <LabeledSlider
                  label="污泥体积指数DSVI"
                  value={inputs.DSVI}
                  onChange={(v) => onChange("DSVI", v)}
                  min={50}
                  max={200}
                  step={10}
                  unit="L/kg"
                  decimals={0}
                  hint="典型值 50-200"
                />

                <LabeledSlider
                  label="设计浓缩时间"
                  value={inputs.t_E}
                  onChange={(v) => onChange("t_E", v)}
                  min={1.0}
                  max={2.5}
                  step={0.1}
                  unit="h"
                  decimals={1}
                  hint="典型值 1.0-2.5"
                />

                <LabeledSlider
                  label="污泥回流比"
                  value={inputs.RV}
                  onChange={(v) => onChange("RV", v)}
                  min={0.5}
                  max={1.2}
                  step={0.1}
                  unit=""
                  decimals={1}
                  hint="典型值 0.5-1.2"
                />

                <LabeledSlider
                  label="污泥回流短流系数"
                  value={inputs.f}
                  onChange={(v) => onChange("f", v)}
                  min={0.5}
                  max={1.0}
                  step={0.1}
                  unit=""
                  decimals={1}
                  hint="典型值 0.5-1.0"
                />

                <LabeledSlider
                  label="设计表面负荷"
                  value={inputs.q_A}
                  onChange={(v) => onChange("q_A", v)}
                  min={0.8}
                  max={2.0}
                  step={0.1}
                  unit="m/h"
                  decimals={1}
                  hint="典型值 0.8-2.0"
                />
              </Grid>
            </Tabs.Content>
          </Tabs.Root>

          <Separator my={8} />

          {/* 计算结果 */}
          <VStack gap={8}>
            <Flex justify="space-between" align="center" w="100%">
              <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                计算结果
              </Text>
              {result && (
                <Button
                  onClick={handleCalculate}
                  loading={isCalculating}
                  loadingText="重新计算中..."
                  colorScheme="blue"
                  variant="outline"
                >
                  重新计算
                </Button>
              )}
            </Flex>

            {result && sstResult ? (
              <Grid
                templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
                gap={8}
                w="100%"
              >
                {/* 左侧：主要结果 */}
                <GridItem>
                  <VStack gap={6}>
                    <Box
                      w="100%"
                      bg={useColorModeValue("blue.50", "blue.900")}
                      p={6}
                      borderRadius="lg"
                    >
                      <Text
                        fontSize="lg"
                        fontWeight="semibold"
                        mb={4}
                        color="blue.700"
                      >
                        生物池设计参数
                      </Text>
                      <Grid templateColumns="1fr 1fr" gap={4}>
                        <StatCard
                          label="总生物池容积"
                          value={result.V_bioT}
                          unit="m³"
                          color="blue"
                        />
                        <StatCard
                          label="好氧池容积"
                          value={result.V_aero}
                          unit="m³"
                          color="blue"
                        />
                        <StatCard
                          label="缺氧池容积"
                          value={result.V_D}
                          unit="m³"
                          color="blue"
                        />
                        <StatCard
                          label="厌氧池容积"
                          value={result.V_an}
                          unit="m³"
                          color="blue"
                        />
                        <StatCard
                          label="总水力停留时间"
                          value={result.HRT_bioT}
                          unit="h"
                          color="blue"
                        />
                        <StatCard
                          label="污泥龄"
                          value={result.t_TS_Bem_f}
                          unit="d"
                          color="blue"
                        />
                      </Grid>
                    </Box>

                    <Box
                      w="100%"
                      bg={useColorModeValue("green.50", "green.900")}
                      p={6}
                      borderRadius="lg"
                    >
                      <Text
                        fontSize="lg"
                        fontWeight="semibold"
                        mb={4}
                        color="green.700"
                      >
                        供氧与回流参数
                      </Text>
                      <Grid templateColumns="1fr 1fr" gap={4}>
                        <StatCard
                          label="平均耗氧量"
                          value={result.OV_h_aM}
                          unit="kgO₂/h"
                          color="green"
                        />
                        <StatCard
                          label="最高耗氧量"
                          value={result.OV_h_max}
                          unit="kgO₂/h"
                          color="green"
                        />
                        <StatCard
                          label="标准传氧速率"
                          value={result.SOR}
                          unit="kgO₂/h"
                          color="green"
                        />
                        <StatCard
                          label="混合液回流比"
                          value={result.RF}
                          unit=""
                          color="green"
                        />
                        <StatCard
                          label="内回流比"
                          value={result.RZ}
                          unit=""
                          color="green"
                        />
                        <StatCard
                          label="剩余污泥量"
                          value={result.US_d_r}
                          unit="kg/d"
                          color="green"
                        />
                      </Grid>
                    </Box>

                    <Box
                      w="100%"
                      bg={useColorModeValue("purple.50", "purple.900")}
                      p={6}
                      borderRadius="lg"
                    >
                      <Text
                        fontSize="lg"
                        fontWeight="semibold"
                        mb={4}
                        color="purple.700"
                      >
                        二沉池设计参数
                      </Text>
                      <Grid templateColumns="1fr 1fr" gap={4}>
                        <StatCard
                          label="二沉池表面积"
                          value={sstResult.Ast}
                          unit="m²"
                          color="purple"
                        />
                        <StatCard
                          label="二沉池深度"
                          value={sstResult.h}
                          unit="m"
                          color="purple"
                        />
                        <StatCard
                          label="设计流量"
                          value={sstResult.Q_d_max}
                          unit="m³/d"
                          color="purple"
                        />
                        <StatCard
                          label="进水污泥浓度"
                          value={sstResult.TS_BB}
                          unit="kg/m³"
                          color="purple"
                        />
                        <StatCard
                          label="回流污泥浓度"
                          value={sstResult.TS_RS}
                          unit="kg/m³"
                          color="purple"
                        />
                        <StatCard
                          label="污泥体积负荷"
                          value={sstResult.q_sv}
                          unit="L/(m³·h)"
                          color="purple"
                        />
                      </Grid>
                    </Box>
                  </VStack>
                </GridItem>

                {/* 右侧：图表 */}
                <GridItem>
                  <VStack gap={6}>
                    <Box
                      w="100%"
                      bg={useColorModeValue("gray.50", "gray.700")}
                      p={6}
                      borderRadius="lg"
                    >
                      <Text fontSize="lg" fontWeight="semibold" mb={4}>
                        易降解COD比例对设计参数的影响
                      </Text>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="f_COD"
                            tickFormatter={(value) => value.toFixed(2)}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <RechartsTooltip
                            formatter={(value: number, name: string) => [
                              value.toFixed(2),
                              name === "V_BB"
                                ? "生物池容积 (m³)"
                                : name === "SOR"
                                  ? "标准传氧速率 (kgO₂/h)"
                                  : "总停留时间 (h)",
                            ]}
                            labelFormatter={(value) =>
                              `易降解COD比例: ${Number(value).toFixed(2)}`
                            }
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="V_BB"
                            stroke="#3182ce"
                            strokeWidth={2}
                            name="生物池容积"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="SOR"
                            stroke="#38a169"
                            strokeWidth={2}
                            name="标准传氧速率"
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="HRT_bioT"
                            stroke="#805ad5"
                            strokeWidth={2}
                            name="总停留时间"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>

                    <Collapsible.Root>
                      <Collapsible.Trigger asChild>
                        <Button variant="outline" w="100%">
                          查看详细计算说明
                        </Button>
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <Box
                          mt={4}
                          p={4}
                          bg={useColorModeValue("gray.50", "gray.700")}
                          borderRadius="md"
                        >
                          <Text fontSize="sm" color="gray.600" lineHeight={1.6}>
                            <strong>计算说明：</strong>
                            <br />
                            1. 本计算器基于德国DWA标准进行A/O工艺设计
                            <br />
                            2. 生物池容积根据污泥龄、污泥浓度和污泥产量计算
                            <br />
                            3. 供氧量考虑碳氧化、硝化需氧和反硝化回收氧量
                            <br />
                            4. 回流比根据反硝化脱氮要求确定
                            <br />
                            5. 二沉池设计考虑污泥沉降性能和浓缩要求
                            <br />
                            6. 外加碳源投加量根据反硝化碳源需求自动计算
                            <br />
                            <br />
                            <strong>注意事项：</strong>
                            <br />• 进水污泥体积负荷应小于500L/(m³·h)
                            <br />• 好氧池COD负荷建议控制在0.3-0.8
                            kgCOD/(kgMLSS·d)
                            <br />• 污泥龄应满足硝化菌增殖要求
                            <br />
                          </Text>
                        </Box>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </VStack>
                </GridItem>
              </Grid>
            ) : (
              <Box textAlign="center" py={12}>
                <Text fontSize="lg" color="gray.500" mb={4}>
                  请点击"开始计算"按钮进行计算
                </Text>
                <Button
                  onClick={handleCalculate}
                  loading={isCalculating}
                  loadingText="计算中..."
                  colorScheme="blue"
                  size="lg"
                >
                  {isCalculating ? "计算中..." : "开始计算"}
                </Button>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}
