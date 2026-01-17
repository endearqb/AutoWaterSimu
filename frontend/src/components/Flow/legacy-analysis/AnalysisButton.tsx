import { Button, type ButtonProps } from "@chakra-ui/react"
import type { ReactNode } from "react"

interface AnalysisButtonProps extends ButtonProps {
  /** 分析按钮的文本 */
  label?: string
  /** 分析按钮的图标 */
  icon?: ReactNode
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 是否显示加载状态 */
  loading?: boolean
  /** 点击按钮时的回调函数，接收数据作为参数 */
  onAnalyze: (data: any) => void
  /** 要分析的数据 */
  data?: any
}

/**
 * 通用分析按钮组件
 * 用于触发数据分析操作，可在不同页面复用
 */
const AnalysisButton = ({
  label = "分析数据",
  icon,
  disabled = false,
  loading = false,
  onAnalyze,
  data,
  ...rest
}: AnalysisButtonProps) => {
  const handleClick = () => {
    if (data && onAnalyze) {
      onAnalyze(data)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || !data}
      loading={loading}
      loadingText="分析中..."
      size="md"
      colorPalette="teal"
      {...rest}
    >
      {icon && icon}
      {label}
    </Button>
  )
}

export default AnalysisButton
