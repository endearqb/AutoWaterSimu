import { Box } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import {
  // AIAssistant,
  Footer,
  MiddayHead,
  MiddayStyleHero,
  SectionFive,
  SectionFour,
  SectionOne,
  SectionThree,
  SectionTwo,
  // UserTestimonials,
  Stories,
} from "../components/Landing"

export const Route = createFileRoute("/midday-style")({
  component: MiddayStyleLanding,
})

function MiddayStyleLanding() {
  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      overflowX="hidden"
    >
      <MiddayHead />
      <Box pt="82px">
        {" "}
        {/* 为固定header留出空间: 50px(header高度) + 16px(top) + 16px(额外间距) */}
        <MiddayStyleHero />
        <Stories />
        <SectionOne />
        <SectionTwo />
        <SectionThree />
        <SectionFour />
        <SectionFive />
        {/* <FeatureShowcase /> */}
        {/* <UserTestimonials />
        <AIAssistant /> */}
        <Footer />
      </Box>
    </Box>
  )
}
