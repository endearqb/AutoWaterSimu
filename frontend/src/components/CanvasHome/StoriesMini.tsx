import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { getStories } from "../../data/stories"
import { useI18n } from "../../i18n"

export function StoriesMini() {
  const { t, language } = useI18n()
  const stories = getStories(language).slice(0, 3)

  return (
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
        {t("landing.stories.title")}
      </Text>
      <VStack align="stretch" gap={2}>
        {stories.map((s) => (
          <Box
            key={s.id}
            borderWidth="1px"
            borderColor="gray.200"
            _dark={{ borderColor: "gray.700" }}
            borderRadius="md"
            p={3}
          >
            <Text fontSize="sm" fontWeight="semibold" lineClamp={1}>
              {s.title}
            </Text>
            {s.description ? (
              <Text fontSize="xs" color="gray.500" lineClamp={2}>
                {s.description}
              </Text>
            ) : null}
            <HStack mt={2} justify="space-between">
              <Text fontSize="xs" color="gray.500" lineClamp={1}>
                {s.name} · {s.company}
              </Text>
            </HStack>
          </Box>
        ))}
      </VStack>
      <Button asChild size="sm" variant="outline" className="nodrag">
        <Link to="/" search={{}}>
          返回首页
        </Link>
      </Button>
    </VStack>
  )
}
