import { defineRecipe } from "@chakra-ui/react"

const blurVar = "var(--chakra-colors-glass-blur, 8px)"

export const glassNodeRecipe = defineRecipe({
  base: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "glass.border",
    borderRadius: "xl",
    backgroundColor: "glass.base",
    color: "text.primary",
    boxShadow: [
      "inset 1px 1px 2px rgba(255,255,255,0.65)",
      "inset -2px -2px 6px rgba(0,0,0,0.08)",
      "-6px -6px 14px rgba(255,255,255,0.6)",
      "6px 6px 18px rgba(0,0,0,0.12)",
    ].join(", "),
    backdropFilter: `blur(${blurVar})`,
    transitionProperty: "box-shadow, outline, outline-offset",
    transitionDuration: "200ms",
    position: "relative",
    overflow: "hidden",
  },
  variants: {
    tint: {
      default: {
        backgroundColor: "glass.tint.default",
        "--glass-outline-color": "hsla(258, 60%, 60%, 0.7)",
      },
      input: {
        backgroundColor: "glass.tint.input",
        "--glass-outline-color": "hsla(30, 70%, 62%, 0.7)",
      },
      output: {
        backgroundColor: "glass.tint.output",
        "--glass-outline-color": "hsla(210, 72%, 65%, 0.7)",
      },
      asm1: {
        backgroundColor: "glass.tint.asm1",
        "--glass-outline-color": "hsla(143, 58%, 46%, 0.7)",
      },
      asm3: {
        backgroundColor: "glass.tint.asm3",
        "--glass-outline-color": "hsla(224, 64%, 56%, 0.7)",
      },
      asmslim: {
        backgroundColor: "glass.tint.asmslim",
        "--glass-outline-color": "hsla(142, 54%, 58%, 0.7)",
      },
      cash: {
        backgroundColor: "glass.tint.cash",
        "--glass-outline-color": "hsla(158, 58%, 58%, 0.7)",
      },
      goal: {
        backgroundColor: "glass.tint.goal",
        "--glass-outline-color": "hsla(38, 78%, 60%, 0.7)",
      },
      traffic: {
        backgroundColor: "glass.tint.traffic",
        "--glass-outline-color": "hsla(158, 58%, 56%, 0.7)",
      },
    },
  },
  defaultVariants: {
    tint: "default",
  },
})

export const nodeHandleRecipe = defineRecipe({
  base: {
    width: "6px",
    height: "6px",
    borderRadius: "full",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "white",
    transitionProperty: "opacity, transform",
    transitionDuration: "150ms",
    opacity: 0,
    transform: "scale(0.85)",
  },
  variants: {
    tint: {
      default: { backgroundColor: "glass.tint.default" },
      input: { backgroundColor: "glass.tint.input" },
      output: { backgroundColor: "glass.tint.output" },
      asm1: { backgroundColor: "glass.tint.asm1" },
      asm3: { backgroundColor: "glass.tint.asm3" },
      asmslim: { backgroundColor: "glass.tint.asmslim" },
      cash: { backgroundColor: "glass.tint.cash" },
      goal: { backgroundColor: "glass.tint.goal" },
      traffic: { backgroundColor: "glass.tint.traffic" },
    },
    visible: {
      shown: { opacity: 1, transform: "scale(1)" },
      hidden: { opacity: 0, transform: "scale(0.85)" },
    },
  },
  defaultVariants: {
    tint: "default",
    visible: "hidden",
  },
})
