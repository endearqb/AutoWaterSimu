package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

func handleDefaultParameterSetStatus(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion string) {
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
	filter := modelCatalogSnapshotFilterForPrincipal(ModelCatalogSnapshotFilter{CatalogID: "default"}, *principal)
	response, status, err := server.service.UpdateDefaultParameterSetStatusForScope(withAuditPrincipal(r.Context(), *principal, r), modelKey, modelVersion, request, "compute-api", principal.Name, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, response)
}

func handleDefaultParameterSetPromotionPlan(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion string) {
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	catalogFilter := modelCatalogSnapshotFilterForPrincipal(ModelCatalogSnapshotFilter{CatalogID: "default"}, *principal)
	evidenceFilter, err := modelPromotionEvidenceFilter(server, w, r, *principal, "promotion plan")
	if err != nil {
		return
	}
	response, err := server.service.DefaultParameterSetPromotionPlanForScope(r.Context(), modelKey, modelVersion, catalogFilter, evidenceFilter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func handleDefaultParameterSetPromoteApproved(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion string) {
	principal, err := server.auth.Principal(r, "model:write")
	if err != nil {
		WriteError(w, err)
		return
	}
	catalogFilter := modelCatalogSnapshotFilterForPrincipal(ModelCatalogSnapshotFilter{CatalogID: "default"}, *principal)
	evidenceFilter, err := modelPromotionEvidenceFilter(server, w, r, *principal, "promotion")
	if err != nil {
		return
	}
	request, err := readParameterSetPromotionRequest(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	response, status, err := server.service.PromoteDefaultParameterSetToApprovedForScope(withAuditPrincipal(r.Context(), *principal, r), modelKey, modelVersion, request, "compute-api", principal.Name, catalogFilter, evidenceFilter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, response)
}

func modelPromotionEvidenceFilter(server *Server, w http.ResponseWriter, r *http.Request, principal Principal, actionLabel string) (BenchmarkRunFilter, error) {
	jobID := strings.TrimSpace(r.URL.Query().Get("job_id"))
	if jobID == "" {
		if principalHasDataScope(principal) {
			err := NewAppError(http.StatusForbidden, CodeForbidden, "scoped model catalog "+actionLabel+" requires authorized job_id", false, nil)
			WriteError(w, err)
			return BenchmarkRunFilter{}, err
		}
		return BenchmarkRunFilter{}, nil
	}
	if err := server.authorizeJobRouteDataScope(r.Context(), principal, jobID); err != nil {
		WriteError(w, err)
		return BenchmarkRunFilter{}, err
	}
	return BenchmarkRunFilter{JobID: jobID}, nil
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
