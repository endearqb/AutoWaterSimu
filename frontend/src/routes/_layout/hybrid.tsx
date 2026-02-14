import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Input,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import HybridUDMSetupDialog from "../../components/UDM/HybridUDMSetupDialog"
import { udmService } from "../../services/udmService"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import type { HybridUDMConfig } from "../../types/hybridUdm"
import {
  buildCanonicalParametersFromSelectedModels,
  toHybridConfigFromUnknown,
} from "../../utils/hybridUdm"

export const Route = createFileRoute("/_layout/hybrid")({
  component: HybridConfigPage,
})

function HybridConfigPage() {
  const { t } = useI18n()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const applyHybridSetup = useUDMFlowStore((state) => state.applyHybridSetup)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [configName, setConfigName] = useState("")
  const [configDescription, setConfigDescription] = useState("")
  const [draftConfig, setDraftConfig] = useState<HybridUDMConfig | null>(null)

  const configsQuery = useQuery({
    queryKey: ["udm-hybrid-configs"],
    queryFn: () => udmService.getHybridConfigs(0, 500),
  })

  const configs = useMemo(() => configsQuery.data?.data || [], [configsQuery.data])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!draftConfig) {
        throw new Error(t("flow.hybridConfigs.toasts.draftMissing"))
      }
      const name = configName.trim()
      if (!name) {
        throw new Error(t("flow.hybridConfigs.toasts.nameRequired"))
      }
      return await udmService.createHybridConfig({
        name,
        description: configDescription.trim() || null,
        hybrid_config: draftConfig,
      })
    },
    onSuccess: (created) => {
      setEditingId(created.id)
      showSuccessToast(t("flow.hybridConfigs.toasts.createSuccess"))
      queryClient.invalidateQueries({ queryKey: ["udm-hybrid-configs"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.hybridConfigs.toasts.createFailed"),
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) {
        throw new Error(t("flow.hybridConfigs.toasts.selectConfigFirst"))
      }
      if (!draftConfig) {
        throw new Error(t("flow.hybridConfigs.toasts.draftMissing"))
      }
      const name = configName.trim()
      if (!name) {
        throw new Error(t("flow.hybridConfigs.toasts.nameRequired"))
      }
      return await udmService.updateHybridConfig(editingId, {
        name,
        description: configDescription.trim() || null,
        hybrid_config: draftConfig,
      })
    },
    onSuccess: () => {
      showSuccessToast(t("flow.hybridConfigs.toasts.updateSuccess"))
      queryClient.invalidateQueries({ queryKey: ["udm-hybrid-configs"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.hybridConfigs.toasts.updateFailed"),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await udmService.deleteHybridConfig(id),
    onSuccess: (_, id) => {
      if (editingId === id) {
        setEditingId(null)
        setConfigName("")
        setConfigDescription("")
        setDraftConfig(null)
      }
      showSuccessToast(t("flow.hybridConfigs.toasts.deleteSuccess"))
      queryClient.invalidateQueries({ queryKey: ["udm-hybrid-configs"] })
    },
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.hybridConfigs.toasts.deleteFailed"),
      )
    },
  })

  const loadConfigForEdit = (id: string) => {
    const target = configs.find((item) => item.id === id)
    if (!target) {
      showErrorToast(t("flow.hybridConfigs.toasts.configNotFound"))
      return
    }
    const parsed = toHybridConfigFromUnknown(target.hybrid_config)
    if (!parsed) {
      showErrorToast(t("flow.hybridConfigs.toasts.savedConfigInvalid"))
      return
    }
    setEditingId(target.id)
    setConfigName(target.name)
    setConfigDescription(target.description || "")
    setDraftConfig(parsed)
    setIsDialogOpen(true)
  }

  const applyConfigToCurrentFlow = (
    config: HybridUDMConfig,
    successToastKey = "flow.hybridConfigs.toasts.applyToFlowSuccess",
  ) => {
    const canonicalParameters = buildCanonicalParametersFromSelectedModels(
      config.selected_models || [],
    )
    applyHybridSetup(config, canonicalParameters)
    showSuccessToast(t(successToastKey))
    navigate({ to: "/udm" })
  }

  return (
    <Container maxW="full" pb={8}>
      <Heading size="lg" pt={12}>
        {t("flow.hybridConfigs.title")}
      </Heading>
      <Text color="gray.600" mt={2}>
        {t("flow.hybridConfigs.description")}
      </Text>

      <VStack align="stretch" mt={6} gap={4}>
        <HStack gap={3} align="flex-end" wrap="wrap">
          <Box flex="1" minW="280px">
            <Text fontSize="sm" mb={1}>
              {t("flow.hybridConfigs.fields.name")}
            </Text>
            <Input
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder={t("flow.hybridConfigs.fields.namePlaceholder")}
            />
          </Box>
          <Button
            variant="subtle"
            onClick={() => {
              setEditingId(null)
              setConfigName("")
              setConfigDescription("")
              setDraftConfig(null)
              setIsDialogOpen(true)
            }}
          >
            {t("flow.hybridConfigs.actions.newConfig")}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            {t("flow.hybridConfigs.actions.configure")}
          </Button>
          <Button
            colorPalette="blue"
            onClick={() => {
              if (editingId) {
                updateMutation.mutate()
              } else {
                createMutation.mutate()
              }
            }}
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!draftConfig}
          >
            {editingId
              ? t("flow.hybridConfigs.actions.saveChanges")
              : t("flow.hybridConfigs.actions.saveNew")}
          </Button>
          {draftConfig && (
            <Button
              variant="outline"
              onClick={() => applyConfigToCurrentFlow(draftConfig)}
            >
              {t("flow.hybridConfigs.actions.applyToFlow")}
            </Button>
          )}
        </HStack>

        <Box>
          <Text fontSize="sm" mb={1}>
            {t("flow.hybridConfigs.fields.description")}
          </Text>
          <Textarea
            value={configDescription}
            onChange={(e) => setConfigDescription(e.target.value)}
            placeholder={t("flow.hybridConfigs.fields.descriptionPlaceholder")}
            minH="80px"
          />
        </Box>

        <Text fontSize="sm" color={draftConfig ? "green.600" : "gray.500"}>
          {draftConfig
            ? t("flow.hybridConfigs.state.draftReady")
            : t("flow.hybridConfigs.state.draftEmpty")}
        </Text>
      </VStack>

      <Box mt={8}>
        <Heading size="md" mb={3}>
          {t("flow.hybridConfigs.savedListTitle")}
        </Heading>
        {configsQuery.isLoading ? (
          <Text color="gray.500">{t("flow.hybridConfigs.state.loading")}</Text>
        ) : configs.length === 0 ? (
          <Text color="gray.500">{t("flow.hybridConfigs.state.empty")}</Text>
        ) : (
          <Table.Root size={{ base: "sm", md: "md" }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>
                  {t("flow.hybridConfigs.table.name")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.hybridConfigs.table.updatedAt")}
                </Table.ColumnHeader>
                <Table.ColumnHeader>
                  {t("flow.hybridConfigs.table.actions")}
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {configs.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>{item.name}</Table.Cell>
                  <Table.Cell>{new Date(item.updated_at).toLocaleString()}</Table.Cell>
                  <Table.Cell>
                    <HStack gap={2} wrap="wrap">
                      <Button size="xs" onClick={() => loadConfigForEdit(item.id)}>
                        {t("flow.hybridConfigs.actions.edit")}
                      </Button>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => {
                          const parsed = toHybridConfigFromUnknown(item.hybrid_config)
                          if (!parsed) {
                            showErrorToast(
                              t("flow.hybridConfigs.toasts.savedConfigInvalid"),
                            )
                            return
                          }
                          applyConfigToCurrentFlow(parsed)
                        }}
                      >
                        {t("flow.hybridConfigs.actions.applyToFlow")}
                      </Button>
                      <Button
                        size="xs"
                        colorPalette="red"
                        variant="subtle"
                        loading={
                          deleteMutation.isPending &&
                          deleteMutation.variables === item.id
                        }
                        onClick={() => {
                          const ok = window.confirm(
                            t("flow.hybridConfigs.confirm.delete", {
                              name: item.name,
                            }),
                          )
                          if (ok) {
                            deleteMutation.mutate(item.id)
                          }
                        }}
                      >
                        {t("flow.hybridConfigs.actions.delete")}
                      </Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      <HybridUDMSetupDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialConfig={draftConfig}
        onApply={(config) => {
          setDraftConfig(config)
          showSuccessToast(t("flow.hybridConfigs.toasts.draftUpdated"))
          setIsDialogOpen(false)
        }}
        applyButtonLabel={t("flow.hybridConfigs.actions.useAsDraft")}
        showSavedConfigSelector={false}
      />
    </Container>
  )
}

export default HybridConfigPage
