package compute

import (
	domainmodels "autowatersimu/apps/api/internal/domain/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func (server *Server) modelRuns(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet) {
		return
	}
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	filter, err := modelRunListFilter(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	if principalHasDataScope(*principal) {
		if strings.TrimSpace(filter.JobID) == "" {
			WriteError(w, NewAppError(http.StatusForbidden, CodeForbidden, "job_id is required for scoped model_run list", false, nil))
			return
		}
		if err := server.authorizeJobRouteDataScope(r.Context(), *principal, filter.JobID); err != nil {
			WriteError(w, err)
			return
		}
	}
	response, err := server.service.ListModelRuns(r.Context(), filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) modelRunByID(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet) {
		return
	}
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	modelRunID := strings.TrimPrefix(r.URL.Path, "/api/v1/model-runs/")
	modelRun, err := server.service.GetModelRun(r.Context(), modelRunID)
	if err != nil {
		WriteError(w, err)
		return
	}
	jobID, err := modelRunJobID(modelRun)
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := server.authorizeJobRouteDataScope(r.Context(), *principal, jobID); err != nil {
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

func modelRunJobID(modelRun json.RawMessage) (string, error) {
	_, jobID, _, _, _, err := domainmodels.RunFieldsFromRaw(modelRun)
	if err != nil || strings.TrimSpace(jobID) == "" {
		return "", NewAppError(http.StatusInternalServerError, CodeInternal, "stored model_run JSON is invalid", true, nil)
	}
	return jobID, nil
}
