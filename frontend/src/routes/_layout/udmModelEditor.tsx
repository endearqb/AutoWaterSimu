import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import UDMModelEditorForm from "../../components/UDM/UDMModelEditorForm"
import { useI18n } from "@/i18n"

const searchSchema = z.object({
  modelId: z.string().optional().catch(undefined),
  lessonKey: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/_layout/udmModelEditor")({
  component: UDMModelEditorPage,
  validateSearch: (search) => searchSchema.parse(search),
})

function UDMModelEditorPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { modelId, lessonKey } = Route.useSearch()
  const { t } = useI18n()

  return (
    <UDMModelEditorForm
      modelId={modelId}
      lessonKey={lessonKey}
      headingText={lessonKey ? t("nav.petersenTutorial") : undefined}
      onModelIdChange={(nextModelId) =>
        navigate({
          to: "/udmModelEditor",
          search: { modelId: nextModelId, lessonKey },
          replace: true,
        })
      }
      onBack={() => navigate({ to: "/udmModels" })}
      onGeneratedFlowchart={(payload) =>
        navigate({
          to: "/udm",
          search: lessonKey
            ? { lessonKey, flowchartId: payload.flowchart.id }
            : { flowchartId: payload.flowchart.id },
        })
      }
    />
  )
}
