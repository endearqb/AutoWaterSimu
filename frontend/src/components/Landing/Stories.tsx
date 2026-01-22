import {
  Avatar,
  Box,
  Button,
  Container,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  DialogBody,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaPlay } from "react-icons/fa"
// import { DotGrid } from '../ui/DotGrid';
import { getStories, type Story } from "../../data/stories"
import { useI18n } from "../../i18n"
import { DialogContent } from "../ui/dialog"

interface StoryCardProps extends Story {
  onClick: () => void
}

function StoryCard({
  title,
  description,
  name,
  company,
  country,
  video,
  onClick,
}: StoryCardProps) {
  return (
    <Box w="300px" cursor="pointer" onClick={onClick}>
      <Box
        p={6}
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        _hover={{
          shadow: "md",
        }}
        transition="all 0.3s"
      >
        {video && (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            w={8}
            h={8}
            bg="blue.500"
            borderRadius="full"
            mb={2}
          >
            <FaPlay size={16} color="white" />
          </Box>
        )}

        <Heading
          fontSize="lg"
          fontWeight="medium"
          mb={2}
          color="gray.800"
          lineHeight="1.4"
        >
          {title}
        </Heading>

        {description && (
          <Text fontSize="sm" color="gray.500" mb={4} lineHeight="1.5">
            {description}
          </Text>
        )}

        <Box mt={4}>
          <HStack gap={2} mb={1}>
            <Avatar.Root size="xs" bg="blue.500">
              <Avatar.Fallback name={name} />
            </Avatar.Root>
            <Text fontSize="sm" color="gray.800">
              {name}
            </Text>
          </HStack>

          <HStack gap={2} color="gray.500">
            <Text fontSize="sm">{company}</Text>
            <Text>•</Text>
            <Text fontSize="sm">{country}</Text>
          </HStack>
        </Box>
      </Box>
    </Box>
  )
}

function VideoPlayer({}: { src: string }) {
  const { t } = useI18n()
  const [isPlaying, setPlaying] = useState(false)

  const togglePlay = () => {
    setPlaying((prev) => !prev)
  }

  return (
    <Box
      w="full"
      h="280px"
      position="relative"
      bg="gray.100"
      borderRadius="lg"
      overflow="hidden"
    >
      {/* Placeholder for video */}
      <Box
        w="full"
        h="full"
        bg="gray.200"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.500">{t("landing.stories.videoPlaceholder")}</Text>
      </Box>

      {!isPlaying && (
        <Box position="absolute" bottom={4} left={4} zIndex={30}>
          <Button
            size="lg"
            borderRadius="full"
            bg="white"
            color="black"
            _hover={{
              transform: "scale(1.1)",
              bg: "white",
            }}
            transition="all 0.3s"
            onClick={togglePlay}
          >
            <FaPlay style={{ marginRight: "8px" }} />
            {t("landing.stories.play")}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export function Stories() {
  const { t, language } = useI18n()
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const stories = getStories(language)

  return (
    <DialogRoot>
      <Box
        py={20}
        position="relative"
        overflow="hidden"
        bg="transparent"
        bgImage="radial-gradient(circle, hsl(191, 43.80%, 87.50%) 1px, transparent 1px)"
        bgSize="8px 8px"
        bgRepeat="repeat"
        backgroundPosition="0 0"
      >
        {/* <DotGrid
          dotSize={1.5}
          gap={8}
          baseColor="hsl(191, 43.80%, 87.50%)"
        /> */}
        <Container maxW="container.xl" position="relative" zIndex={1}>
          <VStack gap={16}>
            {/* Header */}
            <VStack gap={4} textAlign="center">
              <Text
                as="h2"
                fontSize={{ base: "4xl", md: "5xl", lg: "6xl" }}
                fontWeight="medium"
                bgGradient="to-r"
                gradientFrom="hsl(192,85%,52%)"
                gradientTo="hsl(212,98%,55%)"
                bgClip="text"
                color="transparent"
                letterSpacing="tight"
                lineHeight="1.2"
                textAlign="center"
              >
                {t("landing.stories.title")}
              </Text>
            </VStack>

            {/* Story Cards */}
            <HStack gap={-4} flexWrap="wrap" justify="center">
              {stories.map((story, index) => (
                <Box
                  key={story.id}
                  transform={index % 2 === 0 ? "rotate(3deg)" : "rotate(-3deg)"}
                  _hover={{
                    zIndex: 10,
                    transform:
                      index % 2 === 0
                        ? "rotate(3deg) translateY(-20px)"
                        : "rotate(-3deg) translateY(-20px)",
                  }}
                  transition="all 0.3s"
                >
                  <DialogTrigger asChild>
                    <Box onClick={() => setSelectedStory(story)}>
                      <StoryCard
                        {...story}
                        onClick={() => setSelectedStory(story)}
                      />
                    </Box>
                  </DialogTrigger>
                </Box>
              ))}
            </HStack>
          </VStack>
        </Container>

        {/* Background Pattern */}
        <Box />
      </Box>

      <DialogContent
        maxW="550px"
        p={6}
        pt={10}
        maxH="calc(100vh - 200px)"
        overflowY="auto"
        backdrop={true}
      >
        <DialogHeader>
          <DialogTitle srOnly>{selectedStory?.title}</DialogTitle>
        </DialogHeader>

        <DialogBody p={0}>
          <VStack align="start" gap={6}>
            {/* Author Info */}
            <HStack gap={4}>
              <Avatar.Root size="sm" bg="blue.500">
                <Avatar.Fallback name={selectedStory?.name || ""} />
              </Avatar.Root>
              <VStack align="start" gap={0}>
                <Text fontWeight="semibold">{selectedStory?.name}</Text>
                <HStack gap={2} color="gray.500">
                  <Text fontSize="sm">{selectedStory?.company}</Text>
                  {selectedStory?.country && (
                    <>
                      <Text>•</Text>
                      <Text fontSize="sm">{selectedStory?.country}</Text>
                    </>
                  )}
                </HStack>
              </VStack>
            </HStack>

            {/* Video */}
            {selectedStory?.video && <VideoPlayer src={selectedStory.video} />}

            {/* Content */}
            <VStack align="start" gap={4} w="full">
              {selectedStory?.content?.map((item, index) =>
                item.type === "heading" ? (
                  <Heading
                    key={index}
                    fontSize="xl"
                    fontWeight="medium"
                    color="gray.800"
                  >
                    {item.content}
                  </Heading>
                ) : (
                  <Text
                    key={index}
                    color={item.type === "question" ? "gray.500" : "gray.700"}
                    lineHeight="1.6"
                  >
                    {item.content}
                  </Text>
                ),
              )}
            </VStack>
          </VStack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
