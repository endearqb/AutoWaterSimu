import { Box, HStack, IconButton, Text } from "@chakra-ui/react"
import { Pin, PinOff, X } from "lucide-react"
import type { ReactNode } from "react"

import { useUdmV2Messages } from "../i18n"

export function NetworkV2InspectorDrawer({
  children,
  isOpen,
  onClose,
  onPinChange,
  pinned,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  onPinChange: (pinned: boolean) => void
  pinned: boolean
}) {
  const text = useUdmV2Messages()
  return (
    <Box
      position="absolute"
      top={0}
      right={0}
      bottom={0}
      zIndex={8}
      width={{ base: "min(92vw, 360px)", md: "360px" }}
      bg="rgba(255,255,255,.94)"
      backdropFilter="blur(12px)"
      borderLeftWidth="1px"
      borderColor="border"
      boxShadow="-12px 0 30px rgba(15,23,42,.12)"
      transform={isOpen ? "translateX(0)" : "translateX(100%)"}
      transition="transform .18s ease"
      pointerEvents={isOpen ? "auto" : "none"}
      overflow="hidden"
      display="flex"
      flexDirection="column"
      aria-hidden={!isOpen}
      data-testid="udm-v2-inspector-drawer"
      css={{
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <HStack minH="44px" px={3} borderBottomWidth="1px">
        <Text fontWeight="700" flex="1">
          {text.inspector}
        </Text>
        <IconButton
          aria-label={pinned ? text.unpin : text.pin}
          title={pinned ? text.unpin : text.pin}
          size="xs"
          variant="ghost"
          onClick={() => onPinChange(!pinned)}
        >
          {pinned ? <PinOff size={15} /> : <Pin size={15} />}
        </IconButton>
        <IconButton
          aria-label={text.close}
          title={text.close}
          size="xs"
          variant="ghost"
          onClick={onClose}
        >
          <X size={15} />
        </IconButton>
      </HStack>
      <Box flex="1" minH={0} overflow="auto">
        {children}
      </Box>
    </Box>
  )
}
