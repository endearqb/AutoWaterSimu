package artifacts

import (
	"testing"
	"time"
)

func TestRetentionFromMetadataDefaultsToRetainForever(t *testing.T) {
	retention, err := RetentionFromMetadata(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retention.Policy != PolicyRetainForever || retention.RetainUntil != nil {
		t.Fatalf("unexpected default retention: %#v", retention)
	}
}

func TestRetentionFromMetadataParsesTTLRetainUntil(t *testing.T) {
	retention, err := RetentionFromMetadata(map[string]any{
		"retention_policy": " ttl ",
		"retain_until":     "2026-06-01T00:00:00Z",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retention.Policy != PolicyTTL || retention.RetainUntil == nil {
		t.Fatalf("unexpected retention: %#v", retention)
	}
	if got, want := retention.RetainUntil.UTC().Format(time.RFC3339), "2026-06-01T00:00:00Z"; got != want {
		t.Fatalf("retain_until mismatch: got %s want %s", got, want)
	}
}

func TestRetentionFromMetadataRejectsInvalidValues(t *testing.T) {
	if _, err := RetentionFromMetadata(map[string]any{"retention_policy": "delete_now"}); err == nil || err.Error() != "retention_policy is invalid" {
		t.Fatalf("expected invalid retention_policy error, got %v", err)
	}
	if _, err := RetentionFromMetadata(map[string]any{"retention_policy": PolicyTTL, "retain_until": "not-a-time"}); err == nil || err.Error() != "retain_until must be RFC3339" {
		t.Fatalf("expected invalid retain_until error, got %v", err)
	}
}

func TestIsRetentionCandidate(t *testing.T) {
	for _, policy := range []string{PolicyTTL, " " + PolicyArchiveCandidate + " "} {
		if !IsRetentionCandidate(policy) {
			t.Fatalf("expected %q to be a retention candidate", policy)
		}
	}
	for _, policy := range []string{"", PolicyRetainForever, "delete_now"} {
		if IsRetentionCandidate(policy) {
			t.Fatalf("expected %q not to be a retention candidate", policy)
		}
	}
}

func TestEvaluateRetentionActionSkipsBlockingRefs(t *testing.T) {
	plan := EvaluateRetentionAction(RetentionActionInput{
		Policy:          PolicyTTL,
		HasBlockingRefs: true,
		ArchiveEnabled:  true,
	})
	if plan.Action != RetentionActionSkipped || plan.Reason != RetentionReasonReferencedByModelRun || plan.ShouldDelete || plan.ShouldArchive {
		t.Fatalf("unexpected retention action plan: %#v", plan)
	}
}

func TestEvaluateRetentionActionArchiveCandidate(t *testing.T) {
	plan := EvaluateRetentionAction(RetentionActionInput{Policy: PolicyArchiveCandidate})
	if plan.Action != RetentionActionSkipped || plan.Reason != RetentionReasonArchiveExecutorMissing {
		t.Fatalf("expected archive candidate without backend to be skipped, got %#v", plan)
	}

	plan = EvaluateRetentionAction(RetentionActionInput{
		Policy:         PolicyArchiveCandidate,
		ArchiveEnabled: true,
		DryRun:         true,
	})
	if plan.Action != RetentionActionWouldArchive || plan.ShouldArchive || plan.ShouldDelete || plan.Reason != "" {
		t.Fatalf("expected dry-run archive plan, got %#v", plan)
	}

	plan = EvaluateRetentionAction(RetentionActionInput{
		Policy:         PolicyArchiveCandidate,
		ArchiveEnabled: true,
	})
	if plan.Action != RetentionActionArchived || !plan.ShouldArchive || plan.ShouldDelete || plan.Reason != "" {
		t.Fatalf("expected archive execution plan, got %#v", plan)
	}
}

func TestEvaluateRetentionActionTTL(t *testing.T) {
	plan := EvaluateRetentionAction(RetentionActionInput{Policy: PolicyTTL, DryRun: true})
	if plan.Action != RetentionActionWouldDelete || plan.ShouldDelete || plan.ShouldArchive || plan.Reason != "" {
		t.Fatalf("expected dry-run delete plan, got %#v", plan)
	}

	plan = EvaluateRetentionAction(RetentionActionInput{Policy: " " + PolicyTTL + " "})
	if plan.Action != RetentionActionDeleted || !plan.ShouldDelete || plan.ShouldArchive || plan.Reason != "" {
		t.Fatalf("expected delete execution plan, got %#v", plan)
	}
}

func TestEvaluateRetentionActionUnsupportedPolicy(t *testing.T) {
	for _, policy := range []string{"", PolicyRetainForever, "delete_now"} {
		plan := EvaluateRetentionAction(RetentionActionInput{
			Policy:         policy,
			ArchiveEnabled: true,
		})
		if plan.Action != RetentionActionSkipped || plan.Reason != RetentionReasonUnsupportedPolicy || plan.ShouldDelete || plan.ShouldArchive {
			t.Fatalf("expected unsupported policy skip for %q, got %#v", policy, plan)
		}
	}
}

func TestNewArtifactRecordProjectsUploadMetadata(t *testing.T) {
	createdAt := time.Date(2026, 6, 13, 11, 30, 0, 0, time.UTC)
	retainUntil := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	metadata := map[string]any{"source": "worker"}
	record := NewArtifactRecord(ArtifactRecordInput{
		ArtifactID:      "art_1",
		JobID:           "job_1",
		SchemaVersion:   "artifact.v1",
		ArtifactType:    "time_series_json",
		StorageProvider: "local_fs",
		ObjectKey:       "jobs/job_1/art_1.json",
		SizeBytes:       123,
		Checksum:        "sha256:abc",
		Retention:       Retention{Policy: PolicyTTL, RetainUntil: &retainUntil},
		Metadata:        metadata,
		CreatedAt:       createdAt,
	})

	if record.ArtifactID != "art_1" ||
		record.JobID != "job_1" ||
		record.SchemaVersion != "artifact.v1" ||
		record.ArtifactType != "time_series_json" ||
		record.StorageProvider != "local_fs" ||
		record.ObjectKey != "jobs/job_1/art_1.json" ||
		record.ContentType != DefaultArtifactContentType ||
		record.SizeBytes != 123 ||
		record.Checksum != "sha256:abc" ||
		record.RetentionPolicy != PolicyTTL ||
		record.RetainUntil == nil ||
		!record.RetainUntil.Equal(retainUntil) ||
		!record.CreatedAt.Equal(createdAt) {
		t.Fatalf("unexpected artifact record projection: %#v", record)
	}
	if got := record.Metadata.(map[string]any)["source"]; got != "worker" {
		t.Fatalf("expected metadata to be preserved, got %#v", record.Metadata)
	}
}

func TestNewArtifactRecordKeepsExplicitContentType(t *testing.T) {
	record := NewArtifactRecord(ArtifactRecordInput{
		ContentType: "application/x-ndjson",
		Retention:   Retention{Policy: PolicyRetainForever},
	})
	if record.ContentType != "application/x-ndjson" {
		t.Fatalf("expected explicit content type, got %q", record.ContentType)
	}
}

func TestNewArchiveRecordProjectsArchivedMetadata(t *testing.T) {
	archivedAt := time.Date(2026, 6, 13, 10, 0, 0, 0, time.UTC)
	record := NewArchiveRecord(ArchiveRecordInput{
		ArtifactID:              "art_1",
		JobID:                   "job_1",
		OriginalStorageProvider: "local_fs",
		OriginalObjectKey:       "jobs/job_1/art_1.json",
		ArchiveProvider:         "local_fs_archive",
		ArchiveObjectKey:        "archive/jobs/job_1/art_1.json",
		Checksum:                "sha256:abc",
		SizeBytes:               123,
		RetentionPolicy:         PolicyArchiveCandidate,
		ArchivedAt:              archivedAt,
	})

	if record.ArtifactID != "art_1" ||
		record.JobID != "job_1" ||
		record.OriginalStorageProvider != "local_fs" ||
		record.OriginalObjectKey != "jobs/job_1/art_1.json" ||
		record.ArchiveProvider != "local_fs_archive" ||
		record.ArchiveObjectKey != "archive/jobs/job_1/art_1.json" ||
		record.Checksum != "sha256:abc" ||
		record.SizeBytes != 123 ||
		record.Status != ArchiveStatusArchived ||
		!record.ArchivedAt.Equal(archivedAt) {
		t.Fatalf("unexpected archive record projection: %#v", record)
	}
	if record.Metadata["retention_policy"] != PolicyArchiveCandidate {
		t.Fatalf("expected retention metadata, got %#v", record.Metadata)
	}
}
