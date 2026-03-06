import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { MenuContent, MenuRoot, MenuTrigger } from "../ui/menu"

import type { ItemPublic } from "@/client"
import { useI18n } from "@/i18n"
import DeleteItem from "../Items/DeleteItem"
import EditItem from "../Items/EditItem"

interface ItemActionsMenuProps {
  item: ItemPublic
}

export const ItemActionsMenu = ({ item }: ItemActionsMenuProps) => {
  const { t } = useI18n()
  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton
          variant="ghost"
          color="inherit"
          aria-label={t("flow.menu.actionsAriaLabel")}
        >
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditItem item={item} />
        <DeleteItem id={item.id} />
      </MenuContent>
    </MenuRoot>
  )
}
