import { DocsView } from "@/components/Knowledge/DocsView"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/docs")({
  component: DocsIndexRoute,
})

function DocsIndexRoute() {
  return <DocsView />
}

