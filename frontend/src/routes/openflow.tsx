import { Box, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect } from "react"
import { z } from "zod"
import "@xyflow/react/dist/style.css"
import { useI18n } from "@/i18n"
import Canvas from "../components/Flow/Canvas"
import Layout from "../components/Flow/Layout"
import InspectorContainer from "../components/Flow/inspectorbar/InspectorContainer"
import { MiddayHead } from "../components/Landing"
import useFlowStore from "../stores/flowStore"

const openflowSearchSchema = z.object({
  embed: z.coerce.string().optional(),
  src: z.coerce.string().optional(),
  ui: z.coerce.string().optional(),
})

export const Route = createFileRoute("/openflow")({
  component: FlowPage,
  validateSearch: (search) => openflowSearchSchema.parse(search),
})

function FlowPage() {
  const { t } = useI18n()
  const { embed, src, ui } = Route.useSearch()
  const isEmbedded = embed === "1" || embed === "true"
  const isPreviewEmbed = isEmbedded && ui === "preview"
  const {
    importFlowData,
    newFlowChart,
    setImportedFileName,
    setCurrentFlowChartName,
  } = useFlowStore()

  useEffect(() => {
    if (!src) return
    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await fetch(src, { signal: controller.signal })
        if (!res.ok) return
        const data = (await res.json()) as unknown
        if (controller.signal.aborted) return

        newFlowChart()
        const result = importFlowData(data)
        if (!result.success) return

        const fileName =
          src
            .split("/")
            .pop()
            ?.replace(/\.json$/i, "") ?? "imported"
        setImportedFileName(fileName)
        setCurrentFlowChartName(fileName)
      } catch {
        // ignore
      }
    }

    load()
    return () => controller.abort()
  }, [
    importFlowData,
    newFlowChart,
    setCurrentFlowChartName,
    setImportedFileName,
    src,
  ])
  const instructions = [
    t("openflow.instructions.drag"),
    t("openflow.instructions.connect"),
    t("openflow.instructions.click"),
    t("openflow.instructions.doubleClick"),
    t("openflow.instructions.loginToRun"),
    t("openflow.instructions.exportImport"),
    t("openflow.instructions.noLoginCompute"),
    t("openflow.instructions.noOnlineSave"),
    t("openflow.instructions.noOnlineLoad"),
    t("openflow.instructions.noLoadCalcData"),
    t("openflow.instructions.deleteKey"),
  ]

  return (
    <Box minH="100vh">
      {isEmbedded ? null : <MiddayHead />}
      <ReactFlowProvider>
        <Box position="relative" overflow="hidden" maxH="100%">
          {isPreviewEmbed ? (
            <Box h="100vh">
              <Canvas showControls={false} />
            </Box>
          ) : (
            <Layout
              canvas={<Canvas />}
              inspector={<InspectorContainer />}
              topOffset={isEmbedded ? 24 : 82}
            />
          )}

          {/* 左侧说明文字水印 - 仅在openflow页面显示 */}
          {isEmbedded ? null : (
            <Box
              position="absolute"
              left="20px"
              top="20px"
              zIndex={100}
              pointerEvents="none"
              opacity={0.6}
            >
              <VStack align="start" gap={2}>
                <Text
                  fontSize="sm"
                  color="gray.600"
                  fontWeight="medium"
                  bg="white"
                  px={3}
                  py={2}
                  borderRadius="md"
                  boxShadow="sm"
                  border="1px"
                  borderColor="gray.200"
                >
                  {t("openflow.hintTitle")}
                </Text>
                <VStack align="start" gap={1} ml={2}>
                  {instructions.map((text, index) => (
                    <Text
                      key={index}
                      fontSize="xs"
                      color="gray.500"
                      bg="white"
                      px={2}
                      py={1}
                      borderRadius="sm"
                      boxShadow="xs"
                    >
                      • {text}
                    </Text>
                  ))}
                </VStack>
              </VStack>
            </Box>
          )}
        </Box>
      </ReactFlowProvider>
    </Box>
  )
}

export default FlowPage
