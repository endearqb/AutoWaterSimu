package compute

import "context"

func (svc *JobLifecycleService) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	job, err := svc.jobs.CancelJob(ctx, required(jobID, "job_id"), svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, job.JobID)
}

func (svc *JobLifecycleService) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.jobs.TimeoutExpired(ctx, svc.now())
}
