package compute

import (
	"time"
)

type ArtifactLifecycleService struct {
	jobs             JobStore
	metadata         ArtifactMetadataStore
	archiveMetadata  ArchiveMetadataStore
	artifacts        ArtifactStore
	archiveArtifacts ArtifactStore
	validator        *ContractValidator
	now              func() time.Time
}

type ArtifactLifecycleStores interface {
	JobStore
	ArtifactMetadataStore
	ArchiveMetadataStore
}

type ArtifactObjectStores struct {
	Hot     ArtifactStore
	Archive ArtifactStore
}

func NewArtifactLifecycleService(stores ArtifactLifecycleStores, objectStores ArtifactObjectStores, validator *ContractValidator, now func() time.Time) *ArtifactLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ArtifactLifecycleService{
		jobs:             stores,
		metadata:         stores,
		archiveMetadata:  stores,
		artifacts:        objectStores.Hot,
		archiveArtifacts: objectStores.Archive,
		validator:        validator,
		now:              now,
	}
}
