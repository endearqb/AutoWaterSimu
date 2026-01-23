import { Box, Tabs, Text } from "@chakra-ui/react"
import AORCalculator from "../calculators/AORCalculator"
import { DWACalculator } from "../calculators/DWACalculator"
import { LSICalculator } from "../calculators/LSICalculator"
import StandardAO from "../calculators/StandardAO"

export function CalculatorTabs() {
  return (
    <Box>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} mb={2}>
        可在节点内直接试算（内容可滚动）。
      </Text>
      <Tabs.Root defaultValue="lsi" variant="enclosed" className="nodrag">
        <Tabs.List flexWrap="wrap">
          <Tabs.Trigger value="lsi">LSI</Tabs.Trigger>
          <Tabs.Trigger value="standardAO">AO设计</Tabs.Trigger>
          <Tabs.Trigger value="aor">AOR</Tabs.Trigger>
          <Tabs.Trigger value="dwa">DWA A/O</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="lsi">
          <Box maxH="460px" overflowY="auto" pt={2}>
            <LSICalculator />
          </Box>
        </Tabs.Content>
        <Tabs.Content value="standardAO">
          <Box maxH="460px" overflowY="auto" pt={2}>
            <StandardAO />
          </Box>
        </Tabs.Content>
        <Tabs.Content value="aor">
          <Box maxH="460px" overflowY="auto" pt={2}>
            <AORCalculator />
          </Box>
        </Tabs.Content>
        <Tabs.Content value="dwa">
          <Box maxH="460px" overflowY="auto" pt={2}>
            <DWACalculator />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

