import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import UDMModelEditorForm from "../../components/UDM/UDMModelEditorForm"

const searchSchema = z.object({
  modelId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/_layout/udmModelEditor")({
  component: UDMModelEditorPage,
  validateSearch: (search) => searchSchema.parse(search),
})

function UDMModelEditorPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { modelId } = Route.useSearch()

  return (
    <UDMModelEditorForm
      modelId={modelId}
      onModelIdChange={(nextModelId) =>
        navigate({
          to: "/udmModelEditor",
          search: { modelId: nextModelId },
          replace: true,
        })
      }
      onBack={() => navigate({ to: "/udmModels" })}
      onGeneratedFlowchart={() => navigate({ to: "/udm" })}
    />
  )
}
