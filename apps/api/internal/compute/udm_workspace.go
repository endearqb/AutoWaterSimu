package compute

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
	"time"
)

type UDMWorkspaceService struct {
	models  UDMModelStore
	hybrids UDMHybridConfigStore
	now     func() time.Time
}

func NewUDMWorkspaceService(models UDMModelStore, hybrids UDMHybridConfigStore, now func() time.Time) *UDMWorkspaceService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &UDMWorkspaceService{models: models, hybrids: hybrids, now: now}
}

func (svc *UDMWorkspaceService) Templates(tags, excludeTags []string) []UDMSeedTemplateSummary {
	templates := udmSeedTemplates()
	result := make([]UDMSeedTemplateSummary, 0, len(templates))
	for _, template := range templates {
		templateTags := stringSet(template.Tags)
		if len(tags) > 0 && !containsAll(templateTags, tags) {
			continue
		}
		if len(excludeTags) > 0 && containsAny(templateTags, excludeTags) {
			continue
		}
		result = append(result, UDMSeedTemplateSummary{
			Key:             template.Key,
			Name:            template.Name,
			Description:     template.Description,
			Tags:            append([]string(nil), template.Tags...),
			ComponentsCount: len(template.Components),
			ProcessesCount:  len(template.Processes),
			ParametersCount: len(template.Parameters),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Key < result[j].Key })
	return result
}

func (svc *UDMWorkspaceService) ValidateDefinition(request UDMModelDefinitionDraft, validationMode string) UDMValidationResponse {
	return validateUDMDefinitionPayload(request.Components, request.Parameters, request.Processes, request.Meta, validationMode)
}

func (svc *UDMWorkspaceService) CreateModel(ctx context.Context, request UDMModelCreateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	if strings.TrimSpace(request.Name) == "" {
		return UDMModelDetailPublic{}, ValidationError("UDM model name is required")
	}
	validation := svc.ValidateDefinition(request.UDMModelDefinitionDraft, "teaching")
	if !validation.OK {
		return UDMModelDetailPublic{}, udmValidationFailed(validation)
	}
	now := svc.now()
	metadata := metadataWithScope(request.Metadata, filter)
	modelID := "udm_model_" + safeIDPart(defaultString(request.Name, fmt.Sprint(now.UnixNano()))) + "_" + fmt.Sprint(now.UnixNano())
	model := UDMModelRecord{
		ID:             modelID,
		Name:           request.Name,
		Description:    request.Description,
		Tags:           append([]string(nil), request.Tags...),
		CurrentVersion: 1,
		IsPublished:    false,
		OwnerID:        defaultString(requestedBy, "standalone:developer"),
		SourceSystem:   defaultString(request.SourceSystem, "autowatersimu-web"),
		RequestedBy:    defaultString(requestedBy, "standalone:developer"),
		TenantID:       stringValue(metadata, "tenant_id"),
		ProjectID:      stringValue(metadata, "project_id"),
		SiteID:         stringValue(metadata, "site_id"),
		Metadata:       mustJSON(metadata),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	version := svc.versionRecord(model, 1, request.Components, request.Parameters, request.Processes, request.Meta, validation, request.SeedSource, request.SourceSystem, requestedBy, metadata, now)
	if err := svc.models.InsertUDMModelWithVersion(ctx, model, version); err != nil {
		return UDMModelDetailPublic{}, err
	}
	return svc.modelDetail(ctx, model)
}

func (svc *UDMWorkspaceService) CreateModelFromTemplate(ctx context.Context, request UDMModelCreateFromTemplateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	template, ok := udmSeedTemplate(request.TemplateKey)
	if !ok {
		return UDMModelDetailPublic{}, NotFound(CodeUDMModelNotFound, "UDM template not found")
	}
	name := defaultString(request.Name, template.Name)
	description := defaultString(request.Description, template.Description)
	return svc.CreateModel(ctx, UDMModelCreateRequest{
		UDMModelDefinitionDraft: UDMModelDefinitionDraft{
			Name:        name,
			Description: description,
			Tags:        append([]string(nil), template.Tags...),
			Components:  cloneMapSlice(template.Components),
			Parameters:  cloneMapSlice(template.Parameters),
			Processes:   cloneMapSlice(template.Processes),
			Meta:        copyStringAnyMap(template.Meta),
		},
		SeedSource:   template.Key,
		SourceSystem: request.SourceSystem,
		Metadata:     request.Metadata,
	}, requestedBy, filter)
}

func (svc *UDMWorkspaceService) ListModels(ctx context.Context, filter UDMModelFilter) (ListUDMModelsResponse, error) {
	records, total, err := svc.models.ListUDMModels(ctx, filter)
	if err != nil {
		return ListUDMModelsResponse{}, err
	}
	data := make([]UDMModelPublic, 0, len(records))
	for _, record := range records {
		data = append(data, udmModelPublic(record))
	}
	return ListUDMModelsResponse{Data: data, Count: total}, nil
}

func (svc *UDMWorkspaceService) GetModel(ctx context.Context, modelID string, filter ListFilter) (UDMModelDetailPublic, error) {
	model, err := svc.models.FindUDMModel(ctx, required(modelID, "model_id"))
	if err != nil {
		return UDMModelDetailPublic{}, err
	}
	if err := authorizeListFilterDataScope(filter, "UDM model", model.TenantID, model.ProjectID, model.SiteID); err != nil {
		return UDMModelDetailPublic{}, err
	}
	return svc.modelDetail(ctx, *model)
}

func (svc *UDMWorkspaceService) UpdateModel(ctx context.Context, modelID string, request UDMModelUpdateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	model, err := svc.models.FindUDMModel(ctx, required(modelID, "model_id"))
	if err != nil {
		return UDMModelDetailPublic{}, err
	}
	if err := authorizeListFilterDataScope(filter, "UDM model", model.TenantID, model.ProjectID, model.SiteID); err != nil {
		return UDMModelDetailPublic{}, err
	}
	versions, err := svc.models.ListUDMModelVersions(ctx, model.ID)
	if err != nil {
		return UDMModelDetailPublic{}, err
	}
	if len(versions) == 0 {
		return UDMModelDetailPublic{}, NewAppError(500, CodeInternal, "UDM model has no version data", true, nil)
	}
	latest := versions[0]
	components := rawMapSlice(latest.Components)
	parameters := rawMapSlice(latest.Parameters)
	processes := rawMapSlice(latest.Processes)
	meta := rawMap(latest.Meta)
	now := svc.now()
	if request.Name != nil {
		model.Name = strings.TrimSpace(*request.Name)
	}
	if request.Description != nil {
		model.Description = *request.Description
	}
	if request.replaceTags {
		model.Tags = append([]string(nil), request.Tags...)
	}
	if request.IsPublished != nil {
		model.IsPublished = *request.IsPublished
	}
	definitionChanged := request.replaceDef
	if request.Components != nil {
		components = cloneMapSlice(request.Components)
	}
	if request.Parameters != nil {
		parameters = cloneMapSlice(request.Parameters)
	}
	if request.Processes != nil {
		processes = cloneMapSlice(request.Processes)
	}
	if request.replaceMeta {
		meta = copyStringAnyMap(request.Meta)
	}
	metadata := metadataWithScope(request.Metadata, filter)
	if definitionChanged {
		validation := validateUDMDefinitionPayload(components, parameters, processes, meta, "teaching")
		if !validation.OK {
			return UDMModelDetailPublic{}, udmValidationFailed(validation)
		}
		contentHash := udmDefinitionHash(components, parameters, processes, meta)
		if contentHash != latest.ContentHash {
			nextVersion := model.CurrentVersion + 1
			version := svc.versionRecord(*model, nextVersion, components, parameters, processes, meta, validation, latest.SeedSource, request.SourceSystem, requestedBy, metadata, now)
			if err := svc.models.InsertUDMModelVersion(ctx, version); err != nil {
				return UDMModelDetailPublic{}, err
			}
			model.CurrentVersion = nextVersion
		}
	}
	model.SourceSystem = defaultString(request.SourceSystem, model.SourceSystem)
	model.RequestedBy = defaultString(requestedBy, model.RequestedBy)
	model.UpdatedAt = now
	model.Metadata = mustJSON(metadata)
	if err := svc.models.UpdateUDMModel(ctx, *model); err != nil {
		return UDMModelDetailPublic{}, err
	}
	return svc.modelDetail(ctx, *model)
}

func (svc *UDMWorkspaceService) ArchiveModel(ctx context.Context, modelID string, filter ListFilter) error {
	model, err := svc.models.FindUDMModel(ctx, required(modelID, "model_id"))
	if err != nil {
		return err
	}
	if err := authorizeListFilterDataScope(filter, "UDM model", model.TenantID, model.ProjectID, model.SiteID); err != nil {
		return err
	}
	now := svc.now()
	model.ArchivedAt = &now
	model.UpdatedAt = now
	return svc.models.UpdateUDMModel(ctx, *model)
}

func (svc *UDMWorkspaceService) CreateHybridConfig(ctx context.Context, request UDMHybridConfigCreateRequest, requestedBy string, filter ListFilter) (UDMHybridConfigPublic, error) {
	if strings.TrimSpace(request.Name) == "" {
		return UDMHybridConfigPublic{}, ValidationError("UDM hybrid config name is required")
	}
	validation := validateUDMHybridConfig(map[string]any{"hybrid_config": request.HybridConfig}, true)
	if !validation.IsValid {
		return UDMHybridConfigPublic{}, NewAppError(422, CodeValidationFailed, "UDM hybrid config validation failed", false, map[string]any{"errors": validation.Errors})
	}
	now := svc.now()
	metadata := metadataWithScope(request.Metadata, filter)
	rawConfig := mustJSON(request.HybridConfig)
	record := UDMHybridConfigRecord{
		ID:            "udm_hybrid_" + safeIDPart(defaultString(request.Name, fmt.Sprint(now.UnixNano()))) + "_" + fmt.Sprint(now.UnixNano()),
		Name:          request.Name,
		Description:   request.Description,
		HybridConfig:  rawConfig,
		ParameterHash: validation.ParameterHash,
		Validation:    mustJSON(validation),
		OwnerID:       defaultString(requestedBy, "standalone:developer"),
		SourceSystem:  defaultString(request.SourceSystem, "autowatersimu-web"),
		RequestedBy:   defaultString(requestedBy, "standalone:developer"),
		TenantID:      stringValue(metadata, "tenant_id"),
		ProjectID:     stringValue(metadata, "project_id"),
		SiteID:        stringValue(metadata, "site_id"),
		Metadata:      mustJSON(metadata),
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := svc.hybrids.InsertUDMHybridConfig(ctx, record); err != nil {
		return UDMHybridConfigPublic{}, err
	}
	return udmHybridConfigPublic(record), nil
}

func (svc *UDMWorkspaceService) ListHybridConfigs(ctx context.Context, filter UDMHybridConfigFilter) (ListUDMHybridConfigsResponse, error) {
	records, total, err := svc.hybrids.ListUDMHybridConfigs(ctx, filter)
	if err != nil {
		return ListUDMHybridConfigsResponse{}, err
	}
	data := make([]UDMHybridConfigPublic, 0, len(records))
	for _, record := range records {
		data = append(data, udmHybridConfigPublic(record))
	}
	return ListUDMHybridConfigsResponse{Data: data, Count: total}, nil
}

func (svc *UDMWorkspaceService) GetHybridConfig(ctx context.Context, configID string, filter ListFilter) (UDMHybridConfigPublic, error) {
	record, err := svc.hybrids.FindUDMHybridConfig(ctx, required(configID, "id"))
	if err != nil {
		return UDMHybridConfigPublic{}, err
	}
	if err := authorizeListFilterDataScope(filter, "UDM hybrid config", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return UDMHybridConfigPublic{}, err
	}
	return udmHybridConfigPublic(*record), nil
}

func (svc *UDMWorkspaceService) UpdateHybridConfig(ctx context.Context, configID string, request UDMHybridConfigUpdateRequest, requestedBy string, filter ListFilter) (UDMHybridConfigPublic, error) {
	record, err := svc.hybrids.FindUDMHybridConfig(ctx, required(configID, "id"))
	if err != nil {
		return UDMHybridConfigPublic{}, err
	}
	if err := authorizeListFilterDataScope(filter, "UDM hybrid config", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return UDMHybridConfigPublic{}, err
	}
	if request.Name != nil {
		record.Name = strings.TrimSpace(*request.Name)
	}
	if request.Description != nil {
		record.Description = *request.Description
	}
	if request.replaceConfig {
		validation := validateUDMHybridConfig(map[string]any{"hybrid_config": request.HybridConfig}, true)
		if !validation.IsValid {
			return UDMHybridConfigPublic{}, NewAppError(422, CodeValidationFailed, "UDM hybrid config validation failed", false, map[string]any{"errors": validation.Errors})
		}
		record.HybridConfig = mustJSON(request.HybridConfig)
		record.ParameterHash = validation.ParameterHash
		record.Validation = mustJSON(validation)
	}
	now := svc.now()
	metadata := metadataWithScope(request.Metadata, filter)
	record.SourceSystem = defaultString(request.SourceSystem, record.SourceSystem)
	record.RequestedBy = defaultString(requestedBy, record.RequestedBy)
	record.Metadata = mustJSON(metadata)
	record.UpdatedAt = now
	if err := svc.hybrids.UpdateUDMHybridConfig(ctx, *record); err != nil {
		return UDMHybridConfigPublic{}, err
	}
	return udmHybridConfigPublic(*record), nil
}

func (svc *UDMWorkspaceService) ArchiveHybridConfig(ctx context.Context, configID string, filter ListFilter) error {
	record, err := svc.hybrids.FindUDMHybridConfig(ctx, required(configID, "id"))
	if err != nil {
		return err
	}
	if err := authorizeListFilterDataScope(filter, "UDM hybrid config", record.TenantID, record.ProjectID, record.SiteID); err != nil {
		return err
	}
	now := svc.now()
	record.ArchivedAt = &now
	record.UpdatedAt = now
	return svc.hybrids.UpdateUDMHybridConfig(ctx, *record)
}

func (svc *UDMWorkspaceService) versionRecord(model UDMModelRecord, versionNo int, components, parameters, processes []map[string]any, meta map[string]any, validation UDMValidationResponse, seedSource, sourceSystem, requestedBy string, metadata map[string]any, now time.Time) UDMModelVersionRecord {
	contentHash := udmDefinitionHash(components, parameters, processes, meta)
	return UDMModelVersionRecord{
		ID:               model.ID + "_v" + fmt.Sprint(versionNo),
		ModelID:          model.ID,
		Version:          versionNo,
		ContentHash:      contentHash,
		ParameterHash:    contentHash,
		Components:       mustJSON(components),
		Parameters:       mustJSON(parameters),
		Processes:        mustJSON(processes),
		Meta:             mustJSON(meta),
		ValidationOK:     validation.OK,
		ValidationErrors: mustJSON(validation.Errors),
		SeedSource:       seedSource,
		SourceSystem:     defaultString(sourceSystem, "autowatersimu-web"),
		RequestedBy:      defaultString(requestedBy, "standalone:developer"),
		OwnerID:          model.OwnerID,
		TenantID:         stringValue(metadata, "tenant_id"),
		ProjectID:        stringValue(metadata, "project_id"),
		SiteID:           stringValue(metadata, "site_id"),
		Metadata:         mustJSON(metadata),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
}

func (svc *UDMWorkspaceService) modelDetail(ctx context.Context, model UDMModelRecord) (UDMModelDetailPublic, error) {
	versions, err := svc.models.ListUDMModelVersions(ctx, model.ID)
	if err != nil {
		return UDMModelDetailPublic{}, err
	}
	publicVersions := make([]UDMModelVersionPublic, 0, len(versions))
	for _, version := range versions {
		publicVersions = append(publicVersions, udmModelVersionPublic(version))
	}
	var latest *UDMModelVersionPublic
	if len(publicVersions) > 0 {
		latest = &publicVersions[0]
	}
	return UDMModelDetailPublic{
		UDMModelPublic: udmModelPublic(model),
		LatestVersion:  latest,
		Versions:       publicVersions,
	}, nil
}

func udmModelPublic(record UDMModelRecord) UDMModelPublic {
	return UDMModelPublic{
		ID:             record.ID,
		Name:           record.Name,
		Description:    record.Description,
		Tags:           append([]string(nil), record.Tags...),
		CurrentVersion: record.CurrentVersion,
		IsPublished:    record.IsPublished,
		OwnerID:        record.OwnerID,
		CreatedAt:      record.CreatedAt,
		UpdatedAt:      record.UpdatedAt,
	}
}

func udmModelVersionPublic(record UDMModelVersionRecord) UDMModelVersionPublic {
	return UDMModelVersionPublic{
		ID:               record.ID,
		ModelID:          record.ModelID,
		Version:          record.Version,
		ContentHash:      record.ContentHash,
		ParameterHash:    record.ParameterHash,
		Components:       rawMapSlice(record.Components),
		Parameters:       rawMapSlice(record.Parameters),
		Processes:        rawMapSlice(record.Processes),
		Meta:             rawMap(record.Meta),
		ValidationOK:     record.ValidationOK,
		ValidationErrors: rawMapSlice(record.ValidationErrors),
		SeedSource:       record.SeedSource,
		CreatedAt:        record.CreatedAt,
		UpdatedAt:        record.UpdatedAt,
	}
}

func udmHybridConfigPublic(record UDMHybridConfigRecord) UDMHybridConfigPublic {
	return UDMHybridConfigPublic{
		ID:            record.ID,
		OwnerID:       record.OwnerID,
		CreatedAt:     record.CreatedAt,
		UpdatedAt:     record.UpdatedAt,
		Name:          record.Name,
		Description:   record.Description,
		HybridConfig:  rawMap(record.HybridConfig),
		ParameterHash: record.ParameterHash,
	}
}

func udmValidationFailed(validation UDMValidationResponse) error {
	return NewAppError(400, CodeValidationFailed, "UDM model definition validation failed", false, map[string]any{
		"errors":   validation.Errors,
		"warnings": validation.Warnings,
	})
}

func udmDefinitionHash(components, parameters, processes []map[string]any, meta map[string]any) string {
	return "sha256:" + SHA256Hex(mustJSON(map[string]any{
		"components": components,
		"parameters": parameters,
		"processes":  processes,
		"meta":       meta,
	}))
}

var udmIdentifierRE = regexp.MustCompile(`[A-Za-z_][A-Za-z0-9_]*`)
var udmAllowedFunctions = map[string]bool{"exp": true, "log": true, "sqrt": true, "pow": true, "min": true, "max": true, "abs": true, "clip": true}
var udmReservedConstants = map[string]bool{"pi": true, "e": true}

func validateUDMDefinitionPayload(components, parameters, processes []map[string]any, meta map[string]any, validationMode string) UDMValidationResponse {
	componentNames := orderedNames(components)
	componentSet := stringSet(componentNames)
	parameterNames := orderedNames(parameters)
	parameterSet := stringSet(parameterNames)
	errors := []UDMValidationIssue{}
	warnings := []UDMValidationIssue{}
	extracted := map[string]bool{}
	if len(componentNames) == 0 {
		errors = append(errors, udmIssue("NO_COMPONENTS", "At least one component definition is required", "", &UDMValidationLocation{Section: "components"}))
	}
	if len(componentSet) != len(componentNames) {
		errors = append(errors, udmIssue("DUPLICATE_COMPONENT", "Component names must be unique", "", &UDMValidationLocation{Section: "components"}))
	}
	seenProcess := map[string]bool{}
	for index, process := range processes {
		processName := defaultString(stringValue(process, "name"), fmt.Sprintf("process_%d", index+1))
		if seenProcess[processName] {
			errors = append(errors, udmIssue("DUPLICATE_PROCESS", "Duplicate process name: "+processName, processName, &UDMValidationLocation{Section: "processes", ProcessName: processName}))
		}
		seenProcess[processName] = true
		rateExpr := defaultString(stringValue(process, "rate_expr"), stringValue(process, "rateExpr"))
		if strings.TrimSpace(rateExpr) == "" {
			errors = append(errors, udmIssue("EMPTY_RATE_EXPR", "Process rate expression must not be empty", processName, &UDMValidationLocation{Section: "rateExpr", ProcessName: processName, CellKey: processName + ":rateExpr"}))
		} else {
			validateUDMExpression(rateExpr, processName, "rateExpr", componentSet, parameterSet, extracted, &errors)
		}
		stoich := mapValue(process, "stoich_expr")
		if len(stoich) == 0 {
			stoich = mapValue(process, "stoichExpr")
		}
		if len(stoich) == 0 {
			stoich = mapValue(process, "stoich")
		}
		nonZero := 0
		for componentName, value := range stoich {
			if !componentSet[componentName] {
				errors = append(errors, udmIssue("UNKNOWN_COMPONENT", "Unknown component: "+componentName, processName, &UDMValidationLocation{Section: "stoich", ProcessName: processName, ComponentName: componentName, CellKey: processName + ":" + componentName}))
			}
			expr := strings.TrimSpace(fmt.Sprint(value))
			if expr == "" {
				expr = "0"
			}
			validateUDMExpression(expr, processName, "stoich", componentSet, parameterSet, extracted, &errors)
			if parsed, ok := floatFromString(expr); !ok || math.Abs(parsed) > 0 {
				nonZero++
			}
		}
		if nonZero == 0 {
			warnings = append(warnings, udmIssue("ZERO_STOICH", "All stoichiometric coefficients for this process are zero", processName, &UDMValidationLocation{Section: "stoich", ProcessName: processName}))
		}
	}
	continuity := continuityChecks(components, processes, meta)
	if validationMode == "strict" {
		for _, item := range continuity {
			if item.Status == "error" {
				errors = append(errors, udmIssue("CONTINUITY_IMBALANCE", fmt.Sprintf("%s continuity imbalance (Δ=%g)", item.Dimension, item.BalanceValue), item.ProcessName, &UDMValidationLocation{Section: "stoich", ProcessName: item.ProcessName}))
			}
		}
	}
	extractedList := make([]string, 0, len(extracted))
	for name := range extracted {
		extractedList = append(extractedList, name)
	}
	sort.Strings(extractedList)
	return UDMValidationResponse{
		OK:                  len(errors) == 0,
		Errors:              errors,
		Warnings:            warnings,
		ExtractedParameters: extractedList,
		ContinuityChecks:    continuity,
	}
}

func validateUDMExpression(expr, processName, section string, componentSet, parameterSet map[string]bool, extracted map[string]bool, errors *[]UDMValidationIssue) {
	if strings.ContainsAny(expr, "[]{};\"'") || strings.Contains(expr, ":=") {
		*errors = append(*errors, udmIssue("DISALLOWED_SYNTAX", "Expression contains unsupported syntax", processName, &UDMValidationLocation{Section: section, ProcessName: processName}))
		return
	}
	ids := udmIdentifierRE.FindAllString(expr, -1)
	for _, id := range ids {
		if componentSet[id] || udmAllowedFunctions[id] || udmReservedConstants[id] {
			continue
		}
		extracted[id] = true
		if len(parameterSet) > 0 && !parameterSet[id] {
			*errors = append(*errors, udmIssue("UNDEFINED_SYMBOL", "Undefined symbol: "+id, processName, &UDMValidationLocation{Section: section, ProcessName: processName, ParameterName: id}))
		}
	}
}

func continuityChecks(components, processes []map[string]any, meta map[string]any) []UDMContinuityCheckItem {
	learning := mapValue(meta, "learning")
	rawProfiles, _ := learning["continuityProfiles"].([]any)
	if len(rawProfiles) == 0 {
		return nil
	}
	componentFactors := map[string]map[string]float64{}
	for _, component := range components {
		name := stringValue(component, "name")
		factors := map[string]float64{}
		for dimension, value := range mapValue(component, "conversion_factors") {
			if f, ok := numberFromAnyOK(value); ok {
				factors[dimension] = f
			}
		}
		componentFactors[name] = factors
	}
	var checks []UDMContinuityCheckItem
	for _, process := range processes {
		processName := stringValue(process, "name")
		stoich := mapValue(process, "stoich")
		for _, rawProfile := range rawProfiles {
			dimension := strings.TrimSpace(fmt.Sprint(rawProfile))
			if dimension == "" {
				continue
			}
			balance := 0.0
			for componentName, value := range stoich {
				coeff, ok := numberFromAnyOK(value)
				if !ok {
					continue
				}
				balance += coeff * componentFactors[componentName][dimension]
			}
			status := "pass"
			if math.Abs(balance) > 1e-9 {
				status = "warn"
			}
			checks = append(checks, UDMContinuityCheckItem{
				ProcessName:  processName,
				Dimension:    dimension,
				BalanceValue: balance,
				Status:       status,
				Explanation:  fmt.Sprintf("%s balance for %s is %g", dimension, processName, balance),
			})
		}
	}
	return checks
}

func udmIssue(code, message, process string, location *UDMValidationLocation) UDMValidationIssue {
	return UDMValidationIssue{Code: code, Message: message, Process: process, Location: location}
}

func validateUDMHybridConfig(flowchartData map[string]any, strict bool) UDMHybridValidationResponse {
	hybridConfig := mapValue(flowchartData, "hybrid_config")
	if len(hybridConfig) == 0 {
		hybridConfig = mapValue(flowchartData, "hybridConfig")
	}
	mode := stringValue(hybridConfig, "mode")
	response := UDMHybridValidationResponse{IsValid: true, Errors: []string{}, Warnings: []string{}, Details: map[string]any{}}
	if len(hybridConfig) == 0 {
		response.Details["is_hybrid"] = false
		return response
	}
	if mode != "udm_only" {
		response.Errors = append(response.Errors, "Unsupported hybrid mode: "+mode)
		response.IsValid = false
		return response
	}
	selected := toMapSlice(hybridConfig["selected_models"])
	if len(selected) == 0 {
		selected = toMapSlice(hybridConfig["selectedModels"])
	}
	if len(selected) == 0 {
		response.Errors = append(response.Errors, "hybrid_config.selected_models cannot be empty")
	}
	models := map[string]map[string]any{}
	focal := map[string]map[string]bool{}
	for _, raw := range selected {
		modelID := defaultString(stringValue(raw, "model_id"), stringValue(raw, "modelId"))
		version := int(numberFromAny(firstUDMNonNil(raw["version"], raw["currentVersion"]), 0))
		if modelID == "" || version == 0 {
			response.Errors = append(response.Errors, "selected_models contains entry missing model_id/version")
			continue
		}
		key := fmt.Sprintf("%s@%d", modelID, version)
		models[key] = raw
		componentSet := stringSet(orderedNames(toMapSlice(raw["components"])))
		focal[key] = map[string]bool{}
		for _, process := range toMapSlice(raw["processes"]) {
			for _, id := range udmIdentifierRE.FindAllString(stringValue(process, "rate_expr"), -1) {
				if componentSet[id] && !udmAllowedFunctions[id] && !udmReservedConstants[id] {
					focal[key][id] = true
				}
			}
		}
	}
	mappings := mapValue(hybridConfig, "model_pair_mappings")
	if len(mappings) == 0 {
		mappings = mapValue(hybridConfig, "modelPairMappings")
	}
	normalizedMappings := map[string]any{}
	for rawKey, rawMappingAny := range mappings {
		rawMapping, ok := rawMappingAny.(map[string]any)
		if !ok {
			response.Errors = append(response.Errors, fmt.Sprintf("model_pair_mappings[%s] must be object", rawKey))
			continue
		}
		sourceID := defaultString(stringValue(rawMapping, "source_model_id"), stringValue(rawMapping, "sourceModelId"))
		sourceVersion := int(numberFromAny(firstUDMNonNil(rawMapping["source_version"], rawMapping["sourceVersion"]), 0))
		targetID := defaultString(stringValue(rawMapping, "target_model_id"), stringValue(rawMapping, "targetModelId"))
		targetVersion := int(numberFromAny(firstUDMNonNil(rawMapping["target_version"], rawMapping["targetVersion"]), 0))
		pairKey := rawKey
		if sourceID != "" && sourceVersion > 0 && targetID != "" && targetVersion > 0 {
			pairKey = fmt.Sprintf("%s@%d->%s@%d", sourceID, sourceVersion, targetID, targetVersion)
		}
		sourceKey := fmt.Sprintf("%s@%d", sourceID, sourceVersion)
		targetKey := fmt.Sprintf("%s@%d", targetID, targetVersion)
		if _, ok := models[sourceKey]; !ok {
			response.Errors = append(response.Errors, pairKey+": source model "+sourceKey+" not found in selected_models")
		}
		if _, ok := models[targetKey]; !ok {
			response.Errors = append(response.Errors, pairKey+": target model "+targetKey+" not found in selected_models")
		}
		covered := map[string]bool{}
		for _, item := range toMapSlice(firstUDMNonNil(rawMapping["variable_map"], rawMapping["variableMap"])) {
			if !boolFromAny(firstUDMNonNil(item["enabled"], true), true) {
				continue
			}
			targetVar := defaultString(stringValue(item, "target_var"), stringValue(item, "targetVar"))
			sourceVar := defaultString(stringValue(item, "source_var"), stringValue(item, "sourceVar"))
			localExempt := boolFromAny(firstUDMNonNil(item["local_exempt"], item["localExempt"]), false)
			if targetVar == "" {
				response.Errors = append(response.Errors, pairKey+": variable_map contains empty target_var")
				continue
			}
			covered[targetVar] = true
			if !localExempt && sourceVar == "" {
				response.Errors = append(response.Errors, pairKey+": target_var "+targetVar+" requires source_var or local_exempt=true")
			}
		}
		for targetVar := range focal[targetKey] {
			if !covered[targetVar] {
				response.Errors = append(response.Errors, pairKey+": focal variable "+targetVar+" is not mapped and not exempted")
			}
		}
		normalizedMappings[pairKey] = rawMapping
	}
	response.IsValid = len(response.Errors) == 0
	response.Details = map[string]any{
		"is_hybrid":                 true,
		"selected_model_count":      len(models),
		"model_pair_mapping_count":  len(mappings),
		"canonical_component_count": len(models),
	}
	response.NormalizedHybridConfig = map[string]any{
		"mode":                "udm_only",
		"selected_models":     selected,
		"model_pair_mappings": normalizedMappings,
	}
	response.ParameterHash = "sha256:" + SHA256Hex(mustJSON(response.NormalizedHybridConfig))
	if strict && !response.IsValid {
		return response
	}
	return response
}

type udmTemplate struct {
	Key         string
	Name        string
	Description string
	Tags        []string
	Components  []map[string]any
	Parameters  []map[string]any
	Processes   []map[string]any
	Meta        map[string]any
}

func udmSeedTemplate(key string) (udmTemplate, bool) {
	for _, template := range udmSeedTemplates() {
		if template.Key == key {
			return template, true
		}
	}
	return udmTemplate{}, false
}

func udmSeedTemplates() []udmTemplate {
	base := []udmTemplate{
		simpleUDMTemplate("asm1", "ASM1 (UDM Seed)", []string{"asm1", "petersen", "seed"}, []string{"S_S", "S_O", "X_BH"}, "u_H*S_S*X_BH"),
		simpleUDMTemplate("asm1slim", "ASM1Slim (UDM Seed)", []string{"asm1slim", "petersen", "seed"}, []string{"S_S", "S_O", "X_BH"}, "mu*S_S*X_BH"),
		simpleUDMTemplate("asm3", "ASM3 (UDM Seed)", []string{"asm3", "petersen", "seed"}, []string{"S_S", "S_O", "X_H"}, "mu_H*S_S*X_H"),
	}
	tutorialKeys := []string{"petersen-chapter-1", "petersen-chapter-2", "petersen-chapter-3", "petersen-chapter-7"}
	for _, key := range tutorialKeys {
		t := simpleUDMTemplate(key, strings.Title(strings.ReplaceAll(key, "-", " ")), []string{"tutorial", "petersen-tutorial", "seed"}, []string{"S_S", "S_O", "X_BH"}, "mu*S_S*X_BH")
		t.Meta = map[string]any{"learning": map[string]any{"continuityProfiles": []any{"COD", "N"}}}
		base = append(base, t)
	}
	return base
}

func simpleUDMTemplate(key, name string, tags []string, components []string, rateExpr string) udmTemplate {
	componentDefs := make([]map[string]any, 0, len(components))
	for _, component := range components {
		componentDefs = append(componentDefs, map[string]any{"name": component, "label": component, "unit": "mg/L", "default_value": 0, "conversion_factors": map[string]any{"COD": 1}})
	}
	return udmTemplate{
		Key:         key,
		Name:        name,
		Description: "Standalone UDM seed template",
		Tags:        tags,
		Components:  componentDefs,
		Parameters:  []map[string]any{{"name": "mu", "default_value": 1, "scale": "lin"}},
		Processes: []map[string]any{{
			"name":      "growth",
			"rate_expr": rateExpr,
			"stoich":    map[string]any{components[0]: -1, components[len(components)-1]: 1},
		}},
		Meta: map[string]any{},
	}
}

func orderedNames(items []map[string]any) []string {
	names := make([]string, 0, len(items))
	for _, item := range items {
		name := strings.TrimSpace(stringValue(item, "name"))
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}

func stringSet(values []string) map[string]bool {
	result := map[string]bool{}
	for _, value := range values {
		result[value] = true
	}
	return result
}

func containsAll(set map[string]bool, values []string) bool {
	for _, value := range values {
		if !set[strings.TrimSpace(value)] {
			return false
		}
	}
	return true
}

func containsAny(set map[string]bool, values []string) bool {
	for _, value := range values {
		if set[strings.TrimSpace(value)] {
			return true
		}
	}
	return false
}

func rawMapSlice(raw json.RawMessage) []map[string]any {
	var result []map[string]any
	_ = json.Unmarshal(raw, &result)
	if result == nil {
		return []map[string]any{}
	}
	return result
}

func rawMap(raw json.RawMessage) map[string]any {
	var result map[string]any
	_ = json.Unmarshal(raw, &result)
	if result == nil {
		return map[string]any{}
	}
	return result
}

func toMapSlice(value any) []map[string]any {
	items, ok := value.([]any)
	if !ok {
		if typed, ok := value.([]map[string]any); ok {
			return cloneMapSlice(typed)
		}
		return nil
	}
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		if typed, ok := item.(map[string]any); ok {
			result = append(result, typed)
		}
	}
	return result
}

func cloneMapSlice(items []map[string]any) []map[string]any {
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, copyStringAnyMap(item))
	}
	return result
}

func firstUDMNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func boolFromAny(value any, fallback bool) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "true", "1", "yes", "on":
			return true
		case "false", "0", "no", "off":
			return false
		}
	case int:
		return typed != 0
	case float64:
		return typed != 0
	}
	return fallback
}

func floatFromString(value string) (float64, bool) {
	var parsed float64
	_, err := fmt.Sscanf(value, "%f", &parsed)
	return parsed, err == nil
}

func numberFromAnyOK(value any) (float64, bool) {
	switch typed := value.(type) {
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case json.Number:
		parsed, err := typed.Float64()
		return parsed, err == nil
	default:
		return floatFromString(strings.TrimSpace(fmt.Sprint(value)))
	}
}
