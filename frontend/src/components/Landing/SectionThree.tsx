import { Box, HStack, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { FaCheck } from "react-icons/fa"

export function SectionThree() {
  const features = [
    "拖拽创建节点,编辑节点数据",
    "查看节点的模型固定参数,查看计算结果",
    "自由拖动工具栏的位置",
    "自适应的工具栏大小调整",
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
              节点工具栏
            </Heading>

            <Text
              color="gray.500"
              mb={{ base: 8, lg: 4 }}
              fontSize="sm"
              lineHeight="1.6"
            >
              节点工具栏是一个功能强大的工具，它允许您在流程图中创建、编辑节点，查看节点属性及计算结果。
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
                立即开始时间跟踪 →
              </Text>
            </Box>
          </Box>

          <Box w={{ base: "full", lg: "60%" }}>
            <Image
              src="/assets/images/image-3.png"
              alt="节点工具栏"
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
