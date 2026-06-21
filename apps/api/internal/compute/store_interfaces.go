package compute

import (
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
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
	MutationAuditStore
	ScenarioStore
	CanvasGraphStore
	ContextSnapshotStore
	UDMModelStore
	UDMHybridConfigStore
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
	CancelJob(ctx context.Context, jobID string, mutation domainjobs.StateMutation) (*JobRecord, error)
	CompleteJob(ctx context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error)
	TimeoutExpired(ctx context.Context, mutation domainjobs.StateMutation) ([]JobRecord, error)
}

type WorkerStore interface {
	UpsertWorker(ctx context.Context, worker WorkerRecord) error
	FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error)
	ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time, filter ListFilter) (*JobRecord, error)
	Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error)
}

type ArtifactMetadataStore interface {
	Artifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error)
	FindArtifact(ctx context.Context, artifactID string) (*ArtifactRecord, error)
	InsertArtifact(ctx context.Context, artifact ArtifactRecord, event EventRecord) error
	ListArtifactRetentionCandidates(ctx context.Context, now time.Time, limit int, filter ListFilter) ([]ArtifactRecord, error)
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
	UpsertBenchmarkRun(ctx context.Context, record BenchmarkRunRecord, audit *MutationAuditRecord) (BenchmarkRunRecord, bool, error)
	FindBenchmarkRun(ctx context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error)
	ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error)
}

type ModelCatalogStore interface {
	UpsertModelCatalog(ctx context.Context, record ModelCatalogRecord, audit *MutationAuditRecord) (ModelCatalogRecord, bool, error)
	LatestModelCatalog(ctx context.Context, catalogID string) (*ModelCatalogRecord, error)
	ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) ([]ModelCatalogRecord, string, int, error)
}

type MutationAuditStore interface {
	ListMutationAuditEvents(ctx context.Context, filter MutationAuditFilter) ([]MutationAuditRecord, string, int, error)
}

type ScenarioStore interface {
	InsertScenario(ctx context.Context, record ScenarioRecord) error
	UpdateScenario(ctx context.Context, record ScenarioRecord) error
	FindScenario(ctx context.Context, scenarioID string) (*ScenarioRecord, error)
	ListScenarios(ctx context.Context, filter ScenarioFilter) ([]ScenarioRecord, string, int, error)
}

type CanvasGraphStore interface {
	InsertCanvasGraph(ctx context.Context, record CanvasGraphRecord) error
	FindCanvasGraph(ctx context.Context, graphID string, version int) (*CanvasGraphRecord, error)
	LatestCanvasGraph(ctx context.Context, graphID string) (*CanvasGraphRecord, error)
	ListCanvasGraphs(ctx context.Context, filter CanvasGraphFilter) ([]CanvasGraphRecord, string, int, error)
	ArchiveCanvasGraph(ctx context.Context, graphID string, archivedAt time.Time) error
}

type ContextSnapshotStore interface {
	InsertContextSnapshot(ctx context.Context, record ContextSnapshotRecord) error
	FindContextSnapshot(ctx context.Context, snapshotID string) (*ContextSnapshotRecord, error)
	ListContextSnapshots(ctx context.Context, filter ContextSnapshotFilter) ([]ContextSnapshotRecord, string, int, error)
}

type UDMModelStore interface {
	InsertUDMModelWithVersion(ctx context.Context, model UDMModelRecord, version UDMModelVersionRecord) error
	UpdateUDMModel(ctx context.Context, model UDMModelRecord) error
	InsertUDMModelVersion(ctx context.Context, version UDMModelVersionRecord) error
	FindUDMModel(ctx context.Context, modelID string) (*UDMModelRecord, error)
	FindUDMModelVersion(ctx context.Context, modelID string, version int) (*UDMModelVersionRecord, error)
	ListUDMModelVersions(ctx context.Context, modelID string) ([]UDMModelVersionRecord, error)
	ListUDMModels(ctx context.Context, filter UDMModelFilter) ([]UDMModelRecord, int, error)
}

type UDMHybridConfigStore interface {
	InsertUDMHybridConfig(ctx context.Context, record UDMHybridConfigRecord) error
	UpdateUDMHybridConfig(ctx context.Context, record UDMHybridConfigRecord) error
	FindUDMHybridConfig(ctx context.Context, configID string) (*UDMHybridConfigRecord, error)
	ListUDMHybridConfigs(ctx context.Context, filter UDMHybridConfigFilter) ([]UDMHybridConfigRecord, int, error)
}

type ProcessGraphStore interface {
	UpsertProcessGraph(ctx context.Context, record ProcessGraphRecord, audit *MutationAuditRecord) (bool, error)
	FindProcessGraph(ctx context.Context, processGraphID string, version int) (*ProcessGraphRecord, error)
}

type SimulationInputStore interface {
	UpsertSimulationInput(ctx context.Context, record SimulationInputRecord, audit *MutationAuditRecord) (bool, error)
	FindSimulationInput(ctx context.Context, simulationInputID string) (*SimulationInputRecord, error)
}

type DraftConfirmationStore interface {
	UpsertDraftConfirmation(ctx context.Context, record DraftConfirmationRecord, audit *MutationAuditRecord) (bool, error)
	FindDraftConfirmation(ctx context.Context, confirmationID string) (*DraftConfirmationRecord, error)
}

type ResultExplanationStore interface {
	UpsertResultExplanation(ctx context.Context, record ResultExplanationRecord, createdEvent *EventRecord) (bool, error)
	FindResultExplanation(ctx context.Context, jobID, explanationID string) (*ResultExplanationRecord, error)
	UpdateResultExplanationReview(ctx context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time, event *EventRecord) (*ResultExplanationRecord, error)
	PublishResultExplanation(ctx context.Context, jobID, explanationID, publishedBy string, now time.Time, event *EventRecord) (*ResultExplanationRecord, error)
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

type ScenarioFilter struct {
	Limit     int
	Cursor    string
	Status    string
	TenantID  string
	ProjectID string
	SiteID    string
}

type CanvasGraphFilter struct {
	Limit      int
	Cursor     string
	ScenarioID string
	TenantID   string
	ProjectID  string
	SiteID     string
}

type ContextSnapshotFilter struct {
	Limit      int
	Cursor     string
	ScenarioID string
	TenantID   string
	ProjectID  string
	SiteID     string
}

type UDMModelFilter struct {
	Skip      int
	Limit     int
	Query     string
	TenantID  string
	ProjectID string
	SiteID    string
}

type UDMHybridConfigFilter struct {
	Skip      int
	Limit     int
	TenantID  string
	ProjectID string
	SiteID    string
}

type ModelRunFilter struct {
	Limit        int
	Cursor       string
	JobID        string
	ModelKey     string
	ModelVersion string
}
