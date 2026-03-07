import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"

import type { TutorialRecipe } from "@/data/tutorialLessons"
import { useI18n } from "@/i18n"

interface RecipeBarProps {
  recipes: TutorialRecipe[]
  onInsert: (recipe: TutorialRecipe) => void
}

export default function RecipeBar({ recipes, onInsert }: RecipeBarProps) {
  const { t } = useI18n()

  if (recipes.length === 0) return null

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <VStack align="stretch" gap={3}>
        <Heading size="xs">{t("flow.tutorial.recipeBar.title")}</Heading>
        <HStack gap={2} wrap="wrap" align="stretch">
          {recipes.map((recipe) => (
            <Button
              key={recipe.key}
              size="sm"
              variant="subtle"
              onClick={() => onInsert(recipe)}
            >
              <VStack gap={1} align="start">
                <HStack gap={2}>
                  <Text>{t(recipe.labelKey)}</Text>
                  <Badge colorPalette="blue" variant="subtle">
                    {recipe.category}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="fg.muted">
                  {t(recipe.descriptionKey)}
                </Text>
              </VStack>
            </Button>
          ))}
        </HStack>
      </VStack>
    </Box>
  )
}
