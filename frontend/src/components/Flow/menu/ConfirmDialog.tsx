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

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (action: "save" | "export" | "skip") => void
  title: string
  message: string
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  const { t } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const portalRef = React.useRef<HTMLElement>(null!)

  React.useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  const handleConfirm = async (action: "save" | "export" | "skip") => {
    setIsLoading(true)
    try {
      await onConfirm(action)
    } finally {
      setIsLoading(false)
      onClose()
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal container={portalRef}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton />
              </Dialog.CloseTrigger>
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
                  onClick={() => handleConfirm("skip")}
                  disabled={isLoading}
                >
                  {t("flow.menu.skipSave")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleConfirm("export")}
                  disabled={isLoading}
                >
                  {t("flow.menu.localExport")}
                </Button>
                <Button
                  onClick={() => handleConfirm("save")}
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
