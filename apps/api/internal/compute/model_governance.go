package compute

import (
	"context"
	"time"
)

type SimulationInputResolver func(context.Context, map[string]any, string, string, string, ListFilter) (map[string]any, error)
type ComputeJobCreator func(context.Context, []byte, string, ListFilter) (JobSnapshot, int, error)

type ModelGovernanceService struct {
	catalogs                 ModelCatalogStore
	benchmarkRuns            BenchmarkRunStore
	modelRuns                ModelRunStore
	validator                *ContractValidator
	now                      func() time.Time
	resolveSimulationInput   SimulationInputResolver
	createJob                ComputeJobCreator
	resolveEvidenceReference EvidenceReferenceResolver
}

type ModelGovernanceStores interface {
	ModelCatalogStore
	BenchmarkRunStore
	ModelRunStore
}

func NewModelGovernanceService(stores ModelGovernanceStores, validator *ContractValidator, now func() time.Time, resolveSimulationInput SimulationInputResolver, createJob ComputeJobCreator, resolveEvidenceReference EvidenceReferenceResolver) *ModelGovernanceService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ModelGovernanceService{
		catalogs:                 stores,
		benchmarkRuns:            stores,
		modelRuns:                stores,
		validator:                validator,
		now:                      now,
		resolveSimulationInput:   resolveSimulationInput,
		createJob:                createJob,
		resolveEvidenceReference: resolveEvidenceReference,
	}
}
