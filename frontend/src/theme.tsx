import { createSystem, defaultConfig } from "@chakra-ui/react"
import { buttonRecipe } from "./theme/button.recipe"
import { glassNodeRecipe, nodeHandleRecipe } from "./theme/glass.recipe"

export const system = createSystem(defaultConfig, {
  globalCss: {
    html: {
      fontSize: "16px",
      backgroundColor: "background.primary",
      margin: 0,
      padding: 0,
    },
    body: {
      fontSize: "0.875rem",
      margin: 0,
      padding: 0,
      color: "text.primary",
      backgroundColor: "background.primary",
    },
    ".main-link": {
      color: "ui.main",
      fontWeight: "bold",
    },
    ".react-flow__attribution": {
      display: "none !important",
    },
    ".react-flow__minimap-mask a": {
      display: "none !important",
    },
  },
  theme: {
    tokens: {
      colors: {
        // 语义颜色：与 Prose 等组件约定的 token 对齐
        fg: {
          default: { value: "hsl(222.2 84% 4.9%)" },
          muted: { value: "hsl(215.4 16.3% 46.9%)" },
          subtle: { value: "hsl(215 20% 65%)" },
        },
        bg: {
          subtle: { value: "hsl(214.3 31.8% 91.4%)" },
        },
        text: {
          primary: { value: "hsl(222.2 84% 4.9%)" },
          secondary: { value: "hsl(215.4 16.3% 46.9%)" },
          disabled: { value: "hsl(215.4 16.3% 56.9%)" },
        },
        button: {
          primary: {
            bg: { value: "hsl(222.2 47.4% 11.2%)" },
            text: { value: "hsl(210 40% 98%)" },
            hover: { value: "hsl(222.2 47.4% 11.2% / 0.9)" },
          },
        },
        background: {
          primary: { value: "hsl(192 85% 99.5%)" },
          card: { value: "hsl(0 0% 100%)" },
        },
        border: {
          primary: { value: "hsl(214.3 31.8% 91.4%)" },
          muted: { value: "hsl(214.3 31.8% 85%)" },
        },
        ui: {
          main: { value: "hsl(222.2 47.4% 11.2%)" },
        },
        glass: {
          base: { value: "rgba(255,255,255,0.60)" },
          border: { value: "rgba(255,255,255,0.40)" },
          innerLight: { value: "rgba(255,255,255,0.65)" },
          innerDark: { value: "rgba(0,0,0,0.08)" },
          outerLight: { value: "rgba(255,255,255,0.60)" },
          outerDark: { value: "rgba(0,0,0,0.12)" },
          blur: { value: "8px" },
          tint: {
            default: { value: "hsla(258, 60%, 60%, 0.14)" },
            input: { value: "hsla(30, 70%, 62%, 0.14)" },
            output: { value: "hsla(210, 72%, 65%, 0.14)" },
            asm1: { value: "hsla(143, 58%, 46%, 0.14)" },
            asm3: { value: "hsla(224, 64%, 56%, 0.14)" },
            asmslim: { value: "hsla(142, 54%, 58%, 0.14)" },
            cash: { value: "hsla(158, 58%, 58%, 0.14)" },
            goal: { value: "hsla(38, 78%, 60%, 0.14)" },
            traffic: { value: "hsla(158, 58%, 56%, 0.14)" },
          },
        },
      },
    },
    recipes: {
      button: buttonRecipe,
      glassNode: glassNodeRecipe,
      nodeHandle: nodeHandleRecipe,
    },
  },
})
