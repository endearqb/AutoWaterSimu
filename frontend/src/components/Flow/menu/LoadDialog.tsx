import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"

interface FlowChart {
  id: string
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

interface LoadDialogProps {
  isOpen: boolean
  onClose: () => void
  flowCharts: FlowChart[]
  isLoading: boolean
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

const LoadDialog: React.FC<LoadDialogProps> = ({
  isOpen,
  onClose,
  flowCharts,
  isLoading,
  onLoad,
  onDelete,
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
          <Dialog.Content maxW="600px">
            <Dialog.Header>
              <Dialog.Title>加载流程图</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={3} align="stretch" maxH="400px" overflowY="auto">
                {flowCharts.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={8}>
                    暂无保存的流程图
                  </Text>
                ) : (
                  flowCharts.map((flowChart) => (
                    <Box
                      key={flowChart.id}
                      p={4}
                      border="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      _hover={{ bg: "gray.50" }}
                    >
                      <HStack justify="space-between" align="start">
                        <VStack align="start" gap={1} flex={1}>
                          <Text fontWeight="medium">{flowChart.name}</Text>
                          {flowChart.description && (
                            <Text fontSize="sm" color="gray.600">
                              {flowChart.description}
                            </Text>
                          )}
                          <Text fontSize="xs" color="gray.500">
                            创建时间:{" "}
                            {new Date(flowChart.created_at).toLocaleString()}
                          </Text>
                          {flowChart.updated_at !== flowChart.created_at && (
                            <Text fontSize="xs" color="gray.500">
                              更新时间:{" "}
                              {new Date(flowChart.updated_at).toLocaleString()}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={2}>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={() => onLoad(flowChart.id)}
                            loading={isLoading}
                          >
                            加载
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={() => onDelete(flowChart.id)}
                            loading={isLoading}
                          >
                            删除
                          </Button>
                        </HStack>
                      </HStack>
                    </Box>
                  ))
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>{/* 可以在这里添加其他按钮 */}</Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default LoadDialog
