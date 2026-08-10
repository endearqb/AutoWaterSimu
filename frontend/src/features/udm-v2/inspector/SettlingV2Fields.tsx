import { Field, HStack, Input, Stack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { useUdmV2Messages } from "../i18n"
import { diagnosticMatchesField } from "../serialize/diagnosticsMapping"
import type { NetworkV2Diagnostic } from "../serialize/semanticValidation"

type SettlingV2FieldsProps = {
  edge: Edge<NetworkV2EdgeData>
  diagnostics: NetworkV2Diagnostic[]
  onPatch: (patch: Partial<NetworkV2EdgeData>) => void
}

export function SettlingV2Fields({
  edge,
  diagnostics,
  onPatch,
}: SettlingV2FieldsProps) {
  const text = useUdmV2Messages()
  const transport = edge.data?.transport_model || {
    model_id: "takacs_settling.v1",
    parameters: {},
  }
  const parameters = transport.parameters || {}
  const flowError = diagnostics.find((diagnostic) =>
    diagnosticMatchesField(diagnostic, "flow_spec", edge.id),
  )?.message

  return (
    <Stack gap={3}>
      <Field.Root invalid={!!flowError}>
        <Field.Label>{text.fields.settlingTransportModel}</Field.Label>
        <Input
          value={transport.model_id}
          onChange={(event) =>
            onPatch({
              transport_model: { ...transport, model_id: event.target.value },
            })
          }
        />
        {flowError && <Field.ErrorText>{flowError}</Field.ErrorText>}
      </Field.Root>

      <HStack gap={3}>
        <Field.Root>
          <Field.Label>{text.fields.area}</Field.Label>
          <Input
            type="number"
            value={String(parameters.area_m2 ?? 1500)}
            onChange={(event) =>
              onPatch({
                transport_model: {
                  ...transport,
                  parameters: {
                    ...parameters,
                    area_m2: Number.parseFloat(event.target.value) || 0,
                  },
                },
              })
            }
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>{text.fields.settlingVelocity}</Field.Label>
          <Input
            type="number"
            value={String(parameters.v0_m_per_day ?? 250)}
            onChange={(event) =>
              onPatch({
                transport_model: {
                  ...transport,
                  parameters: {
                    ...parameters,
                    v0_m_per_day: Number.parseFloat(event.target.value) || 0,
                  },
                },
              })
            }
          />
        </Field.Root>
      </HStack>
    </Stack>
  )
}
