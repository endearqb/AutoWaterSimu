package compute

import (
	"encoding/json"
	"time"

	domainagent "autowatersimu/apps/api/internal/domain/agent"
	domainjobs "autowatersimu/apps/api/internal/domain/jobs"
	domainworkers "autowatersimu/apps/api/internal/domain/workers"
	platformcontracts "autowatersimu/apps/api/internal/platform/contracts"
	platformmetrics "autowatersimu/apps/api/internal/platform/metrics"
)

const (
	StatusCreated   = domainjobs.StatusCreated
	StatusQueued    = domainjobs.StatusQueued
	StatusRunning   = domainjobs.StatusRunning
	StatusSucceeded = domainjobs.StatusSucceeded
	StatusFailed    = domainjobs.StatusFailed
	StatusCancelled = domainjobs.StatusCancelled
	StatusTimedOut  = domainjobs.StatusTimedOut

	DefaultLeaseSeconds = 90
	MaxAttempts         = 1
)

type ComputeJob struct {
	SchemaVersion  string         `json:"schema_version"`
	JobID          string         `json:"job_id"`
	JobType        string         `json:"job_type"`
	Queue          string         `json:"queue"`
	RequestID      string         `json:"request_id"`
	IdempotencyKey string         `json:"idempotency_key"`
	Payload        map[string]any `json:"payload"`
	Context        JobContext     `json:"context"`
	Execution      map[string]any `json:"execution"`
	CreatedAt      string         `json:"created_at,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
	Raw            map[string]any `json:"-"`
}

type JobContext struct {
	SourceSystem string `json:"source_system"`
	RequestedBy  string `json:"requested_by"`
	TraceID      string `json:"trace_id"`
	TenantID     string `json:"tenant_id,omitempty"`
	ProjectID    string `json:"project_id,omitempty"`
	SiteID       string `json:"site_id,omitempty"`
}

type JobRecord struct {
	JobID           string          `json:"job_id"`
	SchemaVersion   string          `json:"schema_version"`
	JobType         string          `json:"job_type"`
	Queue           string          `json:"queue"`
	Status          string          `json:"status"`
	RequestID       string          `json:"request_id"`
	IdempotencyKey  string          `json:"idempotency_key"`
	SourceSystem    string          `json:"source_system"`
	RequestedBy     string          `json:"requested_by"`
	TraceID         string          `json:"trace_id"`
	TenantID        string          `json:"tenant_id,omitempty"`
	ProjectID       string          `json:"project_id,omitempty"`
	SiteID          string          `json:"site_id,omitempty"`
	CreatedBy       string          `json:"created_by,omitempty"`
	PayloadHash     string          `json:"payload_hash"`
	InputJSON       json.RawMessage `json:"input_json,omitempty"`
	Summary         json.RawMessage `json:"summary,omitempty"`
	ResultHash      string          `json:"result_hash,omitempty"`
	WorkerID        string          `json:"worker_id,omitempty"`
	Attempt         int             `json:"attempt"`
	CancelRequested bool            `json:"cancel_requested"`
	ClaimedAt       *time.Time      `json:"claimed_at,omitempty"`
	LeaseExpiresAt  *time.Time      `json:"lease_expires_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	QueuedAt        *time.Time      `json:"queued_at,omitempty"`
	StartedAt       *time.Time      `json:"started_at,omitempty"`
	FinishedAt      *time.Time      `json:"finished_at,omitempty"`
	ErrorCode       string          `json:"error_code,omitempty"`
	ErrorMessage    string          `json:"error_message,omitempty"`
}

type EventRecord struct {
	ID        int64           `json:"id"`
	JobID     string          `json:"job_id"`
	EventType string          `json:"event_type"`
	EventJSON json.RawMessage `json:"event"`
	CreatedAt time.Time       `json:"created_at"`
}

type MutationAuditRecord struct {
	ID           int64           `json:"id"`
	EventType    string          `json:"event_type"`
	TargetObject string          `json:"target_object"`
	TargetID     string          `json:"target_id"`
	EventJSON    json.RawMessage `json:"event"`
	CreatedAt    time.Time       `json:"created_at"`
}

type MutationAuditFilter struct {
	Limit        int
	Cursor       string
	EventType    string
	TargetObject string
	TargetID     string
}

type ScenarioRecord struct {
	ScenarioID                   string          `json:"scenario_id"`
	Name                         string          `json:"name"`
	Description                  string          `json:"description,omitempty"`
	ModelFamily                  string          `json:"model_family"`
	Status                       string          `json:"status"`
	Version                      int             `json:"version"`
	CurrentCanvasGraphID         string          `json:"current_canvas_graph_id,omitempty"`
	CurrentCanvasGraphVersion    int             `json:"current_canvas_graph_version,omitempty"`
	PublishedProcessGraphID      string          `json:"published_process_graph_id,omitempty"`
	PublishedProcessGraphVersion int             `json:"published_process_graph_version,omitempty"`
	CurrentSimulationInputID     string          `json:"current_simulation_input_id,omitempty"`
	ContextSnapshotID            string          `json:"context_snapshot_id,omitempty"`
	SourceScenarioID             string          `json:"source_scenario_id,omitempty"`
	LastJobID                    string          `json:"last_job_id,omitempty"`
	SourceSystem                 string          `json:"source_system"`
	RequestedBy                  string          `json:"requested_by"`
	TenantID                     string          `json:"tenant_id,omitempty"`
	ProjectID                    string          `json:"project_id,omitempty"`
	SiteID                       string          `json:"site_id,omitempty"`
	Metadata                     json.RawMessage `json:"metadata,omitempty"`
	CreatedAt                    time.Time       `json:"created_at"`
	UpdatedAt                    time.Time       `json:"updated_at"`
	ArchivedAt                   *time.Time      `json:"archived_at,omitempty"`
}

type ListScenariosResponse struct {
	Items         []ScenarioRecord `json:"items"`
	NextCursor    string           `json:"next_cursor,omitempty"`
	TotalEstimate int              `json:"total_estimate"`
}

type ScenarioUpsertRequest struct {
	ScenarioID                   string         `json:"scenario_id,omitempty"`
	Name                         string         `json:"name,omitempty"`
	Description                  string         `json:"description,omitempty"`
	ModelFamily                  string         `json:"model_family,omitempty"`
	Status                       string         `json:"status,omitempty"`
	CurrentCanvasGraphID         string         `json:"current_canvas_graph_id,omitempty"`
	CurrentCanvasGraphVersion    int            `json:"current_canvas_graph_version,omitempty"`
	PublishedProcessGraphID      string         `json:"published_process_graph_id,omitempty"`
	PublishedProcessGraphVersion int            `json:"published_process_graph_version,omitempty"`
	CurrentSimulationInputID     string         `json:"current_simulation_input_id,omitempty"`
	ContextSnapshotID            string         `json:"context_snapshot_id,omitempty"`
	LastJobID                    string         `json:"last_job_id,omitempty"`
	SourceSystem                 string         `json:"source_system,omitempty"`
	Metadata                     map[string]any `json:"metadata,omitempty"`
}

type ScenarioCloneRequest struct {
	ScenarioID  string         `json:"scenario_id,omitempty"`
	Name        string         `json:"name,omitempty"`
	Description string         `json:"description,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type ScenarioRunRequest struct {
	RequestID         string         `json:"request_id,omitempty"`
	JobType           string         `json:"job_type,omitempty"`
	IdempotencyKey    string         `json:"idempotency_key,omitempty"`
	TraceID           string         `json:"trace_id,omitempty"`
	SimulationInputID string         `json:"simulation_input_id,omitempty"`
	Parameters        map[string]any `json:"parameters,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

type CanvasGraphRecord struct {
	GraphID       string          `json:"graph_id"`
	ScenarioID    string          `json:"scenario_id,omitempty"`
	SchemaVersion string          `json:"schema_version"`
	Name          string          `json:"name"`
	Version       int             `json:"version"`
	PayloadHash   string          `json:"payload_hash"`
	Payload       json.RawMessage `json:"payload"`
	SourceSystem  string          `json:"source_system"`
	RequestedBy   string          `json:"requested_by"`
	TenantID      string          `json:"tenant_id,omitempty"`
	ProjectID     string          `json:"project_id,omitempty"`
	SiteID        string          `json:"site_id,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	ArchivedAt    *time.Time      `json:"archived_at,omitempty"`
}

type ListCanvasGraphsResponse struct {
	Items         []CanvasGraphRecord `json:"items"`
	NextCursor    string              `json:"next_cursor,omitempty"`
	TotalEstimate int                 `json:"total_estimate"`
}

type CanvasGraphSaveRequest struct {
	ScenarioID   string         `json:"scenario_id,omitempty"`
	GraphID      string         `json:"graph_id,omitempty"`
	Name         string         `json:"name,omitempty"`
	CanvasGraph  map[string]any `json:"canvas_graph,omitempty"`
	SourceSystem string         `json:"source_system,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type CanvasGraphPublishRequest struct {
	ProcessGraph            map[string]any `json:"process_graph,omitempty"`
	Parameters              map[string]any `json:"parameters,omitempty"`
	SimulationInputID       string         `json:"simulation_input_id,omitempty"`
	RegisterSimulationInput bool           `json:"register_simulation_input,omitempty"`
}

type CanvasGraphPublishResponse struct {
	CanvasGraph     CanvasGraphRecord      `json:"canvas_graph"`
	ProcessGraph    ProcessGraphRecord     `json:"process_graph"`
	SimulationInput *SimulationInputRecord `json:"simulation_input,omitempty"`
	Validation      map[string]any         `json:"validation,omitempty"`
}

type ContextSnapshotRecord struct {
	ContextSnapshotID string          `json:"context_snapshot_id"`
	ScenarioID        string          `json:"scenario_id,omitempty"`
	SchemaVersion     string          `json:"schema_version"`
	SourceSystem      string          `json:"source_system"`
	CapturedAt        time.Time       `json:"captured_at"`
	PayloadHash       string          `json:"payload_hash"`
	Payload           json.RawMessage `json:"payload"`
	TenantID          string          `json:"tenant_id,omitempty"`
	ProjectID         string          `json:"project_id,omitempty"`
	SiteID            string          `json:"site_id,omitempty"`
	Metadata          json.RawMessage `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type ListContextSnapshotsResponse struct {
	Items         []ContextSnapshotRecord `json:"items"`
	NextCursor    string                  `json:"next_cursor,omitempty"`
	TotalEstimate int                     `json:"total_estimate"`
}

type ContextSnapshotCreateRequest struct {
	ContextSnapshotID string         `json:"context_snapshot_id,omitempty"`
	ScenarioID        string         `json:"scenario_id,omitempty"`
	SourceSystem      string         `json:"source_system,omitempty"`
	Context           map[string]any `json:"context,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

type UDMValidationLocation struct {
	Section       string `json:"section,omitempty"`
	ProcessName   string `json:"processName,omitempty"`
	ComponentName string `json:"componentName,omitempty"`
	ParameterName string `json:"parameterName,omitempty"`
	CellKey       string `json:"cellKey,omitempty"`
}

type UDMValidationIssue struct {
	Code     string                 `json:"code"`
	Message  string                 `json:"message"`
	Process  string                 `json:"process,omitempty"`
	Location *UDMValidationLocation `json:"location,omitempty"`
}

type UDMContinuityCheckItem struct {
	ProcessName  string         `json:"process_name"`
	Dimension    string         `json:"dimension"`
	BalanceValue float64        `json:"balance_value"`
	Status       string         `json:"status"`
	Explanation  string         `json:"explanation"`
	Suggestion   string         `json:"suggestion,omitempty"`
	Details      map[string]any `json:"details,omitempty"`
}

type UDMValidationResponse struct {
	OK                  bool                     `json:"ok"`
	Errors              []UDMValidationIssue     `json:"errors"`
	Warnings            []UDMValidationIssue     `json:"warnings"`
	ExtractedParameters []string                 `json:"extracted_parameters"`
	ContinuityChecks    []UDMContinuityCheckItem `json:"continuity_checks"`
}

type UDMModelRecord struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Description    string          `json:"description,omitempty"`
	Tags           []string        `json:"tags"`
	CurrentVersion int             `json:"current_version"`
	IsPublished    bool            `json:"is_published"`
	OwnerID        string          `json:"owner_id"`
	SourceSystem   string          `json:"source_system"`
	RequestedBy    string          `json:"requested_by"`
	TenantID       string          `json:"tenant_id,omitempty"`
	ProjectID      string          `json:"project_id,omitempty"`
	SiteID         string          `json:"site_id,omitempty"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	ArchivedAt     *time.Time      `json:"archived_at,omitempty"`
}

type UDMModelVersionRecord struct {
	ID               string          `json:"id"`
	ModelID          string          `json:"model_id"`
	Version          int             `json:"version"`
	ContentHash      string          `json:"content_hash"`
	ParameterHash    string          `json:"parameter_hash,omitempty"`
	Components       json.RawMessage `json:"components"`
	Parameters       json.RawMessage `json:"parameters"`
	Processes        json.RawMessage `json:"processes"`
	Meta             json.RawMessage `json:"meta,omitempty"`
	ValidationOK     bool            `json:"validation_ok"`
	ValidationErrors json.RawMessage `json:"validation_errors"`
	SeedSource       string          `json:"seed_source,omitempty"`
	SourceSystem     string          `json:"source_system"`
	RequestedBy      string          `json:"requested_by"`
	OwnerID          string          `json:"owner_id"`
	TenantID         string          `json:"tenant_id,omitempty"`
	ProjectID        string          `json:"project_id,omitempty"`
	SiteID           string          `json:"site_id,omitempty"`
	Metadata         json.RawMessage `json:"metadata,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type UDMModelPublic struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description,omitempty"`
	Tags           []string  `json:"tags"`
	CurrentVersion int       `json:"current_version"`
	IsPublished    bool      `json:"is_published"`
	OwnerID        string    `json:"owner_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UDMModelVersionPublic struct {
	ID               string           `json:"id"`
	ModelID          string           `json:"model_id"`
	Version          int              `json:"version"`
	ContentHash      string           `json:"content_hash"`
	ParameterHash    string           `json:"parameter_hash,omitempty"`
	Components       []map[string]any `json:"components"`
	Parameters       []map[string]any `json:"parameters"`
	Processes        []map[string]any `json:"processes"`
	Meta             map[string]any   `json:"meta,omitempty"`
	ValidationOK     bool             `json:"validation_ok"`
	ValidationErrors []map[string]any `json:"validation_errors"`
	SeedSource       string           `json:"seed_source,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

type UDMModelDetailPublic struct {
	UDMModelPublic
	LatestVersion *UDMModelVersionPublic  `json:"latest_version,omitempty"`
	Versions      []UDMModelVersionPublic `json:"versions"`
}

type ListUDMModelsResponse struct {
	Data  []UDMModelPublic `json:"data"`
	Count int              `json:"count"`
}

type UDMModelDefinitionDraft struct {
	Name        string           `json:"name,omitempty"`
	Description string           `json:"description,omitempty"`
	Tags        []string         `json:"tags,omitempty"`
	Components  []map[string]any `json:"components"`
	Parameters  []map[string]any `json:"parameters"`
	Processes   []map[string]any `json:"processes"`
	Meta        map[string]any   `json:"meta,omitempty"`
}

type UDMModelCreateRequest struct {
	UDMModelDefinitionDraft
	SeedSource   string         `json:"seed_source,omitempty"`
	SourceSystem string         `json:"source_system,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type UDMModelUpdateRequest struct {
	Name         *string          `json:"name,omitempty"`
	Description  *string          `json:"description,omitempty"`
	Tags         []string         `json:"tags,omitempty"`
	Components   []map[string]any `json:"components,omitempty"`
	Parameters   []map[string]any `json:"parameters,omitempty"`
	Processes    []map[string]any `json:"processes,omitempty"`
	Meta         map[string]any   `json:"meta,omitempty"`
	IsPublished  *bool            `json:"is_published,omitempty"`
	SourceSystem string           `json:"source_system,omitempty"`
	Metadata     map[string]any   `json:"metadata,omitempty"`
	replaceTags  bool
	replaceMeta  bool
	replaceDef   bool
}

type UDMModelCreateFromTemplateRequest struct {
	TemplateKey  string         `json:"template_key"`
	Name         string         `json:"name,omitempty"`
	Description  string         `json:"description,omitempty"`
	SourceSystem string         `json:"source_system,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type UDMSeedTemplateSummary struct {
	Key             string   `json:"key"`
	Name            string   `json:"name"`
	Description     string   `json:"description,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	ComponentsCount int      `json:"components_count,omitempty"`
	ProcessesCount  int      `json:"processes_count,omitempty"`
	ParametersCount int      `json:"parameters_count,omitempty"`
}

type UDMHybridValidationResponse struct {
	IsValid                bool           `json:"is_valid"`
	Errors                 []string       `json:"errors"`
	Warnings               []string       `json:"warnings"`
	Details                map[string]any `json:"details"`
	NormalizedHybridConfig map[string]any `json:"normalized_hybrid_config,omitempty"`
	ParameterHash          string         `json:"parameter_hash,omitempty"`
}

type UDMHybridConfigRecord struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	Description   string          `json:"description,omitempty"`
	HybridConfig  json.RawMessage `json:"hybrid_config"`
	ParameterHash string          `json:"parameter_hash"`
	Validation    json.RawMessage `json:"validation,omitempty"`
	OwnerID       string          `json:"owner_id"`
	SourceSystem  string          `json:"source_system"`
	RequestedBy   string          `json:"requested_by"`
	TenantID      string          `json:"tenant_id,omitempty"`
	ProjectID     string          `json:"project_id,omitempty"`
	SiteID        string          `json:"site_id,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	ArchivedAt    *time.Time      `json:"archived_at,omitempty"`
}

type UDMHybridConfigPublic struct {
	ID            string         `json:"id"`
	OwnerID       string         `json:"owner_id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	Name          string         `json:"name"`
	Description   string         `json:"description,omitempty"`
	HybridConfig  map[string]any `json:"hybrid_config"`
	ParameterHash string         `json:"parameter_hash,omitempty"`
}

type ListUDMHybridConfigsResponse struct {
	Data  []UDMHybridConfigPublic `json:"data"`
	Count int                     `json:"count"`
}

type UDMHybridConfigCreateRequest struct {
	Name         string         `json:"name"`
	Description  string         `json:"description,omitempty"`
	HybridConfig map[string]any `json:"hybrid_config"`
	SourceSystem string         `json:"source_system,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type UDMHybridConfigUpdateRequest struct {
	Name          *string        `json:"name,omitempty"`
	Description   *string        `json:"description,omitempty"`
	HybridConfig  map[string]any `json:"hybrid_config,omitempty"`
	SourceSystem  string         `json:"source_system,omitempty"`
	Metadata      map[string]any `json:"metadata,omitempty"`
	replaceConfig bool
}

type ArtifactRecord struct {
	ArtifactID      string          `json:"artifact_id"`
	JobID           string          `json:"job_id"`
	SchemaVersion   string          `json:"schema_version"`
	ArtifactType    string          `json:"artifact_type"`
	StorageProvider string          `json:"storage_provider"`
	ObjectKey       string          `json:"object_key"`
	ContentType     string          `json:"content_type"`
	SizeBytes       int64           `json:"size_bytes"`
	Checksum        string          `json:"checksum"`
	RetentionPolicy string          `json:"retention_policy"`
	RetainUntil     *time.Time      `json:"retain_until,omitempty"`
	Metadata        json.RawMessage `json:"metadata,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type ArtifactArchiveRecord struct {
	ArtifactID              string          `json:"artifact_id"`
	JobID                   string          `json:"job_id"`
	OriginalStorageProvider string          `json:"original_storage_provider"`
	OriginalObjectKey       string          `json:"original_object_key"`
	ArchiveProvider         string          `json:"archive_provider"`
	ArchiveObjectKey        string          `json:"archive_object_key"`
	Checksum                string          `json:"checksum"`
	SizeBytes               int64           `json:"size_bytes"`
	Status                  string          `json:"status"`
	Metadata                json.RawMessage `json:"metadata,omitempty"`
	ArchivedAt              time.Time       `json:"archived_at"`
}

type ArtifactRetentionSweepOptions struct {
	DryRun    bool
	Limit     int
	Now       time.Time
	DataScope ListFilter
}

type ArtifactRetentionSchedulerOptions struct {
	Interval time.Duration
	DryRun   bool
	Limit    int
}

type ArtifactRetentionSweepRequest struct {
	DryRun *bool `json:"dry_run,omitempty"`
	Limit  int   `json:"limit,omitempty"`
}

type ArtifactRetentionSweepReport struct {
	SchemaVersion string                    `json:"schema_version"`
	DryRun        bool                      `json:"dry_run"`
	Checked       int                       `json:"checked"`
	Deleted       int                       `json:"deleted"`
	Archived      int                       `json:"archived"`
	Skipped       int                       `json:"skipped"`
	Items         []ArtifactRetentionAction `json:"items"`
	GeneratedAt   time.Time                 `json:"generated_at"`
}

type ArtifactRetentionAction struct {
	ArtifactID       string     `json:"artifact_id"`
	JobID            string     `json:"job_id"`
	RetentionPolicy  string     `json:"retention_policy"`
	RetainUntil      *time.Time `json:"retain_until,omitempty"`
	Action           string     `json:"action"`
	Reason           string     `json:"reason,omitempty"`
	BlockingRefs     []string   `json:"blocking_refs,omitempty"`
	ArchiveProvider  string     `json:"archive_provider,omitempty"`
	ArchiveObjectKey string     `json:"archive_object_key,omitempty"`
}

type MetricsSnapshot = platformmetrics.Snapshot

type WorkerRecord = domainworkers.Record

type JobSnapshot struct {
	Job        JobRecord        `json:"job"`
	Artifacts  []ArtifactRecord `json:"artifacts"`
	EventCount int              `json:"event_count"`
}

type ListJobsResponse struct {
	Items         []JobSnapshot `json:"items"`
	NextCursor    string        `json:"next_cursor,omitempty"`
	TotalEstimate int           `json:"total_estimate"`
}

type ListModelRunsResponse struct {
	Items         []any  `json:"items"`
	NextCursor    string `json:"next_cursor,omitempty"`
	TotalEstimate int    `json:"total_estimate"`
}

type EvidenceReferenceResolution struct {
	JobID       string `json:"job_id"`
	EvidenceRef string `json:"evidence_ref"`
	RefType     string `json:"ref_type"`
	RefID       string `json:"ref_id"`
	Resolved    bool   `json:"resolved"`
	Payload     any    `json:"payload,omitempty"`
}

type ProductionReadinessReport struct {
	SchemaVersion            string                         `json:"schema_version"`
	JobID                    string                         `json:"job_id"`
	EvidencePackageID        string                         `json:"evidence_package_id"`
	PolicyVersion            string                         `json:"policy_version"`
	ReadinessStatus          string                         `json:"readiness_status"`
	ProductionReady          bool                           `json:"production_ready"`
	ExternalApprovalRequired bool                           `json:"external_approval_required"`
	AutoPublishAllowed       bool                           `json:"auto_publish_allowed"`
	BlockingReasons          []string                       `json:"blocking_reasons"`
	Warnings                 []string                       `json:"warnings"`
	Checks                   []ProductionReadinessCheck     `json:"checks"`
	RiskFindingsSummary      ProductionReadinessRiskSummary `json:"risk_findings_summary"`
	GeneratedAt              string                         `json:"generated_at"`
	Metadata                 map[string]any                 `json:"metadata,omitempty"`
}

type ProductionReadinessCheck struct {
	CheckID      string   `json:"check_id"`
	Status       string   `json:"status"`
	Message      string   `json:"message"`
	EvidenceRefs []string `json:"evidence_refs"`
}

type ProductionReadinessRiskSummary struct {
	Total      int            `json:"total"`
	BySeverity map[string]int `json:"by_severity"`
	Blocking   []string       `json:"blocking"`
}

type ProcessGraphRecord struct {
	ProcessGraphID      string          `json:"process_graph_id"`
	SchemaVersion       string          `json:"schema_version"`
	Version             int             `json:"version"`
	SourceCanvasGraphID string          `json:"source_canvas_graph_id"`
	PayloadHash         string          `json:"payload_hash"`
	Payload             json.RawMessage `json:"payload"`
	SourceSystem        string          `json:"source_system"`
	RequestedBy         string          `json:"requested_by"`
	TenantID            string          `json:"tenant_id,omitempty"`
	ProjectID           string          `json:"project_id,omitempty"`
	SiteID              string          `json:"site_id,omitempty"`
	Metadata            json.RawMessage `json:"metadata,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
}

type SimulationInputRecord struct {
	SimulationInputID   string          `json:"simulation_input_id"`
	SchemaVersion       string          `json:"schema_version"`
	JobType             string          `json:"job_type"`
	ProcessGraphID      string          `json:"process_graph_id"`
	ProcessGraphVersion int             `json:"process_graph_version"`
	PayloadHash         string          `json:"payload_hash"`
	Payload             json.RawMessage `json:"payload"`
	SourceSystem        string          `json:"source_system"`
	RequestedBy         string          `json:"requested_by"`
	TenantID            string          `json:"tenant_id,omitempty"`
	ProjectID           string          `json:"project_id,omitempty"`
	SiteID              string          `json:"site_id,omitempty"`
	Metadata            json.RawMessage `json:"metadata,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
}

type ModelCatalogRecord struct {
	CatalogID     string          `json:"catalog_id"`
	SchemaVersion string          `json:"schema_version"`
	GeneratedAt   string          `json:"generated_at"`
	PayloadHash   string          `json:"payload_hash"`
	Payload       json.RawMessage `json:"payload"`
	SourceSystem  string          `json:"source_system"`
	RequestedBy   string          `json:"requested_by"`
	TenantID      string          `json:"tenant_id,omitempty"`
	ProjectID     string          `json:"project_id,omitempty"`
	SiteID        string          `json:"site_id,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

type ModelCatalogSnapshotFilter struct {
	CatalogID string
	Limit     int
	Cursor    string
	TenantID  string
	ProjectID string
	SiteID    string
}

type ListModelCatalogSnapshotsResponse struct {
	Items         []ModelCatalogRecord `json:"items"`
	NextCursor    string               `json:"next_cursor,omitempty"`
	TotalEstimate int                  `json:"total_estimate"`
}

type ModelCatalogResponse struct {
	SchemaVersion string              `json:"schema_version"`
	GeneratedAt   string              `json:"generated_at"`
	Models        []ModelCatalogModel `json:"models"`
	Metadata      map[string]any      `json:"metadata,omitempty"`
}

type ModelCatalogModel struct {
	ModelKey          string                `json:"model_key"`
	DisplayName       string                `json:"display_name"`
	Description       string                `json:"description,omitempty"`
	SupportedJobTypes []string              `json:"supported_job_types"`
	Versions          []ModelCatalogVersion `json:"versions"`
	Metadata          map[string]any        `json:"metadata,omitempty"`
}

type ModelCatalogVersion struct {
	ModelVersion        string                   `json:"model_version"`
	Status              string                   `json:"status"`
	Runtime             string                   `json:"runtime"`
	ReleasedAt          string                   `json:"released_at,omitempty"`
	ParameterTemplates  []ModelParameterTemplate `json:"parameter_templates"`
	BenchmarkCases      []ModelBenchmarkCase     `json:"benchmark_cases"`
	DefaultParameterSet *ModelParameterSet       `json:"default_parameter_set,omitempty"`
	Metadata            map[string]any           `json:"metadata,omitempty"`
}

type ModelParameterTemplate struct {
	ParameterKey string         `json:"parameter_key"`
	DisplayName  string         `json:"display_name"`
	Unit         string         `json:"unit,omitempty"`
	ValueType    string         `json:"value_type"`
	Required     bool           `json:"required"`
	DefaultValue any            `json:"default_value,omitempty"`
	MinValue     *float64       `json:"min_value,omitempty"`
	MaxValue     *float64       `json:"max_value,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
}

type ModelParameterSet struct {
	ParameterSetID string         `json:"parameter_set_id"`
	Status         string         `json:"status"`
	ParameterHash  string         `json:"parameter_hash"`
	Parameters     map[string]any `json:"parameters,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type ParameterSetStatusUpdateRequest struct {
	ParameterSetID string         `json:"parameter_set_id,omitempty"`
	FromStatus     string         `json:"from_status,omitempty"`
	ToStatus       string         `json:"to_status"`
	Reason         string         `json:"reason,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type ParameterSetPromotionRequest struct {
	ParameterSetID string         `json:"parameter_set_id,omitempty"`
	Reason         string         `json:"reason,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type ModelParameterSetTransitionResponse struct {
	ModelKey           string               `json:"model_key"`
	ModelVersion       string               `json:"model_version"`
	ParameterSetID     string               `json:"parameter_set_id"`
	FromStatus         string               `json:"from_status"`
	ToStatus           string               `json:"to_status"`
	CatalogPayloadHash string               `json:"catalog_payload_hash"`
	CreatedSnapshot    bool                 `json:"created_snapshot"`
	Catalog            ModelCatalogResponse `json:"catalog"`
}

type BenchmarkCaseRunRequest struct {
	RequestID      string         `json:"request_id,omitempty"`
	JobID          string         `json:"job_id,omitempty"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	SourceSystem   string         `json:"source_system,omitempty"`
	RequestedBy    string         `json:"requested_by,omitempty"`
	TraceID        string         `json:"trace_id,omitempty"`
	Metadata       map[string]any `json:"metadata,omitempty"`
}

type ModelParameterSetPromotionPlan struct {
	SchemaVersion              string                         `json:"schema_version"`
	ModelKey                   string                         `json:"model_key"`
	ModelVersion               string                         `json:"model_version"`
	ParameterSetID             string                         `json:"parameter_set_id"`
	ParameterHash              string                         `json:"parameter_hash"`
	CurrentStatus              string                         `json:"current_status"`
	TargetStatus               string                         `json:"target_status"`
	CanPromoteToApproved       bool                           `json:"can_promote_to_approved"`
	WouldModifyCatalog         bool                           `json:"would_modify_catalog"`
	ProductionApprovalRequired bool                           `json:"production_approval_required"`
	BenchmarkCasesChecked      int                            `json:"benchmark_cases_checked"`
	BenchmarkCasesPassed       int                            `json:"benchmark_cases_passed"`
	BlockingReasons            []string                       `json:"blocking_reasons"`
	CaseResults                []BenchmarkCasePromotionResult `json:"case_results"`
}

type BenchmarkCasePromotionResult struct {
	BenchmarkCaseID          string   `json:"benchmark_case_id"`
	CaseStatus               string   `json:"case_status"`
	LatestBenchmarkRunID     string   `json:"latest_benchmark_run_id,omitempty"`
	LatestBenchmarkRunStatus string   `json:"latest_benchmark_run_status,omitempty"`
	ModelRunID               string   `json:"model_run_id,omitempty"`
	JobID                    string   `json:"job_id,omitempty"`
	ExecutedAt               string   `json:"executed_at,omitempty"`
	ParameterHash            string   `json:"parameter_hash,omitempty"`
	ParameterHashMatches     bool     `json:"parameter_hash_matches"`
	EvidenceRefCount         int      `json:"evidence_ref_count"`
	Ready                    bool     `json:"ready"`
	BlockingReasons          []string `json:"blocking_reasons"`
}

type ModelBenchmarkCase struct {
	BenchmarkCaseID string         `json:"benchmark_case_id"`
	DisplayName     string         `json:"display_name"`
	Description     string         `json:"description,omitempty"`
	JobType         string         `json:"job_type"`
	InputRef        map[string]any `json:"input_ref"`
	ExpectedMetrics map[string]any `json:"expected_metrics"`
	Tolerance       map[string]any `json:"tolerance"`
	Status          string         `json:"status"`
	Source          string         `json:"source,omitempty"`
	EvidenceRefs    []string       `json:"evidence_refs,omitempty"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

type BenchmarkRunRecord struct {
	BenchmarkRunID  string          `json:"benchmark_run_id"`
	SchemaVersion   string          `json:"schema_version"`
	ModelKey        string          `json:"model_key"`
	ModelVersion    string          `json:"model_version"`
	BenchmarkCaseID string          `json:"benchmark_case_id"`
	ParameterSetID  string          `json:"parameter_set_id"`
	ModelRunID      string          `json:"model_run_id"`
	JobID           string          `json:"job_id"`
	Status          string          `json:"status"`
	PayloadHash     string          `json:"payload_hash"`
	Payload         json.RawMessage `json:"payload"`
	SourceSystem    string          `json:"source_system"`
	RequestedBy     string          `json:"requested_by"`
	TenantID        string          `json:"tenant_id,omitempty"`
	ProjectID       string          `json:"project_id,omitempty"`
	Metadata        json.RawMessage `json:"metadata,omitempty"`
	ExecutedAt      time.Time       `json:"executed_at"`
	CreatedAt       time.Time       `json:"created_at"`
}

type BenchmarkRunFilter struct {
	Limit           int
	Cursor          string
	JobID           string
	ModelKey        string
	ModelVersion    string
	BenchmarkCaseID string
	ParameterSetID  string
}

type ListBenchmarkRunsResponse struct {
	Items         []BenchmarkRunRecord `json:"items"`
	NextCursor    string               `json:"next_cursor,omitempty"`
	TotalEstimate int                  `json:"total_estimate"`
}

type ContractValidationIssue = platformcontracts.ValidationIssue

type ContractValidationResponse struct {
	SchemaVersion         string                    `json:"schema_version"`
	DocumentSchemaVersion string                    `json:"document_schema_version,omitempty"`
	ContractSchema        string                    `json:"contract_schema,omitempty"`
	Valid                 bool                      `json:"valid"`
	Errors                []ContractValidationIssue `json:"errors"`
	Warnings              []string                  `json:"warnings"`
	ConfirmationRecord    *DraftConfirmationRecord  `json:"confirmation_record,omitempty"`
}

type ConstraintApplicationPlan = domainagent.ConstraintApplicationPlan

type ResultExplanationRecord struct {
	SchemaVersion            string          `json:"schema_version"`
	ExplanationID            string          `json:"explanation_id"`
	ExplanationSchemaVersion string          `json:"explanation_schema_version"`
	JobID                    string          `json:"job_id"`
	Status                   string          `json:"status"`
	CreatedBy                string          `json:"created_by"`
	PayloadHash              string          `json:"payload_hash"`
	Payload                  json.RawMessage `json:"payload"`
	ResolvedEvidenceRefs     []string        `json:"resolved_evidence_refs"`
	SourceSystem             string          `json:"source_system"`
	RequestedBy              string          `json:"requested_by"`
	TenantID                 string          `json:"tenant_id,omitempty"`
	ProjectID                string          `json:"project_id,omitempty"`
	Metadata                 json.RawMessage `json:"metadata,omitempty"`
	SubmittedAt              time.Time       `json:"submitted_at"`
	ReviewedBy               string          `json:"reviewed_by,omitempty"`
	ReviewedAt               *time.Time      `json:"reviewed_at,omitempty"`
	ReviewDecision           string          `json:"review_decision,omitempty"`
	ReviewReason             string          `json:"review_reason,omitempty"`
	PublishedBy              string          `json:"published_by,omitempty"`
	PublishedAt              *time.Time      `json:"published_at,omitempty"`
	CreatedAt                time.Time       `json:"created_at"`
	UpdatedAt                time.Time       `json:"updated_at"`
}

type ResultExplanationReviewRequest struct {
	Decision string `json:"decision"`
	Reason   string `json:"reason,omitempty"`
}

type DraftConfirmationRecord struct {
	ConfirmationID     string          `json:"confirmation_id"`
	SchemaVersion      string          `json:"schema_version"`
	DraftSchemaVersion string          `json:"draft_schema_version"`
	DraftID            string          `json:"draft_id"`
	Decision           string          `json:"decision"`
	DecisionReason     string          `json:"decision_reason,omitempty"`
	ConfirmedBy        string          `json:"confirmed_by"`
	ConfirmedAt        time.Time       `json:"confirmed_at"`
	PayloadHash        string          `json:"payload_hash"`
	Payload            json.RawMessage `json:"payload"`
	SourceSystem       string          `json:"source_system"`
	RequestedBy        string          `json:"requested_by"`
	TenantID           string          `json:"tenant_id,omitempty"`
	ProjectID          string          `json:"project_id,omitempty"`
	SiteID             string          `json:"site_id,omitempty"`
	Metadata           json.RawMessage `json:"metadata,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
}
