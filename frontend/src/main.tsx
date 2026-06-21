// Buffer polyfill for browser compatibility
import { Buffer } from "buffer"
if (typeof window !== "undefined") {
  window.Buffer = Buffer
}

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"

import { CustomProvider } from "./components/ui/provider"
import { I18nProvider } from "./i18n"
import { configureComputeApiClient } from "./shared/api/computeApiClient"
import { isStandaloneRuntime } from "./shared/runtimeConfig"

configureComputeApiClient()

const handleApiError = (error: Error) => {
  const status = (error as { status?: unknown }).status
  if (typeof status === "number" && [401, 403].includes(status)) {
    if (isStandaloneRuntime()) {
      return
    }
    localStorage.removeItem("access_token")
    window.location.href = "/login"
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

type AppRouter = ReturnType<typeof createRouter>

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter
  }
}

const loadRouteTree = async () => {
  if (isStandaloneRuntime()) {
    return (await import("./standaloneRouteTree")).routeTree
  }
  return (await import("./routeTree.gen")).routeTree
}

const configureLegacyRuntime = async () => {
  if (!isStandaloneRuntime()) {
    await (await import("./legacyApiClient")).configureLegacyApiClient()
  }
}

Promise.all([configureLegacyRuntime(), loadRouteTree()]).then(([, routeTree]) => {
  const router = createRouter({ routeTree })

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <I18nProvider>
        <CustomProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </CustomProvider>
      </I18nProvider>
    </StrictMode>,
  )
})
