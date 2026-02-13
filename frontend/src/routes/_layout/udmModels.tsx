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
import { useI18n } from "@/i18n"
import { udmService } from "../../services/udmService"

export const Route = createFileRoute("/_layout/udmModels")({
  component: UDMModelsPage,
})

function UDMModelsPage() {
  const { t, language } = useI18n()
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
      showSuccessToast(
        t("flow.udmModels.toast.createTemplateSuccess", {
          name: created.name,
        }),
      )
      navigate({
        to: "/udmModelEditor",
        search: { modelId: created.id },
      })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmModels.toast.createTemplateFailed"),
      )
    },
  })

  const duplicateModel = useMutation({
    mutationFn: async (modelId: string) => udmService.duplicateModel(modelId),
    onSuccess: (created) => {
      showSuccessToast(
        t("flow.udmModels.toast.duplicateSuccess", {
          name: created.name,
        }),
      )
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmModels.toast.duplicateFailed"),
      )
    },
  })

  const deleteModel = useMutation({
    mutationFn: async (modelId: string) => udmService.deleteModel(modelId),
    onSuccess: () => {
      showSuccessToast(t("flow.udmModels.toast.deleteSuccess"))
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmModels.toast.deleteFailed"),
      )
    },
  })

  const togglePublish = useMutation({
    mutationFn: async (args: { modelId: string; nextPublished: boolean }) =>
      udmService.updateModel(args.modelId, { is_published: args.nextPublished }),
    onSuccess: (updated) => {
      showSuccessToast(
        updated.is_published
          ? t("flow.udmModels.toast.publishSuccess")
          : t("flow.udmModels.toast.unpublishSuccess"),
      )
      queryClient.invalidateQueries({ queryKey: ["udm-models"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmModels.toast.publishUpdateFailed"),
      )
    },
  })

  const models = useMemo(() => modelsQuery.data?.data || [], [modelsQuery.data])
  const templates = useMemo(
    () => templatesQuery.data || [],
    [templatesQuery.data],
  )

  const dateLocale = language === "zh" ? "zh-CN" : "en-US"

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        {t("flow.udmModels.title")}
      </Heading>

      <Flex mt={6} gap={3} wrap="wrap" align="center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("flow.udmModels.searchPlaceholder")}
          maxW="360px"
        />
        <Button onClick={() => setSearchText(searchInput.trim())}>
          {t("flow.udmModels.actions.search")}
        </Button>
        <Button
          variant="subtle"
          colorPalette="gray"
          onClick={() => {
            setSearchInput("")
            setSearchText("")
          }}
        >
          {t("flow.udmModels.actions.clear")}
        </Button>
        <Button
          colorPalette="blue"
          onClick={() => navigate({ to: "/udmModelEditor" })}
        >
          {t("flow.udmModels.actions.createBlankModel")}
        </Button>
      </Flex>

      <Box mt={8}>
        <Heading size="md" mb={3}>
          {t("flow.udmModels.sections.templateQuickCreate")}
        </Heading>
        {templatesQuery.isLoading ? (
          <Text color="gray.500">{t("flow.udmModels.state.templatesLoading")}</Text>
        ) : templates.length === 0 ? (
          <Text color="gray.500">{t("flow.udmModels.state.templatesEmpty")}</Text>
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
                    {tpl.description || t("flow.udmModels.template.noDescription")}
                  </Text>
                  <HStack mt={2} gap={2}>
                    {(tpl.tags || []).map((tag) => (
                      <Badge key={`${tpl.key}-${tag}`} colorPalette="blue">
                        {tag}
                      </Badge>
                    ))}
                    <Text fontSize="xs" color="gray.500">
                      {t("flow.udmModels.template.stats", {
                        components: tpl.components_count || 0,
                        processes: tpl.processes_count || 0,
                        parameters: tpl.parameters_count || 0,
                      })}
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
                  {t("flow.udmModels.actions.createFromTemplate")}
                </Button>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      <Box mt={10} pb={8}>
        <Heading size="md" mb={3}>
          {t("flow.udmModels.sections.myModels")}
        </Heading>
        {modelsQuery.isLoading ? (
          <Text color="gray.500">{t("flow.udmModels.state.modelsLoading")}</Text>
        ) : models.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <FiSearch />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>
                  {t("flow.udmModels.state.modelsEmptyTitle")}
                </EmptyState.Title>
                <EmptyState.Description>
                  {t("flow.udmModels.state.modelsEmptyDescription")}
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <Table.Root size={{ base: "sm", md: "md" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  {t("flow.udmModels.table.headers.modelName")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.udmModels.table.headers.version")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.udmModels.table.headers.publishStatus")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.udmModels.table.headers.updatedAt")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.udmModels.table.headers.actions")}
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {models.map((model) => (
                <Table.Row key={model.id}>
                  <Table.Cell>{model.name}</Table.Cell>
                  <Table.Cell>v{model.current_version}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={model.is_published ? "green" : "gray"}>
                      {model.is_published
                        ? t("flow.udmModels.table.published")
                        : t("flow.udmModels.table.unpublished")}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {new Date(model.updated_at).toLocaleString(dateLocale)}
                  </Table.Cell>
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
                        {t("flow.udmModels.actions.edit")}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => duplicateModel.mutate(model.id)}
                      >
                        {t("flow.udmModels.actions.duplicate")}
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
                        {model.is_published
                          ? t("flow.udmModels.actions.unpublish")
                          : t("flow.udmModels.actions.publish")}
                      </Button>
                      <Button
                        size="xs"
                        colorPalette="red"
                        variant="subtle"
                        onClick={() => {
                          const ok = window.confirm(
                            t("flow.udmModels.confirm.deleteModel", {
                              name: model.name,
                            }),
                          )
                          if (ok) {
                            deleteModel.mutate(model.id)
                          }
                        }}
                      >
                        {t("flow.udmModels.actions.delete")}
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

