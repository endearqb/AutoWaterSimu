import { computeContractsApi } from "./api"

const parseJsonDocument = (text: string): Record<string, unknown> =>
  JSON.parse(text) as Record<string, unknown>

export const validateContractTextMutationOptions = () => ({
  mutationFn: (text: string) =>
    computeContractsApi.validateContractDocument(parseJsonDocument(text)),
})

export const confirmDraftTextMutationOptions = () => ({
  mutationFn: (text: string) =>
    computeContractsApi.confirmDraftDocument(parseJsonDocument(text)),
})
