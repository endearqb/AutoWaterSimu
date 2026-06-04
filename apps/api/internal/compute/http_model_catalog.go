package compute

import (
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
		handleModelCatalogSnapshots(server, w, r)
		return
	}
	if len(parts) == 1 && r.Method == http.MethodGet {
		handleModelCatalogModel(server, w, r, parts[0])
		return
	}
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "status" && r.Method == http.MethodPost {
		handleDefaultParameterSetStatus(server, w, r, parts[0], parts[2])
		return
	}
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "promotion-plan" && r.Method == http.MethodGet {
		handleDefaultParameterSetPromotionPlan(server, w, r, parts[0], parts[2])
		return
	}
	if len(parts) == 5 && parts[1] == "versions" && parts[3] == "default-parameter-set" && parts[4] == "promote-approved" && r.Method == http.MethodPost {
		handleDefaultParameterSetPromoteApproved(server, w, r, parts[0], parts[2])
		return
	}
	if len(parts) == 6 && parts[1] == "versions" && parts[3] == "benchmark-cases" && parts[5] == "schedule-run" && r.Method == http.MethodPost {
		handleBenchmarkCaseScheduleRun(server, w, r, parts[0], parts[2], parts[4])
		return
	}
	if len(parts) == 4 && parts[1] == "versions" && parts[3] == "benchmark-runs" {
		handleBenchmarkRuns(server, w, r, parts[0], parts[2])
		return
	}
	w.WriteHeader(http.StatusNotFound)
}

func handleModelCatalogSnapshots(server *Server, w http.ResponseWriter, r *http.Request) {
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
}

func handleModelCatalogModel(server *Server, w http.ResponseWriter, r *http.Request, modelKey string) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	model, err := server.service.ModelCatalogModel(r.Context(), modelKey)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, model)
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
