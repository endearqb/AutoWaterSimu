import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Heading,
  HStack,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import {
  type KeyboardEvent,
  type UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  analyzeExpression,
  type DecoratedExpressionToken,
  type ExpressionCellType,
} from "./expressionEditorUtils"

interface ExpressionCellEditorDialogProps {
  open: boolean
  cellType: ExpressionCellType
  processIndex: number
  processName: string
  componentName?: string
  initialValue: string
  componentNames: string[]
  parameterNames: string[]
  onSave: (nextValue: string) => void
  onClose: () => void
}

const expressionFontStyle = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
  fontSize: "sm",
  lineHeight: "1.6",
}

const renderDecoratedTokens = (tokens: DecoratedExpressionToken[]) => {
  if (tokens.length === 0) {
    return null
  }

  return tokens.map((token, index) => (
    <Box
      as="span"
      key={`${token.start}-${token.end}-${index}`}
      color={token.color}
      fontWeight={
        token.role === "component" || token.role === "parameter"
          ? "semibold"
          : "normal"
      }
    >
      {token.value}
    </Box>
  ))
}

function ExpressionCellEditorDialog({
  open,
  cellType,
  processIndex,
  processName,
  componentName,
  initialValue,
  componentNames,
  parameterNames,
  onSave,
  onClose,
}: ExpressionCellEditorDialogProps) {
  const [draftValue, setDraftValue] = useState(initialValue)
  const highlightLayerRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open) return
    setDraftValue(initialValue)
    requestAnimationFrame(() => {
      const target = textareaRef.current
      if (!target) return
      target.focus()
      const caret = target.value.length
      target.setSelectionRange(caret, caret)
    })
  }, [open, initialValue, cellType, processIndex, componentName])

  const analysis = useMemo(
    () =>
      analyzeExpression(draftValue, {
        cellType,
        componentNames,
        parameterNames,
      }),
    [draftValue, cellType, componentNames, parameterNames],
  )

  const dialogTitle =
    cellType === "rateExpr"
      ? `Edit rateExpr - Process ${processIndex + 1}`
      : `Edit stoich - Process ${processIndex + 1} / ${componentName || "-"}`

  const processLabel = processName.trim() || `process_${processIndex + 1}`

  const insertSymbolAtCursor = (symbol: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart ?? draftValue.length
    const end = textarea.selectionEnd ?? draftValue.length
    const nextValue = `${draftValue.slice(0, start)}${symbol}${draftValue.slice(end)}`

    setDraftValue(nextValue)
    requestAnimationFrame(() => {
      textarea.focus()
      const nextCursor = start + symbol.length
      textarea.setSelectionRange(nextCursor, nextCursor)
    })
  }

  const handleTextareaScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    const highlightLayer = highlightLayerRef.current
    if (!highlightLayer) return
    highlightLayer.scrollTop = event.currentTarget.scrollTop
    highlightLayer.scrollLeft = event.currentTarget.scrollLeft
  }

  const handleEditorHotkeys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault()
      onSave(draftValue)
      onClose()
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="min(1200px, 96vw)" maxH="90vh" overflow="hidden">
          <Dialog.Header>
            <VStack align="stretch" gap={1}>
              <Dialog.Title>{dialogTitle}</Dialog.Title>
              <HStack gap={2}>
                <Badge colorPalette="blue" variant="subtle">
                  {cellType}
                </Badge>
                <Text fontSize="sm" color="fg.muted">
                  {processLabel}
                </Text>
              </HStack>
            </VStack>
          </Dialog.Header>

          <Dialog.Body>
            <Flex direction={{ base: "column", lg: "row" }} gap={4} align="stretch">
              <VStack align="stretch" gap={3} flex="1 1 auto" minW={0}>
                <Heading size="xs">Expression Editor</Heading>
                <Box
                  position="relative"
                  minH="280px"
                  borderWidth="1px"
                  borderRadius="md"
                  bg="bg"
                  overflow="hidden"
                >
                  <Box
                    ref={highlightLayerRef}
                    pointerEvents="none"
                    position="absolute"
                    inset={0}
                    px={3}
                    py={2}
                    overflow="hidden"
                    whiteSpace="pre-wrap"
                    wordBreak="break-word"
                    {...expressionFontStyle}
                  >
                    {draftValue ? (
                      renderDecoratedTokens(analysis.tokens)
                    ) : (
                      <Text color="fg.muted">
                        Enter expression, e.g. u_H*(S_S/(K_S+S_S))*X_BH
                      </Text>
                    )}
                    {draftValue.endsWith("\n") ? "\n" : null}
                  </Box>
                  <Textarea
                    ref={textareaRef}
                    value={draftValue}
                    onChange={(event) => setDraftValue(event.target.value)}
                    onScroll={handleTextareaScroll}
                    onKeyDown={handleEditorHotkeys}
                    spellCheck={false}
                    resize="none"
                    h="full"
                    position="absolute"
                    inset={0}
                    px={3}
                    py={2}
                    bg="transparent"
                    color="transparent"
                    caretColor="var(--chakra-colors-fg)"
                    border="none"
                    _focusVisible={{
                      outline: "none",
                    }}
                    {...expressionFontStyle}
                  />
                </Box>

                <HStack gap={2} wrap="wrap">
                  <Badge colorPalette="gray" variant="outline">
                    Ctrl/Cmd + Enter to save
                  </Badge>
                  <Badge colorPalette="gray" variant="outline">
                    Esc to cancel
                  </Badge>
                </HStack>

                <VStack
                  align="stretch"
                  gap={2}
                  borderWidth="1px"
                  borderRadius="md"
                  p={3}
                  minH="96px"
                  maxH="180px"
                  overflowY="auto"
                >
                  <Heading size="xs">Real-time Validation (Warning only)</Heading>
                  {analysis.issues.length === 0 ? (
                    <Text fontSize="sm" color="green.600">
                      No obvious issues found.
                    </Text>
                  ) : (
                    analysis.issues.map((issue) => (
                      <HStack key={`${issue.code}-${issue.message}`} align="start">
                        <Badge colorPalette="orange" variant="subtle" mt={0.5}>
                          Warning
                        </Badge>
                        <Text fontSize="sm">{issue.message}</Text>
                      </HStack>
                    ))
                  )}
                </VStack>
              </VStack>

              <VStack
                align="stretch"
                gap={3}
                flex={{ base: "1 1 auto", lg: "0 0 300px" }}
                minW={{ base: 0, lg: "300px" }}
              >
                <Box borderWidth="1px" borderRadius="md" p={3}>
                  <Heading size="xs" mb={2}>
                    Variables
                  </Heading>
                  <VStack align="stretch" gap={2} maxH="180px" overflowY="auto">
                    {componentNames.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        No variables available.
                      </Text>
                    ) : (
                      componentNames.map((name) => (
                        <Button
                          key={`component-${name}`}
                          size="xs"
                          variant="subtle"
                          justifyContent="flex-start"
                          onClick={() => insertSymbolAtCursor(name)}
                        >
                          {name}
                        </Button>
                      ))
                    )}
                  </VStack>
                </Box>

                <Box borderWidth="1px" borderRadius="md" p={3}>
                  <Heading size="xs" mb={2}>
                    Parameters
                  </Heading>
                  <VStack align="stretch" gap={2} maxH="220px" overflowY="auto">
                    {parameterNames.length === 0 ? (
                      <Text fontSize="sm" color="fg.muted">
                        No parameters available.
                      </Text>
                    ) : (
                      parameterNames.map((name) => (
                        <Button
                          key={`parameter-${name}`}
                          size="xs"
                          variant="subtle"
                          justifyContent="flex-start"
                          onClick={() => insertSymbolAtCursor(name)}
                        >
                          {name}
                        </Button>
                      ))
                    )}
                  </VStack>
                </Box>
              </VStack>
            </Flex>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack gap={2}>
              <Button variant="subtle" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSave(draftValue)
                  onClose()
                }}
              >
                Save
              </Button>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

export default ExpressionCellEditorDialog
