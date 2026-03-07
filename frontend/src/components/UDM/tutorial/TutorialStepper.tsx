import { Button, HStack } from "@chakra-ui/react"

import { TUTORIAL_STEP_ORDER, type TutorialStep } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface TutorialStepperProps {
  currentStep: TutorialStep
  maxStep: TutorialStep
  onStepChange: (step: TutorialStep) => void
}

export default function TutorialStepper({
  currentStep,
  maxStep,
  onStepChange,
}: TutorialStepperProps) {
  const { t } = useI18n()

  return (
    <HStack gap={2} wrap="wrap">
      {TUTORIAL_STEP_ORDER.map((step) => (
        <Button
          key={step}
          size="sm"
          variant={step === currentStep ? "solid" : "subtle"}
          colorPalette={step === currentStep ? "blue" : "gray"}
          disabled={step > maxStep}
          onClick={() => onStepChange(step)}
        >
          {t("flow.tutorial.stepLabel", { step })}
        </Button>
      ))}
    </HStack>
  )
}
