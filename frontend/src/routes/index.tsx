import { Box } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Footer,
  // AIAssistant,
  FooterCTA,
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

export const Route = createFileRoute("/")({
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
        <FooterCTA />
        {/* 这里增加一条分割线 */}
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

// import { Box } from '@chakra-ui/react';
// import { createFileRoute } from '@tanstack/react-router';
// import {
//   MiddayHead,
//   HeroSection,
//   CoreFeatures,
//   Testimonials,
//   TargetAudience,
//   CoreAdvantages,
//   MarketAnalysis,
//   RevenueModel,
//   ActionPlan,
//   Footer
// } from '../components/Landing';

// export const Route = createFileRoute('/')({
//   component: EnvdamaLanding,
// });

// function EnvdamaLanding() {
//   return (
//     <Box minH="100vh">
//       <MiddayHead />
//       <HeroSection />
//       <CoreFeatures />
//       <Testimonials />
//       <TargetAudience />
//       <CoreAdvantages />
//       <MarketAnalysis />
//       <RevenueModel />
//       <ActionPlan />
//       <Footer />
//     </Box>
//   );
// }
