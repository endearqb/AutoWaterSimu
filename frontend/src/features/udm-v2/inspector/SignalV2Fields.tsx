import { Field, Input, Stack } from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"

import type { NetworkV2EdgeData } from "../edges/edgeModel"
import { diagnosticMatchesField } from "../serialize/diagnosticsMapping"
import type { NetworkV2Diagnostic } from "../serialize/semanticValidation"

type SignalV2FieldsProps = {
  edge: Edge<NetworkV2EdgeData>
  diagnostics: NetworkV2Diagnostic[]
  onPatch: (patch: Partial<NetworkV2EdgeData>) => void
}

export function SignalV2Fields({
  edge,
  diagnostics,
  onPatch,
}: SignalV2FieldsProps) {
  const signalSpec = edge.data?.signal_spec || {
    signal_name: "signal",
    source_expression: "",
    target_binding: "",
  }
  const flowError = diagnostics.find((diagnostic) =>
    diagnosticMatchesField(diagnostic, "flow_spec", edge.id),
  )?.message
  const transportError = diagnostics.find((diagnostic) =>
    diagnosticMatchesField(diagnostic, "transport_model", edge.id),
  )?.message

  return (
    <Stack gap={3}>
      <Field.Root invalid={!!flowError || !!transportError}>
        <Field.Label>Signal name</Field.Label>
        <Input
          value={signalSpec.signal_name}
          onChange={(event) =>
            onPatch({
              signal_spec: { ...signalSpec, signal_name: event.target.value },
            })
          }
        />
        {flowError && <Field.ErrorText>{flowError}</Field.ErrorText>}
        {transportError && <Field.ErrorText>{transportError}</Field.ErrorText>}
      </Field.Root>

      <Field.Root>
        <Field.Label>Source expression</Field.Label>
        <Input
          value={signalSpec.source_expression || ""}
          onChange={(event) =>
            onPatch({
              signal_spec: {
                ...signalSpec,
                source_expression: event.target.value,
              },
            })
          }
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Target binding</Field.Label>
        <Input
          value={signalSpec.target_binding || ""}
          onChange={(event) =>
            onPatch({
              signal_spec: {
                ...signalSpec,
                target_binding: event.target.value,
              },
            })
          }
        />
      </Field.Root>
    </Stack>
  )
}
