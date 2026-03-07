import {
  Badge,
  Box,
  Button,
  Container,
  Dialog,
  EmptyState,
  Flex,
  HStack,
  Heading,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { FiSearch } from "react-icons/fi"

import TutorialLessonsSection from "@/components/UDM/TutorialLessonsSection"
import type { TutorialLesson } from "@/data/tutorialLessons"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import { udmService } from "../../services/udmService"

export const Route = createFileRoute("/_layout/udmModels")({
  component: UDMModelsPage,
})

function UDMModelsPage() {
  const { t, language } = useI18n()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const attachLessonModel = useTutorialProgressStore(
    (state) => state.attachLessonModel,
  )

  const [searchInput, setSearchInput] = useState("")
  const [searchText, setSearchText] = useState("")
  const [page, setPage] = useState(1)
  const [modelToDelete, setModelToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const pageSize = 20
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced auto-search
  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      setSearchText(searchInput.trim())
      setPage(1)
    }, 300)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchInput])

  const modelsQuery = useQuery({
    queryKey: ["udm-models", searchText, page],
    queryFn: () =>
      udmService.getModels({
        skip: (page - 1) * pageSize,
        limit: pageSize,
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
      udmService.updateModel(args.modelId, {
        is_published: args.nextPublished,
      }),
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
  const totalCount = modelsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const templates = useMemo(
    () => templatesQuery.data || [],
    [templatesQuery.data],
  )
  const generalTemplates = useMemo(
    () => templates.filter((tpl) => !(tpl.tags || []).includes("tutorial")),
    [templates],
  )

  const dateLocale = language === "zh" ? "zh-CN" : "en-US"

  // Auto-correct page when current page overshoots (e.g. after deleting last item on last page)
  useEffect(() => {
    if (totalCount > 0 && models.length === 0 && page > 1) {
      setPage(Math.max(1, Math.ceil(totalCount / pageSize)))
    }
  }, [totalCount, models.length, page])

  const openTutorialLesson = async (
    lesson: TutorialLesson,
    existingModelId?: string | null,
  ) => {
    try {
      if (existingModelId) {
        navigate({
          to: "/udmModelEditor",
          search: { modelId: existingModelId, lessonKey: lesson.lessonKey },
        })
        return
      }

      const created = await createFromTemplate.mutateAsync(lesson.seedTemplateKey)
      attachLessonModel(lesson.lessonKey, created.id)
      showSuccessToast(
        t("flow.udmModels.toast.createTemplateSuccess", {
          name: created.name,
        }),
      )
      navigate({
        to: "/udmModelEditor",
        search: { modelId: created.id, lessonKey: lesson.lessonKey },
      })
    } catch {
      // The mutation already surfaces a toast.
    }
  }

  const openGeneralTemplate = async (templateKey: string) => {
    try {
      const created = await createFromTemplate.mutateAsync(templateKey)
      showSuccessToast(
        t("flow.udmModels.toast.createTemplateSuccess", {
          name: created.name,
        }),
      )
      navigate({
        to: "/udmModelEditor",
        search: { modelId: created.id },
      })
    } catch {
      // The mutation already surfaces a toast.
    }
  }

  const getLessonKeyFromModel = (tags?: string[]) =>
    (tags || []).find((tag) => /^chapter-\d+$/.test(tag))

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        {t("flow.udmModels.title")}
      </Heading>

      <TutorialLessonsSection
        onOpenLesson={openTutorialLesson}
      />

      <Flex mt={6} gap={3} wrap="wrap" align="center">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (debounceTimerRef.current)
                clearTimeout(debounceTimerRef.current)
              setSearchText(searchInput.trim())
              setPage(1)
            }
          }}
          placeholder={t("flow.udmModels.searchPlaceholder")}
          maxW="360px"
        />
        <Button
          variant="subtle"
          colorPalette="gray"
          onClick={() => {
            setSearchInput("")
            setSearchText("")
            setPage(1)
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
          <Text color="gray.500">
            {t("flow.udmModels.state.templatesLoading")}
          </Text>
        ) : generalTemplates.length === 0 ? (
          <Text color="gray.500">
            {t("flow.udmModels.state.templatesEmpty")}
          </Text>
        ) : (
          <VStack align="stretch" gap={3}>
            {generalTemplates.map((tpl) => (
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
                    {tpl.description ||
                      t("flow.udmModels.template.noDescription")}
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
                  onClick={() => {
                    void openGeneralTemplate(tpl.key)
                  }}
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
          <Text color="gray.500">
            {t("flow.udmModels.state.modelsLoading")}
          </Text>
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
          <>
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
                      <Badge
                        colorPalette={model.is_published ? "green" : "gray"}
                      >
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
                              search: {
                                modelId: model.id,
                                lessonKey: getLessonKeyFromModel(model.tags),
                              },
                            })
                          }
                        >
                          {t("flow.udmModels.actions.edit")}
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          loading={
                            duplicateModel.isPending &&
                            duplicateModel.variables === model.id
                          }
                          onClick={() => duplicateModel.mutate(model.id)}
                        >
                          {t("flow.udmModels.actions.duplicate")}
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          loading={
                            togglePublish.isPending &&
                            togglePublish.variables?.modelId === model.id
                          }
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
                          onClick={() =>
                            setModelToDelete({ id: model.id, name: model.name })
                          }
                        >
                          {t("flow.udmModels.actions.delete")}
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </>
        )}

        {totalPages > 1 && (
          <Flex mt={4} justify="center" align="center" gap={3}>
            <Button
              size="sm"
              variant="subtle"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("flow.udmModels.pagination.prev")}
            </Button>
            <Text fontSize="sm" color="fg.muted">
              {t("flow.udmModels.pagination.info", {
                current: page,
                total: totalPages,
              })}
            </Text>
            <Button
              size="sm"
              variant="subtle"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t("flow.udmModels.pagination.next")}
            </Button>
          </Flex>
        )}
      </Box>

      <Dialog.Root
        open={!!modelToDelete}
        onOpenChange={(e) => {
          if (!e.open) setModelToDelete(null)
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {t("flow.udmModels.confirm.deleteTitle")}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>
                {modelToDelete
                  ? t("flow.udmModels.confirm.deleteModel", {
                      name: modelToDelete.name,
                    })
                  : ""}
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={2}>
                <Button variant="subtle" onClick={() => setModelToDelete(null)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  colorPalette="red"
                  loading={deleteModel.isPending}
                  onClick={() => {
                    if (modelToDelete) {
                      deleteModel.mutate(modelToDelete.id, {
                        onSuccess: () => setModelToDelete(null),
                      })
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Container>
  )
}
