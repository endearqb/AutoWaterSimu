package compute

import (
	"context"
	"time"

	domainworkers "autowatersimu/apps/api/internal/domain/workers"
)

type Service struct {
	store              Store
	artifacts          ArtifactStore
	archiveArtifacts   ArtifactStore
	artifactLifecycle  *ArtifactLifecycleService
	jobLifecycle       *JobLifecycleService
	workerLifecycle    *domainworkers.WorkerLifecycleService
	simulationInputs   *SimulationInputService
	draftWorkflows     *DraftWorkflowService
	resultExplanations *ResultExplanationService
	modelGovernance    *ModelGovernanceService
	evidenceGovernance *EvidenceGovernanceService
	metricsSnapshot    *MetricsService
	validator          *ContractValidator
	now                func() time.Time
}

func NewService(store Store, artifacts ArtifactStore, validator *ContractValidator) *Service {
	return NewServiceWithArchive(store, artifacts, nil, validator)
}

func NewServiceWithArchive(store Store, artifacts ArtifactStore, archiveArtifacts ArtifactStore, validator *ContractValidator) *Service {
	svc := &Service{
		store:            store,
		artifacts:        artifacts,
		archiveArtifacts: archiveArtifacts,
		validator:        validator,
		now:              func() time.Time { return time.Now().UTC() },
	}
	svc.artifactLifecycle = NewArtifactLifecycleService(store, ArtifactObjectStores{Hot: artifacts, Archive: archiveArtifacts}, validator, func() time.Time { return svc.now() })
	svc.jobLifecycle = NewJobLifecycleService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	})
	svc.workerLifecycle = domainworkers.NewWorkerLifecycleService(workerStoreAdapter{store: store}, func() time.Time { return svc.now() }, DefaultLeaseSeconds*time.Second)
	svc.simulationInputs = NewSimulationInputService(store, store, store, validator, func() time.Time { return svc.now() })
	svc.draftWorkflows = NewDraftWorkflowService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, bytes []byte, filter ListFilter) (JobSnapshot, int, error) {
		return svc.CreateSimulationCheckForScope(ctx, bytes, filter)
	})
	svc.resultExplanations = NewResultExplanationService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.modelGovernance = NewModelGovernanceService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string, filter ListFilter) (map[string]any, error) {
		return svc.simulationInputs.ResolveSimulationInputForScope(ctx, inputRef, sourceSystem, requestedBy, jobType, filter)
	}, func(ctx context.Context, bytes []byte, idempotencyKey string, filter ListFilter) (JobSnapshot, int, error) {
		return svc.CreateJobForScope(ctx, bytes, idempotencyKey, filter)
	}, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.evidenceGovernance = NewEvidenceGovernanceService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, filter ModelCatalogSnapshotFilter) (ModelCatalogResponse, error) {
		catalog, _, err := svc.modelGovernance.ModelCatalogForRead(ctx, filter)
		return catalog, err
	}, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	}, func(ctx context.Context, artifactID string) (ArtifactRecord, error) {
		return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
	})
	svc.metricsSnapshot = NewMetricsService(store, func() time.Time { return svc.now() })
	return svc
}
