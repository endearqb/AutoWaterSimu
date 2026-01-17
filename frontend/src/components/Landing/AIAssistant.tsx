import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Icon,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Card } from "@chakra-ui/react"
import { Avatar } from "@chakra-ui/react"
import { useState } from "react"
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa"

const chatMessages = [
  {
    type: "user",
    message: "你好，我想了解一下我们公司的财务状况",
    time: "今天",
  },
  {
    type: "assistant",
    message:
      "你好！我来帮你分析公司的财务状况。根据最新数据，你们公司本月收入增长了15%，主要支出集中在设备采购和人员成本上。需要我详细分析哪个方面？",
    time: "今天",
  },
  {
    type: "user",
    message: "请分析一下我们最大的支出项目",
    time: "今天",
  },
  {
    type: "assistant",
    message:
      "根据数据分析，你们最大的支出项目是：\n\n1. 设备采购 - 占总支出的35%\n2. 人员工资 - 占总支出的28%\n3. 运营成本 - 占总支出的20%\n\n建议优化设备采购流程，可以节省约10-15%的成本。需要我提供具体的优化建议吗？",
    time: "今天",
  },
]

const quickActions = ["今天", "昨天", "最近7天", "最近30天"]

export function AIAssistant() {
  const [inputValue, setInputValue] = useState("")

  return (
    <Box py={20} bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          {/* Header */}
          <VStack gap={4} textAlign="center" maxW="3xl">
            <Badge
              colorScheme="purple"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              🤖 AI助手
            </Badge>

            <Heading
              fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              color="gray.800"
              _dark={{ color: "gray.100" }}
            >
              询问ENVDAMA任何问题
            </Heading>

            <Text
              fontSize={{ base: "lg", lg: "xl" }}
              color="gray.600"
              _dark={{ color: "gray.400" }}
              lineHeight="1.8"
              textAlign="center"
            >
              获得针对您财务状况的定制洞察。了解您最大的支出和收入，
              更好地掌握您的财务状况，帮助您削减成本、发现机会并建立更长的跑道。
            </Text>
          </VStack>

          {/* Chat Interface */}
          <Card.Root
            maxW="4xl"
            w="full"
            bg="white"
            _dark={{ bg: "gray.800" }}
            shadow="xl"
            borderRadius="2xl"
            overflow="hidden"
          >
            <Card.Body p={0}>
              {/* Chat Header */}
              <Box
                p={4}
                borderBottom="1px"
                borderColor="gray.200"
                bg="gray.50"
                _dark={{ borderColor: "gray.600", bg: "gray.700" }}
              >
                <HStack gap={3}>
                  <Avatar.Root size="sm" bg="purple.500">
                    <Avatar.Fallback>
                      <FaRobot />
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="semibold" fontSize="sm">
                      ENVDAMA AI助手
                    </Text>
                    <Text fontSize="xs" color="green.500">
                      在线
                    </Text>
                  </VStack>
                </HStack>
              </Box>

              {/* Chat Messages */}
              <Box p={6} maxH="400px" overflowY="auto">
                <VStack gap={4} align="stretch">
                  {chatMessages.map((msg, index) => (
                    <Flex
                      key={index}
                      justify={msg.type === "user" ? "flex-end" : "flex-start"}
                    >
                      <HStack
                        gap={3}
                        maxW="80%"
                        flexDirection={
                          msg.type === "user" ? "row-reverse" : "row"
                        }
                      >
                        <Avatar.Root
                          size="sm"
                          bg={msg.type === "user" ? "blue.500" : "purple.500"}
                        >
                          <Avatar.Fallback>
                            {msg.type === "user" ? <FaUser /> : <FaRobot />}
                          </Avatar.Fallback>
                        </Avatar.Root>
                        <Box
                          bg={msg.type === "user" ? "blue.500" : "gray.100"}
                          color={msg.type === "user" ? "white" : "gray.800"}
                          _dark={{
                            bg: msg.type === "user" ? "blue.500" : "gray.600",
                            color: msg.type === "user" ? "white" : "gray.100",
                          }}
                          px={4}
                          py={3}
                          borderRadius="lg"
                          borderTopLeftRadius={
                            msg.type === "user" ? "lg" : "sm"
                          }
                          borderTopRightRadius={
                            msg.type === "user" ? "sm" : "lg"
                          }
                        >
                          <Text fontSize="sm" whiteSpace="pre-line">
                            {msg.message}
                          </Text>
                        </Box>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>

              {/* Quick Actions */}
              <Box px={6} pb={4}>
                <HStack gap={2} flexWrap="wrap">
                  {quickActions.map((action) => (
                    <Button
                      key={action}
                      size="sm"
                      variant="outline"
                      borderRadius="full"
                      fontSize="xs"
                      onClick={() => setInputValue(`分析${action}的数据`)}
                    >
                      {action}
                    </Button>
                  ))}
                </HStack>
              </Box>

              {/* Input Area */}
              <Box
                p={4}
                borderTop="1px"
                borderColor="gray.200"
                bg="gray.50"
                _dark={{ borderColor: "gray.600", bg: "gray.700" }}
              >
                <HStack gap={3}>
                  <Input
                    placeholder="你好，我今天能为你做什么？"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    bg="white"
                    _dark={{ bg: "gray.800" }}
                    border="none"
                    _focus={{ boxShadow: "none" }}
                  />
                  <Button
                    colorScheme="blue"
                    size="sm"
                    px={4}
                    disabled={!inputValue.trim()}
                  >
                    <Icon as={FaPaperPlane} />
                  </Button>
                </HStack>
              </Box>
            </Card.Body>
          </Card.Root>

          {/* Bottom Text */}
          <Text
            fontSize="sm"
            color="gray.500"
            _dark={{ color: "gray.400" }}
            textAlign="center"
            maxW="2xl"
          >
            将运营业务的无聊部分设置为自动驾驶。ENVDAMA帮助您简化月末程序，
            减少手工工作，并轻松为您的会计师打包一切。
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}
