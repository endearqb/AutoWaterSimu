import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"
import { useI18n } from "../../i18n"

export function SectionFour() {
  const { t } = useI18n()
  const invoicingFeatures = [
    t("landing.sectionFour.modelFeatures.typeSpecific"),
    t("landing.sectionFour.modelFeatures.localizedNames"),
    t("landing.sectionFour.modelFeatures.descriptions"),
    t("landing.sectionFour.modelFeatures.ranges"),
    t("landing.sectionFour.modelFeatures.defaults"),
    t("landing.sectionFour.modelFeatures.customSoon"),
  ]

  const inboxFeatures = [
    t("landing.sectionFour.switchFeatures.syncOn"),
    t("landing.sectionFour.switchFeatures.syncOff"),
    t("landing.sectionFour.switchFeatures.perNode"),
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
      {/* 模型参数部分 */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        w={{ base: "full", md: "66.666667%" }}
        bg="white"
        p={10}
        display="flex"
        justifyContent="space-between"
        gap={{ base: 0, md: 8 }}
        flexDirection={{ base: "column", md: "row" }}
        _hover={{
          shadow: "md",
        }}
        transition="all 0.3s"
        position="relative"
      >
        <Box
          display="flex"
          flexDirection="column"
          w={{ base: "full", md: "50%" }}
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
            {t("landing.sectionFour.modelTitle")}
          </Heading>

          <Text
            color="gray.500"
            mb={{ base: 0, md: 4 }}
            fontSize="sm"
            lineHeight="1.6"
          >
            {t("landing.sectionFour.modelDescription")}
          </Text>

          <VStack align="start" gap={2}>
            {invoicingFeatures.map((feature, index) => (
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
          </VStack>

          <Box position="absolute" bottom={6} left={10}>
            <Text
              fontSize="sm"
              color="hsl(212,98%,55%)"
              cursor="pointer"
              _hover={{
                textDecoration: "underline",
              }}
            >
              {t("landing.sectionFour.modelCta")}
            </Text>
          </Box>
        </Box>

        <Box
          w={{ base: "full", md: "60%" }}
          mt={{ base: 8, md: 0 }}
          position="relative"
        >
          <Image
            src="/assets/images/image-4.png"
            alt={t("landing.sectionFour.modelImageAlt")}
            // width="100%"
            height="423px"
            objectFit="cover"
            // 增加圆角
            borderRadius="md"
            // 增加阴影
            boxShadow="0px 0px 10px 0px rgba(0, 0, 0, 0.1)"
            ml={{ base: 0, xl: "20%" }}
          />
        </Box>
      </Box>

      {/* 开关部分 */}
      <Box
        border="1px solid"
        borderColor="gray.200"
        w={{ base: "full", lg: "33.333333%" }}
        bg="white"
        p={10}
        display="flex"
        flexDirection="column"
        position="relative"
        _hover={{
          shadow: "md",
        }}
        transition="all 0.3s"
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
          {t("landing.sectionFour.switchTitle")}
        </Heading>

        <VStack
          as="ol"
          align="start"
          gap={2}
          color="gray.500"
          fontSize="sm"
          lineHeight="relaxed"
          mb={6}
        >
          <Text as="li">{t("landing.sectionFour.switchQuestions.first")}</Text>
          <Text as="li">{t("landing.sectionFour.switchQuestions.second")}</Text>
          <Text as="li">{t("landing.sectionFour.switchQuestions.third")}</Text>
        </VStack>

        <VStack align="start" gap={2} mb={6}>
          {inboxFeatures.map((feature, index) => (
            <HStack key={index} gap={2} align="center" mt={index === 0 ? 8 : 0}>
              <FaCheck size={16} color="black" />
              <Text fontSize="sm" color="gray.800">
                {feature}
              </Text>
            </HStack>
          ))}
        </VStack>
        <Box
          w={{ base: "full", md: "100%" }}
          mt={{ base: 8, md: 4 }}
          position="relative"
        >
          <Image
            src="/assets/images/image-9.png"
            alt={t("landing.sectionFour.switchImageAlt")}
            width="100%"
            // height="423px"
            objectFit="cover"
            // 增加圆角
            borderRadius="md"
            // 增加阴影
            boxShadow="0px 0px 10px 0px rgba(0, 0, 0, 0.1)"
            ml={{ base: 0, xl: 0 }}
          />
        </Box>

        <Box position="absolute" bottom={6} left={10}>
          <Text
            fontSize="sm"
            color="hsl(212,98%,55%)"
            cursor="pointer"
            _hover={{
              textDecoration: "underline",
            }}
          >
            {t("landing.sectionFour.switchCta")}
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
