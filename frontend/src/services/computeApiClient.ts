import { OpenAPI as ComputeOpenAPI } from "@/client/compute"
import type { ApiRequestOptions } from "@/client/compute/core/ApiRequestOptions"

const DEFAULT_COMPUTE_API_URL = "http://localhost:8088"
const DEFAULT_COMPUTE_API_TOKEN = "dev-public-token"

const localComputeToken = (): string => {
  if (typeof window === "undefined") {
    return ""
  }
  return window.localStorage.getItem("compute_access_token") || ""
}

export const resolveComputeApiToken = async (
  _options?: ApiRequestOptions<string>,
): Promise<string> => {
  return (
    localComputeToken() ||
    import.meta.env.VITE_COMPUTE_API_TOKEN ||
    DEFAULT_COMPUTE_API_TOKEN
  )
}

export const computeApiBaseUrl = (): string =>
  ComputeOpenAPI.BASE || import.meta.env.VITE_COMPUTE_API_URL || DEFAULT_COMPUTE_API_URL

export const computeApiPath = (path: string): string =>
  `${computeApiBaseUrl().replace(/\/$/, "")}${path}`

export const configureComputeApiClient = (): void => {
  ComputeOpenAPI.BASE =
    import.meta.env.VITE_COMPUTE_API_URL || DEFAULT_COMPUTE_API_URL
  ComputeOpenAPI.TOKEN = resolveComputeApiToken
}
