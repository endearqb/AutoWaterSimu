import assert from "node:assert/strict"
import test from "node:test"
import * as XLSX from "xlsx"

import {
  parsePetersonMatrixWorkbook,
  serializePetersonMatrixWorkbook,
} from "../src/utils/petersonMatrixWorkbook.ts"

const buildWorkbook = (options: {
  matrixHeaders: string[]
  matrixRows: Array<Array<string>>
  variablesRows?: Array<Array<string | boolean>>
  parametersRows?: Array<Array<string>>
  readmeRows?: Array<Array<string>>
}): ArrayBuffer => {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([options.matrixHeaders, ...options.matrixRows]),
    "matrix",
  )
  if (options.variablesRows) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(options.variablesRows),
      "variables",
    )
  }
  if (options.parametersRows) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(options.parametersRows),
      "parameters",
    )
  }
  if (options.readmeRows) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(options.readmeRows),
      "readme",
    )
  }
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer
}

test("serializes workbook with matrix, variables, parameters, and readme sheets", () => {
  const data = serializePetersonMatrixWorkbook({
    componentNames: ["S_S", "X_BH"],
    componentInfos: [
      {
        name: "S_S",
        label: "substrate",
        unit: "gCOD/m3",
        defaultValue: "100",
        isFixed: false,
        note: "influent substrate",
      },
      {
        name: "X_BH",
        label: "heterotroph",
        unit: "gCOD/m3",
        defaultValue: "2000",
        isFixed: true,
        note: "active biomass",
      },
    ],
    parameterInfos: [
      {
        name: "u_H",
        label: "max growth rate",
        unit: "1/d",
        defaultValue: "6",
        min: "1",
        max: "10",
        scale: "log",
        note: "calibration target",
      },
    ],
    rows: [
      {
        processName: "growth",
        rateExpr: "u_H*S_S*X_BH",
        note: "main process",
        stoich: { S_S: "-1", X_BH: "Y_H" },
      },
    ],
  })

  const workbook = XLSX.read(data, { type: "array", raw: false })
  assert.ok(workbook.Sheets.matrix)
  assert.ok(workbook.Sheets.variables)
  assert.ok(workbook.Sheets.parameters)
  assert.ok(workbook.Sheets.readme)

  const variableRows = XLSX.utils.sheet_to_json<Array<string>>(
    workbook.Sheets.variables,
    {
      header: 1,
      raw: false,
      defval: "",
    },
  )
  const parameterRows = XLSX.utils.sheet_to_json<Array<string>>(
    workbook.Sheets.parameters,
    {
      header: 1,
      raw: false,
      defval: "",
    },
  )

  assert.deepEqual(variableRows[0], [
    "name",
    "label",
    "unit",
    "defaultValue",
    "isFixed",
    "note",
  ])
  assert.deepEqual(variableRows[2], [
    "X_BH",
    "heterotroph",
    "gCOD/m3",
    "2000",
    "TRUE",
    "active biomass",
  ])
  assert.deepEqual(parameterRows[0], [
    "name",
    "label",
    "unit",
    "defaultValue",
    "min",
    "max",
    "scale",
    "note",
  ])
  assert.deepEqual(parameterRows[1], [
    "u_H",
    "max growth rate",
    "1/d",
    "6",
    "1",
    "10",
    "log",
    "calibration target",
  ])
})

test("round-trips variables and parameters sheets when present", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "X_BH", "S_S"],
    matrixRows: [["growth", "u_H*(S_S/(K_S+S_S))*X_BH", "", "Y_H", "-1"]],
    variablesRows: [
      ["name", "label", "unit", "defaultValue", "isFixed", "note"],
      ["X_BH", "异养菌", "gCOD/m3", "2500", "true", "biomass"],
      ["S_S", "易降解基质", "gCOD/m3", "100", "false", "substrate"],
    ],
    parametersRows: [
      ["name", "label", "unit", "defaultValue", "min", "max", "scale", "note"],
      ["u_H", "最大比增长速率", "1/d", "6", "1", "10", "log", "kinetic"],
      ["K_S", "半饱和常数", "gCOD/m3", "20", "1", "100", "lin", "substrate affinity"],
    ],
    readmeRows: [["Petersen Matrix Excel Import / Export"], ["variables parameters"]],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(preview.errors.length, 0)
  assert.deepEqual(preview.componentInfos, [
    {
      name: "X_BH",
      label: "异养菌",
      unit: "gCOD/m3",
      defaultValue: "2500",
      isFixed: true,
      note: "biomass",
    },
    {
      name: "S_S",
      label: "易降解基质",
      unit: "gCOD/m3",
      defaultValue: "100",
      isFixed: false,
      note: "substrate",
    },
  ])
  assert.deepEqual(preview.parameterInfos, [
    {
      name: "u_H",
      label: "最大比增长速率",
      unit: "1/d",
      defaultValue: "6",
      min: "1",
      max: "10",
      scale: "log",
      note: "kinetic",
    },
    {
      name: "K_S",
      label: "半饱和常数",
      unit: "gCOD/m3",
      defaultValue: "20",
      min: "1",
      max: "100",
      scale: "lin",
      note: "substrate affinity",
    },
  ])
})

test("falls back to matrix-derived variables and extracted parameters when sheets are missing", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S", "X_BH"],
    matrixRows: [["growth", "u_H*(S_S/(K_S+S_S))*X_BH", "", "-1", "Y_H"]],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(preview.errors.length, 0)
  assert.deepEqual(preview.componentInfos, [
    {
      name: "S_S",
      label: "S_S",
      unit: "",
      defaultValue: "0",
      isFixed: false,
      note: "",
    },
    {
      name: "X_BH",
      label: "X_BH",
      unit: "",
      defaultValue: "0",
      isFixed: false,
      note: "",
    },
  ])
  assert.deepEqual(preview.parameterInfos, [
    {
      name: "u_H",
      label: "",
      unit: "",
      defaultValue: "1",
      min: "0.1",
      max: "10",
      scale: "lin",
      note: "",
    },
    {
      name: "K_S",
      label: "",
      unit: "",
      defaultValue: "1",
      min: "0.1",
      max: "10",
      scale: "lin",
      note: "",
    },
    {
      name: "Y_H",
      label: "",
      unit: "",
      defaultValue: "1",
      min: "0.1",
      max: "10",
      scale: "lin",
      note: "",
    },
  ])
})

test("uses matrix headers as the source of truth even when variables sheet has extra names", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S"],
    matrixRows: [["growth", "u_H*S_S", "", "-1"]],
    variablesRows: [
      ["name", "label", "unit", "defaultValue", "isFixed", "note"],
      ["S_S", "substrate", "gCOD/m3", "100", "false", "kept"],
      ["X_UNUSED", "unused", "gCOD/m3", "0", "false", "ignored"],
    ],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(preview.errors.length, 0)
  assert.deepEqual(preview.componentNames, ["S_S"])
  assert.equal(
    preview.warnings.some((item) => item.code === "UNUSED_VARIABLE_SHEET_ROW"),
    true,
  )
  assert.deepEqual(preview.componentInfos, [
    {
      name: "S_S",
      label: "substrate",
      unit: "gCOD/m3",
      defaultValue: "100",
      isFixed: false,
      note: "kept",
    },
  ])
})

test("reports blocking errors for missing required matrix columns", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "note", "S_S"],
    matrixRows: [["growth", "", "-1"]],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(
    preview.errors.some((item) => item.code === "MISSING_REQUIRED_COLUMN"),
    true,
  )
})

test("reports blocking errors for duplicate process names", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S"],
    matrixRows: [
      ["growth", "u_H", "", "-1"],
      ["growth", "b_H", "", "1"],
    ],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(
    preview.errors.some((item) => item.code === "DUPLICATE_PROCESS_NAME"),
    true,
  )
})

test("reports blocking errors for invalid parameter sheet columns, duplicates, and scale", () => {
  const missingColumn = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S"],
    matrixRows: [["growth", "u_H*S_S", "", "-1"]],
    parametersRows: [
      ["name", "label", "unit", "defaultValue", "min", "max", "note"],
      ["u_H", "rate", "1/d", "6", "1", "10", "missing scale"],
    ],
  })
  const missingColumnPreview = parsePetersonMatrixWorkbook(missingColumn)
  assert.equal(
    missingColumnPreview.errors.some(
      (item) => item.code === "MISSING_PARAMETERS_REQUIRED_COLUMN",
    ),
    true,
  )

  const duplicateName = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S"],
    matrixRows: [["growth", "u_H*S_S", "", "-1"]],
    parametersRows: [
      ["name", "label", "unit", "defaultValue", "min", "max", "scale", "note"],
      ["u_H", "rate", "1/d", "6", "1", "10", "lin", ""],
      ["u_H", "rate2", "1/d", "7", "1", "10", "lin", ""],
    ],
  })
  const duplicateNamePreview = parsePetersonMatrixWorkbook(duplicateName)
  assert.equal(
    duplicateNamePreview.errors.some(
      (item) => item.code === "DUPLICATE_PARAMETER_NAME",
    ),
    true,
  )

  const invalidScale = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S"],
    matrixRows: [["growth", "u_H*S_S", "", "-1"]],
    parametersRows: [
      ["name", "label", "unit", "defaultValue", "min", "max", "scale", "note"],
      ["u_H", "rate", "1/d", "6", "1", "10", "linear", ""],
    ],
  })
  const invalidScalePreview = parsePetersonMatrixWorkbook(invalidScale)
  assert.equal(
    invalidScalePreview.errors.some(
      (item) => item.code === "INVALID_PARAMETER_SCALE",
    ),
    true,
  )
})

test("skips blank rows and warns on unused parameters", () => {
  const data = buildWorkbook({
    matrixHeaders: ["process_name", "rate_expr", "note", "S_S", "X_BH"],
    matrixRows: [
      ["growth", "u_H*S_S", "", "-1", "Y_H"],
      ["", "", "", "", ""],
    ],
    parametersRows: [
      ["name", "label", "unit", "defaultValue", "min", "max", "scale", "note"],
      ["u_H", "rate", "1/d", "6", "1", "10", "lin", ""],
      ["K_UNUSED", "unused", "", "1", "0.1", "10", "lin", ""],
    ],
  })

  const preview = parsePetersonMatrixWorkbook(data)

  assert.equal(preview.errors.length, 0)
  assert.equal(preview.rows.length, 1)
  assert.equal(
    preview.warnings.some((item) => item.code === "EMPTY_ROW_SKIPPED"),
    true,
  )
  assert.equal(
    preview.warnings.some((item) => item.code === "UNUSED_PARAMETER"),
    true,
  )
})
