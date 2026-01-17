import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"

export function SectionFour() {
  const invoicingFeatures = [
    "不同类型的节点拥有不同的模型参数",
    "中文的模型参数名称",
    "模型参数描述",
    "模型参数数值范围",
    "模型参数默认值",
    "未来推出自定义模型参数",
  ]

  const inboxFeatures = [
    "开启时，所有相同类型节点的模型参数同步调整。",
    "关闭时，每个节点的模型参数独立调整。",
    "单个模拟运行时，支持不同节点不同的模型参数。",
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
            模型参数管理
          </Heading>

          <Text
            color="gray.500"
            mb={{ base: 0, md: 4 }}
            fontSize="sm"
            lineHeight="1.6"
          >
            管理您的模型参数，通过滑块方便调整模型参数数值。
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
              直观快速的调整模型参数 →
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
            alt="发票管理"
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
          模型参数开关
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
          <Text as="li">每个节点都要手动调整参数是否太麻烦？</Text>
          <Text as="li">
            系统中前后污泥分离且性状不同时，是否需要不同的模型参数？
          </Text>
          <Text as="li">
            你有没有想过可以在一次模拟中比较多种参数的不同效果？
          </Text>
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
            alt="发票管理"
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
            自由的调整你的模型参数 →
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
