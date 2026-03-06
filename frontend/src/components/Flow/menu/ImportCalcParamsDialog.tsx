import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react"
import React, { useRef } from "react"
import { useI18n } from "../../../i18n"

interface ImportCalcParamsDialogProps {
  isOpen: boolean
  onChoice: (restoreParams: boolean) => void
}

const ImportCalcParamsDialog: React.FC<ImportCalcParamsDialogProps> = ({
  isOpen,
  onChoice,
}) => {
  const { t } = useI18n()
  const portalRef = useRef<HTMLElement>(null!)

  React.useEffect(() => {
    const el = document.querySelector("[data-flow-theme-scope]")
    if (el instanceof HTMLElement) {
      portalRef.current = el
    }
  }, [])

  return (
    <Dialog.Root
      open={isOpen}
      closeOnInteractOutside={false}
      onOpenChange={(e) => {
        if (!e.open) {
          onChoice(false)
        }
      }}
    >
      <Portal container={portalRef}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {t("flow.menu.importCalcParamsTitle")}
              </Dialog.Title>
              <CloseButton onClick={() => onChoice(false)} />
            </Dialog.Header>

            <Dialog.Body>
              <Text>{t("flow.menu.importCalcParamsMessage")}</Text>
            </Dialog.Body>

            <Dialog.Footer>
              <Stack direction="row" gap={2}>
                <Button variant="outline" onClick={() => onChoice(false)}>
                  {t("flow.menu.keepCurrentParams")}
                </Button>
                <Button colorPalette="blue" onClick={() => onChoice(true)}>
                  {t("flow.menu.useFileParams")}
                </Button>
              </Stack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default ImportCalcParamsDialog
