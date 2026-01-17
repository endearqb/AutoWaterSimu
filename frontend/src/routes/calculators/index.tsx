import { Box, Container, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import type React from "react"
import { Footer, FooterCTA, MiddayHead } from "../../components/Landing"
import AORCalculator from "../../components/calculators/AORCalculator"
import { DWACalculator } from "../../components/calculators/DWACalculator"
import { LSICalculator } from "../../components/calculators/LSICalculator"
import StandardAO from "../../components/calculators/StandardAO"

const CalculatorsIndex: React.FC = () => {
  return (
    <Box bg="background.primary" minH="100vh">
      <MiddayHead />
      <Container maxW="7xl" py={8}>
        <VStack gap={8}>
          {/* 页面头部 */}
          <Box textAlign="center" py={8}>
            <Text
              fontSize="5xl"
              bgGradient="to-r"
              gradientFrom="hsl(192,85%,52%)"
              gradientTo="hsl(212,98%,55%)"
              bgClip="text"
              fontWeight="bold"
              maxW="2xl"
              mx="auto"
              mb={2}
            >
              专业的水处理计算工具
            </Text>
            <Text fontSize="lg" color="gray.600" maxW="xl" mx="auto" mb={4}>
              提供专业的水质分析计算工具，帮助您进行精确的水处理参数计算
            </Text>
          </Box>

          {/* LSI计算器 */}
          <LSICalculator />
          {/* AO设计计算器 */}
          <StandardAO />
          {/* AOR计算器 */}
          <AORCalculator />
          {/* DWA A/O工艺设计计算器 */}
          <DWACalculator />
        </VStack>
      </Container>
      <Box
        borderBottom="1px solid"
        borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
      />
      {/* Footer CTA and Footer */}
      <FooterCTA />
      <Footer />
    </Box>
  )
}

export const Route = createFileRoute("/calculators/")({
  component: CalculatorsIndex,
})
