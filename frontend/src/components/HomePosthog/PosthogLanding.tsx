import {
  AspectRatio,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Input,
  Image,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  FaArrowRight,
  FaTimes,
  FaWindowMaximize,
} from "react-icons/fa"

import AORCalculator from "@/components/calculators/AORCalculator"
import { DWACalculator } from "@/components/calculators/DWACalculator"
import { LSICalculator } from "@/components/calculators/LSICalculator"
import StandardAO from "@/components/calculators/StandardAO"
import { POSTHOG_DEMO_CASES } from "@/features/posthogDemo/cases"
import { useI18n, useLocale } from "@/i18n"

import { FlowComponentsDocs } from "./FlowComponentsDocs"
import {
  type CalculatorId,
  type CaseId,
  desktopIconsLeft,
  desktopIconsRight,
} from "./homeLinks"

type WindowView =
  | { kind: "posthog" }
  | { kind: "home" }
  | { kind: "url"; title: string; url: string }
  | { kind: "calculator"; id: CalculatorId }
  | { kind: "case"; id: CaseId }
  | { kind: "flowDocs" }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function DesktopIcon(props: {
  label: string
  iconSrc: string
  disabled?: boolean
  onOpenWindow?: () => void
}) {
  const content = (
    <VStack
      gap={2}
      w="92px"
      px={2}
      py={2}
      borderRadius="md"
      userSelect="none"
      opacity={props.disabled ? 0.4 : 1}
      _hover={
        props.disabled
          ? undefined
          : {
              bg: "rgba(0,0,0,0.05)",
            }
      }
      _focusVisible={
        props.disabled
          ? undefined
          : {
              outline: "2px solid",
              outlineColor: "blue.500",
              outlineOffset: "2px",
            }
      }
    >
      <Box
        w="44px"
        h="44px"
        borderRadius="lg"
        overflow="hidden"
        bg="rgba(255,255,255,0.65)"
        borderWidth="1px"
        borderColor="rgba(0,0,0,0.12)"
        boxShadow="0 1px 0 rgba(255,255,255,0.6) inset"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Image
          src={props.iconSrc}
          alt={props.label}
          w="full"
          h="full"
          objectFit="cover"
          transform="scale(1.14)"
          transformOrigin="center"
          draggable={false}
        />
      </Box>
      <Text
        fontSize="xs"
        textAlign="center"
        color="gray.700"
        lineHeight="short"
      >
        {props.label}
      </Text>
    </VStack>
  )

  if (props.onOpenWindow && !props.disabled) {
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={props.onOpenWindow}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            props.onOpenWindow?.()
          }
        }}
        style={{ textDecoration: "none" }}
      >
        {content}
      </Box>
    )
  }

  return <Box>{content}</Box>
}

function DesktopWindow(props: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [{ x, y }, setPos] = useState(() => ({
    x: Math.max(16, Math.floor(window.innerWidth / 2 - 520)),
    y: 96,
  }))

  const setClampedPos = (next: { x: number; y: number }) => {
    const el = frameRef.current
    const width = el?.offsetWidth ?? 0
    const height = el?.offsetHeight ?? 0
    const maxX = Math.max(8, window.innerWidth - width - 8)
    const maxY = Math.max(8, window.innerHeight - height - 8)
    setPos({
      x: clamp(next.x, 8, maxX),
      y: clamp(next.y, 8, maxY),
    })
  }

  useEffect(() => {
    const onResize = () => setClampedPos({ x, y })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y])

  return (
    <Box
      ref={frameRef}
      position="fixed"
      left={isMaximized ? "24px" : "0"}
      top={isMaximized ? "24px" : "0"}
      transform={
        isMaximized ? "none" : `translate3d(${x}px, ${y}px, 0)`
      }
      w={
        isMaximized
          ? "calc(100vw - 48px)"
          : { base: "calc(100vw - 24px)", md: "1040px" }
      }
      maxW={isMaximized ? "calc(100vw - 48px)" : "calc(100vw - 24px)"}
      h={
        isMaximized
          ? "calc(100vh - 48px)"
          : { base: "calc(100vh - 96px)", md: "740px" }
      }
      maxH={isMaximized ? "calc(100vh - 48px)" : "calc(100vh - 96px)"}
      borderWidth="1px"
      borderColor="rgba(0,0,0,0.22)"
      borderRadius="md"
      bg="rgba(248,247,244,0.92)"
      boxShadow="0 18px 60px rgba(0,0,0,0.22)"
      overflow="hidden"
      zIndex={20}
    >
      <Flex
        align="center"
        justify="space-between"
        px={3}
        h="38px"
        bg="linear-gradient(180deg, rgba(250,250,250,0.98) 0%, rgba(236,236,236,0.98) 100%)"
        borderBottomWidth="1px"
        borderBottomColor="rgba(0,0,0,0.12)"
        cursor={isMaximized ? "default" : isDragging ? "grabbing" : "grab"}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return
          if (isMaximized) return
          if (e.button !== 0) return
          const rect = frameRef.current?.getBoundingClientRect()
          if (!rect) return
          setIsDragging(true)
          setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (isMaximized) return
          if (!isDragging) return
          setClampedPos({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
          })
        }}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
      >
        <Text fontSize="sm" color="gray.700">
          {props.title}
        </Text>
        <HStack gap={0}>
          <Button
            size="xs"
            variant="ghost"
            borderRadius="none"
            w="42px"
            h="38px"
            aria-label="Maximize"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setIsDragging(false)
              setIsMaximized((v) => !v)
            }}
          >
            <FaWindowMaximize />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            borderRadius="none"
            w="42px"
            h="38px"
            aria-label="Close"
            _hover={{ bg: "red.500", color: "white" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              props.onClose()
            }}
          >
            <FaTimes />
          </Button>
        </HStack>
      </Flex>
      <Box h="calc(100% - 38px)" overflow="hidden" bg="white">
        {props.children}
      </Box>
    </Box>
  )
}

function ExploreAppsPanel(props: { onOpenCalculator: (id: CalculatorId) => void }) {
  return (
    <Box mt={{ base: 8, md: 10 }}>
      <Flex align="baseline" justify="space-between" gap={4} mb={3}>
        <Heading size="md" color="gray.800">
          Explore apps{" "}
          <Text as="span" fontSize="sm" color="gray.600" fontWeight="normal">
            by company stage
          </Text>
        </Heading>
        <Text
          asChild
          fontSize="sm"
          color="gray.700"
          textDecoration="underline"
        >
          <Link to="/showcase">Browse app library</Link>
        </Text>
      </Flex>

      <Tabs.Root defaultValue="startup" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="startup">Startup / Side project</Tabs.Trigger>
          <Tabs.Trigger value="growth">Growth</Tabs.Trigger>
          <Tabs.Trigger value="scale">Scale</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="startup">
          <Flex gap={4} mt={4} direction={{ base: "column", md: "row" }}>
            <VStack
              align="stretch"
              w={{ base: "full", md: "260px" }}
              gap={2}
            >
              {[
                { id: "lsi", label: "LSI Calculator" },
                { id: "standardAO", label: "AO 设计" },
                { id: "aor", label: "AOR Calculator" },
                { id: "dwa", label: "DWA A/O" },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  justifyContent="flex-start"
                  borderWidth="1px"
                  borderColor="rgba(0,0,0,0.10)"
                  bg="rgba(255,255,255,0.55)"
                  _hover={{ bg: "rgba(255,255,255,0.85)" }}
                  onClick={() => props.onOpenCalculator(item.id as CalculatorId)}
                >
                  {item.label}
                </Button>
              ))}
            </VStack>

            <Box
              flex="1"
              borderWidth="1px"
              borderColor="rgba(0,0,0,0.10)"
              borderRadius="md"
              bg="rgba(60,120,255,0.90)"
              color="white"
              p={4}
            >
              <Flex justify="space-between" align="flex-start" gap={3} mb={4}>
                <Box>
                  <Heading size="md">Open calculators in window</Heading>
                  <Text fontSize="sm" opacity={0.9}>
                    Click a calculator on the left to load it here.
                  </Text>
                </Box>
                <Button
                  bg="white"
                  color="gray.900"
                  borderWidth="2px"
                  borderColor="rgba(0,0,0,0.25)"
                  _hover={{ bg: "rgba(255,255,255,0.9)" }}
                >
                  Open
                </Button>
              </Flex>

              <Box
                bg="rgba(255,255,255,0.92)"
                borderRadius="md"
                p={4}
                color="gray.900"
              >
                <Heading size="lg" mb={1}>
                  Tip
                </Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  The center window is draggable and can be closed.
                </Text>
                <HStack
                  borderWidth="1px"
                  borderColor="rgba(0,0,0,0.15)"
                  borderRadius="md"
                  px={3}
                  py={2}
                  bg="white"
                >
                  <Text fontSize="sm" color="gray.600">
                    Try opening LSI / AOR
                  </Text>
                  <Box flex="1" />
                  <Button size="sm" variant="ghost">
                    <FaArrowRight />
                  </Button>
                </HStack>
              </Box>
            </Box>
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="growth">
          <Box mt={4} color="gray.700">
            Demo content (Growth) – 待完善
          </Box>
        </Tabs.Content>

        <Tabs.Content value="scale">
          <Box mt={4} color="gray.700">
            Demo content (Scale) – 待完善
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}

export function PosthogLanding() {
  const { t } = useI18n()
  const { language, setLanguage } = useLocale()
  const [windowOpen, setWindowOpen] = useState(true)
  const [view, setView] = useState<WindowView>({ kind: "home" })

  const caseById = useMemo(() => {
    return new Map(POSTHOG_DEMO_CASES.map((c) => [c.id, c] as const))
  }, [])

  const windowTitle = useMemo(() => {
    if (view.kind === "home" || view.kind === "posthog")
      return t("posthogDemo.window.homeTitle")
    if (view.kind === "url") return view.title
    if (view.kind === "calculator")
      return t("posthogDemo.window.calculatorTitle", { id: view.id })
    if (view.kind === "flowDocs") return t("posthogDemo.window.flowComponentsTitle")
    if (view.kind === "case") {
      const spec = caseById.get(view.id)
      return spec ? t(spec.titleKey) : view.id
    }
    return "home"
  }, [caseById, t, view])

  const openHome = () => {
    setView({ kind: "home" })
    setWindowOpen(true)
  }

  const openPosthog = () => {
    openHome()
  }

  const openCalculator = (id: CalculatorId) => {
    setView({ kind: "calculator", id })
    setWindowOpen(true)
  }

  const openUrl = (url: string, title: string) => {
    if (url === "/login" || url === "/signup") {
      window.location.assign(url)
      return
    }

    const nextUrl = (() => {
      if (!url.startsWith("/")) return url
      try {
        const u = new URL(url, window.location.origin)
        if (!u.searchParams.has("embed")) {
          u.searchParams.set("embed", "1")
        }
        return `${u.pathname}${u.search}${u.hash}`
      } catch {
        return url
      }
    })()

    setView({ kind: "url", url: nextUrl, title })
    setWindowOpen(true)
  }

  const openCase = (id: CaseId) => {
    setView({ kind: "case", id })
    setWindowOpen(true)
  }

  const openFlowDocs = () => {
    setView({ kind: "flowDocs" })
    setWindowOpen(true)
  }

  const windowBody = useMemo(() => {
    if (view.kind === "home" || view.kind === "posthog") {
      return (
        <Box w="full" h="full" overflow="hidden" bg="white">
          <iframe
            title="Current home page"
            src="/midday-style?embed=1"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </Box>
      )
    }

    if (view.kind === "url") {
      return (
        <Box w="full" h="full" overflow="hidden" bg="white">
          <iframe
            title={view.title}
            src={view.url}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </Box>
      )
    }

    if (view.kind === "flowDocs") {
      return <FlowComponentsDocs />
    }

    if (view.kind === "case") {
      const spec = caseById.get(view.id)
      if (!spec) {
        return (
          <Box w="full" h="full" p={6} bg="white">
            <Text color="red.600" fontSize="sm">
              {t("posthogDemo.window.unknownCase", { id: view.id })}
            </Text>
          </Box>
        )
      }

      return (
        <Box w="full" h="full" overflow="hidden" bg="white">
          <VStack align="stretch" gap={0} h="full">
            <Flex
              align="center"
              gap={3}
              px={4}
              py={3}
              borderBottomWidth="1px"
              borderBottomColor="rgba(0,0,0,0.12)"
              bg="rgba(248,247,244,0.92)"
            >
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                  {t(spec.titleKey)}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {spec.subtitle}
                </Text>
              </Box>
              <Box flex="1" />
              <Button asChild size="sm" variant="outline">
                <a href={spec.jsonUrl} download={spec.downloadFilename}>
                  {t("posthogDemo.case.downloadJson")}
                </a>
              </Button>
            </Flex>

            <Box flex="1" overflow="hidden">
              <iframe
                title={t(spec.titleKey)}
                src={`/openflow?embed=1&src=${encodeURIComponent(spec.jsonUrl)}`}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            </Box>
          </VStack>
        </Box>
      )
    }

    if (view.kind === "calculator") {
      const content =
        view.id === "lsi" ? (
          <LSICalculator />
        ) : view.id === "standardAO" ? (
          <StandardAO />
        ) : view.id === "aor" ? (
          <AORCalculator />
        ) : (
          <DWACalculator />
        )

      return (
        <Box w="full" h="full" overflow="auto" bg="white">
          {content}
        </Box>
      )
    }

    return (
      <Box w="full" h="full" overflow="auto" p={{ base: 4, md: 6 }} bg="transparent">
        <VStack align="start" gap={5}>
          <Text fontSize="sm" color="gray.700">
            Demo page: PostHog-style landing (WIP)
          </Text>

          <Heading size={{ base: "lg", md: "xl" }} color="gray.900">
            We make dev tools that help product engineers build successful
            products.
          </Heading>

          <HStack gap={3} flexWrap="wrap">
            <Button
              asChild
              bg="#e0a73b"
              color="black"
              borderWidth="2px"
              borderColor="rgba(0,0,0,0.25)"
              _hover={{ bg: "#d99b22" }}
            >
              <Link to="/login">{t("posthogDemo.header.getStartedFree")}</Link>
            </Button>
            <Button
              variant="outline"
              borderWidth="2px"
              borderColor="rgba(0,0,0,0.25)"
              bg="rgba(255,255,255,0.55)"
              _hover={{ bg: "rgba(255,255,255,0.85)" }}
            >
              Install with AI
            </Button>
          </HStack>

          <HStack gap={2} flexWrap="wrap">
            <Text fontSize="sm" color="gray.700">
              Questions?
            </Text>
            <Text
              asChild
              fontSize="sm"
              color="gray.800"
              fontWeight="semibold"
              textDecoration="underline"
            >
              <Link to="/ai-deep-research">Watch a demo</Link>
            </Text>
            <Text fontSize="sm" color="gray.700">
              or
            </Text>
            <Text
              asChild
              fontSize="sm"
              color="gray.800"
              fontWeight="semibold"
              textDecoration="underline"
            >
              <Link to="/showcase">talk to a human</Link>
            </Text>
          </HStack>

          <ExploreAppsPanel onOpenCalculator={openCalculator} />

          <Box
            w="full"
            borderTopWidth="1px"
            borderTopColor="rgba(0,0,0,0.10)"
            pt={4}
          >
            <HStack gap={2}>
              <Input
                placeholder="Quick search (demo)"
                bg="rgba(255,255,255,0.7)"
                borderColor="rgba(0,0,0,0.15)"
              />
              <Button variant="outline">Search</Button>
            </HStack>
          </Box>
        </VStack>
      </Box>
    )
  }, [caseById, openCalculator, view])

  return (
    <Box
      minH="100vh"
      bg="#ece3cb"
      position="relative"
      overflow="hidden"
      css={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "6px 6px",
      }}
    >
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        h="56px"
        position="sticky"
        top="0"
        zIndex={10}
        bg="rgba(236,227,203,0.92)"
        backdropFilter="blur(10px)"
        borderBottomWidth="1px"
        borderBottomColor="rgba(0,0,0,0.08)"
      >
        <HStack gap={4} flexWrap="wrap">
          <HStack gap={2} asChild>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Image
                src="/assets/images/E-logos-1.png"
                alt={t("app.logoAlt")}
                boxSize={6}
              />
              <Heading
                size="md"
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
        </HStack>

        <HStack gap={2}>
          <HStack gap={2} display={{ base: "none", md: "flex" }}>
            <Button
              size="sm"
              variant={language === "zh" ? "solid" : "outline"}
              onClick={() => setLanguage("zh")}
            >
              {t("language.zh")}
            </Button>
            <Button
              size="sm"
              variant={language === "en" ? "solid" : "outline"}
              onClick={() => setLanguage("en")}
            >
              {t("language.en")}
            </Button>
          </HStack>
          <Button
            asChild
            size="sm"
            bg="#e0a73b"
            color="black"
            borderWidth="2px"
            borderColor="rgba(0,0,0,0.25)"
            _hover={{ bg: "#d99b22" }}
          >
            <Link to="/login">{t("posthogDemo.header.getStartedFree")}</Link>
          </Button>
        </HStack>
      </Flex>

      <Box
        position="absolute"
        right={{ base: 6, md: 10 }}
        bottom={{ base: 8, md: 10 }}
        zIndex={1}
        display={{ base: "none", md: "block" }}
        maxW="520px"
        w="420px"
        pointerEvents="auto"
      >
        <AspectRatio ratio={1}>
          <Box
            borderRadius="2xl"
            overflow="hidden"
            shadow="2xl"
            transform="rotate(3deg)"
            _hover={{ transform: "rotate(0deg)" }}
            transition="all 0.5s ease"
          >
            <Image
              alt="handwriting"
              objectFit="contain"
              w="full"
              h="full"
              src="/assets/images/handwriting.jpeg"
              draggable={false}
            />
          </Box>
        </AspectRatio>
      </Box>

      <Box
        position="absolute"
        left="50%"
        top="50%"
        transform="translate(-50%, -50%)"
        zIndex={0}
        pointerEvents="none"
        display={{ base: "none", md: "block" }}
        w="720px"
        maxW="70vw"
        opacity={0.55}
      >
        <Image
          alt="handwriting text"
          src="/assets/images/text_only_handwriting.png"
          w="full"
          h="auto"
          objectFit="contain"
          draggable={false}
        />
      </Box>

      <Box
        position="absolute"
        left={{ base: 2, md: 6 }}
        top={{ base: "calc(56px + 48px)", md: "calc(56px + 48px)" }}
        zIndex={2}
        display={{ base: "none", md: "block" }}
      >
        <Box
          display="grid"
          gridTemplateColumns="repeat(2, 92px)"
          gap={3}
          alignItems="start"
        >
          {desktopIconsLeft.map((i) => (
            <DesktopIcon
              key={i.id}
              label={i.labelKey ? t(i.labelKey) : (i.label ?? i.id)}
              iconSrc={i.iconSrc}
              disabled={i.disabled}
              onOpenWindow={
                i.window
                  ? () => {
                    const windowTarget = i.window
                    if (!windowTarget) return

                    if (windowTarget.kind === "home") openHome()
                    else if (windowTarget.kind === "calculator")
                      openCalculator(windowTarget.id)
                    else if (windowTarget.kind === "url")
                      openUrl(windowTarget.url, windowTarget.title)
                    else if (windowTarget.kind === "case")
                      openCase(windowTarget.id)
                    else if (windowTarget.kind === "flowDocs") openFlowDocs()
                    else openPosthog()
                  }
                : undefined
              }
            />
          ))}
        </Box>
      </Box>

      <Box
        position="absolute"
        right={{ base: 2, md: 6 }}
        top={{ base: "calc(56px + 48px)", md: "calc(56px + 48px)" }}
        zIndex={2}
        display={{ base: "none", md: "block" }}
      >
        <VStack align="end" gap={1}>
          {desktopIconsRight.map((i) => (
            <DesktopIcon
              key={i.id}
              label={i.labelKey ? t(i.labelKey) : (i.label ?? i.id)}
              iconSrc={i.iconSrc}
              disabled={i.disabled}
              onOpenWindow={
                i.window
                  ? () => {
                      const windowTarget = i.window
                      if (!windowTarget) return

                      if (windowTarget.kind === "home") openHome()
                      else if (windowTarget.kind === "calculator")
                        openCalculator(windowTarget.id)
                      else if (windowTarget.kind === "url")
                        openUrl(windowTarget.url, windowTarget.title)
                      else if (windowTarget.kind === "case")
                        openCase(windowTarget.id)
                      else if (windowTarget.kind === "flowDocs") openFlowDocs()
                      else openPosthog()
                    }
                  : undefined
              }
            />
          ))}
        </VStack>
      </Box>

      {windowOpen ? (
        <DesktopWindow
          title={windowTitle}
          onClose={() => setWindowOpen(false)}
        >
          {windowBody}
        </DesktopWindow>
      ) : null}
    </Box>
  )
}
