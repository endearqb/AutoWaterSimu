export type CaseSpec = {
  id: string
  titleKey: string
  subtitle: string
  jsonUrl: string
  downloadFilename: string
  openUrl: string
}

export const POSTHOG_DEMO_CASES: CaseSpec[] = [
  {
    id: "asm1",
    titleKey: "posthogDemo.cases.asm1",
    subtitle: "ASM1-SST.json",
    jsonUrl: "/assets/json/ASM1-SST.json",
    downloadFilename: "ASM1-SST.json",
    openUrl: "/asm1",
  },
  {
    id: "asm1slim",
    titleKey: "posthogDemo.cases.asm1slim",
    subtitle: "asm1slim.json",
    jsonUrl: "/assets/json/asm1slim.json",
    downloadFilename: "asm1slim.json",
    openUrl: "/asm1slim",
  },
  {
    id: "material-zld",
    titleKey: "posthogDemo.cases.materialZld",
    subtitle: "ZLD.json",
    jsonUrl: "/assets/json/ZLD.json",
    downloadFilename: "ZLD.json",
    openUrl: "/materialbalance",
  },
  {
    id: "material-multi",
    titleKey: "posthogDemo.cases.materialMulti",
    subtitle: "multi-flow.json",
    jsonUrl: "/assets/json/multi-flow.json",
    downloadFilename: "multi-flow.json",
    openUrl: "/materialbalance",
  },
]
