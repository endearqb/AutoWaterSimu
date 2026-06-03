package compute

import (
	"context"
	"encoding/json"
)

func (svc *ModelGovernanceService) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.modelRuns.FindModelRun(ctx, required(modelRunID, "model_run_id"))
}

func (svc *ModelGovernanceService) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	modelRuns, next, total, err := svc.modelRuns.ListModelRuns(ctx, filter)
	if err != nil {
		return ListModelRunsResponse{}, err
	}
	return ListModelRunsResponse{
		Items:         rawMessagesOrEmpty(modelRuns),
		NextCursor:    next,
		TotalEstimate: total,
	}, nil
}
