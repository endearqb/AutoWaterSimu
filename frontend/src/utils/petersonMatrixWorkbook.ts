import * as XLSX from "xlsx"

const MATRIX_SHEET_NAME = "matrix"
const VARIABLES_SHEET_NAME = "variables"
const PARAMETERS_SHEET_NAME = "parameters"
const README_SHEET_NAME = "readme"

const REQUIRED_MATRIX_COLUMNS = ["process_name", "rate_expr"] as const
const OPTIONAL_MATRIX_COLUMNS = new Set(["note"])
const MATRIX_TECHNICAL_COLUMN_SET = new Set([
  ...REQUIRED_MATRIX_COLUMNS,
  ...OPTIONAL_MATRIX_COLUMNS,
])

const VARIABLES_HEADERS = [
  "name",
  "label",
  "unit",
  "defaultValue",
  "isFixed",
  "note",
] as const

const PARAMETERS_HEADERS = [
  "name",
  "label",
  "unit",
  "defaultValue",
  "min",
  "max",
  "scale",
  "note",
] as const

const VARIABLES_REQUIRED_HEADERS = VARIABLES_HEADERS.map((item) =>
  item.toLowerCase(),
)
const PARAMETERS_REQUIRED_HEADERS = PARAMETERS_HEADERS.map((item) =>
  item.toLowerCase(),
)

const EXPRESSION_IDENTIFIER_PATTERN = /[A-Za-z_][A-Za-z0-9_]*/g
const BUILTIN_EXPRESSION_IDENTIFIERS = new Set([
  "abs",
  "clip",
  "e",
  "exp",
  "log",
  "max",
  "min",
  "pi",
  "pow",
  "sqrt",
])

export interface PetersonMatrixComponentInfo {
  name: string
  label: string
  unit: string
  defaultValue: string
  isFixed: boolean
  note: string
}

export interface PetersonMatrixParameterInfo {
  name: string
  label: string
  unit: string
  defaultValue: string
  min: string
  max: string
  scale: "lin" | "log"
  note: string
}

export interface PetersonMatrixVariablesSheetRow
  extends PetersonMatrixComponentInfo {}

export interface PetersonMatrixParametersSheetRow
  extends PetersonMatrixParameterInfo {}

export interface PetersonMatrixRow {
  processName: string
  rateExpr: string
  note: string
  stoich: Record<string, string>
}

export interface PetersonMatrixWorkbook {
  componentNames: string[]
  componentInfos: PetersonMatrixComponentInfo[]
  parameterInfos: PetersonMatrixParameterInfo[]
  rows: PetersonMatrixRow[]
}

export interface PetersonMatrixImportError {
  severity: "error" | "warning"
  code:
    | "MISSING_MATRIX_SHEET"
    | "EMPTY_HEADER"
    | "DUPLICATE_HEADER"
    | "MISSING_REQUIRED_COLUMN"
    | "EMPTY_PROCESS_NAME"
    | "EMPTY_RATE_EXPR"
    | "DUPLICATE_PROCESS_NAME"
    | "EMPTY_ROW_SKIPPED"
    | "MISSING_VARIABLES_REQUIRED_COLUMN"
    | "DUPLICATE_VARIABLE_NAME"
    | "UNUSED_VARIABLE_SHEET_ROW"
    | "MISSING_PARAMETERS_REQUIRED_COLUMN"
    | "DUPLICATE_PARAMETER_NAME"
    | "INVALID_PARAMETER_SCALE"
    | "UNUSED_PARAMETER"
    | "MISSING_README_SHEET"
    | "LEGACY_README_FORMAT"
  message: string
  rowNumber?: number
  columnName?: string
  sheetName?: string
}

export interface PetersonMatrixImportPreview {
  componentNames: string[]
  componentInfos: PetersonMatrixComponentInfo[]
  parameterInfos: PetersonMatrixParameterInfo[]
  rows: PetersonMatrixRow[]
  errors: PetersonMatrixImportError[]
  warnings: PetersonMatrixImportError[]
}

const normalizeTextCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value).trim()
}

const normalizeBoolean = (value: unknown): boolean => {
  const normalized = normalizeTextCell(value).toLowerCase()
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "y"
  )
}

const encodeWorksheet = (rows: Array<Array<string | boolean>>): XLSX.WorkSheet =>
  XLSX.utils.aoa_to_sheet(rows)

const buildVariablesRows = (
  componentInfos: PetersonMatrixComponentInfo[],
): Array<Array<string | boolean>> => [
  [...VARIABLES_HEADERS],
  ...componentInfos.map((item) => [
    item.name,
    item.label,
    item.unit,
    item.defaultValue,
    item.isFixed,
    item.note,
  ]),
]

const buildParametersRows = (
  parameterInfos: PetersonMatrixParameterInfo[],
): Array<Array<string | boolean>> => [
  [...PARAMETERS_HEADERS],
  ...parameterInfos.map((item) => [
    item.name,
    item.label,
    item.unit,
    item.defaultValue,
    item.min,
    item.max,
    item.scale,
    item.note,
  ]),
]

const buildReadmeRows = (): Array<Array<string>> => [
  ["Petersen Matrix Excel Import / Export"],
  [""],
  ["Rules / 规则"],
  ["1. Edit only workbook sheets produced by this export. / 仅编辑本导出生成的工作表。"],
  [
    "2. The matrix sheet is required and decides the final component set. / matrix 为必需 sheet，并决定最终变量集合。",
  ],
  [
    "3. The variables sheet supplements component metadata by name. / variables sheet 按 name 补充变量元数据。",
  ],
  [
    "4. The parameters sheet is the primary source for parameter definitions. / parameters sheet 是参数定义主来源。",
  ],
  [
    "5. If variables or parameters sheets are missing, the importer auto-discovers them. / 若缺失 variables 或 parameters sheet，系统会自动推导。",
  ],
  [
    "6. Write UDM expressions as plain text, not Excel formulas. / 请输入 UDM 纯文本表达式，不要写成 Excel 公式。",
  ],
]

const buildDefaultComponentInfos = (
  componentNames: string[],
): PetersonMatrixComponentInfo[] =>
  componentNames.map((name) => ({
    name,
    label: name,
    unit: "",
    defaultValue: "0",
    isFixed: false,
    note: "",
  }))

const buildDefaultParameterInfos = (
  parameterNames: string[],
): PetersonMatrixParameterInfo[] =>
  parameterNames.map((name) => ({
    name,
    label: "",
    unit: "",
    defaultValue: "1",
    min: "0.1",
    max: "10",
    scale: "lin",
    note: "",
  }))

const extractComponentNamesFromHeader = (headers: string[]): string[] =>
  headers.filter((header) => header && !MATRIX_TECHNICAL_COLUMN_SET.has(header))

const extractExpressionIdentifiers = (expression: string): string[] => {
  const matches = expression.match(EXPRESSION_IDENTIFIER_PATTERN)
  return matches ? matches : []
}

const extractParameterNamesFromRows = (
  rows: PetersonMatrixRow[],
  componentNames: string[],
): string[] => {
  const componentNameSet = new Set(componentNames)
  const found = new Set<string>()

  rows.forEach((row) => {
    const expressions = [row.rateExpr, ...Object.values(row.stoich)]
    expressions.forEach((expression) => {
      extractExpressionIdentifiers(expression).forEach((identifier) => {
        if (
          componentNameSet.has(identifier) ||
          BUILTIN_EXPRESSION_IDENTIFIERS.has(identifier)
        ) {
          return
        }
        found.add(identifier)
      })
    })
  })

  return Array.from(found)
}

const addReadmeWarnings = (
  workbook: XLSX.WorkBook,
  warnings: PetersonMatrixImportError[],
) => {
  const readmeSheet = workbook.Sheets[README_SHEET_NAME]
  if (!readmeSheet) {
    warnings.push({
      severity: "warning",
      code: "MISSING_README_SHEET",
      message: `Workbook does not include a '${README_SHEET_NAME}' sheet.`,
      sheetName: README_SHEET_NAME,
    })
    return
  }

  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(readmeSheet, {
    header: 1,
    raw: false,
    defval: "",
  })
  const text = rows
    .flat()
    .map((value) => normalizeTextCell(value).toLowerCase())
    .join(" ")
  if (!text.includes("variables") || !text.includes("parameters")) {
    warnings.push({
      severity: "warning",
      code: "LEGACY_README_FORMAT",
      message: "Workbook readme sheet appears to be from an older export format.",
      sheetName: README_SHEET_NAME,
    })
  }
}

const parseStructuredSheet = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  requiredHeaders: string[],
  missingColumnCode:
    | "MISSING_VARIABLES_REQUIRED_COLUMN"
    | "MISSING_PARAMETERS_REQUIRED_COLUMN",
): {
  rows: Record<string, string>[]
  errors: PetersonMatrixImportError[]
  warnings: PetersonMatrixImportError[]
} | null => {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    return null
  }

  const table = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  })
  const rawHeaderRow = (table[0] ?? []).map((value) => normalizeTextCell(value))
  const normalizedHeaderRow = rawHeaderRow.map((value) => value.toLowerCase())
  const errors: PetersonMatrixImportError[] = []
  const warnings: PetersonMatrixImportError[] = []

  if (
    rawHeaderRow.length === 0 ||
    normalizedHeaderRow.every((value) => !value)
  ) {
    errors.push({
      severity: "error",
      code: "EMPTY_HEADER",
      message: `The '${sheetName}' sheet header row is empty.`,
      sheetName,
    })
    return { rows: [], errors, warnings }
  }

  const seenHeaders = new Set<string>()
  normalizedHeaderRow.forEach((header, index) => {
    if (!header) {
      return
    }
    if (seenHeaders.has(header)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_HEADER",
        message: `Duplicate column header '${rawHeaderRow[index]}' found in the '${sheetName}' sheet.`,
        columnName: rawHeaderRow[index],
        sheetName,
      })
      return
    }
    seenHeaders.add(header)
  })

  requiredHeaders.forEach((header) => {
    if (!seenHeaders.has(header)) {
      errors.push({
        severity: "error",
        code: missingColumnCode,
        message: `Missing required column '${header}' in the '${sheetName}' sheet.`,
        columnName: header,
        sheetName,
      })
    }
  })

  const rows = table
    .slice(1)
    .map((row) =>
      Object.fromEntries(
        normalizedHeaderRow.map((header, index) => [
          header,
          normalizeTextCell(row?.[index]),
        ]),
      ) as Record<string, string>,
    )
    .filter((row) => Object.values(row).some(Boolean))

  return { rows, errors, warnings }
}

const parseVariablesSheet = (
  workbook: XLSX.WorkBook,
  componentNames: string[],
): {
  componentInfos: PetersonMatrixComponentInfo[]
  errors: PetersonMatrixImportError[]
  warnings: PetersonMatrixImportError[]
} => {
  const parsed = parseStructuredSheet(
    workbook,
    VARIABLES_SHEET_NAME,
    [...VARIABLES_REQUIRED_HEADERS],
    "MISSING_VARIABLES_REQUIRED_COLUMN",
  )
  if (!parsed) {
    return {
      componentInfos: buildDefaultComponentInfos(componentNames),
      errors: [],
      warnings: [],
    }
  }

  const { rows, errors, warnings } = parsed
  if (errors.length > 0) {
    return { componentInfos: [], errors, warnings }
  }

  const infoByName = new Map<string, PetersonMatrixComponentInfo>()
  rows.forEach((row, index) => {
    const name = row.name.trim()
    if (!name) {
      return
    }
    if (infoByName.has(name)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_VARIABLE_NAME",
        message: `Duplicate variable '${name}' found in the '${VARIABLES_SHEET_NAME}' sheet.`,
        rowNumber: index + 2,
        columnName: "name",
        sheetName: VARIABLES_SHEET_NAME,
      })
      return
    }
    infoByName.set(name, {
      name,
      label: row.label || name,
      unit: row.unit || "",
      defaultValue: row.defaultvalue || "0",
      isFixed: normalizeBoolean(row.isfixed),
      note: row.note || "",
    })
  })

  const matrixComponentSet = new Set(componentNames)
  Array.from(infoByName.keys()).forEach((name) => {
    if (!matrixComponentSet.has(name)) {
      warnings.push({
        severity: "warning",
        code: "UNUSED_VARIABLE_SHEET_ROW",
        message: `Variable '${name}' from the '${VARIABLES_SHEET_NAME}' sheet is not used by the matrix sheet and will be ignored.`,
        columnName: "name",
        sheetName: VARIABLES_SHEET_NAME,
      })
    }
  })

  const componentInfos = componentNames.map((name) => {
    const found = infoByName.get(name)
    if (found) {
      return found
    }
    return {
      name,
      label: name,
      unit: "",
      defaultValue: "0",
      isFixed: false,
      note: "",
    }
  })

  return { componentInfos, errors, warnings }
}

const parseParametersSheet = (
  workbook: XLSX.WorkBook,
  extractedParameterNames: string[],
): {
  parameterInfos: PetersonMatrixParameterInfo[]
  errors: PetersonMatrixImportError[]
  warnings: PetersonMatrixImportError[]
} => {
  const parsed = parseStructuredSheet(
    workbook,
    PARAMETERS_SHEET_NAME,
    [...PARAMETERS_REQUIRED_HEADERS],
    "MISSING_PARAMETERS_REQUIRED_COLUMN",
  )
  if (!parsed) {
    return {
      parameterInfos: buildDefaultParameterInfos(extractedParameterNames),
      errors: [],
      warnings: [],
    }
  }

  const { rows, errors, warnings } = parsed
  if (errors.length > 0) {
    return { parameterInfos: [], errors, warnings }
  }

  const parameterInfos: PetersonMatrixParameterInfo[] = []
  const seenNames = new Set<string>()
  rows.forEach((row, index) => {
    const name = row.name.trim()
    if (!name) {
      return
    }
    if (seenNames.has(name)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_PARAMETER_NAME",
        message: `Duplicate parameter '${name}' found in the '${PARAMETERS_SHEET_NAME}' sheet.`,
        rowNumber: index + 2,
        columnName: "name",
        sheetName: PARAMETERS_SHEET_NAME,
      })
      return
    }
    seenNames.add(name)

    const normalizedScale = row.scale.toLowerCase()
    if (normalizedScale !== "lin" && normalizedScale !== "log") {
      errors.push({
        severity: "error",
        code: "INVALID_PARAMETER_SCALE",
        message: `Parameter '${name}' has invalid scale '${row.scale}'. Expected 'lin' or 'log'.`,
        rowNumber: index + 2,
        columnName: "scale",
        sheetName: PARAMETERS_SHEET_NAME,
      })
      return
    }

    parameterInfos.push({
      name,
      label: row.label || "",
      unit: row.unit || "",
      defaultValue: row.defaultvalue || "1",
      min: row.min || "0.1",
      max: row.max || "10",
      scale: normalizedScale,
      note: row.note || "",
    })
  })

  const extractedSet = new Set(extractedParameterNames)
  parameterInfos.forEach((item) => {
    if (!extractedSet.has(item.name)) {
      warnings.push({
        severity: "warning",
        code: "UNUSED_PARAMETER",
        message: `Parameter '${item.name}' from the '${PARAMETERS_SHEET_NAME}' sheet is not referenced by the current matrix expressions.`,
        columnName: "name",
        sheetName: PARAMETERS_SHEET_NAME,
      })
    }
  })

  return { parameterInfos, errors, warnings }
}

export const serializePetersonMatrixWorkbook = (
  workbook: PetersonMatrixWorkbook,
): ArrayBuffer => {
  const matrixHeader = [
    "process_name",
    "rate_expr",
    "note",
    ...workbook.componentNames,
  ]
  const matrixRows: Array<Array<string | boolean>> = [
    matrixHeader,
    ...workbook.rows.map((row) => [
      row.processName,
      row.rateExpr,
      row.note,
      ...workbook.componentNames.map(
        (componentName) => row.stoich[componentName]?.trim() || "0",
      ),
    ]),
  ]

  const xlsxWorkbook = XLSX.utils.book_new()
  const matrixSheet = encodeWorksheet(matrixRows)
  matrixSheet["!cols"] = [
    { wch: 24 },
    { wch: 36 },
    { wch: 24 },
    ...workbook.componentNames.map(() => ({ wch: 16 })),
  ]

  const variablesSheet = encodeWorksheet(
    buildVariablesRows(workbook.componentInfos),
  )
  variablesSheet["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 36 },
  ]

  const parametersSheet = encodeWorksheet(
    buildParametersRows(workbook.parameterInfos),
  )
  parametersSheet["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 36 },
  ]

  const readmeSheet = encodeWorksheet(buildReadmeRows())
  readmeSheet["!cols"] = [{ wch: 120 }]

  XLSX.utils.book_append_sheet(xlsxWorkbook, matrixSheet, MATRIX_SHEET_NAME)
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    variablesSheet,
    VARIABLES_SHEET_NAME,
  )
  XLSX.utils.book_append_sheet(
    xlsxWorkbook,
    parametersSheet,
    PARAMETERS_SHEET_NAME,
  )
  XLSX.utils.book_append_sheet(xlsxWorkbook, readmeSheet, README_SHEET_NAME)

  return XLSX.write(xlsxWorkbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer
}

export const parsePetersonMatrixWorkbook = (
  fileData: ArrayBuffer,
): PetersonMatrixImportPreview => {
  const workbook = XLSX.read(fileData, {
    type: "array",
    raw: false,
    cellFormula: false,
    dense: true,
  })
  const errors: PetersonMatrixImportError[] = []
  const warnings: PetersonMatrixImportError[] = []
  addReadmeWarnings(workbook, warnings)

  const matrixSheet = workbook.Sheets[MATRIX_SHEET_NAME]
  if (!matrixSheet) {
    const error: PetersonMatrixImportError = {
      severity: "error",
      code: "MISSING_MATRIX_SHEET",
      message: `Workbook must include a '${MATRIX_SHEET_NAME}' sheet.`,
      sheetName: MATRIX_SHEET_NAME,
    }
    return {
      componentNames: [],
      componentInfos: [],
      parameterInfos: [],
      rows: [],
      errors: [error],
      warnings,
    }
  }

  const table = XLSX.utils.sheet_to_json<Array<unknown>>(matrixSheet, {
    header: 1,
    raw: false,
    defval: "",
  })
  const headerRow = (table[0] ?? []).map((value) => normalizeTextCell(value))

  if (headerRow.length === 0 || headerRow.every((value) => !value)) {
    errors.push({
      severity: "error",
      code: "EMPTY_HEADER",
      message: "The matrix sheet header row is empty.",
      sheetName: MATRIX_SHEET_NAME,
    })
    return {
      componentNames: [],
      componentInfos: [],
      parameterInfos: [],
      rows: [],
      errors,
      warnings,
    }
  }

  const seenHeaders = new Set<string>()
  headerRow.forEach((header) => {
    if (!header) {
      return
    }
    if (seenHeaders.has(header)) {
      errors.push({
        severity: "error",
        code: "DUPLICATE_HEADER",
        message: `Duplicate column header '${header}' found in the matrix sheet.`,
        columnName: header,
        sheetName: MATRIX_SHEET_NAME,
      })
      return
    }
    seenHeaders.add(header)
  })

  REQUIRED_MATRIX_COLUMNS.forEach((columnName) => {
    if (!seenHeaders.has(columnName)) {
      errors.push({
        severity: "error",
        code: "MISSING_REQUIRED_COLUMN",
        message: `Missing required column '${columnName}'.`,
        columnName,
        sheetName: MATRIX_SHEET_NAME,
      })
    }
  })

  const componentNames = extractComponentNamesFromHeader(headerRow)
  const rows: PetersonMatrixRow[] = []
  const seenProcessNames = new Map<string, number>()

  if (errors.length === 0) {
    table.slice(1).forEach((rawRow, index) => {
      const rowNumber = index + 2
      const rowCells = headerRow.map((_, colIndex) =>
        normalizeTextCell(rawRow?.[colIndex]),
      )

      if (rowCells.every((value) => !value)) {
        warnings.push({
          severity: "warning",
          code: "EMPTY_ROW_SKIPPED",
          message: `Skipped empty row ${rowNumber}.`,
          rowNumber,
          sheetName: MATRIX_SHEET_NAME,
        })
        return
      }

      const valuesByHeader = Object.fromEntries(
        headerRow.map((header, headerIndex) => [
          header,
          rowCells[headerIndex],
        ]),
      ) as Record<string, string>

      const processName = valuesByHeader.process_name?.trim() || ""
      const rateExpr = valuesByHeader.rate_expr?.trim() || ""
      const note = valuesByHeader.note?.trim() || ""

      if (!processName) {
        errors.push({
          severity: "error",
          code: "EMPTY_PROCESS_NAME",
          message: `Row ${rowNumber}: process_name is required.`,
          rowNumber,
          columnName: "process_name",
          sheetName: MATRIX_SHEET_NAME,
        })
        return
      }

      if (!rateExpr) {
        errors.push({
          severity: "error",
          code: "EMPTY_RATE_EXPR",
          message: `Row ${rowNumber}: rate_expr is required.`,
          rowNumber,
          columnName: "rate_expr",
          sheetName: MATRIX_SHEET_NAME,
        })
        return
      }

      const duplicateRow = seenProcessNames.get(processName)
      if (duplicateRow) {
        errors.push({
          severity: "error",
          code: "DUPLICATE_PROCESS_NAME",
          message: `Row ${rowNumber}: duplicate process_name '${processName}' (already used at row ${duplicateRow}).`,
          rowNumber,
          columnName: "process_name",
          sheetName: MATRIX_SHEET_NAME,
        })
        return
      }
      seenProcessNames.set(processName, rowNumber)

      const stoich = Object.fromEntries(
        componentNames.map((componentName) => [
          componentName,
          valuesByHeader[componentName]?.trim() || "0",
        ]),
      )

      rows.push({
        processName,
        rateExpr,
        note,
        stoich,
      })
    })
  }

  const variablesParse = parseVariablesSheet(workbook, componentNames)
  errors.push(...variablesParse.errors)
  warnings.push(...variablesParse.warnings)

  const extractedParameterNames = extractParameterNamesFromRows(
    rows,
    componentNames,
  )
  const parametersParse = parseParametersSheet(
    workbook,
    extractedParameterNames,
  )
  errors.push(...parametersParse.errors)
  warnings.push(...parametersParse.warnings)

  return {
    componentNames,
    componentInfos: variablesParse.componentInfos,
    parameterInfos: parametersParse.parameterInfos,
    rows,
    errors,
    warnings,
  }
}

export const sanitizePetersonMatrixFileName = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "udm-model"

export const buildPetersonMatrixExportFilename = (
  modelName: string,
  date = new Date(),
): string => {
  const safeName = sanitizePetersonMatrixFileName(modelName)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${safeName}-petersen-matrix-${year}${month}${day}-${hour}${minute}.xlsx`
}
