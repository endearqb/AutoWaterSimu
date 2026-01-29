import { Box, Button, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { useI18n } from "@/i18n"

import { CaseFlowPreview } from "./CaseFlowPreview"

type FlowDocsSectionId = "overview" | "canvas" | "nodes"

type FlowDocsSection = {
  id: FlowDocsSectionId
  label: string
  route: string
  description: string
}

export function FlowComponentsDocs() {
  const { t } = useI18n()

  const sections: FlowDocsSection[] = [
    {
      id: "overview",
      label: t("posthogDemo.flowDocs.overview"),
      route: "/flow-components",
      description: t("posthogDemo.flowDocs.overviewDescription"),
    },
    {
      id: "canvas",
      label: t("posthogDemo.flowDocs.canvas"),
      route: "/flow-components/canvas",
      description: t("posthogDemo.flowDocs.canvasDescription"),
    },
    {
      id: "nodes",
      label: t("posthogDemo.flowDocs.nodes"),
      route: "/flow-components/nodes",
      description: t("posthogDemo.flowDocs.nodesDescription"),
    },
  ]

  const [active, setActive] = useState<FlowDocsSectionId>("overview")
  const current = sections.find((s) => s.id === active) ?? sections[0]

  return (
    <Flex w="full" h="full" overflow="hidden" bg="white">
      <Box
        w="260px"
        borderRightWidth="1px"
        borderRightColor="rgba(0,0,0,0.12)"
        bg="rgba(248,247,244,0.92)"
      >
        <Box
          px={4}
          py={3}
          borderBottomWidth="1px"
          borderBottomColor="rgba(0,0,0,0.12)"
        >
          <Heading size="sm" color="gray.800">
            {t("posthogDemo.flowDocs.title")}
          </Heading>
          <Text fontSize="xs" color="gray.600">
            {t("posthogDemo.flowDocs.clickToNavigate")}
          </Text>
        </Box>

        <VStack align="stretch" gap={1} p={2}>
          {sections.map((s) => (
            <Button
              key={s.id}
              size="sm"
              justifyContent="flex-start"
              variant={s.id === active ? "solid" : "ghost"}
              colorScheme={s.id === active ? "blue" : undefined}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </Button>
          ))}
        </VStack>
      </Box>

      <Box flex="1" overflow="hidden">
        <Box
          px={4}
          py={3}
          borderBottomWidth="1px"
          borderBottomColor="rgba(0,0,0,0.12)"
        >
          <HStack gap={2} justify="space-between" align="start">
            <Box>
              <Text fontSize="xs" color="gray.500">
                {t("posthogDemo.flowDocs.routeLabel")}: <code>{current.route}</code>
              </Text>
              <Text fontSize="sm" color="gray.700">
                {current.description}
              </Text>
            </Box>
            <Box />
          </HStack>
        </Box>

        <Box h="calc(100% - 52px)" overflow="hidden">
          {active === "overview" ? (
            <Box p={5} overflow="auto" h="full">
              <VStack align="start" gap={3}>
                <Heading size="sm">{t("posthogDemo.flowDocs.pathsTitle")}</Heading>
                <VStack align="start" gap={2} fontSize="sm" color="gray.700">
                  <Text>
                    - Canvas: <code>frontend/src/components/Flow/Canvas.tsx</code>
                  </Text>
                  <Text>
                    - Nodes: <code>frontend/src/components/Flow/nodes/*</code>
                  </Text>
                </VStack>
                <Heading size="sm">{t("posthogDemo.flowDocs.tipTitle")}</Heading>
                <Text fontSize="sm" color="gray.700">
                  {t("posthogDemo.flowDocs.tipBody")}
                </Text>
              </VStack>
            </Box>
          ) : active === "canvas" ? (
            <Box h="full" bg="white">
              <iframe
                title="OpenFlow Canvas"
                src="/openflow?embed=1&src=/assets/json/ASM1-SST.json"
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </Box>
          ) : (
            <Box h="full">
              <CaseFlowPreview jsonUrl="/assets/json/ASM1-SST.json" />
            </Box>
          )}
        </Box>
      </Box>
    </Flex>
  )
}
