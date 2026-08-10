import {
  Field,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"

import {
  type SecondaryClarifierV2Config,
  createDefaultSecondaryClarifierV2Config,
} from "../composite/secondaryClarifierV2Defaults"
import { formatUdmV2Message, useUdmV2Messages } from "../i18n"
import type { NetworkV2NodeData } from "../nodes/nodeTypes"

type SecondaryClarifierV2ConfigPanelProps = {
  config?: SecondaryClarifierV2Config
  onPatch: (patch: Partial<NetworkV2NodeData>) => void
}

const takacsFields: Array<keyof SecondaryClarifierV2Config["takacs"]> = [
  "v0_m_per_day",
  "v0_max_m_per_day",
  "r_h",
  "r_p",
  "f_ns",
  "x_tss_threshold",
]

export function SecondaryClarifierV2ConfigPanel({
  config,
  onPatch,
}: SecondaryClarifierV2ConfigPanelProps) {
  const text = useUdmV2Messages()
  const fallbackConfig = useMemo(createDefaultSecondaryClarifierV2Config, [])
  const current = config || fallbackConfig
  const [feedText, setFeedText] = useState("")
  const [feedError, setFeedError] = useState("")

  useEffect(() => {
    setFeedText(JSON.stringify(current.feed_composition, null, 2))
    setFeedError("")
  }, [current.feed_composition])

  const update = (next: SecondaryClarifierV2Config) => {
    onPatch({
      composite: next,
      volume_m3: next.area_m2 * next.height_m,
    })
  }

  const updateNumber = (
    key: "area_m2" | "height_m" | "feed_layer",
    value: string,
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return
    }
    update({ ...current, [key]: parsed })
  }

  const updateTakacs = (
    key: keyof SecondaryClarifierV2Config["takacs"],
    value: string,
  ) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return
    }
    update({ ...current, takacs: { ...current.takacs, [key]: parsed } })
  }

  const commitFeedComposition = () => {
    try {
      const parsed = JSON.parse(feedText)
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(text.expectedObject)
      }
      const feedComposition = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => {
          const numberValue = Number(value)
          if (!Number.isFinite(numberValue)) {
            throw new Error(formatUdmV2Message(text.expectedNumeric, { key }))
          }
          return [key, numberValue]
        }),
      )
      update({ ...current, feed_composition: feedComposition })
      setFeedError("")
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : text.invalidJson)
    }
  }

  return (
    <Stack gap={3} borderTopWidth="1px" borderColor="border" pt={4}>
      <Text fontSize="sm" fontWeight="700">
        {text.fields.clarifierComposite}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {text.fields.clarifierReferenceNotice}
      </Text>

      <Field.Root>
        <Field.Label>{text.fields.profile}</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={current.profile}
            onChange={(event) =>
              update({
                ...current,
                profile: event.target
                  .value as SecondaryClarifierV2Config["profile"],
              })
            }
          >
            <option value="reference">reference</option>
            <option value="reactive_pending">reactive_pending</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>

      <HStack gap={3} align="flex-start">
        <Field.Root>
          <Field.Label>{text.fields.area}</Field.Label>
          <Input
            type="number"
            value={current.area_m2}
            onChange={(event) => updateNumber("area_m2", event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>{text.fields.height}</Field.Label>
          <Input
            type="number"
            value={current.height_m}
            onChange={(event) => updateNumber("height_m", event.target.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>{text.fields.feedLayer}</Field.Label>
          <Input
            type="number"
            min={2}
            max={9}
            value={current.feed_layer}
            onChange={(event) => updateNumber("feed_layer", event.target.value)}
          />
        </Field.Root>
      </HStack>

      <Stack gap={2}>
        <Text fontSize="xs" fontWeight="700">
          Takacs
        </Text>
        {takacsFields.map((key) => (
          <Field.Root key={key}>
            <Field.Label>{key}</Field.Label>
            <Input
              type="number"
              value={current.takacs[key] ?? ""}
              onChange={(event) => updateTakacs(key, event.target.value)}
            />
          </Field.Root>
        ))}
      </Stack>

      <Field.Root invalid={!!feedError}>
        <Field.Label>{text.fields.feedComposition}</Field.Label>
        <Textarea
          value={feedText}
          onChange={(event) => setFeedText(event.target.value)}
          onBlur={commitFeedComposition}
          fontFamily="mono"
          minH="150px"
        />
        {feedError && <Field.ErrorText>{feedError}</Field.ErrorText>}
      </Field.Root>
    </Stack>
  )
}
