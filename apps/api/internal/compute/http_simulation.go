package compute

import (
	"io"
	"net/http"
	"strconv"
	"strings"
)

func (server *Server) simulationInputs(w http.ResponseWriter, r *http.Request) {
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
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	record, status, err := server.service.RegisterSimulationInputForScope(withAuditPrincipal(r.Context(), *principal, r), bytes, "compute-api", principal.Name, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, record)
}

func (server *Server) simulationInputByID(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	simulationInputID := strings.TrimPrefix(r.URL.Path, "/api/v1/simulation-inputs/")
	if strings.TrimSpace(simulationInputID) == "" {
		WriteError(w, ValidationError("simulation_input_id is required"))
		return
	}
	record, err := server.service.GetSimulationInput(r.Context(), simulationInputID)
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := authorizeRecordDataScope(*principal, "simulation input", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func (server *Server) processGraphs(w http.ResponseWriter, r *http.Request) {
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
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	record, status, err := server.service.RegisterProcessGraphForScope(withAuditPrincipal(r.Context(), *principal, r), bytes, "compute-api", principal.Name, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, record)
}

func (server *Server) processGraphByID(w http.ResponseWriter, r *http.Request) {
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	processGraphID := strings.TrimPrefix(r.URL.Path, "/api/v1/process-graphs/")
	if strings.TrimSpace(processGraphID) == "" {
		WriteError(w, ValidationError("process_graph_id is required"))
		return
	}
	version, err := processGraphVersionQuery(r)
	if err != nil {
		WriteError(w, err)
		return
	}
	record, err := server.service.GetProcessGraph(r.Context(), processGraphID, version)
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := authorizeRecordDataScope(*principal, "process graph", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func (server *Server) simulationChecks(w http.ResponseWriter, r *http.Request) {
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
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	snapshot, status, err := server.service.CreateSimulationCheckForScope(withAuditPrincipal(r.Context(), *principal, r), bytes, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, status, snapshot)
}

func processGraphVersionQuery(r *http.Request) (int, error) {
	raw := r.URL.Query().Get("version")
	if strings.TrimSpace(raw) == "" {
		return 1, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return 0, ValidationError("version must be a positive integer")
	}
	return parsed, nil
}
