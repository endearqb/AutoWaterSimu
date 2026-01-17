import { defineRecipe } from "@chakra-ui/react"

export const buttonRecipe = defineRecipe({
  base: {
    fontWeight: "medium", // 从 "bold" 改为 "medium"
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "full",
    transition: "all 0.2s",
  },
  variants: {
    variant: {
      solid: {
        bg: "button.primary.bg",
        color: "button.primary.text",
        _hover: {
          bg: "button.primary.hover",
        },
      },
      ghost: {
        bg: "transparent",
        color: "text.primary",
        _hover: {
          bg: "border.primary",
        },
      },
      outline: {
        bg: "transparent",
        color: "text.primary",
        border: "1px solid",
        borderColor: "border.primary",
        _hover: {
          bg: "border.primary",
        },
      },
    },
    size: {
      sm: {
        px: 8, // 32px (从 3 增加到 8)
        py: 4.5, // 18px (从 2 增加到 4.5)
        fontSize: "sm",
      },
      md: {
        px: 8, // 32px (从 4 增加到 8)
        py: 5, // 20px (从 2 增加到 5)
        fontSize: "md",
      },
      lg: {
        px: 9, // 36px (从 6 增加到 9)
        py: 6, // 24px (从 3 增加到 6)
        fontSize: "lg",
      },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
})
