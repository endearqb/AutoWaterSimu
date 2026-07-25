import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dirname, "..")
const frontendSrc = path.join(repoRoot, "frontend", "src")

const tsExtensions = new Set([".ts", ".tsx"])

const scanRoots = [
  path.join(frontendSrc, "features", "udm-v2"),
  path.join(frontendSrc, "components", "Flow"),
  path.join(frontendSrc, "stores"),
  path.join(frontendSrc, "routes", "_layout"),
  path.join(frontendSrc, "types"),
]

const allowedV1Imports = new Set([
  normalizePath(path.join(frontendSrc, "routes", "_layout", "udm-v2.tsx")),
])

const allowedV1TokenFiles = new Set([
  normalizePath(
    path.join(frontendSrc, "stores", "__tests__", "v1EdgeIsolation.test.ts"),
  ),
])

const forbiddenFiles = [
  path.join(frontendSrc, "types", "networkEdges.ts"),
  path.join(frontendSrc, "components", "Flow", "edges", "EdgeModeSelector.tsx"),
  path.join(
    frontendSrc,
    "components",
    "Flow",
    "edges",
    "NetworkEdgeInspectorFields.tsx",
  ),
]

const forbiddenFromUdmV2 = [
  "@/stores/createModelFlowStore",
  "@/stores/flowStore",
  "@/stores/udmFlowStore",
  "@/services/udmService",
  "@/types/networkEdges",
  "legacyFlowExportToCanvasGraph",
]

const allowedSharedFlowImports = new Set([
  "@/components/Flow/nodes/GlassNodeContainer",
  "@/components/Flow/nodes/utils/glass",
  "@/components/Flow/toolbar/NodePalette",
])

const forbiddenFromV1 = ["@/features/udm-v2/", "features/udm-v2/"]

const forbiddenV1Tokens = [
  "edge_kind",
  "NetworkEdgeKind",
  "createNetworkEdgeData",
  "@/types/networkEdges",
  "../types/networkEdges",
]

function normalizePath(value) {
  return value.replaceAll(path.sep, "/")
}

function listSourceFiles(root) {
  if (!existsSync(root)) {
    return []
  }

  const entries = readdirSync(root, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath))
      continue
    }
    if (entry.isFile() && tsExtensions.has(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

function importSpecifiers(source) {
  const specs = []
  const patterns = [
    /import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
    /export\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specs.push(match[1])
    }
  }
  return specs
}

function resolveRelativeSpecifier(filePath, specifier) {
  if (!specifier.startsWith(".")) {
    return specifier
  }
  return normalizePath(
    path.relative(frontendSrc, path.resolve(path.dirname(filePath), specifier)),
  )
}

const violations = []

for (const filePath of forbiddenFiles) {
  if (existsSync(filePath)) {
    violations.push(
      `${normalizePath(path.relative(repoRoot, filePath))}: deleted UDM-v2 legacy/global edge helper must not be recreated`,
    )
  }
}

for (const filePath of scanRoots.flatMap(listSourceFiles)) {
  const normalizedFile = normalizePath(filePath)
  const relativeFile = normalizePath(path.relative(repoRoot, filePath))
  const source = readFileSync(filePath, "utf8")
  const specs = importSpecifiers(source)
  const isUdmV2 = normalizedFile.includes("/frontend/src/features/udm-v2/")

  if (isUdmV2) {
    for (const specifier of specs) {
      if (
        specifier.includes("components/Flow/") &&
        !allowedSharedFlowImports.has(specifier)
      ) {
        violations.push(
          `${relativeFile}: UDM-v2 may only import allowlisted shared Flow UI primitives, not ${specifier}`,
        )
      }
    }
    for (const forbidden of forbiddenFromUdmV2) {
      if (source.includes(forbidden)) {
        violations.push(
          `${relativeFile}: UDM-v2 must not reference ${forbidden}`,
        )
      }
    }
    continue
  }

  if (allowedV1Imports.has(normalizedFile)) {
    continue
  }

  if (!allowedV1TokenFiles.has(normalizedFile)) {
    for (const token of forbiddenV1Tokens) {
      if (source.includes(token)) {
        violations.push(`${relativeFile}: v1 code must not reference ${token}`)
      }
    }
  }

  for (const specifier of specs) {
    const resolved = resolveRelativeSpecifier(filePath, specifier)
    if (
      forbiddenFromV1.some(
        (forbidden) =>
          specifier.includes(forbidden) || resolved.includes(forbidden),
      )
    ) {
      violations.push(`${relativeFile}: v1 code must not import ${specifier}`)
    }
  }
}

if (violations.length > 0) {
  console.error("UDM-v2 import boundary violations:")
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log("UDM-v2 import boundary passed.")
