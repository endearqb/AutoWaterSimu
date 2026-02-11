import {
  Badge,
  Box,
  Button,
  Container,
  EmptyState,
  Flex,
  Heading,
  HStack,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { FiSearch } from "react-icons/fi"

import useCustomToast from "@/hooks/useCustomToast"
import { udmService } from "../../services/udmService"

export const Route = createFileRoute("/_layout/udmModels")({
  component: UDMModelsPage,
})

function UDMModelsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [searchInput, setSearchInput] = useState("")
  const [searchText, setSearchText] = useState("")

  const modelsQuery = useQuery({
    queryKey: ["udm-models", searchText],
    queryFn: () =>
      udmService.getModels({
        skip: 0,
        limit: 200,
        q: searchText || undefined,
      }),
  })

  const templatesQuery = useQuery({
    queryKey: ["udm-model-templates"],
    queryFn: () => udmService.getModelTemplates(),
  })

  const createFromTemplate = useMutation({
    mutationFn: async (templateKey: string) =>
      udmService.createModelFromTemplate({ template_key: templateKey }),
    onSuccess: (created) => {
      showSuccessToast(`模板模型创建成功：${created.name}`)
      navigate({
        to: "/udmModelEditor",
        search: { modelId: created.id },
      })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error ? error.message : "创建模板模型失败",
      )
    },
  })

  const duplicateModel = useMutation({
    mutationFn: async (modelId: string) => udmService.duplicateModel(modelId),
    onSuccess: (created) => {
      showSuccessToast(`模型复制成功：${created.name}`)
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : "复制模型失败")
    },
  })

  const deleteModel = useMutation({
    mutationFn: async (modelId: string) => udmService.deleteModel(modelId),
    onSuccess: () => {
      showSuccessToast("模型删除成功")
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : "删除模型失败")
    },
  })

  const togglePublish = useMutation({
    mutationFn: async (args: { modelId: string; nextPublished: boolean }) =>
      udmService.updateModel(args.modelId, { is_published: args.nextPublished }),
    onSuccess: (updated) => {
      showSuccessToast(
        updated.is_published ? "模型已发布" : "模型已取消发布",
      )
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : "更新发布状态失败")
    },
  })

  const models = useMemo(() => modelsQuery.data?.data || [], [modelsQuery.data])
  const templates = useMemo(
    () => templatesQuery.data || [],
    [templatesQuery.data],
  )

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        UDM 模型库
      </Heading>

      <Flex mt={6} gap={3} wrap="wrap" align="center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="按模型名称搜索"
          maxW="360px"
        />
        <Button onClick={() => setSearchText(searchInput.trim())}>搜索</Button>
        <Button
          variant="subtle"
          colorPalette="gray"
          onClick={() => {
            setSearchInput("")
            setSearchText("")
          }}
        >
          清空
        </Button>
        <Button
          colorPalette="blue"
          onClick={() => navigate({ to: "/udmModelEditor" })}
        >
          新建空白模型
        </Button>
      </Flex>

      <Box mt={8}>
        <Heading size="md" mb={3}>
          模板快速创建
        </Heading>
        {templatesQuery.isLoading ? (
          <Text color="gray.500">模板加载中...</Text>
        ) : templates.length === 0 ? (
          <Text color="gray.500">暂无模板</Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {templates.map((tpl) => (
              <Flex
                key={tpl.key}
                borderWidth="1px"
                borderRadius="md"
                p={4}
                align="center"
                justify="space-between"
                gap={4}
              >
                <Box>
                  <Text fontWeight="semibold">{tpl.name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {tpl.description || "无描述"}
                  </Text>
                  <HStack mt={2} gap={2}>
                    {(tpl.tags || []).map((tag) => (
                      <Badge key={`${tpl.key}-${tag}`} colorPalette="blue">
                        {tag}
                      </Badge>
                    ))}
                    <Text fontSize="xs" color="gray.500">
                      C:{tpl.components_count || 0} P:{tpl.processes_count || 0}{" "}
                      θ:{tpl.parameters_count || 0}
                    </Text>
                  </HStack>
                </Box>
                <Button
                  loading={
                    createFromTemplate.isPending &&
                    createFromTemplate.variables === tpl.key
                  }
                  onClick={() => createFromTemplate.mutate(tpl.key)}
                >
                  使用模板创建
                </Button>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      <Box mt={10} pb={8}>
        <Heading size="md" mb={3}>
          我的模型
        </Heading>
        {modelsQuery.isLoading ? (
          <Text color="gray.500">模型列表加载中...</Text>
        ) : models.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <FiSearch />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>暂无模型</EmptyState.Title>
                <EmptyState.Description>
                  你可以点击“新建空白模型”或通过模板快速创建
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <Table.Root size={{ base: "sm", md: "md" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>模型名</Table.ColumnHeader>
                <Table.ColumnHeader>版本</Table.ColumnHeader>
                <Table.ColumnHeader>发布状态</Table.ColumnHeader>
                <Table.ColumnHeader>更新时间</Table.ColumnHeader>
                <Table.ColumnHeader>操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {models.map((model) => (
                <Table.Row key={model.id}>
                  <Table.Cell>{model.name}</Table.Cell>
                  <Table.Cell>v{model.current_version}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={model.is_published ? "green" : "gray"}>
                      {model.is_published ? "已发布" : "未发布"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{new Date(model.updated_at).toLocaleString()}</Table.Cell>
                  <Table.Cell>
                    <HStack gap={2} wrap="wrap">
                      <Button
                        size="xs"
                        onClick={() =>
                          navigate({
                            to: "/udmModelEditor",
                            search: { modelId: model.id },
                          })
                        }
                      >
                        编辑
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => duplicateModel.mutate(model.id)}
                      >
                        复制
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() =>
                          togglePublish.mutate({
                            modelId: model.id,
                            nextPublished: !model.is_published,
                          })
                        }
                      >
                        {model.is_published ? "取消发布" : "发布"}
                      </Button>
                      <Button
                        size="xs"
                        colorPalette="red"
                        variant="subtle"
                        onClick={() => {
                          const ok = window.confirm(
                            `确认删除模型「${model.name}」吗？`,
                          )
                          if (ok) {
                            deleteModel.mutate(model.id)
                          }
                        }}
                      >
                        删除
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>
    </Container>
  )
}

