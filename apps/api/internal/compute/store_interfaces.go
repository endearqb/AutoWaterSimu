package compute

import (
	"context"
	"encoding/json"
	"time"
)

type Store interface {
	JobStore
	WorkerStore
	ArtifactMetadataStore
	ArchiveMetadataStore
	ModelRunStore
	BenchmarkRunStore
	ModelCatalogStore
	ProcessGraphStore
	SimulationInputStore
	DraftConfirmationStore
	ResultExplanationStore
	MetricsStore
}

type JobStore interface {
	FindJobByID(ctx context.Context, jobID string) (*JobRecord, error)
	FindJobByIdempotency(ctx context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error)
	InsertJob(ctx context.Context, job JobRecord, events []EventRecord) error
	ListJobs(ctx context.Context, filter ListFilter) ([]JobRecord, string, int, error)
	Events(ctx context.Context, jobID string) ([]EventRecord, error)
	CancelJob(ctx context.Context, jobID string, now time.Time) (*JobRecord, error)
	CompleteJob(ctx context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error)
	TimeoutExpired(ctx context.Context, now time.Time) ([]JobRecord, error)
}

type WorkerStore interface {
	UpsertWorker(ctx context.Context, worker WorkerRecord) error
	FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error)
	ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time) (*JobRecord, error)
	Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error)
}

type ArtifactMetadataStore interface {
	Artifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error)
	FindArtifact(ctx context.Context, artifactID string) (*ArtifactRecord, error)
	InsertArtifact(ctx context.Context, artifact ArtifactRecord, event EventRecord) error
	ListArtifactRetentionCandidates(ctx context.Context, now time.Time, limit int) ([]ArtifactRecord, error)
	ArtifactReferences(ctx context.Context, artifactID string) ([]string, error)
	DeleteArtifact(ctx context.Context, artifactID string, event EventRecord) error
}

type ArchiveMetadataStore interface {
	UpsertArtifactArchive(ctx context.Context, archive ArtifactArchiveRecord, event EventRecord) error
	FindArtifactArchive(ctx context.Context, artifactID string) (*ArtifactArchiveRecord, error)
}

type ModelRunStore interface {
	InsertModelRuns(ctx context.Context, jobID string, modelRuns []json.RawMessage, now time.Time) error
	FindModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error)
	ListModelRuns(ctx context.Context, filter ModelRunFilter) ([]json.RawMessage, string, int, error)
	ModelRuns(ctx context.Context, jobID string) ([]json.RawMessage, error)
}

type BenchmarkRunStore interface {
	UpsertBenchmarkRun(ctx context.Context, record BenchmarkRunRecord) (BenchmarkRunRecord, bool, error)
	FindBenchmarkRun(ctx context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error)
	ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error)
}

type ModelCatalogStore interface {
	UpsertModelCatalog(ctx context.Context, record ModelCatalogRecord) (ModelCatalogRecord, bool, error)
	LatestModelCatalog(ctx context.Context, catalogID string) (*ModelCatalogRecord, error)
	ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) ([]ModelCatalogRecord, string, int, error)
}

type ProcessGraphStore interface {
	UpsertProcessGraph(ctx context.Context, record ProcessGraphRecord) (bool, error)
	FindProcessGraph(ctx context.Context, processGraphID string, version int) (*ProcessGraphRecord, error)
}

type SimulationInputStore interface {
	UpsertSimulationInput(ctx context.Context, record SimulationInputRecord) (bool, error)
	FindSimulationInput(ctx context.Context, simulationInputID string) (*SimulationInputRecord, error)
}

type DraftConfirmationStore interface {
	UpsertDraftConfirmation(ctx context.Context, record DraftConfirmationRecord) (bool, error)
	FindDraftConfirmation(ctx context.Context, confirmationID string) (*DraftConfirmationRecord, error)
}

type ResultExplanationStore interface {
	UpsertResultExplanation(ctx context.Context, record ResultExplanationRecord) (bool, error)
	FindResultExplanation(ctx context.Context, jobID, explanationID string) (*ResultExplanationRecord, error)
	UpdateResultExplanationReview(ctx context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time) (*ResultExplanationRecord, error)
	PublishResultExplanation(ctx context.Context, jobID, explanationID, publishedBy string, now time.Time) (*ResultExplanationRecord, error)
}

type MetricsStore interface {
	Metrics(ctx context.Context, now time.Time) (MetricsSnapshot, error)
}

type ListFilter struct {
	Limit         int
	Cursor        string
	Status        string
	JobType       string
	TenantID      string
	ProjectID     string
	SiteID        string
	CreatedAfter  *time.Time
	CreatedBefore *time.Time
}

type ModelRunFilter struct {
	Limit        int
	Cursor       string
	JobID        string
	ModelKey     string
	ModelVersion string
}
