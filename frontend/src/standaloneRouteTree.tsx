import {
  Box,
  Container,
  Flex,
  Text,
} from "@chakra-ui/react"
import { Outlet, createRoute } from "@tanstack/react-router"

import StandaloneSidebar from "./components/Common/StandaloneSidebar"
import { useI18n } from "./i18n"
import { Route as rootRoute } from "./routes/__root"
import { Route as CalculatorsIndexImport } from "./routes/calculators/index"
import { Route as IndexImport } from "./routes/index"
import { Route as MiddayStyleImport } from "./routes/midday-style"
import { Route as OpenflowImport } from "./routes/openflow"
import { Route as LayoutAsm1Import } from "./routes/_layout/asm1"
import { Route as LayoutAsm1slimImport } from "./routes/_layout/asm1slim"
import { Route as LayoutAsm3Import } from "./routes/_layout/asm3"
import { Route as LayoutComputeJobsImport } from "./routes/_layout/compute-jobs"
import { Route as LayoutComputeLifecycleImport } from "./routes/_layout/compute-lifecycle"
import { Route as LayoutHybridImport } from "./routes/_layout/hybrid"
import { Route as LayoutMaterialbalanceImport } from "./routes/_layout/materialbalance"
import { Route as LayoutModelGovernanceImport } from "./routes/_layout/model-governance"
import { Route as LayoutOverviewImport } from "./routes/_layout/overview"
import { Route as LayoutPetersenTutorialImport } from "./routes/_layout/petersen-tutorial"
import { Route as LayoutUdmImport } from "./routes/_layout/udm"
import { Route as LayoutUdmModelEditorImport } from "./routes/_layout/udmModelEditor"
import { Route as LayoutUdmModelsImport } from "./routes/_layout/udmModels"
import { Route as UpdatesSlugImport } from "./routes/updates/$slug"
import { Route as UpdatesIndexImport } from "./routes/updates/index"

const StandaloneLayout = () => (
  <Flex h="100vh" overflow="hidden">
    <StandaloneSidebar />
    <Box flex="1" overflow="auto" p={4}>
      <Outlet />
    </Box>
  </Flex>
)

const StandaloneDashboard = () => {
  const { t } = useI18n()

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <Text fontSize="2xl" truncate maxW="sm">
          {t("dashboard.greeting", { name: "Standalone Developer" })}
        </Text>
        <Text>{t("dashboard.welcomeBack")}</Text>
      </Box>
    </Container>
  )
}

const LayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "/_layout",
  component: StandaloneLayout,
})

const IndexRoute = IndexImport.update({
  path: "/",
  getParentRoute: () => rootRoute,
} as any)

const CalculatorsIndexRoute = CalculatorsIndexImport.update({
  path: "/calculators/",
  getParentRoute: () => rootRoute,
} as any)

const MiddayStyleRoute = MiddayStyleImport.update({
  path: "/midday-style",
  getParentRoute: () => rootRoute,
} as any)

const OpenflowRoute = OpenflowImport.update({
  path: "/openflow",
  getParentRoute: () => rootRoute,
} as any)

const UpdatesIndexRoute = UpdatesIndexImport.update({
  path: "/updates/",
  getParentRoute: () => rootRoute,
} as any)

const UpdatesSlugRoute = UpdatesSlugImport.update({
  path: "/updates/$slug",
  getParentRoute: () => rootRoute,
} as any)

const LayoutAsm1Route = LayoutAsm1Import.update({
  path: "/asm1",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutAsm1slimRoute = LayoutAsm1slimImport.update({
  path: "/asm1slim",
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutAsm3Route = LayoutAsm3Import.update({
  path: "/asm3",
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

const LayoutDashboardRoute = createRoute({
  getParentRoute: () => LayoutRoute,
  path: "/dashboard",
  component: StandaloneDashboard,
})

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

const LayoutPetersenTutorialRoute = LayoutPetersenTutorialImport.update({
  path: "/petersen-tutorial",
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

const LayoutUdmModelsRoute = LayoutUdmModelsImport.update({
  path: "/udmModels",
  getParentRoute: () => LayoutRoute,
} as any)

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  LayoutRoute.addChildren([
    LayoutAsm1Route,
    LayoutAsm1slimRoute,
    LayoutAsm3Route,
    LayoutComputeJobsRoute,
    LayoutComputeLifecycleRoute,
    LayoutDashboardRoute,
    LayoutHybridRoute,
    LayoutMaterialbalanceRoute,
    LayoutModelGovernanceRoute,
    LayoutOverviewRoute,
    LayoutPetersenTutorialRoute,
    LayoutUdmRoute,
    LayoutUdmModelEditorRoute,
    LayoutUdmModelsRoute,
  ]),
  CalculatorsIndexRoute,
  MiddayStyleRoute,
  OpenflowRoute,
  UpdatesIndexRoute,
  UpdatesSlugRoute,
])
