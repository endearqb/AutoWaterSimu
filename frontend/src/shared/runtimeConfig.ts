export type FrontendAuthMode = "disabled" | "static_token" | "legacy"
export type FrontendAppMode = "standalone" | "legacy"
export type FrontendContextMode = "standalone" | "newsystem" | "legacy"

export interface FrontendRuntimeConfig {
  appMode: FrontendAppMode
  authMode: FrontendAuthMode
  contextMode: FrontendContextMode
}

const normalize = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : ""

const authMode = (): FrontendAuthMode => {
  const value = normalize(import.meta.env.VITE_AUTH_MODE)
  if (value === "disabled" || value === "static_token") {
    return value
  }
  return "legacy"
}

const appMode = (): FrontendAppMode => {
  const value = normalize(import.meta.env.VITE_APP_MODE)
  if (value === "standalone") {
    return "standalone"
  }
  return "legacy"
}

const contextMode = (): FrontendContextMode => {
  const value = normalize(import.meta.env.VITE_CONTEXT_MODE)
  if (value === "standalone" || value === "newsystem") {
    return value
  }
  return "legacy"
}

export const getFrontendRuntimeConfig = (): FrontendRuntimeConfig => ({
  appMode: appMode(),
  authMode: authMode(),
  contextMode: contextMode(),
})

export const isStandaloneRuntime = (): boolean => {
  const config = getFrontendRuntimeConfig()
  return (
    config.appMode === "standalone" ||
    config.authMode === "disabled" ||
    config.contextMode === "standalone"
  )
}

export const isAuthDisabled = (): boolean =>
  getFrontendRuntimeConfig().authMode === "disabled"
