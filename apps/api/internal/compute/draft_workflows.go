package compute

import (
	"context"
	"time"
)

type DraftWorkflowService struct {
	confirmations         DraftConfirmationStore
	validator             *ContractValidator
	now                   func() time.Time
	createSimulationCheck func(context.Context, []byte) (JobSnapshot, int, error)
}

func NewDraftWorkflowService(confirmations DraftConfirmationStore, validator *ContractValidator, now func() time.Time, createSimulationCheck func(context.Context, []byte) (JobSnapshot, int, error)) *DraftWorkflowService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &DraftWorkflowService{
		confirmations:         confirmations,
		validator:             validator,
		now:                   now,
		createSimulationCheck: createSimulationCheck,
	}
}
