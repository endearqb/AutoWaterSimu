package models

import "strings"

const (
	ParameterSetTransitionErrorModelVersionNotFound        = "model_version_not_found"
	ParameterSetTransitionErrorDefaultParameterSetNotFound = "default_parameter_set_not_found"
	ParameterSetTransitionErrorParameterSetIDMismatch      = "parameter_set_id_mismatch"
	ParameterSetTransitionErrorFromStatusMismatch          = "from_status_mismatch"
	ParameterSetTransitionErrorStatusTransitionNotAllowed  = "status_transition_not_allowed"
	ParameterSetTransitionErrorCatalogShapeInvalid         = "catalog_shape_invalid"
	ParameterSetTransitionMetadataLastStatusTransition     = "last_status_transition"
	ParameterSetTransitionMetadataLastCatalogTransition    = "last_parameter_set_transition"
)

type DefaultParameterSetStatusTransitionInput struct {
	Catalog                    map[string]any
	ModelKey                   string
	ModelVersion               string
	ParameterSetID             string
	FromStatus                 string
	ToStatus                   string
	Reason                     string
	Metadata                   map[string]any
	ChangedBy                  string
	ParameterSetChangedAt      string
	CatalogGeneratedAt         string
	CatalogTransitionChangedAt string
}

type DefaultParameterSetStatusTransition struct {
	Catalog        map[string]any
	ParameterSetID string
	FromStatus     string
	ToStatus       string
}

type ParameterSetTransitionError struct {
	Reason string
}

func (err ParameterSetTransitionError) Error() string {
	return err.Reason
}

func ApplyDefaultParameterSetStatusTransition(input DefaultParameterSetStatusTransitionInput) (DefaultParameterSetStatusTransition, error) {
	modelKey := strings.TrimSpace(input.ModelKey)
	modelVersion := strings.TrimSpace(input.ModelVersion)
	toStatus := strings.TrimSpace(input.ToStatus)
	requestedParameterSetID := strings.TrimSpace(input.ParameterSetID)
	requestedFromStatus := strings.TrimSpace(input.FromStatus)

	models, ok := input.Catalog["models"].([]any)
	if !ok {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorCatalogShapeInvalid)
	}
	modelIndex, versionIndex, version, foundModel := findCatalogVersionDocument(models, modelKey, modelVersion)
	if !foundModel || versionIndex < 0 {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorModelVersionNotFound)
	}
	parameterSet, ok := version["default_parameter_set"].(map[string]any)
	if !ok {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorDefaultParameterSetNotFound)
	}
	parameterSetID := stringValue(parameterSet, "parameter_set_id")
	if requestedParameterSetID != "" && requestedParameterSetID != parameterSetID {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorParameterSetIDMismatch)
	}
	fromStatus := stringValue(parameterSet, "status")
	if requestedFromStatus != "" && requestedFromStatus != fromStatus {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorFromStatusMismatch)
	}
	if !CanTransitionParameterSetStatus(fromStatus, toStatus) {
		return DefaultParameterSetStatusTransition{}, transitionError(ParameterSetTransitionErrorStatusTransitionNotAllowed)
	}

	catalog := copyStringAnyMap(input.Catalog)
	copiedModels := append([]any(nil), models...)
	catalog["models"] = copiedModels
	model := copyStringAnyMap(copiedModels[modelIndex].(map[string]any))
	copiedModels[modelIndex] = model
	versions := append([]any(nil), model["versions"].([]any)...)
	model["versions"] = versions
	version = copyStringAnyMap(versions[versionIndex].(map[string]any))
	versions[versionIndex] = version

	parameterSet = copyStringAnyMap(parameterSet)
	parameterSet["status"] = toStatus
	parameterSetMetadata := copyStringAnyMap(mapValue(parameterSet, "metadata"))
	parameterSetMetadata[ParameterSetTransitionMetadataLastStatusTransition] = transitionMetadata(fromStatus, toStatus, input.Reason, input.Metadata, input.ChangedBy, input.ParameterSetChangedAt)
	parameterSet["metadata"] = parameterSetMetadata
	version["default_parameter_set"] = parameterSet

	catalog["generated_at"] = strings.TrimSpace(input.CatalogGeneratedAt)
	catalogMetadata := copyStringAnyMap(mapValue(catalog, "metadata"))
	catalogMetadata[ParameterSetTransitionMetadataLastCatalogTransition] = map[string]any{
		"model_key":        modelKey,
		"model_version":    modelVersion,
		"parameter_set_id": parameterSetID,
		"from_status":      fromStatus,
		"to_status":        toStatus,
		"reason":           strings.TrimSpace(input.Reason),
		"metadata":         input.Metadata,
		"changed_by":       defaultString(input.ChangedBy, "compute-api"),
		"changed_at":       strings.TrimSpace(input.CatalogTransitionChangedAt),
	}
	catalog["metadata"] = catalogMetadata

	return DefaultParameterSetStatusTransition{
		Catalog:        catalog,
		ParameterSetID: parameterSetID,
		FromStatus:     fromStatus,
		ToStatus:       toStatus,
	}, nil
}

func findCatalogVersionDocument(models []any, modelKey, modelVersion string) (int, int, map[string]any, bool) {
	for modelIndex, item := range models {
		model, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if stringValue(model, "model_key") != modelKey {
			continue
		}
		versions, ok := model["versions"].([]any)
		if !ok {
			return modelIndex, -1, nil, true
		}
		for versionIndex, versionItem := range versions {
			version, ok := versionItem.(map[string]any)
			if ok && stringValue(version, "model_version") == modelVersion {
				return modelIndex, versionIndex, version, true
			}
		}
		return modelIndex, -1, nil, true
	}
	return -1, -1, nil, false
}

func transitionMetadata(fromStatus, toStatus, reason string, metadata map[string]any, changedBy, changedAt string) map[string]any {
	return map[string]any{
		"from_status": fromStatus,
		"to_status":   toStatus,
		"reason":      strings.TrimSpace(reason),
		"metadata":    metadata,
		"changed_by":  defaultString(changedBy, "compute-api"),
		"changed_at":  strings.TrimSpace(changedAt),
	}
}

func transitionError(reason string) ParameterSetTransitionError {
	return ParameterSetTransitionError{Reason: reason}
}
