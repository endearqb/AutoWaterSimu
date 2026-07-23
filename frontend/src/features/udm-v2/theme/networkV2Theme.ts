import type { SystemStyleObject } from "@chakra-ui/react"

export const networkV2NodeSurface = ({
  accent,
  selected,
  tint,
}: {
  accent: string
  selected: boolean
  tint: string
}): SystemStyleObject => ({
  minW: "168px",
  maxW: "240px",
  minH: "40px",
  position: "relative",
  borderWidth: "1px",
  borderColor: "rgba(255,255,255,0.55)",
  borderRadius: "6px",
  bg: tint,
  backdropFilter: "blur(8px)",
  boxShadow:
    "inset -2px -2px 8px rgba(255,255,255,.7), inset 2px 2px 6px rgba(15,23,42,.08), 4px 4px 14px rgba(15,23,42,.16)",
  outline: selected ? `2px solid ${accent}` : "0 solid transparent",
  outlineOffset: selected ? "2px" : "0",
  transition: "box-shadow .18s ease, outline-width .18s ease",
  _hover: { boxShadow: "0 8px 24px rgba(15,23,42,.2)" },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
})
