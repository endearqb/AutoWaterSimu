import { Badge, Box, Flex, Heading, Text, VStack } from "@chakra-ui/react"

import { TUTORIAL_OVERVIEW } from "@/data/tutorialOverview"
import { useI18n } from "@/i18n"
import { resolveLocalizedText } from "@/data/tutorialContent"

const renderBulletList = (items: string[]) => (
  <VStack align="stretch" gap={2}>
    {items.map((item) => (
      <Text key={item} fontSize="sm" color="fg.muted">
        • {item}
      </Text>
    ))}
  </VStack>
)

export default function TutorialOverviewPanel() {
  const { language, t } = useI18n()

  return (
    <VStack align="stretch" gap={6} mt={8}>
      <Box borderWidth="1px" borderRadius="xl" p={6}>
        <Text fontSize="xs" color="fg.muted" mb={2}>
          {resolveLocalizedText(language, TUTORIAL_OVERVIEW.heroTitle)}
        </Text>
        <Heading size="md" mb={3}>
          {t("nav.petersenTutorial")}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          {resolveLocalizedText(language, TUTORIAL_OVERVIEW.heroSummary)}
        </Text>
      </Box>

      <Flex gap={4} wrap="wrap" align="stretch">
        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(language, TUTORIAL_OVERVIEW.audience.title)}
          </Heading>
          {renderBulletList(
            TUTORIAL_OVERVIEW.audience.items.map((item) =>
              resolveLocalizedText(language, item),
            ),
          )}
        </Box>

        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(language, TUTORIAL_OVERVIEW.benefits.title)}
          </Heading>
          {renderBulletList(
            TUTORIAL_OVERVIEW.benefits.items.map((item) =>
              resolveLocalizedText(language, item),
            ),
          )}
        </Box>
      </Flex>

      <Box borderWidth="1px" borderRadius="lg" p={4}>
        <Heading size="sm" mb={3}>
          {resolveLocalizedText(language, TUTORIAL_OVERVIEW.routeMapTitle)}
        </Heading>
        <VStack align="stretch" gap={3}>
          {TUTORIAL_OVERVIEW.routeMap.map((entry) => (
            <Box key={entry.route} borderWidth="1px" borderRadius="md" p={3}>
              <Text fontSize="sm" fontWeight="semibold">
                {resolveLocalizedText(language, entry.title)}
              </Text>
              <Text
                fontSize="xs"
                color="fg.muted"
                fontFamily="mono"
                mt={1}
                wordBreak="break-all"
              >
                {entry.route}
              </Text>
              <Text fontSize="sm" color="fg.muted" mt={2}>
                {resolveLocalizedText(language, entry.description)}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>

      <Flex gap={4} wrap="wrap" align="stretch">
        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(
              language,
              TUTORIAL_OVERVIEW.currentCapabilities.title,
            )}
          </Heading>
          {renderBulletList(
            TUTORIAL_OVERVIEW.currentCapabilities.items.map((item) =>
              resolveLocalizedText(language, item),
            ),
          )}
        </Box>

        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(
              language,
              TUTORIAL_OVERVIEW.currentBoundaries.title,
            )}
          </Heading>
          {renderBulletList(
            TUTORIAL_OVERVIEW.currentBoundaries.items.map((item) =>
              resolveLocalizedText(language, item),
            ),
          )}
        </Box>
      </Flex>

      <Flex gap={4} wrap="wrap" align="stretch">
        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(language, TUTORIAL_OVERVIEW.learningLoopTitle)}
          </Heading>
          <VStack align="stretch" gap={2}>
            {TUTORIAL_OVERVIEW.learningLoop.map((item) => (
              <Text key={item.zh} fontSize="sm" color="fg.muted">
                {resolveLocalizedText(language, item)}
              </Text>
            ))}
          </VStack>
        </Box>

        <Box flex="1 1 320px" borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="sm" mb={3}>
            {resolveLocalizedText(
              language,
              TUTORIAL_OVERVIEW.recommendedOrderTitle,
            )}
          </Heading>
          <Flex gap={2} wrap="wrap">
            {TUTORIAL_OVERVIEW.recommendedLessonOrder.map((lessonKey) => (
              <Badge key={lessonKey} colorPalette="blue" size="sm">
                {t(`flow.tutorial.chapters.${lessonKey}.title`)}
              </Badge>
            ))}
          </Flex>
        </Box>
      </Flex>
    </VStack>
  )
}
