import { Text } from "@chakra-ui/react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface AnimatedTextProps {
  text: string
  tag?: keyof JSX.IntrinsicElements
  fontSize?: any
  fontWeight?: any
  color?: string
  delay?: number
  duration?: number
  textAlign?: "left" | "center" | "right"
}

export function AnimatedText({
  text,
  tag = "h2",
  fontSize,
  fontWeight,
  color,
  delay = 15,
  duration = 0.15,
  textAlign = "center",
}: AnimatedTextProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Text
      as={tag}
      fontSize={fontSize}
      fontWeight={fontWeight}
      color={color}
      textAlign={textAlign}
      display="inline-block"
    >
      {isVisible &&
        text.split("").map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: duration,
              delay: index * (delay / 1000),
              ease: "easeOut",
            }}
            style={{ display: "inline-block", whiteSpace: "pre" }}
          >
            {char}
          </motion.span>
        ))}
    </Text>
  )
}

export default AnimatedText
