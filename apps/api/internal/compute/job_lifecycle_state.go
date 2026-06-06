package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	"context"
)

type jobStateStoreAdapter struct {
	jobs JobStore
}

func (adapter jobStateStoreAdapter) CancelJob(ctx context.Context, jobID string, mutation domainjobs.StateMutation) (*domainjobs.StateRecord, error) {
	job, err := adapter.jobs.CancelJob(ctx, jobID, mutation)
	if err != nil {
		return nil, err
	}
	return jobStateRecord(job), nil
}

func (adapter jobStateStoreAdapter) TimeoutExpired(ctx context.Context, mutation domainjobs.StateMutation) ([]domainjobs.StateRecord, error) {
	jobs, err := adapter.jobs.TimeoutExpired(ctx, mutation)
	if err != nil {
		return nil, err
	}
	records := make([]domainjobs.StateRecord, 0, len(jobs))
	for _, job := range jobs {
		record := jobStateRecord(&job)
		if record != nil {
			records = append(records, *record)
		}
	}
	return records, nil
}

func (svc *JobLifecycleService) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobStates.CancelJob(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, job.JobID)
}

func (svc *JobLifecycleService) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	states, err := svc.jobStates.TimeoutSweep(ctx)
	if err != nil {
		return nil, err
	}
	records := make([]JobRecord, 0, len(states))
	for _, state := range states {
		job, err := svc.jobs.FindJobByID(ctx, state.JobID)
		if err != nil {
			return nil, err
		}
		records = append(records, *job)
	}
	return records, nil
}

func jobStateRecord(job *JobRecord) *domainjobs.StateRecord {
	if job == nil {
		return nil
	}
	return &domainjobs.StateRecord{
		JobID:        job.JobID,
		Status:       job.Status,
		ErrorCode:    job.ErrorCode,
		ErrorMessage: job.ErrorMessage,
		FinishedAt:   job.FinishedAt,
	}
}
