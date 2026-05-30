package compute

import (
	"encoding/json"
	"time"
)

const (
	StatusCreated   = "created"
	StatusQueued    = "queued"
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusCancelled = "cancelled"
	StatusTimedOut  = "timed_out"

	DefaultLeaseSeconds = 90
	MaxAttempts         = 1
)

type Config struct {
	DatabaseURL string
	ArtifactDir string
	TokensJSON  string
	Port        string
	RepoRoot    string
}

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

type WorkerRecord struct {
	WorkerID                  string          `json:"worker_id"`
	Capabilities              json.RawMessage `json:"capabilities"`
	SupportedContractVersions json.RawMessage `json:"supported_contract_versions"`
	RuntimeVersion            string          `json:"runtime_version,omitempty"`
	CurrentJobID              string          `json:"current_job_id,omitempty"`
	HeartbeatAt               *time.Time      `json:"heartbeat_at,omitempty"`
	RegisteredAt              time.Time       `json:"registered_at"`
}

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
	Metadata      json.RawMessage `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
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

type ContractValidationIssue struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

type ContractValidationResponse struct {
	SchemaVersion         string                    `json:"schema_version"`
	DocumentSchemaVersion string                    `json:"document_schema_version,omitempty"`
	ContractSchema        string                    `json:"contract_schema,omitempty"`
	Valid                 bool                      `json:"valid"`
	Errors                []ContractValidationIssue `json:"errors"`
	Warnings              []string                  `json:"warnings"`
	ConfirmationRecord    *DraftConfirmationRecord  `json:"confirmation_record,omitempty"`
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
	Metadata           json.RawMessage `json:"metadata,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
}

type TokenConfig struct {
	Tokens []TokenRecord `json:"tokens"`
}

type TokenRecord struct {
	Name    string   `json:"name"`
	Token   string   `json:"token"`
	Scopes  []string `json:"scopes"`
	Revoked bool     `json:"revoked,omitempty"`
}

type Principal struct {
	Name    string
	Scopes  map[string]bool
	Revoked bool
}
