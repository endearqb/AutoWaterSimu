import { create } from "zustand"
import {
  EXTENDED_COLOR_PALETTE,
  TAB10_COLORS,
  buildColorScaleFromBase,
  generateGroupedColors,
  generateMonochromaticPalette,
} from "../components/Flow/nodes/utils/colorSchemes"

type Scheme =
  | "monochromatic"
  | "complementary"
  | "analogous"
  | "triadic"
  | "tab10"
  | "extended"

type State = {
  scheme: Scheme
  baseColor: string
  steps: number
  palette: string[]
  modelPalettes: Record<
    string,
    { scheme: Scheme; baseColor: string; steps: number; palette: string[] }
  >
  applyPalette: (tintOrder?: string[]) => void
  setModelPalette: (
    modelKey: string,
    scheme: Scheme,
    baseColor: string,
    steps: number,
    paletteOverride?: string[],
  ) => void
  applyForModel: (modelKey: string, tintOrder?: string[]) => void
  applyStoredForModel: (modelKey: string, tintOrder?: string[]) => void
  setPaletteDirect: (palette: string[]) => void
  setScheme: (scheme: Scheme) => void
  setBaseColor: (hex: string) => void
  setSteps: (n: number) => void
  applyClassicThemeForModel: (modelKey: string) => void
  applyClassicGlassThemeForModel: (modelKey: string) => void
  reset: () => void
}

const TINT_ORDER_DEFAULT: string[] = [
  "input",
  "output",
  "asm1",
  "asm3",
  "asmslim",
  "udm",
  "default",
  "cash",
  "goal",
  "traffic",
]

const getFlowThemeScopeElement = (): HTMLElement | null => {
  const el = document.querySelector("[data-flow-theme-scope]")
  return el instanceof HTMLElement ? el : null
}

const applyPaletteWith = (palette: string[], tintOrder?: string[]) => {
  const order = tintOrder?.length ? tintOrder : TINT_ORDER_DEFAULT
  const pal = palette
  const root = document.documentElement
  const scope = getFlowThemeScopeElement() ?? root
  const isClassic =
    (root.style.getPropertyValue("--chakra-glass-classic") || "").trim() === "1"
  const isClassicGlass =
    (
      root.style.getPropertyValue("--chakra-glass-classic-glass") || ""
    ).trim() === "1"
  order.forEach((tint, idx) => {
    const color = pal[idx % pal.length]
    scope.style.setProperty(`--chakra-colors-glass-accent-${tint}`, color)
    if (!isClassic && !isClassicGlass) {
      scope.style.setProperty(`--chakra-colors-glass-outline-${tint}`, color)
      scope.style.setProperty(`--chakra-colors-glass-handle-${tint}`, color)
      const rgba = (() => {
        const hex = color.toLowerCase()
        const h = hex.startsWith("#") ? hex.slice(1) : hex
        const r = Number.parseInt(h.slice(0, 2), 16)
        const g = Number.parseInt(h.slice(2, 4), 16)
        const b = Number.parseInt(h.slice(4, 6), 16)
        const mix = (v: number, ratio: number) =>
          Math.round(v + (255 - v) * ratio)
        const rr = mix(r, 0.4)
        const gg = mix(g, 0.4)
        const bb = mix(b, 0.4)
        const toHex = (v: number) => v.toString(16).padStart(2, "0")
        const aa = Math.round(0.45 * 255)
          .toString(16)
          .padStart(2, "0")
        return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}${aa}`
      })()
      scope.style.setProperty(`--chakra-colors-glass-tint-${tint}`, rgba)
    }
  })
}

const computePalette = (
  scheme: Scheme,
  baseColor: string,
  steps: number,
): string[] => {
  if (scheme === "monochromatic") {
    return generateMonochromaticPalette(baseColor, steps)
  }
  if (
    scheme === "complementary" ||
    scheme === "analogous" ||
    scheme === "triadic"
  ) {
    const group = generateGroupedColors(baseColor, scheme)
    const a = buildColorScaleFromBase(group.primary, Math.ceil(steps / 2))
    const b = buildColorScaleFromBase(group.secondary, Math.floor(steps / 2))
    return [...a, ...b]
  }
  if (scheme === "tab10") {
    return TAB10_COLORS.slice(0, Math.max(1, steps))
  }
  if (scheme === "extended") {
    return EXTENDED_COLOR_PALETTE.slice(0, Math.max(1, steps))
  }
  return generateMonochromaticPalette(baseColor, steps)
}

export const useThemePaletteStore = create<State>((set, get) => ({
  scheme: "monochromatic",
  baseColor: "#2563eb",
  steps: 6,
  palette: computePalette("monochromatic", "#2563eb", 6),
  modelPalettes: {},
  setScheme: (scheme) =>
    set({
      scheme,
      palette: computePalette(scheme, get().baseColor, get().steps),
    }),
  setBaseColor: (hex) =>
    set({
      baseColor: hex,
      palette: computePalette(get().scheme, hex, get().steps),
    }),
  setSteps: (n) =>
    set({
      steps: n,
      palette: computePalette(get().scheme, get().baseColor, n),
    }),
  applyPalette: (tintOrder) => {
    applyPaletteWith(get().palette, tintOrder)
  },
  setModelPalette: (modelKey, scheme, baseColor, steps, paletteOverride) => {
    const palette =
      paletteOverride && paletteOverride.length > 0
        ? paletteOverride
        : computePalette(scheme, baseColor, steps)
    set({
      modelPalettes: {
        ...get().modelPalettes,
        [modelKey]: { scheme, baseColor, steps, palette },
      },
    })
  },
  applyForModel: (modelKey, tintOrder) => {
    const mp = get().modelPalettes[modelKey]
    if (!mp) return
    applyPaletteWith(mp.palette, tintOrder)
  },
  applyStoredForModel: (modelKey, tintOrder) => {
    const mp = get().modelPalettes[modelKey]
    if (!mp) return
    applyPaletteWith(mp.palette, tintOrder)
  },
  setPaletteDirect: (palette) => {
    set({ palette })
  },
  applyClassicThemeForModel: (modelKey) => {
    const root = document.documentElement
    const scope = getFlowThemeScopeElement() ?? root
    const resolvePrimaryTint = (key: string): string => {
      switch (key) {
        case "asm1":
          return "asm1"
        case "asm3":
          return "asm3"
        case "asm1slim":
          return "asmslim"
        case "udm":
          return "udm"
        case "materialBalance":
          return "default"
        default:
          return "default"
      }
    }
    const primaryTint = resolvePrimaryTint(modelKey)
    const accentVar = `--chakra-colors-glass-accent-${primaryTint}`
    const accentColor =
      scope.style.getPropertyValue(accentVar).trim() ||
      getComputedStyle(scope).getPropertyValue(accentVar).trim() ||
      "#2f855a"
    root.style.setProperty("--chakra-glass-classic", "1")
    root.style.setProperty("--chakra-glass-classic-glass", "0")
    scope.style.setProperty("--chakra-colors-glass-blur", "0px")
    scope.style.setProperty("--chakra-colors-glass-panel", "transparent")
    scope.style.setProperty(
      "--chakra-colors-glass-border",
      "hsl(214.3 31.8% 91.4%)",
    )
    ;[...TINT_ORDER_DEFAULT].forEach((tint) => {
      scope.style.setProperty(
        `--chakra-colors-glass-tint-${tint}`,
        "transparent",
      )
      scope.style.setProperty(
        `--chakra-colors-glass-outline-${tint}`,
        accentColor,
      )
      scope.style.setProperty(
        `--chakra-colors-glass-handle-${tint}`,
        "hsl(215.4 16.3% 46.9%)",
      )
    })
    scope.style.setProperty("--chakra-colors-classic-text", accentColor)
  },
  applyClassicGlassThemeForModel: (modelKey) => {
    const root = document.documentElement
    const scope = getFlowThemeScopeElement() ?? root
    const resolvePrimaryTint = (key: string): string => {
      switch (key) {
        case "asm1":
          return "asm1"
        case "asm3":
          return "asm3"
        case "asm1slim":
          return "asmslim"
        case "udm":
          return "udm"
        case "materialBalance":
          return "default"
        default:
          return "default"
      }
    }
    const primaryTint = resolvePrimaryTint(modelKey)
    const accentVar = `--chakra-colors-glass-accent-${primaryTint}`
    const accentColor =
      scope.style.getPropertyValue(accentVar).trim() ||
      getComputedStyle(scope).getPropertyValue(accentVar).trim() ||
      "#2f855a"
    root.style.setProperty("--chakra-glass-classic", "0")
    root.style.setProperty("--chakra-glass-classic-glass", "1")
    scope.style.setProperty("--chakra-colors-glass-blur", "6px")
    scope.style.setProperty("--chakra-colors-glass-panel", "transparent")
    scope.style.setProperty(
      "--chakra-colors-glass-border",
      "hsl(214.3 31.8% 91.4%)",
    )
    ;[...TINT_ORDER_DEFAULT].forEach((tint) => {
      scope.style.setProperty(
        `--chakra-colors-glass-tint-${tint}`,
        "rgba(255,255,255,0.16)",
      )
      scope.style.setProperty(
        `--chakra-colors-glass-outline-${tint}`,
        accentColor,
      )
      scope.style.setProperty(
        `--chakra-colors-glass-handle-${tint}`,
        "hsl(215.4 16.3% 46.9%)",
      )
    })
    scope.style.setProperty("--chakra-colors-classic-text", accentColor)
  },
  reset: () => {
    const root = document.documentElement
    const scope = getFlowThemeScopeElement() ?? root
    ;[...TINT_ORDER_DEFAULT].forEach((tint) => {
      scope.style.removeProperty(`--chakra-colors-glass-accent-${tint}`)
      scope.style.removeProperty(`--chakra-colors-glass-outline-${tint}`)
      scope.style.removeProperty(`--chakra-colors-glass-handle-${tint}`)
      scope.style.removeProperty(`--chakra-colors-glass-tint-${tint}`)
    })
    root.style.setProperty("--chakra-glass-classic", "0")
    root.style.setProperty("--chakra-glass-classic-glass", "0")
    scope.style.removeProperty("--chakra-colors-classic-text")
    set({
      scheme: "monochromatic",
      baseColor: "#2563eb",
      steps: 6,
      palette: computePalette("monochromatic", "#2563eb", 6),
    })
  },
}))
