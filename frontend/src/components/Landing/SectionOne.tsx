import { Box, Heading, Text } from "@chakra-ui/react"

export function SectionOne() {
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
        为您精心准备的一切
      </Heading>
      <Text mt={{ base: 4, md: 12 }} color="gray.500" fontSize="lg" maxW="5xl">
        从知识原理到应用实践，
        <Text as="span" color="hsl(212,98%,55%)">
          ENVDAMA
        </Text>
        为您精心准备的污水处理工艺学习平台，让您的业务更上一层楼。
      </Text>
    </Box>
  )
}
