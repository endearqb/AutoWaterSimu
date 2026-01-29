import { createFileRoute } from "@tanstack/react-router"

import { PosthogLanding } from "@/components/HomePosthog/PosthogLanding"

export const Route = createFileRoute("/")({
  component: HomeRoute,
})

function HomeRoute() {
  return <PosthogLanding />
}
