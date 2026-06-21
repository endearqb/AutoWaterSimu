package compute

import (
	"autowatersimu/apps/api/internal/platform/httpx"
	"log/slog"
	"net/http"
)

type Server struct {
	service *Service
	auth    PrincipalProvider
	logger  *slog.Logger
}

func NewServer(service *Service, auth PrincipalProvider, logger *slog.Logger) *Server {
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
	mux.HandleFunc("/api/v1/scenarios", server.scenarios)
	mux.HandleFunc("/api/v1/scenarios/", server.scenarioByID)
	mux.HandleFunc("/api/v1/canvas-graphs", server.canvasGraphs)
	mux.HandleFunc("/api/v1/canvas-graphs/", server.canvasGraphByID)
	mux.HandleFunc("/api/v1/context-snapshots", server.contextSnapshots)
	mux.HandleFunc("/api/v1/context-snapshots/", server.contextSnapshotByID)
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
	return recoverPanics(httpx.WithLocalCORS(mux))
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
