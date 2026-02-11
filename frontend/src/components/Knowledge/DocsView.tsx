import { KnowledgeContent } from "@/components/Knowledge/KnowledgeContent"
import { KnowledgeLayout } from "@/components/Knowledge/KnowledgeLayout"
import { KnowledgeSidebar } from "@/components/Knowledge/KnowledgeSidebar"
import { useColorModeValue } from "@/components/ui/color-mode"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  KNOWLEDGE_DEFAULT_SLUG,
  knowledgeEntries,
  knowledgeEntryMap,
  knowledgeTree,
} from "@/knowledge"
import { Box, Button, Flex, IconButton } from "@chakra-ui/react"
import { useMemo, useState } from "react"
import { FiMenu } from "react-icons/fi"

type DocsViewProps = {
  slug?: string
}

export function DocsView({ slug }: DocsViewProps) {
  const normalizedSlug = slug && slug.length > 0 ? slug : KNOWLEDGE_DEFAULT_SLUG
  const entry =
    knowledgeEntryMap[normalizedSlug] ??
    knowledgeEntryMap[KNOWLEDGE_DEFAULT_SLUG] ??
    knowledgeEntries[0]

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const borderColor = useColorModeValue("gray.100", "gray.700")
  const panelBg = useColorModeValue("white", "gray.800")

  const sidebar = useMemo(() => {
    const content = (
      <Box bg={panelBg} h="full">
        <Flex align="center" justify="space-between" mb={3}>
          <Box fontWeight="semibold" color="gray.700">
            目录
          </Box>
          <Button
            size="sm"
            variant="outline"
            borderColor={borderColor}
            display={{ base: "none", md: "inline-flex" }}
            onClick={() => setSidebarOpen(false)}
          >
            折叠
          </Button>
        </Flex>
        <KnowledgeSidebar
          nodes={knowledgeTree}
          activeSlug={entry?.slug ?? normalizedSlug}
          basePath="/docs"
          onNavigate={() => setDrawerOpen(false)}
        />
      </Box>
    )

    return content
  }, [borderColor, entry?.slug, normalizedSlug, panelBg])

  const content = (
    <Box>
      <Flex
        align="center"
        gap={2}
        mb={4}
        display={{ base: "flex", md: "none" }}
      >
        <IconButton
          aria-label="打开目录"
          variant="outline"
          borderColor={borderColor}
          onClick={() => setDrawerOpen(true)}
        >
          <FiMenu />
        </IconButton>
      </Flex>
      <KnowledgeContent entry={entry} />
    </Box>
  )

  return (
    <Box px={{ base: 4, md: 8 }} py={{ base: 4, md: 8 }}>
      <DrawerRoot
        placement="start"
        open={drawerOpen}
        onOpenChange={(e) => setDrawerOpen(e.open)}
      >
        <DrawerBackdrop />
        <DrawerContent maxW="xs">
          <DrawerCloseTrigger />
          <DrawerHeader>
            <DrawerTitle>目录</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>{sidebar}</DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      <Box display={{ base: "block", md: "none" }}>{content}</Box>

      <Box display={{ base: "none", md: "block" }}>
        {!sidebarOpen ? (
          <Box mb={4}>
            <Button
              size="sm"
              variant="outline"
              borderColor={borderColor}
              onClick={() => setSidebarOpen(true)}
            >
              展开目录
            </Button>
          </Box>
        ) : null}
        {sidebarOpen ? (
          <KnowledgeLayout sidebar={sidebar} content={content} />
        ) : (
          <Box>{content}</Box>
        )}
      </Box>
    </Box>
  )
}
