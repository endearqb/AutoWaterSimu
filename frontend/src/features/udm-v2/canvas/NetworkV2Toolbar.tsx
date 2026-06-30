import { Button, HStack } from "@chakra-ui/react"
import { FilePlus, Save, ShieldCheck } from "lucide-react"

import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2Toolbar() {
  const newGraph = useUdmV2FlowStore((state) => state.newGraph)

  return (
    <HStack gap={2}>
      <Button size="sm" variant="outline" onClick={newGraph}>
        <FilePlus size={16} />
        New
      </Button>
      <Button size="sm" variant="outline" disabled>
        <Save size={16} />
        Save
      </Button>
      <Button size="sm" variant="solid" colorPalette="blue" disabled>
        <ShieldCheck size={16} />
        Validate
      </Button>
    </HStack>
  )
}
