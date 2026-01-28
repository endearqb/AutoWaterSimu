import type { IconType } from "react-icons"
import {
  FaBook,
  FaBullhorn,
  FaCalculator,
  FaChartLine,
  FaFileAlt,
  FaFlask,
  FaProjectDiagram,
  FaQuestionCircle,
  FaTrash,
  FaUserPlus,
} from "react-icons/fa"

export type CalculatorId = "lsi" | "standardAO" | "aor" | "dwa"

export type NavLink = {
  label: string
  to: string
}

export type DesktopIconWindowTarget =
  | { kind: "posthog" | "home" }
  | { kind: "calculator"; id: CalculatorId }
  | { kind: "url"; title: string; url: string }

export type DesktopIconLink = {
  label: string
  icon: IconType
  window?: DesktopIconWindowTarget
  disabled?: boolean
}

export const topNavLinks: NavLink[] = [
  { label: "Product OS", to: "/openflow" },
  { label: "Pricing", to: "/calculators" },
  { label: "Docs", to: "/knowledge" },
  { label: "Community", to: "/updates" },
  { label: "Company", to: "/showcase" },
]

// Layout rule (2 columns):
// Row 1: home + docs
// Row 2-3: calculators
export const desktopIconsLeft: DesktopIconLink[] = [
  { label: "home.mdx", icon: FaFileAlt, window: { kind: "home" } },
  { label: "Docs", icon: FaBook, window: { kind: "url", title: "Docs", url: "/docs" } },
  { label: "LSI Calc", icon: FaCalculator, window: { kind: "calculator", id: "lsi" } },
  { label: "AO 设计", icon: FaCalculator, window: { kind: "calculator", id: "standardAO" } },
  { label: "AOR Calc", icon: FaCalculator, window: { kind: "calculator", id: "aor" } },
  { label: "DWA A/O", icon: FaCalculator, window: { kind: "calculator", id: "dwa" } },
  {
    label: "OpenFlow",
    icon: FaProjectDiagram,
    window: { kind: "url", title: "OpenFlow", url: "/openflow" },
  },
  { label: "Demo.mov", icon: FaFlask, window: { kind: "url", title: "Demo", url: "/canvas-home" } },
  {
    label: "AI DeepReseach",
    icon: FaQuestionCircle,
    window: { kind: "url", title: "AI DeepReseach", url: "/ai-deep-research" },
  },
  { label: "Sign up", icon: FaUserPlus, window: { kind: "url", title: "Sign up", url: "/signup" } },
]

export const desktopIconsRight: DesktopIconLink[] = [
  {
    label: "Why ENVDAMA?",
    icon: FaBullhorn,
    window: { kind: "url", title: "Why ENVDAMA?", url: "/showcase" },
  },
  {
    label: "Changelog",
    icon: FaChartLine,
    window: { kind: "url", title: "Changelog", url: "/updates" },
  },
  { label: "Trash", icon: FaTrash, disabled: true },
]
