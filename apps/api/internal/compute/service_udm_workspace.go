package compute

import "context"

func (svc *Service) UDMTemplates(tags, excludeTags []string) []UDMSeedTemplateSummary {
	return svc.udm.Templates(tags, excludeTags)
}

func (svc *Service) ValidateUDMDefinition(request UDMModelDefinitionDraft, validationMode string) UDMValidationResponse {
	return svc.udm.ValidateDefinition(request, validationMode)
}

func (svc *Service) CreateUDMModel(ctx context.Context, request UDMModelCreateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	return svc.udm.CreateModel(ctx, request, requestedBy, filter)
}

func (svc *Service) CreateUDMModelFromTemplate(ctx context.Context, request UDMModelCreateFromTemplateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	return svc.udm.CreateModelFromTemplate(ctx, request, requestedBy, filter)
}

func (svc *Service) ListUDMModels(ctx context.Context, filter UDMModelFilter) (ListUDMModelsResponse, error) {
	return svc.udm.ListModels(ctx, filter)
}

func (svc *Service) GetUDMModel(ctx context.Context, modelID string, filter ListFilter) (UDMModelDetailPublic, error) {
	return svc.udm.GetModel(ctx, modelID, filter)
}

func (svc *Service) UpdateUDMModel(ctx context.Context, modelID string, request UDMModelUpdateRequest, requestedBy string, filter ListFilter) (UDMModelDetailPublic, error) {
	return svc.udm.UpdateModel(ctx, modelID, request, requestedBy, filter)
}

func (svc *Service) ArchiveUDMModel(ctx context.Context, modelID string, filter ListFilter) error {
	return svc.udm.ArchiveModel(ctx, modelID, filter)
}

func (svc *Service) CreateUDMHybridConfig(ctx context.Context, request UDMHybridConfigCreateRequest, requestedBy string, filter ListFilter) (UDMHybridConfigPublic, error) {
	return svc.udm.CreateHybridConfig(ctx, request, requestedBy, filter)
}

func (svc *Service) ListUDMHybridConfigs(ctx context.Context, filter UDMHybridConfigFilter) (ListUDMHybridConfigsResponse, error) {
	return svc.udm.ListHybridConfigs(ctx, filter)
}

func (svc *Service) GetUDMHybridConfig(ctx context.Context, configID string, filter ListFilter) (UDMHybridConfigPublic, error) {
	return svc.udm.GetHybridConfig(ctx, configID, filter)
}

func (svc *Service) UpdateUDMHybridConfig(ctx context.Context, configID string, request UDMHybridConfigUpdateRequest, requestedBy string, filter ListFilter) (UDMHybridConfigPublic, error) {
	return svc.udm.UpdateHybridConfig(ctx, configID, request, requestedBy, filter)
}

func (svc *Service) ArchiveUDMHybridConfig(ctx context.Context, configID string, filter ListFilter) error {
	return svc.udm.ArchiveHybridConfig(ctx, configID, filter)
}
