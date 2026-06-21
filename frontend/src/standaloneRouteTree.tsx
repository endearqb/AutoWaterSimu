import {
  Box,
  Flex,
  HStack,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react"
import { Link, Outlet, createRoute, redirect } from "@tanstack/react-router"

import { Route as rootRoute } from "./routes/__root"
import { Route as LayoutAsm1Import } from "./routes/_layout/asm1"
import { Route as LayoutAsm1slimImport } from "./routes/_layout/asm1slim"
import { Route as LayoutComputeJobsImport } from "./routes/_layout/compute-jobs"
import { Route as LayoutComputeLifecycleImport } from "./routes/_layout/compute-lifecycle"
import { Route as LayoutHybridImport } from "./routes/_layout/hybrid"
import { Route as LayoutMaterialbalanceImport } from "./routes/_layout/materialbalance"
import { Route as LayoutModelGovernanceImport } from "./routes/_layout/model-governance"
import { Route as LayoutOverviewImport } from "./routes/_layout/overview"
import { Route as LayoutUdmImport } from "./routes/_layout/udm"
import { Route as LayoutUdmModelEditorImport } from "./routes/_layout/udmModelEditor"

const navItems = [
  { to: "/compute-jobs", label: "Compute" },
  { to: "/compute-lifecycle", label: "Evidence" },
  { to: "/materialbalance", label: "Graph" },
  { to: "/udm", label: "UDM" },
  { to: "/model-governance", label: "Models" },
] as const

const StandaloneLayout = () => (
  <Flex h="100vh" direction="column">
    <HStack
      as="nav"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={4}
      py={3}
      gap={4}
      wrap="wrap"
    >
      <Text fontWeight="semibold">AutoWaterSimu Next</Text>
      {navItems.map((item) => (
        <ChakraLink key={item.to} asChild>
          <Link to={item.to}>{item.label}</Link>
        </ChakraLink>
      ))}
    </HStack>
    <Box flex="1" overflow="auto" p={4}>
      <Outlet />
    </Box>
  </Flex>
)

const IndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/compute-jobs" })
  },
})

const LayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "/_layout",
  component: StandaloneLayout,
})

const LayoutAsm1Route = LayoutAsm1Import.update({
  path: "/asm1",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutAsm1slimRoute = LayoutAsm1slimImport.update({
  path: "/asm1slim",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutComputeJobsRoute = LayoutComputeJobsImport.update({
  path: "/compute-jobs",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutComputeLifecycleRoute = LayoutComputeLifecycleImport.update({
  path: "/compute-lifecycle",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutHybridRoute = LayoutHybridImport.update({
  path: "/hybrid",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutMaterialbalanceRoute = LayoutMaterialbalanceImport.update({
  path: "/materialbalance",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutModelGovernanceRoute = LayoutModelGovernanceImport.update({
  path: "/model-governance",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutOverviewRoute = LayoutOverviewImport.update({
  path: "/overview",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutUdmRoute = LayoutUdmImport.update({
  path: "/udm",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutUdmModelEditorRoute = LayoutUdmModelEditorImport.update({
  path: "/udmModelEditor",
  getParentRoute: () => LayoutRoute,
} as any)

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  LayoutRoute.addChildren([
    LayoutAsm1Route,
    LayoutAsm1slimRoute,
    LayoutComputeJobsRoute,
    LayoutComputeLifecycleRoute,
    LayoutHybridRoute,
    LayoutMaterialbalanceRoute,
    LayoutModelGovernanceRoute,
    LayoutOverviewRoute,
    LayoutUdmRoute,
    LayoutUdmModelEditorRoute,
  ]),
])
