import type { I18nMessages } from "../types"
import { commonMessages } from "./zh/common"
import { flowCoreMessages } from "./zh/flow-core"
import { flowModelsMessages } from "./zh/flow-models"
import { flowSimulationMessages } from "./zh/flow-simulation"
import { flowTutorialMessages } from "./zh/flow-tutorial"
import { pagesMessages } from "./zh/pages"

export const zhMessages: I18nMessages = {
  ...commonMessages,
  ...pagesMessages,
  flow: {
    ...flowCoreMessages,
    ...flowSimulationMessages,
    ...flowModelsMessages,
    ...flowTutorialMessages,
  },
}
