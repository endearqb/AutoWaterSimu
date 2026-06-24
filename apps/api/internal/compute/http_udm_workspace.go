package compute

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
)

func (server *Server) udmModelTemplates(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet) {
		return
	}
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, server.service.UDMTemplates(splitQueryValues(r, "tags", "tag"), splitQueryValues(r, "exclude_tags", "exclude_tag")))
}

func (server *Server) udmModelValidate(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodPost) {
		return
	}
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	request, validationMode, err := decodeUDMValidationRequest(r.Body)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, server.service.ValidateUDMDefinition(request, validationMode))
}

func (server *Server) udmModels(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request UDMModelCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("UDM model JSON is invalid"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.CreateUDMModel(r.Context(), request, principal.Name, filter)
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
		filter, err := udmModelFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter.TenantID = principal.TenantID
		filter.ProjectID = principal.ProjectID
		filter.SiteID = principal.SiteID
		response, err := server.service.ListUDMModels(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) udmModelByID(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/api/v1/udm-models/")
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		WriteError(w, ValidationError("model_id is required"))
		return
	}
	if parts[0] == "from-template" {
		server.udmModelFromTemplate(w, r, parts)
		return
	}
	if len(parts) != 1 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet, http.MethodPatch, http.MethodDelete) {
		return
	}
	modelID := parts[0]
	switch r.Method {
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.GetUDMModel(r.Context(), modelID, filter)
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
		request, err := decodeUDMModelUpdateRequest(r.Body)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.UpdateUDMModel(r.Context(), modelID, request, principal.Name, filter)
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
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		if err := server.service.ArchiveUDMModel(r.Context(), modelID, filter); err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{"id": modelID, "status": "archived"})
	}
}

func (server *Server) udmModelFromTemplate(w http.ResponseWriter, r *http.Request, parts []string) {
	if len(parts) != 1 {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodPost) {
		return
	}
	principal, err := server.auth.Principal(r, "job:create")
	if err != nil {
		WriteError(w, err)
		return
	}
	var request UDMModelCreateFromTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		WriteError(w, ValidationError("UDM template model JSON is invalid"))
		return
	}
	filter := filterForPrincipalDataScope(ListFilter{}, *principal)
	record, err := server.service.CreateUDMModelFromTemplate(r.Context(), request, principal.Name, filter)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, record)
}

func (server *Server) udmHybridConfigs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		principal, err := server.auth.Principal(r, "job:create")
		if err != nil {
			WriteError(w, err)
			return
		}
		var request UDMHybridConfigCreateRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, ValidationError("UDM hybrid config JSON is invalid"))
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.CreateUDMHybridConfig(r.Context(), request, principal.Name, filter)
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
		filter, err := udmHybridConfigFilter(r)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter.TenantID = principal.TenantID
		filter.ProjectID = principal.ProjectID
		filter.SiteID = principal.SiteID
		response, err := server.service.ListUDMHybridConfigs(r.Context(), filter)
		if err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, response)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) udmHybridConfigValidate(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodPost) {
		return
	}
	if _, err := server.auth.Principal(r, "job:read"); err != nil {
		WriteError(w, err)
		return
	}
	var request map[string]any
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		WriteError(w, ValidationError("UDM hybrid validation JSON is invalid"))
		return
	}
	WriteJSON(w, http.StatusOK, validateUDMHybridConfig(request, true))
}

func (server *Server) udmHybridConfigByID(w http.ResponseWriter, r *http.Request) {
	if rejectUndeclaredHTTPMethod(w, r.Method, http.MethodGet, http.MethodPatch, http.MethodDelete) {
		return
	}
	configID := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/udm-hybrid-configs/"), "/")
	if strings.TrimSpace(configID) == "" || strings.Contains(configID, "/") {
		WriteError(w, ValidationError("id is required"))
		return
	}
	switch r.Method {
	case http.MethodGet:
		principal, err := server.auth.Principal(r, "job:read")
		if err != nil {
			WriteError(w, err)
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.GetUDMHybridConfig(r.Context(), configID, filter)
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
		request, err := decodeUDMHybridConfigUpdateRequest(r.Body)
		if err != nil {
			WriteError(w, err)
			return
		}
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		record, err := server.service.UpdateUDMHybridConfig(r.Context(), configID, request, principal.Name, filter)
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
		filter := filterForPrincipalDataScope(ListFilter{}, *principal)
		if err := server.service.ArchiveUDMHybridConfig(r.Context(), configID, filter); err != nil {
			WriteError(w, err)
			return
		}
		WriteJSON(w, http.StatusOK, map[string]any{"id": configID, "status": "archived"})
	}
}

func decodeUDMValidationRequest(body io.Reader) (UDMModelDefinitionDraft, string, error) {
	bytes, err := io.ReadAll(body)
	if err != nil {
		return UDMModelDefinitionDraft{}, "", ValidationError("read UDM validation request failed")
	}
	var request UDMModelDefinitionDraft
	if err := json.Unmarshal(bytes, &request); err != nil {
		return UDMModelDefinitionDraft{}, "", ValidationError("UDM validation JSON is invalid")
	}
	mode := "teaching"
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(bytes, &raw); err == nil {
		_ = json.Unmarshal(raw["validation_mode"], &mode)
		_ = json.Unmarshal(raw["validationMode"], &mode)
	}
	if strings.TrimSpace(mode) == "" {
		mode = "teaching"
	}
	return request, mode, nil
}

func decodeUDMModelUpdateRequest(body io.Reader) (UDMModelUpdateRequest, error) {
	bytes, err := io.ReadAll(body)
	if err != nil {
		return UDMModelUpdateRequest{}, ValidationError("read UDM model update failed")
	}
	var request UDMModelUpdateRequest
	if err := json.Unmarshal(bytes, &request); err != nil {
		return UDMModelUpdateRequest{}, ValidationError("UDM model update JSON is invalid")
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(bytes, &raw); err != nil {
		return UDMModelUpdateRequest{}, ValidationError("UDM model update JSON is invalid")
	}
	_, hasTags := raw["tags"]
	_, hasComponents := raw["components"]
	_, hasParameters := raw["parameters"]
	_, hasProcesses := raw["processes"]
	_, hasMeta := raw["meta"]
	request.replaceTags = hasTags
	request.replaceMeta = hasMeta
	request.replaceDef = hasComponents || hasParameters || hasProcesses || hasMeta
	return request, nil
}

func decodeUDMHybridConfigUpdateRequest(body io.Reader) (UDMHybridConfigUpdateRequest, error) {
	bytes, err := io.ReadAll(body)
	if err != nil {
		return UDMHybridConfigUpdateRequest{}, ValidationError("read UDM hybrid config update failed")
	}
	var request UDMHybridConfigUpdateRequest
	if err := json.Unmarshal(bytes, &request); err != nil {
		return UDMHybridConfigUpdateRequest{}, ValidationError("UDM hybrid config update JSON is invalid")
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(bytes, &raw); err != nil {
		return UDMHybridConfigUpdateRequest{}, ValidationError("UDM hybrid config update JSON is invalid")
	}
	_, request.replaceConfig = raw["hybrid_config"]
	return request, nil
}

func udmModelFilter(r *http.Request) (UDMModelFilter, error) {
	limit, err := intQueryDefault(r, "limit", 100)
	if err != nil {
		return UDMModelFilter{}, err
	}
	skip, err := intQueryDefault(r, "skip", 0)
	if err != nil {
		return UDMModelFilter{}, err
	}
	return UDMModelFilter{Skip: skip, Limit: limit, Query: r.URL.Query().Get("q")}, nil
}

func udmHybridConfigFilter(r *http.Request) (UDMHybridConfigFilter, error) {
	limit, err := intQueryDefault(r, "limit", 100)
	if err != nil {
		return UDMHybridConfigFilter{}, err
	}
	skip, err := intQueryDefault(r, "skip", 0)
	if err != nil {
		return UDMHybridConfigFilter{}, err
	}
	return UDMHybridConfigFilter{Skip: skip, Limit: limit}, nil
}

func intQueryDefault(r *http.Request, name string, fallback int) (int, error) {
	raw := strings.TrimSpace(r.URL.Query().Get(name))
	if raw == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 0 {
		return 0, ValidationError(name + " must be a non-negative integer")
	}
	return parsed, nil
}

func splitQueryValues(r *http.Request, keys ...string) []string {
	result := []string{}
	for _, key := range keys {
		for _, raw := range r.URL.Query()[key] {
			for _, item := range strings.Split(raw, ",") {
				if trimmed := strings.TrimSpace(item); trimmed != "" {
					result = append(result, trimmed)
				}
			}
		}
	}
	return result
}
