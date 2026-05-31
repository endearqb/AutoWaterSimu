package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"sort"
	"strings"
	"time"
)

type Service struct {
	store              Store
	artifacts          ArtifactStore
	archiveArtifacts   ArtifactStore
	artifactLifecycle  *ArtifactLifecycleService
	jobLifecycle       *JobLifecycleService
	workerLifecycle    *WorkerLifecycleService
	simulationInputs   *SimulationInputService
	draftWorkflows     *DraftWorkflowService
	resultExplanations *ResultExplanationService
	modelGovernance    *ModelGovernanceService
	evidenceGovernance *EvidenceGovernanceService
	metricsSnapshot    *MetricsService
	validator          *ContractValidator
	now                func() time.Time
}

func NewService(store Store, artifacts ArtifactStore, validator *ContractValidator) *Service {
	return NewServiceWithArchive(store, artifacts, nil, validator)
}

func NewServiceWithArchive(store Store, artifacts ArtifactStore, archiveArtifacts ArtifactStore, validator *ContractValidator) *Service {
	svc := &Service{
		store:            store,
		artifacts:        artifacts,
		archiveArtifacts: archiveArtifacts,
		validator:        validator,
		now:              func() time.Time { return time.Now().UTC() },
	}
	svc.artifactLifecycle = NewArtifactLifecycleService(store, store, store, artifacts, archiveArtifacts, validator, func() time.Time { return svc.now() })
	svc.jobLifecycle = NewJobLifecycleService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	})
	svc.workerLifecycle = NewWorkerLifecycleService(store, func() time.Time { return svc.now() })
	svc.simulationInputs = NewSimulationInputService(store, store, store, store, validator, func() time.Time { return svc.now() })
	svc.draftWorkflows = NewDraftWorkflowService(store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, bytes []byte) (JobSnapshot, int, error) {
		return svc.CreateSimulationCheck(ctx, bytes)
	})
	svc.resultExplanations = NewResultExplanationService(store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.modelGovernance = NewModelGovernanceService(store, store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context, inputRef map[string]any, sourceSystem, requestedBy, jobType string) (map[string]any, error) {
		return svc.simulationInputs.ResolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	}, func(ctx context.Context, bytes []byte, idempotencyKey string) (JobSnapshot, int, error) {
		return svc.CreateJob(ctx, bytes, idempotencyKey)
	}, func(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
		return svc.ResolveEvidenceReference(ctx, jobID, evidenceRef)
	})
	svc.evidenceGovernance = NewEvidenceGovernanceService(store, store, store, validator, func() time.Time { return svc.now() }, func(ctx context.Context) (ModelCatalogResponse, error) {
		return svc.modelGovernance.ModelCatalog(ctx)
	}, func(ctx context.Context, jobID string) ([]ArtifactRecord, error) {
		return svc.artifactLifecycle.ListJobArtifacts(ctx, jobID)
	}, func(ctx context.Context, artifactID string) (ArtifactRecord, error) {
		return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
	})
	svc.metricsSnapshot = NewMetricsService(store, func() time.Time { return svc.now() })
	return svc
}

func (svc *Service) CreateJob(ctx context.Context, bytes []byte, headerIdempotencyKey string) (JobSnapshot, int, error) {
	return svc.jobLifecycle.CreateJob(ctx, bytes, headerIdempotencyKey)
}

func (svc *Service) CreateSimulationCheck(ctx context.Context, bytes []byte) (JobSnapshot, int, error) {
	var request map[string]any
	if err := json.Unmarshal(bytes, &request); err != nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request JSON is invalid")
	}
	if svc.validator != nil {
		if err := svc.validator.Validate("simulation_request.v1.json", request); err != nil {
			return JobSnapshot{}, 0, err
		}
	}
	requestID := required(stringValue(request, "request_id"), "request_id")
	jobType := required(stringValue(request, "job_type"), "job_type")
	inputRef := mapValue(request, "input_ref")
	if inputRef == nil {
		return JobSnapshot{}, 0, ValidationError("simulation_request.input_ref is required")
	}
	sourceSystem := required(stringValue(request, "source_system"), "source_system")
	requestedBy := required(stringValue(request, "requested_by"), "requested_by")
	simulationInput, err := svc.simulationInputs.ResolveSimulationInput(ctx, inputRef, sourceSystem, requestedBy, jobType)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	if stringValue(simulationInput, "job_type") != "" && stringValue(simulationInput, "job_type") != jobType {
		return JobSnapshot{}, 0, ValidationError("simulation_request job_type must match simulation_input job_type")
	}

	metadata := mapValue(request, "metadata")
	externalRefs := mapValue(request, "external_refs")
	traceID := defaultString(stringValue(metadata, "trace_id"), "trace_simcheck_"+safeIDPart(requestID))
	jobID := defaultString(stringValue(metadata, "job_id"), "job_simcheck_"+safeIDPart(requestID))
	idempotencyKey := defaultString(stringValue(metadata, "idempotency_key"), "simcheck:"+requestID)
	jobContext := map[string]any{
		"source_system": sourceSystem,
		"requested_by":  requestedBy,
		"trace_id":      traceID,
	}
	for _, key := range []string{"tenant_id", "project_id"} {
		if value := stringValue(metadata, key); value != "" {
			jobContext[key] = value
		}
	}
	if externalRefs != nil {
		jobContext["external_refs"] = externalRefs
	}

	job := map[string]any{
		"schema_version":  "compute_job.v1",
		"job_id":          jobID,
		"job_type":        jobType,
		"queue":           "simulation",
		"request_id":      requestID,
		"idempotency_key": idempotencyKey,
		"payload":         simulationInput,
		"context":         jobContext,
		"execution":       simulationCheckExecution(jobType),
		"created_at":      svc.now().Format(time.RFC3339Nano),
		"metadata":        simulationCheckMetadata(requestID, inputRef, externalRefs),
	}
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return JobSnapshot{}, 0, err
	}
	return svc.CreateJob(ctx, jobBytes, idempotencyKey)
}

func (svc *Service) ScheduleBenchmarkCaseRun(ctx context.Context, modelKey, modelVersion, benchmarkCaseID string, request BenchmarkCaseRunRequest, defaultSourceSystem, defaultRequestedBy string) (JobSnapshot, int, error) {
	return svc.modelGovernance.ScheduleBenchmarkCaseRun(ctx, modelKey, modelVersion, benchmarkCaseID, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterSimulationInput(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (SimulationInputRecord, int, error) {
	return svc.simulationInputs.RegisterSimulationInput(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetSimulationInput(ctx context.Context, simulationInputID string) (SimulationInputRecord, error) {
	return svc.simulationInputs.GetSimulationInput(ctx, simulationInputID)
}

func (svc *Service) RegisterProcessGraph(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ProcessGraphRecord, int, error) {
	return svc.simulationInputs.RegisterProcessGraph(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetProcessGraph(ctx context.Context, processGraphID string, version int) (ProcessGraphRecord, error) {
	return svc.simulationInputs.GetProcessGraph(ctx, processGraphID, version)
}

func (svc *Service) GetJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.jobLifecycle.GetJob(ctx, jobID)
}

func (svc *Service) ListJobs(ctx context.Context, filter ListFilter) (ListJobsResponse, error) {
	return svc.jobLifecycle.ListJobs(ctx, filter)
}

func (svc *Service) Events(ctx context.Context, jobID string) ([]EventRecord, error) {
	return svc.jobLifecycle.Events(ctx, jobID)
}

func (svc *Service) Result(ctx context.Context, jobID string) (map[string]any, error) {
	return svc.evidenceGovernance.Result(ctx, jobID)
}

func (svc *Service) EvidencePackage(ctx context.Context, jobID string) (map[string]any, string, error) {
	return svc.evidenceGovernance.EvidencePackage(ctx, jobID)
}

func (svc *Service) ProductionReadiness(ctx context.Context, jobID string) (ProductionReadinessReport, error) {
	return svc.evidenceGovernance.ProductionReadiness(ctx, jobID)
}

func (svc *Service) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	return svc.evidenceGovernance.ResolveEvidenceReference(ctx, jobID, evidenceRef)
}

func (svc *Service) CancelJob(ctx context.Context, jobID string) (JobSnapshot, error) {
	return svc.jobLifecycle.CancelJob(ctx, jobID)
}

func (svc *Service) RegisterWorker(ctx context.Context, request map[string]any) (WorkerRecord, error) {
	return svc.workerLifecycle.RegisterWorker(ctx, request)
}

func (svc *Service) Claim(ctx context.Context, workerID string) (map[string]any, error) {
	return svc.workerLifecycle.Claim(ctx, workerID)
}

func (svc *Service) Heartbeat(ctx context.Context, workerID, jobID string) (map[string]any, error) {
	return svc.workerLifecycle.Heartbeat(ctx, workerID, jobID)
}

func (svc *Service) UploadArtifact(ctx context.Context, workerID, jobID string, metadataText string, file multipart.File) (ArtifactRecord, error) {
	return svc.artifactLifecycle.UploadArtifact(ctx, workerID, jobID, metadataText, file)
}

func (svc *Service) Complete(ctx context.Context, workerID, jobID string, attempt int, result map[string]any) (JobSnapshot, error) {
	return svc.jobLifecycle.Complete(ctx, workerID, jobID, attempt, result)
}

func (svc *Service) Fail(ctx context.Context, workerID, jobID string, attempt int, errorCode, errorMessage string) (JobSnapshot, error) {
	return svc.jobLifecycle.Fail(ctx, workerID, jobID, attempt, errorCode, errorMessage)
}

func (svc *Service) TimeoutSweep(ctx context.Context) ([]JobRecord, error) {
	return svc.jobLifecycle.TimeoutSweep(ctx)
}

func (svc *Service) RegisterModelCatalog(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ModelCatalogRecord, int, error) {
	return svc.modelGovernance.RegisterModelCatalog(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) ModelCatalog(ctx context.Context) (ModelCatalogResponse, error) {
	return svc.modelGovernance.ModelCatalog(ctx)
}

func (svc *Service) ModelCatalogModel(ctx context.Context, modelKey string) (ModelCatalogModel, error) {
	return svc.modelGovernance.ModelCatalogModel(ctx, modelKey)
}

func (svc *Service) ListModelCatalogSnapshots(ctx context.Context, filter ModelCatalogSnapshotFilter) (ListModelCatalogSnapshotsResponse, error) {
	return svc.modelGovernance.ListModelCatalogSnapshots(ctx, filter)
}

func (svc *Service) UpdateDefaultParameterSetStatus(ctx context.Context, modelKey, modelVersion string, request ParameterSetStatusUpdateRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.UpdateDefaultParameterSetStatus(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) DefaultParameterSetPromotionPlan(ctx context.Context, modelKey, modelVersion string) (ModelParameterSetPromotionPlan, error) {
	return svc.modelGovernance.DefaultParameterSetPromotionPlan(ctx, modelKey, modelVersion)
}

func (svc *Service) PromoteDefaultParameterSetToApproved(ctx context.Context, modelKey, modelVersion string, request ParameterSetPromotionRequest, defaultSourceSystem, defaultRequestedBy string) (ModelParameterSetTransitionResponse, int, error) {
	return svc.modelGovernance.PromoteDefaultParameterSetToApproved(ctx, modelKey, modelVersion, request, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) RegisterBenchmarkRun(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (BenchmarkRunRecord, int, error) {
	return svc.modelGovernance.RegisterBenchmarkRun(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetBenchmarkRun(ctx context.Context, benchmarkRunID string) (BenchmarkRunRecord, error) {
	return svc.modelGovernance.GetBenchmarkRun(ctx, benchmarkRunID)
}

func (svc *Service) ListBenchmarkRuns(ctx context.Context, filter BenchmarkRunFilter) (ListBenchmarkRunsResponse, error) {
	return svc.modelGovernance.ListBenchmarkRuns(ctx, filter)
}

func (svc *Service) GetModelRun(ctx context.Context, modelRunID string) (json.RawMessage, error) {
	return svc.modelGovernance.GetModelRun(ctx, modelRunID)
}

func (svc *Service) ListModelRuns(ctx context.Context, filter ModelRunFilter) (ListModelRunsResponse, error) {
	return svc.modelGovernance.ListModelRuns(ctx, filter)
}

func (svc *Service) ValidateContractDocument(bytes []byte) (ContractValidationResponse, error) {
	return validateContractDocument(bytes, svc.validator)
}

func (svc *Service) ConfirmDraftDocument(ctx context.Context, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ContractValidationResponse, error) {
	return svc.draftWorkflows.ConfirmDraftDocument(ctx, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetDraftConfirmation(ctx context.Context, confirmationID string) (DraftConfirmationRecord, error) {
	return svc.draftWorkflows.GetDraftConfirmation(ctx, confirmationID)
}

func (svc *Service) ConstraintApplicationPlan(ctx context.Context, confirmationID string) (ConstraintApplicationPlan, error) {
	return svc.draftWorkflows.ConstraintApplicationPlan(ctx, confirmationID)
}

func (svc *Service) SubmitResultExplanation(ctx context.Context, jobID string, bytes []byte, defaultSourceSystem, defaultRequestedBy string) (ResultExplanationRecord, int, error) {
	return svc.resultExplanations.SubmitResultExplanation(ctx, jobID, bytes, defaultSourceSystem, defaultRequestedBy)
}

func (svc *Service) GetResultExplanation(ctx context.Context, jobID, explanationID string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.GetResultExplanation(ctx, jobID, explanationID)
}

func (svc *Service) ReviewResultExplanation(ctx context.Context, jobID, explanationID string, request ResultExplanationReviewRequest, reviewer string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.ReviewResultExplanation(ctx, jobID, explanationID, request, reviewer)
}

func (svc *Service) PublishResultExplanation(ctx context.Context, jobID, explanationID, publisher string) (ResultExplanationRecord, error) {
	return svc.resultExplanations.PublishResultExplanation(ctx, jobID, explanationID, publisher)
}

func (svc *Service) PromoteDraftConfirmationToSimulationCheck(ctx context.Context, confirmationID string) (JobSnapshot, int, error) {
	return svc.draftWorkflows.PromoteDraftConfirmationToSimulationCheck(ctx, confirmationID)
}

func (svc *Service) ArtifactMetadata(ctx context.Context, artifactID string) (ArtifactRecord, error) {
	return svc.artifactLifecycle.ArtifactMetadata(ctx, artifactID)
}

func (svc *Service) DownloadArtifact(ctx context.Context, artifactID string) (ArtifactRecord, []byte, error) {
	return svc.artifactLifecycle.DownloadArtifact(ctx, artifactID)
}

func (svc *Service) SweepArtifactRetention(ctx context.Context, options ArtifactRetentionSweepOptions) (ArtifactRetentionSweepReport, error) {
	return svc.artifactLifecycle.SweepArtifactRetention(ctx, options)
}

func (svc *Service) Metrics(ctx context.Context) (MetricsSnapshot, error) {
	return svc.metricsSnapshot.Metrics(ctx)
}

func snapshotFrom(job JobRecord, artifacts []ArtifactRecord, eventCount int) JobSnapshot {
	if artifacts == nil {
		artifacts = []ArtifactRecord{}
	}
	return JobSnapshot{Job: job, Artifacts: artifacts, EventCount: eventCount}
}

func rawMessagesOrEmpty(values []json.RawMessage) []any {
	result := make([]any, 0, len(values))
	for _, raw := range values {
		result = append(result, rawOrNull(raw))
	}
	return result
}

func findModelVersionIndex(catalog ModelCatalogResponse, modelKey, modelVersion string) (int, int) {
	for modelIndex, model := range catalog.Models {
		if model.ModelKey != modelKey {
			continue
		}
		for versionIndex, version := range model.Versions {
			if version.ModelVersion == modelVersion {
				return modelIndex, versionIndex
			}
		}
		return modelIndex, -1
	}
	return -1, -1
}

func findBenchmarkCase(version ModelCatalogVersion, benchmarkCaseID string) (ModelBenchmarkCase, bool) {
	for _, benchmarkCase := range version.BenchmarkCases {
		if benchmarkCase.BenchmarkCaseID == benchmarkCaseID {
			return benchmarkCase, true
		}
	}
	return ModelBenchmarkCase{}, false
}

func validParameterSetStatus(status string) bool {
	switch status {
	case "draft", "candidate", "validated", "approved", "retired":
		return true
	default:
		return false
	}
}

func allowedParameterSetTransition(fromStatus, toStatus string) bool {
	if fromStatus == "retired" {
		return false
	}
	if toStatus == "retired" {
		return true
	}
	order := map[string]int{
		"draft":     0,
		"candidate": 1,
		"validated": 2,
		"approved":  3,
	}
	from, fromOK := order[fromStatus]
	to, toOK := order[toStatus]
	return fromOK && toOK && to == from+1
}

func copyStringAnyMap(value map[string]any) map[string]any {
	copy := map[string]any{}
	for key, raw := range value {
		copy[key] = raw
	}
	return copy
}

func modelCatalogResponseToMap(catalog ModelCatalogResponse) map[string]any {
	var value map[string]any
	bytes, _ := json.Marshal(catalog)
	_ = json.Unmarshal(bytes, &value)
	return value
}

func artifactRetention(metadata map[string]any) (string, *time.Time, error) {
	retentionPolicy := defaultString(stringValue(metadata, "retention_policy"), "retain_forever")
	switch retentionPolicy {
	case "retain_forever", "ttl", "archive_candidate":
	default:
		return "", nil, ValidationError("retention_policy is invalid")
	}
	rawRetainUntil := stringValue(metadata, "retain_until")
	if rawRetainUntil == "" {
		return retentionPolicy, nil, nil
	}
	retainUntil, err := time.Parse(time.RFC3339Nano, rawRetainUntil)
	if err != nil {
		return "", nil, ValidationError("retain_until must be RFC3339")
	}
	return retentionPolicy, &retainUntil, nil
}

func simulationCheckExecution(jobType string) map[string]any {
	requiredCapabilities := []any{}
	switch jobType {
	case "simulation.material_balance.v1":
		requiredCapabilities = []any{"material_balance", "ode"}
	case "simulation.asm1slim.v1":
		requiredCapabilities = []any{"asm1slim", "ode"}
	case "simulation.asm1.v1":
		requiredCapabilities = []any{"asm1", "ode"}
	case "simulation.asm3.v1":
		requiredCapabilities = []any{"asm3", "ode"}
	case "simulation.udm.v1":
		requiredCapabilities = []any{"udm", "ode"}
	}
	return map[string]any{
		"time_limit_sec":        600,
		"priority":              "normal",
		"required_capabilities": requiredCapabilities,
	}
}

func validateProcessGraphForSimulationInput(processGraph map[string]any) error {
	components := stringsFromAny(mapValue(processGraph, "component_schema")["components"])
	if len(components) == 0 {
		return ValidationError("process_graph.component_schema.components is required")
	}
	nodeIDs := map[string]bool{}
	nodes := sliceFromAny(processGraph["nodes"])
	if len(nodes) < 2 {
		return ValidationError("process_graph.nodes must include at least two nodes")
	}
	for index, item := range nodes {
		node, ok := item.(map[string]any)
		if !ok {
			return ValidationError(fmt.Sprintf("process_graph.nodes[%d] must be an object", index))
		}
		nodeID := stringValue(node, "node_id")
		if nodeID == "" {
			return ValidationError(fmt.Sprintf("process_graph.nodes[%d].node_id is required", index))
		}
		if nodeIDs[nodeID] {
			return ValidationError("process_graph contains duplicate node_id: " + nodeID)
		}
		if mapValue(node, "initial_conditions") == nil {
			return ValidationError("process_graph node initial_conditions is required: " + nodeID)
		}
		nodeIDs[nodeID] = true
	}
	edges := sliceFromAny(processGraph["edges"])
	if len(edges) == 0 {
		return ValidationError("process_graph.edges must include at least one edge")
	}
	edgeIDs := map[string]bool{}
	for index, item := range edges {
		edge, ok := item.(map[string]any)
		if !ok {
			return ValidationError(fmt.Sprintf("process_graph.edges[%d] must be an object", index))
		}
		edgeID := stringValue(edge, "edge_id")
		if edgeID == "" {
			return ValidationError(fmt.Sprintf("process_graph.edges[%d].edge_id is required", index))
		}
		if edgeIDs[edgeID] {
			return ValidationError("process_graph contains duplicate edge_id: " + edgeID)
		}
		edgeIDs[edgeID] = true
		if !nodeIDs[stringValue(edge, "source_node_id")] {
			return ValidationError("process_graph edge references unknown source node: " + edgeID)
		}
		if !nodeIDs[stringValue(edge, "target_node_id")] {
			return ValidationError("process_graph edge references unknown target node: " + edgeID)
		}
		transform := mapValue(edge, "concentration_transform")
		for _, component := range components {
			factor := mapValue(transform, component)
			if factor == nil {
				return ValidationError("process_graph edge concentration_transform missing component: " + edgeID + "." + component)
			}
			if _, ok := factor["a"]; !ok {
				return ValidationError("process_graph edge concentration_transform missing a: " + edgeID + "." + component)
			}
			if _, ok := factor["b"]; !ok {
				return ValidationError("process_graph edge concentration_transform missing b: " + edgeID + "." + component)
			}
		}
	}
	return nil
}

func processGraphSimulationNodes(processGraph map[string]any) []any {
	nodes := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["nodes"]) {
		node, ok := item.(map[string]any)
		if !ok {
			continue
		}
		nodeType := stringValue(node, "node_type")
		nodes = append(nodes, map[string]any{
			"node_id":                stringValue(node, "node_id"),
			"node_type":              nodeType,
			"initial_volume":         node["volume"],
			"initial_concentrations": mapValue(node, "initial_conditions"),
			"is_inlet":               nodeType == "input" || nodeType == "inlet",
			"is_outlet":              nodeType == "output" || nodeType == "outlet",
		})
	}
	return nodes
}

func processGraphSimulationEdges(processGraph map[string]any) []any {
	edges := make([]any, 0)
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edges = append(edges, map[string]any{
			"edge_id":                 stringValue(edge, "edge_id"),
			"source_node_id":          stringValue(edge, "source_node_id"),
			"target_node_id":          stringValue(edge, "target_node_id"),
			"flow_rate":               edge["flow_rate"],
			"concentration_transform": mapValue(edge, "concentration_transform"),
		})
	}
	return edges
}

func collectProcessGraphTimeSegments(processGraph map[string]any) []any {
	segments := map[string]map[string]any{}
	for _, item := range sliceFromAny(processGraph["edges"]) {
		edge, ok := item.(map[string]any)
		if !ok {
			continue
		}
		edgeID := stringValue(edge, "edge_id")
		for index, overrideItem := range sliceFromAny(edge["time_segment_overrides"]) {
			override, ok := overrideItem.(map[string]any)
			if !ok {
				continue
			}
			segmentID := stringValue(override, "segment_id")
			if segmentID == "" {
				segmentID = stringValue(override, "id")
			}
			if segmentID == "" {
				segmentID = fmt.Sprintf("seg_%d", index+1)
			}
			segment, ok := segments[segmentID]
			if !ok {
				segment = map[string]any{
					"id":             segmentID,
					"start_hour":     numberValueWithAliases(override, "start_hour", "startHour"),
					"end_hour":       numberValueWithAliases(override, "end_hour", "endHour"),
					"edge_overrides": map[string]any{},
				}
				segments[segmentID] = segment
			}
			edgeOverride := map[string]any{"factors": mapValue(override, "factors")}
			if rawFlow, ok := override["flow"]; ok && rawFlow != nil {
				edgeOverride["flow"] = rawFlow
			}
			segment["edge_overrides"].(map[string]any)[edgeID] = edgeOverride
		}
	}
	result := make([]any, 0, len(segments))
	for _, segment := range segments {
		result = append(result, segment)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].(map[string]any)
		right := result[j].(map[string]any)
		if left["start_hour"] == right["start_hour"] {
			if left["end_hour"] == right["end_hour"] {
				return stringValue(left, "id") < stringValue(right, "id")
			}
			return left["end_hour"].(float64) < right["end_hour"].(float64)
		}
		return left["start_hour"].(float64) < right["start_hour"].(float64)
	})
	return result
}

func sliceFromAny(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	return items
}

func numberValueWithAliases(value map[string]any, primary, fallback string) float64 {
	if raw, ok := value[primary].(float64); ok {
		return raw
	}
	if raw, ok := value[fallback].(float64); ok {
		return raw
	}
	return 0
}

func simulationCheckMetadata(requestID string, inputRef map[string]any, externalRefs map[string]any) map[string]any {
	metadata := map[string]any{
		"source":                "simulation_check_api",
		"simulation_request_id": requestID,
	}
	if externalRefs != nil {
		metadata["external_refs"] = externalRefs
	}
	inputRefMetadata := map[string]any{}
	for key, value := range inputRef {
		if key == "simulation_input" {
			continue
		}
		inputRefMetadata[key] = value
	}
	if len(inputRefMetadata) > 0 {
		metadata["input_ref"] = inputRefMetadata
	}
	return metadata
}

func safeIDPart(value string) string {
	var builder strings.Builder
	for _, char := range value {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			builder.WriteRune(char)
		} else {
			builder.WriteByte('_')
		}
	}
	if builder.Len() == 0 {
		return "unknown"
	}
	return builder.String()
}

func rawOrNull(raw json.RawMessage) any {
	if len(raw) == 0 {
		return nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil
	}
	return value
}

func required(value string, name string) string {
	if strings.TrimSpace(value) == "" {
		panic(ValidationError(name + " is required"))
	}
	return strings.TrimSpace(value)
}

func stringValue(value map[string]any, key string) string {
	raw, ok := value[key]
	if !ok || raw == nil {
		return ""
	}
	if text, ok := raw.(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func boolValue(value map[string]any, key string) bool {
	raw, ok := value[key]
	if !ok || raw == nil {
		return false
	}
	boolean, ok := raw.(bool)
	return ok && boolean
}

func mapValue(value map[string]any, key string) map[string]any {
	raw, ok := value[key]
	if !ok || raw == nil {
		return nil
	}
	record, ok := raw.(map[string]any)
	if !ok {
		return nil
	}
	return record
}

func builtInModelCatalog(generatedAt string) ModelCatalogResponse {
	minZero := 0.0
	minOne := 1.0
	runtimeTemplates := func(hours float64) []ModelParameterTemplate {
		return []ModelParameterTemplate{
			{
				ParameterKey: "hours",
				DisplayName:  "Simulation horizon",
				Unit:         "h",
				ValueType:    "number",
				Required:     true,
				DefaultValue: hours,
				MinValue:     &minZero,
			},
			{
				ParameterKey: "steps_per_hour",
				DisplayName:  "Steps per hour",
				ValueType:    "integer",
				Required:     true,
				DefaultValue: 20,
				MinValue:     &minOne,
			},
			{
				ParameterKey: "tolerance",
				DisplayName:  "Solver tolerance",
				ValueType:    "number",
				Required:     true,
				DefaultValue: 0.000001,
				MinValue:     &minZero,
			},
		}
	}
	workerSmokeBenchmark := func(modelKey, displayName, jobType, inputID, fixture, modelRunID string) ModelBenchmarkCase {
		return ModelBenchmarkCase{
			BenchmarkCaseID: "bc_" + modelKey + "_independent_v1",
			DisplayName:     displayName,
			Description:     displayName + " contract fixture covered by the worker CLI smoke matrix.",
			JobType:         jobType,
			InputRef: map[string]any{
				"simulation_input_id": inputID,
				"fixture":             fixture,
			},
			ExpectedMetrics: map[string]any{
				"convergence_status": "completed",
				"total_steps":        11,
			},
			Tolerance: map[string]any{
				"relative": 0.000001,
				"absolute": 0.000001,
			},
			Status:       "validated",
			Source:       "worker_cli_smoke",
			EvidenceRefs: []string{"model_run:" + modelRunID},
		}
	}
	workerModel := func(modelKey, displayName, description, jobType, inputID, fixture, modelRunID string, hours float64) ModelCatalogModel {
		return ModelCatalogModel{
			ModelKey:          modelKey,
			DisplayName:       displayName,
			Description:       description,
			SupportedJobTypes: []string{jobType},
			Versions: []ModelCatalogVersion{
				{
					ModelVersion:       modelKey + ".v1",
					Status:             "active",
					Runtime:            "simulation-worker",
					ReleasedAt:         "2026-05-30T00:00:00Z",
					ParameterTemplates: runtimeTemplates(hours),
					BenchmarkCases: []ModelBenchmarkCase{
						workerSmokeBenchmark(modelKey, displayName+" independent smoke", jobType, inputID, fixture, modelRunID),
					},
					Metadata: map[string]any{
						"default_parameter_set": "not_defined",
						"parameter_hash_source": "worker_model_parameter_payload",
					},
				},
			},
		}
	}
	parameters := map[string]any{
		"hours":          4,
		"steps_per_hour": 60,
	}
	parameterHash, _ := ResultHash(parameters)
	return ModelCatalogResponse{
		SchemaVersion: "model_catalog.v1",
		GeneratedAt:   generatedAt,
		Models: []ModelCatalogModel{
			{
				ModelKey:          "material_balance",
				DisplayName:       "Material Balance",
				Description:       "Deterministic material-balance model for P0/P1 smoke jobs.",
				SupportedJobTypes: []string{"simulation.material_balance.v1"},
				Versions: []ModelCatalogVersion{
					{
						ModelVersion: "material_balance.v1",
						Status:       "active",
						Runtime:      "simulation-worker",
						ReleasedAt:   "2026-05-25T00:00:00Z",
						ParameterTemplates: []ModelParameterTemplate{
							{
								ParameterKey: "hours",
								DisplayName:  "Simulation horizon",
								Unit:         "h",
								ValueType:    "number",
								Required:     true,
								DefaultValue: 4,
								MinValue:     &minZero,
							},
							{
								ParameterKey: "steps_per_hour",
								DisplayName:  "Steps per hour",
								ValueType:    "integer",
								Required:     true,
								DefaultValue: 60,
								MinValue:     &minOne,
							},
						},
						BenchmarkCases: []ModelBenchmarkCase{
							{
								BenchmarkCaseID: "bc_material_balance_minimal_v1",
								DisplayName:     "Material balance minimal smoke",
								Description:     "Minimal three-node material-balance case used as a reproducible P0 benchmark.",
								JobType:         "simulation.material_balance.v1",
								InputRef: map[string]any{
									"simulation_input_id": "si_material_balance_minimal",
									"fixture":             "contracts/examples/valid/material_balance_minimal.simulation_input.v1.json",
								},
								ExpectedMetrics: map[string]any{
									"convergence_status": "completed",
									"warning_count":      0,
								},
								Tolerance: map[string]any{
									"relative": 0.000001,
									"absolute": 0.000001,
								},
								Status:       "validated",
								Source:       "built_in_smoke",
								EvidenceRefs: []string{"model_run:mr_material_balance_minimal"},
							},
						},
						DefaultParameterSet: &ModelParameterSet{
							ParameterSetID: "ps_material_balance_default_v1",
							Status:         "approved",
							ParameterHash:  parameterHash,
							Parameters:     parameters,
							Metadata: map[string]any{
								"scope": "p0_default",
							},
						},
					},
				},
			},
			workerModel(
				"asm1slim",
				"ASM1 Slim",
				"Independent ASM1Slim model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1slim.v1",
				"si_asm1slim_independent",
				"contracts/examples/valid/asm1slim_independent.simulation_input.v1.json",
				"mr_job_asm1slim_independent_asm1slim",
				1.0,
			),
			workerModel(
				"asm1",
				"ASM1",
				"Independent ASM1 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm1.v1",
				"si_asm1_independent",
				"contracts/examples/valid/asm1_independent.simulation_input.v1.json",
				"mr_job_asm1_independent_asm1",
				0.5,
			),
			workerModel(
				"asm3",
				"ASM3",
				"Independent ASM3 model job type covered by the simulation worker smoke matrix.",
				"simulation.asm3.v1",
				"si_asm3_independent",
				"contracts/examples/valid/asm3_independent.simulation_input.v1.json",
				"mr_job_asm3_independent_asm3",
				0.5,
			),
			workerModel(
				"udm",
				"UDM",
				"Independent UDM model job type covered by the simulation worker smoke matrix.",
				"simulation.udm.v1",
				"si_udm_independent",
				"contracts/examples/valid/udm_independent.simulation_input.v1.json",
				"mr_job_udm_independent_udm",
				0.5,
			),
		},
		Metadata: map[string]any{
			"source": "built_in",
		},
	}
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}
