export type CaseSpec = {
  id: string
  title: string
  subtitle: string
  jsonUrl: string
  downloadFilename: string
  openUrl: string
}

export const CANVAS_HOME_CASES: CaseSpec[] = [
  {
    id: "asm1",
    title: "ASM1 模型案例",
    subtitle: "ASM1-SST.json",
    jsonUrl: "/assets/json/ASM1-SST.json",
    downloadFilename: "ASM1-SST.json",
    openUrl: "/asm1",
  },
  {
    id: "asm1slim",
    title: "ASM1Slim 模型案例",
    subtitle: "asm1slim.json",
    jsonUrl: "/assets/json/asm1slim.json",
    downloadFilename: "asm1slim.json",
    openUrl: "/asm1slim",
  },
  {
    id: "material-zld",
    title: "物料平衡案例",
    subtitle: "ZLD.json",
    jsonUrl: "/assets/json/ZLD.json",
    downloadFilename: "ZLD.json",
    openUrl: "/materialbalance",
  },
  {
    id: "material-multi",
    title: "物料平衡案例",
    subtitle: "multi-flow.json",
    jsonUrl: "/assets/json/multi-flow.json",
    downloadFilename: "multi-flow.json",
    openUrl: "/materialbalance",
  },
]
