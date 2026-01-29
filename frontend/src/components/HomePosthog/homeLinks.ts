export type CalculatorId = "lsi" | "standardAO" | "aor" | "dwa"
export type CaseId = "asm1" | "asm1slim" | "material-zld" | "material-multi"

export type NavLink = {
  label: string
  to: string
}

export type DesktopIconWindowTarget =
  | { kind: "posthog" | "home" }
  | { kind: "case"; id: CaseId }
  | { kind: "flowDocs" }
  | { kind: "calculator"; id: CalculatorId }
  | { kind: "url"; title: string; url: string }

export type DesktopIconLink = {
  id: string
  labelKey?: string
  label?: string
  iconSrc: string
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

export const desktopIconsLeft: DesktopIconLink[] = [
  { id: "home", labelKey: "posthogDemo.desktop.home", label: "home", iconSrc: "/assets/icons/01_home.png", window: { kind: "home" } },
  {
    id: "docs",
    labelKey: "posthogDemo.desktop.docs",
    label: "Docs",
    iconSrc: "/assets/icons/02_docs.png",
    window: { kind: "url", title: "Docs", url: "/docs" },
  },
  { id: "lsi", labelKey: "posthogDemo.desktop.lsiCalc", label: "LSI Calc", iconSrc: "/assets/icons/03_lsi_calc.png", window: { kind: "calculator", id: "lsi" } },
  {
    label: "AO 设计",
    id: "standardAO",
    labelKey: "posthogDemo.desktop.aoDesign",
    iconSrc: "/assets/icons/04_ao_design.png",
    window: { kind: "calculator", id: "standardAO" },
  },
  { id: "aor", labelKey: "posthogDemo.desktop.aorCalc", label: "AOR Calc", iconSrc: "/assets/icons/05_aor_calc.png", window: { kind: "calculator", id: "aor" } },
  { id: "dwa", labelKey: "posthogDemo.desktop.dwaAo", label: "DWA A/O", iconSrc: "/assets/icons/06_dwa_ao.png", window: { kind: "calculator", id: "dwa" } },
  {
    label: "OpenFlow",
    id: "openflow",
    labelKey: "posthogDemo.desktop.openflow",
    iconSrc: "/assets/icons/08_openflow.png",
    window: { kind: "url", title: "OpenFlow", url: "/openflow" },
  },
  {
    label: "Flow Components",
    id: "flow-components",
    labelKey: "posthogDemo.desktop.flowComponents",
    iconSrc: "/assets/icons/09_flow_components.png",
    window: { kind: "flowDocs" },
  },
  { id: "asm1", labelKey: "posthogDemo.desktop.asm1Sst", label: "ASM1-SST", iconSrc: "/assets/icons/10_asm1_sst.png", window: { kind: "case", id: "asm1" } },
  { id: "asm1slim", labelKey: "posthogDemo.desktop.asm1slim", label: "asm1slim", iconSrc: "/assets/icons/11_asm1slim.png", window: { kind: "case", id: "asm1slim" } },
  { id: "material-zld", labelKey: "posthogDemo.desktop.zld", label: "ZLD", iconSrc: "/assets/icons/12_zld.png", window: { kind: "case", id: "material-zld" } },
  { id: "material-multi", labelKey: "posthogDemo.desktop.multiFlow", label: "multi-flow", iconSrc: "/assets/icons/13_multi_flow.png", window: { kind: "case", id: "material-multi" } },
  {
    label: "AI DeepResearch",
    id: "ai-deep-research",
    labelKey: "posthogDemo.desktop.aiDeepResearch",
    iconSrc: "/assets/icons/15_ai_deepresearch.png",
    window: { kind: "url", title: "AI DeepResearch", url: "/ai-deep-research" },
  },
  {
    label: "Sign up",
    id: "sign-up",
    labelKey: "posthogDemo.desktop.signUp",
    iconSrc: "/assets/icons/16_sign_up.png",
    window: { kind: "url", title: "Sign up", url: "/signup" },
  },
]

export const desktopIconsRight: DesktopIconLink[] = [
  {
    label: "Why ENVDAMA?",
    id: "why-envdama",
    labelKey: "posthogDemo.desktop.whyEnvdama",
    iconSrc: "/assets/icons/07_why_envdama.png",
    window: { kind: "url", title: "Sign in", url: "/login" },
  },
  {
    label: "Changelog",
    id: "changelog",
    labelKey: "posthogDemo.desktop.changelog",
    iconSrc: "/assets/icons/14_changelog.png",
    window: { kind: "url", title: "Changelog", url: "/updates" },
  },
  { id: "trash", labelKey: "posthogDemo.desktop.trash", label: "Trash", iconSrc: "/assets/icons/21_trash.png", disabled: true },
]
