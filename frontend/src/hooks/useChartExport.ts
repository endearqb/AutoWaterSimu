import { snapdom } from "@zumer/snapdom"
import { type RefObject, useCallback } from "react"

export interface ChartExportOptions {
  filename?: string
  backgroundColor?: string
  scale?: number
  quality?: number
  format?: "png" | "jpeg" | "jpg"
  useProxy?: string
}

// 颜色兼容性兜底：将 CSS 变量和 color() 表达式转换为静态值，避免导出偏差
const fixColorCompatibility = (element: HTMLElement) => {
  const elementsToFix: {
    element: HTMLElement
    originalStyles: Record<string, string>
  }[] = []

  const processElement = (el: HTMLElement) => {
    const computedStyle = window.getComputedStyle(el)
    const originalStyles: Record<string, string> = {}
    let needsFix = false

    const propertiesToCheck = [
      "backgroundColor",
      "borderColor",
      "color",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
    ]

    propertiesToCheck.forEach((prop) => {
      const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase()
      const value = computedStyle.getPropertyValue(cssProp)

      if (
        !value ||
        (!value.includes("color(") &&
          !value.includes("var(") &&
          value !== "transparent")
      ) {
        return
      }

      originalStyles[prop] = el.style.getPropertyValue(cssProp)
      needsFix = true

      if (value === "transparent") {
        el.style.setProperty(cssProp, "rgba(0,0,0,0)")
        return
      }

      if (value.includes("color(")) {
        const tempDiv = document.createElement("div")
        tempDiv.style.color = value
        document.body.appendChild(tempDiv)
        const computedColor = window.getComputedStyle(tempDiv).color
        document.body.removeChild(tempDiv)
        el.style.setProperty(cssProp, computedColor || "#000000")
        return
      }

      if (value.includes("var(")) {
        const variableName = value.slice(4, -1).trim()
        const actualValue = computedStyle.getPropertyValue(variableName)
        el.style.setProperty(cssProp, actualValue || "#000000")
      }
    })

    if (needsFix) {
      elementsToFix.push({ element: el, originalStyles })
    }

    Array.from(el.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        processElement(child)
      }
    })
  }

  processElement(element)
  return elementsToFix
}

const restoreOriginalStyles = (
  elementsToRestore: {
    element: HTMLElement
    originalStyles: Record<string, string>
  }[],
) => {
  elementsToRestore.forEach(({ element, originalStyles }) => {
    Object.entries(originalStyles).forEach(([prop, value]) => {
      const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase()
      if (value) {
        element.style.setProperty(cssProp, value)
      } else {
        element.style.removeProperty(cssProp)
      }
    })
  })
}

export const useChartExport = () => {
  const exportChart = useCallback(
    async (element: HTMLElement | null, options: ChartExportOptions = {}) => {
      if (!element) {
        throw new Error("Element not found for export")
      }

      const {
        filename = "chart",
        backgroundColor = "#ffffff",
        scale = 2,
        quality = 0.95,
        format = "png",
        useProxy,
      } = options

      let elementsToRestore: {
        element: HTMLElement
        originalStyles: Record<string, string>
      }[] = []

      const originalStyle = {
        overflow: element.style.overflow,
        whiteSpace: element.style.whiteSpace,
        wordWrap: element.style.wordWrap,
      }

      let stylesRestored = false

      const restoreAllStyles = () => {
        if (stylesRestored) {
          return
        }

        element.style.overflow = originalStyle.overflow
        element.style.whiteSpace = originalStyle.whiteSpace
        element.style.wordWrap = originalStyle.wordWrap
        restoreOriginalStyles(elementsToRestore)
        stylesRestored = true
      }

      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 100))

        elementsToRestore = fixColorCompatibility(element)

        element.style.overflow = "visible"
        element.style.whiteSpace = "nowrap"
        element.style.wordWrap = "normal"

        await new Promise<void>((resolve) => setTimeout(resolve, 100))

        const rect = element.getBoundingClientRect()
        const scrollWidth = element.scrollWidth
        const scrollHeight = element.scrollHeight

        const actualWidth = Math.max(rect.width, scrollWidth)
        const actualHeight = Math.max(rect.height, scrollHeight)

        const normalizedFormat = format === "jpeg" ? "jpg" : format

        const snapdomOptions: Record<string, unknown> = {
          type: normalizedFormat,
          backgroundColor,
          scale,
          width: actualWidth,
          height: actualHeight,
        }

        if (normalizedFormat === "jpg" && typeof quality === "number") {
          snapdomOptions.quality = quality
        }

        if (useProxy) {
          snapdomOptions.useProxy = useProxy
        }

        const blob = await snapdom.toBlob(element, snapdomOptions)

        if (!blob) {
          throw new Error("Failed to create blob from SnapDOM")
        }

        restoreAllStyles()

        const downloadFormat = format === "jpeg" ? "jpeg" : normalizedFormat
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${filename}.${downloadFormat}`

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)

        return {
          success: true,
          blob,
          size: blob.size,
        }
      } catch (error) {
        try {
          restoreAllStyles()
        } catch (restoreError) {
          console.warn("Failed to restore original styles:", restoreError)
        }
        console.error("Chart export failed:", error)
        throw error
      }
    },
    [],
  )

  const exportChartByRef = useCallback(
    async (ref: RefObject<HTMLElement>, options: ChartExportOptions = {}) => {
      return exportChart(ref.current, options)
    },
    [exportChart],
  )

  return {
    exportChart,
    exportChartByRef,
  }
}

export default useChartExport
