package artifacts

import (
	"errors"
	"strings"
	"time"
)

const (
	PolicyRetainForever    = "retain_forever"
	PolicyTTL              = "ttl"
	PolicyArchiveCandidate = "archive_candidate"
)

const DefaultArtifactContentType = "application/json"

const (
	RetentionActionSkipped      = "skipped"
	RetentionActionWouldArchive = "would_archive"
	RetentionActionArchived     = "archived"
	RetentionActionWouldDelete  = "would_delete"
	RetentionActionDeleted      = "deleted"
)

const (
	RetentionReasonReferencedByModelRun   = "referenced_by_model_run"
	RetentionReasonArchiveExecutorMissing = "archive_executor_not_configured"
	RetentionReasonUnsupportedPolicy      = "unsupported_retention_policy"
)

type Retention struct {
	Policy      string
	RetainUntil *time.Time
}

type ArtifactRecordInput struct {
	ArtifactID      string
	JobID           string
	SchemaVersion   string
	ArtifactType    string
	StorageProvider string
	ObjectKey       string
	ContentType     string
	SizeBytes       int64
	Checksum        string
	Retention       Retention
	Metadata        any
	CreatedAt       time.Time
}

type ArtifactRecord struct {
	ArtifactID      string
	JobID           string
	SchemaVersion   string
	ArtifactType    string
	StorageProvider string
	ObjectKey       string
	ContentType     string
	SizeBytes       int64
	Checksum        string
	RetentionPolicy string
	RetainUntil     *time.Time
	Metadata        any
	CreatedAt       time.Time
}

type RetentionActionInput struct {
	Policy          string
	HasBlockingRefs bool
	ArchiveEnabled  bool
	DryRun          bool
}

type RetentionActionPlan struct {
	Action        string
	Reason        string
	ShouldArchive bool
	ShouldDelete  bool
}

const ArchiveStatusArchived = "archived"

type ArchiveRecordInput struct {
	ArtifactID              string
	JobID                   string
	OriginalStorageProvider string
	OriginalObjectKey       string
	ArchiveProvider         string
	ArchiveObjectKey        string
	Checksum                string
	SizeBytes               int64
	RetentionPolicy         string
	ArchivedAt              time.Time
}

type ArchiveRecord struct {
	ArtifactID              string
	JobID                   string
	OriginalStorageProvider string
	OriginalObjectKey       string
	ArchiveProvider         string
	ArchiveObjectKey        string
	Checksum                string
	SizeBytes               int64
	Status                  string
	Metadata                map[string]any
	ArchivedAt              time.Time
}

type ArtifactAuditStateInput struct {
	ArtifactID      string
	JobID           string
	StorageProvider string
	ObjectKey       string
	Checksum        string
	RetentionPolicy string
	RetainUntil     *time.Time
}

type ArchiveAuditStateInput struct {
	ArtifactID       string
	JobID            string
	ArchiveProvider  string
	ArchiveObjectKey string
	Checksum         string
	SizeBytes        int64
	Status           string
	ArchivedAt       time.Time
}

func RetentionFromMetadata(metadata map[string]any) (Retention, error) {
	policy := stringValue(metadata, "retention_policy")
	if policy == "" {
		policy = PolicyRetainForever
	}
	switch policy {
	case PolicyRetainForever, PolicyTTL, PolicyArchiveCandidate:
	default:
		return Retention{}, errors.New("retention_policy is invalid")
	}
	rawRetainUntil := stringValue(metadata, "retain_until")
	if rawRetainUntil == "" {
		return Retention{Policy: policy}, nil
	}
	retainUntil, err := time.Parse(time.RFC3339Nano, rawRetainUntil)
	if err != nil {
		return Retention{}, errors.New("retain_until must be RFC3339")
	}
	return Retention{Policy: policy, RetainUntil: &retainUntil}, nil
}

func IsRetentionCandidate(policy string) bool {
	switch strings.TrimSpace(policy) {
	case PolicyTTL, PolicyArchiveCandidate:
		return true
	default:
		return false
	}
}

func EvaluateRetentionAction(input RetentionActionInput) RetentionActionPlan {
	if input.HasBlockingRefs {
		return RetentionActionPlan{
			Action: RetentionActionSkipped,
			Reason: RetentionReasonReferencedByModelRun,
		}
	}
	switch strings.TrimSpace(input.Policy) {
	case PolicyArchiveCandidate:
		if !input.ArchiveEnabled {
			return RetentionActionPlan{
				Action: RetentionActionSkipped,
				Reason: RetentionReasonArchiveExecutorMissing,
			}
		}
		if input.DryRun {
			return RetentionActionPlan{Action: RetentionActionWouldArchive}
		}
		return RetentionActionPlan{
			Action:        RetentionActionArchived,
			ShouldArchive: true,
		}
	case PolicyTTL:
		if input.DryRun {
			return RetentionActionPlan{Action: RetentionActionWouldDelete}
		}
		return RetentionActionPlan{
			Action:       RetentionActionDeleted,
			ShouldDelete: true,
		}
	default:
		return RetentionActionPlan{
			Action: RetentionActionSkipped,
			Reason: RetentionReasonUnsupportedPolicy,
		}
	}
}

func NewArtifactRecord(input ArtifactRecordInput) ArtifactRecord {
	return ArtifactRecord{
		ArtifactID:      input.ArtifactID,
		JobID:           input.JobID,
		SchemaVersion:   input.SchemaVersion,
		ArtifactType:    input.ArtifactType,
		StorageProvider: input.StorageProvider,
		ObjectKey:       input.ObjectKey,
		ContentType:     defaultString(input.ContentType, DefaultArtifactContentType),
		SizeBytes:       input.SizeBytes,
		Checksum:        input.Checksum,
		RetentionPolicy: input.Retention.Policy,
		RetainUntil:     input.Retention.RetainUntil,
		Metadata:        input.Metadata,
		CreatedAt:       input.CreatedAt,
	}
}

func NewArchiveRecord(input ArchiveRecordInput) ArchiveRecord {
	return ArchiveRecord{
		ArtifactID:              input.ArtifactID,
		JobID:                   input.JobID,
		OriginalStorageProvider: input.OriginalStorageProvider,
		OriginalObjectKey:       input.OriginalObjectKey,
		ArchiveProvider:         input.ArchiveProvider,
		ArchiveObjectKey:        input.ArchiveObjectKey,
		Checksum:                input.Checksum,
		SizeBytes:               input.SizeBytes,
		Status:                  ArchiveStatusArchived,
		Metadata:                map[string]any{"retention_policy": input.RetentionPolicy},
		ArchivedAt:              input.ArchivedAt,
	}
}

func ArtifactAuditState(input ArtifactAuditStateInput) map[string]any {
	return map[string]any{
		"artifact_id":      input.ArtifactID,
		"job_id":           input.JobID,
		"storage_provider": input.StorageProvider,
		"object_key":       input.ObjectKey,
		"checksum":         input.Checksum,
		"retention_policy": input.RetentionPolicy,
		"retain_until":     input.RetainUntil,
	}
}

func ArchiveAuditState(input ArchiveAuditStateInput) map[string]any {
	return map[string]any{
		"artifact_id":        input.ArtifactID,
		"job_id":             input.JobID,
		"archive_provider":   input.ArchiveProvider,
		"archive_object_key": input.ArchiveObjectKey,
		"checksum":           input.Checksum,
		"size_bytes":         input.SizeBytes,
		"status":             input.Status,
		"archived_at":        input.ArchivedAt,
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}
