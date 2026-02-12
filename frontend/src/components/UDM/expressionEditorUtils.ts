export type ExpressionCellType = "rateExpr" | "stoich"

export type ExpressionTokenType =
  | "identifier"
  | "number"
  | "operator"
  | "paren"
  | "comma"
  | "whitespace"
  | "unknown"

export type ExpressionTokenRole =
  | "component"
  | "parameter"
  | "function"
  | "constant"
  | "unknownSymbol"
  | "number"
  | "operator"
  | "punctuation"
  | "text"
  | "unknownChar"

export interface ExpressionToken {
  type: ExpressionTokenType
  value: string
  start: number
  end: number
}

export interface DecoratedExpressionToken extends ExpressionToken {
  role: ExpressionTokenRole
  color: string
}

export interface ExpressionIssue {
  code: string
  message: string
  severity: "warning"
}

export interface ExpressionAnalysisResult {
  tokens: DecoratedExpressionToken[]
  issues: ExpressionIssue[]
}

interface AnalyzeExpressionOptions {
  cellType: ExpressionCellType
  componentNames: string[]
  parameterNames: string[]
}

const ALLOWED_FUNCTIONS = new Set([
  "exp",
  "log",
  "sqrt",
  "pow",
  "min",
  "max",
  "abs",
  "clip",
])

const RESERVED_CONSTANTS = new Set(["pi", "e"])

const HASH_COLOR_PALETTE = [
  "blue.600",
  "teal.600",
  "green.600",
  "orange.600",
  "pink.600",
  "cyan.600",
  "purple.600",
  "red.600",
  "yellow.700",
]

const tokenRoleColorMap: Record<ExpressionTokenRole, string> = {
  component: "blue.600",
  parameter: "teal.600",
  function: "purple.600",
  constant: "gray.700",
  unknownSymbol: "orange.600",
  number: "cyan.700",
  operator: "fg.muted",
  punctuation: "fg.muted",
  text: "fg",
  unknownChar: "red.600",
}

const isDigit = (ch: string): boolean => ch >= "0" && ch <= "9"

const isIdentifierStart = (ch: string): boolean =>
  (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_"

const isIdentifierPart = (ch: string): boolean =>
  isIdentifierStart(ch) || isDigit(ch)

const isOperator = (ch: string): boolean =>
  ch === "+" ||
  ch === "-" ||
  ch === "*" ||
  ch === "/" ||
  ch === "^" ||
  ch === "%" ||
  ch === "="

const hashString = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}

const getStableSymbolColor = (symbol: string): string => {
  const index = hashString(symbol) % HASH_COLOR_PALETTE.length
  return HASH_COLOR_PALETTE[index]
}

export const tokenizeExpression = (input: string): ExpressionToken[] => {
  const text = input || ""
  const tokens: ExpressionToken[] = []
  let index = 0

  while (index < text.length) {
    const ch = text[index]
    const start = index

    if (/\s/.test(ch)) {
      index += 1
      while (index < text.length && /\s/.test(text[index])) {
        index += 1
      }
      tokens.push({
        type: "whitespace",
        value: text.slice(start, index),
        start,
        end: index,
      })
      continue
    }

    if (isIdentifierStart(ch)) {
      index += 1
      while (index < text.length && isIdentifierPart(text[index])) {
        index += 1
      }
      tokens.push({
        type: "identifier",
        value: text.slice(start, index),
        start,
        end: index,
      })
      continue
    }

    const next = text[index + 1] || ""
    const looksLikeLeadingDotNumber = ch === "." && isDigit(next)
    if (isDigit(ch) || looksLikeLeadingDotNumber) {
      index += 1
      while (index < text.length && isDigit(text[index])) {
        index += 1
      }
      if (text[index] === ".") {
        index += 1
        while (index < text.length && isDigit(text[index])) {
          index += 1
        }
      }
      if (text[index] === "e" || text[index] === "E") {
        const expSign = text[index + 1]
        const expDigit = text[index + 2]
        if (
          isDigit(expSign) ||
          ((expSign === "+" || expSign === "-") && isDigit(expDigit))
        ) {
          index += expSign === "+" || expSign === "-" ? 2 : 1
          while (index < text.length && isDigit(text[index])) {
            index += 1
          }
        }
      }
      tokens.push({
        type: "number",
        value: text.slice(start, index),
        start,
        end: index,
      })
      continue
    }

    if (isOperator(ch)) {
      index += 1
      tokens.push({
        type: "operator",
        value: ch,
        start,
        end: index,
      })
      continue
    }

    if (ch === "(" || ch === ")") {
      index += 1
      tokens.push({
        type: "paren",
        value: ch,
        start,
        end: index,
      })
      continue
    }

    if (ch === ",") {
      index += 1
      tokens.push({
        type: "comma",
        value: ch,
        start,
        end: index,
      })
      continue
    }

    index += 1
    tokens.push({
      type: "unknown",
      value: ch,
      start,
      end: index,
    })
  }

  return tokens
}

const buildParenthesisIssues = (tokens: ExpressionToken[]): ExpressionIssue[] => {
  const stack: number[] = []
  const issues: ExpressionIssue[] = []

  tokens.forEach((token) => {
    if (token.type !== "paren") return
    if (token.value === "(") {
      stack.push(token.start)
      return
    }
    if (stack.length === 0) {
      issues.push({
        code: "UNMATCHED_RIGHT_PAREN",
        message: "Unmatched right parenthesis ')'.",
        severity: "warning",
      })
      return
    }
    stack.pop()
  })

  if (stack.length > 0) {
    issues.push({
      code: "UNMATCHED_LEFT_PAREN",
      message: "Unmatched left parenthesis '('.",
      severity: "warning",
    })
  }

  return issues
}

const isImplicitOperatorLeftToken = (
  token: DecoratedExpressionToken,
): boolean => {
  if (token.type === "number") return true
  if (token.type === "identifier") return true
  if (token.type === "paren" && token.value === ")") return true
  return false
}

const isImplicitOperatorRightToken = (
  token: DecoratedExpressionToken,
): boolean => {
  if (token.type === "number") return true
  if (token.type === "identifier") return true
  if (token.type === "paren" && token.value === "(") return true
  return false
}

const buildImplicitWhitespaceIssues = (
  tokens: DecoratedExpressionToken[],
): ExpressionIssue[] => {
  const pairPreviewSet = new Set<string>()

  for (let i = 1; i < tokens.length - 1; i += 1) {
    const middle = tokens[i]
    if (middle.type !== "whitespace") continue

    const left = tokens[i - 1]
    const right = tokens[i + 1]
    if (!left || !right) continue

    const isFunctionCallWithSpace =
      left.role === "function" && right.type === "paren" && right.value === "("
    if (isFunctionCallWithSpace) continue

    if (
      isImplicitOperatorLeftToken(left) &&
      isImplicitOperatorRightToken(right)
    ) {
      pairPreviewSet.add(`${left.value} ${right.value}`)
    }
  }

  if (pairPreviewSet.size === 0) {
    return []
  }

  return [
    {
      code: "MISSING_OPERATOR_BETWEEN_SYMBOLS",
      message: `检测到仅由空白分隔的相邻符号: ${Array.from(
        pairPreviewSet,
      ).join(", ")}。请补充运算符（如 *, +, -, /）。`,
      severity: "warning",
    },
  ]
}

export const analyzeExpression = (
  expression: string,
  options: AnalyzeExpressionOptions,
): ExpressionAnalysisResult => {
  const input = expression || ""
  const tokens = tokenizeExpression(input)

  const componentSet = new Set(
    options.componentNames.map((name) => name.trim()).filter(Boolean),
  )
  const parameterSet = new Set(
    options.parameterNames.map((name) => name.trim()).filter(Boolean),
  )

  const issues: ExpressionIssue[] = []
  const unknownSymbols = new Set<string>()
  const stoichComponentRefs = new Set<string>()
  const unknownChars = new Set<string>()

  const decoratedTokens: DecoratedExpressionToken[] = tokens.map((token) => {
    if (token.type === "whitespace") {
      return { ...token, role: "text", color: tokenRoleColorMap.text }
    }

    if (token.type === "number") {
      return { ...token, role: "number", color: tokenRoleColorMap.number }
    }

    if (token.type === "operator") {
      return { ...token, role: "operator", color: tokenRoleColorMap.operator }
    }

    if (token.type === "paren" || token.type === "comma") {
      return {
        ...token,
        role: "punctuation",
        color: tokenRoleColorMap.punctuation,
      }
    }

    if (token.type === "unknown") {
      unknownChars.add(token.value)
      return {
        ...token,
        role: "unknownChar",
        color: tokenRoleColorMap.unknownChar,
      }
    }

    const symbol = token.value
    if (ALLOWED_FUNCTIONS.has(symbol)) {
      return { ...token, role: "function", color: tokenRoleColorMap.function }
    }
    if (RESERVED_CONSTANTS.has(symbol)) {
      return { ...token, role: "constant", color: tokenRoleColorMap.constant }
    }
    if (componentSet.has(symbol)) {
      if (options.cellType === "stoich") {
        stoichComponentRefs.add(symbol)
      }
      return {
        ...token,
        role: "component",
        color: getStableSymbolColor(symbol),
      }
    }
    if (parameterSet.has(symbol)) {
      return {
        ...token,
        role: "parameter",
        color: getStableSymbolColor(symbol),
      }
    }

    unknownSymbols.add(symbol)
    return {
      ...token,
      role: "unknownSymbol",
      color: tokenRoleColorMap.unknownSymbol,
    }
  })

  if (!input.trim()) {
    issues.push({
      code: "EMPTY_EXPRESSION",
      message: "Expression is empty. Save is allowed but backend validation may fail.",
      severity: "warning",
    })
  }

  buildParenthesisIssues(tokens).forEach((issue) => issues.push(issue))
  buildImplicitWhitespaceIssues(decoratedTokens).forEach((issue) =>
    issues.push(issue),
  )

  if (unknownChars.size > 0) {
    issues.push({
      code: "UNKNOWN_CHAR",
      message: `Invalid character(s): ${Array.from(unknownChars).join(" ")}`,
      severity: "warning",
    })
  }

  if (unknownSymbols.size > 0) {
    issues.push({
      code: "UNKNOWN_SYMBOL",
      message: `Unknown symbol(s): ${Array.from(unknownSymbols).sort().join(", ")}`,
      severity: "warning",
    })
  }

  if (stoichComponentRefs.size > 0) {
    issues.push({
      code: "STOICH_COMPONENT_REF",
      message: `Stoich expression references component(s): ${Array.from(
        stoichComponentRefs,
      )
        .sort()
        .join(", ")}`,
      severity: "warning",
    })
  }

  return {
    tokens: decoratedTokens,
    issues,
  }
}
