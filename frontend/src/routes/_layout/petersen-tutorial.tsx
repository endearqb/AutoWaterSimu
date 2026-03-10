import { Container, Heading } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import TutorialLessonsSection from "@/components/UDM/TutorialLessonsSection"
import type { TutorialLesson } from "@/data/tutorialLessons"
import useCustomToast from "@/hooks/useCustomToast"
import { useI18n } from "@/i18n"
import { useTutorialProgressStore } from "@/stores/tutorialProgressStore"
import { resolveTutorialModelDisplayName } from "@/utils/udmTutorialLocalization"
import { udmService } from "../../services/udmService"

export const Route = createFileRoute("/_layout/petersen-tutorial")({
  component: PetersenTutorialPage,
})

function PetersenTutorialPage() {
  const { t } = useI18n()
  const navigate = useNavigate({ from: Route.fullPath })
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const attachLessonModel = useTutorialProgressStore(
    (state) => state.attachLessonModel,
  )

  const createFromTemplate = useMutation({
    mutationFn: async (templateKey: string) =>
      udmService.createModelFromTemplate({ template_key: templateKey }),
    onError: (error) => {
      showErrorToast(
        error instanceof Error
          ? error.message
          : t("flow.udmModels.toast.createTemplateFailed"),
      )
    },
  })

  const openTutorialLesson = async (
    lesson: TutorialLesson,
    existingModelId?: string | null,
  ) => {
    try {
      if (existingModelId) {
        navigate({
          to: "/udmModelEditor",
          search: { modelId: existingModelId, lessonKey: lesson.lessonKey },
        })
        return
      }

      const created = await createFromTemplate.mutateAsync(
        lesson.seedTemplateKey,
      )
      attachLessonModel(lesson.lessonKey, created.id)
      showSuccessToast(
        t("flow.udmModels.toast.createTemplateSuccess", {
          name: resolveTutorialModelDisplayName(
            t,
            lesson.lessonKey,
            created.name,
          ),
        }),
      )
      navigate({
        to: "/udmModelEditor",
        search: { modelId: created.id, lessonKey: lesson.lessonKey },
      })
    } catch {
      // The mutation already surfaces a toast.
    }
  }

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        {t("nav.petersenTutorial")}
      </Heading>
      <TutorialLessonsSection onOpenLesson={openTutorialLesson} />
    </Container>
  )
}
