package compute

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
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
	mux.HandleFunc("GET /metrics", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = w.Write([]byte("# HELP autowatersimu_compute_api_up Compute API health\n# TYPE autowatersimu_compute_api_up gauge\nautowatersimu_compute_api_up 1\n"))
	})
	mux.HandleFunc("/api/v1/compute/jobs", server.jobs)
	mux.HandleFunc("/api/v1/compute/jobs/", server.jobByID)
	mux.HandleFunc("/api/v1/artifacts/", server.artifactByID)
	mux.HandleFunc("/api/v1/workers/register", server.registerWorker)
	mux.HandleFunc("/api/v1/workers/", server.workerRoute)
	return recoverPanics(mux)
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
