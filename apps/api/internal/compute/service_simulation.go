package compute

import (
	"context"
	"encoding/json"
	"time"

	domainsimulation "autowatersimu/apps/api/internal/domain/simulation"
)

func (svc *Service) CreateSimulationCheck(ctx context.Context, bytes []byte) (JobSnapshot, int, error) {
	var request map[string]any
	if err := json.Unmarshal(bytes, &request); err != nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request JSON is invalid")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_request.v1.json", request); err != nil {
			return JobSnapshot{}, 0, err
		}
	}
	requestID := required(stringValue(request, "request_id"), "request_id")
	jobType := required(stringValue(request, "job_type"), "job_type")
	inputRef := mapValue(request, "input_ref")
	if inputRef == nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request.input_ref is required")
	}
	sourceSystem := required(stringValue(request, "source_system"), "source_system")
	requestedBy := required(stringValue(request, "requested_by"), "requested_by")
	simulationInput, err := svc.simulationInputs.ResolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if stringValue(simulationInput, "job_type") != "" && stringValue(simulationInput, "job_type") != jobType {
		return JobSnapshot{}, 0, ValidationError("simulation_request job_type must match simulation_input job_type")
	}

	metadata := mapValue(request, "metadata")
	externalRefs := mapValue(request, "external_refs")
	jobDocument := domainsimulation.BuildSimulationCheckJobDocument(domainsimulation.SimulationCheckJobInput{
		RequestID:       requestID,
		JobType:         jobType,
		SourceSystem:    sourceSystem,
		RequestedBy:     requestedBy,
		InputRef:        inputRef,
		SimulationInput: simulationInput,
		Metadata:        metadata,
		ExternalRefs:    externalRefs,
		CreatedAt:       svc.now().Format(time.RFC3339Nano),
	})
	jobBytes, err := json.Marshal(jobDocument.Job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateJob(ctx, jobBytes, jobDocument.IdempotencyKey)
}

func (svc *Service) RegisterSimulationInput(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, int, error) {
	return svc.simulationInputs.RegisterSimulationInput(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetSimulationInput(ctx context.Context, simulationInputID string) (SimulationInputRecord, error) {
	return svc.simulationInputs.GetSimulationInput(ctx, simulationInputID)
}

func (svc *Service) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	return svc.simulationInputs.RegisterProcessGraph(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetProcessGraph(ctx context.Context, processGraphID string, version int) (ProcessGraphRecord, error) {
	return svc.simulationInputs.GetProcessGraph(ctx, processGraphID, version)
}
