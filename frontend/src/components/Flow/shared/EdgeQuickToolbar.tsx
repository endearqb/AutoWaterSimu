import { Box, Button, HStack } from "@chakra-ui/react"
import type { ReactNode } from "react"

export type EdgeQuickToolbarOption<T extends string> = {
  value: T
  label: string
  shortLabel: string
  icon?: ReactNode
  accent?: string
  disabled?: boolean
}

type EdgeQuickToolbarProps<T extends string> = {
  ariaLabel: string
  value: T
  options: EdgeQuickToolbarOption<T>[]
  onChange: (value: T) => void
}

/**
 * Presentation-only toolbar shared by flow editors.
 * Edge compatibility and mutation rules remain owned by the calling feature.
 */
export function EdgeQuickToolbar<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: EdgeQuickToolbarProps<T>) {
  return (
    <Box
      role="toolbar"
      aria-label={ariaLabel}
      bg="rgba(255,255,255,.94)"
      borderWidth="1px"
      borderColor="border"
      borderRadius="6px"
      boxShadow="0 6px 18px rgba(15,23,42,.16)"
      backdropFilter="blur(8px)"
      p={1}
    >
      <HStack gap={1}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <Button
              key={option.value}
              type="button"
              size="xs"
              minW="44px"
              h="26px"
              px={1.5}
              variant={active ? "solid" : "ghost"}
              bg={active ? option.accent : undefined}
              color={active ? "white" : "fg"}
              title={option.label}
              aria-label={option.label}
              aria-pressed={active}
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
              _hover={{
                bg: active ? option.accent : "bg.muted",
              }}
            >
              {option.icon}
              {option.shortLabel}
            </Button>
          )
        })}
      </HStack>
    </Box>
  )
}
