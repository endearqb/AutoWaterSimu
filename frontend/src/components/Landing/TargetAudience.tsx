import {
  Badge,
  Box,
  Container,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  FaCheckCircle,
  FaCog,
  FaGraduationCap,
  FaIndustry,
  FaUsers,
} from "react-icons/fa"

export const TargetAudience = () => {
  return (
    <Box bg={{ base: "gray.50", _dark: "gray.800" }} py={20}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          <VStack gap={6} textAlign="center">
            <Badge
              colorScheme="purple"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              🎯 目标客户
            </Badge>
            <Heading
              fontSize={{ base: "3xl", lg: "4xl" }}
              fontWeight="700"
              color={{ base: "gray.800", _dark: "white" }}
              textAlign="center"
            >
              专为环保水处理行业打造
            </Heading>
            <Text
              fontSize="lg"
              color={{ base: "gray.600", _dark: "gray.300" }}
              maxW="3xl"
              textAlign="center"
              lineHeight="1.8"
            >
              深度理解行业痛点，为环保企业量身定制智能化解决方案
            </Text>
          </VStack>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={16}>
            <GridItem>
              <VStack align="start" gap={8}>
                <Box
                  p={8}
                  bg={{ base: "white", _dark: "gray.700" }}
                  borderRadius="2xl"
                  shadow="lg"
                  w="full"
                >
                  <VStack align="start" gap={6}>
                    <HStack>
                      <Icon as={FaIndustry} color="purple.500" boxSize={6} />
                      <Heading
                        size="lg"
                        color={{ base: "gray.800", _dark: "white" }}
                      >
                        客户画像
                      </Heading>
                    </HStack>

                    <Text
                      color={{ base: "gray.600", _dark: "gray.300" }}
                      lineHeight="1.8"
                      fontSize="md"
                    >
                      拥有污水处理厂、自来水厂、工业废水处理站等设施的环保企业
                      或大型工厂的环保部门
                    </Text>

                    <HStack gap={3} flexWrap="wrap">
                      <Badge
                        colorScheme="green"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <Icon as={FaUsers} mr={2} boxSize={3} />
                        厂长
                      </Badge>
                      <Badge
                        colorScheme="blue"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <Icon as={FaGraduationCap} mr={2} boxSize={3} />
                        工艺工程师
                      </Badge>
                      <Badge
                        colorScheme="purple"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        <Icon as={FaCog} mr={2} boxSize={3} />
                        运营主管
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>

                {/* Industry Stats */}
                <SimpleGrid columns={2} gap={4} w="full">
                  <Box
                    p={6}
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderRadius="xl"
                    textAlign="center"
                    shadow="md"
                  >
                    <Text fontSize="2xl" fontWeight="bold" color="green.600">
                      5000+
                    </Text>
                    <Text
                      fontSize="sm"
                      color={{ base: "gray.600", _dark: "gray.300" }}
                    >
                      污水处理厂
                    </Text>
                  </Box>
                  <Box
                    p={6}
                    bg={{ base: "white", _dark: "gray.700" }}
                    borderRadius="xl"
                    textAlign="center"
                    shadow="md"
                  >
                    <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                      3000+
                    </Text>
                    <Text
                      fontSize="sm"
                      color={{ base: "gray.600", _dark: "gray.300" }}
                    >
                      自来水厂
                    </Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </GridItem>

            <GridItem>
              <Box
                p={8}
                bg={{ base: "white", _dark: "gray.700" }}
                borderRadius="2xl"
                shadow="lg"
                h="full"
              >
                <VStack align="start" gap={6} h="full">
                  <HStack>
                    <Icon as={FaCheckCircle} color="red.500" boxSize={6} />
                    <Heading
                      size="lg"
                      color={{ base: "gray.800", _dark: "white" }}
                    >
                      核心痛点
                    </Heading>
                  </HStack>

                  <VStack align="start" gap={4} flex={1}>
                    {[
                      "数据丰富，洞察匮乏：SCADA系统积累了海量数据，但无法有效转化为指导运营的洞察",
                      "运营成本高昂：电费和药剂费是巨大开销，缺少精确的优化工具",
                      "模型与现实脱节：机理模型配置复杂、校准困难，难以与实时数据结合",
                      "人才断层：缺乏能将工艺、数据和建模融会贯通的复合型专家",
                      "被动式运维：设备维护以'坏了再修'为主，缺乏预测性维护能力",
                      "安全与信任顾虑：对将核心生产数据上传到公有云存在不信任感",
                    ].map((pain, index) => (
                      <HStack key={index} align="start" gap={3}>
                        <Box
                          w={2}
                          h={2}
                          bg="red.500"
                          borderRadius="full"
                          mt={2}
                          flexShrink={0}
                        />
                        <Text
                          color={{ base: "gray.700", _dark: "gray.300" }}
                          fontSize="sm"
                          lineHeight="1.7"
                        >
                          {pain}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
