import type {
  PetersonMatrixImportError,
  PetersonMatrixImportPreview,
} from "@/utils/petersonMatrixWorkbook"
import {
  Badge,
  Box,
  Button,
  Dialog,
  HStack,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"

interface PetersonMatrixImportDialogProps {
  isOpen: boolean
  preview: PetersonMatrixImportPreview | null
  addedComponentNames: string[]
  removedComponentNames: string[]
  addedParameterNames: string[]
  removedParameterNames: string[]
  addedProcessNames: string[]
  removedProcessNames: string[]
  onClose: () => void
  onConfirm: () => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const IssueList = ({
  title,
  items,
  colorPalette,
}: {
  title: string
  items: PetersonMatrixImportError[]
  colorPalette: "red" | "orange"
}) => {
  if (items.length === 0) {
    return null
  }

  return (
    <VStack align="stretch" gap={3}>
      <HStack gap={2}>
        <Text fontWeight="semibold">{title}</Text>
        <Badge colorPalette={colorPalette} variant="subtle">
          {items.length}
        </Badge>
      </HStack>
      <VStack align="stretch" gap={2}>
        {items.map((item, index) => (
          <Box
            key={`${item.code}-${item.rowNumber ?? "na"}-${index}`}
            borderWidth="1px"
            borderRadius="md"
            borderColor={colorPalette === "red" ? "red.200" : "orange.200"}
            bg={colorPalette === "red" ? "red.50" : "orange.50"}
            p={3}
          >
            <Text fontSize="sm">{item.message}</Text>
          </Box>
        ))}
      </VStack>
    </VStack>
  )
}

export default function PetersonMatrixImportDialog({
  isOpen,
  preview,
  addedComponentNames,
  removedComponentNames,
  addedParameterNames,
  removedParameterNames,
  addedProcessNames,
  removedProcessNames,
  onClose,
  onConfirm,
  t,
}: PetersonMatrixImportDialogProps) {
  const errors = preview?.errors ?? []
  const warnings = preview?.warnings ?? []
  const canConfirm = !!preview && errors.length === 0

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="720px">
          <Dialog.Header>
            <VStack align="stretch" gap={2}>
              <Dialog.Title>
                {t("flow.udmEditor.importExport.importDialog.title")}
              </Dialog.Title>
              <Dialog.Description>
                {t("flow.udmEditor.importExport.importDialog.description")}
              </Dialog.Description>
            </VStack>
          </Dialog.Header>

          <Dialog.Body>
            <VStack align="stretch" gap={4}>
              <HStack gap={2} wrap="wrap">
                <Badge colorPalette="blue" variant="subtle">
                  {t("flow.udmEditor.importExport.importDialog.stats.rows", {
                    count: preview?.rows.length ?? 0,
                  })}
                </Badge>
                <Badge colorPalette="green" variant="subtle">
                  {t("flow.udmEditor.importExport.importDialog.stats.addedComponents", {
                    count: addedComponentNames.length,
                  })}
                </Badge>
                <Badge colorPalette="gray" variant="subtle">
                  {t("flow.udmEditor.importExport.importDialog.stats.removedComponents", {
                    count: removedComponentNames.length,
                  })}
                </Badge>
                <Badge colorPalette="green" variant="subtle">
                  {t("flow.udmEditor.importExport.importDialog.stats.added", {
                    count: addedProcessNames.length,
                  })}
                </Badge>
                <Badge colorPalette="gray" variant="subtle">
                  {t("flow.udmEditor.importExport.importDialog.stats.removed", {
                    count: removedProcessNames.length,
                  })}
                </Badge>
                <Badge
                  colorPalette={errors.length > 0 ? "red" : "orange"}
                  variant="subtle"
                >
                  {t("flow.udmEditor.importExport.importDialog.stats.issues", {
                    count: errors.length + warnings.length,
                  })}
                </Badge>
                <Badge colorPalette="green" variant="subtle">
                  {t(
                    "flow.udmEditor.importExport.importDialog.stats.addedParameters",
                    {
                      count: addedParameterNames.length,
                    },
                  )}
                </Badge>
                <Badge colorPalette="gray" variant="subtle">
                  {t(
                    "flow.udmEditor.importExport.importDialog.stats.removedParameters",
                    {
                      count: removedParameterNames.length,
                    },
                  )}
                </Badge>
              </HStack>

              {addedComponentNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t(
                      "flow.udmEditor.importExport.importDialog.addedComponentsTitle",
                    )}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {addedComponentNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {removedComponentNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t(
                      "flow.udmEditor.importExport.importDialog.removedComponentsTitle",
                    )}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {removedComponentNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {addedParameterNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t(
                      "flow.udmEditor.importExport.importDialog.addedParametersTitle",
                    )}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {addedParameterNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {removedParameterNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t(
                      "flow.udmEditor.importExport.importDialog.removedParametersTitle",
                    )}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {removedParameterNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {addedProcessNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t("flow.udmEditor.importExport.importDialog.addedTitle")}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {addedProcessNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {removedProcessNames.length > 0 ? (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    {t("flow.udmEditor.importExport.importDialog.removedTitle")}
                  </Text>
                  <Text fontSize="sm" color="fg.muted">
                    {removedProcessNames.join(", ")}
                  </Text>
                </Box>
              ) : null}

              {(addedComponentNames.length > 0 ||
                removedComponentNames.length > 0 ||
                addedParameterNames.length > 0 ||
                removedParameterNames.length > 0 ||
                addedProcessNames.length > 0 ||
                removedProcessNames.length > 0) &&
              (errors.length > 0 || warnings.length > 0) ? (
                <Separator />
              ) : null}

              <IssueList
                title={t("flow.udmEditor.importExport.importDialog.errorsTitle")}
                items={errors}
                colorPalette="red"
              />
              <IssueList
                title={t("flow.udmEditor.importExport.importDialog.warningsTitle")}
                items={warnings}
                colorPalette="orange"
              />

              {preview && errors.length === 0 ? (
                <Box borderWidth="1px" borderRadius="md" p={3} bg="bg.muted">
                  <Text fontSize="sm">
                    {t(
                      "flow.udmEditor.importExport.importDialog.confirmationHint",
                    )}
                  </Text>
                </Box>
              ) : null}
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="subtle" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button onClick={onConfirm} disabled={!canConfirm}>
                {t("flow.udmEditor.importExport.importDialog.confirm")}
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
