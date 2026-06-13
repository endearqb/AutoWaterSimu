package compute

import (
	"context"
	"strings"

	domainevidence "autowatersimu/apps/api/internal/domain/evidence"
	domainmodels "autowatersimu/apps/api/internal/domain/models"
)

func (svc *EvidenceGovernanceService) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	snapshot, err := svc.snapshot(ctx, required(jobID, "job_id"))
	if err != nil {
		return EvidenceReferenceResolution{}, err
	}
	if strings.TrimSpace(snapshot.Job.ResultHash) == "" {
		return EvidenceReferenceResolution{}, Conflict(CodeEvidenceUnavailable, "job result is not available")
	}
	refType, refID := domainevidence.ParseRef(required(evidenceRef, "ref"))
	if refType == "" {
		if resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		if resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID); ok {
			return resolution, nil
		}
		return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
	}
	switch refType {
	case "model_run":
		resolution, ok := svc.resolveModelRunEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "artifact":
		resolution, ok := svc.resolveArtifactEvidenceRef(ctx, snapshot.Job.JobID, evidenceRef, refID)
		if ok {
			return resolution, nil
		}
	case "job":
		if refID == snapshot.Job.JobID {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     snapshot.Job,
			}, nil
		}
	case "simulation_input":
		if payload := domainevidence.SimulationInputPayload(snapshot.Job.InputJSON, refID); payload != nil &&
			domainevidence.PayloadScopeMatchesSource(evidenceObjectScopeFromJob(snapshot.Job), payload) {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     payload,
			}, nil
		}
	case "process_graph":
		if resolution, ok := svc.resolveProcessGraphEvidenceRef(ctx, snapshot.Job, evidenceRef, refID); ok {
			return resolution, nil
		}
	case "evidence_package":
		evidence, _, err := svc.EvidencePackage(ctx, snapshot.Job.JobID)
		if err != nil {
			return EvidenceReferenceResolution{}, err
		}
		if refID == stringValue(evidence, "evidence_package_id") {
			return EvidenceReferenceResolution{
				JobID:       snapshot.Job.JobID,
				EvidenceRef: evidenceRef,
				RefType:     refType,
				RefID:       refID,
				Resolved:    true,
				Payload:     evidence,
			}, nil
		}
	}
	return EvidenceReferenceResolution{}, NotFound(CodeEvidenceRefNotFound, "evidence reference not found")
}

func (svc *EvidenceGovernanceService) resolveModelRunEvidenceRef(ctx context.Context, jobID, evidenceRef, modelRunID string) (EvidenceReferenceResolution, bool) {
	raw, err := svc.modelRuns.FindModelRun(ctx, modelRunID)
	if err != nil {
		return EvidenceReferenceResolution{}, false
	}
	modelRunID, modelRunJobID, _, _, _, err := domainmodels.RunFieldsFromRaw(raw)
	if err != nil || modelRunJobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "model_run",
		RefID:       modelRunID,
		Resolved:    true,
		Payload:     rawOrNull(raw),
	}, true
}

func (svc *EvidenceGovernanceService) resolveArtifactEvidenceRef(ctx context.Context, jobID, evidenceRef, artifactID string) (EvidenceReferenceResolution, bool) {
	artifact, err := svc.artifactMetadata(ctx, artifactID)
	if err != nil || artifact.JobID != jobID {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       jobID,
		EvidenceRef: evidenceRef,
		RefType:     "artifact",
		RefID:       artifact.ArtifactID,
		Resolved:    true,
		Payload:     artifact,
	}, true
}

func (svc *EvidenceGovernanceService) resolveProcessGraphEvidenceRef(ctx context.Context, job JobRecord, evidenceRef, processGraphID string) (EvidenceReferenceResolution, bool) {
	processGraphRef := domainevidence.InputRefs(job.InputJSON).ProcessGraphRef
	if stringValue(processGraphRef, "process_graph_id") != processGraphID {
		return EvidenceReferenceResolution{}, false
	}
	version := int(numberValue(processGraphRef, "version"))
	if version <= 0 {
		version = 1
	}
	record, err := svc.processGraphs.FindProcessGraph(ctx, processGraphID, version)
	if err != nil {
		return EvidenceReferenceResolution{}, false
	}
	if !domainevidence.ObjectScopeMatchesSource(evidenceObjectScopeFromJob(job), evidenceObjectScopeFromProcessGraph(record)) {
		return EvidenceReferenceResolution{}, false
	}
	return EvidenceReferenceResolution{
		JobID:       job.JobID,
		EvidenceRef: evidenceRef,
		RefType:     "process_graph",
		RefID:       processGraphID,
		Resolved:    true,
		Payload:     record,
	}, true
}

func evidenceObjectScopeFromJob(job JobRecord) domainevidence.ObjectScope {
	return domainevidence.ObjectScope{
		TenantID:  job.TenantID,
		ProjectID: job.ProjectID,
		SiteID:    job.SiteID,
	}
}

func evidenceObjectScopeFromProcessGraph(record *ProcessGraphRecord) domainevidence.ObjectScope {
	if record == nil {
		return domainevidence.ObjectScope{}
	}
	return domainevidence.ObjectScope{
		TenantID:  record.TenantID,
		ProjectID: record.ProjectID,
		SiteID:    record.SiteID,
	}
}
