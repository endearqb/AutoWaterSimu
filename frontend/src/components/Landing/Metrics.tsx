import { Box, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useI18n } from "../../i18n"

export function Metrics() {
  const { t } = useI18n()
  return (
    <Box
      display={{ base: "grid", md: "flex" }}
      gridTemplateColumns={{ base: "repeat(2, 1fr)" }}
      flexWrap={{ md: "nowrap" }}
      gap={8}
      position={{ lg: "absolute" }}
      bottom={5}
      //  left={16}
      mt={{ base: 20, lg: 0 }}
      css={{
        "& > *:not(:first-of-type)": {
          "@media (min-width: 768px)": {
            borderLeft: "1px solid #d1d5db",
          },
        },
      }}
    >
      <Link to="/dashboard" style={{ textDecoration: "none" }}>
        <VStack gap={4} textAlign="center" pr={{ md: 12 }}>
          <Text fontSize="sm" color="#878787" mb={4}>
            {t("landing.metrics.activeUsers")}
          </Text>
          <Text
            fontSize="2xl"
            fontFamily="mono"
            color="gray.800"
            _dark={{ color: "gray.200" }}
            css={{
              WebkitTextStroke: "1px currentColor",
              WebkitTextFillColor: "transparent",
            }}
          >
            1,200+
          </Text>
        </VStack>
      </Link>

      <Link to="/dashboard" style={{ textDecoration: "none" }}>
        <VStack gap={4} textAlign="center" px={{ md: 12 }}>
          <Text fontSize="sm" color="#878787" mb={4}>
            {t("landing.metrics.flowcharts")}
          </Text>
          <Text
            fontSize="2xl"
            fontFamily="mono"
            color="gray.800"
            _dark={{ color: "gray.200" }}
            css={{
              WebkitTextStroke: "1px currentColor",
              WebkitTextFillColor: "transparent",
            }}
          >
            1,850+
          </Text>
        </VStack>
      </Link>

      <Link to="/dashboard" style={{ textDecoration: "none" }}>
        <VStack gap={4} textAlign="center" px={{ md: 12 }}>
          <Text fontSize="sm" color="#878787" mb={4}>
            {t("landing.metrics.simulations")}
          </Text>
          <Text
            fontSize="2xl"
            fontFamily="mono"
            color="gray.800"
            _dark={{ color: "gray.200" }}
            css={{
              WebkitTextStroke: "1px currentColor",
              WebkitTextFillColor: "transparent",
            }}
          >
            2,800+
          </Text>
        </VStack>
      </Link>

      <Link to="/dashboard" style={{ textDecoration: "none" }}>
        <VStack gap={4} textAlign="center" px={{ md: 12 }}>
          <Text fontSize="sm" color="#878787" mb={4}>
            {t("landing.metrics.dataVolume")}
          </Text>
          <Text
            fontSize="2xl"
            fontFamily="mono"
            color="gray.800"
            _dark={{ color: "gray.200" }}
            css={{
              WebkitTextStroke: "1px currentColor",
              WebkitTextFillColor: "transparent",
            }}
          >
            156,000+
          </Text>
        </VStack>
      </Link>
    </Box>
  )
}
