import { Box, Text } from "@chakra-ui/react"

import { UDM_V2_NOT_EXECUTABLE_MESSAGE } from "../services/udmV2ComputeService"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2StatusBar() {
  const runtimeStatus = useUdmV2FlowStore((state) => state.runtimeStatus)
  if (runtimeStatus !== "runtime_pending" && runtimeStatus !== "failed") {
    return null
  }
  return (
    <Box
      position="absolute"
      zIndex={7}
      top={{ base: "64px", md: "12px" }}
      right={{ base: "12px", md: "24px" }}
      maxW="420px"
      px={3}
      py={2}
      bg={runtimeStatus === "failed" ? "red.50" : "yellow.50"}
      color={runtimeStatus === "failed" ? "red.900" : "yellow.900"}
      borderWidth="1px"
      borderColor={runtimeStatus === "failed" ? "red.200" : "yellow.200"}
      borderRadius="6px"
      boxShadow="sm"
    >
      <Text fontSize="sm">
        {runtimeStatus === "runtime_pending"
          ? UDM_V2_NOT_EXECUTABLE_MESSAGE
          : "UDM Network v2 operation failed."}
      </Text>
    </Box>
  )
}
