import {
  Box,
  Field,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
} from "@chakra-ui/react"
import type { Edge } from "@xyflow/react"
import {
  NETWORK_EDGE_KIND_OPTIONS,
  createNetworkEdgeKindPatch,
  normalizeNetworkEdgeKind,
  type NetworkEdgeKind,
} from "../../../types/networkEdges"

type NetworkEdgeInspectorFieldsProps = {
  edge: Edge
  flowError?: string
  flowValue?: string | number
  labelWidth?: string
  onFlowChange: (value: string) => void
  onPatch: (key: string, value: unknown) => void
}

const flowModes = [
  "fixed",
  "balanced",
  "split_fraction",
  "ratio_to_edge",
  "residual",
  "controlled",
  "timeseries",
]

const toPlainObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const numberValue = (value: unknown): string =>
  value === undefined || value === null ? "" : String(value)

const parseNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

function NetworkEdgeInspectorFields({
  edge,
  flowError,
  flowValue,
  labelWidth = "88px",
  onFlowChange,
  onPatch,
}: NetworkEdgeInspectorFieldsProps) {
  const data = toPlainObject(edge.data)
  const edgeKind = normalizeNetworkEdgeKind(data.edge_kind)
  const componentPolicy = toPlainObject(data.component_policy)
  const flowSpec = toPlainObject(data.flow_spec)
  const pump = toPlainObject(data.pump)
  const transportModel = toPlainObject(data.transport_model)
  const transportParameters = toPlainObject(transportModel.parameters)
  const signalSpec = toPlainObject(data.signal_spec)
  const canCarryFlow = edgeKind === "hydraulic" || edgeKind === "pump"

  const patchObject = (
    key: string,
    patch: Record<string, unknown>,
    current: Record<string, unknown>,
  ) => {
    onPatch(key, {
      ...current,
      ...patch,
    })
  }

  const handleKindChange = (kind: NetworkEdgeKind) => {
    const patch = createNetworkEdgeKindPatch(kind, data)
    Object.entries(patch).forEach(([key, value]) => onPatch(key, value))
  }

  const handleFlowChange = (value: string) => {
    onFlowChange(value)
    const parsed = parseNumber(value)
    patchObject("flow_spec", { value: parsed }, flowSpec)
  }

  const handleComponentListChange = (
    key: "include" | "exclude",
    value: string,
  ) => {
    patchObject(
      "component_policy",
      {
        [key]: parseList(value),
      },
      componentPolicy,
    )
  }

  const patchTransportParameter = (key: string, value: string) => {
    patchObject(
      "transport_model",
      {
        parameters: {
          ...transportParameters,
          [key]: parseNumber(value),
        },
      },
      transportModel,
    )
  }

  return (
    <Stack gap={3} align="stretch">
      <Field.Root>
        <HStack align="flex-start" gap={4}>
          <Field.Label minW={labelWidth} pt={2}>
            Edge kind
          </Field.Label>
          <Box flex={1}>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={edgeKind}
                onChange={(event) =>
                  handleKindChange(
                    normalizeNetworkEdgeKind(event.target.value),
                  )
                }
              >
                {NETWORK_EDGE_KIND_OPTIONS.map((option) => (
                  <option key={option.kind} value={option.kind}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <Text mt={1} fontSize="xs" color="gray.500">
              {
                NETWORK_EDGE_KIND_OPTIONS.find(
                  (option) => option.kind === edgeKind,
                )?.description
              }
            </Text>
          </Box>
        </HStack>
      </Field.Root>

      {canCarryFlow && (
        <>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Flow mode
              </Field.Label>
              <Box flex={1}>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={String(flowSpec.mode || "fixed")}
                    onChange={(event) =>
                      patchObject(
                        "flow_spec",
                        { mode: event.target.value },
                        flowSpec,
                      )
                    }
                  >
                    {flowModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            </HStack>
          </Field.Root>

          <Field.Root invalid={!!flowError}>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Flow
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={flowValue ?? numberValue(data.flow)}
                  onChange={(event) => handleFlowChange(event.target.value)}
                  placeholder="m3/d"
                />
                {flowError && <Field.ErrorText>{flowError}</Field.ErrorText>}
              </Box>
            </HStack>
          </Field.Root>
        </>
      )}

      <Field.Root>
        <HStack align="flex-start" gap={4}>
          <Field.Label minW={labelWidth} pt={2}>
            Components
          </Field.Label>
          <Box flex={1}>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={String(componentPolicy.mode || "all")}
                onChange={(event) =>
                  patchObject(
                    "component_policy",
                    { mode: event.target.value },
                    componentPolicy,
                  )
                }
              >
                <option value="all">all</option>
                <option value="include">include</option>
                <option value="exclude">exclude</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>
        </HStack>
      </Field.Root>

      {componentPolicy.mode !== "all" && (
        <Field.Root>
          <HStack align="flex-start" gap={4}>
            <Field.Label minW={labelWidth} pt={2}>
              {componentPolicy.mode === "exclude" ? "Exclude" : "Include"}
            </Field.Label>
            <Box flex={1}>
              <Input
                value={String(
                  (componentPolicy.mode === "exclude"
                    ? componentPolicy.exclude
                    : componentPolicy.include) || "",
                )}
                onChange={(event) =>
                  handleComponentListChange(
                    componentPolicy.mode === "exclude" ? "exclude" : "include",
                    event.target.value,
                  )
                }
                placeholder="COD, X_TSS"
              />
            </Box>
          </HStack>
        </Field.Root>
      )}

      {edgeKind === "pump" && (
        <>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Head m
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={numberValue(pump.head_m)}
                  onChange={(event) =>
                    patchObject(
                      "pump",
                      { head_m: parseNumber(event.target.value) },
                      pump,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Efficiency
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={numberValue(pump.efficiency)}
                  onChange={(event) =>
                    patchObject(
                      "pump",
                      { efficiency: parseNumber(event.target.value) },
                      pump,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Energy
              </Field.Label>
              <Box flex={1}>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={String(pump.energy_enabled ?? true)}
                    onChange={(event) =>
                      patchObject(
                        "pump",
                        { energy_enabled: event.target.value === "true" },
                        pump,
                      )
                    }
                  >
                    <option value="true">enabled</option>
                    <option value="false">disabled</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
            </HStack>
          </Field.Root>
        </>
      )}

      {edgeKind === "settling" && (
        <>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Model
              </Field.Label>
              <Box flex={1}>
                <Input
                  value={String(
                    transportModel.model_id || "takacs_settling.v1",
                  )}
                  onChange={(event) =>
                    patchObject(
                      "transport_model",
                      { model_id: event.target.value },
                      transportModel,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Area m2
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={numberValue(transportParameters.area_m2)}
                  onChange={(event) =>
                    patchTransportParameter("area_m2", event.target.value)
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                v0 m/d
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={numberValue(transportParameters.v0_m_per_day)}
                  onChange={(event) =>
                    patchTransportParameter(
                      "v0_m_per_day",
                      event.target.value,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
        </>
      )}

      {edgeKind === "signal" && (
        <>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Signal
              </Field.Label>
              <Box flex={1}>
                <Input
                  value={String(signalSpec.signal_name || "")}
                  onChange={(event) =>
                    patchObject(
                      "signal_spec",
                      { signal_name: event.target.value },
                      signalSpec,
                    )
                  }
                  placeholder="DO_5"
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Source
              </Field.Label>
              <Box flex={1}>
                <Input
                  value={String(signalSpec.source_expression || "")}
                  onChange={(event) =>
                    patchObject(
                      "signal_spec",
                      { source_expression: event.target.value },
                      signalSpec,
                    )
                  }
                  placeholder="X_TSS"
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Target
              </Field.Label>
              <Box flex={1}>
                <Input
                  value={String(signalSpec.target_binding || "")}
                  onChange={(event) =>
                    patchObject(
                      "signal_spec",
                      { target_binding: event.target.value },
                      signalSpec,
                    )
                  }
                  placeholder="pump.flow_spec"
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Sample d
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={numberValue(signalSpec.sample_period_days)}
                  onChange={(event) =>
                    patchObject(
                      "signal_spec",
                      { sample_period_days: parseNumber(event.target.value) },
                      signalSpec,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
          <Field.Root>
            <HStack align="flex-start" gap={4}>
              <Field.Label minW={labelWidth} pt={2}>
                Delay d
              </Field.Label>
              <Box flex={1}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={numberValue(signalSpec.delay_days)}
                  onChange={(event) =>
                    patchObject(
                      "signal_spec",
                      { delay_days: parseNumber(event.target.value) },
                      signalSpec,
                    )
                  }
                />
              </Box>
            </HStack>
          </Field.Root>
        </>
      )}
    </Stack>
  )
}

export default NetworkEdgeInspectorFields

