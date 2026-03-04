import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react"
import React, { useState } from "react"
import { useI18n } from "../../../i18n"
import { confirmDebug } from "../../../utils/confirmDebug"

interface ConfirmDialogProps {
  isOpen: boolean
  onDismiss: () => void
  onConfirm: (
    action: "save" | "export" | "skip",
  ) => void | Promise<void>
  title: string
  message: string
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onDismiss,
  onConfirm,
  title,
  message,
}) => {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const portalRef = React.useRef<HTMLElement>(null!)
  const isConfirmingRef = React.useRef(false)
  const suppressDismissRef = React.useRef(false)
  const scope = "ConfirmDialog"

  React.useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  const handleConfirm = async (action: "save" | "export" | "skip") => {
    confirmDebug(
      scope,
      "handleConfirm-start",
      { action, isOpen, isLoading, isConfirming: isConfirmingRef.current },
      { breakpoint: true },
    )
    suppressDismissRef.current = true
    isConfirmingRef.current = true
    setIsLoading(true)
    try {
      await onConfirm(action)
      confirmDebug(scope, "handleConfirm-success", { action })
    } catch (error) {
      confirmDebug(scope, "handleConfirm-error", {
        action,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
      // 某些场景下 onOpenChange(!open) 会在确认完成后异步触发，
      // 这里延迟释放标记，避免把“确认关闭”误判成“取消关闭”。
      window.setTimeout(() => {
        isConfirmingRef.current = false
        suppressDismissRef.current = false
      }, 300)
    }
  }

  const handleDismiss = (reason: string) => {
    confirmDebug(scope, "dismiss", { reason })
    if (isConfirmingRef.current || suppressDismissRef.current || isLoading) {
      return
    }
    onDismiss()
  }

  return (
    <Dialog.Root
      open={isOpen}
      closeOnInteractOutside={false}
      onOpenChange={(e) => {
        confirmDebug(scope, "onOpenChange", {
          open: e.open,
          isConfirming: isConfirmingRef.current,
          suppressDismiss: suppressDismissRef.current,
        })
        if (!e.open && !isConfirmingRef.current && !suppressDismissRef.current) {
          confirmDebug(scope, "dismiss-via-onOpenChange")
          onDismiss()
        }
      }}
    >
      <Portal container={portalRef}>
        <Dialog.Backdrop
          data-confirm-dialog-backdrop
          onClick={(e) => {
            e.stopPropagation()
            handleDismiss("backdrop-click")
          }}
        />
        <Dialog.Positioner>
          <Dialog.Content data-confirm-dialog-content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <CloseButton
                onClick={() => {
                  handleDismiss("close-button")
                }}
              />
            </Dialog.Header>

            <Dialog.Body>
              <Text mb={4}>{message}</Text>
              <Text fontSize="sm" color="gray.600">
                {t("flow.menu.confirmPrompt")}
              </Text>
            </Dialog.Body>

            <Dialog.Footer>
              <Stack direction="row" gap={2}>
                <Button
                  variant="outline"
                  onClick={() => {
                    confirmDebug(scope, "click-skip")
                    handleConfirm("skip")
                  }}
                  disabled={isLoading}
                >
                  {t("flow.menu.skipSave")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    confirmDebug(scope, "click-export")
                    handleConfirm("export")
                  }}
                  disabled={isLoading}
                >
                  {t("flow.menu.localExport")}
                </Button>
                <Button
                  onClick={() => {
                    confirmDebug(scope, "click-save")
                    handleConfirm("save")
                  }}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {t("flow.menu.saveOnline")}
                </Button>
              </Stack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default ConfirmDialog
