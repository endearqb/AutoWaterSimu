import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"

export function SectionFive() {
  const vaultFeatures = [
    "自动命名计算任务，便于搜索和查找",
    "显示计算任务详情和结果摘要",
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
            alt="数据加载"
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
            计算数据加载
          </Heading>

          <Text color="gray.500" mb={4} fontSize="sm" lineHeight="1.6">
            无需在不同路径寻找流程与数据。
          </Text>

          <Text color="gray.500" fontSize="sm" lineHeight="1.6">
            选择导入时清晰的展示数据加载关系与计算任务详情
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
                立即加载您的计算结果 →
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
          本地导出
        </Heading>

        <Text color="gray.500" fontSize="sm" mb={8} lineHeight="1.6">
          当你不想将流程存储与计算结果分离时，本地导出是一个不错的选择。
          你可以在任何时候导入这些文件，继续之前的工作。
          你也可以将这些文件分享给他人，与他们合作完成项目。
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
              ✓ 导出完成
            </Text>
            <Text fontSize="xs" color="green.600" mt={1}>
              json文件已准备就绪，包含所有有效信息
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
            立即导出 →
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
