package compute

import "context"

func (svc *EvidenceGovernanceService) Result(ctx context.Context, jobID string) (map[string]any, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return nil, err
	}
	modelRuns, err := svc.modelRuns.ModelRuns(ctx, snapshot.Job.JobID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"job_id":      snapshot.Job.JobID,
		"status":      snapshot.Job.Status,
		"summary":     rawOrNull(snapshot.Job.Summary),
		"result_hash": snapshot.Job.ResultHash,
		"artifacts":   snapshot.Artifacts,
		"model_runs":  rawMessagesOrEmpty(modelRuns),
	}, nil
}

func (svc *EvidenceGovernanceService) snapshot(ctx context.Context, jobID string) (JobSnapshot, error) {
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
