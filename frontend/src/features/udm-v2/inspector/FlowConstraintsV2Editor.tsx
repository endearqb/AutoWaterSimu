import { Button, Field, HStack, Stack, Textarea } from "@chakra-ui/react"
import { useEffect, useState } from "react"

import type { NetworkV2FlowConstraint } from "../serialize/semanticValidation"

type FlowConstraintsV2EditorProps = {
  constraints: NetworkV2FlowConstraint[]
  onChange: (constraints: NetworkV2FlowConstraint[]) => void
  onValidate: () => void
}

export function FlowConstraintsV2Editor({
  constraints,
  onChange,
  onValidate,
}: FlowConstraintsV2EditorProps) {
  const [text, setText] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setText(JSON.stringify(constraints, null, 2))
    setError("")
  }, [constraints])

  const commit = () => {
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) {
        throw new Error("Expected an array")
      }
      onChange(parsed as NetworkV2FlowConstraint[])
      setError("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invalid JSON")
    }
  }

  return (
    <Stack gap={3}>
      <Field.Root invalid={!!error}>
        <Field.Label>Flow constraints</Field.Label>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          fontFamily="mono"
          minH="120px"
        />
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
      </Field.Root>
      <HStack justify="flex-end">
        <Button size="sm" variant="outline" onClick={commit}>
          Apply
        </Button>
        <Button size="sm" colorPalette="blue" onClick={onValidate}>
          Validate
        </Button>
      </HStack>
    </Stack>
  )
}
