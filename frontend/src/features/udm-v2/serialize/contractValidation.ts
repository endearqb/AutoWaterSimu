import type { ErrorObject } from "ajv"
import Ajv2020 from "ajv/dist/2020"

import networkProcessGraphSchema from "../../../../../contracts/network_process_graph.v1.json"
import networkSimulationInputSchema from "../../../../../contracts/network_simulation_input.v1.json"
import type {
  NetworkProcessGraphV1,
  NetworkSimulationInputV1,
} from "../contracts/generated"
import type {
  NetworkV2Diagnostic,
  NetworkV2ValidationReport,
} from "./semanticValidation"

const ajv = new Ajv2020({ allErrors: true, strict: false })

const validateProcessGraphSchema = ajv.compile<NetworkProcessGraphV1>(
  networkProcessGraphSchema,
)
const validateSimulationInputSchema = ajv.compile<NetworkSimulationInputV1>(
  networkSimulationInputSchema,
)

export function validateNetworkProcessGraphContract(
  value: unknown,
): NetworkV2ValidationReport {
  return toReport(
    validateProcessGraphSchema(value),
    validateProcessGraphSchema.errors,
  )
}

export function validateNetworkSimulationInputContract(
  value: unknown,
): NetworkV2ValidationReport {
  return toReport(
    validateSimulationInputSchema(value),
    validateSimulationInputSchema.errors,
  )
}

function toReport(
  valid: boolean,
  errors: ErrorObject[] | null | undefined,
): NetworkV2ValidationReport {
  const diagnostics = valid ? [] : (errors || []).map(toDiagnostic)
  return {
    status: diagnostics.length > 0 ? "invalid" : "valid",
    diagnostics,
  }
}

function toDiagnostic(error: ErrorObject): NetworkV2Diagnostic {
  return {
    code: "CONTRACT_SCHEMA_INVALID",
    severity: "error",
    message: error.message || "Contract schema validation failed.",
    element: { kind: "graph" },
    fieldPath: fieldPathForError(error),
    schemaInstancePath: error.instancePath,
  }
}

function fieldPathForError(error: ErrorObject) {
  const missingProperty =
    "missingProperty" in error.params
      ? String(error.params.missingProperty)
      : ""
  const instancePath = error.instancePath.replace(/^\//, "").replace(/\//g, ".")
  return [instancePath, missingProperty].filter(Boolean).join(".") || "$"
}
