package compute

import (
	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type EvidenceReferenceResolver func(context.Context, string, string) (EvidenceReferenceResolution, error)

type ResultExplanationService struct {
	explanations             ResultExplanationStore
	jobs                     JobStore
	validator                *ContractValidator
	now                      func() time.Time
	resolveEvidenceReference EvidenceReferenceResolver
}

func NewResultExplanationService(explanations ResultExplanationStore, jobs JobStore, validator *ContractValidator, now func() time.Time, resolveEvidenceReference EvidenceReferenceResolver) *ResultExplanationService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &ResultExplanationService{
		explanations:             explanations,
		jobs:                     jobs,
		validator:                validator,
		now:                      now,
		resolveEvidenceReference: resolveEvidenceReference,
	}
}

func (svc *ResultExplanationService) SubmitResultExplanation(ctx context.Context, jobID string, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ResultExplanationRecord, int, error) {
	var document map[string]any
	if err := json.Unmarshal(bytes, &document); err != nil {
		return ResultExplanationRecord{}, 0, ValidationError("result explanation JSON is invalid")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("result_explanation.v1.json", document); err != nil {
			return ResultExplanationRecord{}, 0, err
		}
	}
	jobID = required(jobID, "job_id")
	if stringValue(document, "job_id") != jobID {
		return ResultExplanationRecord{}, 0, ValidationError("result_explanation.job_id must match route job_id")
	}
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil {
		return ResultExplanationRecord{}, 0, err
	}
	if strings.TrimSpace(job.ResultHash) == "" {
		return ResultExplanationRecord{}, 0, Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	resolvedRefs, err := svc.resolveResultExplanationRefs(ctx, jobID, document)
	if err != nil {
		return ResultExplanationRecord{}, 0, err
	}
	record, err := svc.resultExplanationRecord(document, *job, resolvedRefs, defaultSourceSystem, defaultRequestedBy)
	if err != nil {
		return ResultExplanationRecord{}, 0, err
	}
	created, err := svc.explanations.UpsertResultExplanation(ctx, record)
	if err != nil {
		return ResultExplanationRecord{}, 0, err
	}
	if !created {
		existing, err := svc.explanations.FindResultExplanation(ctx, jobID, record.ExplanationID)
		if err != nil {
			return ResultExplanationRecord{}, 0, err
		}
		return *existing, http.StatusOK, nil
	}
	return record, http.StatusCreated, nil
}

func (svc *ResultExplanationService) GetResultExplanation(ctx context.Context, jobID, explanationID string) (ResultExplanationRecord, error) {
	record, err := svc.explanations.FindResultExplanation(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"))
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}

func (svc *ResultExplanationService) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	decision := required(request.Decision, "decision")
	if decision != "approved" && decision != "rejected" {
		return ResultExplanationRecord{}, ValidationError("decision must be approved or rejected")
	}
	record, err := svc.explanations.UpdateResultExplanationReview(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"), defaultString(reviewer, "unknown"), decision, request.Reason, nil, svc.now())
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}

func (svc *ResultExplanationService) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	record, err := svc.explanations.PublishResultExplanation(ctx, required(jobID, "job_id"), required(explanationID, "explanation_id"), defaultString(publisher, "unknown"), svc.now())
	if err != nil {
		return ResultExplanationRecord{}, err
	}
	return *record, nil
}

func (svc *ResultExplanationService) resultExplanationRecord(document map[string]any, job JobRecord, resolvedRefs []string, defaultSourceSystem, defaultRequestedBy string) (ResultExplanationRecord, error) {
	recordData, err := domainevidence.ResultExplanationRecordDataFromDocument(domainevidence.ResultExplanationRecordDataInput{
		Document:             document,
		Job:                  domainevidence.ResultExplanationJobContext{JobID: job.JobID, TenantID: job.TenantID, ProjectID: job.ProjectID},
		ResolvedEvidenceRefs: resolvedRefs,
		DefaultSourceSystem:  defaultSourceSystem,
		DefaultRequestedBy:   defaultRequestedBy,
		Now:                  svc.now(),
	})
	if err != nil {
		return ResultExplanationRecord{}, ValidationError(err.Error())
	}
	return ResultExplanationRecord{
		SchemaVersion:            recordData.SchemaVersion,
		ExplanationID:            recordData.ExplanationID,
		ExplanationSchemaVersion: recordData.ExplanationSchemaVersion,
		JobID:                    recordData.JobID,
		Status:                   recordData.Status,
		CreatedBy:                recordData.CreatedBy,
		PayloadHash:              recordData.PayloadHash,
		Payload:                  recordData.Payload,
		ResolvedEvidenceRefs:     recordData.ResolvedEvidenceRefs,
		SourceSystem:             recordData.SourceSystem,
		RequestedBy:              recordData.RequestedBy,
		TenantID:                 recordData.TenantID,
		ProjectID:                recordData.ProjectID,
		Metadata:                 recordData.Metadata,
		SubmittedAt:              recordData.SubmittedAt,
		CreatedAt:                recordData.CreatedAt,
		UpdatedAt:                recordData.UpdatedAt,
	}, nil
}

func (svc *ResultExplanationService) resolveResultExplanationRefs(ctx context.Context, jobID string, document map[string]any) ([]string, error) {
	refs := domainevidence.ResultExplanationEvidenceRefs(document)
	for _, ref := range refs {
		if svc.resolveEvidenceReference == nil {
			return nil, NewAppError(500, CodeInternal, "evidence reference resolver is not configured", true, nil)
		}
		if _, err := svc.resolveEvidenceReference(ctx, jobID, ref); err != nil {
			return nil, ValidationError("result_explanation evidence_ref is not resolvable within job: " + ref)
		}
	}
	return refs, nil
}
