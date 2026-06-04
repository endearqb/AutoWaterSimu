package compute

import (
	"context"
	"encoding/json"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *JobLifecycleService) Complete(ctx context.Context, workerID, jobID string, attempt int, result map[string]any) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	if job.WorkerID != required(workerID, "worker_id") || job.Attempt != attempt {
		return JobSnapshot{}, Conflict(CodeWorkerStale, "worker result is stale")
	}
	completion, ok := domainjobs.WorkerResultCompletionFromResult(result)
	if !ok {
		return JobSnapshot{}, ValidationError("result.status must be succeeded, failed, or timed_out")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("compute_result.v1.json", result); err != nil {
			return JobSnapshot{}, err
		}
	}
	modelRuns, err := svc.modelRunsFromResult(result, jobID)
	if err != nil {
		return JobSnapshot{}, err
	}
	resultHash, err := ResultHash(result)
	if err != nil {
		return JobSnapshot{}, err
	}
	summary := mustJSON(domainevidence.StoredResultSummary(result))
	completed, err := svc.jobs.CompleteJob(ctx, jobID, workerID, attempt, completion.Status, summary, resultHash, completion.ErrorCode, completion.ErrorMessage, svc.now())
	if err != nil {
		return JobSnapshot{}, err
	}
	if err := svc.modelRuns.InsertModelRuns(ctx, jobID, modelRuns, svc.now()); err != nil {
		return JobSnapshot{}, err
	}
	return svc.snapshot(ctx, completed.JobID)
}

func (svc *JobLifecycleService) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	job, err := svc.jobs.FindJobByID(ctx, required(jobID, "job_id"))
	if err != nil {
		return JobSnapshot{}, err
	}
	result := domainjobs.FailedWorkerComputeResult(job.JobID, job.JobType, errorCode, errorMessage)
	return svc.Complete(ctx, workerID, jobID, attempt, result)
}

func (svc *JobLifecycleService) modelRunsFromResult(result map[string]any, jobID string) ([]json.RawMessage, error) {
	documents, err := domainmodels.ModelRunDocumentsFromComputeResult(result, jobID)
	if err != nil {
		return nil, ValidationError(err.Error())
	}
	modelRuns := make([]json.RawMessage, 0, len(documents))
	for _, modelRun := range documents {
		if svc.validator != nil {
			if err := svc.validator.Validate("model_run.v1.json", modelRun); err != nil {
				return nil, err
			}
		}
		modelRuns = append(modelRuns, mustJSON(modelRun))
	}
	return modelRuns, nil
}
