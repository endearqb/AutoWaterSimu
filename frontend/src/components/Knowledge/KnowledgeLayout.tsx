import { useColorModeValue } from "@/components/ui/color-mode"
import { Box, Grid } from "@chakra-ui/react"
import type { ReactNode } from "react"

type KnowledgeLayoutProps = {
  sidebar: ReactNode
  content: ReactNode
}

export function KnowledgeLayout({ sidebar, content }: KnowledgeLayoutProps) {
  const panelBg = useColorModeValue("white", "gray.800")
  const border = useColorModeValue("gray.100", "gray.700")
  const shadow = useColorModeValue("sm", "none")

  return (
    <Grid
      gap={6}
      alignItems="start"
      templateColumns={{ base: "1fr", md: "minmax(240px, 3fr) 7fr" }}
    >
      <Box
        px={{ base: 0, md: 4 }}
        py={4}
        borderRadius="lg"
        borderWidth={{ base: 0, md: "1px" }}
        borderColor={border}
        bg={panelBg}
        shadow={{ base: "none", md: shadow }}
        maxH={{ md: "calc(100vh - 140px)" }}
        overflowY="auto"
      >
        {sidebar}
      </Box>
      <Box
        px={{ base: 0, md: 6 }}
        py={{ base: 0, md: 6 }}
        bg={panelBg}
        borderRadius="lg"
        borderWidth="1px"
        borderColor={border}
        shadow={shadow}
      >
        {content}
      </Box>
    </Grid>
  )
}
