import { Box } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { DocsView } from "@/components/Knowledge/DocsView"

const docsSearchSchema = z.object({
  embed: z.coerce.string().optional(),
})

function redirectToAuth() {
  const target = "/login"
  try {
    window.top?.location.assign(target)
  } catch {
    window.location.assign(target)
  }
}

export const Route = createFileRoute("/docs/")({
  component: DocsIndexRoute,
  validateSearch: (search) => docsSearchSchema.parse(search),
})

function DocsIndexRoute() {
  const { embed } = Route.useSearch()
  const isEmbedded = embed === "1" || embed === "true"

  return (
    <Box
      w="full"
      h="full"
      onClickCapture={(e) => {
        if (!isEmbedded) return
        const target = e.target as HTMLElement | null
        const clickable = target?.closest?.('a,button,[role="button"]')
        if (!clickable) return
        e.preventDefault()
        e.stopPropagation()
        redirectToAuth()
      }}
    >
      <DocsView />
    </Box>
  )
}
