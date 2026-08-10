import {
  Field,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Textarea,
} from "@chakra-ui/react"
import type { Node } from "@xyflow/react"
import { useEffect, useState } from "react"

import { useUdmV2Messages } from "../i18n"
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
  const text = useUdmV2Messages()
  const [initialText, setInitialText] = useState("")
  const [parameterText, setParameterText] = useState("")
  const [initialError, setInitialError] = useState("")
  const [parameterError, setParameterError] = useState("")

  useEffect(() => {
    setInitialText(JSON.stringify(node.data.initial_conditions, null, 2))
    setParameterText(JSON.stringify(node.data.parameter_binding, null, 2))
    setInitialError("")
    setParameterError("")
  }, [node.data.initial_conditions, node.data.parameter_binding])

  const commitJson = (
    value: string,
    key: "initial_conditions" | "parameter_binding",
    setError: (message: string) => void,
  ) => {
    try {
      const parsed = JSON.parse(value)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(text.expectedObject)
      }
      onPatch({ [key]: parsed as Record<string, number> })
      setError("")
    } catch (error) {
      setError(error instanceof Error ? error.message : text.invalidJson)
    }
  }

  return (
    <Stack gap={3}>
      <Field.Root>
        <Field.Label>{text.fields.label}</Field.Label>
        <Input
          value={node.data.label}
          onChange={(event) => onPatch({ label: event.target.value })}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>{text.fields.componentSchema}</Field.Label>
        <Input
          value={node.data.component_schema_id}
          onChange={(event) =>
            onPatch({ component_schema_id: event.target.value })
          }
        />
      </Field.Root>

      <HStack gap={3} align="flex-start">
        <Field.Root>
          <Field.Label>{text.fields.modelKind}</Field.Label>
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
          <Field.Label>{text.fields.reaction}</Field.Label>
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
              <option value="false">{text.fields.disabled}</option>
              <option value="true">{text.fields.enabled}</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
      </HStack>

      <Field.Root invalid={!!initialError}>
        <Field.Label>{text.fields.initialConditions}</Field.Label>
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
        <Field.Label>{text.fields.parameterBinding}</Field.Label>
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
