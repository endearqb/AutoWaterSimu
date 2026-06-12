package compute

import (
	"io"
	"net/http"
	"strings"
)

func (server *Server) validateContract(w http.ResponseWriter, r *http.Request) {
	if _, err := server.auth.Principal(r, "job:create"); err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	response, err := server.service.ValidateContractDocument(bytes)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) confirmDraft(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	bytes, err := io.ReadAll(r.Body)
	if err != nil {
		WriteError(w, ValidationError("read request body failed"))
		return
	}
	response, err := server.service.ConfirmDraftDocumentForScope(
		withAuditPrincipal(r.Context(), *principal, r),
		bytes,
		"compute-api",
		principal.Name,
		filterForPrincipalDataScope(ListFilter{}, *principal),
	)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, response)
}

func (server *Server) draftConfirmationByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/contracts/confirmations/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || strings.TrimSpace(parts[0]) == "" {
		WriteError(w, ValidationError("confirmation_id is required"))
		return
	}
	confirmationID := parts[0]
	if len(parts) == 1 && r.Method == http.MethodGet {
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.GetDraftConfirmation(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		if err := authorizeRecordDataScope(*principal, "draft confirmation", record.TenantID, record.ProjectID, record.SiteID); err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
		return
	}
	if len(parts) == 2 && parts[1] == "promote-simulation-check" && r.Method == http.MethodPost {
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.GetDraftConfirmation(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		if err := authorizeRecordDataScope(*principal, "draft confirmation", record.TenantID, record.ProjectID, record.SiteID); err != nil {
			WriteError(w, err)
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		snapshot, status, err := server.service.PromoteDraftConfirmationToSimulationCheckForScope(withAuditPrincipal(r.Context(), *principal, r), confirmationID, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, snapshot)
		return
	}
	if len(parts) == 2 && parts[1] == "constraint-application-plan" && r.Method == http.MethodGet {
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		record, err := server.service.GetDraftConfirmation(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		if err := authorizeRecordDataScope(*principal, "draft confirmation", record.TenantID, record.ProjectID, record.SiteID); err != nil {
			WriteError(w, err)
			return
		}
		plan, err := server.service.ConstraintApplicationPlan(r.Context(), confirmationID)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, plan)
		return
	}
	w.WriteHeader(http.StatusNotFound)
}
