"use client"

import {
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react"
import React from "react"
import type { ReactElement } from "react"
import {
  FaChevronLeft,
  FaChevronRight,
  FaDatabase,
  FaMemory,
  FaRobot,
  FaShieldAlt,
} from "react-icons/fa"

interface FeatureProps {
  title: string
  description: string
  iconBg: string
  icon?: ReactElement
  isActive?: boolean
  onClick?: () => void
  index: number
}

const FeatureCard = ({
  title,
  description,
  icon,
  iconBg,
  isActive,
  onClick,
  index,
}: FeatureProps) => {
  return (
    <Card.Root
      variant={isActive ? "elevated" : "outline"}
      cursor="pointer"
      onClick={onClick}
      transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
      transform={
        isActive ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)"
      }
      shadow={isActive ? "2xl" : "md"}
      borderColor={isActive ? "green.200" : "gray.200"}
      bg={isActive ? "green.50" : "white"}
      _hover={{
        transform: "translateY(-4px) scale(1.01)",
        shadow: "xl",
        borderColor: "green.300",
      }}
      position="relative"
      overflow="hidden"
    >
      {/* 背景装饰 */}
      <Box
        position="absolute"
        top="-50%"
        right="-50%"
        w="200%"
        h="200%"
        bg={`linear-gradient(135deg, ${isActive ? "green.100" : "gray.50"} 0%, transparent 70%)`}
        opacity={0.3}
        transform="rotate(15deg)"
        transition="all 0.4s"
      />

      <Card.Body p={6}>
        <HStack gap={4} align="start">
          <Flex
            w={14}
            h={14}
            align="center"
            justify="center"
            rounded="2xl"
            bg={iconBg}
            flexShrink={0}
            shadow="lg"
            transform={isActive ? "scale(1.1)" : "scale(1)"}
            transition="all 0.3s"
          >
            {icon}
          </Flex>

          <VStack align="start" gap={3} flex={1}>
            <Heading
              size="md"
              color={isActive ? "green.700" : "gray.800"}
              fontWeight="700"
              transition="color 0.3s"
            >
              {title}
            </Heading>
            <Text
              color={isActive ? "green.600" : "gray.600"}
              fontSize="sm"
              lineHeight="1.6"
              transition="color 0.3s"
            >
              {description}
            </Text>
          </VStack>

          {/* 序号指示器 */}
          <Box
            w={8}
            h={8}
            bg={isActive ? "green.500" : "gray.300"}
            color="white"
            rounded="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="sm"
            fontWeight="bold"
            transition="all 0.3s"
          >
            {index + 1}
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

// 特性展示卡片组件
const FeatureShowcase = ({
  feature,
  isActive,
}: { feature: any; isActive: boolean }) => {
  return (
    <Box
      position="relative"
      height="500px"
      borderRadius="3xl"
      overflow="hidden"
      shadow="2xl"
      transform={isActive ? "scale(1)" : "scale(0.95)"}
      opacity={isActive ? 1 : 0.7}
      transition="all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      {/* 背景图片 */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundImage={`url(${feature.image})`}
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        backgroundSize="cover"
        filter={isActive ? "brightness(1)" : "brightness(0.8)"}
        transition="filter 0.6s"
      />

      {/* 渐变遮罩 */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="linear-gradient(135deg, blackAlpha.400 0%, transparent 50%, blackAlpha.600 100%)"
      />

      {/* 内容区域 */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        p={8}
        bg="linear-gradient(transparent, blackAlpha.800)"
      >
        <VStack align="start" gap={4}>
          <HStack gap={3}>
            <Flex
              w={12}
              h={12}
              align="center"
              justify="center"
              rounded="xl"
              bg={feature.iconBg}
              shadow="lg"
            >
              {feature.icon}
            </Flex>
            <Badge
              colorScheme="green"
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="600"
            >
              核心功能
            </Badge>
          </HStack>

          <Heading size="lg" color="white" fontWeight="700">
            {feature.title}
          </Heading>

          <Text color="whiteAlpha.900" fontSize="md" lineHeight="1.6" maxW="md">
            {feature.text}
          </Text>
        </VStack>
      </Box>

      {/* 装饰性元素 */}
      <Box
        position="absolute"
        top={4}
        right={4}
        w={16}
        h={16}
        bg="whiteAlpha.200"
        rounded="full"
        backdropFilter="blur(10px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {feature.icon}
      </Box>
    </Box>
  )
}

export const CoreFeatures = () => {
  const [activeFeature, setActiveFeature] = React.useState(0)
  const [isAutoPlay, setIsAutoPlay] = React.useState(true)

  // 功能特性数据
  const features = [
    {
      icon: <Icon as={FaRobot} color="white" w={6} h={6} />,
      iconBg: "linear-gradient(135deg, #48bb78, #38a169)",
      title: "自然语言交互",
      text: "工艺工程师用自然语言描述分析需求，系统自动生成Python代码并执行分析",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      highlight: "AI驱动",
    },
    {
      icon: <Icon as={FaDatabase} color="white" w={6} h={6} />,
      iconBg: "linear-gradient(135deg, #4299e1, #3182ce)",
      title: "数据驱动建模",
      text: "基于历史运行数据，自动构建机器学习模型，发现隐藏的运行规律和优化机会",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      highlight: "智能分析",
    },
    {
      icon: <Icon as={FaMemory} color="white" w={6} h={6} />,
      iconBg: "linear-gradient(135deg, #9f7aea, #805ad5)",
      title: "机理模型融合",
      text: "接入并调用行业公认的机理模型（ASM、EPANET、PHREEQC等），进行仿真和预测",
      image:
        "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      highlight: "专业模型",
    },
    {
      icon: <Icon as={FaShieldAlt} color="white" w={6} h={6} />,
      iconBg: "linear-gradient(135deg, #ed8936, #dd6b20)",
      title: "本地化部署",
      text: "所有核心数据处理、代码生成与执行全部在客户本地服务器完成，数据绝不离开企业内网",
      image:
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
      highlight: "安全可靠",
    },
  ]

  // 自动轮播
  React.useEffect(() => {
    if (!isAutoPlay) return

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlay, features.length])

  const handleFeatureClick = (index: number) => {
    setActiveFeature(index)
    setIsAutoPlay(false)
    // 重新启动自动播放
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  const handlePrevious = () => {
    setActiveFeature((prev) => (prev - 1 + features.length) % features.length)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  const handleNext = () => {
    setActiveFeature((prev) => (prev + 1) % features.length)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  return (
    <Box
      py={24}
      bg="linear-gradient(135deg, #ffffff 0%, #f0fff4 100%)"
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
        backgroundImage="radial-gradient(circle at 20% 80%, #38a169 0%, transparent 50%), radial-gradient(circle at 80% 20%, #4299e1 0%, transparent 50%), radial-gradient(circle at 40% 40%, #9f7aea 0%, transparent 50%)"
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
            🚀 核心功能特性
          </Badge>

          <Heading
            fontSize={{ base: "4xl", md: "5xl", lg: "6xl" }}
            fontWeight="800"
            lineHeight="1.1"
            color="gray.800"
            maxW="4xl"
          >
            基于
            <Text as="span" color="green.600">
              {" "}
              大语言模型{" "}
            </Text>
            与
            <Text as="span" color="orange.600">
              {" "}
              解释性AI技术{" "}
            </Text>
            <br />
            的智能数据分析系统
          </Heading>

          <Text
            color="gray.600"
            fontSize={{ base: "lg", lg: "xl" }}
            lineHeight="1.8"
            maxW="3xl"
          >
            专为环保水处理行业打造，融合机理模型与数据驱动分析，
            为工艺工程师提供本地化、可信赖的智能决策支持
          </Text>
        </VStack>

        {/* 主要内容区域 */}
        <Grid
          templateColumns={{ base: "1fr", xl: "5fr 7fr" }}
          gap={12}
          alignItems="start"
        >
          {/* 左侧功能列表 */}
          <GridItem>
            <VStack align="stretch" gap={4}>
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  title={feature.title}
                  description={feature.text}
                  icon={feature.icon}
                  iconBg={feature.iconBg}
                  isActive={activeFeature === index}
                  onClick={() => handleFeatureClick(index)}
                  index={index}
                />
              ))}
            </VStack>
          </GridItem>

          {/* 右侧展示区域 */}
          <GridItem>
            <Box position="relative">
              {/* 导航控制 */}
              <HStack justify="space-between" align="center" mb={6}>
                <HStack gap={2}>
                  {features.map((_, index) => (
                    <Box
                      key={index}
                      w={activeFeature === index ? 8 : 3}
                      h={3}
                      bg={activeFeature === index ? "green.500" : "gray.300"}
                      borderRadius="full"
                      cursor="pointer"
                      onClick={() => handleFeatureClick(index)}
                      transition="all 0.3s"
                      _hover={{
                        bg: activeFeature === index ? "green.600" : "gray.400",
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

              {/* 特性展示卡片 */}
              <FeatureShowcase
                feature={features[activeFeature]}
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
            { label: "企业用户", value: "1000+", color: "green" },
            { label: "处理项目", value: "5000+", color: "blue" },
            { label: "数据准确率", value: "99.9%", color: "purple" },
            { label: "响应时间", value: "<1s", color: "orange" },
          ].map((stat, index) => (
            <VStack key={index} gap={2} textAlign="center">
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
      </Container>
    </Box>
  )
}
