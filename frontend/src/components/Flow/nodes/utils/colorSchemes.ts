import { t } from "@/utils/i18n"

export const TAB10_COLORS: string[] = [
  "#e69f00",
  "#56b4e9",
  "#009e73",
  "#f0e442",
  "#0072b2",
  "#d55e00",
  "#cc79a7",
  "#000000",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
]

export const EXTENDED_COLOR_PALETTE: string[] = [
  "#B6ACC4",
  "#EAD29A",
  "#C77440",
  "#BEDBD8",
  "#72BDBB",
  "#4E698E",
  "#9FAE94",
  "#1B526A",
  "#F5CCBE",
  "#68230D",
  "#B032EB",
  "#A8CC8C",
  "#1899D3",
  "#8A8FF8",
  "#DEC83D",
  "#549BCE",
  "#1D1814",
  "#C6B7A4",
  "#EFCAD6",
  "#658080",
  "#70C5CA",
  "#8CA231",
  "#E2DA56",
  "#F3E7D9",
  "#BA2320",
  "#D74322",
  "#0B674E",
  "#924727",
  "#CFBF9B",
  "#CE306A",
  "#6B2220",
  "#9B5F41",
  "#FFF4D6",
  "#647C32",
  "#4194A2",
  "#E72267",
  "#C2C2C2",
  "#E5E5E5",
  "#CBEE88",
  "#F9A801",
  "#14162F",
  "#EB6A26",
  "#929F4E",
  "#BD1E01",
  "#0A0A0A",
  "#ACCAF0",
  "#D3B5FF",
  "#E2DDD7",
  "#BC7700",
  "#02774B",
  "#2A4161",
  "#A2465F",
  "#17666D",
  "#E3CCC4",
  "#992A17",
  "#AAA9A9",
  "#DEC63E",
  "#014D2F",
  "#26C3EC",
  "#FF9855",
  "#A452A7",
  "#0E0906",
  "#ABA76F",
  "#ED87AD",
  "#002923",
  "#333333",
  "#007A70",
  "#36BDE7",
  "#C29ECA",
  "#BF1919",
  "#E6A737",
  "#A3D9F2",
  "#A71680",
  "#F2B7C9",
  "#007A39",
  "#F5F5E9",
  "#253368",
  "#EBBE31",
  "#CD1F1D",
  "#FDD596",
  "#723277",
]

export const HEATMAP_COLOR_SCHEMES = {
  blueRed: {
    name: "Blue-Red Diverging",
    colors: [
      "#053061",
      "#2166ac",
      "#4393c3",
      "#92c5de",
      "#d1e5f0",
      "#f7f7f7",
      "#fddbc7",
      "#f4a582",
      "#d6604d",
      "#b2182b",
      "#67001f",
    ],
    description: t("flow.palette.schemeDescriptions.blueRed"),
  },
  coolWarm: {
    name: "Cool-Warm Diverging",
    colors: [
      "#3b4cc0",
      "#5d6cc0",
      "#7e8cc0",
      "#9eacc0",
      "#beccc0",
      "#ddecc0",
      "#f7f7f7",
      "#f7d7c7",
      "#f7b797",
      "#f79767",
      "#f77737",
      "#f75707",
    ],
    description: t("flow.palette.schemeDescriptions.coolWarm"),
  },
  seabornDiverging: {
    name: "Seaborn Diverging (230, 20)",
    colors: [
      "#9b59b6",
      "#af7ac5",
      "#c39bd3",
      "#d7bde2",
      "#ebdef0",
      "#f8f9fa",
      "#fadbd8",
      "#f5b7b1",
      "#f1948a",
      "#ec7063",
      "#e74c3c",
    ],
    description: t("flow.palette.schemeDescriptions.seabornDiverging"),
  },
  greenOrange: {
    name: "Green-Orange Diverging",
    colors: [
      "#1a9641",
      "#40b93c",
      "#74d055",
      "#a6db7a",
      "#d9ef8b",
      "#ffffbf",
      "#fee08b",
      "#fdae61",
      "#f46d43",
      "#d73027",
      "#a50026",
    ],
    description: t("flow.palette.schemeDescriptions.greenOrange"),
  },
} as const

export type HeatmapColorSchemeId = keyof typeof HEATMAP_COLOR_SCHEMES

export const SCIENTIFIC_COLOR_SCHEMES = {
  plasma: {
    name: "Plasma",
    colors: ["#0d0887", "#6a00a8", "#b12a90", "#e16462", "#fca636", "#f0f921"],
    description: t("flow.palette.schemeDescriptions.plasma"),
  },
  viridis: {
    name: "Viridis",
    colors: [
      "#440154",
      "#482777",
      "#3f4a8a",
      "#31678e",
      "#26838f",
      "#1f9d8a",
      "#6ece58",
      "#b5de2b",
      "#fde725",
    ],
    description: t("flow.palette.schemeDescriptions.viridis"),
  },
  cividis: {
    name: "Cividis",
    colors: [
      "#00204c",
      "#00446b",
      "#39678f",
      "#578daa",
      "#7fb3c4",
      "#a7d9dd",
      "#d0f0c0",
    ],
    description: t("flow.palette.schemeDescriptions.cividis"),
  },
  inferno: {
    name: "Inferno",
    colors: ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"],
    description: t("flow.palette.schemeDescriptions.inferno"),
  },
  magma: {
    name: "Magma",
    colors: ["#000004", "#3b0f70", "#8c2981", "#de4968", "#fe9f6d", "#fcfdbf"],
    description: t("flow.palette.schemeDescriptions.magma"),
  },
} as const

export const ENHANCED_HEATMAP_SCHEMES = {
  ...HEATMAP_COLOR_SCHEMES,
  plasma: {
    name: "Plasma (Scientific)",
    colors: SCIENTIFIC_COLOR_SCHEMES.plasma.colors,
    description: SCIENTIFIC_COLOR_SCHEMES.plasma.description,
  },
  viridis: {
    name: "Viridis (Scientific)",
    colors: SCIENTIFIC_COLOR_SCHEMES.viridis.colors,
    description: SCIENTIFIC_COLOR_SCHEMES.viridis.description,
  },
  cividis: {
    name: "Cividis (Color Blind Safe)",
    colors: SCIENTIFIC_COLOR_SCHEMES.cividis.colors,
    description: SCIENTIFIC_COLOR_SCHEMES.cividis.description,
  },
  inferno: {
    name: "Inferno (Scientific)",
    colors: SCIENTIFIC_COLOR_SCHEMES.inferno.colors,
    description: SCIENTIFIC_COLOR_SCHEMES.inferno.description,
  },
  magma: {
    name: "Magma (Scientific)",
    colors: SCIENTIFIC_COLOR_SCHEMES.magma.colors,
    description: SCIENTIFIC_COLOR_SCHEMES.magma.description,
  },
  singleBlue: {
    name: "Single Blue",
    colors: [
      "#f7fbff",
      "#deebf7",
      "#c6dbef",
      "#9ecae1",
      "#6baed6",
      "#4292c6",
      "#2171b5",
      "#08519c",
      "#08306b",
    ],
    description: t("flow.palette.schemeDescriptions.singleBlue"),
  },
  singleRed: {
    name: "Single Red",
    colors: [
      "#fff5f0",
      "#fee0d2",
      "#fcbba1",
      "#fc9272",
      "#fb6a4a",
      "#ef3b2c",
      "#cb181d",
      "#a50f15",
      "#67000d",
    ],
    description: t("flow.palette.schemeDescriptions.singleRed"),
  },
  singleGreen: {
    name: "Single Green",
    colors: [
      "#f7fcf5",
      "#e5f5e0",
      "#c7e9c0",
      "#a1d99b",
      "#74c476",
      "#41ab5d",
      "#238b45",
      "#006d2c",
      "#00441b",
    ],
    description: t("flow.palette.schemeDescriptions.singleGreen"),
  },
  colorBlindFriendly: {
    name: "Color Blind Friendly",
    colors: [
      "#ffffff",
      "#f0f0f0",
      "#d9d9d9",
      "#bdbdbd",
      "#969696",
      "#737373",
      "#525252",
      "#252525",
      "#000000",
    ],
    description: t("flow.palette.schemeDescriptions.colorBlindFriendly"),
  },
} as const

export type EnhancedHeatmapColorSchemeId = keyof typeof ENHANCED_HEATMAP_SCHEMES

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const normalizeHex = (hex: string): string => {
  if (!HEX_COLOR_REGEX.test(hex)) {
    return ""
  }
  if (hex.length === 4) {
    const r = hex[1]
    const g = hex[2]
    const b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return hex.toLowerCase()
}

const hexChannelToInt = (value: string): number => Number.parseInt(value, 16)

const hexToRgb = (hex: string): [number, number, number] | null => {
  const normalized = normalizeHex(hex)
  if (!normalized) {
    return null
  }
  const r = hexChannelToInt(normalized.slice(1, 3))
  const g = hexChannelToInt(normalized.slice(3, 5))
  const b = hexChannelToInt(normalized.slice(5, 7))
  return [r, g, b]
}

const rgbChannelToHex = (value: number): string => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)))
  const hex = clamped.toString(16)
  return hex.length === 1 ? `0${hex}` : hex
}

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${rgbChannelToHex(r)}${rgbChannelToHex(g)}${rgbChannelToHex(b)}`

const mixWithWhite = (hex: string, ratio: number): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return hex
  }
  const [r, g, b] = rgb
  const mixRatio = Math.max(0, Math.min(1, ratio))
  const mixedR = r + (255 - r) * mixRatio
  const mixedG = g + (255 - g) * mixRatio
  const mixedB = b + (255 - b) * mixRatio
  return rgbToHex(mixedR, mixedG, mixedB)
}

export const buildColorScaleFromBase = (
  baseColor: string,
  count: number,
): string[] => {
  const normalizedBase = normalizeHex(baseColor)
  if (!normalizedBase) {
    return TAB10_COLORS.slice(0, Math.max(0, count))
  }
  if (count <= 1) {
    return [normalizedBase]
  }
  const palette: string[] = []
  const step = 0.55 / (count - 1)
  for (let i = 0; i < count; i++) {
    palette.push(mixWithWhite(normalizedBase, step * i))
  }
  return palette
}

export interface GroupedChartColors {
  primary: string
  secondary: string
  type: "monochromatic" | "complementary" | "analogous" | "triadic"
}

const hexToHsl = (hex: string): [number, number, number] => {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number
  let s: number
  let l: number
  l = (max + min) / 2
  if (max === min) {
    h = 0
    s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
      default:
        h = 0
    }
    h /= 6
  }
  return [h * 360, s * 100, l * 100]
}

const hslToHex = (h: number, s: number, l: number): string => {
  const hh = h / 360
  const ss = s / 100
  const ll = l / 100
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (ss === 0) {
    r = ll
    g = ll
    b = ll
  } else {
    const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
    const p = 2 * ll - q
    r = hue2rgb(p, q, hh + 1 / 3)
    g = hue2rgb(p, q, hh)
    b = hue2rgb(p, q, hh - 1 / 3)
  }
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? `0${hex}` : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const generateMonochromaticPalette = (
  baseColor: string,
  steps = 5,
): string[] => {
  const [h, s, l] = hexToHsl(baseColor)
  const palette: string[] = []
  for (let i = 0; i < steps; i++) {
    const lightness = Math.max(
      20,
      Math.min(90, l + (i - Math.floor(steps / 2)) * 15),
    )
    palette.push(hslToHex(h, s, lightness))
  }
  return palette
}

export const generateGroupedColors = (
  primary: string,
  type: GroupedChartColors["type"],
): GroupedChartColors => {
  const [h, s, l] = hexToHsl(primary)
  let secondaryHue: number
  switch (type) {
    case "complementary":
      secondaryHue = (h + 180) % 360
      break
    case "analogous":
      secondaryHue = (h + 30) % 360
      break
    case "triadic":
      secondaryHue = (h + 120) % 360
      break
    default:
      secondaryHue = h
      break
  }
  const secondary =
    type === "monochromatic"
      ? hslToHex(h, Math.max(20, s - 20), Math.min(80, l + 20))
      : hslToHex(secondaryHue, s, l)
  return {
    primary,
    secondary,
    type,
  }
}
