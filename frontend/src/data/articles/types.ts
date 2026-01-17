export interface ArticleData {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  content: {
    sections: ArticleSection[]
    charts?: ChartConfig[]
    interactiveElements?: InteractiveElement[]
  }
  metadata: {
    publishDate?: string
  }
  concepts?: ConceptCard[]
}

export interface ArticleSection {
  id: string
  title: string
  content: string
  type:
    | "text"
    | "chart"
    | "interactive"
    | "process-flow"
    | "concept-cards"
    | "process"
    | "roadmap"
  data?: any
  interactiveElements?: InteractiveElement[]
  chartConfig?: ChartConfig
  processSteps?: ProcessStep[]
  roadmapPhases?: RoadmapPhase[]
}

export interface ChartConfig {
  id: string
  type: "line" | "bar" | "radar" | "doughnut" | "scatter"
  title: string
  data: any
  options?: any
  interactive?: boolean
}

export interface InteractiveElement {
  id?: string
  type:
    | "slider"
    | "toggle"
    | "button-group"
    | "checklist"
    | "process-diagram"
    | "energy-optimizer"
    | "prediction-engine"
  config: any
  onInteraction?: (value: any) => void
}

export interface ProcessStep {
  id: string
  title: string
  description: string
  icon?: string
  color?: string
  position?: { x: number; y: number }
  connections?: string[]
  status?: "completed" | "current" | "pending"
}

export interface ConceptCard {
  id: string
  title: string
  content: string
  category: string
  formula?: string
}

export interface RoadmapPhase {
  phase: string
  title: string
  duration: string
  tasks: string[]
}
