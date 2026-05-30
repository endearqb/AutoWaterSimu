package compute

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Server struct {
	service *Service
	auth    *Authenticator
	logger  *slog.Logger
}

func NewServer(service *Service, auth *Authenticator, logger *slog.Logger) *Server {
	return &Server{service: service, auth: auth, logger: logger}
}

func (server *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]any{"status": "ready"})
	})
	mux.HandleFunc("GET /metrics", server.metrics)
	mux.HandleFunc("/api/v1/compute/jobs", server.jobs)
	mux.HandleFunc("/api/v1/compute/jobs/", server.jobByID)
	mux.HandleFunc("/api/v1/process-graphs", server.processGraphs)
	mux.HandleFunc("/api/v1/process-graphs/", server.processGraphByID)
	mux.HandleFunc("/api/v1/simulation-inputs", server.simulationInputs)
	mux.HandleFunc("/api/v1/simulation-inputs/", server.simulationInputByID)
	mux.HandleFunc("/api/v1/simulation-checks", server.simulationChecks)
	mux.HandleFunc("/api/v1/admin/artifacts/retention-sweep", server.artifactRetentionSweep)
	mux.HandleFunc("/api/v1/artifacts/", server.artifactByID)
	mux.HandleFunc("/api/v1/contracts/validate", server.validateContract)
	mux.HandleFunc("/api/v1/contracts/confirm-draft", server.confirmDraft)
	mux.HandleFunc("/api/v1/contracts/confirmations/", server.draftConfirmationByID)
	mux.HandleFunc("/api/v1/model-catalog", server.modelCatalog)
	mux.HandleFunc("/api/v1/model-catalog/", server.modelCatalogByKey)
	mux.HandleFunc("/api/v1/benchmark-runs/", server.benchmarkRunByID)
	mux.HandleFunc("/api/v1/model-runs", server.modelRuns)
	mux.HandleFunc("/api/v1/model-runs/", server.modelRunByID)
	mux.HandleFunc("/api/v1/workers/register", server.registerWorker)
	mux.HandleFunc("/api/v1/workers/", server.workerRoute)
	return recoverPanics(withLocalCORS(mux))
}

func (server *Server) metrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	snapshot, err := server.service.Metrics(r.Context())
	if err != nil {
		http.Error(w, "metrics unavailable", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	_, _ = w.Write([]byte(renderPrometheusMetrics(snapshot)))
}

func renderPrometheusMetrics(snapshot MetricsSnapshot) string {
	var builder strings.Builder
	builder.WriteString("# HELP autowatersimu_compute_api_up Compute API health\n")
	builder.WriteString("# TYPE autowatersimu_compute_api_up gauge\n")
	builder.WriteString("autowatersimu_compute_api_up 1\n")
	builder.WriteString("# HELP autowatersimu_compute_jobs_total Compute jobs by status\n")
	builder.WriteString("# TYPE autowatersimu_compute_jobs_total gauge\n")
	statuses := make([]string, 0, len(snapshot.JobsByStatus))
	for status := range snapshot.JobsByStatus {
		statuses = append(statuses, status)
	}
	sort.Strings(statuses)
	for _, status := range statuses {
		_, _ = fmt.Fprintf(
			&builder,
			"autowatersimu_compute_jobs_total{status=\"%s\"} %d\n",
			prometheusLabelValue(status),
			snapshot.JobsByStatus[status],
		)
	}
	builder.WriteString("# HELP autowatersimu_compute_workers_registered_total Registered workers\n")
	builder.WriteString("# TYPE autowatersimu_compute_workers_registered_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_workers_registered_total %d\n", snapshot.WorkersRegistered)
	builder.WriteString("# HELP autowatersimu_compute_artifacts_total Stored artifact metadata records\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifacts_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifacts_total %d\n", snapshot.ArtifactsTotal)
	builder.WriteString("# HELP autowatersimu_compute_artifact_archives_total Archived artifact metadata records\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifact_archives_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifact_archives_total %d\n", snapshot.ArtifactArchives)
	builder.WriteString("# HELP autowatersimu_compute_artifact_retention_candidates_total Artifacts currently eligible for retention processing\n")
	builder.WriteString("# TYPE autowatersimu_compute_artifact_retention_candidates_total gauge\n")
	_, _ = fmt.Fprintf(&builder, "autowatersimu_compute_artifact_retention_candidates_total %d\n", snapshot.RetentionCandidates)
	return builder.String()
}

func prometheusLabelValue(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, "\n", "\\n")
	value = strings.ReplaceAll(value, "\"", "\\\"")
	return value
}

func withLocalCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if allowLocalOrigin(w, r.Header.Get("Origin")) {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
			w.Header().Set("Access-Control-Expose-Headers", "X-Artifact-Checksum, X-Evidence-Checksum")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func allowLocalOrigin(w http.ResponseWriter, origin string) bool {
	if origin == "" {
		return false
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	switch strings.ToLower(parsed.Hostname()) {
	case "localhost", "127.0.0.1", "::1":
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Add("Vary", "Origin")
		return true
	default:
		return false
	}
}

func (server *Server) jobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		if _, err := server.auth.Principal(r, "job:create"); err != nil {
			WriteError(w, err)
			return
		}
		bytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, ValidationError("read request body failed"))
			return
		}
		snapshot, status, err := server.service.CreateJob(r.Context(), bytes, r.Header.Get("Idempotency-Key"))
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, snapshot)
	case http.MethodGet:
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		filter, err := listFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		response, err := server.service.ListJobs(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) simulationInputs(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	record, status, err := server.service.RegisterSimulationInput(r.Context(), bytes, "compute-api", principal.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, record)
}

func (server *Server) simulationInputByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	simulationInputID := strings.TrimPrefix(r.URL.Path, "/api/v1/simulation-inputs/")
	if strings.TrimSpace(simulationInputID) == "" {
		WriteError(w, ValidationError("simulation_input_id is required"))
		return
	}
	record, err := server.service.GetSimulationInput(r.Context(), simulationInputID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func (server *Server) processGraphs(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	record, status, err := server.service.RegisterProcessGraph(r.Context(), bytes, "compute-api", principal.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, record)
}

func (server *Server) processGraphByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	processGraphID := strings.TrimPrefix(r.URL.Path, "/api/v1/process-graphs/")
	if strings.TrimSpace(processGraphID) == "" {
		WriteError(w, ValidationError("process_graph_id is required"))
		return
	}
	version, err := processGraphVersionQuery(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	record, err := server.service.GetProcessGraph(r.Context(), processGraphID, version)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func (server *Server) simulationChecks(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:create"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	snapshot, status, err := server.service.CreateSimulationCheck(r.Context(), bytes)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, snapshot)
}

func (server *Server) jobByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/compute/jobs/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		WriteError(w, ValidationError("job_id is required"))
		return
	}
	jobID := parts[0]
	if len(parts) == 1 && r.Method == http.MethodGet {
		snapshot, err := server.service.GetJob(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, snapshot)
		return
	}
	if len(parts) == 2 && parts[1] == "result-explanations" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		bytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, ValidationError("read request body failed"))
			return
		}
		record, status, err := server.service.SubmitResultExplanation(r.Context(), jobID, bytes, "compute-api", principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, record)
		return
	}
	if len(parts) == 3 && parts[1] == "result-explanations" && r.Method == http.MethodGet {
		record, err := server.service.GetResultExplanation(r.Context(), jobID, parts[2])
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 4 && parts[1] == "result-explanations" && parts[3] == "review" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request ResultExplanationReviewRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("result explanation review JSON is invalid"))
			return
		}
		record, err := server.service.ReviewResultExplanation(r.Context(), jobID, parts[2], request, principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 4 && parts[1] == "result-explanations" && parts[3] == "publish" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.PublishResultExplanation(r.Context(), jobID, parts[2], principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) != 2 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	switch parts[1] {
	case "cancel":
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		if _, err := server.auth.Principal(r, "job:create"); err != nil {
			WriteError(w, err)
			return
		}
		snapshot, err := server.service.CancelJob(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, snapshot)
	case "events":
		events, err := server.service.Events(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{"items": events})
	case "result":
		result, err := server.service.Result(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	case "evidence":
		if _, err := server.auth.Principal(r, "evidence:read"); err != nil {
			WriteError(w, err)
			return
		}
		evidence, checksum, err := server.service.EvidencePackage(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		w.Header().Set("X-Evidence-Checksum", checksum)
		WriteJSON(w, http.StatusOK, evidence)
	case "evidence-ref":
		if _, err := server.auth.Principal(r, "evidence:read"); err != nil {
			WriteError(w, err)
			return
		}
		resolution, err := server.service.ResolveEvidenceReference(r.Context(), jobID, r.URL.Query().Get("ref"))
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, resolution)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (server *Server) artifactByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "artifact:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	artifactID := strings.TrimPrefix(r.URL.Path, "/api/v1/artifacts/")
	artifact, bytes, err := server.service.DownloadArtifact(r.Context(), artifactID)
	if err != nil {
		WriteError(w, err)
		return
	}
	w.Header().Set("Content-Type", artifact.ContentType)
	w.Header().Set("X-Artifact-Checksum", artifact.Checksum)
	_, _ = w.Write(bytes)
}

func (server *Server) artifactRetentionSweep(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "artifact:admin"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	request, err := readArtifactRetentionSweepRequest(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	dryRun := true
	if request.DryRun != nil {
		dryRun = *request.DryRun
	}
	report, err := server.service.SweepArtifactRetention(r.Context(), ArtifactRetentionSweepOptions{
		DryRun: dryRun,
		Limit:  request.Limit,
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, report)
}

func readArtifactRetentionSweepRequest(r *http.Request) (ArtifactRetentionSweepRequest, error) {
	var request ArtifactRetentionSweepRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, ValidationError("read request body failed")
	}
	if strings.TrimSpace(string(body)) == "" {
		return request, nil
	}
	if err := json.Unmarshal(body, &request); err != nil {
		return request, ValidationError("artifact retention sweep request JSON is invalid")
	}
	if request.Limit < 0 {
		return request, ValidationError("limit must be non-negative")
	}
	return request, nil
}

func (server *Server) validateContract(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:create"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	response, err := server.service.ValidateContractDocument(bytes)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) confirmDraft(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	response, err := server.service.ConfirmDraftDocument(r.Context(), bytes, "compute-api", principal.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) draftConfirmationByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/contracts/confirmations/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || strings.TrimSpace(parts[0]) == "" {
		WriteError(w, ValidationError("confirmation_id is required"))
		return
	}
	confirmationID := parts[0]
	if len(parts) == 1 && r.Method == http.MethodGet {
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.GetDraftConfirmation(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 2 && parts[1] == "promote-simulation-check" && r.Method == http.MethodPost {
		if _, err := server.auth.Principal(r, "job:create"); err != nil {
			WriteError(w, err)
			return
		}
		snapshot, status, err := server.service.PromoteDraftConfirmationToSimulationCheck(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, snapshot)
		return
	}
	if len(parts) == 2 && parts[1] == "constraint-application-plan" && r.Method == http.MethodGet {
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		plan, err := server.service.ConstraintApplicationPlan(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, plan)
		return
	}
	w.WriteHeader(http.StatusNotFound)
}

func (server *Server) modelCatalog(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		catalog, err := server.service.ModelCatalog(r.Context())
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, catalog)
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "model:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		bytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, ValidationError("read request body failed"))
			return
		}
		record, status, err := server.service.RegisterModelCatalog(r.Context(), bytes, "compute-api", principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, record)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) modelCatalogByKey(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/model-catalog/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 1 && parts[0] == "snapshots" && r.Method == http.MethodGet {
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		filter, err := modelCatalogSnapshotFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		response, err := server.service.ListModelCatalogSnapshots(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
		return
	}
	if len(parts) == 1 && r.Method == http.MethodGet {
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		model, err := server.service.ModelCatalogModel(r.Context(), parts[0])
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, model)
		return
	}
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "status" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "model:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request ParameterSetStatusUpdateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("parameter set status update JSON is invalid"))
			return
		}
		response, status, err := server.service.UpdateDefaultParameterSetStatus(r.Context(), parts[0], parts[2], request, "compute-api", principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, response)
		return
	}
	if len(parts) == 4 && parts[1] == "versions" && parts[3] == "benchmark-runs" {
		switch r.Method {
		case http.MethodGet:
			if _, err := server.auth.Principal(r, "job:read"); err != nil {
				WriteError(w, err)
				return
			}
			filter, err := benchmarkRunListFilter(r, parts[0], parts[2])
			if err != nil {
				WriteError(w, err)
				return
			}
			response, err := server.service.ListBenchmarkRuns(r.Context(), filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, response)
		case http.MethodPost:
			principal, err := server.auth.Principal(r, "model:write")
			if err != nil {
				WriteError(w, err)
				return
			}
			bytes, err := io.ReadAll(r.Body)
			if err != nil {
				WriteError(w, ValidationError("read request body failed"))
				return
			}
			var document map[string]any
			if err := json.Unmarshal(bytes, &document); err != nil {
				WriteError(w, ValidationError("benchmark_run JSON is invalid"))
				return
			}
			if stringValue(document, "model_key") != parts[0] || stringValue(document, "model_version") != parts[2] {
				WriteError(w, ValidationError("benchmark_run model_key/model_version must match route"))
				return
			}
			record, status, err := server.service.RegisterBenchmarkRun(r.Context(), bytes, "compute-api", principal.Name)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, status, record)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
		return
	}
	w.WriteHeader(http.StatusNotFound)
}

func (server *Server) benchmarkRunByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	benchmarkRunID := strings.TrimPrefix(r.URL.Path, "/api/v1/benchmark-runs/")
	record, err := server.service.GetBenchmarkRun(r.Context(), benchmarkRunID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func (server *Server) modelRuns(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	filter, err := modelRunListFilter(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	response, err := server.service.ListModelRuns(r.Context(), filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) modelRunByID(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	modelRunID := strings.TrimPrefix(r.URL.Path, "/api/v1/model-runs/")
	modelRun, err := server.service.GetModelRun(r.Context(), modelRunID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, modelRun)
}

func (server *Server) registerWorker(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "worker:register"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var request map[string]any
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		WriteError(w, ValidationError("worker register JSON is invalid"))
		return
	}
	worker, err := server.service.RegisterWorker(r.Context(), request)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, worker)
}

func (server *Server) workerRoute(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/workers/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) < 2 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	workerID := parts[0]
	switch {
	case len(parts) == 2 && parts[1] == "claim":
		if _, err := server.auth.Principal(r, "worker:claim"); err != nil {
			WriteError(w, err)
			return
		}
		result, err := server.service.Claim(r.Context(), workerID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	case len(parts) == 2 && parts[1] == "heartbeat":
		if _, err := server.auth.Principal(r, "worker:heartbeat"); err != nil {
			WriteError(w, err)
			return
		}
		var request struct {
			JobID string `json:"job_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&request)
		result, err := server.service.Heartbeat(r.Context(), workerID, request.JobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	case len(parts) == 4 && parts[1] == "jobs" && parts[3] == "artifact":
		if _, err := server.auth.Principal(r, "artifact:write"); err != nil {
			WriteError(w, err)
			return
		}
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			WriteError(w, ValidationError("multipart artifact upload is invalid"))
			return
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			WriteError(w, ValidationError("multipart file is required"))
			return
		}
		defer file.Close()
		artifact, err := server.service.UploadArtifact(r.Context(), workerID, parts[2], r.FormValue("metadata"), file)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, artifact)
	case len(parts) == 4 && parts[1] == "jobs" && (parts[3] == "succeed" || parts[3] == "fail"):
		if _, err := server.auth.Principal(r, "job:write"); err != nil {
			WriteError(w, err)
			return
		}
		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("worker completion JSON is invalid"))
			return
		}
		attempt := int(numberValue(request, "attempt"))
		var snapshot JobSnapshot
		var err error
		if parts[3] == "succeed" {
			result, ok := request["compute_result"].(map[string]any)
			if !ok {
				result = request
			}
			snapshot, err = server.service.Complete(r.Context(), workerID, parts[2], attempt, result)
		} else {
			snapshot, err = server.service.Fail(r.Context(), workerID, parts[2], attempt, stringValue(request, "error_code"), stringValue(request, "error_message"))
		}
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, snapshot)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func listFilter(r *http.Request) (ListFilter, error) {
	query := r.URL.Query()
	limit := 50
	if raw := query.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return ListFilter{}, ValidationError("limit must be an integer")
		}
		limit = parsed
	}
	filter := ListFilter{
		Limit:   limit,
		Cursor:  query.Get("cursor"),
		Status:  query.Get("status"),
		JobType: query.Get("job_type"),
	}
	if raw := query.Get("created_after"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, ValidationError("created_after must be RFC3339")
		}
		filter.CreatedAfter = &value
	}
	if raw := query.Get("created_before"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return ListFilter{}, ValidationError("created_before must be RFC3339")
		}
		filter.CreatedBefore = &value
	}
	return filter, nil
}

func modelRunListFilter(r *http.Request) (ModelRunFilter, error) {
	query := r.URL.Query()
	limit := 50
	if raw := query.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return ModelRunFilter{}, ValidationError("limit must be an integer")
		}
		limit = parsed
	}
	return ModelRunFilter{
		Limit:        limit,
		Cursor:       query.Get("cursor"),
		JobID:        query.Get("job_id"),
		ModelKey:     query.Get("model_key"),
		ModelVersion: query.Get("model_version"),
	}, nil
}

func benchmarkRunListFilter(r *http.Request, modelKey, modelVersion string) (BenchmarkRunFilter, error) {
	query := r.URL.Query()
	limit := 50
	if raw := query.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return BenchmarkRunFilter{}, ValidationError("limit must be an integer")
		}
		limit = parsed
	}
	return BenchmarkRunFilter{
		Limit:           limit,
		Cursor:          query.Get("cursor"),
		ModelKey:        modelKey,
		ModelVersion:    modelVersion,
		BenchmarkCaseID: query.Get("benchmark_case_id"),
	}, nil
}

func modelCatalogSnapshotFilter(r *http.Request) (ModelCatalogSnapshotFilter, error) {
	query := r.URL.Query()
	limit := 50
	if raw := query.Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			return ModelCatalogSnapshotFilter{}, ValidationError("limit must be an integer")
		}
		limit = parsed
	}
	return ModelCatalogSnapshotFilter{
		CatalogID: query.Get("catalog_id"),
		Limit:     limit,
		Cursor:    query.Get("cursor"),
	}, nil
}

func processGraphVersionQuery(r *http.Request) (int, error) {
	raw := r.URL.Query().Get("version")
	if strings.TrimSpace(raw) == "" {
		return 1, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return 0, ValidationError("version must be a positive integer")
	}
	return parsed, nil
}

func recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				if err, ok := recovered.(*AppError); ok {
					WriteError(w, err)
					return
				}
				WriteError(w, NewAppError(http.StatusInternalServerError, CodeInternal, "internal server error", true, nil))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func numberValue(value map[string]any, key string) float64 {
	if raw, ok := value[key].(float64); ok {
		return raw
	}
	return 0
}
