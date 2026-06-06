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
	response, status, err := server.service.UpdateDefaultParameterSetStatus(withAuditPrincipal(r.Context(), *principal, r), modelKey, modelVersion, request, "compute-api", principal.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, response)
}

func handleDefaultParameterSetPromotionPlan(server *Server, w http.ResponseWriter, r *http.Request, modelKey, modelVersion string) {
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	response, err := server.service.DefaultParameterSetPromotionPlan(r.Context(), modelKey, modelVersion)
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
	request, err := readParameterSetPromotionRequest(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	response, status, err := server.service.PromoteDefaultParameterSetToApproved(withAuditPrincipal(r.Context(), *principal, r), modelKey, modelVersion, request, "compute-api", principal.Name)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, response)
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
