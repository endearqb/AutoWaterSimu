package compute

import "context"

func (svc *JobLifecycleService) GetJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.snapshot(ctx, required(jobID, "job_id"))
}

func (svc *JobLifecycleService) ListJobs(ctx context.Context, filter ListFilter) (ListJobsResponse, error) {
	jobs, next, total, err := svc.jobs.ListJobs(ctx, filter)
	if err != nil {
		return ListJobsResponse{}, err
	}
	items := make([]JobSnapshot, 0, len(jobs))
	for _, job := range jobs {
		artifacts, _ := svc.listArtifacts(ctx, job.JobID)
		events, _ := svc.jobs.Events(ctx, job.JobID)
		items = append(items, snapshotFrom(job, artifacts, len(events)))
	}
	return ListJobsResponse{Items: items, NextCursor: next, TotalEstimate: total}, nil
}

func (svc *JobLifecycleService) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	events, err := svc.jobs.Events(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	if events == nil {
		events = []EventRecord{}
	}
	return events, nil
}

func (svc *JobLifecycleService) snapshot(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	artifacts, err := svc.listArtifacts(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	events, err := svc.jobs.Events(ctx, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	return snapshotFrom(*job, artifacts, len(events)), nil
}
