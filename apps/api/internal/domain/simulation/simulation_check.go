package simulation

import "strings"

type SimulationCheckJobInput struct {
	RequestID       string
	JobType         string
	SourceSystem    string
	RequestedBy     string
	InputRef        map[string]any
	SimulationInput map[string]any
	Metadata        map[string]any
	ExternalRefs    map[string]any
	CreatedAt       string
}

type SimulationCheckJobDocument struct {
	Job            map[string]any
	IdempotencyKey string
}

func BuildSimulationCheckJobDocument(input SimulationCheckJobInput) SimulationCheckJobDocument {
	traceID := defaultString(stringValue(input.Metadata, "trace_id"), "trace_simcheck_"+safeIDPart(input.RequestID))
	jobID := defaultString(stringValue(input.Metadata, "job_id"), "job_simcheck_"+safeIDPart(input.RequestID))
	idempotencyKey := defaultString(stringValue(input.Metadata, "idempotency_key"), "simcheck:"+input.RequestID)
	jobContext := map[string]any{
		"source_system": input.SourceSystem,
		"requested_by":  input.RequestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id", "site_id"} {
		if value := stringValue(input.Metadata, key); value != "" {
			jobContext[key] = value
		} else if key == "site_id" {
			if value := stringValue(input.ExternalRefs, key); value != "" {
				jobContext[key] = value
			}
		}
	}
	if input.ExternalRefs != nil {
		jobContext["external_refs"] = input.ExternalRefs
	}

	job := map[string]any{
		"schema_version":  "compute_job.v1",
		"job_id":          jobID,
		"job_type":        input.JobType,
		"queue":           "simulation",
		"request_id":      input.RequestID,
		"idempotency_key": idempotencyKey,
		"payload":         input.SimulationInput,
		"context":         jobContext,
		"execution":       ExecutionProfile(input.JobType),
		"created_at":      input.CreatedAt,
		"metadata":        simulationCheckMetadata(input.RequestID, input.InputRef, input.ExternalRefs),
	}
	return SimulationCheckJobDocument{Job: job, IdempotencyKey: idempotencyKey}
}

func simulationCheckMetadata(requestID string, inputRef map[string]any, externalRefs map[string]any) map[string]any {
	metadata := map[string]any{
		"source":                "simulation_check_api",
		"simulation_request_id": requestID,
	}
	if externalRefs != nil {
		metadata["external_refs"] = externalRefs
	}
	inputRefMetadata := map[string]any{}
	for key, value := range inputRef {
		if key == "simulation_input" {
			continue
		}
		inputRefMetadata[key] = value
	}
	if len(inputRefMetadata) > 0 {
		metadata["input_ref"] = inputRefMetadata
	}
	return metadata
}

func safeIDPart(value string) string {
	var builder strings.Builder
	for _, char := range value {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			builder.WriteRune(char)
		} else {
			builder.WriteByte('_')
		}
	}
	if builder.Len() == 0 {
		return "unknown"
	}
	return builder.String()
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
