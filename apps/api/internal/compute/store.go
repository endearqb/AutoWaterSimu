package compute

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

type Store interface {
	FindJobByID(ctx context.Context, jobID string) (*JobRecord, error)
	FindJobByIdempotency(ctx context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error)
	InsertJob(ctx context.Context, job JobRecord, events []EventRecord) error
	ListJobs(ctx context.Context, filter ListFilter) ([]JobRecord, string, int, error)
	Events(ctx context.Context, jobID string) ([]EventRecord, error)
	Artifacts(ctx context.Context, jobID string) ([]ArtifactRecord, error)
	FindArtifact(ctx context.Context, artifactID string) (*ArtifactRecord, error)
	InsertArtifact(ctx context.Context, artifact ArtifactRecord, event EventRecord) error
	ListArtifactRetentionCandidates(ctx context.Context, now time.Time, limit int) ([]ArtifactRecord, error)
	ArtifactReferences(ctx context.Context, artifactID string) ([]string, error)
	DeleteArtifact(ctx context.Context, artifactID string, event EventRecord) error
	UpsertArtifactArchive(ctx context.Context, archive ArtifactArchiveRecord, event EventRecord) error
	FindArtifactArchive(ctx context.Context, artifactID string) (*ArtifactArchiveRecord, error)
	InsertModelRuns(ctx context.Context, jobID string, modelRuns []json.RawMessage, now time.Time) error
	FindModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error)
	ListModelRuns(ctx context.Context, filter ModelRunFilter) ([]json.RawMessage, string, int, error)
	ModelRuns(ctx context.Context, jobID string) ([]json.RawMessage, error)
	UpsertBenchmarkRun(ctx context.Context, record BenchmarkRunRecord) (BenchmarkRunRecord, bool, error)
	FindBenchmarkRun(ctx context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error)
	ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error)
	UpsertModelCatalog(ctx context.Context, record ModelCatalogRecord) (ModelCatalogRecord, bool, error)
	LatestModelCatalog(ctx context.Context, catalogID string) (*ModelCatalogRecord, error)
	UpsertProcessGraph(ctx context.Context, record ProcessGraphRecord) (bool, error)
	FindProcessGraph(ctx context.Context, processGraphID string, version int) (*ProcessGraphRecord, error)
	UpsertSimulationInput(ctx context.Context, record SimulationInputRecord) (bool, error)
	FindSimulationInput(ctx context.Context, simulationInputID string) (*SimulationInputRecord, error)
	UpsertDraftConfirmation(ctx context.Context, record DraftConfirmationRecord) (bool, error)
	FindDraftConfirmation(ctx context.Context, confirmationID string) (*DraftConfirmationRecord, error)
	UpsertResultExplanation(ctx context.Context, record ResultExplanationRecord) (bool, error)
	FindResultExplanation(ctx context.Context, jobID, explanationID string) (*ResultExplanationRecord, error)
	UpdateResultExplanationReview(ctx context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time) (*ResultExplanationRecord, error)
	PublishResultExplanation(ctx context.Context, jobID, explanationID, publishedBy string, now time.Time) (*ResultExplanationRecord, error)
	Metrics(ctx context.Context, now time.Time) (MetricsSnapshot, error)
	UpsertWorker(ctx context.Context, worker WorkerRecord) error
	FindWorkerByID(ctx context.Context, workerID string) (*WorkerRecord, error)
	ClaimNext(ctx context.Context, worker WorkerRecord, leaseExpiresAt time.Time) (*JobRecord, error)
	Heartbeat(ctx context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error)
	CancelJob(ctx context.Context, jobID string, now time.Time) (*JobRecord, error)
	CompleteJob(ctx context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error)
	TimeoutExpired(ctx context.Context, now time.Time) ([]JobRecord, error)
}

type ListFilter struct {
	Limit         int
	Cursor        string
	Status        string
	JobType       string
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

type MemoryStore struct {
	mu            sync.Mutex
	jobs          map[string]JobRecord
	events        map[string][]EventRecord
	artifacts     map[string]ArtifactRecord
	archives      map[string]ArtifactArchiveRecord
	modelRuns     map[string]json.RawMessage
	benchmarkRuns map[string]BenchmarkRunRecord
	modelCatalogs map[string][]ModelCatalogRecord
	processGraphs map[string]ProcessGraphRecord
	inputs        map[string]SimulationInputRecord
	confirmations map[string]DraftConfirmationRecord
	explanations  map[string]ResultExplanationRecord
	workers       map[string]WorkerRecord
	nextEvent     int64
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		jobs:          map[string]JobRecord{},
		events:        map[string][]EventRecord{},
		artifacts:     map[string]ArtifactRecord{},
		archives:      map[string]ArtifactArchiveRecord{},
		modelRuns:     map[string]json.RawMessage{},
		benchmarkRuns: map[string]BenchmarkRunRecord{},
		modelCatalogs: map[string][]ModelCatalogRecord{},
		processGraphs: map[string]ProcessGraphRecord{},
		inputs:        map[string]SimulationInputRecord{},
		confirmations: map[string]DraftConfirmationRecord{},
		explanations:  map[string]ResultExplanationRecord{},
		workers:       map[string]WorkerRecord{},
	}
}

func (store *MemoryStore) FindJobByID(_ context.Context, jobID string) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	return &job, nil
}

func (store *MemoryStore) FindJobByIdempotency(_ context.Context, sourceSystem, requestedBy, key string) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	for _, job := range store.jobs {
		if job.SourceSystem == sourceSystem && job.RequestedBy == requestedBy && job.IdempotencyKey == key {
			copy := job
			return &copy, nil
		}
	}
	return nil, nil
}

func (store *MemoryStore) InsertJob(_ context.Context, job JobRecord, events []EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[job.JobID]; ok {
		return Conflict(CodeIdempotencyConflict, "job already exists")
	}
	store.jobs[job.JobID] = job
	for _, event := range events {
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) ListJobs(_ context.Context, filter ListFilter) ([]JobRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var jobs []JobRecord
	for _, job := range store.jobs {
		if filter.Status != "" && job.Status != filter.Status {
			continue
		}
		if filter.JobType != "" && job.JobType != filter.JobType {
			continue
		}
		if filter.CreatedAfter != nil && !job.CreatedAt.After(*filter.CreatedAfter) {
			continue
		}
		if filter.CreatedBefore != nil && !job.CreatedAt.Before(*filter.CreatedBefore) {
			continue
		}
		jobs = append(jobs, job)
	}
	sort.Slice(jobs, func(i, j int) bool {
		if jobs[i].CreatedAt.Equal(jobs[j].CreatedAt) {
			return jobs[i].JobID > jobs[j].JobID
		}
		return jobs[i].CreatedAt.After(jobs[j].CreatedAt)
	})
	total := len(jobs)
	offset := decodeCursor(filter.Cursor)
	if offset > len(jobs) {
		offset = len(jobs)
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	end := offset + limit
	next := ""
	if end < len(jobs) {
		next = encodeCursor(end)
	} else {
		end = len(jobs)
	}
	return jobs[offset:end], next, total, nil
}

func (store *MemoryStore) Events(_ context.Context, jobID string) ([]EventRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	events := append([]EventRecord(nil), store.events[jobID]...)
	return events, nil
}

func (store *MemoryStore) Artifacts(_ context.Context, jobID string) ([]ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	var artifacts []ArtifactRecord
	for _, artifact := range store.artifacts {
		if artifact.JobID == jobID {
			artifacts = append(artifacts, artifact)
		}
	}
	sort.Slice(artifacts, func(i, j int) bool {
		if artifacts[i].CreatedAt.Equal(artifacts[j].CreatedAt) {
			return artifacts[i].ArtifactID < artifacts[j].ArtifactID
		}
		return artifacts[i].CreatedAt.Before(artifacts[j].CreatedAt)
	})
	return artifacts, nil
}

func (store *MemoryStore) FindArtifact(_ context.Context, artifactID string) (*ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[artifactID]
	if !ok {
		return nil, NotFound(CodeArtifactNotFound, "artifact not found")
	}
	return &artifact, nil
}

func (store *MemoryStore) InsertArtifact(_ context.Context, artifact ArtifactRecord, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[artifact.JobID]
	if !ok {
		return NotFound(CodeJobNotFound, "job not found")
	}
	if job.Status != StatusRunning {
		store.appendEventLocked(EventRecord{
			JobID: artifact.JobID, EventType: "late_result_rejected",
			EventJSON: mustJSON(map[string]any{"artifact_id": artifact.ArtifactID, "status": job.Status}),
			CreatedAt: time.Now().UTC(),
		})
		return Conflict(CodeWorkerStale, "job is terminal or not running")
	}
	store.artifacts[artifact.ArtifactID] = artifact
	store.appendEventLocked(event)
	return nil
}

func (store *MemoryStore) ListArtifactRetentionCandidates(_ context.Context, now time.Time, limit int) ([]ArtifactRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var artifacts []ArtifactRecord
	for _, artifact := range store.artifacts {
		if !artifactRetentionPolicyEligible(artifact.RetentionPolicy) {
			continue
		}
		if artifact.RetentionPolicy == "archive_candidate" {
			if archive, ok := store.archives[artifact.ArtifactID]; ok && archive.Status == "archived" {
				continue
			}
		}
		if artifact.RetainUntil == nil || artifact.RetainUntil.After(now) {
			continue
		}
		artifacts = append(artifacts, artifact)
	}
	sort.Slice(artifacts, func(i, j int) bool {
		left := artifacts[i]
		right := artifacts[j]
		if left.RetainUntil != nil && right.RetainUntil != nil && !left.RetainUntil.Equal(*right.RetainUntil) {
			return left.RetainUntil.Before(*right.RetainUntil)
		}
		if !left.CreatedAt.Equal(right.CreatedAt) {
			return left.CreatedAt.Before(right.CreatedAt)
		}
		return left.ArtifactID < right.ArtifactID
	})
	limit = normalizeRetentionLimit(limit)
	if len(artifacts) > limit {
		artifacts = artifacts[:limit]
	}
	return append([]ArtifactRecord(nil), artifacts...), nil
}

func (store *MemoryStore) ArtifactReferences(_ context.Context, artifactID string) ([]string, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var refs []string
	for _, modelRun := range store.modelRuns {
		modelRunID := modelRunIDFromRaw(modelRun)
		if modelRunID == "" {
			continue
		}
		for _, evidenceRef := range modelRunEvidenceRefsFromRaw(modelRun) {
			if evidenceRef == artifactID || evidenceRef == "artifact:"+artifactID {
				refs = append(refs, "model_run:"+modelRunID)
				break
			}
		}
	}
	sort.Strings(refs)
	return refs, nil
}

func (store *MemoryStore) DeleteArtifact(_ context.Context, artifactID string, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[artifactID]
	if !ok {
		return NotFound(CodeArtifactNotFound, "artifact not found")
	}
	delete(store.artifacts, artifactID)
	delete(store.archives, artifactID)
	if _, ok := store.jobs[artifact.JobID]; ok {
		event.JobID = artifact.JobID
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) UpsertArtifactArchive(_ context.Context, archive ArtifactArchiveRecord, event EventRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	artifact, ok := store.artifacts[archive.ArtifactID]
	if !ok {
		return NotFound(CodeArtifactNotFound, "artifact not found")
	}
	archive.JobID = artifact.JobID
	store.archives[archive.ArtifactID] = archive
	if _, ok := store.jobs[artifact.JobID]; ok {
		event.JobID = artifact.JobID
		store.appendEventLocked(event)
	}
	return nil
}

func (store *MemoryStore) FindArtifactArchive(_ context.Context, artifactID string) (*ArtifactArchiveRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	archive, ok := store.archives[artifactID]
	if !ok {
		return nil, NotFound(CodeArtifactNotFound, "artifact archive not found")
	}
	return &archive, nil
}

func (store *MemoryStore) Metrics(_ context.Context, now time.Time) (MetricsSnapshot, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	jobsByStatus := map[string]int{}
	for _, job := range store.jobs {
		jobsByStatus[job.Status]++
	}
	retentionCandidates := 0
	for _, artifact := range store.artifacts {
		if artifactRetentionPolicyEligible(artifact.RetentionPolicy) &&
			artifact.RetainUntil != nil &&
			!artifact.RetainUntil.After(now) {
			if artifact.RetentionPolicy == "archive_candidate" {
				if archive, ok := store.archives[artifact.ArtifactID]; ok && archive.Status == "archived" {
					continue
				}
			}
			retentionCandidates++
		}
	}
	return MetricsSnapshot{
		GeneratedAt:         now,
		JobsByStatus:        jobsByStatus,
		WorkersRegistered:   len(store.workers),
		ArtifactsTotal:      len(store.artifacts),
		RetentionCandidates: retentionCandidates,
	}, nil
}

func (store *MemoryStore) InsertModelRuns(_ context.Context, jobID string, modelRuns []json.RawMessage, _ time.Time) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return NotFound(CodeJobNotFound, "job not found")
	}
	for _, modelRun := range modelRuns {
		modelRunID := modelRunIDFromRaw(modelRun)
		if modelRunID == "" {
			return ValidationError("model_run_id is required")
		}
		store.modelRuns[modelRunID] = append(json.RawMessage(nil), modelRun...)
	}
	return nil
}

func (store *MemoryStore) FindModelRun(_ context.Context, modelRunID string) (json.RawMessage, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	modelRun, ok := store.modelRuns[modelRunID]
	if !ok {
		return nil, NotFound(CodeModelRunNotFound, "model run not found")
	}
	return append(json.RawMessage(nil), modelRun...), nil
}

func (store *MemoryStore) ListModelRuns(_ context.Context, filter ModelRunFilter) ([]json.RawMessage, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var modelRuns []json.RawMessage
	for _, modelRun := range store.modelRuns {
		modelRunID, jobID, modelKey, modelVersion, _, err := modelRunFieldsFromRaw(modelRun)
		if err != nil || modelRunID == "" {
			continue
		}
		if filter.JobID != "" && jobID != filter.JobID {
			continue
		}
		if filter.ModelKey != "" && modelKey != filter.ModelKey {
			continue
		}
		if filter.ModelVersion != "" && modelVersion != filter.ModelVersion {
			continue
		}
		modelRuns = append(modelRuns, append(json.RawMessage(nil), modelRun...))
	}
	sort.Slice(modelRuns, func(i, j int) bool {
		leftID := modelRunIDFromRaw(modelRuns[i])
		rightID := modelRunIDFromRaw(modelRuns[j])
		return leftID > rightID
	})
	total := len(modelRuns)
	offset := decodeCursor(filter.Cursor)
	if offset > len(modelRuns) {
		offset = len(modelRuns)
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	end := offset + limit
	next := ""
	if end < len(modelRuns) {
		next = encodeCursor(end)
	} else {
		end = len(modelRuns)
	}
	return modelRuns[offset:end], next, total, nil
}

func (store *MemoryStore) ModelRuns(_ context.Context, jobID string) ([]json.RawMessage, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	if _, ok := store.jobs[jobID]; !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	var modelRuns []json.RawMessage
	for _, modelRun := range store.modelRuns {
		_, modelRunJobID, _, _, _, err := modelRunFieldsFromRaw(modelRun)
		if err == nil && modelRunJobID == jobID {
			modelRuns = append(modelRuns, append(json.RawMessage(nil), modelRun...))
		}
	}
	sort.Slice(modelRuns, func(i, j int) bool {
		return modelRunIDFromRaw(modelRuns[i]) < modelRunIDFromRaw(modelRuns[j])
	})
	return modelRuns, nil
}

func (store *MemoryStore) UpsertBenchmarkRun(_ context.Context, record BenchmarkRunRecord) (BenchmarkRunRecord, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.benchmarkRuns[record.BenchmarkRunID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return BenchmarkRunRecord{}, false, Conflict(CodeIdempotencyConflict, "benchmark_run_id was reused with a different payload")
		}
		return cloneBenchmarkRunRecord(existing), false, nil
	}
	store.benchmarkRuns[record.BenchmarkRunID] = cloneBenchmarkRunRecord(record)
	return cloneBenchmarkRunRecord(record), true, nil
}

func (store *MemoryStore) FindBenchmarkRun(_ context.Context, benchmarkRunID string) (*BenchmarkRunRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.benchmarkRuns[benchmarkRunID]
	if !ok {
		return nil, NotFound(CodeBenchmarkRunNotFound, "benchmark run not found")
	}
	record = cloneBenchmarkRunRecord(record)
	return &record, nil
}

func (store *MemoryStore) ListBenchmarkRuns(_ context.Context, filter BenchmarkRunFilter) ([]BenchmarkRunRecord, string, int, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var records []BenchmarkRunRecord
	for _, record := range store.benchmarkRuns {
		if filter.ModelKey != "" && record.ModelKey != filter.ModelKey {
			continue
		}
		if filter.ModelVersion != "" && record.ModelVersion != filter.ModelVersion {
			continue
		}
		if filter.BenchmarkCaseID != "" && record.BenchmarkCaseID != filter.BenchmarkCaseID {
			continue
		}
		records = append(records, cloneBenchmarkRunRecord(record))
	}
	sort.Slice(records, func(i, j int) bool {
		if records[i].ExecutedAt.Equal(records[j].ExecutedAt) {
			return records[i].BenchmarkRunID > records[j].BenchmarkRunID
		}
		return records[i].ExecutedAt.After(records[j].ExecutedAt)
	})
	total := len(records)
	offset := decodeCursor(filter.Cursor)
	if offset > len(records) {
		offset = len(records)
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	end := offset + limit
	next := ""
	if end < len(records) {
		next = encodeCursor(end)
	} else {
		end = len(records)
	}
	return records[offset:end], next, total, nil
}

func cloneBenchmarkRunRecord(record BenchmarkRunRecord) BenchmarkRunRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func (store *MemoryStore) UpsertModelCatalog(_ context.Context, record ModelCatalogRecord) (ModelCatalogRecord, bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	snapshots := store.modelCatalogs[record.CatalogID]
	for _, existing := range snapshots {
		if existing.PayloadHash == record.PayloadHash {
			return cloneModelCatalogRecord(existing), false, nil
		}
	}
	record = cloneModelCatalogRecord(record)
	store.modelCatalogs[record.CatalogID] = append(snapshots, record)
	return cloneModelCatalogRecord(record), true, nil
}

func (store *MemoryStore) LatestModelCatalog(_ context.Context, catalogID string) (*ModelCatalogRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	snapshots := store.modelCatalogs[catalogID]
	if len(snapshots) == 0 {
		return nil, NotFound(CodeModelCatalogNotFound, "model catalog not found")
	}
	record := cloneModelCatalogRecord(snapshots[len(snapshots)-1])
	return &record, nil
}

func (store *MemoryStore) UpsertProcessGraph(_ context.Context, record ProcessGraphRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := processGraphStoreKey(record.ProcessGraphID, record.Version)
	existing, ok := store.processGraphs[key]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "process_graph_id/version was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.processGraphs[key] = record
	return true, nil
}

func cloneModelCatalogRecord(record ModelCatalogRecord) ModelCatalogRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return record
}

func (store *MemoryStore) FindProcessGraph(_ context.Context, processGraphID string, version int) (*ProcessGraphRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.processGraphs[processGraphStoreKey(processGraphID, version)]
	if !ok {
		return nil, NotFound(CodeProcessGraphNotFound, "process graph not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}

func (store *MemoryStore) UpsertSimulationInput(_ context.Context, record SimulationInputRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.inputs[record.SimulationInputID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "simulation_input_id was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.inputs[record.SimulationInputID] = record
	return true, nil
}

func processGraphStoreKey(processGraphID string, version int) string {
	return strings.TrimSpace(processGraphID) + ":" + fmt.Sprint(version)
}

func (store *MemoryStore) FindSimulationInput(_ context.Context, simulationInputID string) (*SimulationInputRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.inputs[simulationInputID]
	if !ok {
		return nil, NotFound(CodeSimulationInputNotFound, "simulation input not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}

func (store *MemoryStore) UpsertDraftConfirmation(_ context.Context, record DraftConfirmationRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	existing, ok := store.confirmations[record.ConfirmationID]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "confirmation_id was reused with a different payload")
		}
		return false, nil
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	store.confirmations[record.ConfirmationID] = record
	return true, nil
}

func (store *MemoryStore) FindDraftConfirmation(_ context.Context, confirmationID string) (*DraftConfirmationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.confirmations[confirmationID]
	if !ok {
		return nil, NotFound(CodeDraftConfirmationNotFound, "draft confirmation not found")
	}
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	return &record, nil
}

func (store *MemoryStore) UpsertResultExplanation(_ context.Context, record ResultExplanationRecord) (bool, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(record.JobID, record.ExplanationID)
	existing, ok := store.explanations[key]
	if ok {
		if existing.PayloadHash != record.PayloadHash {
			return false, Conflict(CodeIdempotencyConflict, "explanation_id was reused with a different payload")
		}
		return false, nil
	}
	store.explanations[key] = cloneResultExplanationRecord(record)
	return true, nil
}

func (store *MemoryStore) FindResultExplanation(_ context.Context, jobID, explanationID string) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	record, ok := store.explanations[resultExplanationStoreKey(jobID, explanationID)]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func (store *MemoryStore) UpdateResultExplanationReview(_ context.Context, jobID, explanationID, reviewedBy, decision, reason string, metadata json.RawMessage, now time.Time) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(jobID, explanationID)
	record, ok := store.explanations[key]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if record.Status == "published" {
		return nil, Conflict(CodeResultExplanationInvalidState, "published result explanation cannot be reviewed")
	}
	if decision == "approved" {
		record.Status = "approved"
	} else {
		record.Status = "rejected"
	}
	record.ReviewedBy = reviewedBy
	record.ReviewedAt = &now
	record.ReviewDecision = decision
	record.ReviewReason = reason
	if len(metadata) > 0 && string(metadata) != "null" {
		record.Metadata = append(json.RawMessage(nil), metadata...)
	}
	record.UpdatedAt = now
	store.explanations[key] = cloneResultExplanationRecord(record)
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func (store *MemoryStore) PublishResultExplanation(_ context.Context, jobID, explanationID, publishedBy string, now time.Time) (*ResultExplanationRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := resultExplanationStoreKey(jobID, explanationID)
	record, ok := store.explanations[key]
	if !ok {
		return nil, NotFound(CodeResultExplanationNotFound, "result explanation not found")
	}
	if record.Status == "published" {
		record = cloneResultExplanationRecord(record)
		return &record, nil
	}
	if record.Status != "approved" {
		return nil, Conflict(CodeResultExplanationInvalidState, "result explanation must be approved before publishing")
	}
	record.Status = "published"
	record.PublishedBy = publishedBy
	record.PublishedAt = &now
	record.UpdatedAt = now
	store.explanations[key] = cloneResultExplanationRecord(record)
	record = cloneResultExplanationRecord(record)
	return &record, nil
}

func resultExplanationStoreKey(jobID, explanationID string) string {
	return strings.TrimSpace(jobID) + ":" + strings.TrimSpace(explanationID)
}

func cloneResultExplanationRecord(record ResultExplanationRecord) ResultExplanationRecord {
	record.Payload = append(json.RawMessage(nil), record.Payload...)
	record.Metadata = append(json.RawMessage(nil), record.Metadata...)
	record.ResolvedEvidenceRefs = append([]string(nil), record.ResolvedEvidenceRefs...)
	if record.ReviewedAt != nil {
		reviewedAt := *record.ReviewedAt
		record.ReviewedAt = &reviewedAt
	}
	if record.PublishedAt != nil {
		publishedAt := *record.PublishedAt
		record.PublishedAt = &publishedAt
	}
	return record
}

func (store *MemoryStore) UpsertWorker(_ context.Context, worker WorkerRecord) error {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.workers[worker.WorkerID] = worker
	return nil
}

func (store *MemoryStore) FindWorkerByID(_ context.Context, workerID string) (*WorkerRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	worker, ok := store.workers[workerID]
	if !ok {
		return nil, ValidationError("worker is not registered")
	}
	return &worker, nil
}

func (store *MemoryStore) ClaimNext(_ context.Context, worker WorkerRecord, leaseExpiresAt time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var selected *JobRecord
	for _, job := range store.jobs {
		if job.Status != StatusQueued || job.CancelRequested {
			continue
		}
		if !jobMatchesWorker(job, worker) {
			continue
		}
		if selected == nil || job.CreatedAt.Before(selected.CreatedAt) || (job.CreatedAt.Equal(selected.CreatedAt) && job.JobID < selected.JobID) {
			copy := job
			selected = &copy
		}
	}
	if selected == nil {
		return nil, nil
	}
	now := time.Now().UTC()
	selected.Status = StatusRunning
	selected.WorkerID = worker.WorkerID
	selected.Attempt++
	selected.ClaimedAt = &now
	selected.StartedAt = &now
	selected.LeaseExpiresAt = &leaseExpiresAt
	store.jobs[selected.JobID] = *selected
	store.appendEventLocked(EventRecord{JobID: selected.JobID, EventType: "job.running", EventJSON: mustJSON(map[string]any{"worker_id": worker.WorkerID, "attempt": selected.Attempt}), CreatedAt: now})
	return selected, nil
}

func (store *MemoryStore) Heartbeat(_ context.Context, workerID, jobID string, leaseExpiresAt time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	now := time.Now().UTC()
	worker := store.workers[workerID]
	worker.WorkerID = workerID
	worker.CurrentJobID = jobID
	worker.HeartbeatAt = &now
	store.workers[workerID] = worker
	if job.Status == StatusRunning && job.WorkerID == workerID {
		job.LeaseExpiresAt = &leaseExpiresAt
		store.jobs[jobID] = job
	}
	return &job, nil
}

func (store *MemoryStore) CancelJob(_ context.Context, jobID string, now time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	if isTerminal(job.Status) {
		return nil, Conflict(CodeJobAlreadyTerminal, "job is already terminal")
	}
	job.Status = StatusCancelled
	job.CancelRequested = true
	job.FinishedAt = &now
	store.jobs[jobID] = job
	store.appendEventLocked(EventRecord{JobID: jobID, EventType: "job.cancelled", EventJSON: mustJSON(map[string]any{"status": StatusCancelled}), CreatedAt: now})
	return &job, nil
}

func (store *MemoryStore) CompleteJob(_ context.Context, jobID, workerID string, attempt int, status string, summary json.RawMessage, resultHash, errorCode, errorMessage string, now time.Time) (*JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	job, ok := store.jobs[jobID]
	if !ok {
		return nil, NotFound(CodeJobNotFound, "job not found")
	}
	if job.Status != StatusRunning || job.WorkerID != workerID || job.Attempt != attempt || (job.LeaseExpiresAt != nil && job.LeaseExpiresAt.Before(now)) {
		store.appendEventLocked(EventRecord{JobID: jobID, EventType: "late_result_rejected", EventJSON: mustJSON(map[string]any{"worker_id": workerID, "attempt": attempt, "status": job.Status}), CreatedAt: now})
		return nil, Conflict(CodeWorkerStale, "worker result is stale")
	}
	job.Status = status
	job.Summary = summary
	job.ResultHash = resultHash
	job.ErrorCode = errorCode
	job.ErrorMessage = errorMessage
	job.FinishedAt = &now
	store.jobs[jobID] = job
	store.appendEventLocked(EventRecord{JobID: jobID, EventType: "job." + status, EventJSON: mustJSON(map[string]any{"status": status, "error_code": errorCode, "error_message": errorMessage}), CreatedAt: now})
	return &job, nil
}

func (store *MemoryStore) TimeoutExpired(_ context.Context, now time.Time) ([]JobRecord, error) {
	store.mu.Lock()
	defer store.mu.Unlock()
	var timedOut []JobRecord
	for id, job := range store.jobs {
		if job.Status == StatusRunning && job.LeaseExpiresAt != nil && job.LeaseExpiresAt.Before(now) {
			job.Status = StatusTimedOut
			job.ErrorCode = CodeTimeout
			job.ErrorMessage = "worker lease expired"
			job.FinishedAt = &now
			store.jobs[id] = job
			store.appendEventLocked(EventRecord{JobID: id, EventType: "job.timed_out", EventJSON: mustJSON(map[string]any{"status": StatusTimedOut, "error_code": CodeTimeout}), CreatedAt: now})
			timedOut = append(timedOut, job)
		}
	}
	return timedOut, nil
}

func (store *MemoryStore) appendEventLocked(event EventRecord) {
	store.nextEvent++
	event.ID = store.nextEvent
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	if len(event.EventJSON) == 0 {
		event.EventJSON = mustJSON(map[string]any{})
	}
	store.events[event.JobID] = append(store.events[event.JobID], event)
}

func isTerminal(status string) bool {
	return status == StatusSucceeded || status == StatusFailed || status == StatusCancelled || status == StatusTimedOut
}

func mustJSON(value any) json.RawMessage {
	bytes, _ := json.Marshal(value)
	return bytes
}

func encodeCursor(offset int) string {
	bytes, _ := json.Marshal(map[string]int{"offset": offset})
	return base64.RawURLEncoding.EncodeToString(bytes)
}

func decodeCursor(cursor string) int {
	if strings.TrimSpace(cursor) == "" {
		return 0
	}
	bytes, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return 0
	}
	var value map[string]int
	if err := json.Unmarshal(bytes, &value); err != nil {
		return 0
	}
	return value["offset"]
}

func jobMatchesWorker(job JobRecord, worker WorkerRecord) bool {
	capabilities := stringSetFromJSON(worker.Capabilities)
	for _, capability := range jobRequiredCapabilities(job) {
		if !capabilities[capability] {
			return false
		}
	}
	versions := stringSetFromJSON(worker.SupportedContractVersions)
	for _, version := range jobContractVersions(job) {
		if !versions[version] {
			return false
		}
	}
	return true
}

func jobRequiredCapabilities(job JobRecord) []string {
	var raw map[string]any
	if err := json.Unmarshal(job.InputJSON, &raw); err != nil {
		return nil
	}
	execution, ok := raw["execution"].(map[string]any)
	if !ok {
		return nil
	}
	return stringsFromAny(execution["required_capabilities"])
}

func jobContractVersions(job JobRecord) []string {
	versions := []string{job.SchemaVersion}
	var raw map[string]any
	if err := json.Unmarshal(job.InputJSON, &raw); err != nil {
		return versions
	}
	if payload, ok := raw["payload"].(map[string]any); ok {
		if schemaVersion, ok := payload["schema_version"].(string); ok && strings.TrimSpace(schemaVersion) != "" {
			versions = append(versions, strings.TrimSpace(schemaVersion))
		}
	}
	return versions
}

func stringSetFromJSON(raw json.RawMessage) map[string]bool {
	values := map[string]bool{}
	var items []string
	if err := json.Unmarshal(raw, &items); err == nil {
		for _, item := range items {
			if text := strings.TrimSpace(item); text != "" {
				values[text] = true
			}
		}
	}
	return values
}

func stringsFromAny(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
			result = append(result, strings.TrimSpace(text))
		}
	}
	return result
}

func modelRunIDFromRaw(raw json.RawMessage) string {
	modelRunID, _, _, _, _, _ := modelRunFieldsFromRaw(raw)
	return modelRunID
}

func modelRunFieldsFromRaw(raw json.RawMessage) (modelRunID, jobID, modelKey, modelVersion, parameterSetID string, err error) {
	var value map[string]any
	if err = json.Unmarshal(raw, &value); err != nil {
		return "", "", "", "", "", err
	}
	metadata, _ := value["metadata"].(map[string]any)
	return stringValue(value, "model_run_id"),
		stringValue(value, "job_id"),
		stringValue(value, "model_key"),
		stringValue(value, "model_version"),
		stringValue(metadata, "parameter_set_id"),
		nil
}

func modelRunEvidenceRefsFromRaw(raw json.RawMessage) []string {
	var value map[string]any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return stringsFromAny(value["evidence_refs"])
}

func artifactRetentionPolicyEligible(policy string) bool {
	switch strings.TrimSpace(policy) {
	case "ttl", "archive_candidate":
		return true
	default:
		return false
	}
}

func normalizeRetentionLimit(limit int) int {
	if limit <= 0 {
		return 100
	}
	if limit > 1000 {
		return 1000
	}
	return limit
}
