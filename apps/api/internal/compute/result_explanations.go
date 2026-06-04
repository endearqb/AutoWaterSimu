package compute

import (
	"context"
	"time"
)

type EvidenceReferenceResolver func(context.Context, string, string) (EvidenceReferenceResolution, error)

type ResultExplanationService struct {
	explanations             ResultExplanationStore
	jobs                     JobStore
	validator                *ContractValidator
	now                      func() time.Time
	resolveEvidenceReference EvidenceReferenceResolver
}

func NewResultExplanationService(explanations ResultExplanationStore, jobs JobStore, validator *ContractValidator, now func() time.Time, resolveEvidenceReference EvidenceReferenceResolver) *ResultExplanationService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ResultExplanationService{
		explanations:             explanations,
		jobs:                     jobs,
		validator:                validator,
		now:                      now,
		resolveEvidenceReference: resolveEvidenceReference,
	}
}
