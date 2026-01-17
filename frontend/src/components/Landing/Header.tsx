import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  IconButton,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  return (
    <Box
      bg={{ base: "rgba(255,255,255,0.95)", _dark: "rgba(26,32,44,0.95)" }}
      backdropFilter="blur(10px)"
      borderBottom="1px"
      borderColor={{ base: "gray.100", _dark: "gray.700" }}
      position="sticky"
      top="0"
      zIndex="1000"
    >
      <Container maxW="container.xl" py={4}>
        <Flex justify="space-between" align="center">
          <Box
            _hover={{ transform: "scale(1.02)" }}
            transition="all 0.2s"
            cursor="pointer"
          >
            <HStack gap={2} asChild>
              <Link to="/">
                <Image
                  src="/assets/images/E-logos-1.png"
                  alt="ENVDAMA Logo"
                  boxSize={8}
                />
                <Heading
                  size="3xl"
                  fontWeight="medium"
                  bgGradient="to-r"
                  gradientFrom="hsl(192,85%,52%)"
                  gradientTo="hsl(212,98%,55%)"
                  bgClip="text"
                  letterSpacing="tight"
                >
                  ENVDAMA
                </Heading>
              </Link>
            </HStack>
          </Box>

          {/* Desktop Navigation */}
          <HStack gap={8} display={{ base: "none", md: "flex" }}>
            <Text
              asChild
              color={{ base: "gray.700", _dark: "gray.300" }}
              cursor="pointer"
              fontWeight="500"
              _hover={{ color: "green.600", transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              <Link to="/ai-deep-research">AI Deep Research</Link>
            </Text>
            <Text
              asChild
              color={{ base: "gray.700", _dark: "gray.300" }}
              cursor="pointer"
              fontWeight="500"
              _hover={{ color: "green.600", transform: "translateY(-1px)" }}
              transition="all 0.2s"
            >
              <Link to="/openflow">流程图</Link>
            </Text>
            <Button
              asChild
              colorScheme="green"
              size="md"
              borderRadius="full"
              px={6}
              _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
              transition="all 0.2s"
            >
              <Link to="/login">开始使用</Link>
            </Button>
          </HStack>

          {/* Mobile Menu */}
          <DrawerRoot
            placement="end"
            open={isDrawerOpen}
            onOpenChange={(e) => setIsDrawerOpen(e.open)}
          >
            <DrawerTrigger asChild>
              <IconButton
                variant="ghost"
                color="inherit"
                display={{ base: "flex", md: "none" }}
                aria-label="打开菜单"
                size="md"
              >
                <FaBars />
              </IconButton>
            </DrawerTrigger>
            <DrawerBackdrop />
            <DrawerContent maxW="xs">
              <DrawerCloseTrigger />
              <DrawerBody>
                <VStack gap={6} align="stretch" pt={8}>
                  <Text
                    asChild
                    fontSize="lg"
                    fontWeight="500"
                    color={{ base: "gray.700", _dark: "gray.300" }}
                    py={3}
                    px={4}
                    borderRadius="md"
                    _hover={{ bg: "gray.50", color: "green.600" }}
                    transition="all 0.2s"
                  >
                    <Link
                      to="/ai-deep-research"
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      AI Deep Research
                    </Link>
                  </Text>
                  <Text
                    asChild
                    fontSize="lg"
                    fontWeight="500"
                    color={{ base: "gray.700", _dark: "gray.300" }}
                    py={3}
                    px={4}
                    borderRadius="md"
                    _hover={{ bg: "gray.50", color: "green.600" }}
                    transition="all 0.2s"
                  >
                    <Link to="/openflow" onClick={() => setIsDrawerOpen(false)}>
                      流程图
                    </Link>
                  </Text>
                  <Button
                    asChild
                    colorScheme="green"
                    size="lg"
                    borderRadius="full"
                    mt={4}
                    _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
                    transition="all 0.2s"
                  >
                    <Link to="/login" onClick={() => setIsDrawerOpen(false)}>
                      开始使用
                    </Link>
                  </Button>
                </VStack>
              </DrawerBody>
            </DrawerContent>
          </DrawerRoot>
        </Flex>
      </Container>
    </Box>
  )
}
