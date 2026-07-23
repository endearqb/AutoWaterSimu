import {
  Box,
  Button,
  Dialog,
  Input,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useMemo, useState } from "react"

import { useUdmV2Messages } from "../i18n"
import type { UdmV2GraphSummary } from "../services/standaloneFlowchartAdapter"

export function NetworkV2LoadDialog({
  error,
  graphs,
  loading,
  onClose,
  onLoad,
  open,
}: {
  error: boolean
  graphs: UdmV2GraphSummary[]
  loading: boolean
  onClose: () => void
  onLoad: (id: string) => void
  open: boolean
}) {
  const text = useUdmV2Messages()
  const [query, setQuery] = useState("")
  const filtered = useMemo(
    () =>
      graphs.filter((graph) =>
        `${graph.name} ${graph.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [graphs, query],
  )

  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: nextOpen }) => !nextOpen && onClose()}
      placement="center"
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{text.load}</Dialog.Title>
              <Dialog.Description>{text.loadDescription}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={3}>
                <Input
                  aria-label={text.search}
                  placeholder={text.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {loading && <Text>{text.loading}</Text>}
                {error && <Text color="red.600">{text.loadFailed}</Text>}
                {!loading && !error && filtered.length === 0 && (
                  <Text color="fg.muted">{text.empty}</Text>
                )}
                {filtered.map((graph) => (
                  <Button
                    key={graph.id}
                    variant="outline"
                    justifyContent="flex-start"
                    onClick={() => onLoad(graph.id)}
                  >
                    <Box textAlign="left">
                      <Text fontWeight="600">{graph.name}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {graph.id}
                      </Text>
                    </Box>
                  </Button>
                ))}
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                {text.close}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
