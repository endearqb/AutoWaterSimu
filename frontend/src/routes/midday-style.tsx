import { Box } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import {
  Footer,
  FooterCTA,
  MiddayHead,
  MiddayStyleHero,
  SectionFive,
  SectionFour,
  SectionOne,
  SectionThree,
  SectionTwo,
  Stories,
} from "../components/Landing"

const landingSearchSchema = z.object({
  embed: z.coerce.string().optional(),
})

export const Route = createFileRoute("/midday-style")({
  component: MiddayStyleLanding,
  validateSearch: (search) => landingSearchSchema.parse(search),
})

function redirectToAuth() {
  const target = "/login"
  try {
    window.top?.location.assign(target)
  } catch {
    window.location.assign(target)
  }
}

function MiddayStyleLanding() {
  const { embed } = Route.useSearch()
  const isEmbedded = embed === "1" || embed === "true"

  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      overflowX="hidden"
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
      {isEmbedded ? null : <MiddayHead />}
      <Box pt={isEmbedded ? 0 : "82px"}>
        <MiddayStyleHero />
        <Stories />
        <SectionOne />
        <SectionTwo />
        <SectionThree />
        <SectionFour />
        <SectionFive />
        <FooterCTA />
        <Box
          borderBottom="1px solid"
          borderColor="gray.200"
          _dark={{ borderColor: "gray.700" }}
        />
        <Footer />
      </Box>
    </Box>
  )
}
