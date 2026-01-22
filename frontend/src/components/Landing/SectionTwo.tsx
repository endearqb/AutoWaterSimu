import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"
import { useI18n } from "../../i18n"

export function SectionTwo() {
  const { t } = useI18n()
  const features = [
    t("landing.sectionTwo.features.materialBalance"),
    t("landing.sectionTwo.features.asm1Slim"),
    t("landing.sectionTwo.features.asm1"),
    t("landing.sectionTwo.features.more"),
  ]

  return (
    <Box
      as="section"
      border="1px solid"
      borderColor="gray.200"
      bg="white"
      mb={12}
      mt={12}
      mx={{ base: 4, md: 16 }} // 左边距：移动端16px，桌面端32px。可改为 ml={6} 固定值或 px={4} 设置左右边距
      overflow="hidden"
      _hover={{
        shadow: "md",
      }}
      transition="all 0.3s"
    >
      <Box maxW="container.xl" mx="auto" p={0}>
        {" "}
        {/* 替换Container为Box，手动居中，完全无内边距 */}
        <Box display="flex" flexDirection={{ base: "column", lg: "row" }}>
          {" "}
          {/* Flex布局，小屏纵向大屏横向，可调整断点 */}
          <Box w={{ base: "full", lg: "50%" }}>
            {" "}
            {/* 图片包装容器，确保图片占满分配的空间 */}
            <Image // 左侧图片组件
              src="/assets/images/Image-10.jpeg" // 图片路径，需要确保文件存在
              alt={t("landing.sectionTwo.imageAlt")} // 无障碍文本描述，可修改为更具体描述
              height="100%" // 高度100%填满容器，让图片贴边
              width="100%" // 宽度100%填满容器，让图片贴边
              objectFit="cover" // 改为cover让图片完全填充容器并贴边
              display="block" // 消除图片底部默认间距
            />
          </Box>
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
              {t("landing.sectionTwo.title")}
            </Heading>

            <Text
              color="gray.500"
              mb={{ base: 8, lg: 4 }}
              fontSize="sm"
              lineHeight="1.6"
            >
              {t("landing.sectionTwo.description")}
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
                {t("landing.sectionTwo.cta")}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
