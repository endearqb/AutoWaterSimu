import { Field, HStack, Input, Stack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { diagnosticMatchesField } from "../serialize/diagnosticsMapping"
import type { NetworkV2Diagnostic } from "../serialize/semanticValidation"

type HydraulicV2FieldsProps = {
  edge: Edge<NetworkV2EdgeData>
  diagnostics: NetworkV2Diagnostic[]
  onPatch: (patch: Partial<NetworkV2EdgeData>) => void
}

export function HydraulicV2Fields({
  edge,
  diagnostics,
  onPatch,
}: HydraulicV2FieldsProps) {
  const flowSpec = edge.data?.flow_spec || {
    mode: "fixed",
    value: 0,
    unit: "m3/d",
  }
  const policy = edge.data?.component_policy || {
    mode: "all",
    include: [],
    exclude: [],
  }
  const flowError = diagnostics.find((diagnostic) =>
    diagnosticMatchesField(diagnostic, "flow_spec", edge.id),
  )?.message
  const policyError = diagnostics.find((diagnostic) =>
    diagnosticMatchesField(diagnostic, "component_policy.include", edge.id),
  )?.message

  return (
    <Stack gap={3}>
      <Field.Root invalid={!!flowError}>
        <Field.Label>Hydraulic flow mode</Field.Label>
        <Input
          value={flowSpec.mode}
          onChange={(event) =>
            onPatch({
              flow_spec: { ...flowSpec, mode: event.target.value as any },
            })
          }
        />
        {flowError && <Field.ErrorText>{flowError}</Field.ErrorText>}
      </Field.Root>

      <HStack gap={3}>
        <Field.Root>
          <Field.Label>Flow value</Field.Label>
          <Input
            type="number"
            value={flowSpec.value ?? 0}
            onChange={(event) =>
              onPatch({
                flow_spec: {
                  ...flowSpec,
                  value: Number.parseFloat(event.target.value) || 0,
                },
              })
            }
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>Unit</Field.Label>
          <Input
            value={flowSpec.unit || "m3/d"}
            onChange={(event) =>
              onPatch({ flow_spec: { ...flowSpec, unit: event.target.value } })
            }
          />
        </Field.Root>
      </HStack>

      <Field.Root invalid={!!policyError}>
        <Field.Label>Component include</Field.Label>
        <Input
          value={policy.include.join(", ")}
          onChange={(event) =>
            onPatch({
              component_policy: {
                ...policy,
                mode: event.target.value.trim() ? "include" : "all",
                include: splitList(event.target.value),
              },
            })
          }
        />
        {policyError && <Field.ErrorText>{policyError}</Field.ErrorText>}
      </Field.Root>
    </Stack>
  )
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}
