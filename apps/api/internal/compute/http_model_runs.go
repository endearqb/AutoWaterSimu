package compute

import (
	"net/http"
	"strconv"
	"strings"
)

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
