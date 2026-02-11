import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"
import { useI18n } from "../../i18n"

export function SectionFive() {
  const { t } = useI18n()
  const vaultFeatures = [
    t("landing.sectionFive.features.autoName"),
    t("landing.sectionFive.features.summary"),
  ]

  return (
    <Box
      as="section"
      display="flex"
      justifyContent="space-between"
      gap={{ base: 12, lg: 8 }}
      flexDirection={{ base: "column", lg: "row" }}
      overflow="hidden"
      mb={12}
      mx={{ base: 4, md: 16 }}
    >
      {/* 流程图部分 */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        w={{ base: "full", lg: "66.666667%" }}
        bg="white"
        p={10}
        display="flex"
        gap={{ base: 0, lg: 8 }}
        flexDirection={{ base: "column-reverse", lg: "row" }}
        alignItems={{ base: "center", lg: "start" }}
        _hover={{
          shadow: "md",
        }}
        transition="all 0.3s"
        position="relative"
      >
        <Box w={{ base: "full", lg: "50%" }} mt={{ base: 8, lg: 0 }}>
          <Image
            src="/assets/images/image-8.png"
            alt={t("landing.sectionFive.imageAlt")}
            width="100%"
            height="auto"
            objectFit="contain"
            // 加入圆角
            borderRadius="md"
            // 加入阴影
            boxShadow="0px 0px 10px 0px rgba(0, 0, 0, 0.1)"
            maxW={{ base: "70%", sm: "50%", md: "35%", lg: "100%" }}
          />
        </Box>

        <Box
          display="flex"
          flexDirection="column"
          w={{ base: "full", lg: "50%" }}
          position="relative"
          h="full"
        >
          <Heading
            fontWeight="medium"
            fontSize={{ base: "xl", md: "2xl" }}
            mb={4}
            bgGradient="to-r"
            gradientFrom="hsl(192,85%,52%)"
            gradientTo="hsl(212,98%,55%)"
            bgClip="text"
            color="transparent"
            letterSpacing="tight"
            lineHeight="1.2"
          >
            {t("landing.sectionFive.title")}
          </Heading>

          <Text color="gray.500" mb={4} fontSize="sm" lineHeight="1.6">
            {t("landing.sectionFive.description")}
          </Text>

          <Text color="gray.500" fontSize="sm" lineHeight="1.6">
            {t("landing.sectionFive.descriptionSecondary")}
          </Text>

          <VStack align="start" gap={2} h="full">
            {vaultFeatures.map((feature, index) => (
              <HStack
                key={index}
                gap={2}
                align="center"
                mt={index === 0 ? 8 : 0}
              >
                <FaCheck size={16} color="black" />
                <Text fontSize="sm" color="gray.800">
                  {feature}
                </Text>
              </HStack>
            ))}

            <Box position="absolute" bottom={0} left={0}>
              <Text
                fontSize="sm"
                color="hsl(212,98%,55%)"
                cursor="pointer"
                _hover={{
                  textDecoration: "underline",
                }}
              >
                {t("landing.sectionFive.cta")}
              </Text>
            </Box>
          </VStack>
        </Box>
      </Box>

      {/* 计算部分 */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        w={{ base: "full", lg: "33.333333%" }}
        bg="white"
        p={10}
        display="flex"
        flexDirection="column"
        _hover={{
          shadow: "md",
        }}
        transition="all 0.3s"
        position="relative"
      >
        <Heading
          fontWeight="medium"
          fontSize={{ base: "xl", md: "2xl" }}
          mb={4}
          bgGradient="to-r"
          gradientFrom="hsl(192,85%,52%)"
          gradientTo="hsl(212,98%,55%)"
          bgClip="text"
          color="transparent"
          letterSpacing="tight"
          lineHeight="1.2"
        >
          {t("landing.sectionFive.exportTitle")}
        </Heading>

        <Text color="gray.500" fontSize="sm" mb={8} lineHeight="1.6">
          {t("landing.sectionFive.exportDescription")}
        </Text>

        <Box mt="auto" mb={8}>
          <Box
            bg="green.50"
            border="1px solid"
            borderColor="green.200"
            borderRadius="md"
            p={4}
            position="relative"
          >
            <Text fontSize="sm" color="green.700" fontWeight="medium">
              {t("landing.sectionFive.exportStatus")}
            </Text>
            <Text fontSize="xs" color="green.600" mt={1}>
              {t("landing.sectionFive.exportReady")}
            </Text>
          </Box>
        </Box>

        <Box display={{ base: "none", md: "flex" }}>
          <Text
            fontSize="sm"
            color="hsl(212,98%,55%)"
            cursor="pointer"
            _hover={{
              textDecoration: "underline",
            }}
          >
            {t("landing.sectionFive.exportCta")}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
