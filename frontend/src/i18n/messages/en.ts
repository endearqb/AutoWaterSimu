import type { I18nMessages } from "../types"
import { commonMessages } from "./en/common"
import { flowCoreMessages } from "./en/flow-core"
import { flowModelsMessages } from "./en/flow-models"
import { flowSimulationMessages } from "./en/flow-simulation"
import { flowTutorialMessages } from "./en/flow-tutorial"
import { pagesMessages } from "./en/pages"

export const enMessages: I18nMessages = {
  ...commonMessages,
  ...pagesMessages,
  flow: {
    ...flowCoreMessages,
    ...flowSimulationMessages,
    ...flowModelsMessages,
    ...flowTutorialMessages,
  },
}
