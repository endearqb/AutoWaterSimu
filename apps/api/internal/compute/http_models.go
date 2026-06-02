package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
)

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
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "promotion-plan" && r.Method == http.MethodGet {
		if _, err := server.auth.Principal(r, "job:read"); err != nil {
			WriteError(w, err)
			return
		}
		response, err := server.service.DefaultParameterSetPromotionPlan(r.Context(), parts[0], parts[2])
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
		return
	}
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "promote-approved" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "model:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		request, err := readParameterSetPromotionRequest(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		response, status, err := server.service.PromoteDefaultParameterSetToApproved(r.Context(), parts[0], parts[2], request, "compute-api", principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, response)
		return
	}
	if len(parts) == 6 && parts[1] == "versions" && parts[3] == "benchmark-cases" && parts[5] == "schedule-run" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		request, err := readBenchmarkCaseRunRequest(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		response, status, err := server.service.ScheduleBenchmarkCaseRun(withAuditPrincipal(r.Context(), *principal, r), parts[0], parts[2], parts[4], request, "compute-api", principal.Name)
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
		ParameterSetID:  query.Get("parameter_set_id"),
	}, nil
}

func readBenchmarkCaseRunRequest(r *http.Request) (BenchmarkCaseRunRequest, error) {
	var request BenchmarkCaseRunRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, ValidationError("read request body failed")
	}
	if strings.TrimSpace(string(body)) == "" {
		return request, nil
	}
	if err := json.Unmarshal(body, &request); err != nil {
		return request, ValidationError("benchmark case run request JSON is invalid")
	}
	return request, nil
}

func readParameterSetPromotionRequest(r *http.Request) (ParameterSetPromotionRequest, error) {
	var request ParameterSetPromotionRequest
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return request, ValidationError("read request body failed")
	}
	if strings.TrimSpace(string(body)) == "" {
		return request, nil
	}
	if err := json.Unmarshal(body, &request); err != nil {
		return request, ValidationError("parameter set promotion request JSON is invalid")
	}
	return request, nil
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
