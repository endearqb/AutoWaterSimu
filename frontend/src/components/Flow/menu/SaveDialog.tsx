import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import { useI18n } from "../../../i18n"

interface SaveDialogProps {
  isOpen: boolean
  onClose: () => void
  currentFlowChartId: string | null
  flowChartName: string
  flowChartDescription: string
  isLoading: boolean
  onFlowChartNameChange: (name: string) => void
  onFlowChartDescriptionChange: (description: string) => void
  onSave: () => void
  onSaveAs: () => void
}

const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  currentFlowChartId,
  flowChartName,
  flowChartDescription,
  isLoading,
  onFlowChartNameChange,
  onFlowChartDescriptionChange,
  onSave,
  onSaveAs,
}) => {
  const { t } = useI18n()
  const portalRef = React.useRef<HTMLElement>(null!)
  React.useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal container={portalRef}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {currentFlowChartId
                  ? t("flow.menu.updateFlowchartTitle")
                  : t("flow.menu.saveFlowchartTitle")}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text mb={2} fontSize="sm" fontWeight="medium">
                    {t("flow.menu.flowchartName")} *
                  </Text>
                  <Input
                    placeholder={t("flow.menu.flowchartNamePlaceholder")}
                    value={flowChartName}
                    onChange={(e) => onFlowChartNameChange(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text mb={2} fontSize="sm" fontWeight="medium">
                    {t("flow.menu.description")}
                  </Text>
                  <Input
                    placeholder={t("flow.menu.descriptionPlaceholder")}
                    value={flowChartDescription}
                    onChange={(e) =>
                      onFlowChartDescriptionChange(e.target.value)
                    }
                  />
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              {currentFlowChartId && (
                <Button
                  variant="outline"
                  colorScheme="green"
                  onClick={onSaveAs}
                  loading={isLoading}
                >
                  {t("flow.menu.saveAs")}
                </Button>
              )}
              <Button colorScheme="blue" onClick={onSave} loading={isLoading}>
                {currentFlowChartId ? t("common.update") : t("common.save")}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default SaveDialog
