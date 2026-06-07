package compute

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (server *Server) registerWorker(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "worker:register")
	if err != nil {
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
	worker, err := server.service.RegisterWorker(withAuditPrincipal(r.Context(), *principal, r), request)
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
		principal, err := server.auth.Principal(r, "worker:claim")
		if err != nil {
			WriteError(w, err)
			return
		}
		result, err := server.service.ClaimForScope(
			withAuditPrincipal(r.Context(), *principal, r),
			workerID,
			filterForPrincipalDataScope(ListFilter{}, *principal),
		)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	case len(parts) == 2 && parts[1] == "heartbeat":
		principal, err := server.auth.Principal(r, "worker:heartbeat")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request struct {
			JobID string `json:"job_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&request)
		if strings.TrimSpace(request.JobID) != "" {
			if err := server.authorizeJobRouteDataScope(r.Context(), *principal, request.JobID); err != nil {
				WriteError(w, err)
				return
			}
		}
		result, err := server.service.Heartbeat(withAuditPrincipal(r.Context(), *principal, r), workerID, request.JobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, result)
	case len(parts) == 4 && parts[1] == "jobs" && parts[3] == "artifact":
		principal, err := server.auth.Principal(r, "artifact:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		jobID := parts[2]
		if err := server.authorizeJobRouteDataScope(r.Context(), *principal, jobID); err != nil {
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
		artifact, err := server.service.UploadArtifact(withAuditPrincipal(r.Context(), *principal, r), workerID, jobID, r.FormValue("metadata"), file)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, artifact)
	case len(parts) == 4 && parts[1] == "jobs" && (parts[3] == "succeed" || parts[3] == "fail"):
		principal, err := server.auth.Principal(r, "job:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		jobID := parts[2]
		if err := server.authorizeJobRouteDataScope(r.Context(), *principal, jobID); err != nil {
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
		var serviceErr error
		if parts[3] == "succeed" {
			result, ok := request["compute_result"].(map[string]any)
			if !ok {
				result = request
			}
			snapshot, serviceErr = server.service.Complete(withAuditPrincipal(r.Context(), *principal, r), workerID, jobID, attempt, result)
		} else {
			snapshot, serviceErr = server.service.Fail(withAuditPrincipal(r.Context(), *principal, r), workerID, jobID, attempt, stringValue(request, "error_code"), stringValue(request, "error_message"))
		}
		if serviceErr != nil {
			WriteError(w, serviceErr)
			return
		}
		WriteJSON(w, http.StatusOK, snapshot)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func numberValue(value map[string]any, key string) float64 {
	if raw, ok := value[key].(float64); ok {
		return raw
	}
	return 0
}
