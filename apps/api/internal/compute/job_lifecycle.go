package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
	"time"
)

type JobLifecycleService struct {
	jobs          JobStore
	jobStates     *domainjobs.JobStateService
	modelRuns     ModelRunStore
	validator     *ContractValidator
	now           func() time.Time
	listArtifacts func(context.Context, string) ([]ArtifactRecord, error)
}

func NewJobLifecycleService(jobs JobStore, modelRuns ModelRunStore, validator *ContractValidator, now func() time.Time, listArtifacts func(context.Context, string) ([]ArtifactRecord, error)) *JobLifecycleService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &JobLifecycleService{
		jobs:          jobs,
		jobStates:     domainjobs.NewJobStateService(jobStateStoreAdapter{jobs: jobs}, now),
		modelRuns:     modelRuns,
		validator:     validator,
		now:           now,
		listArtifacts: listArtifacts,
	}
}
