import { Box, Flex, Icon, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"

import {
  FiBarChart,
  FiBook,
  FiBriefcase,
  FiGitBranch,
  FiGitMerge,
  FiGitPullRequest,
  FiHome,
  FiLayers,
  FiUsers,
} from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"

const getFlowingFlowItems = (currentUser: UserPublic | undefined) => {
  const baseChildren = [
    { icon: FiGitBranch, title: "物料平衡计算", path: "/materialbalance" },
    { icon: FiGitMerge, title: "简易活性污泥模型", path: "/asm1slim" },
    { icon: FiGitPullRequest, title: "活性污泥模型 ASM1", path: "/asm1" },
  ]

  // 只有ultra用户和超级管理员才能看到ASM3
  if (currentUser?.user_type === "ultra" || currentUser?.is_superuser) {
    baseChildren.push({
      icon: FiGitPullRequest,
      title: "活性污泥模型 ASM3",
      path: "/asm3",
    })
  }

  return baseChildren
}

const getItems = (currentUser: UserPublic | undefined) => [
  { icon: FiHome, title: "首页", path: "/dashboard" },
  {
    icon: FiLayers,
    title: "FlowingFlow",
    path: "/flowing-flow",
    isSubmenu: true,
    children: getFlowingFlowItems(currentUser),
  },
  { icon: FiBook, title: "知识库", path: "/knowledge" },
  // { icon: FiSettings, title: "User Settings", path: "/settings" },
]

interface SidebarItemsProps {
  onClose?: () => void
  collapsed?: boolean
}

interface Item {
  icon: IconType
  title: string
  path?: string
  isSubmenu?: boolean
  children?: SubItem[]
}

interface SubItem {
  icon: IconType
  title: string
  path: string
}

// 在现有的SidebarItems组件中添加流程图页面的链接
const SidebarItems = ({ onClose, collapsed = false }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const baseItems = getItems(currentUser)
  const finalItems: Item[] = currentUser?.is_superuser
    ? [
        ...baseItems,

        { icon: FiBarChart, title: "超级管理员看板", path: "/super-dashboard" },
        { icon: FiBriefcase, title: "Items", path: "/items" },
        { icon: FiUsers, title: "用户管理", path: "/admin" },
      ]
    : baseItems

  const renderMenuItem = (item: Item) => {
    if (item.isSubmenu && item.children) {
      return (
        <Box key={item.title}>
          <Flex
            gap={collapsed ? 0 : 4}
            px={collapsed ? 2 : 4}
            py={2}
            _hover={{
              background: "gray.subtle",
            }}
            alignItems="center"
            fontSize="sm"
            justifyContent={collapsed ? "center" : "flex-start"}
            title={collapsed ? item.title : undefined}
          >
            <Icon
              as={item.icon}
              alignSelf="center"
              fontSize={collapsed ? "18px" : "16px"}
            />
            {!collapsed && (
              <Text ml={2} flex={1}>
                {item.title}
              </Text>
            )}
          </Flex>
          {!collapsed && (
            <Box ml={6}>
              {item.children.map((child) => (
                <RouterLink key={child.title} to={child.path} onClick={onClose}>
                  <Flex
                    gap={4}
                    px={4}
                    py={2}
                    _hover={{
                      background: "gray.subtle",
                    }}
                    alignItems="center"
                    fontSize="sm"
                  >
                    <Icon as={child.icon} alignSelf="center" fontSize="14px" />
                    <Text ml={2}>{child.title}</Text>
                  </Flex>
                </RouterLink>
              ))}
            </Box>
          )}
        </Box>
      )
    }

    return (
      <RouterLink key={item.title} to={item.path!} onClick={onClose}>
        <Flex
          gap={collapsed ? 0 : 4}
          px={collapsed ? 2 : 4}
          py={2}
          _hover={{
            background: "gray.subtle",
          }}
          alignItems="center"
          fontSize="sm"
          justifyContent={collapsed ? "center" : "flex-start"}
          title={collapsed ? item.title : undefined}
        >
          <Icon
            as={item.icon}
            alignSelf="center"
            fontSize={collapsed ? "18px" : "16px"}
          />
          {!collapsed && <Text ml={2}>{item.title}</Text>}
        </Flex>
      </RouterLink>
    )
  }

  const listItems = finalItems.map(renderMenuItem)

  return (
    <>
      {/* {!collapsed && (
        <Text fontSize="xs" px={4} py={2} fontWeight="bold">
          Menu
        </Text>
      )} */}
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
