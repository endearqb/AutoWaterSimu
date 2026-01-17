import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { Avatar } from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"

interface TestimonialItem {
  name: string
  avatarUrl?: string
  handle: string
  verified?: boolean
  quote: string
}

interface InfiniteMovingCardsProps {
  items: TestimonialItem[]
  direction?: "left" | "right"
  speed?: "fast" | "normal" | "slow"
  pauseOnHover?: boolean
  className?: string
}

export function InfiniteMovingCards({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}: InfiniteMovingCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    addAnimation()
  }, [])

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children)

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true)
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem)
        }
      })

      setStart(true)
    }
  }

  const scrollAnimationStyles = {
    "@keyframes scroll-left": {
      "0%": { transform: "translateX(0)" },
      "100%": { transform: "translateX(-100%)" },
    },
    "@keyframes scroll-right": {
      "0%": { transform: "translateX(-100%)" },
      "100%": { transform: "translateX(0)" },
    },
  }

  const getAnimationDuration = () => {
    switch (speed) {
      case "fast":
        return "20s"
      case "normal":
        return "40s"
      case "slow":
        return "80s"
      default:
        return "40s"
    }
  }

  const getAnimationName = () => {
    return direction === "left" ? "scroll-left" : "scroll-right"
  }

  return (
    <Box
      ref={containerRef}
      className={className}
      css={scrollAnimationStyles}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, white 20%, white 80%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, white 20%, white 80%, transparent)",
      }}
      maxW="none"
      overflow="hidden"
      position="relative"
      w="full"
    >
      <Box
        ref={scrollerRef}
        display="flex"
        minW="max-content"
        gap={4}
        py={4}
        w="max-content"
        flexDirection="row"
        css={{
          animation: start
            ? `${getAnimationName()} ${getAnimationDuration()} linear infinite`
            : "none",
          "&:hover": {
            animationPlayState: pauseOnHover ? "paused" : "running",
          },
        }}
      >
        {items.map((item, idx) => (
          <Box
            key={idx}
            w="350px"
            maxW="full"
            position="relative"
            borderRadius="sm"
            border="1px solid"
            borderColor="gray.200"
            _dark={{ borderColor: "gray.700", bg: "gray.800" }}
            px={8}
            py={6}
            bg="white"
            flexShrink={0}
          >
            <VStack align="start" gap={4}>
              <Text
                fontSize="sm"
                color="gray.600"
                _dark={{ color: "gray.300" }}
                lineHeight="1.6"
                fontWeight="normal"
              >
                {item.quote}
              </Text>
              <HStack gap={3}>
                <Avatar.Root size="sm" bg="blue.500">
                  {item.avatarUrl ? (
                    <Avatar.Image src={item.avatarUrl} alt={item.name} />
                  ) : (
                    <Avatar.Fallback name={item.name} />
                  )}
                </Avatar.Root>
                <VStack align="start" gap={0}>
                  <HStack gap={1}>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.800"
                      _dark={{ color: "gray.100" }}
                    >
                      {item.name}
                    </Text>
                    {item.verified && (
                      <Box
                        w={4}
                        h={4}
                        bg="blue.500"
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text color="white" fontSize="xs">
                          ✓
                        </Text>
                      </Box>
                    )}
                  </HStack>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    _dark={{ color: "gray.400" }}
                  >
                    {item.handle}
                  </Text>
                </VStack>
              </HStack>
            </VStack>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
