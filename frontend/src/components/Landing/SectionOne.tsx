import { Box, Heading, Text } from "@chakra-ui/react"
import { useI18n } from "../../i18n"

export function SectionOne() {
  const { t } = useI18n()
  return (
    <Box
      as="section"
      mt={{ base: 24, md: "200px" }}
      mb={12}
      ml={{ base: 4, md: 16 }} // 左边距：移动端16px，桌面端32px。可改为 ml={6} 固定值或 px={4} 设置左右边距
    >
      <Heading
        fontSize={{ base: "4xl", md: "8xl" }}
        fontWeight="medium"
        bgGradient="to-r"
        gradientFrom="hsl(192,85%,52%)"
        gradientTo="hsl(212,98%,55%)"
        bgClip="text"
        color="transparent"
        letterSpacing="tight"
        lineHeight="1.2"
        display={{ base: "none", sm: "block" }}
      >
        {t("landing.sectionOne.title")}
      </Heading>
      <Text mt={{ base: 4, md: 12 }} color="gray.500" fontSize="lg" maxW="5xl">
        {t("landing.sectionOne.bodyPrefix")}
        <Text as="span" color="hsl(212,98%,55%)">
          ENVDAMA
        </Text>
        {t("landing.sectionOne.bodySuffix")}
      </Text>
    </Box>
  )
}
