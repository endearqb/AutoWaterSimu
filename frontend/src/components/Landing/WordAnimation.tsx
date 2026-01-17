import { Text } from "@chakra-ui/react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

const words = [
  "物料平衡",
  "ASM1Slim",
  "Classic ASM1",
  "ASM2D",
  "ASM3",
  "自定义模型",
  "AI & Models",
]

function useWordCycle(words: string[], interval: number) {
  const [index, setIndex] = useState(0)
  const [isInitial, setIsInitial] = useState(true)

  useEffect(() => {
    if (isInitial) {
      setIndex(Math.floor(Math.random() * words.length))
      setIsInitial(false)
      return
    }

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % words.length)
    }, interval)
    return () => clearInterval(timer)
  }, [words, interval, isInitial])

  return words[index]
}

export function WordAnimation() {
  const word = useWordCycle(words, 2100)

  return (
    <AnimatePresence mode="wait">
      <motion.div key={word} style={{ display: "inline-block" }}>
        {word.split("").map((char, i) => (
          <motion.span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              lineHeight: 1,
              whiteSpace: "pre",
              willChange: "transform, opacity",
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.28, delay: i * 0.03, ease: "easeOut" }}
          >
            <Text
              as="span"
              bgGradient="to-r"
              gradientFrom="hsl(192,85%,52%)"
              gradientTo="hsl(212,98%,55%)"
              bgClip="text"
            >
              {char}
            </Text>
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
