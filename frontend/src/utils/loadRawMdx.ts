// 使用 as: 'raw' 获取原始字符串，避免在 glob 模式中携带 ?raw
const rawModuleLoadersOriginal = import.meta.glob("/src/**/*.{md,mdx}", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>

// 归一化后的映射：标准化 key（/src/...） → loader
const rawModuleLoaders: Record<string, () => Promise<string>> = {}

const rawCache = new Map<string, string>()

function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/")
}

function ensureSrcPrefix(path: string): string {
  const posix = toPosixPath(path)
  if (posix.startsWith("/src/")) return posix
  const srcIndex = posix.indexOf("/src/")
  if (srcIndex >= 0) return posix.slice(srcIndex)
  if (posix.startsWith("/")) return `/src${posix}`
  return `/src/${posix.replace(/^\/*/, "")}`
}

function normalizeKey(key: string): string {
  return ensureSrcPrefix(key)
}

// 构建归一化映射，提升跨平台稳定性
Object.keys(rawModuleLoadersOriginal).forEach((k) => {
  const normalized = normalizeKey(k)
  rawModuleLoaders[normalized] = rawModuleLoadersOriginal[k]
})

export async function loadRawMdx(key: string): Promise<string> {
  const normalizedKey = normalizeKey(key)
  if (rawCache.has(normalizedKey)) {
    return rawCache.get(normalizedKey)!
  }
  const loader = rawModuleLoaders[normalizedKey]
  if (!loader) {
    // 开发态兜底：通过 /@fs 直接读取原始文件，避免 MDX 插件拦截
    try {
      const fsUrl = buildFsUrlFromSrcKey(normalizedKey)
      const resp = await fetch(fsUrl)
      if (!resp.ok) {
        throw new Error(`Failed to fetch raw MDX at ${fsUrl}: ${resp.status}`)
      }
      const text = await resp.text()
      rawCache.set(normalizedKey, text)
      return text
    } catch (err) {
      throw new Error(
        `loadRawMdx: no MDX module found for key "${normalizedKey}" and /@fs fallback failed: ${String(err)}`,
      )
    }
  }
  const maybe = await loader()
  let content: string
  if (typeof maybe === "string") {
    content = maybe
    // 如果字符串看起来像被 Vite/MDX 转换过的 JS（包含 HMR/Refresh 片段），改用 /@fs 加载原文
    if (looksLikeTransformedModule(content)) {
      const fsUrl = buildFsUrlFromSrcKey(normalizedKey)
      const resp = await fetch(fsUrl)
      if (resp.ok) {
        content = await resp.text()
      }
    }
  } else {
    // Fallback: 某些情况下 MDX 插件仍会拦截并返回编译后的组件，改为通过 URL 直接拉取原文
    const resp = await fetch(buildFsUrlFromSrcKey(normalizedKey))
    if (!resp.ok) {
      throw new Error(
        `loadRawMdx: fetch raw failed for ${normalizedKey} (${resp.status})`,
      )
    }
    content = await resp.text()
  }
  rawCache.set(normalizedKey, content)
  return content
}

export async function preloadRawMdx(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await loadRawMdx(key)
      } catch (err) {
        console.warn("preloadRawMdx: failed", key, err)
      }
    }),
  )
}

export function hasRawMdx(key: string): boolean {
  const normalizedKey = normalizeKey(key)
  return Boolean(rawModuleLoaders[normalizedKey])
}

// 识别是否为被编译过的 JS 文本（包含 HMR/Refresh 片段等）
function looksLikeTransformedModule(text: string): boolean {
  const signals = [
    "import.meta.hot",
    "@vite/client",
    "@react-refresh",
    "createHotContext",
    "window.$RefreshReg$",
    "export default function MDXContent",
  ]
  return signals.some((s) => text.includes(s))
}

declare const __APP_SRC_ABS__: string

function buildFsUrlFromSrcKey(srcKeyWithQuery: string): string {
  // 接受形如 "/src/path/to/file.mdx" 或 "/src/path/to/file.mdx?raw"，统一去掉 ?raw
  const srcKey = srcKeyWithQuery.replace(/\?raw$/, "")
  const withoutSrc = srcKey.replace(/^\/src\/?/, "")
  const abs = toPosixPath(joinPaths(__APP_SRC_ABS__, withoutSrc))
  return `/@fs/${abs}`
}

function joinPaths(base: string, rest: string): string {
  if (!base.endsWith("/") && !base.endsWith("\\")) base += "/"
  return base + rest.replace(/^[/\\]+/, "")
}
