import { useColorModeValue } from "@/components/ui/color-mode"
import { KNOWLEDGE_DEFAULT_SLUG, type KnowledgeTreeNode } from "@/knowledge"
import { Box, Button, Flex, Icon, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { FiChevronRight } from "react-icons/fi"

type KnowledgeSidebarProps = {
  nodes: KnowledgeTreeNode[]
  activeSlug?: string
  onNavigate?: () => void
  basePath?: string
}

const EXCLUDED_ROOT_SEGMENTS = new Set(["guide", "overview", "index"])
const EXCLUDED_FULL_SLUGS = new Set(["guide/digital-twin", "guide/digital-win"])

const normalizeBasePath = (basePath?: string) => {
  if (!basePath?.length) return "/knowledge"
  if (basePath === "/") return ""
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath
}

const toHref = (slug: string, basePath?: string) => {
  const base = normalizeBasePath(basePath)
  return slug === KNOWLEDGE_DEFAULT_SLUG ? `${base}` : `${base}/${slug}`
}

const getRootSegment = (slug: string) => slug.split("/")[0] ?? slug

const shouldExcludeNode = (slug: string) =>
  EXCLUDED_ROOT_SEGMENTS.has(getRootSegment(slug)) ||
  EXCLUDED_FULL_SLUGS.has(slug)

const filterKnowledgeNodes = (tree: KnowledgeTreeNode[]): KnowledgeTreeNode[] =>
  tree.reduce<KnowledgeTreeNode[]>((acc, node) => {
    if (shouldExcludeNode(node.slug) || !node.title?.length) {
      return acc
    }

    const children = node.children
      ? filterKnowledgeNodes(node.children)
      : undefined
    const sanitizedNode: KnowledgeTreeNode = {
      ...node,
      children: children?.length ? children : undefined,
    }

    if (!sanitizedNode.isLeaf && !sanitizedNode.children?.length) {
      return acc
    }

    acc.push(sanitizedNode)
    return acc
  }, [])

type TreeItemProps = {
  node: KnowledgeTreeNode
  depth: number
  activeSlug?: string
  onNavigate?: () => void
  basePath?: string
}

const TreeItem = ({
  node,
  depth,
  activeSlug,
  onNavigate,
  basePath,
}: TreeItemProps) => {
  const isCurrent = activeSlug === node.slug
  const isActiveBranch =
    !!activeSlug &&
    (activeSlug === node.slug || activeSlug.startsWith(`${node.slug}/`))
  const [isOpen, setIsOpen] = useState(isActiveBranch)
  const accent = useColorModeValue("blue.600", "blue.300")
  const textColor = useColorModeValue("gray.700", "gray.200")
  const borderColor = useColorModeValue("gray.100", "gray.700")
  const paddingLeft = `calc(${depth} * 0.75rem)`

  useEffect(() => {
    if (isActiveBranch) {
      setIsOpen(true)
    }
  }, [isActiveBranch])

  if (node.isLeaf || !node.children?.length) {
    return (
      <Button
        variant="ghost"
        justifyContent="flex-start"
        fontWeight={isCurrent ? "semibold" : "medium"}
        color={isCurrent ? accent : textColor}
        bg={isCurrent ? "blue.50" : "transparent"}
        _hover={{ bg: "blue.50" }}
        w="100%"
        px={2}
        py={2}
        fontSize="sm"
        aria-current={isCurrent ? "page" : undefined}
        onClick={onNavigate}
        borderRadius="md"
        pl={paddingLeft}
        asChild
      >
        <Link to={toHref(node.slug, basePath)}>
          <Text textAlign="left">{node.title}</Text>
        </Link>
      </Button>
    )
  }

  return (
    <Box>
      <Button
        variant="ghost"
        justifyContent="flex-start"
        w="100%"
        px={2}
        py={2}
        fontSize="sm"
        fontWeight={isActiveBranch ? "semibold" : "medium"}
        color={isActiveBranch ? accent : textColor}
        onClick={() => setIsOpen((prev) => !prev)}
        borderRadius="md"
        pl={paddingLeft}
      >
        <Flex align="center" gap={2}>
          <Icon
            as={FiChevronRight}
            transform={isOpen ? "rotate(90deg)" : undefined}
            transition="transform 0.2s"
            aria-hidden
          />
          <Text>{node.title}</Text>
        </Flex>
      </Button>
      <Box
        borderLeftWidth="1px"
        borderColor={borderColor}
        ml={depth === 0 ? 0 : 2}
        display={isOpen ? "block" : "none"}
      >
        <Box pl={3}>
          {node.children?.map((child) => (
            <TreeItem
              key={child.slug}
              node={child}
              depth={depth + 1}
              activeSlug={activeSlug}
              onNavigate={onNavigate}
              basePath={basePath}
            />
          ))}
        </Box>
      </Box>
    </Box>
  )
}

export function KnowledgeSidebar({
  nodes,
  activeSlug,
  onNavigate,
  basePath,
}: KnowledgeSidebarProps) {
  const headingColor = useColorModeValue("gray.900", "gray.100")
  const subColor = useColorModeValue("gray.500", "gray.400")
  const borderColor = useColorModeValue("gray.100", "gray.700")
  const orderedNodes = useMemo(() => filterKnowledgeNodes(nodes), [nodes])

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" color={headingColor} mb={1}>
        知识目录
      </Text>
      <Text fontSize="sm" color={subColor} mb={4}>
        内容来自 AI DeepResearch，仅供初步学习。AI 可能会犯错，请保持谨慎。
      </Text>
      <Text fontSize="sm" color={subColor} mb={4}>
        新增了 2025 环境工程热点相关内容。
      </Text>
      <Box borderLeftWidth="1px" borderColor={borderColor}>
        {orderedNodes.map((node) => (
          <TreeItem
            key={node.slug}
            node={node}
            depth={1}
            activeSlug={activeSlug}
            onNavigate={onNavigate}
            basePath={basePath}
          />
        ))}
      </Box>
    </Box>
  )
}
