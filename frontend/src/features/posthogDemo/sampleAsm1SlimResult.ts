import type { ASM1SlimResultData } from "@/components/Flow/legacy-analysis/asm1slim-analysis"

const timestamps = Array.from({ length: 24 }, (_, i) => i)

const ramp = (start: number, end: number) =>
  timestamps.map((t) => start + ((end - start) * t) / (timestamps.length - 1))

export const SAMPLE_ASM1SLIM_RESULT: ASM1SlimResultData = {
  timestamps,
  node_data: {
    A1: {
      label: "A1",
      dissolvedOxygen: ramp(0.2, 1.8),
      cod: ramp(180, 60),
      nitrate: ramp(2, 8),
      ammonia: ramp(22, 4),
      totalAlkalinity: ramp(6.5, 5.8),
      volume: ramp(1000, 1000),
    },
    A2: {
      label: "A2",
      dissolvedOxygen: ramp(0.4, 2.0),
      cod: ramp(160, 55),
      nitrate: ramp(3, 9),
      ammonia: ramp(18, 3),
      totalAlkalinity: ramp(6.2, 5.7),
      volume: ramp(1000, 1000),
    },
    O1: {
      label: "O1",
      dissolvedOxygen: ramp(1.2, 3.0),
      cod: ramp(120, 40),
      nitrate: ramp(6, 12),
      ammonia: ramp(10, 1.2),
      totalAlkalinity: ramp(6.0, 5.6),
      volume: ramp(1000, 1000),
    },
  },
  summary: {
    total_steps: timestamps.length,
    convergence_status: "ok",
  },
}

