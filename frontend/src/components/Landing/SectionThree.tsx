import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"
import { useI18n } from "../../i18n"

export function SectionThree() {
  const { t } = useI18n()
  const features = [
    t("landing.sectionThree.features.create"),
    t("landing.sectionThree.features.inspect"),
    t("landing.sectionThree.features.drag"),
    t("landing.sectionThree.features.resize"),
  ]

  return (
    <Box
      as="section"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      mb={12}
      mt={12}
      mx={{ base: 4, md: 16 }}
      overflow="hidden"
      _hover={{
        shadow: "md",
      }}
      transition="all 0.3s"
    >
      <Box maxW="container.xl" mx="auto" p={0}>
        <Box display="flex" flexDirection={{ base: "column", lg: "row" }}>
          <Box
            mt={{ base: 0, xl: 6 }}
            maxW={{ base: "full", lg: "40%" }}
            ml={{ base: 0, md: 8 }}
            mb={{ base: 0, md: 8 }}
            display="flex"
            flexDirection="column"
            justifyContent="center"
            p={8}
            pl={{ base: 8, md: 0 }}
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
              {t("landing.sectionThree.title")}
            </Heading>

            <Text
              color="gray.500"
              mb={{ base: 8, lg: 4 }}
              fontSize="sm"
              lineHeight="1.6"
            >
              {t("landing.sectionThree.description")}
            </Text>

            <VStack align="start" gap={2}>
              {features.map((feature, index) => (
                <HStack key={index} gap={2} align="center">
                  <FaCheck size={16} color="black" />
                  <Text fontSize="sm" color="gray.800">
                    {feature}
                  </Text>
                </HStack>
              ))}
            </VStack>

            <Box position="absolute" bottom={0} right={0} p={4}>
              <Text
                fontSize="sm"
                color="hsl(212,98%,55%)"
                cursor="pointer"
                _hover={{
                  textDecoration: "underline",
                }}
              >
                {t("landing.sectionThree.cta")}
              </Text>
            </Box>
          </Box>

          <Box w={{ base: "full", lg: "60%" }}>
            <Image
              src="/assets/images/image-3.png"
              alt={t("landing.sectionThree.imageAlt")}
              // height="100%"
              width="100%"
              objectFit="cover"
              display="block"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
