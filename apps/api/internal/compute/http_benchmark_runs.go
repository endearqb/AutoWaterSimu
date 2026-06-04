package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
)

func handleBenchmarkRuns(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion string) {
	switch r.Method {
	case http.MethodGet:
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		filter, err := benchmarkRunListFilter(r, modelKey, modelVersion)
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
		if stringValue(document, "model_key") != modelKey || stringValue(document, "model_version") != modelVersion {
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
		ParameterSetID:  query.Get("parameter_set_id"),
	}, nil
}
