export const HEAD_BAR_STYLE = {
  bg: "rgba(255,255,255,0.7)",
  borderWidth: "1px",
  borderColor: "gray.300",
  borderRadius: "md",
  backdropFilter: "blur(12px)",
  _dark: { bg: "rgba(17,24,39,0.6)", borderColor: "gray.600" },
} as const

export const GROUP_FRAME_STYLE = {
  bg: "transparent",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "gray.300",
  borderRadius: "md",
  _dark: { borderColor: "gray.600" },
} as const
