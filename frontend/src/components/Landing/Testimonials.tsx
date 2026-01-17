"use client"

import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
  FaQuoteLeft,
  FaStar,
} from "react-icons/fa"
import { useColorModeValue } from "../ui/color-mode"

interface TestimonialData {
  id: number
  content: string
  author: string
  position: string
  company: string
  avatar: string
  rating: number
  category: string
  highlight: string
}

interface TestimonialCardProps {
  testimonial: TestimonialData
  isActive?: boolean
  onClick?: () => void
}

const TestimonialCard = ({
  testimonial,
  isActive = false,
  onClick,
}: TestimonialCardProps) => {
  return (
    <Card.Root
      cursor="pointer"
      onClick={onClick}
      transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      transform={
        isActive ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)"
      }
      shadow={isActive ? "2xl" : "lg"}
      borderColor={isActive ? "green.200" : "transparent"}
      bg={useColorModeValue("white", "gray.800")}
      _hover={{
        transform: "translateY(-4px) scale(1.01)",
        shadow: "xl",
        borderColor: "green.300",
      }}
      position="relative"
      overflow="hidden"
      h="full"
    >
      {/* 背景装饰 */}
      <Box
        position="absolute"
        top="-50%"
        right="-50%"
        w="200%"
        h="200%"
        bg={`linear-gradient(135deg, ${isActive ? "green.50" : "gray.50"} 0%, transparent 70%)`}
        opacity={0.3}
        transform="rotate(15deg)"
        transition="all 0.4s"
      />

      {/* 评分徽章 */}
      <Badge
        position="absolute"
        top={4}
        right={4}
        colorScheme="green"
        px={3}
        py={1}
        borderRadius="full"
        fontSize="xs"
        fontWeight="600"
      >
        {testimonial.category}
      </Badge>

      <Card.Body p={8}>
        <VStack align="start" gap={6} h="full">
          {/* 引用图标和评分 */}
          <HStack justify="space-between" w="full">
            <Flex
              w={12}
              h={12}
              align="center"
              justify="center"
              rounded="xl"
              bg={isActive ? "green.100" : "gray.100"}
              color={isActive ? "green.600" : "gray.600"}
              transition="all 0.3s"
            >
              <Icon as={FaQuoteLeft} w={6} h={6} />
            </Flex>

            <HStack gap={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon
                  key={i}
                  as={FaStar}
                  w={4}
                  h={4}
                  color={i < testimonial.rating ? "yellow.400" : "gray.300"}
                />
              ))}
            </HStack>
          </HStack>

          {/* 高亮标题 */}
          <Heading
            size="md"
            color={
              isActive ? "green.700" : useColorModeValue("gray.800", "white")
            }
            fontWeight="700"
            transition="color 0.3s"
          >
            {testimonial.highlight}
          </Heading>

          {/* 评价内容 */}
          <Text
            color={
              isActive ? "green.600" : useColorModeValue("gray.600", "gray.300")
            }
            fontSize="md"
            lineHeight="1.8"
            flex={1}
            transition="color 0.3s"
          >
            {testimonial.content}
          </Text>

          {/* 用户信息 */}
          <HStack
            gap={4}
            w="full"
            pt={4}
            borderTop="1px"
            borderColor={useColorModeValue("gray.100", "gray.700")}
          >
            <Avatar.Root size="md">
              <Avatar.Fallback name={testimonial.author} />
              <Avatar.Image src={testimonial.avatar} />
            </Avatar.Root>

            <VStack align="start" gap={1} flex={1}>
              <Text
                fontWeight="600"
                color={useColorModeValue("gray.800", "white")}
                fontSize="sm"
              >
                {testimonial.author}
              </Text>
              <Text
                fontSize="xs"
                color={useColorModeValue("gray.500", "gray.400")}
              >
                {testimonial.position}
              </Text>
              <Text
                fontSize="xs"
                color={useColorModeValue("gray.500", "gray.400")}
                fontWeight="600"
              >
                {testimonial.company}
              </Text>
            </VStack>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export const Testimonials = () => {
  const [activeTestimonial, setActiveTestimonial] = React.useState(0)
  const [isAutoPlay, setIsAutoPlay] = React.useState(true)

  // 客户见证数据
  const testimonials: TestimonialData[] = [
    {
      id: 1,
      content:
        "ENVDAMA 让我们的数据分析效率提升了 300%，原本需要一周的复杂计算现在几小时就能完成。团队协作变得前所未有的顺畅，每个人都能快速上手进行专业分析。AI 驱动的智能分析真正解放了我们的生产力。",
      author: "李雪梅",
      position: "技术总监",
      company: "华东环保科技有限公司",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "效率提升",
      highlight: "数据分析效率提升 300%",
    },
    {
      id: 2,
      content:
        "作为非技术背景的管理者，我也能轻松使用 ENVDAMA 进行数据洞察。界面设计非常人性化，复杂的环保数据变得一目了然，决策效率大幅提升。这真正实现了让每个人都能成为数据分析师的愿景。",
      author: "王建国",
      position: "总经理",
      company: "绿源环境集团",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "易用性",
      highlight: "人性化设计，决策效率大幅提升",
    },
    {
      id: 3,
      content:
        "本地化部署让我们的数据安全得到充分保障，AI 模型的准确性令人惊叹。技术支持团队响应迅速，真正做到了 7×24 小时贴心服务。ENVDAMA 不仅是工具，更是我们可信赖的技术伙伴。",
      author: "陈志强",
      position: "首席科学家",
      company: "中科环保研究院",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "安全可靠",
      highlight: "本地化部署，数据安全有保障",
    },
    {
      id: 4,
      content:
        "通过 ENVDAMA 的智能优化建议，我们的运营成本降低了 25%，设备故障率下降了 40%。预测性维护功能让我们从被动维修转向主动预防，大大提升了设备可靠性和运营效率。",
      author: "张明华",
      position: "运营总监",
      company: "蓝天水务集团",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "成本优化",
      highlight: "运营成本降低 25%，故障率下降 40%",
    },
    {
      id: 5,
      content:
        "ENVDAMA 的机理模型融合功能让我们能够更准确地预测处理效果，工艺参数优化变得科学而精准。系统的学习能力让它越用越智能，真正成为了我们的智能助手。",
      author: "刘芳",
      position: "工艺工程师",
      company: "清源环保科技",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "智能预测",
      highlight: "机理模型融合，工艺优化更精准",
    },
    {
      id: 6,
      content:
        "从部署到上线仅用了 2 周时间，团队培训也非常高效。ENVDAMA 的技术架构设计合理，扩展性强，完全满足我们企业级应用的需求。投资回报率超出预期。",
      author: "赵国强",
      position: "信息化主管",
      company: "环宇水处理有限公司",
      avatar:
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80",
      rating: 5,
      category: "快速部署",
      highlight: "2 周快速部署，投资回报率超预期",
    },
  ]

  // 自动轮播
  React.useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isAutoPlay, testimonials.length])

  const handleTestimonialClick = (index: number) => {
    setActiveTestimonial(index)
    setIsAutoPlay(false)
    // 重新启动自动播放
    setTimeout(() => setIsAutoPlay(true), 15000)
  }

  const handlePrevious = () => {
    setActiveTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    )
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 15000)
  }

  const handleNext = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 15000)
  }

  return (
    <Box
      py={24}
      bg="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
      position="relative"
      overflow="hidden"
    >
      {/* 背景装饰 */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.03"
        backgroundImage="radial-gradient(circle at 20% 80%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 40% 40%, #8b5cf6 0%, transparent 50%)"
      />

      <Container maxW="container.xl">
        {/* 标题区域 */}
        <VStack align="center" gap={6} mb={16} textAlign="center">
          <Badge
            colorScheme="green"
            px={6}
            py={3}
            borderRadius="full"
            fontSize="md"
            fontWeight="700"
            shadow="lg"
          >
            💬 客户见证
          </Badge>

          <Heading
            fontSize={{ base: "4xl", md: "5xl", lg: "6xl" }}
            fontWeight="800"
            lineHeight="1.1"
            color="gray.800"
            maxW="4xl"
          >
            来自
            <Text as="span" color="green.600">
              {" "}
              1000+{" "}
            </Text>
            环保企业的
            <Text as="span" color="green.600">
              真实反馈
            </Text>
          </Heading>

          <Text
            color="gray.600"
            fontSize={{ base: "lg", lg: "xl" }}
            lineHeight="1.8"
            maxW="3xl"
          >
            见证 ENVDAMA 如何助力环保企业实现智能化转型，
            从数据分析到决策支持，每一个成功案例都是我们前进的动力
          </Text>
        </VStack>

        {/* 主要内容区域 */}
        <Grid
          templateColumns={{ base: "1fr", xl: "2fr 3fr" }}
          gap={12}
          alignItems="start"
        >
          {/* 左侧：主要见证展示 */}
          <GridItem>
            <Box position="relative">
              {/* 导航控制 */}
              <HStack justify="space-between" align="center" mb={6}>
                <HStack gap={2}>
                  {testimonials.map((_, index) => (
                    <Box
                      key={index}
                      w={activeTestimonial === index ? 8 : 3}
                      h={3}
                      bg={
                        activeTestimonial === index ? "green.500" : "gray.300"
                      }
                      borderRadius="full"
                      cursor="pointer"
                      onClick={() => handleTestimonialClick(index)}
                      transition="all 0.3s"
                      _hover={{
                        bg:
                          activeTestimonial === index
                            ? "green.600"
                            : "gray.400",
                      }}
                    />
                  ))}
                </HStack>

                <HStack gap={2}>
                  <IconButton
                    aria-label="上一个"
                    size="sm"
                    variant="outline"
                    borderColor="green.300"
                    color="green.600"
                    _hover={{ bg: "green.50", borderColor: "green.400" }}
                    onClick={handlePrevious}
                  >
                    <FaChevronLeft />
                  </IconButton>
                  <IconButton
                    aria-label="下一个"
                    size="sm"
                    variant="outline"
                    borderColor="green.300"
                    color="green.600"
                    _hover={{ bg: "green.50", borderColor: "green.400" }}
                    onClick={handleNext}
                  >
                    <FaChevronRight />
                  </IconButton>
                </HStack>
              </HStack>

              {/* 主要见证卡片 */}
              <TestimonialCard
                testimonial={testimonials[activeTestimonial]}
                isActive={true}
              />

              {/* 自动播放指示器 */}
              <HStack
                position="absolute"
                bottom={4}
                left={4}
                bg="blackAlpha.700"
                px={3}
                py={2}
                borderRadius="full"
                backdropFilter="blur(10px)"
              >
                <Box
                  w={2}
                  h={2}
                  bg={isAutoPlay ? "green.400" : "gray.400"}
                  borderRadius="full"
                  animation={isAutoPlay ? "pulse 2s infinite" : "none"}
                />
                <Text color="white" fontSize="xs" fontWeight="600">
                  {isAutoPlay ? "自动播放" : "手动控制"}
                </Text>
              </HStack>
            </Box>
          </GridItem>

          {/* 右侧：其他见证网格 */}
          <GridItem>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
              {testimonials
                .filter((_, index) => index !== activeTestimonial)
                .slice(0, 4)
                .map((testimonial) => (
                  <TestimonialCard
                    key={testimonial.id}
                    testimonial={testimonial}
                    onClick={() =>
                      handleTestimonialClick(
                        testimonials.findIndex((t) => t.id === testimonial.id),
                      )
                    }
                  />
                ))}
            </SimpleGrid>
          </GridItem>
        </Grid>

        {/* 底部统计数据 */}
        <Grid
          templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
          gap={8}
          mt={20}
          pt={12}
          borderTop="1px"
          borderColor="gray.200"
        >
          {[
            {
              label: "客户满意度",
              value: "99.8%",
              color: "green",
              icon: FaStar,
            },
            {
              label: "平均效率提升",
              value: "280%",
              color: "blue",
              icon: FaPlay,
            },
            {
              label: "成本节约",
              value: "30%",
              color: "purple",
              icon: FaQuoteLeft,
            },
            {
              label: "部署成功率",
              value: "100%",
              color: "orange",
              icon: FaQuoteLeft,
            },
          ].map((stat, index) => (
            <VStack key={index} gap={3} textAlign="center">
              <Flex
                w={12}
                h={12}
                align="center"
                justify="center"
                rounded="xl"
                bg={`${stat.color}.100`}
                color={`${stat.color}.600`}
              >
                <Icon as={stat.icon} w={6} h={6} />
              </Flex>
              <Text
                fontSize={{ base: "2xl", md: "3xl" }}
                fontWeight="800"
                color={`${stat.color}.600`}
              >
                {stat.value}
              </Text>
              <Text fontSize="sm" color="gray.600" fontWeight="600">
                {stat.label}
              </Text>
            </VStack>
          ))}
        </Grid>

        {/* 行动号召 */}
        <VStack gap={6} mt={16} textAlign="center">
          <Heading size="lg" color="gray.800">
            准备好体验 ENVDAMA 的强大功能了吗？
          </Heading>
          <HStack gap={4} flexWrap="wrap" justify="center">
            <Button
              size="lg"
              colorScheme="green"
              borderRadius="full"
              px={8}
              py={6}
              fontSize="lg"
              fontWeight="600"
              _hover={{
                transform: "translateY(-2px)",
                shadow: "xl",
              }}
              transition="all 0.3s"
            >
              免费试用 30 天
            </Button>

            <Button
              size="lg"
              variant="outline"
              borderRadius="full"
              px={8}
              py={6}
              fontSize="lg"
              fontWeight="600"
              borderColor="green.300"
              color="green.600"
              _hover={{
                bg: "green.50",
                transform: "translateY(-2px)",
                shadow: "lg",
              }}
              transition="all 0.3s"
            >
              <Icon as={FaPlay} mr={3} />
              观看产品演示
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
