import { Field, HStack, Input, Stack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"
import type { NetworkV2Diagnostic } from "../serialize/semanticValidation"
import { HydraulicV2Fields } from "./HydraulicV2Fields"

type PumpV2FieldsProps = {
  edge: Edge<NetworkV2EdgeData>
  diagnostics: NetworkV2Diagnostic[]
  onPatch: (patch: Partial<NetworkV2EdgeData>) => void
}

export function PumpV2Fields({
  edge,
  diagnostics,
  onPatch,
}: PumpV2FieldsProps) {
  const pump = edge.data?.pump || {
    head_m: 2,
    efficiency: 0.75,
    energy_enabled: true,
  }

  return (
    <Stack gap={3}>
      <HydraulicV2Fields
        edge={edge}
        diagnostics={diagnostics}
        onPatch={onPatch}
      />
      <HStack gap={3}>
        <Field.Root>
          <Field.Label>Pump head m</Field.Label>
          <Input
            type="number"
            value={pump.head_m ?? 0}
            onChange={(event) =>
              onPatch({
                pump: {
                  ...pump,
                  head_m: Number.parseFloat(event.target.value) || 0,
                },
              })
            }
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Efficiency</Field.Label>
          <Input
            type="number"
            value={pump.efficiency ?? 0}
            onChange={(event) =>
              onPatch({
                pump: {
                  ...pump,
                  efficiency: Number.parseFloat(event.target.value) || 0,
                },
              })
            }
          />
        </Field.Root>
      </HStack>
    </Stack>
  )
}
