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
                {currentFlowChartId ? "更新流程图" : "保存流程图"}
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text mb={2} fontSize="sm" fontWeight="medium">
                    流程图名称 *
                  </Text>
                  <Input
                    placeholder="请输入流程图名称"
                    value={flowChartName}
                    onChange={(e) => onFlowChartNameChange(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text mb={2} fontSize="sm" fontWeight="medium">
                    描述
                  </Text>
                  <Input
                    placeholder="请输入流程图描述（可选）"
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
                  另存为
                </Button>
              )}
              <Button colorScheme="blue" onClick={onSave} loading={isLoading}>
                {currentFlowChartId ? "更新" : "保存"}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default SaveDialog
