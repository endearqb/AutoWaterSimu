package compute

import (
	"context"
	"time"
)

type EvidenceGovernanceService struct {
	jobs             JobStore
	modelRuns        ModelRunStore
	processGraphs    ProcessGraphStore
	validator        *ContractValidator
	now              func() time.Time
	modelCatalog     func(context.Context) (ModelCatalogResponse, error)
	listArtifacts    func(context.Context, string) ([]ArtifactRecord, error)
	artifactMetadata func(context.Context, string) (ArtifactRecord, error)
}

type EvidenceGovernanceStores interface {
	JobStore
	ModelRunStore
	ProcessGraphStore
}

func NewEvidenceGovernanceService(
	stores EvidenceGovernanceStores,
	validator *ContractValidator,
	now func() time.Time,
	modelCatalog func(context.Context) (ModelCatalogResponse, error),
	listArtifacts func(context.Context, string) ([]ArtifactRecord, error),
	artifactMetadata func(context.Context, string) (ArtifactRecord, error),
) *EvidenceGovernanceService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &EvidenceGovernanceService{
		jobs:             stores,
		modelRuns:        stores,
		processGraphs:    stores,
		validator:        validator,
		now:              now,
		modelCatalog:     modelCatalog,
		listArtifacts:    listArtifacts,
		artifactMetadata: artifactMetadata,
	}
}
