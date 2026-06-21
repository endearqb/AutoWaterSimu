package compute

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func (server *Server) scenarios(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request ScenarioUpsertRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("scenario JSON is invalid"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.CreateScenario(r.Context(), request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusCreated, record)
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter, err := scenarioFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter.TenantID = principal.TenantID
		filter.ProjectID = principal.ProjectID
		filter.SiteID = principal.SiteID
		response, err := server.service.ListScenarios(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) scenarioByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/scenarios/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		WriteError(w, ValidationError("scenario_id is required"))
		return
	}
	scenarioID := parts[0]
	if rejectScenarioRouteMethod(w, r.Method, parts) {
		return
	}
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			record, err := server.service.GetScenario(r.Context(), scenarioID, filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, record)
		case http.MethodPatch:
			principal, err := server.auth.Principal(r, "job:create")
			if err != nil {
				WriteError(w, err)
				return
			}
			filter = filterForPrincipalDataScope(ListFilter{}, *principal)
			var request ScenarioUpsertRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				WriteError(w, ValidationError("scenario JSON is invalid"))
				return
			}
			record, err := server.service.UpdateScenario(r.Context(), scenarioID, request, filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, record)
		case http.MethodDelete:
			principal, err := server.auth.Principal(r, "job:create")
			if err != nil {
				WriteError(w, err)
				return
			}
			filter = filterForPrincipalDataScope(ListFilter{}, *principal)
			record, err := server.service.ArchiveScenario(r.Context(), scenarioID, filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, record)
		}
		return
	}
	if len(parts) != 2 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	switch parts[1] {
	case "clone":
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter = filterForPrincipalDataScope(ListFilter{}, *principal)
		var request ScenarioCloneRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&request)
		}
		record, err := server.service.CloneScenario(r.Context(), scenarioID, request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusCreated, record)
	case "archive":
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter = filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.ArchiveScenario(r.Context(), scenarioID, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, record)
	case "simulation-checks":
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter = filterForPrincipalDataScope(ListFilter{}, *principal)
		var request ScenarioRunRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&request)
		}
		snapshot, status, err := server.service.RunScenario(r.Context(), scenarioID, request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, status, snapshot)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (server *Server) canvasGraphs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request CanvasGraphSaveRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("canvas graph JSON is invalid"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.SaveCanvasGraph(r.Context(), request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusCreated, record)
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter, err := canvasGraphFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter.TenantID = principal.TenantID
		filter.ProjectID = principal.ProjectID
		filter.SiteID = principal.SiteID
		response, err := server.service.ListCanvasGraphs(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) canvasGraphByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/canvas-graphs/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		WriteError(w, ValidationError("graph_id is required"))
		return
	}
	graphID := parts[0]
	if rejectCanvasGraphRouteMethod(w, r.Method, parts) {
		return
	}
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			version, err := positiveIntQuery(r, "version")
			if err != nil {
				WriteError(w, err)
				return
			}
			record, err := server.service.GetCanvasGraph(r.Context(), graphID, version, filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, record)
		case http.MethodPatch:
			principal, err := server.auth.Principal(r, "job:create")
			if err != nil {
				WriteError(w, err)
				return
			}
			filter = filterForPrincipalDataScope(ListFilter{}, *principal)
			var request CanvasGraphSaveRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				WriteError(w, ValidationError("canvas graph JSON is invalid"))
				return
			}
			request.GraphID = graphID
			record, err := server.service.SaveCanvasGraph(r.Context(), request, principal.Name, filter)
			if err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusCreated, record)
		case http.MethodDelete:
			principal, err := server.auth.Principal(r, "job:create")
			if err != nil {
				WriteError(w, err)
				return
			}
			filter = filterForPrincipalDataScope(ListFilter{}, *principal)
			if err := server.service.ArchiveCanvasGraph(r.Context(), graphID, filter); err != nil {
				WriteError(w, err)
				return
			}
			WriteJSON(w, http.StatusOK, map[string]any{"graph_id": graphID, "status": "archived"})
		}
		return
	}
	if len(parts) == 2 && parts[1] == "publish" {
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter = filterForPrincipalDataScope(ListFilter{}, *principal)
		version, err := positiveIntQuery(r, "version")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request CanvasGraphPublishRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&request)
		}
		response, err := server.service.PublishCanvasGraph(r.Context(), graphID, version, request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusCreated, response)
		return
	}
	w.WriteHeader(http.StatusNotFound)
}

func (server *Server) contextSnapshots(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request ContextSnapshotCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("context snapshot JSON is invalid"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.CreateContextSnapshot(r.Context(), request, principal.Name, filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusCreated, record)
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter, err := contextSnapshotFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter.TenantID = principal.TenantID
		filter.ProjectID = principal.ProjectID
		filter.SiteID = principal.SiteID
		response, err := server.service.ListContextSnapshots(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) contextSnapshotByID(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet) {
		return
	}
	principal, err := server.auth.Principal(r, "job:read")
	if err != nil {
		WriteError(w, err)
		return
	}
	snapshotID := strings.TrimPrefix(r.URL.Path, "/api/v1/context-snapshots/")
	if strings.TrimSpace(snapshotID) == "" {
		WriteError(w, ValidationError("context_snapshot_id is required"))
		return
	}
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	record, err := server.service.GetContextSnapshot(r.Context(), snapshotID, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, record)
}

func rejectScenarioRouteMethod(w http.ResponseWriter, method string, parts []string) bool {
	expected := ""
	switch {
	case len(parts) == 1:
		if method == http.MethodGet || method == http.MethodPatch || method == http.MethodDelete {
			return false
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return true
	case len(parts) == 2 && (parts[1] == "clone" || parts[1] == "archive" || parts[1] == "simulation-checks"):
		expected = http.MethodPost
	}
	if expected == "" || method == expected {
		return false
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
	return true
}

func rejectCanvasGraphRouteMethod(w http.ResponseWriter, method string, parts []string) bool {
	expected := ""
	switch {
	case len(parts) == 1:
		if method == http.MethodGet || method == http.MethodPatch || method == http.MethodDelete {
			return false
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
		return true
	case len(parts) == 2 && parts[1] == "publish":
		expected = http.MethodPost
	}
	if expected == "" || method == expected {
		return false
	}
	w.WriteHeader(http.StatusMethodNotAllowed)
	return true
}

func scenarioFilter(r *http.Request) (ScenarioFilter, error) {
	limit, err := limitQuery(r)
	if err != nil {
		return ScenarioFilter{}, err
	}
	return ScenarioFilter{Limit: limit, Cursor: r.URL.Query().Get("cursor"), Status: r.URL.Query().Get("status")}, nil
}

func canvasGraphFilter(r *http.Request) (CanvasGraphFilter, error) {
	limit, err := limitQuery(r)
	if err != nil {
		return CanvasGraphFilter{}, err
	}
	return CanvasGraphFilter{Limit: limit, Cursor: r.URL.Query().Get("cursor"), ScenarioID: r.URL.Query().Get("scenario_id")}, nil
}

func contextSnapshotFilter(r *http.Request) (ContextSnapshotFilter, error) {
	limit, err := limitQuery(r)
	if err != nil {
		return ContextSnapshotFilter{}, err
	}
	return ContextSnapshotFilter{Limit: limit, Cursor: r.URL.Query().Get("cursor"), ScenarioID: r.URL.Query().Get("scenario_id")}, nil
}

func limitQuery(r *http.Request) (int, error) {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return 50, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return 0, ValidationError("limit must be an integer")
	}
	return parsed, nil
}

func positiveIntQuery(r *http.Request, name string) (int, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return 0, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return 0, ValidationError(name + " must be a positive integer")
	}
	return parsed, nil
}
