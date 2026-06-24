import { DefaultService } from "@/client/compute"
import type {
  ListUDMHybridConfigsResponse,
  ListUDMModelsResponse,
  UDMHybridConfigCreateRequest,
  UDMHybridConfigPublic,
  UDMHybridConfigUpdateRequest,
  UDMHybridValidationResponse,
  UDMModelCreateFromTemplateRequest,
  UDMModelCreateRequest,
  UDMModelDefinitionDraft,
  UDMModelDetailPublic,
  UDMModelUpdateRequest,
  UDMSeedTemplateSummary,
  UDMValidationResponse,
} from "@/client/compute"

export interface ListUdmModelsParams {
  skip?: number
  limit?: number
  q?: string
}

export interface ListUdmHybridConfigsParams {
  skip?: number
  limit?: number
}

export interface ListUdmTemplatesParams {
  tags?: string[]
  excludeTags?: string[]
}

const commaList = (values?: string[]): string | undefined =>
  values?.filter(Boolean).join(",") || undefined

export const computeUdmApi = {
  listTemplates(
    params: ListUdmTemplatesParams = {},
  ): Promise<UDMSeedTemplateSummary[]> {
    return DefaultService.listUdmModelTemplates({
      tags: commaList(params.tags),
      excludeTags: commaList(params.excludeTags),
    })
  },

  validateModelDefinition(
    requestBody: object,
  ): Promise<UDMValidationResponse> {
    return DefaultService.validateUdmModelDefinition({
      requestBody: requestBody as UDMModelDefinitionDraft,
    })
  },

  createModel(requestBody: object): Promise<UDMModelDetailPublic> {
    return DefaultService.createUdmModel({
      requestBody: requestBody as UDMModelCreateRequest,
    })
  },

  createModelFromTemplate(requestBody: object): Promise<UDMModelDetailPublic> {
    return DefaultService.createUdmModelFromTemplate({
      requestBody: requestBody as UDMModelCreateFromTemplateRequest,
    })
  },

  listModels(params: ListUdmModelsParams = {}): Promise<ListUDMModelsResponse> {
    return DefaultService.listUdmModels({
      limit: params.limit,
      q: params.q,
      skip: params.skip,
    })
  },

  getModel(modelId: string): Promise<UDMModelDetailPublic> {
    return DefaultService.getUdmModel({ modelId })
  },

  updateModel(
    modelId: string,
    requestBody: object,
  ): Promise<UDMModelDetailPublic> {
    return DefaultService.updateUdmModel({
      modelId,
      requestBody: requestBody as UDMModelUpdateRequest,
    })
  },

  deleteModel(modelId: string): Promise<unknown> {
    return DefaultService.deleteUdmModel({ modelId })
  },

  validateHybridConfig(requestBody: object): Promise<UDMHybridValidationResponse> {
    return DefaultService.validateUdmHybridConfig({
      requestBody: requestBody as Record<string, unknown>,
    })
  },

  listHybridConfigs(
    params: ListUdmHybridConfigsParams = {},
  ): Promise<ListUDMHybridConfigsResponse> {
    return DefaultService.listUdmHybridConfigs({
      limit: params.limit,
      skip: params.skip,
    })
  },

  createHybridConfig(
    requestBody: object,
  ): Promise<UDMHybridConfigPublic> {
    return DefaultService.createUdmHybridConfig({
      requestBody: requestBody as UDMHybridConfigCreateRequest,
    })
  },

  getHybridConfig(id: string): Promise<UDMHybridConfigPublic> {
    return DefaultService.getUdmHybridConfig({ id })
  },

  updateHybridConfig(
    id: string,
    requestBody: object,
  ): Promise<UDMHybridConfigPublic> {
    return DefaultService.updateUdmHybridConfig({
      id,
      requestBody: requestBody as UDMHybridConfigUpdateRequest,
    })
  },

  deleteHybridConfig(id: string): Promise<unknown> {
    return DefaultService.deleteUdmHybridConfig({ id })
  },
}
