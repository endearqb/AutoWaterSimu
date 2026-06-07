package compute

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (server *Server) jobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		bytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, ValidationError("read request body failed"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		snapshot, status, err := server.service.CreateJobForScope(withAuditPrincipal(r.Context(), *principal, r), bytes, r.Header.Get("Idempotency-Key"), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, snapshot)
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter, err := listFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter = filterForPrincipalDataScope(filter, *principal)
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
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
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
		if err := authorizeJobDataScope(*principal, snapshot.Job); err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, snapshot)
		return
	}
	if err := server.authorizeJobRouteDataScope(r.Context(), *principal, jobID); err != nil {
		WriteError(w, err)
		return
	}
	if len(parts) == 2 && parts[1] == "result-explanations" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		bytes, err := io.ReadAll(r.Body)
		if err != nil {
			WriteError(w, ValidationError("read request body failed"))
			return
		}
		record, status, err := server.service.SubmitResultExplanation(withAuditPrincipal(r.Context(), *principal, r), jobID, bytes, "compute-api", principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, record)
		return
	}
	if len(parts) == 3 && parts[1] == "result-explanations" && r.Method == http.MethodGet {
		record, err := server.service.GetResultExplanation(r.Context(), jobID, parts[2])
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 4 && parts[1] == "result-explanations" && parts[3] == "review" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request ResultExplanationReviewRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("result explanation review JSON is invalid"))
			return
		}
		record, err := server.service.ReviewResultExplanation(withAuditPrincipal(r.Context(), *principal, r), jobID, parts[2], request, principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 4 && parts[1] == "result-explanations" && parts[3] == "publish" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "explanation:write")
		if err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.PublishResultExplanation(withAuditPrincipal(r.Context(), *principal, r), jobID, parts[2], principal.Name)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
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
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		snapshot, err := server.service.CancelJob(withAuditPrincipal(r.Context(), *principal, r), jobID)
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
	case "evidence":
		if _, err := server.auth.Principal(r, "evidence:read"); err != nil {
			WriteError(w, err)
			return
		}
		evidence, checksum, err := server.service.EvidencePackage(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		w.Header().Set("X-Evidence-Checksum", checksum)
		WriteJSON(w, http.StatusOK, evidence)
	case "production-readiness":
		if _, err := server.auth.Principal(r, "evidence:read"); err != nil {
			WriteError(w, err)
			return
		}
		report, err := server.service.ProductionReadiness(r.Context(), jobID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, report)
	case "evidence-ref":
		if _, err := server.auth.Principal(r, "evidence:read"); err != nil {
			WriteError(w, err)
			return
		}
		resolution, err := server.service.ResolveEvidenceReference(r.Context(), jobID, r.URL.Query().Get("ref"))
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, resolution)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (server *Server) authorizeJobRouteDataScope(ctx context.Context, principal Principal, jobID string) error {
	snapshot, err := server.service.GetJob(ctx, jobID)
	if err != nil {
		return err
	}
	return authorizeJobDataScope(principal, snapshot.Job)
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
