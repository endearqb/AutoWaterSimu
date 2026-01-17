import type { InputProps } from "@chakra-ui/react"

export const INLINE_EDIT_INPUT_PROPS: InputProps = {
  px: 0,
  py: 0,
  height: "auto",
  minH: "unset",
  width: "auto",
  maxW: "100%",
  minW: 0,
  border: "none",
  borderWidth: 0,
  borderRadius: 0,
  borderColor: "transparent",
  outline: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
  lineHeight: "short",
  _focus: {
    outline: "none",
    border: "none",
    boxShadow: "none",
  },
  _focusVisible: {
    outline: "none",
    border: "none",
    boxShadow: "none",
  },
  _hover: {
    border: "none",
    boxShadow: "none",
  },
}
