import {
  Box,
  Button,
  HStack,
  Heading,
  Icon,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useState } from "react"
import { FaArrowRight } from "react-icons/fa"
import { useI18n } from "../../i18n"
import { Metrics } from "./Metrics"
import { WordAnimation } from "./WordAnimation"

export const MiddayStyleHero = () => {
  const { t } = useI18n()
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <Box
      minH="calc(100vh - 80px)"
      position="relative"
      // bg={{ base: 'hsl(192,85%,99.5%)', _dark: 'gray.900' }}
      pt={{ base: "60px", lg: "180px" }}
      // pb="60px"
      mx={{ base: 4, md: 16 }}
    >
      <Box
        as="section"
        mt={{ base: 0, md: 4 }}
        mb={8}
        // ml={{ base: 4, md: 16 }} // 左边距：移动端16px，桌面端32px。可改为 ml={6} 固定值或 px={4} 设置左右边距
      >
        <VStack align="start" gap={16} maxW="580px">
          {/* Version Badge */}
          <Link to="/dashboard">
            <Button
              variant="outline"
              borderRadius="full"
              borderColor="gray.300"
              size="sm"
              px={4}
              py={2}
              _hover={{
                transform: "translateY(-1px)",
                shadow: "md",
              }}
              transition="all 0.2s"
            >
              <HStack gap={2}>
                <Text fontSize="xs" fontFamily="mono">
                  ENVDAMA v0.1.2
                </Text>
                <Icon as={FaArrowRight} w={3} h={3} />
              </HStack>
            </Button>
          </Link>

          {/* Main Heading */}
          <Heading
            fontSize={{ base: "24px", md: "36px" }}
            fontWeight="normal"
            lineHeight="1.5"
            color="gray.500"
            maxW="580px"
          >
            {t("landing.hero.headline")}{" "}
            <Box
              as="span"
              fontSize={{ base: "1.1em", md: "1.1em" }}
              verticalAlign="baseline"
            >
              <WordAnimation />
            </Box>{" "}
          </Heading>

          {/* Action Buttons */}
          <VStack align="start" gap={4}>
            <HStack gap={4}>
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  borderColor="transparent"
                  bg={{ base: "#F2F1EF", _dark: "#1D1D1D" }}
                  color="gray.700"
                  h="44px"
                  px={6}
                  _hover={{
                    transform: "translateY(-1px)",
                    shadow: "md",
                  }}
                  transition="all 0.2s"
                >
                  {t("landing.hero.contact")}
                </Button>
              </Link>

              <Link to="/login">
                <Button
                  colorScheme="blue"
                  h="44px"
                  px={5}
                  _hover={{
                    transform: "translateY(-1px)",
                    shadow: "lg",
                  }}
                  transition="all 0.2s"
                >
                  {t("landing.hero.startTrial")}
                </Button>
              </Link>
            </HStack>

            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              {t("landing.hero.caption")}
            </Text>
          </VStack>
        </VStack>

        {/* Hero Image */}
        <Box
          // base: 手机端参与文流；md 及以上: 右侧悬浮
          position={{ base: "relative", md: "absolute" }}
          mt={{ base: 8, md: 0 }}
          // 让图片在手机端居中并向下排
          mx={{ base: "auto", md: 0 }}
          // 位置：越大的屏幕，越靠上（百分比越小），并适当右移
          top={{ md: "72%", lg: "68%", xl: "62%", "2xl": "65%" }}
          right={{ md: "-200px", lg: "-450px", xl: "-450px", "2xl": "-450px" }}
          transform={{
            base: "none",
            md: "translateY(-50%)",
          }}
          // 宽度：不同断点逐步增大；比 scale 更可控
          w={{
            base: "min(92vw, 520px)",
            md: "720px",
            lg: "960px",
            xl: "clamp(960px, 38vw, 1280px)",
            "2xl": "clamp(1440px, 42vw, 1920px)",
          }}
          zIndex={10}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Box
              // 3D 透视在所有断点保持一致（也可做断点微调）
              transform="perspective(4101px) rotateX(51deg) rotateY(-13deg) rotateZ(40deg)"
            >
              <Image
                src="/assets/images/hero.png"
                alt={t("landing.hero.imageAlt")}
                // 让图片填满上层 Box 的 w
                w="100%"
                // 可选：根据 DPR/断点提供不同资源，减少模糊
                loading="eager"
                draggable={false}
                onLoad={() => setIsLoaded(true)}
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                _dark={{
                  borderColor: "gray.700",
                  boxShadow:
                    "0px 80px 60px 0px rgba(0,0,0,0.35), 0px 35px 28px 0px rgba(0,0,0,0.25), 0px 18px 15px 0px rgba(0,0,0,0.20), 0px 10px 8px 0px rgba(0,0,0,0.17), 0px 5px 4px 0px rgba(0,0,0,0.14), 0px 2px 2px 0px rgba(0,0,0,0.10)",
                }}
                boxShadow="0px 82px 105px 0px rgba(227, 226, 223, 0.48), 0px 29.93px 38.33px 0px rgba(227, 226, 223, 0.33), 0px 14.53px 18.61px 0px rgba(227, 226, 223, 0.27), 0px 7.12px 9.12px 0px rgba(227, 226, 223, 0.21), 0px 2.82px 3.61px 0px rgba(227, 226, 223, 0.15)"
              />
            </Box>
          </motion.div>
        </Box>
      </Box>

      {/* Metrics */}
      <Metrics />
    </Box>
  )
}
