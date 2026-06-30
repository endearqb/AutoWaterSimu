import { Field, HStack, Input, NativeSelect, Stack, Textarea } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import type { Node } from "@xyflow/react"

import type { NetworkV2NodeData } from "../nodes/nodeTypes"

type NodeSchemaV2EditorProps = {
  node: Node<NetworkV2NodeData>
  onPatch: (patch: Partial<NetworkV2NodeData>) => void
}

const modelKinds: Array<NetworkV2NodeData["model_binding"]["model_kind"]> = [
  "passive",
  "udm",
  "asm1",
  "asm1slim",
  "asm3",
  "controller",
]

export function NodeSchemaV2Editor({ node, onPatch }: NodeSchemaV2EditorProps) {
  const [initialText, setInitialText] = useState("")
  const [parameterText, setParameterText] = useState("")
  const [initialError, setInitialError] = useState("")
  const [parameterError, setParameterError] = useState("")

  useEffect(() => {
    setInitialText(JSON.stringify(node.data.initial_conditions, null, 2))
    setParameterText(JSON.stringify(node.data.parameter_binding, null, 2))
    setInitialError("")
    setParameterError("")
  }, [node.id, node.data.initial_conditions, node.data.parameter_binding])

  const commitJson = (
    value: string,
    key: "initial_conditions" | "parameter_binding",
    setError: (message: string) => void,
  ) => {
    try {
      const parsed = JSON.parse(value)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected an object")
      }
      onPatch({ [key]: parsed as Record<string, number> })
      setError("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid JSON")
    }
  }

  return (
    <Stack gap={3}>
      <Field.Root>
        <Field.Label>Label</Field.Label>
        <Input
          value={node.data.label}
          onChange={(event) => onPatch({ label: event.target.value })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>Component schema</Field.Label>
        <Input
          value={node.data.component_schema_id}
          onChange={(event) =>
            onPatch({ component_schema_id: event.target.value })
          }
        />
      </Field.Root>

      <HStack gap={3} align="flex-start">
        <Field.Root>
          <Field.Label>Model kind</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={node.data.model_binding.model_kind}
              onChange={(event) =>
                onPatch({
                  model_binding: {
                    ...node.data.model_binding,
                    model_kind: event.target
                      .value as NetworkV2NodeData["model_binding"]["model_kind"],
                  },
                })
              }
            >
              {modelKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Reaction</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field
              value={String(node.data.model_binding.reaction_enabled)}
              onChange={(event) =>
                onPatch({
                  model_binding: {
                    ...node.data.model_binding,
                    reaction_enabled: event.target.value === "true",
                  },
                })
              }
            >
              <option value="false">disabled</option>
              <option value="true">enabled</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </HStack>

      <Field.Root invalid={!!initialError}>
        <Field.Label>Initial conditions</Field.Label>
        <Textarea
          value={initialText}
          onChange={(event) => setInitialText(event.target.value)}
          onBlur={() =>
            commitJson(initialText, "initial_conditions", setInitialError)
          }
          fontFamily="mono"
          minH="110px"
        />
        {initialError && <Field.ErrorText>{initialError}</Field.ErrorText>}
      </Field.Root>

      <Field.Root invalid={!!parameterError}>
        <Field.Label>Parameter binding</Field.Label>
        <Textarea
          value={parameterText}
          onChange={(event) => setParameterText(event.target.value)}
          onBlur={() =>
            commitJson(parameterText, "parameter_binding", setParameterError)
          }
          fontFamily="mono"
          minH="90px"
        />
        {parameterError && <Field.ErrorText>{parameterError}</Field.ErrorText>}
      </Field.Root>
    </Stack>
  )
}
