import type { SystemStyleObject } from "@chakra-ui/react"
import { Position } from "@xyflow/react"
import type { CSSProperties } from "react"

export const GLASS_NODE_RADIUS = "6px" as const
export const GLASS_PANEL_RADIUS = "16px" as const
export const FLOW_GRID_SIZE = 20 as const
export const NODE_HOVER_PAD_PX = 16 as const
export const HANDLE_HIDE_DELAY_MS = 500 as const

export type GlassTint =
  | "default"
  | "input"
  | "output"
  | "asm1"
  | "asm3"
  | "asmslim"
  | "cash"
  | "goal"
  | "traffic"

type GlassStyleOptions = {
  tint: GlassTint
  selected?: boolean
  hovered?: boolean
}

const GLASS_BG: Record<GlassTint, string> = {
  default: "var(--chakra-colors-glass-tint-default, hsla(258,60%,60%,0.45))",
  input: "var(--chakra-colors-glass-tint-input, hsla(30,70%,62%,0.45))",
  output: "var(--chakra-colors-glass-tint-output, hsla(210,72%,65%,0.45))",
  asm1: "var(--chakra-colors-glass-tint-asm1, hsla(143,58%,46%,0.45))",
  asm3: "var(--chakra-colors-glass-tint-asm3, hsla(224,64%,56%,0.45))",
  asmslim: "var(--chakra-colors-glass-tint-asmslim, hsla(142,54%,58%,0.45))",
  cash: "var(--chakra-colors-glass-tint-cash, hsla(158,58%,58%,0.45))",
  goal: "var(--chakra-colors-glass-tint-goal, hsla(38,78%,60%,0.45))",
  traffic: "var(--chakra-colors-glass-tint-traffic, hsla(158,58%,56%,0.45))",
}

const OUTLINE_COLORS: Record<GlassTint, string> = {
  default:
    "var(--chakra-colors-glass-outline-default, hsla(258, 60%, 60%, 0.7))",
  input: "var(--chakra-colors-glass-outline-input, hsla(30, 70%, 62%, 0.7))",
  output: "var(--chakra-colors-glass-outline-output, hsla(210, 72%, 65%, 0.7))",
  asm1: "var(--chakra-colors-glass-outline-asm1, hsla(143, 58%, 46%, 0.7))",
  asm3: "var(--chakra-colors-glass-outline-asm3, hsla(224, 64%, 56%, 0.7))",
  asmslim:
    "var(--chakra-colors-glass-outline-asmslim, hsla(142, 54%, 58%, 0.7))",
  cash: "var(--chakra-colors-glass-outline-cash, hsla(158, 58%, 58%, 0.7))",
  goal: "var(--chakra-colors-glass-outline-goal, hsla(38, 78%, 60%, 0.7))",
  traffic:
    "var(--chakra-colors-glass-outline-traffic, hsla(158, 58%, 56%, 0.7))",
}

const ACCENT_COLORS: Record<GlassTint, string> = {
  default:
    "var(--chakra-colors-glass-accent-default, hsla(258, 60%, 60%, 0.7))",
  input: "var(--chakra-colors-glass-accent-input, hsla(30, 80%, 60%, 0.7))",
  output: "var(--chakra-colors-glass-accent-output, hsla(210, 80%, 60%, 0.7))",
  asm1: "var(--chakra-colors-glass-accent-asm1, hsla(143, 60%, 40%, 0.7))",
  asm3: "var(--chakra-colors-glass-accent-asm3, hsla(224, 70%, 55%, 0.7))",
  asmslim:
    "var(--chakra-colors-glass-accent-asmslim, hsla(142, 65%, 50%, 0.7))",
  cash: "var(--chakra-colors-glass-accent-cash, hsla(158, 60%, 50%, 0.7))",
  goal: "var(--chakra-colors-glass-accent-goal, hsla(38, 80%, 55%, 0.75))",
  traffic:
    "var(--chakra-colors-glass-accent-traffic, hsla(158, 60%, 48%, 0.75))",
}

const HANDLE_COLORS: Record<GlassTint, string> = {
  default:
    "var(--chakra-colors-glass-handle-default, hsla(258, 60%, 60%, 0.9))",
  input: "var(--chakra-colors-glass-handle-input, hsla(30, 80%, 60%, 0.9))",
  output: "var(--chakra-colors-glass-handle-output, hsla(210, 80%, 60%, 0.9))",
  asm1: "var(--chakra-colors-glass-handle-asm1, hsla(143, 60%, 45%, 0.9))",
  asm3: "var(--chakra-colors-glass-handle-asm3, hsla(224, 70%, 55%, 0.9))",
  asmslim:
    "var(--chakra-colors-glass-handle-asmslim, hsla(142, 65%, 52%, 0.9))",
  cash: "var(--chakra-colors-glass-handle-cash, hsla(158, 60%, 52%, 0.9))",
  goal: "var(--chakra-colors-glass-handle-goal, hsla(38, 80%, 55%, 0.9))",
  traffic:
    "var(--chakra-colors-glass-handle-traffic, hsla(158, 60%, 50%, 0.9))",
}

const DESKTOP_BASE_SHADOW = [
  "inset -2px -2px 8px 2px rgba(255,255,255,0.65)",
  "inset 2px 2px 6px -2px rgba(0,0,0,0.10)",
  "-6px -6px 6px rgba(255,255,255,0.8)",
  "4px 4px 12px rgba(0,0,0,0.2)",
].join(", ")

const DESKTOP_HOVER_SHADOW = [
  "inset -2px -2px 8px 2px rgba(255,255,255,0.75)",
  "inset 2px 2px 6px -2px rgba(0,0,0,0.12)",
  "-6px -6px 16px rgba(255,255,255,0.8)",
  "6px 6px 18px rgba(0,0,0,0.18)",
].join(", ")

const MOBILE_BASE_SHADOW = [
  "inset 1px 1px 2px rgba(255,255,255,0.55)",
  "inset -2px -2px 4px rgba(0,0,0,0.06)",
  "-4px -4px 10px rgba(255,255,255,0.45)",
  "4px 4px 12px rgba(0,0,0,0.1)",
].join(", ")

const MOBILE_HOVER_SHADOW = [
  "inset 1px 1px 2px rgba(255,255,255,0.65)",
  "inset -2px -2px 4px rgba(0,0,0,0.08)",
  "-4px -4px 12px rgba(255,255,255,0.55)",
  "4px 4px 14px rgba(0,0,0,0.14)",
].join(", ")

const BLUR_VAR = "var(--chakra-colors-glass-blur, 8px)"
const MOBILE_BLUR = "6px"
const PANEL_BG = "var(--chakra-colors-glass-panel, hsla(0,0%,100%,0.72))"
const PANEL_BORDER = "var(--chakra-colors-glass-border, rgba(255,255,255,0.45))"

const HANDLE_SIZE = 8
const HANDLE_GAP = 1
const HANDLE_OFFSET = HANDLE_SIZE + HANDLE_GAP

export const getGlassNodeStyles = ({
  tint,
  selected = false,
  hovered = false,
}: GlassStyleOptions): SystemStyleObject => {
  const classicGlass =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic-glass",
      ) || ""
    ).trim() === "1"
  if (classicGlass) {
    const desktopShadow = hovered ? DESKTOP_HOVER_SHADOW : DESKTOP_BASE_SHADOW
    const mobileShadow = hovered ? MOBILE_HOVER_SHADOW : MOBILE_BASE_SHADOW
    return {
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "hsl(214.3 31.8% 91.4%)",
      borderRadius: GLASS_NODE_RADIUS,
      backgroundColor: GLASS_BG[tint] ?? "rgba(255,255,255,0.16)",
      color: "var(--chakra-colors-classic-text, currentColor)",
      boxShadow: { base: mobileShadow, md: desktopShadow },
      backdropFilter: { base: `blur(${MOBILE_BLUR})`, md: `blur(${BLUR_VAR})` },
      outlineStyle: "none",
      outlineWidth: "0px",
      outlineOffset: "0px",
      position: "relative",
      minWidth: `${FLOW_GRID_SIZE * 5}px`,
      minHeight: `${FLOW_GRID_SIZE * 2}px`,
      transition: "border-color 0.2s ease",
    }
  }
  const classic =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic",
      ) || ""
    ).trim() === "1"
  if (classic) {
    return {
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "hsl(214.3 31.8% 91.4%)",
      borderRadius: "3px",
      backgroundColor: "white",
      color: "var(--chakra-colors-classic-text, currentColor)",
      boxShadow: "none",
      backdropFilter: "none",
      outlineStyle: "none",
      outlineWidth: "0px",
      outlineOffset: "0px",
      position: "relative",
      minWidth: `${FLOW_GRID_SIZE * 5}px`,
      minHeight: `${FLOW_GRID_SIZE * 2}px`,
      transition: "border-color 0.2s ease",
    }
  }
  const desktopShadow = hovered ? DESKTOP_HOVER_SHADOW : DESKTOP_BASE_SHADOW
  const mobileShadow = hovered ? MOBILE_HOVER_SHADOW : MOBILE_BASE_SHADOW
  return {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "var(--chakra-colors-glass-border, rgba(255,255,255,0.4))",
    borderRadius: GLASS_NODE_RADIUS,
    backgroundColor: GLASS_BG[tint] ?? GLASS_BG.default,
    color: "text.primary",
    boxShadow: { base: mobileShadow, md: desktopShadow },
    backdropFilter: { base: `blur(${MOBILE_BLUR})`, md: `blur(${BLUR_VAR})` },
    outlineStyle: "solid",
    outlineColor: OUTLINE_COLORS[tint] ?? OUTLINE_COLORS.default,
    outlineWidth: selected ? "2px" : "0px",
    outlineOffset: selected ? "2px" : "0px",
    transition:
      "box-shadow 0.2s ease, outline-width 0.2s ease, outline-offset 0.2s ease, outline-color 0.2s ease",
    position: "relative",
    minWidth: `${FLOW_GRID_SIZE * 5}px`,
    minHeight: `${FLOW_GRID_SIZE * 2}px`,
  }
}

const getHandlePlacementStyles = (position: Position): CSSProperties => {
  switch (position) {
    case Position.Top:
      return {
        top: `-${HANDLE_OFFSET}px`,
        left: "50%",
        transform: "translateX(-50%)",
      }
    case Position.Bottom:
      return {
        top: `calc(100% + ${HANDLE_GAP}px)`,
        left: "50%",
        transform: "translateX(-50%)",
      }
    case Position.Left:
      return {
        left: `-${HANDLE_OFFSET}px`,
        top: "50%",
        transform: "translateY(-50%)",
      }
    case Position.Right:
      return {
        left: `calc(100% + ${HANDLE_GAP}px)`,
        top: "50%",
        transform: "translateY(-50%)",
      }
    default:
      return {
        transform: "translate(-50%, -50%)",
      }
  }
}

export const getHandleStyle = (
  tint: GlassTint,
  visible: boolean,
  position: Position,
): CSSProperties => {
  const classicGlass =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic-glass",
      ) || ""
    ).trim() === "1"
  if (classicGlass) {
    return {
      background: "var(--chakra-colors-classic-handle, hsl(215.4 16.3% 46.9%))",
      border: "1px solid hsl(0 0% 100%)",
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: "9999px",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.2s ease",
      boxShadow: "none",
      pointerEvents: visible ? "auto" : "none",
      ...getHandlePlacementStyles(position),
    }
  }
  const classic =
    (
      document.documentElement.style.getPropertyValue(
        "--chakra-glass-classic",
      ) || ""
    ).trim() === "1"
  if (classic) {
    return {
      background: "var(--chakra-colors-classic-handle, hsl(215.4 16.3% 46.9%))",
      border: "1px solid hsl(0 0% 100%)",
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: "9999px",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.2s ease",
      boxShadow: "none",
      pointerEvents: visible ? "auto" : "none",
      ...getHandlePlacementStyles(position),
    }
  }
  return {
    background: HANDLE_COLORS[tint] ?? HANDLE_COLORS.default,
    border: "1px solid rgba(255,255,255,0.85)",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: "9999px",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.2s ease",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    pointerEvents: visible ? "auto" : "none",
    ...getHandlePlacementStyles(position),
  }
}

export const getAccentColor = (tint: GlassTint): string =>
  ACCENT_COLORS[tint] ?? ACCENT_COLORS.default

export const getOutlineColor = (tint: GlassTint): string =>
  OUTLINE_COLORS[tint] ?? OUTLINE_COLORS.default
type GlassPanelOptions = {
  hovered?: boolean
}

export const getGlassPanelStyles = ({
  hovered = false,
}: GlassPanelOptions = {}): SystemStyleObject => ({
  backgroundColor: PANEL_BG,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: PANEL_BORDER,
  borderRadius: GLASS_PANEL_RADIUS,
  boxShadow: hovered ? DESKTOP_HOVER_SHADOW : DESKTOP_BASE_SHADOW,
  backdropFilter: `blur(${BLUR_VAR})`,
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
})

const NODE_TINT_MAP: Record<string, GlassTint> = {
  default: "default",
  input: "input",
  output: "output",
  asm1: "asm1",
  asm3: "asm3",
  asmslim: "asmslim",
  cashWallet: "cash",
  goalProgress: "goal",
  trafficStats: "traffic",
}

export const resolveTintFromNodeType = (type?: string): GlassTint => {
  if (!type) return "default"
  return NODE_TINT_MAP[type] ?? "default"
}
