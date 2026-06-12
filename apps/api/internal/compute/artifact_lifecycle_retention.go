package compute

import (
	"context"

	domainartifacts "autowatersimu/apps/api/internal/domain/artifacts"
)

func (svc *ArtifactLifecycleService) SweepArtifactRetention(ctx context.Context, options ArtifactRetentionSweepOptions) (ArtifactRetentionSweepReport, error) {
	now := options.Now
	if now.IsZero() {
		now = svc.now()
	}
	limit := normalizeRetentionLimit(options.Limit)
	candidates, err := svc.metadata.ListArtifactRetentionCandidates(ctx, now, limit, options.DataScope)
	if err != nil {
		return ArtifactRetentionSweepReport{}, err
	}
	report := ArtifactRetentionSweepReport{
		SchemaVersion: "artifact_retention_sweep.v1",
		DryRun:        options.DryRun,
		Checked:       len(candidates),
		Items:         make([]ArtifactRetentionAction, 0, len(candidates)),
		GeneratedAt:   now,
	}
	for _, artifact := range candidates {
		action := ArtifactRetentionAction{
			ArtifactID:      artifact.ArtifactID,
			JobID:           artifact.JobID,
			RetentionPolicy: artifact.RetentionPolicy,
			RetainUntil:     artifact.RetainUntil,
		}
		blockingRefs, err := svc.metadata.ArtifactReferences(ctx, artifact.ArtifactID)
		if err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		plan := domainartifacts.EvaluateRetentionAction(domainartifacts.RetentionActionInput{
			Policy:          artifact.RetentionPolicy,
			HasBlockingRefs: len(blockingRefs) > 0,
			ArchiveEnabled:  svc.archiveArtifacts != nil,
			DryRun:          options.DryRun,
		})
		if plan.Action == domainartifacts.RetentionActionSkipped {
			action.Action = plan.Action
			action.Reason = plan.Reason
			if len(blockingRefs) > 0 {
				action.BlockingRefs = blockingRefs
			}
			report.Skipped++
			report.Items = append(report.Items, action)
			continue
		}
		if plan.ShouldArchive {
			archive, err := svc.archiveArtifact(ctx, artifact, now)
			if err != nil {
				return ArtifactRetentionSweepReport{}, err
			}
			action.Action = plan.Action
			action.ArchiveProvider = archive.ArchiveProvider
			action.ArchiveObjectKey = archive.ArchiveObjectKey
			report.Archived++
			report.Items = append(report.Items, action)
			continue
		}
		if plan.Action == domainartifacts.RetentionActionWouldArchive {
			action.Action = plan.Action
			report.Items = append(report.Items, action)
			continue
		}
		if plan.Action == domainartifacts.RetentionActionWouldDelete {
			action.Action = plan.Action
			report.Items = append(report.Items, action)
			continue
		}
		if !plan.ShouldDelete {
			action.Action = plan.Action
			action.Reason = plan.Reason
			report.Items = append(report.Items, action)
			continue
		}
		if err := svc.artifacts.Delete(ctx, artifact.ObjectKey); err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		event := EventRecord{
			JobID:     artifact.JobID,
			EventType: "artifact.retention_deleted",
			EventJSON: eventJSONWithAudit(
				map[string]any{
					"artifact_id":      artifact.ArtifactID,
					"retention_policy": artifact.RetentionPolicy,
					"retain_until":     artifact.RetainUntil,
				},
				mutationAuditEnvelope(
					ctx,
					now,
					"system",
					"service:artifact_retention_sweep",
					"Artifact",
					artifact.ArtifactID,
					"artifact.retention_delete",
					artifactAuditState(artifact),
					map[string]any{"deleted": true},
					"ttl retention expired",
					svc.auditTraceID(ctx, artifact.JobID),
					"",
				),
			),
			CreatedAt: now,
		}
		if err := svc.metadata.DeleteArtifact(ctx, artifact.ArtifactID, event); err != nil {
			return ArtifactRetentionSweepReport{}, err
		}
		action.Action = plan.Action
		report.Deleted++
		report.Items = append(report.Items, action)
	}
	return report, nil
}

func (svc *ArtifactLifecycleService) auditTraceID(ctx context.Context, jobID string) string {
	if svc.jobs == nil {
		return ""
	}
	job, err := svc.jobs.FindJobByID(ctx, jobID)
	if err != nil || job == nil {
		return ""
	}
	return job.TraceID
}

func artifactAuditState(artifact ArtifactRecord) map[string]any {
	return map[string]any{
		"artifact_id":      artifact.ArtifactID,
		"job_id":           artifact.JobID,
		"storage_provider": artifact.StorageProvider,
		"object_key":       artifact.ObjectKey,
		"checksum":         artifact.Checksum,
		"retention_policy": artifact.RetentionPolicy,
		"retain_until":     artifact.RetainUntil,
	}
}
