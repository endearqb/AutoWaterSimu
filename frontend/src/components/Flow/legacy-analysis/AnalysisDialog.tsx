import { CloseButton, Dialog, Portal } from "@chakra-ui/react"
import React from "react"

interface AnalysisDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "cover" | "full"
}

/**
 * 通用分析对话框组件
 * 用于展示各种分析结果
 */
const AnalysisDialog: React.FC<AnalysisDialogProps> = ({
  isOpen,
  onClose,
  title = "分析结果",
  children,
  size = "cover",
}) => {
  const portalRef = React.useRef<HTMLElement>(null!)
  React.useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  const shouldUseViewportSize = size === "cover" || size === "full"
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      size={size}
    >
      <Portal container={portalRef}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxH={shouldUseViewportSize ? undefined : "90vh"}
            overflow="hidden"
          >
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body overflow="auto" pb={6}>
              {children}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default AnalysisDialog
