import { createFileRoute } from "@tanstack/react-router"

import { PosthogLanding } from "@/components/HomePosthog/PosthogLanding"

export const Route = createFileRoute("/posthog-demo")({
  component: PosthogDemoPage,
})

function PosthogDemoPage() {
  return <PosthogLanding />
}
